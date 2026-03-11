# 01 — Paiement Lygos Pay

> Spec complète : voir `../05-paiement-lygos-pay.md`

## Résumé rapide

Intégrer Lygos Pay pour le modèle Pay-to-Contact : l'utilisateur paie pour débloquer les infos de contact d'un fondateur ou candidat.

## Prérequis remplis

- [x] Table `Transaction` en base ✅
- [x] Table `PaymentAuditLog` en base ✅
- [x] Table `Unlock` en base ✅
- [x] `UnlockService.createUnlockFromTransaction()` — vérifie PAID + ownership + anti-doublon ✅
- [x] `UnlockService.revokeUnlockOnRefund()` — supprime unlock après remboursement ✅
- [x] `PrivacyInterceptor` masque/expose selon l'unlock ✅
- [x] Composant `privacy-wall.tsx` avec bouton "Débloquer" ✅

## Ce qui reste

- [ ] Obtenir credentials Lygos Pay (API key, webhook secret, sandbox URL)
- [ ] Créer `PaymentsModule` (service + controller + DTO)
- [ ] `POST /payments/init` — initier paiement, créer Transaction PENDING
- [ ] `POST /payments/webhook` — recevoir confirmation Lygos, vérifier signature HMAC
- [ ] `GET /payments/mine` — historique transactions
- [ ] Frontend : `payment-modal.tsx` + câbler `onUnlock` dans `founder-sidebar.tsx`
- [ ] Tests complets (signature, idempotence, refund)

## Statut : ❌ Reporté (en attente credentials Lygos)
