# 05 — App Mobile / PWA Avancée

## Résumé

Améliorer l'expérience mobile au-delà de la PWA basique : gestes swipe, navigation bottom tab, mode offline enrichi, et éventuellement un wrapper React Native pour les stores.

## Contexte

**Dépend de :** Phase 3 — Tâche 05 (PWA basique)

**Ce qui existe :**
- App responsive mobile-first
- Layout dashboard avec drawers mobile
- Feed avec scroll infini

## Spécification

### A. Navigation Bottom Tab (mobile)

Remplacer le header + drawer par une bottom navigation sur mobile :
- Accueil (Feed)
- Recherche
- Messages (badge non-lu)
- Notifications (badge non-lu)
- Profil

### B. Gestes Swipe sur le Feed

- Swipe droite sur une carte projet → "Intéressé" (équivalent SAVE)
- Swipe gauche → "Passer" (skip, ne plus montrer)
- Option Tinder-like pour le feed candidats (côté fondateur)

### C. Mode Offline Enrichi

- Sauvegarder les projets consultés en IndexedDB
- Queue les actions offline (save, apply) pour envoi au retour de la connexion
- Synchronisation background via service worker

### D. React Native Wrapper (optionnel)

Si les stores (Play Store, App Store) sont nécessaires :
- Utiliser Capacitor ou React Native WebView
- Wrapper minimal autour de l'app web
- Push notifications natives via Firebase Cloud Messaging

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `web/src/components/layout/bottom-nav.tsx` | **Créer** |
| `web/src/components/feed/swipe-card.tsx` | **Créer** |
| `web/src/lib/offline-queue.ts` | **Créer** |
| `mobile/` | **Créer** (si React Native wrapper) |

## Tests et validation

- [ ] Bottom nav visible sur mobile, header sur desktop
- [ ] Swipe droite/gauche fonctionne sur les cartes
- [ ] Actions offline sont mises en queue et envoyées au retour
- [ ] L'app est installable depuis les stores (si wrapper natif)
