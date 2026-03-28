# Stripe Subscriptions + Feature Gating — Design Spec

> **Date :** 2026-03-28
> **Auteur :** Oswald + Claude
> **Statut :** Approuvé
> **Scope :** Infrastructure Stripe + gating par plan. Les features spécifiques (boosts, stats, messages, etc.) seront implémentées séparément.

---

## 1. Contexte & Objectif

### Situation actuelle
- Le paiement utilise Lygos Pay avec un modèle **pay-per-unlock** (payer pour débloquer un profil individuel)
- Les 4 forfaits (Gratuit, Plus, Pro, Elite) existent en DB (`pricing_plans`) mais servent uniquement d'affichage sur la landing page
- La Privacy Wall masque les données sensibles et se déverrouille via le système `Unlock` (transaction par transaction)
- Le modèle User n'a pas de champ `plan` ou `subscription`

### Objectif
Remplacer Lygos Pay par **Stripe** avec un modèle d'**abonnement mensuel**. L'utilisateur choisit un forfait, paie via Stripe Checkout, et toutes les features de son plan s'activent automatiquement. Plus de paiement par profil.

### Décisions validées
- **Remplacement total** de Lygos Pay par Stripe (pas de coexistence)
- **Plan = accès global** : un plan payant donne accès à toutes les infos de tous les profils + features du niveau
- **Stripe Checkout (hosted)** : redirection vers Stripe pour le paiement
- **Accès jusqu'à fin de période** : si annulation ou échec de paiement, l'utilisateur garde ses features jusqu'à la fin du mois payé

---

## 2. Forfaits & Features

### Matrice des plans

| Feature | FREE | PLUS (4.99 EUR) | PRO (9.99 EUR) | ELITE (19.99 EUR) |
|---------|------|------------------|-----------------|---------------------|
| Profil complet + Explorer & matcher | x | x | x | x |
| Favoris | x | x | x | x |
| Découverte plateforme 30 jours | x | x | x | x |
| Voir qui a consulté ton profil | - | x | x | x |
| Filtres avancés | - | x | x | x |
| Retour arrière dernier swipe | - | x | x | x |
| Sans contenu sponsorisé | - | x | x | x |
| Plus de visibilité résultats | - | x | x | x |
| Voir qui t'a aimé | - | - | x | x |
| Messages illimités | - | - | x | x |
| 5 boosts visibilité/mois | - | - | x | x |
| Accès prioritaire profils actifs | - | - | x | x |
| Statistiques profil | - | - | x | x |
| Badge Pro | - | - | x | x |
| Mise en avant prioritaire recherches | - | - | - | x |
| Boosts supplémentaires | - | - | - | x |
| Navigation privée (profil invisible) | - | - | - | x |
| Accès anticipé nouvelles features | - | - | - | x |
| Support prioritaire | - | - | - | x |
| Badge Elite | - | - | - | x |

> **Note :** La plupart de ces features n'existent pas encore dans le code. Ce spec implémente uniquement l'infrastructure de gating. Les features seront ajoutées progressivement.

### Features impactées immédiatement par le gating

Seules les features **déjà codées** seront gatées dans ce scope :
1. **Privacy Wall** — les infos de contact (email, phone, LinkedIn, etc.) visibles pour plans >= PLUS
2. **Badge Pro/Elite** — affichage visuel sur le profil

---

## 3. Modifications Base de Données (Prisma)

### Nouvel enum `UserPlan`

```prisma
enum UserPlan {
  FREE
  PLUS
  PRO
  ELITE
}
```

### Modifications modèle `User`

```prisma
model User {
  // ... champs existants ...

  // Stripe & Plan
  plan                 UserPlan  @default(FREE)
  stripeCustomerId     String?   @unique @map("stripe_customer_id")
  stripeSubscriptionId String?   @unique @map("stripe_subscription_id")
  planExpiresAt        DateTime? @map("plan_expires_at")
}
```

- `plan` : plan actif courant (FREE par défaut)
- `stripeCustomerId` : ID customer Stripe (créé au premier checkout)
- `stripeSubscriptionId` : ID de l'abonnement actif
- `planExpiresAt` : date de fin de la période courante (pour gérer annulation gracieuse)

### Modification modèle `PricingPlan`

```prisma
model PricingPlan {
  // ... champs existants ...
  stripePriceId String? @unique @map("stripe_price_id")
  planKey       UserPlan? @map("plan_key") // Lien vers l'enum
}
```

- `stripePriceId` : ID du Price Stripe correspondant (ex: `price_xxx`)
- `planKey` : mapping vers l'enum UserPlan pour relier un PricingPlan à un niveau

### Modification modèle `Transaction`

Le champ `provider` passe de `"LYGOS"` à `"STRIPE"` pour les nouvelles transactions.
Le default dans le schema change de `"LYGOS"` à `"STRIPE"`.

### Table `Unlock`

Conservée pour l'historique mais **plus utilisée pour le feature gating**. Les anciennes données restent intactes.

---

## 4. Backend — Module Payment

### Structure

```
api/src/payment/
├── payment.module.ts
├── payment.controller.ts
├── payment.service.ts
├── dto/
│   ├── create-checkout.dto.ts
│   └── webhook-event.dto.ts
└── guards/
    └── plan.guard.ts
```

### Configuration

**Variables d'environnement (`.env`) :**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

Accès via `ConfigService` — jamais en dur dans le code.

### Endpoints

#### `POST /payment/checkout` (authentifié)

Crée une Stripe Checkout Session pour un plan donné.

**Input :**
```typescript
class CreateCheckoutDto {
  @IsString()
  planId: string; // ID du PricingPlan en DB
}
```

**Logique :**
1. Vérifie que le plan existe et est actif
2. Vérifie que le user n'a pas déjà ce plan ou un plan supérieur
3. Crée ou récupère le Stripe Customer (via `stripeCustomerId`)
4. Crée une Checkout Session en mode `subscription` avec le `stripePriceId` du plan
5. Retourne `{ url: checkoutSession.url }`

**Output :** `{ url: string }`

#### `POST /payment/webhook` (public, signature vérifiée)

Reçoit les événements Stripe.

**Pas de `@UseGuards(FirebaseAuthGuard)`** — c'est Stripe qui appelle. La sécurité est assurée par la vérification de signature Stripe (`stripe-signature` header + `STRIPE_WEBHOOK_SECRET`).

**Événements traités :**

| Événement Stripe | Action |
|-----------------|--------|
| `checkout.session.completed` | Récupère le customer + subscription → met à jour `User.plan`, `stripeCustomerId`, `stripeSubscriptionId`, `planExpiresAt` |
| `invoice.paid` | Renouvellement réussi → met à jour `planExpiresAt` |
| `invoice.payment_failed` | Log l'échec. Stripe gère les retries automatiquement. Pas de coupure immédiate. |
| `customer.subscription.updated` | Changement de plan (upgrade/downgrade) → met à jour `User.plan` |
| `customer.subscription.deleted` | Abonnement terminé → si `planExpiresAt` est passé, repasse `User.plan` en FREE |

**Sécurité webhook :**
```typescript
const event = this.stripe.webhooks.constructEvent(
  rawBody,
  signature,
  this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'),
);
```

Chaque événement est loggé dans `PaymentAuditLog`.

#### `POST /payment/portal` (authentifié)

Crée un lien vers le Stripe Customer Portal (gérer carte, annuler, changer de plan).

**Output :** `{ url: string }`

#### `GET /payment/status` (authentifié)

Retourne le statut d'abonnement du user.

**Output :**
```typescript
{
  plan: 'FREE' | 'PLUS' | 'PRO' | 'ELITE';
  planExpiresAt: string | null;
  isActive: boolean;
}
```

### Service Payment — Logique clé

```typescript
// Hiérarchie des plans pour comparaison
const PLAN_HIERARCHY: Record<UserPlan, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
  ELITE: 3,
};

// Vérifier si un user a au minimum un certain plan
hasPlan(userPlan: UserPlan, requiredPlan: UserPlan): boolean {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}
```

---

## 5. Feature Gating — Guard & Decorator

### Decorator `@RequiresPlan()`

```typescript
@RequiresPlan(UserPlan.PRO)
@Get('stats')
async getProfileStats(@Request() req) { ... }
```

### Guard `PlanGuard`

1. Récupère le user depuis `req.user.uid`
2. Lit `user.plan` et `user.planExpiresAt`
3. Si `planExpiresAt` est passé et plan != FREE → repasse en FREE (lazy cleanup)
4. Compare avec le plan requis via `PLAN_HIERARCHY`
5. Si insuffisant → `ForbiddenException` avec message clair

### Modification Privacy Interceptor

L'intercepteur existant (`privacy.interceptor.ts`) est modifié :

**Avant :**
```typescript
const unlocked = await this.unlockService.hasUnlock(userId, targetId);
```

**Après :**
```typescript
const user = await this.prisma.user.findUnique({
  where: { firebaseUid: currentUserId },
  select: { plan: true, planExpiresAt: true },
});
const hasAccess = user.plan !== 'FREE' && (!user.planExpiresAt || user.planExpiresAt > new Date());
```

Si `hasAccess` → toutes les infos de contact sont visibles.
Si non → masquage comme avant (email, phone, LinkedIn, etc.).

---

## 6. Frontend

### Page Pricing (existante, à modifier)

**Fichier :** `web/src/components/landing/pricing-section.tsx`

**Modifications :**
- Le bouton CTA de chaque plan appelle `POST /payment/checkout` avec le `planId`
- Redirection vers l'URL Stripe retournée
- Le plan Gratuit redirige vers `/register` (pas de checkout)
- Si l'utilisateur est déjà connecté et a déjà ce plan → bouton désactivé "Plan actuel"
- Si plan inférieur → bouton "Upgrade"

### Pages de retour Stripe

**`/payment/success`** — Page de confirmation après paiement réussi
- Message de succès
- Bouton vers le dashboard/feed

**`/payment/cancel`** — Page si l'utilisateur annule le checkout
- Message informatif
- Bouton retour vers la page pricing

### Gestion abonnement (settings)

Dans la page de paramètres utilisateur :
- Affichage du plan actif + date de renouvellement
- Bouton "Gérer mon abonnement" → appel `POST /payment/portal` → redirection Stripe Customer Portal
- Badge visuel du plan (Pro / Elite)

### Privacy Wall (existante, à modifier)

**Fichier :** `web/src/components/project-deck/privacy-wall.tsx`

**Modifications :**
- Le prop `isPremium` est remplacé par le plan du user (récupéré du contexte auth)
- Si plan >= PLUS → pas de wall
- Si FREE → wall avec CTA "Passer à un plan payant" qui redirige vers `/pricing` (au lieu de l'ancien "Débloquer ce profil")

### Badges Pro / Elite

- Afficher un badge sur les profils des utilisateurs avec plan Pro ou Elite
- Le badge est basé sur `user.plan` retourné par l'API
- Badge Pro : affiché pour PRO et ELITE
- Badge Elite : affiché pour ELITE uniquement

### Variables d'environnement frontend

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 7. Sécurité

- **Clés Stripe** dans `.env` uniquement, accès via `ConfigService` (backend) et `NEXT_PUBLIC_` (frontend publishable key seulement)
- **Webhook Stripe** vérifié via signature — raw body obligatoire (pas de JSON parse avant vérification)
- **Plan vérifié côté backend** — jamais trust le frontend sur le plan de l'utilisateur
- **PCI compliance** : Stripe Checkout gère tout, aucune donnée carte ne transite par notre serveur
- **Audit trail** : chaque événement webhook loggé dans `PaymentAuditLog`
- **Rate limiting** sur `POST /payment/checkout` (prévenir les abus)
- **Pas de clé secrète Stripe exposée** côté frontend — seule la publishable key est dans `NEXT_PUBLIC_`

---

## 8. Ce qui est supprimé / remplacé

| Avant | Après |
|-------|-------|
| Lygos Pay (provider) | Stripe |
| Pay-per-unlock (payer par profil) | Abonnement mensuel |
| `Unlock` system pour le gating | `User.plan` enum |
| `is_premium` boolean concept | `UserPlan` enum (FREE/PLUS/PRO/ELITE) |
| Privacy Wall basée sur Unlock | Privacy Wall basée sur le plan |

**Conservé pour historique :** tables `Unlock`, `Transaction` (anciennes données Lygos).

---

## 9. Hors scope (features futures)

Ces features sont listées dans les plans mais seront implémentées dans des specs séparés :
- Voir qui a consulté ton profil
- Filtres avancés
- Retour arrière dernier swipe
- Contenu sponsorisé / sans pub
- Voir qui t'a aimé
- Messages illimités
- Boosts de visibilité
- Accès prioritaire
- Statistiques profil
- Mise en avant dans les recherches
- Navigation privée
- Support prioritaire

Chacune de ces features utilisera le guard `@RequiresPlan()` une fois implémentée.
