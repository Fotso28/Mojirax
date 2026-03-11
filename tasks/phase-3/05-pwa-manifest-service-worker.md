# 05 — PWA : Manifest, Service Worker, Offline

## Résumé

Transformer l'application web en Progressive Web App (PWA) installable sur mobile avec support offline basique et notifications push.

## Contexte

**Ce qui existe :**
- Application Next.js 16 responsive (mobile-first)
- Aucun manifest.json
- Aucun service worker
- Aucun support offline

## Spécification

### A. Web App Manifest

**Fichier :** `web/public/manifest.json`

```json
{
  "name": "CoMatch — Trouvez votre co-fondateur",
  "short_name": "CoMatch",
  "description": "Plateforme de matching fondateur ↔ co-fondateur pour l'Afrique",
  "start_url": "/feed",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066ff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### B. Service Worker (next-pwa ou Serwist)

**Package :** `serwist` (successeur de next-pwa, compatible Next.js 14+)

**Stratégies de cache :**
- **App Shell** : Cache-first pour les assets statiques (JS, CSS, images)
- **API Feed** : Network-first avec fallback cache (le feed reste consultable offline)
- **Images** : Cache-first avec expiration 7 jours
- **API Mutations** : Network-only (POST, PATCH, DELETE jamais cachés)

### C. Offline Fallback

**Page offline :** `web/app/offline/page.tsx`

Afficher un message "Vous êtes hors ligne" avec le logo CoMatch et un bouton "Réessayer".

### D. Icônes

Générer les icônes aux tailles requises (192x192, 512x512, maskable) depuis le logo CoMatch.

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `web/public/manifest.json` | **Créer** |
| `web/public/icons/` | **Créer** (icônes PWA) |
| `web/app/layout.tsx` | Lien vers manifest + meta theme-color |
| `web/app/offline/page.tsx` | **Créer** |
| `web/next.config.ts` | Configurer Serwist/PWA |

## Tests et validation

- [ ] Lighthouse PWA score > 90
- [ ] L'app est installable sur Android (bouton "Ajouter à l'écran d'accueil")
- [ ] Le feed est consultable offline (données cachées)
- [ ] La page offline s'affiche quand le réseau est coupé sur une page non cachée
- [ ] Les mutations (postuler, créer projet) échouent proprement offline avec un message clair

### Condition de validation finale

> L'application est installable comme PWA sur mobile. Les pages consultées sont cachées et accessibles offline. Le score Lighthouse PWA est supérieur à 90.
