# 03 — Modération IA des Messages

## Résumé

Analyser automatiquement les messages envoyés entre utilisateurs pour détecter le spam, le harcèlement, et le contenu inapproprié.

## Contexte

**Dépend de :** Phase 2 — Tâche 03 (Messagerie)

**Ce qui existe :**
- Modération IA des profils candidats et projets
- `AiService` avec fallback multi-provider (DeepSeek → Claude → GPT)
- `ModerationService` pour les projets

## Spécification

### A. Analyse automatique des messages

À chaque `POST /messages/conversations/:id` :
1. Vérifier le contenu via un LLM léger (ou regex pour les cas évidents)
2. Détecter : spam, phishing, harcèlement, contenu sexuel, coordonnées dans le message (tentative de contourner le paywall)
3. Si problème détecté :
   - Message bloqué (pas envoyé)
   - Notification à l'admin
   - Log dans `ModerationLog`
4. Si OK → message envoyé normalement

### B. Détection contournement paywall

Détecter les tentatives de partager des coordonnées dans les messages :
- Patterns email : `*@*.com`
- Patterns téléphone : `+237...`, `6xx xxx xxx`
- Patterns URL : `linkedin.com/in/...`

Si détecté avant que l'utilisateur ait payé un unlock → avertissement.

### C. Signalement par les utilisateurs

- Bouton "Signaler" sur chaque message
- `POST /messages/:id/report` → crée un ticket admin
- 3 signalements → suspension temporaire de l'envoyeur

## Fichiers à créer

| Fichier | Action |
|---------|--------|
| `api/src/messaging/message-moderation.service.ts` | **Créer** |
| `api/src/messaging/messaging.service.ts` | Intégrer modération avant envoi |
| `web/src/components/messaging/message-bubble.tsx` | Bouton signaler |

## Tests et validation

- [ ] Un message contenant du spam est bloqué
- [ ] Un message contenant un email/téléphone est signalé
- [ ] Le signalement crée un ticket admin
- [ ] Les messages normaux passent sans délai
