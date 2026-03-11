# 05 — Intégration paiement Lygos Pay

## Résumé

Intégrer le système de paiement Lygos Pay pour permettre aux utilisateurs de débloquer les informations de contact d'un fondateur ou candidat. Le flow couvre l'initiation du paiement, la réception du webhook, la création de l'unlock, et l'affichage côté frontend.

## Contexte

**Dépend de :** Tâche 03 (Privacy Wall) + Tâche 04 (Unlock Service)

**Ce qui existe :**
- Table `Transaction` : `amount`, `currency` (XAF), `status`, `provider` (LYGOS), `externalId`
- Table `PaymentAuditLog` : `transactionId`, `eventType`, `rawPayload`, `ipAddress`
- Table `Unlock` : prête avec `transactionId` comme clé étrangère
- `UnlockService` avec `createUnlockFromTransaction()` (tâche 04)
- `PrivacyInterceptor` qui masque/expose selon l'unlock (tâche 03)
- Composant `privacy-wall.tsx` avec bouton "Débloquer" (non fonctionnel)

**À obtenir de Lygos Pay :**
- URL de l'API (sandbox + production)
- Clé API (`LYGOS_API_KEY`)
- Secret pour vérification de signature webhook (`LYGOS_WEBHOOK_SECRET`)
- Documentation du format de webhook

## Spécification

### A. Nouveau module `PaymentsModule`

**Fichiers à créer :**
- `api/src/payments/payments.module.ts`
- `api/src/payments/payments.service.ts`
- `api/src/payments/payments.controller.ts`
- `api/src/payments/dto/init-payment.dto.ts`

### B. `PaymentsController`

| Endpoint | Description | Guard |
|----------|-------------|-------|
| `POST /payments/init` | Initier un paiement | FirebaseAuthGuard |
| `POST /payments/webhook` | Recevoir la confirmation Lygos | Vérification signature (pas de JWT) |
| `GET /payments/mine` | Historique de mes transactions | FirebaseAuthGuard |

### C. `InitPaymentDto`

```typescript
class InitPaymentDto {
  @IsString()
  targetId: string;         // ID du candidat ou projet à débloquer

  @IsEnum(['candidate', 'project'])
  targetType: 'candidate' | 'project';

  @IsOptional()
  @IsString()
  returnUrl?: string;       // URL de retour après paiement
}
```

### D. Flow de paiement complet

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │     │   API       │     │  Lygos Pay  │     │   API       │
│             │     │             │     │             │     │  (webhook)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ POST /payments/   │                   │                   │
       │    init           │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │ 1. Vérifier que   │                   │
       │                   │    pas déjà       │                   │
       │                   │    débloqué       │                   │
       │                   │                   │                   │
       │                   │ 2. Créer          │                   │
       │                   │    Transaction    │                   │
       │                   │    PENDING        │                   │
       │                   │                   │                   │
       │                   │ 3. Appeler API    │                   │
       │                   │    Lygos Pay      │                   │
       │                   │──────────────────>│                   │
       │                   │                   │                   │
       │                   │ 4. Recevoir URL   │                   │
       │                   │    de paiement    │                   │
       │                   │<──────────────────│                   │
       │                   │                   │                   │
       │ { paymentUrl,     │                   │                   │
       │   transactionId } │                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
       │ Rediriger vers    │                   │                   │
       │ paymentUrl        │                   │                   │
       │──────────────────────────────────────>│                   │
       │                   │                   │                   │
       │                   │                   │ Paiement réussi   │
       │                   │                   │──────────────────>│
       │                   │                   │                   │
       │                   │                   │   5. Vérifier     │
       │                   │                   │      signature    │
       │                   │                   │                   │
       │                   │                   │   6. Transaction  │
       │                   │                   │      → PAID       │
       │                   │                   │                   │
       │                   │                   │   7. Créer        │
       │                   │                   │      Unlock       │
       │                   │                   │                   │
       │                   │                   │   8. Notifier     │
       │                   │                   │      utilisateur  │
       │                   │                   │                   │
       │ Retour sur        │                   │                   │
       │ returnUrl         │                   │                   │
       │<─────────────────────────────────────│                   │
       │                   │                   │                   │
       │ Rafraîchir page   │                   │                   │
       │ → données         │                   │                   │
       │   débloquées      │                   │                   │
```

### E. `PaymentsService`

#### `initPayment(userId, dto)`

1. Vérifier que `targetId` existe (candidat ou projet)
2. Vérifier que l'utilisateur ne tente pas de débloquer son propre profil
3. Vérifier qu'il n'y a pas déjà un `Unlock` existant → 409 Conflict
4. Créer une `Transaction` en `PENDING`
5. Appeler l'API Lygos Pay pour initier le paiement :
   ```typescript
   const response = await axios.post(`${LYGOS_API_URL}/payments`, {
     amount: UNLOCK_PRICE, // ex: 2000 XAF
     currency: 'XAF',
     reference: transaction.id,
     callback_url: `${API_URL}/payments/webhook`,
     return_url: dto.returnUrl || FRONTEND_URL,
   }, {
     headers: { 'Authorization': `Bearer ${LYGOS_API_KEY}` }
   });
   ```
6. Sauvegarder `externalId` dans la Transaction
7. Logger dans `PaymentAuditLog` : `PAYMENT_INITIATED`
8. Retourner `{ paymentUrl, transactionId }`

#### `handleWebhook(payload, signature)`

1. **Vérifier la signature** du webhook (HMAC SHA256 avec `LYGOS_WEBHOOK_SECRET`)
2. Si signature invalide → 401 + logger dans audit log
3. Trouver la `Transaction` via `externalId`
4. Si `status === 'success'` :
   - Mettre Transaction à `PAID`
   - Appeler `unlockService.createUnlockFromTransaction()`
   - Logger `PAYMENT_CONFIRMED` dans audit log
   - Créer notification : "Profil débloqué !"
5. Si `status === 'failed'` :
   - Mettre Transaction à `FAILED`
   - Logger `PAYMENT_FAILED` dans audit log
   - Créer notification : "Paiement échoué"
6. Retourner 200 OK à Lygos

#### `handleRefund(transactionId)`

1. Mettre Transaction à `REFUNDED`
2. Supprimer l'`Unlock` associé
3. Logger `PAYMENT_REFUNDED` dans audit log
4. Notifier l'utilisateur

### F. Variables d'environnement

```env
LYGOS_API_URL=https://api.lygospay.com     # ou sandbox
LYGOS_API_KEY=lk_live_...
LYGOS_WEBHOOK_SECRET=whsec_...
UNLOCK_PRICE=2000                            # Prix en XAF
```

### G. Frontend — Modal de paiement

**Fichier :** `web/src/components/payment/payment-modal.tsx`

**Comportement :**
1. Affiché quand l'utilisateur clique "Débloquer" sur le `PrivacyWall`
2. Affiche : nom/photo du profil cible, prix (2000 XAF), bouton "Payer"
3. Clic "Payer" → `POST /payments/init` → redirige vers `paymentUrl`
4. Au retour de Lygos → rafraîchir la page pour voir les données débloquées

**Fichier :** `web/src/components/project-deck/founder-sidebar.tsx`

Modifications :
- Wrapper les infos de contact dans `<PrivacyWall>`
- Passer `onUnlock={() => setShowPaymentModal(true)}`
- Après retour de Lygos, un `useEffect` vérifie `GET /unlock/check/:id` et met à jour l'UI

### H. Sécurité

- **Signature webhook obligatoire** — ne jamais traiter un webhook sans vérification HMAC
- **Pas de création d'unlock côté frontend** — uniquement via le webhook serveur
- **Rate limit** sur `POST /payments/init` — max 5 tentatives par minute par utilisateur
- **Idempotence webhook** — si le webhook est reçu 2 fois, ne pas créer de doublon (vérifier `externalId`)
- **Pas de montant dynamique** — le prix est défini côté serveur, jamais côté client

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `api/src/payments/payments.module.ts` | **Créer** |
| `api/src/payments/payments.service.ts` | **Créer** |
| `api/src/payments/payments.controller.ts` | **Créer** |
| `api/src/payments/dto/init-payment.dto.ts` | **Créer** |
| `api/src/app.module.ts` | Enregistrer `PaymentsModule` |
| `web/src/components/payment/payment-modal.tsx` | **Créer** |
| `web/src/components/project-deck/founder-sidebar.tsx` | Intégrer PrivacyWall + PaymentModal |
| `web/src/components/project-deck/privacy-wall.tsx` | Ajouter `onUnlock` callback |

## Tests et validation

### Tests unitaires

- [ ] `initPayment()` crée une `Transaction` PENDING et retourne une `paymentUrl`
- [ ] `initPayment()` refuse si déjà débloqué (409)
- [ ] `initPayment()` refuse de débloquer son propre profil (400)
- [ ] `handleWebhook()` rejette une signature invalide (401)
- [ ] `handleWebhook()` crée un unlock et passe la transaction à PAID
- [ ] `handleWebhook()` est idempotent (2 appels identiques → 1 seul unlock)
- [ ] `handleRefund()` supprime l'unlock et passe la transaction à REFUNDED
- [ ] Chaque opération crée un `PaymentAuditLog`

### Tests d'intégration

- [ ] Flow complet : init → webhook → unlock → données visibles
- [ ] Après paiement, `GET /projects/:slug` retourne les infos de contact
- [ ] Après remboursement, les infos sont re-masquées
- [ ] `GET /payments/mine` retourne l'historique correct
- [ ] La modal de paiement s'affiche avec le bon montant et redirige vers Lygos
- [ ] Au retour de Lygos, la page se rafraîchit et les données sont visibles

### Condition de validation finale

> Un utilisateur peut débloquer les informations de contact d'un fondateur ou candidat en payant via Lygos Pay. Le paiement est vérifié côté serveur via webhook avec signature HMAC. Après paiement confirmé, les données sont instantanément accessibles. Un remboursement re-masque les données. Tout le flow est auditable via les `PaymentAuditLog`.
