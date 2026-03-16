# Audit & Hardening — Messagerie MojiraX

> **Orchestration multi-agent pour valider que la messagerie est production-ready.**
> Score cible : **9.9/10 minimum** sur chaque axe. Si un axe < 9.9, les agents correcteurs sont relancés.

**Référence plan** : `docs/superpowers/plans/2026-03-12-messaging.md`
**Référence spec** : `docs/superpowers/specs/2026-03-12-messaging-design.md`
**Référence sécurité** : `CLAUDE.md` sections M01–M04

---

## Phase 1 — Analyse statique parallèle (6 agents simultanés)

Lancer les 6 agents suivants **en parallèle** avec `subagent_type: Explore` ou `general-purpose` selon la tâche.

### Agent 1 : Plan Compliance (Explore)

```
Prompt: Compare exhaustivement l'implémentation actuelle de la messagerie avec le plan
docs/superpowers/plans/2026-03-12-messaging.md.

Pour CHAQUE tâche du plan (Task 1 à Task 18), vérifier :
1. Le fichier existe-t-il ? Est-il au bon emplacement ?
2. Le code correspond-il au plan (modèles, méthodes, DTOs, endpoints) ?
3. Identifier les ÉCARTS : code manquant, code ajouté hors plan, divergences

Lire TOUS les fichiers suivants et comparer ligne par ligne avec le plan :
- api/prisma/schema.prisma (modèles Conversation, Message, MessageReaction)
- api/src/messaging/messaging.service.ts
- api/src/messaging/messaging.controller.ts
- api/src/messaging/messaging.gateway.ts
- api/src/messaging/messaging.module.ts
- api/src/messaging/ws-auth.guard.ts
- api/src/messaging/ws-rate-limiter.ts
- api/src/messaging/redis-io.adapter.ts
- api/src/messaging/dto/*.ts
- web/src/context/socket-context.tsx
- web/src/app/(dashboard)/messages/page.tsx
- web/src/components/messaging/*.tsx

Produire un tableau :
| Task # | Statut | Fichiers | Écarts détectés |
Score /10 avec justification.
```

### Agent 2 : Sécurité OWASP + M01-M04 (Explore)

```
Prompt: Auditer la sécurité de la messagerie selon CLAUDE.md (sections A01-A10 + M01-M04).

Vérifier pour CHAQUE règle :

M01 — Contrôle d'accès :
- Tout accès à une conversation vérifie membership (founderId ou candidateId) ?
- Aucun endpoint n'accepte un conversationId sans vérification ?
- Le gateway WS vérifie la membership avant chaque action ?

M02 — Validation des messages :
- Content max 5000 chars validé côté DTO ET côté gateway ?
- Fichiers max 5MB, types PDF+DOCX uniquement ?
- class-validator décorateurs présents ?

M03 — Rate limiting WebSocket :
- message:send : 30/60s ?
- typing:start : 10/10s ?
- reaction:add/remove : 20/60s ?
- Les dépassements sont loggés via Logger NestJS ?

M04 — Auth WebSocket :
- Token Firebase vérifié à la connexion (handleConnection) ?
- Re-vérification toutes les 50 min (auth:refresh ou timer) ?
- Déconnexion immédiate si token invalide ?

A01 — Broken Access Control :
- Tous les endpoints REST ont @UseGuards(FirebaseAuthGuard) ?
- Ownership vérifié via req.user.uid ?

A03 — Injection :
- Pas de $queryRawUnsafe ?
- Prisma ORM uniquement ?

A04 — Insecure Design :
- Tous les @Body() ont un DTO typé (jamais any) ?
- Pagination bornée (max 100, default 20) ?

A09 — Logging :
- Logger NestJS partout (jamais console.log) ?
- Actions sensibles loggées ?

Lire TOUS les fichiers messaging (api + web).
Produire un rapport avec : règle | statut ✅/❌ | détail | sévérité (critique/haute/moyenne/basse)
Score /10 avec justification.
```

### Agent 3 : Flux utilisateur end-to-end (Explore)

```
Prompt: Tracer les flux utilisateur complets de la messagerie en lisant le code source.
Pour CHAQUE flux, vérifier que la chaîne complète fonctionne (frontend → API → DB → WS → frontend).

Flux 1 — Création de conversation :
- Candidature acceptée → transaction Prisma crée Conversation ?
- Lire api/src/applications/applications.service.ts, méthode updateStatus
- La conversation inclut applicationId, founderId, candidateId ?

Flux 2 — Envoi de message :
- Frontend: input text → socket.emit('message:send') ?
- Gateway: rate limit → verifyMembership → sendMessage → emit 'message:new' ?
- DB: Message créé + Conversation.lastMessageAt mis à jour ?
- Destinataire offline → push FCM envoyé ?

Flux 3 — Triple check (✓✓✓) :
- SENT → DELIVERED (destinataire reçoit) → READ (destinataire ouvre la conversation) ?
- Les status sont émis via 'message:status' au sender ?
- Le frontend met à jour les icônes Check/CheckCheck/CheckCheck-bleu ?

Flux 4 — Réactions emoji :
- Ajout: socket.emit('reaction:add') → verifyMembership → upsert → emit 'reaction:update' ?
- Suppression: socket.emit('reaction:remove') → delete → emit 'reaction:update' ?
- Max 6 emojis distincts par message ?
- Frontend: groupement par emoji, toggle si déjà réagi ?

Flux 5 — Upload fichier :
- Frontend: sélection fichier → POST /messages/upload → socket.emit('message:send' avec fileUrl) ?
- Validation serveur: PDF/DOCX uniquement, max 5MB ?
- FilePreview affiché dans la bulle ?

Flux 6 — Typing indicator :
- Frontend: onChange → emit 'typing:start' → timeout 3s → emit 'typing:stop' ?
- Gateway: rate limit → Redis SET avec TTL → emit 'typing:indicator' ?
- TypingIndicator affiché chez le destinataire ?

Flux 7 — Badge non-lu sidebar :
- Initial: GET /messages/conversations/unread-count ?
- Temps réel: socket.on('message:new') incrémente le compteur ?
- Affichage: badge rouge avec nombre (99+ si > 99) ?

Flux 8 — Reconnexion WebSocket :
- Connection State Recovery activée (maxDisconnectionDuration: 2min) ?
- Redis Streams adapter configuré ?
- Token refresh via auth:refresh ?

Pour CHAQUE flux : statut ✅/❌/⚠️, fichiers lus, problèmes détectés.
Score /10 avec justification.
```

### Agent 4 : Qualité code & TypeScript (Explore)

```
Prompt: Analyser la qualité du code de la messagerie.

1. Types TypeScript :
- Y a-t-il des `any` dans les fichiers messaging ? Lister TOUS.
- Les interfaces sont-elles bien définies pour tous les events WS ?
- Les DTOs ont-ils tous les décorateurs class-validator ?

2. Gestion d'erreurs :
- Les catch sont-ils vides ? (catch {} sans traitement)
- Les erreurs WS sont-elles renvoyées au client via 'error' event ?
- Les erreurs critiques sont-elles loggées ?

3. Memory leaks :
- Les setInterval dans le gateway sont-ils nettoyés à la déconnexion ?
- Les event listeners socket.on sont-ils nettoyés avec socket.off dans les useEffect ?
- Les useRef sont-ils utilisés correctement (pas de stale closures) ?

4. Performance :
- Les requêtes Prisma utilisent-elles select (pas de findMany sans select) ?
- La pagination est-elle bornée (max 100) ?
- Les N+1 queries sont-elles évitées ?

5. UX patterns :
- Scroll to bottom automatique sur nouveau message ?
- Load more (messages anciens) sans perdre la position de scroll ?
- Empty states avec messages clairs ?
- Loading states avec skeleton/spinner ?
- Responsive mobile (colonne unique sur mobile) ?

Lire TOUS les fichiers messaging (api + web).
Score /10 avec justification.
```

### Agent 5 : Test API endpoints (general-purpose)

```
Prompt: Tester TOUS les endpoints REST de la messagerie en les appelant directement.

1. Lire api/src/messaging/messaging.controller.ts pour identifier tous les endpoints
2. Pour chaque endpoint, tester avec curl :

GET /messages/conversations — Sans auth → doit retourner 401
GET /messages/conversations/unread-count — Sans auth → doit retourner 401
GET /messages/:conversationId — Sans auth → doit retourner 401
POST /messages/upload — Sans auth → doit retourner 401

3. Tester les validations DTO :
- Envoyer des payloads invalides et vérifier que forbidNonWhitelisted rejette

4. Vérifier les headers de réponse :
- CORS: Access-Control-Allow-Origin contient localhost:3000 ?
- Rate limit headers présents ?

5. Vérifier que le Prisma schema est synchronisé :
- cd api && npx prisma migrate status
- Les tables conversations, messages, message_reactions existent ?

6. Vérifier la compilation TypeScript :
- cd api && npx tsc --noEmit 2>&1 | head -50
- cd web && npx next build 2>&1 | tail -20

Score /10 avec justification.
```

### Agent 6 : Frontend components audit (Explore)

```
Prompt: Auditer TOUS les composants frontend de la messagerie.

Lire chaque fichier et vérifier :

web/src/components/messaging/chat-view.tsx :
- Le composant gère-t-il correctement le changement de conversation (reset state) ?
- Le scroll auto fonctionne-t-il (useRef + scrollIntoView) ?
- Le champ input est-il vidé après envoi ?
- Le bouton Send est-il disabled si input vide ?
- Le raccourci Enter envoie-t-il le message ?
- Le bouton back fonctionne-t-il sur mobile ?

web/src/components/messaging/conversation-list.tsx :
- La recherche filtre-t-elle par nom ?
- La conversation active est-elle visuellement marquée ?
- Le tri est-il par lastMessageAt DESC ?

web/src/components/messaging/conversation-item.tsx :
- L'avatar fallback (initiale) fonctionne-t-il ?
- Le OnlineBadge est-il affiché ?
- Le timestamp relatif est-il en français ?

web/src/components/messaging/message-bubble.tsx :
- Les bulles sont-elles différenciées (bleu pour moi, gris pour l'autre) ?
- Le MessageStatus est-il affiché uniquement pour mes messages ?
- Le FilePreview est-il rendu si fileUrl présent ?
- Les réactions sont-elles affichées sous la bulle ?

web/src/components/messaging/emoji-picker.tsx :
- Le picker est-il chargé en dynamic import (SSR false) ?
- Le locale est-il en français ?

web/src/components/messaging/emoji-reactions.tsx :
- Le groupement par emoji est-il correct ?
- Le toggle (ajout/suppression) fonctionne-t-il ?
- La réaction de l'utilisateur courant est-elle visuellement distincte ?

web/src/components/messaging/message-status.tsx :
- SENT → Check simple gris ?
- DELIVERED → Double check gris ?
- READ → Double check bleu (kezak-primary) ?

web/src/components/messaging/typing-indicator.tsx :
- L'animation bounce est-elle fluide ?
- Le nom est-il affiché ?

web/src/app/(dashboard)/messages/page.tsx :
- Le layout est-il responsive (2 colonnes desktop, 1 mobile) ?
- L'empty state est-il clair ?
- Le loading state est-il présent ?

web/src/context/socket-context.tsx :
- Le socket se connecte-t-il avec le bon URL (/messaging namespace) ?
- Le token est-il rafraîchi automatiquement ?
- Le cleanup est-il fait à la déconnexion ?

Score /10 avec justification.
```

---

## Phase 2 — Consolidation des scores

Après réception des 6 rapports, calculer :

| Axe | Agent | Score |
|-----|-------|-------|
| Plan compliance | Agent 1 | ?/10 |
| Sécurité | Agent 2 | ?/10 |
| Flux E2E | Agent 3 | ?/10 |
| Qualité code | Agent 4 | ?/10 |
| API endpoints | Agent 5 | ?/10 |
| Frontend components | Agent 6 | ?/10 |
| **Moyenne** | | **?/10** |

---

## Phase 3 — Boucle corrective (si moyenne < 9.9)

Pour CHAQUE axe avec score < 9.9 :

1. **Extraire** la liste des problèmes détectés par l'agent
2. **Lancer un agent correcteur** (general-purpose) avec le prompt :

```
Tu es un développeur senior. Voici les problèmes détectés dans la messagerie MojiraX :

[LISTE DES PROBLÈMES]

Contraintes :
- Stack : NestJS 11 + Next.js 16 + Prisma + Socket.io + Redis
- Règles CLAUDE.md : FirebaseAuthGuard, DTOs typés, Logger NestJS, select explicite,
  pagination max 20, forbidNonWhitelisted, pas de console.log, pas de any
- Sécurité M01-M04 obligatoire
- UI-STYLE-GUIDE.md pour le frontend

Corrige CHAQUE problème. Édite les fichiers existants, ne crée pas de nouveaux fichiers
sauf si absolument nécessaire. Après correction, vérifie que le code compile :
- cd api && npx tsc --noEmit
- cd web && npx next build
```

3. **Relancer l'agent d'audit** correspondant pour re-scorer
4. **Répéter** jusqu'à score >= 9.9 (max 3 itérations par axe)

---

## Phase 4 — Validation finale

Lancer un dernier agent (general-purpose) :

```
Prompt: Validation finale de la messagerie MojiraX.

1. Vérifier la compilation complète :
   - cd api && npx tsc --noEmit
   - cd web && npx next build

2. Vérifier la migration Prisma :
   - cd api && npx prisma migrate status

3. Vérifier que l'API démarre :
   - cd api && npx ts-node -e "import('./src/main')" (timeout 30s)

4. Vérifier les endpoints clés :
   - curl http://localhost:5001/messages/conversations → 401 (auth required ✅)
   - curl http://localhost:5001/projects/feed → 401 (auth required ✅)
   - curl http://localhost:5001/projects → 200 (public ✅)

5. Produire le rapport final :
   - Nombre total de fichiers modifiés/créés
   - Score final consolidé
   - Liste des risques résiduels (le cas échéant)
   - Recommandations pour la mise en production
```

---

## Exécution

Pour lancer ce plan, copier-coller dans Claude Code :

```
Execute le plan docs/superpowers/plans/2026-03-16-messaging-audit.md
Phase 1 : lance les 6 agents en parallèle.
Phase 2 : consolide les scores.
Phase 3 : lance les agents correcteurs pour tout score < 9.9.
Phase 4 : validation finale.
```
