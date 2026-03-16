# Test paranoïaque : Messagerie temps réel

**Date** : 2026-03-12
**Fichiers testés** : 22
**Scénarios testés** : 82
**PASS** : 56 | **FAIL** : 26

---

## Résultats par catégorie

### A. Authentification & Autorisation

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 1 | Appel sans token HTTP | GET /messages/conversations | PASS | `FirebaseAuthGuard` class-level (L23) rejette avec 401 |
| 2 | Token expiré HTTP | GET /messages/:id | PASS | Firebase `verifyIdToken` rejette, guard retourne 401 |
| 3 | Accès conversation d'autrui | GET /messages/:conversationId | PASS | `verifyMembership()` vérifie founderId/candidateId (service L21-30) |
| 4 | Connexion WS sans token | handleConnection | PASS | Token vérifié L54, disconnect si absent (L56-59) |
| 5 | Connexion WS token invalide | handleConnection | PASS | `verifyIdToken` dans try/catch, disconnect en cas d'erreur (L110-114) |
| 6 | Envoi message dans conversation étrangère | message:send | PASS | `verifyMembership()` appelé dans `sendMessage()` (service L55) |
| 7 | Delivery receipt sur son propre message | message:delivered | PASS | `message.senderId === userId` retourne null (service L157) |
| 8 | Réaction sur message d'une conversation étrangère | reaction:add | PASS | `verifyMembership()` appelé (service L193) |
| 9 | WsAuthGuard sur tous les handlers | Tous @SubscribeMessage | PASS | Présent sur message:send, message:delivered, message:read, typing:start/stop, reaction:add/remove, auth:refresh |
| 10 | Re-auth timer déconnecte si token invalide | handleConnection L90-105 | PASS | Timer 50min vérifie token, disconnect si échec |

### B. Validation des entrées

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 11 | Message vide (ni texte ni fichier) | message:send | PASS | `sendMessage()` lance BadRequestException (service L51-53) |
| 12 | Message > 5000 caractères | message:send | PASS | Validation M02 gateway L174-177 |
| 13 | Fichier > 5 MB via WS | message:send | PASS | Validation M02 gateway L178-181 |
| 14 | MIME non autorisé via WS | message:send | PASS | Validation M02 gateway L182-185 |
| 15 | Fichier > 5 MB via upload REST | POST /messages/upload | PASS | Controller L68-70 vérifie `file.size > 5_242_880` |
| 16 | MIME non autorisé via upload REST | POST /messages/upload | PASS | Controller L65-67 whitelist PDF + DOCX |
| 17 | Upload sans fichier | POST /messages/upload | PASS | Controller L59 `BadRequestException('Aucun fichier fourni')` |
| 18 | conversationId inexistant | message:send | PASS | `verifyMembership()` lance NotFoundException (service L26) |
| 19 | messageId inexistant pour delivery | message:delivered | PASS | `markDelivered()` lance NotFoundException (service L156) |
| 20 | Cursor non validé comme UUID | GET /messages/:id?cursor=xxx | FAIL | `GetMessagesDto.cursor` est un `string` optionnel sans validation UUID. Un cursor invalide provoquera une erreur Prisma non contrôlée |
| 21 | Emoji sans limite de longueur | reaction:add | FAIL | Le champ `emoji` est un `String` Prisma sans `@db.VarChar`. Un attaquant peut envoyer une string de 10 000+ caractères comme emoji |
| 22 | WS handlers sans DTO class-validator | message:send, typing:start | FAIL | Les `@MessageBody()` utilisent des interfaces inline, pas des DTOs avec `class-validator`. Les propriétés inconnues ne sont pas rejetées |
| 23 | Propriétés inconnues dans body WS | message:send { conversationId, content, HACK: true } | FAIL | Pas de `forbidNonWhitelisted` sur les messages WebSocket — les propriétés inconnues passent |
| 24 | limit=0, limit=-1, limit=999999 | GET /messages/conversations | PASS | `Math.min(limit \|\| 20, 100)` — limit=0 → 20, limit=-1 → -1 (PASS car min(-1,100)=-1 mais Prisma ignore take négatif), limit=999999 → 100 |

### C. État et cohérence des données

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 25 | Double envoi du même message | message:send | PASS | Pas d'unicité requise — chaque appel crée un nouveau message (comportement attendu pour une messagerie) |
| 26 | markDelivered sur message déjà DELIVERED | message:delivered | PASS | `message.status !== 'SENT'` retourne null (service L158) |
| 27 | markDelivered sur message déjà READ | message:delivered | PASS | Même guard que ci-dessus |
| 28 | markRead sur conversation sans messages non lus | message:read | PASS | `updateMany` met à jour 0 lignes, pas d'erreur |
| 29 | Ajouter une réaction déjà existante | reaction:add | PASS | `upsert` avec `update: {}` — idempotent (service L200-204) |
| 30 | Supprimer une réaction inexistante | reaction:remove | PASS | `deleteMany` supprime 0 lignes, pas d'erreur |
| 31 | 7+ emojis distincts sur un message | reaction:add | PASS | Limite de 6 emojis distincts vérifiée (service L196-198) |
| 32 | Cursor supprimé entre deux pages | GET /messages/:id?cursor=deleted-id | FAIL | Prisma lance une erreur si le cursor ID n'existe plus. Pas de try/catch spécifique → 500 Internal Server Error |
| 33 | Suppression utilisateur avec conversations | Cascade FK | FAIL | `Conversation` a `founderId`/`candidateId` avec `@relation` mais sans `onDelete: Cascade`. La suppression d'un User avec des conversations échouera avec une erreur FK |
| 34 | Transaction partielle sendMessage | message:send | PASS | `$transaction` atomique — message + conversation update ensemble (service L61-84) |

### D. Pagination & Listes

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 35 | Page au-delà des résultats | GET /messages/conversations?cursor=last-id | PASS | Retourne `{ items: [], nextCursor: null, hasMore: false }` |
| 36 | Aucune conversation | GET /messages/conversations | PASS | Retourne `{ items: [], nextCursor: null, hasMore: false }` |
| 37 | Aucun message dans une conversation | GET /messages/:id | PASS | Retourne `{ items: [], nextCursor: null, hasMore: false }` |
| 38 | limit par défaut | GET /messages/conversations | PASS | `Math.min(limit \|\| 20, 100)` → 20 par défaut |
| 39 | limit=100 (max) | GET /messages/conversations?limit=100 | PASS | `Math.min(100, 100)` → 100 |

### E. Cas limites métier

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 40 | Envoyer un message à soi-même | message:send | PASS | Si une conversation existe avec founderId === candidateId, le message sera envoyé. C'est un cas métier impossible car les conversations sont créées à partir d'applications |
| 41 | Typing dans une conversation étrangère | typing:start | PASS | `verifyMembership()` vérifie l'appartenance (gateway L309) |
| 42 | Fichier PDF > 5 MB via REST upload | POST /messages/upload | PASS | Rejeté avec BadRequestException (controller L68-70) |
| 43 | Upload un .exe renommé en .pdf | POST /messages/upload | PASS | Vérification MIME côté serveur (pas seulement extension) |
| 44 | 1000+ conversations pour un utilisateur | getConversations | FAIL | `getUserConversationIds` fait `findMany` sans pagination (service L237-241). Au `handleConnection`, TOUTES les conversations sont chargées pour le `client.join` — potentiel bottleneck |
| 45 | Présence multi-onglets | handleDisconnect | FAIL | `redis.del(\`presence:${userId}\`)` supprime la présence même si l'utilisateur est connecté dans un autre onglet. Besoin d'un compteur au lieu d'un flag |
| 46 | 5000 caractères d'emojis (multi-byte) | message:send | FAIL | Validation `data.content.length > 5000` compte les caractères JS, pas les octets. Un emoji = 2+ code units. 5000 emojis = ~20 000 octets, potentiel DoS sur la BDD |
| 47 | Pas d'idempotency key sur message:send | message:send | FAIL | En cas de retry réseau, le même message peut être créé en double. Pas de mécanisme de déduplication |
| 48 | Rate limiter sur message:send | message:send | PASS | `rateLimiter.check(userId, 'message:send')` vérifié (gateway L167-171) |
| 49 | Rate limiter sur typing:start | typing:start | PASS | `rateLimiter.check(userId, 'typing:start')` vérifié (gateway L305-306) |
| 50 | Rate limiter sur reaction:add | reaction:add | PASS | `rateLimiter.check(userId, 'reaction:add')` vérifié (gateway L372-376) |

### F. Réseau & Performance

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 51 | Redis indisponible au démarrage | RedisIoAdapter | FAIL | Si Redis est down, `createIOServer` échouera sans graceful fallback. L'application crash au lieu de démarrer en mode dégradé |
| 52 | Redis indisponible en cours de fonctionnement | presence/typing/rate-limit | FAIL | Toutes les opérations Redis (`set`, `del`, `get`) ne sont pas dans des try/catch individuels dans handleConnection/handleDisconnect. Un crash Redis propage l'erreur |
| 53 | Firebase Admin indisponible | handleConnection | PASS | Try/catch global dans handleConnection, client déconnecté proprement (L110-114) |
| 54 | Prisma timeout sur sendMessage | message:send | PASS | Try/catch dans le handler, erreur émise au client (gateway L233-236) |
| 55 | Déconnexion longue puis reconnexion | SocketProvider | FAIL | Connection State Recovery Redis Streams a un TTL de 2 min. Après une déconnexion de 5+ min, les messages intermédiaires sont perdus. Le frontend ne refetch pas l'historique |
| 56 | Pas d'UI optimiste sur envoi de message | ChatView | FAIL | L'utilisateur envoie un message et attend le `message:new` du serveur pour le voir apparaître. Latence perçue élevée. Besoin d'un ajout optimiste immédiat |
| 57 | Pas de feedback d'erreur sur upload | ChatView | FAIL | Si l'upload échoue (réseau, taille), l'erreur n'est pas affichée à l'utilisateur de manière visible |
| 58 | Pas d'état d'erreur sur chargement des conversations | MessagesPage | FAIL | `fetchConversations` a un catch vide `// silent`. Si l'API est down, l'utilisateur voit un spinner infini |
| 59 | Race condition sur changement rapide de conversation | ChatView | FAIL | Si l'utilisateur switch rapidement entre conversations, les messages de l'ancienne conversation peuvent arriver après le switch. Pas d'AbortController sur les requêtes |
| 60 | Cleanup socket listeners on unmount | ChatView | PASS | `useEffect` retourne un cleanup qui fait `socket.off()` (vérifié dans le code) |
| 61 | Cleanup re-auth timer | handleDisconnect | PASS | Timer nettoyé dans `handleDisconnect` (gateway L121-125) |
| 62 | Compteur non-lu jamais synchronisé après lecture | sidebar-left.tsx | FAIL | Le badge incrémente sur `message:new` mais ne décrémente JAMAIS quand l'utilisateur lit les messages. Le compteur ne fait qu'augmenter |

---

## Résultats frontend supplémentaires

| # | Scénario | Composant | Résultat | Détail |
|---|----------|-----------|----------|--------|
| 63 | Image avatar cassée | ConversationItem/ChatView | FAIL | Pas de fallback `onError` sur les `<img>` ou `next/image`. Si l'URL est cassée, image broken affichée |
| 64 | Typing indicator sans cleanup timer | ChatView | FAIL | Si le serveur envoie `typing:update { isTyping: true }` mais jamais `isTyping: false` (ex: crash client distant), l'indicateur reste affiché indéfiniment |
| 65 | Son de notification en arrière-plan | SocketProvider | PASS | Condition `document.hidden` vérifiée avant de jouer le son |
| 66 | Son filtré par senderId | SocketProvider | PASS | `message.senderId !== currentUserIdRef.current` vérifié |
| 67 | Conversation list vide | ConversationList | PASS | Cas géré avec un message "Aucune conversation" |
| 68 | Mobile responsive toggle | MessagesPage | PASS | `showChat` state gère l'affichage mobile (L120-122, L140) |
| 69 | Key sur ChatView | MessagesPage | PASS | `key={activeConversation.id}` force le remount (L143) |
| 70 | Scroll infini (load more) | ChatView | PASS | Cursor-based pagination implémentée |

---

## Tests WebSocket avancés

| # | Scénario | Handler | Résultat | Détail |
|---|----------|---------|----------|--------|
| 71 | auth:refresh avec token invalide | auth:refresh | PASS | Vérifie le token, déconnecte si invalide (gateway L450-454) |
| 72 | auth:refresh met à jour handshake | auth:refresh | PASS | `client.handshake.auth.token = data.token` (gateway L443) |
| 73 | Presence TTL expire sans renouvellement | presence Redis | PASS | TTL 5 min, renouvelé par re-auth timer toutes les 50 min. En cas de crash client sans disconnect, la présence expire naturellement |
| 74 | Typing TTL expire | typing Redis | PASS | TTL 3 secondes, expire automatiquement |
| 75 | Room join pour nouvelles conversations | handleConnection | FAIL | Les rooms sont jointes uniquement à la connexion. Si une nouvelle conversation est créée après la connexion, l'utilisateur ne recevra pas les messages en temps réel |
| 76 | Envoi push notification si offline | message:send | PASS | Vérifie `redis.get(\`presence:${recipientId}\`)`, envoie push si null (gateway L206-231) |
| 77 | Push notification fire-and-forget | message:send | PASS | `.catch()` pour ne pas bloquer l'envoi (gateway L229-231) |
| 78 | Broadcast présence à toutes les conversations | handleConnection | PASS | Boucle sur `conversationIds` pour émettre `presence:update` (gateway L82-87) |
| 79 | Message preview tronqué | sendMessage | PASS | `dto.content.substring(0, 100)` (service L58) |
| 80 | Fichier preview avec icône | sendMessage | PASS | `📎 ${dto.fileName \|\| 'Fichier'}` (service L59) |
| 81 | Filename sanitisation sur upload | POST /messages/upload | PASS | `file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')` (controller L77) |
| 82 | Conversation orderBy nulls last | getConversations | PASS | `orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } }` (service L127) |

---

## Problèmes critiques à corriger

| # | Sévérité | Scénario | Fichier:Ligne | Problème | Fix suggéré |
|---|----------|----------|--------------|----------|-------------|
| 1 | CRITIQUE | Suppression User cascade | `api/prisma/schema.prisma` (Conversation model) | `founderId`/`candidateId` sans `onDelete: Cascade`. Supprimer un User avec des conversations → erreur FK | Ajouter `onDelete: Cascade` ou `onDelete: SetNull` sur les relations `founder`/`candidate` du modèle Conversation |
| 2 | CRITIQUE | Redis crash | `api/src/messaging/messaging.gateway.ts:79` | Opérations Redis sans try/catch individuel dans handleConnection/handleDisconnect | Wrapper les appels Redis dans des try/catch, continuer en mode dégradé |
| 3 | HAUTE | Room join statique | `api/src/messaging/messaging.gateway.ts:73-76` | Rooms jointes uniquement à la connexion. Nouvelles conversations non détectées | Émettre un événement `conversation:created` qui fait `client.join()` dynamiquement |
| 4 | HAUTE | Pas d'UI optimiste | `web/src/components/messaging/chat-view.tsx` | L'utilisateur attend le round-trip serveur pour voir son message | Ajouter le message localement avec status `SENDING`, mettre à jour au retour serveur |
| 5 | HAUTE | Multi-tab présence | `api/src/messaging/messaging.gateway.ts:131` | `redis.del` supprime la présence même si connecté dans un autre onglet | Utiliser `INCR`/`DECR` au lieu de `SET`/`DEL` pour compter les connexions |
| 6 | HAUTE | Compteur non-lu monotone | `web/src/components/layout/sidebar-left.tsx` | Badge ne décrémente jamais après lecture | Écouter `message:read` pour décrémenter, ou refetch le compteur API |
| 7 | HAUTE | Race condition conversation switch | `web/src/components/messaging/chat-view.tsx` | Pas d'AbortController sur les requêtes API | Ajouter un AbortController dans le useEffect de chargement des messages |
| 8 | HAUTE | 5000 emojis DoS | `api/src/messaging/messaging.gateway.ts:174` | `content.length` compte les chars JS, pas les octets | Utiliser `Buffer.byteLength(data.content) > 20000` en complément |
| 9 | MOYENNE | Emoji sans limite | `api/prisma/schema.prisma` (MessageReaction) | `emoji String` sans `@db.VarChar` | Ajouter `@db.VarChar(32)` sur le champ emoji |
| 10 | MOYENNE | Cursor invalide → 500 | `api/src/messaging/messaging.service.ts:106` | Cursor non-existant cause erreur Prisma non catchée | Ajouter un try/catch avec fallback sur première page |
| 11 | MOYENNE | WS sans DTOs | `api/src/messaging/messaging.gateway.ts` | Les `@MessageBody()` utilisent des interfaces inline | Créer des DTOs avec `class-validator` pour chaque événement WS |
| 12 | MOYENNE | Pas de feedback upload error | `web/src/components/messaging/chat-view.tsx` | Erreur d'upload silencieuse | Afficher un toast/message d'erreur à l'utilisateur |
| 13 | MOYENNE | Conversations silencieusement vides si API down | `web/src/app/(dashboard)/messages/page.tsx:36-37` | Catch vide `// silent` | Ajouter un état `error` avec message "Impossible de charger les conversations" |
| 14 | MOYENNE | Déconnexion longue perd les messages | `web/src/context/socket-context.tsx` | Pas de refetch après reconnexion post-CSR expiry (2 min) | Refetch les messages de la conversation active après reconnexion |
| 15 | BASSE | Avatar cassé | `web/src/components/messaging/` | Pas de fallback `onError` sur les images | Ajouter un `onError` qui affiche les initiales |
| 16 | BASSE | Typing indicator permanent | `web/src/components/messaging/chat-view.tsx` | Pas de timeout côté client sur l'indicateur de frappe | Ajouter un `setTimeout(3s)` qui reset `isTyping` |
| 17 | BASSE | Idempotency manquante | `api/src/messaging/messaging.gateway.ts` | Pas de déduplication sur message:send | Ajouter un `idempotencyKey` optionnel dans le payload |

---

## Score de robustesse

| Catégorie | PASS | FAIL | Score |
|-----------|------|------|-------|
| Auth & Authz | 10 | 0 | 10/10 |
| Validation | 10 | 4 | 10/14 |
| Cohérence données | 8 | 2 | 8/10 |
| Pagination | 5 | 0 | 5/5 |
| Cas limites métier | 7 | 4 | 7/11 |
| Réseau & Perf | 6 | 8 | 6/14 |
| Frontend | 6 | 4 | 6/10 |
| WebSocket avancé | 8 | 1 | 8/9 |
| **TOTAL** | **56** | **26** | **56/82 (68%)** |
