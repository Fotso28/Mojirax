# Design Spec — Continuité du flow de paiement (landing → login → onboarding → Stripe)

**Date :** 2026-04-15  
**Statut :** Validé  
**Auteur :** Claude + Oswald

---

## Problème

Quand un utilisateur non connecté clique sur un plan payant depuis la landing page, il est redirigé vers `/login`. Après connexion ou inscription + onboarding, il atterrit sur `/` (accueil) et perd le circuit de paiement. Il doit manuellement retrouver le pricing pour souscrire.

## Solution

Propager l'intention de paiement via un query param `?plan=PRO|PLUS|ELITE` tout au long du parcours : landing → login → onboarding → Stripe checkout.

## Sécurité

1. **Le query param est un HINT, pas une instruction.** Il guide l'UX (pré-sélection du plan, déclenchement du checkout). Il ne modifie jamais directement le plan en base.
2. **Validation whitelist côté frontend** : seules les valeurs `PLUS`, `PRO`, `ELITE` sont acceptées. Toute autre valeur est ignorée et le param supprimé.
3. **Le backend reste l'autorité** : `POST /payment/checkout` reçoit un `planId` (UUID). Le backend valide que le plan existe, est actif, et que l'utilisateur peut y souscrire (pas de downgrade). Aucun changement backend nécessaire.
4. **Pas de `planId` (UUID) dans l'URL** : on utilise le `planKey` lisible. Le frontend résout `planKey` → `planId` au moment du checkout en appelant l'API des plans.
5. **Nettoyage** : le param est consommé au déclenchement du checkout.

## Tunnels

### Tunnel 1 — Nouvel utilisateur (inscription + onboarding + paiement)

```
Landing /#pricing
  → Clic "Choisir PRO"
  → /login?plan=PRO
  → Inscription (email / Google / LinkedIn)
  → Nouveau Google user → sélection rôle (step "role" dans login)
  → /onboarding/start?plan=PRO (param propagé)
  → … étapes onboarding …
  → Dernière étape : détecte ?plan=PRO
  → POST /payment/checkout → planId résolu depuis planKey
  → Redirect Stripe Checkout
  → /payment/success?session_id=xxx
  → Page confirmation "Votre plan PRO est actif !" → bouton vers /feed
```

### Tunnel 2 — Utilisateur existant non connecté

```
Landing /#pricing
  → Clic "Choisir PRO"
  → /login?plan=PRO
  → Connexion
  → Détecte ?plan=PRO → skip redirect vers /
  → POST /payment/checkout directement
  → Stripe Checkout → /payment/success → confirmation → /feed
```

### Tunnel 3 — Utilisateur connecté sur la landing

```
Landing /#pricing
  → Clic "Choisir PRO"
  → handleSubscribe() directement (flow actuel inchangé)
  → Stripe Checkout → /payment/success → confirmation → /feed
```

### Tunnel 4 — Mise à niveau depuis /settings/billing

```
/settings/billing
  → Clic "Passer au PRO"
  → handleSubscribe() → POST /payment/checkout
  → Stripe Checkout → /payment/success → confirmation → /feed
```

## Modifications par fichier

### Frontend — Fichiers modifiés

#### 1. `web/src/components/landing/pricing-section.tsx`

Modifier les liens pour les utilisateurs non connectés :
- Actuellement : `href="/login"`
- Nouveau : `href="/login?plan=${plan.planKey}"`

#### 2. `web/src/app/login/page.tsx`

- Lire `searchParams.get('plan')`, valider contre whitelist `['PLUS', 'PRO', 'ELITE']`
- **Utilisateur existant** (login, pas inscription) : si `?plan` présent, déclencher checkout Stripe au lieu de `router.push('/')`
- **Nouveau Google user** : propager `?plan` vers l'étape "role", puis vers l'onboarding
- **Inscription email** : propager `?plan` dans la redirection onboarding

#### 3. `web/src/app/onboarding/` (toutes les étapes)

- Le contexte d'onboarding lit et conserve le `?plan` initial
- Chaque `router.push()` entre étapes ajoute `?plan=X` si présent
- **Dernière étape** (pitch.tsx pour candidats, dernier step fondateur) : après `submitForm`, si `plan` présent → checkout Stripe au lieu de `router.push('/')`

#### 4. `web/src/app/payment/success/page.tsx` — Refonte

Actuellement : redirige silencieusement vers `/feed`.

Nouveau : page de confirmation stylée, partagée entre tous les tunnels :
- Titre : "Félicitations, votre plan X est actif !"
- Affiche le nom du plan, icône, récap des features débloquées
- Bouton principal "Accéder au feed" → `/feed`
- Appelle `refreshDbUser()` pour mettre à jour le plan dans le contexte auth
- Design cohérent avec le style guide (glassmorphic cards, couleurs kezak)

### Backend — Aucune modification

- `POST /payment/checkout` : valide déjà le plan, vérifie les droits, gère les erreurs
- `POST /payment/webhook` : met à jour le plan en base après paiement confirmé
- La sécurité est déjà en place côté backend

### Fichiers NON modifiés

- `settings/billing/page.tsx` : flow déjà correct (utilisateur connecté → checkout direct). Bénéficie de la nouvelle page success automatiquement.
- `auth-context.tsx` : `refreshDbUser` existe déjà
- `payment.service.ts` / `payment.controller.ts` : aucun changement
- `payment/cancel/page.tsx` : redirige vers `/#pricing`, inchangé

## Résumé d'impact

| Scope | Fichiers |
|-------|----------|
| Modifiés | ~4 fichiers frontend |
| Refondu | 1 (payment/success) |
| Backend | 0 |
| Nouveaux | 0 |
