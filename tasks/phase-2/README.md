# Tâches Phase 2 — Monétisation & Administration

> Dernière mise à jour : 2026-03-10

## Organisation

```
tasks/phase-2/
├── 01-paiement-lygos-pay.md
├── 02-admin-dashboard.md
├── 03-messagerie-fondateur-candidat.md
├── 04-notifications-push-email.md
└── README.md
```

## Ordre d'implémentation recommandé

| # | Tâche | Dépendances | Priorité | Effort |
|---|-------|-------------|----------|--------|
| 01 | Paiement Lygos Pay | Tâche 03+04 (Privacy+Unlock) ✅ | 🔴 Critique | ~1.5 jours |
| 02 | Admin Dashboard | Aucune | 🟡 Important | ~2 jours |
| 03 | Messagerie fondateur ↔ candidat | Candidatures ✅ | 🟡 Important | ~2 jours |
| 04 | Notifications push + email | NotificationsModule ✅ | 🟢 Nice-to-have | ~1.5 jours |

## Statut

- [ ] 01 — Paiement Lygos Pay (reporté — spec complète dans `../05-paiement-lygos-pay.md`)
- [ ] 02 — Admin Dashboard
- [ ] 03 — Messagerie fondateur ↔ candidat
- [ ] 04 — Notifications push + email

## Ce qui est déjà fait (Phase 2)

- [x] Candidatures (module complet) ✅
- [x] Notifications in-app (module complet) ✅
- [x] Recherche avancée (sémantique + historique) ✅
