# Spec : Affichage abonnement utilisateur

**Date :** 2026-04-09
**Statut :** Validé

---

## Contexte

Les utilisateurs de MojiraX n'ont actuellement aucun moyen de consulter les détails de leur abonnement (plan, dates, historique). Le profil affiche un `<PlanBadge>` mais sans dates ni gestion.

## Objectif

Permettre à l'utilisateur de voir son plan actuel, sa date de souscription, sa date de renouvellement, et l'historique de ses paiements d'abonnement.

## Périmètre

- Résumé abonnement sur `/profile`
- Page dédiée `/settings/billing` avec détails complets + historique
- Nouvel endpoint backend `GET /payment/billing`
- Ajout du champ `planStartedAt` au modèle User

## Hors périmètre

- Changement de plan depuis la page billing (on redirige vers `/#pricing`)
- Portail Stripe intégré
- Historique des unlocks (seulement transactions d'abonnement)

---

## 1. Modèle de données

### Ajout au modèle User

```prisma
planStartedAt DateTime? @map("plan_started_at")
```

### Migration

- Ajouter le champ `planStartedAt` nullable
- Backfill : pour chaque user ayant un plan payant, setter `planStartedAt` depuis la `createdAt` de sa première Transaction d'abonnement

### Réponse de `GET /payment/billing`

```typescript
interface BillingResponse {
  plan: "FREE" | "PLUS" | "PRO" | "ELITE";
  planStartedAt: string | null;    // ISO 8601
  planExpiresAt: string | null;    // ISO 8601
  isActive: boolean;               // plan !== FREE && planExpiresAt > now
  transactions: BillingTransaction[];
}

interface BillingTransaction {
  id: string;
  amount: number;
  currency: string;
  status: "PAID" | "FAILED" | "REFUNDED";
  createdAt: string;               // ISO 8601
  description: string;             // ex: "Abonnement PLUS - Renouvellement"
}
```

---

## 2. Backend API

### Nouvel endpoint

`GET /payment/billing` — protégé par `FirebaseAuthGuard`

### Logique (PaymentService)

1. Récupérer le user via `req.user.uid`
2. Retourner `plan`, `planStartedAt`, `planExpiresAt`
3. Calculer `isActive` : `plan !== FREE && planExpiresAt > now()`
4. Requête transactions filtrée : uniquement celles liées à l'abonnement (discriminant à déterminer — champ `type` enum ou présence de `stripeSubscriptionId` dans metadata)
5. Pagination : 20 par défaut, max 100, triées par `createdAt` décroissant

### Modification du webhook Stripe

- `checkout.session.completed` : setter `planStartedAt = now()` en plus de `plan` et `planExpiresAt`
- `customer.subscription.deleted` / expiration : ne pas toucher `planStartedAt` (conserver l'historique)

### Ajout champ `type` au modèle Transaction

Le modèle Transaction actuel n'a pas de discriminant pour distinguer abonnement vs unlock. Ajouter :

```prisma
enum TransactionType {
  SUBSCRIPTION
  UNLOCK
}

// Dans le modèle Transaction :
type TransactionType @default(SUBSCRIPTION)
```

- Migration : ajouter le champ avec défaut `SUBSCRIPTION`
- Backfill : les transactions ayant un `Unlock` associé → setter à `UNLOCK`
- Filtrage billing : `where: { userId, type: SUBSCRIPTION }`

---

## 3. Frontend : Résumé sur `/profile`

### Emplacement

Nouvelle section sous le header du profil, avant les sections existantes.

### Contenu

| Cas | Affichage |
|-----|-----------|
| Plan payant actif | Badge plan + "Renouvellement le [date]" + lien "Gérer mon abonnement →" |
| Plan expiré | Badge grisé + "Expiré le [date]" en rouge + lien "Gérer mon abonnement →" |
| FREE | "Plan gratuit" + lien "Gérer mon abonnement →" |

### Source de données

`GET /payment/status` (existant, léger — pas besoin des transactions pour le résumé).

---

## 4. Frontend : Page `/settings/billing`

### Route

`/settings/billing` — dans le layout dashboard.

### Structure

#### En-tête
- Titre "Mon abonnement"
- Bouton retour vers `/profile`

#### Carte plan actuel (plan payant actif)
- Nom du plan (PLUS / PRO / ELITE) avec badge coloré
- "Membre depuis le [planStartedAt]" (format : `dd MMMM yyyy` en français)
- "Prochain renouvellement le [planExpiresAt]"
- Pastille verte "Actif"

#### Carte plan expiré
- Nom du dernier plan + badge grisé
- "Expiré le [planExpiresAt]" en rouge
- CTA "Renouveler" → redirige vers `/#pricing`

#### Carte FREE (jamais souscrit)
- "Vous êtes sur le plan gratuit"
- CTA "Découvrir nos offres" → redirige vers `/#pricing`

#### Historique des paiements
- Tableau/liste : Date | Description | Montant | Statut
- Statut avec pastilles colorées :
  - Vert = PAID
  - Rouge = FAILED
  - Orange = REFUNDED
- Pagination si > 20 transactions
- Message "Aucun paiement" si liste vide

### Style

Conforme au design system MojiraX :
- Cards : `bg-white rounded-2xl border border-gray-100 p-5 shadow-sm`
- Couleurs : `kezak-primary`, `kezak-dark`, `kezak-light`
- Icônes : Lucide React
- Responsive mobile-first

### Source de données

`GET /payment/billing` (endpoint complet avec transactions).
