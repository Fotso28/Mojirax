# Messages Mobile — Design WhatsApp Plein Écran

**Date:** 2026-04-15
**Statut:** Approuvé

## Problème

Sur mobile, la page `/messages` affiche les conversations dans une card (`bg-white rounded-2xl border shadow-sm`) avec des marges latérales héritées du `DashboardShell` (`px-4`). Cela gaspille de l'espace précieux sur mobile et ne correspond pas à l'UX attendue d'une messagerie (style WhatsApp).

## Design validé

### Vue Liste des conversations (mobile < md)

**Changements :**
- Supprimer la card (rounded-2xl, border, shadow-sm) sur mobile
- Supprimer les marges/padding latérales du DashboardShell pour cette page sur mobile
- Le conteneur occupe 100% de la largeur et 100vh - hauteur du header
- Pas de border-radius, pas de border, fond blanc direct
- Sur desktop (md+) : conserver le style card actuel

**Implémentation technique :**
1. `messages/page.tsx` : conditionner les classes de la card — supprimer `rounded-2xl border border-gray-100 shadow-sm` sur mobile, les garder sur `md:`
2. `dashboard-shell.tsx` : permettre aux pages de désactiver le padding latéral sur mobile (prop ou détection de route)

### Vue Chat (mobile < md)

Le chat view est déjà plein écran sur mobile (absolute inset-0 avec slide-in). Pas de changement nécessaire sauf :
- Conserver le fond légèrement gris (`bg-gray-50/50` ou `#f8fafc`) sur la zone messages

### Desktop (md+)

Aucun changement — le layout deux colonnes (liste + chat) reste identique.

## Fichiers impactés

1. `web/src/app/(dashboard)/messages/page.tsx` — supprimer card styling sur mobile, ajuster hauteur
2. `web/src/components/layout/dashboard-shell.tsx` — supprimer padding latéral pour /messages sur mobile
3. `web/src/components/messaging/conversation-list.tsx` — éventuellement ajuster padding interne

## Hors scope

- Pas de changement sur le chat-view (déjà plein écran)
- Pas de changement desktop
- Pas de nouvelles fonctionnalités (badges, online indicators sont du polish futur)
