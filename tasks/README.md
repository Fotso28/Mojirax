# Tâches — CoMatch / MojiraX

> Dernière mise à jour : 2026-03-10

## Vue d'ensemble

```
tasks/
├── README.md                          ← Ce fichier
│
├── 01-moderation-profils-candidats.md    ✅ Phase 1
├── 02-matching-ia-candidat-projet.md     ✅ Phase 1
├── 03-privacy-wall-backend-interceptor.md ✅ Phase 1
├── 04-unlock-service-verification.md     ✅ Phase 1
├── 05-paiement-lygos-pay.md             ⏸️ Reporté (Phase 2)
│
├── phase-2/                           ← Monétisation & Administration
│   ├── 01-paiement-lygos-pay.md          ❌
│   ├── 02-admin-dashboard.md             ❌
│   ├── 03-messagerie-fondateur-candidat.md ❌
│   └── 04-notifications-push-email.md    ❌
│
├── phase-3/                           ← Stabilisation & Lancement
│   ├── 01-securite-rate-limiting-helmet-cors.md  ❌
│   ├── 02-tests-unitaires-e2e.md                 ❌
│   ├── 03-ssr-seo-meta-sitemap.md                ❌
│   ├── 04-monitoring-analytics-sentry.md         ❌
│   ├── 05-pwa-manifest-service-worker.md         ❌
│   └── 06-ci-cd-pipeline.md                      ❌
│
└── phase-4/                           ← Post-Lancement & Croissance
    ├── 01-auth-linkedin-import.md               ❌
    ├── 02-matching-v2-recommendations-feed.md   ❌
    ├── 03-moderation-messages-ia.md             ❌
    ├── 04-tableau-de-bord-fondateur.md          ❌
    ├── 05-app-mobile-pwa-avancee.md             ❌
    └── 06-internationalisation-i18n.md          ❌
```

## Avancement par phase

| Phase | Description | Tâches | Terminées | Statut |
|-------|-------------|--------|-----------|--------|
| **1** | Core Platform | 4 | 4/4 | ✅ 100% |
| **2** | Monétisation & Admin | 4 | 0/4 | ❌ 0% |
| **3** | Stabilisation & Lancement | 6 | 0/6 | ❌ 0% |
| **4** | Post-Lancement & Croissance | 6 | 0/6 | ❌ 0% |

## Priorités immédiates

1. 🔴 **Phase 3/01** — Sécurité (rate limiting, Helmet, CORS) — critique pour prod
2. 🔴 **Phase 2/01** — Paiement Lygos Pay — business model
3. 🟡 **Phase 2/02** — Admin Dashboard — gestion plateforme
4. 🟡 **Phase 3/02** — Tests — couverture minimale avant lancement
5. 🟡 **Phase 2/03** — Messagerie — engagement utilisateurs
