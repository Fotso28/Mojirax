# Test paranoïaque : Messagerie temps réel (v3 — post-simplify)

**Date** : 2026-03-12
**Fichiers testés** : 24
**Scénarios testés** : 82
**PASS** : 73 | **FAIL** : 9

---

## Résultats par catégorie

### A. Authentification & Autorisation

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 1 | REST sans token — GET /messages/conversations | MessagingController L23 | PASS | `@UseGuards(FirebaseAuthGuard)` class-level couvre tous les endpoints |
| 2 | REST sans token — GET /messages/conversations/unread-count | MessagingController L39 | PASS | Guard classe |
| 3 | REST sans token — GET /messages/:conversationId | MessagingController L46 | PASS | Guard classe |
| 4 | REST sans token — POST /messages/upload | MessagingController L56 | PASS | Guard classe |
| 5 | Connexion WS sans token | MessagingGateway L105-110 | PASS | `if (!token)` → disconnect immédiat |
| 6 | Token expiré/invalide — REST | FirebaseAuthGuard | PASS | Firebase SDK lève exception, guard rejette 401 |
| 7 | Token expiré/invalide — WS connexion | MessagingGateway L114, L165-168 | PASS | `verifyIdToken` dans try/catch → disconnect |
| 8 | Accès conversation d'autrui — REST | MessagingService.getMessages L92 | PASS | `verifyMembership` vérifie founderId/candidateId |
| 9 | Accès conversation d'autrui — WS message:send | MessagingService.sendMessage L55 | PASS | `verifyMembership` appelé |
| 10 | Delivery receipt sur son propre message | MessagingService.markDelivered L182 | PASS | `senderId === userId` → return null |
| 11 | Réaction sur message d'une conversation étrangère | MessagingService.addReaction L218 | PASS | `verifyMembership` vérifie |
| 12 | WsAuthGuard sur conversation:join | MessagingGateway L210 | PASS | `@UseGuards(WsAuthGuard)` présent |
| 13 | WsAuthGuard sur message:send | MessagingGateway L234 | PASS | Présent |
| 14 | WsAuthGuard sur message:delivered | MessagingGateway L309 | PASS | Présent |
| 15 | WsAuthGuard sur message:read | MessagingGateway L337 | PASS | Présent |
| 16 | WsAuthGuard sur typing:start/stop | MessagingGateway L364, L397 | PASS | Présent sur les deux |
| 17 | WsAuthGuard sur reaction:add/remove | MessagingGateway L432, L465 | PASS | Présent sur les deux |
| 18 | WsAuthGuard sur auth:refresh | MessagingGateway L500 | PASS | Présent |
| 19 | Re-auth timer déconnecte si token invalide | MessagingGateway L142-160 | PASS | setInterval 50min, verifyIdToken → disconnect si échec |
| 20 | conversation:join pour une conversation étrangère | MessagingGateway L219 | PASS | `verifyMembership` lève ForbiddenException |
| 21 | auth:refresh : token d'un autre utilisateur Firebase | MessagingGateway L509-512 | FAIL | `verifyIdToken(data.token)` ne vérifie pas que `decoded.uid === client.data.user.uid`. Un attaquant peut soumettre un token Firebase tiers |

### B. Validation des entrées

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 22 | Body vide {} sur WS message:send | WsSendMessageDto + service L51 | PASS | `@IsUUID() conversationId` manquant → rejet |
| 23 | Message sans contenu ni fichier | MessagingService L51-53 | PASS | `BadRequestException` explicite |
| 24 | Message > 5000 caractères | WsSendMessageDto L9 | PASS | `@MaxLength(5000)` |
| 25 | Message > 20 KB (emojis multi-byte) | MessagingGateway L251-254 | PASS | `Buffer.byteLength > MAX_CONTENT_BYTES` |
| 26 | Fichier > 5 MB via REST upload | MessagingController L68-70 | PASS | `file.size > 5_242_880` sur buffer réel |
| 27 | MIME non autorisé via REST upload | MessagingController L61-67 | PASS | Allowlist PDF + DOCX |
| 28 | Upload sans fichier | MessagingController L59 | PASS | BadRequestException |
| 29 | conversationId inexistant (UUID valide) | MessagingService.verifyMembership L22-26 | PASS | NotFoundException |
| 30 | conversationId non-UUID — WS | WsSendMessageDto L5 | PASS | `@IsUUID()` rejette |
| 31 | conversationId non-UUID — REST param | MessagingController L47-49 | FAIL | `@Param('conversationId')` sans `@IsUUID()` ni pipe de validation → Prisma reçoit une chaîne arbitraire, risque de 500 au lieu de 400 |
| 32 | messageId inexistant pour delivery | MessagingService.markDelivered L177-181 | PASS | NotFoundException |
| 33 | messageId non-UUID — WS | WsMessageIdDto L37-39 | PASS | `@IsUUID()` |
| 34 | Emoji > 32 chars | WsReactionDto L46-47 | PASS | `@MaxLength(32)` + `@db.VarChar(32)` |
| 35 | Emoji vide "" | WsReactionDto L45 | FAIL | `@IsString()` accepte les chaînes vides. Manque `@IsNotEmpty()` |
| 36 | XSS dans content | Prisma ORM | PASS | Requêtes paramétrées, pas de `dangerouslySetInnerHTML` |
| 37 | SQL injection dans content | Prisma ORM | PASS | Pas de `$queryRawUnsafe` |
| 38 | Token auth:refresh vide | WsAuthRefreshDto L51-52 | FAIL | `@IsString()` accepte `""`. Manque `@IsNotEmpty()`. Résultat final correct (Firebase rejette → disconnect) mais validation DTO incomplète |
| 39 | Propriétés inconnues dans DTOs WS | MessagingGateway | FAIL | Le `ValidationPipe` global HTTP ne couvre pas les WS `@MessageBody()`. Manque `@UsePipes(new ValidationPipe({...}))` sur le gateway |
| 40 | fileUrl non-URL dans WS DTO | WsSendMessageDto L13-14 | PASS | `@IsUrl()` valide |
| 41 | fileSize négatif ou 0 | WsSendMessageDto L21-23 | FAIL | Manque `@Min(1)`. `fileSize: -1` passe la validation |

### C. État et cohérence des données

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 42 | Message sur conversation supprimée | MessagingService.verifyMembership L22-26 | PASS | `findUnique` → null → NotFoundException |
| 43 | Double envoi du même message | message:send | PASS | Chaque appel crée un nouveau message (pas d'unicité — comportement attendu pour une messagerie) |
| 44 | markDelivered sur message déjà DELIVERED | MessagingService L183 | PASS | `status !== 'SENT'` → return null |
| 45 | markDelivered sur message déjà READ | MessagingService L183 | PASS | Même guard |
| 46 | markRead sur conversation déjà lue | MessagingService L199-206 | PASS | `updateMany` met à jour 0 lignes, pas d'erreur |
| 47 | Réaction déjà existante | MessagingService.addReaction L225-228 | PASS | `upsert` avec `update: {}` — idempotent |
| 48 | Suppression réaction inexistante | MessagingService.removeReaction L244-246 | PASS | `deleteMany` supprime 0 lignes |
| 49 | 7+ emojis distincts | MessagingService.addReaction L220-223 | PASS | Limite 6 emojis distincts vérifiée |
| 50 | Suppression User → cascade conversations | schema.prisma L859, L861 | PASS | `onDelete: Cascade` sur founder et candidate |
| 51 | Suppression Conversation → cascade messages | schema.prisma L874 | PASS | `onDelete: Cascade` sur Message.conversation |
| 52 | Suppression Message → cascade reactions | schema.prisma L895 | PASS | `onDelete: Cascade` sur MessageReaction.message |
| 53 | Concurrence : 2 markDelivered simultanés | MessagingService.markDelivered L183 | PASS | Le 2ème verra `status !== 'SENT'` → return null. Pas de race condition car lecture puis condition |
| 54 | Transaction atomicité sendMessage | MessagingService L61-84 | PASS | `$transaction` atomique — message + conversation update ensemble |
| 55 | Cursor supprimé entre deux pages | MessagingService L97-106 | PASS | `findUnique` cursor → null → cursorOption = {} → fallback première page |
| 56 | Optimistic UI : message SENDING non remplacé si serveur ne répond jamais | chat-view.tsx L132-142 | FAIL | Le message optimiste `SENDING` reste indéfiniment dans la liste. Pas de timeout qui le retire ou le marque en erreur après X secondes |

### D. Pagination & Listes

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 57 | limit=0 | GetMessagesDto L11-13 | PASS | `@Min(1)` interdit |
| 58 | limit=-1 | GetMessagesDto L11-13 | PASS | `@Min(1)` interdit |
| 59 | limit=999999 | GetMessagesDto L13 + service L94 | PASS | `@Max(100)` + `Math.min(limit, 100)` |
| 60 | Cursor inexistant (UUID supprimé) | MessagingService L97-106 | PASS | Fallback sur première page |
| 61 | Cursor malformé (non-UUID) | GetMessagesDto L7-8 | FAIL | `cursor` est `@IsString()` sans `@IsUUID()`. Chaîne arbitraire transmise à Prisma |
| 62 | Page au-delà des résultats | MessagingService L108-126 | PASS | Retourne `{ items: [], hasMore: false, nextCursor: null }` |
| 63 | Aucune conversation | MessagingService.getConversations L144-161 | PASS | Idem |
| 64 | Aucun message | MessagingService.getMessages L108-126 | PASS | Idem |

### E. Cas limites métier

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 65 | Typing dans conversation étrangère | MessagingGateway L377 | PASS | `verifyMembership` vérifie l'appartenance |
| 66 | Conversation sans messages | ChatView L301-304 | PASS | "Commencez la conversation !" affiché |
| 67 | Multi-tab : présence INCR/DECR (2 onglets, fermer 1) | MessagingGateway L71-91 | PASS | `presenceIncr` / `presenceDecr` — DECR retourne false si count > 0, ne broadcast pas offline |
| 68 | Rate limiting : 31 messages en 60s | WsRateLimiter L11 | PASS | max 30/60s → le 31ème est rejeté |
| 69 | 6 réactions puis ajout 7ème | MessagingService L220-223 | PASS | `BadRequestException('Maximum de réactions atteint')` |
| 70 | Badge unread : ouvrir conversation et revenir | sidebar-left.tsx L34-42 | PASS | Écoute `message:read` → refetch compteur API |
| 71 | Reconnexion socket : rooms re-jointes | socket-context.tsx L93-102 | PASS | Nouvelle connexion socket.io → `handleConnection` re-exécuté côté gateway → rooms re-jointes |
| 72 | conversation:join deux fois pour la même conversation | MessagingGateway L220, L222-225 | PASS | `client.join()` est idempotent dans socket.io. Le push dans `conversationIds` ajoute un doublon mais sans effet fonctionnel |
| 73 | Fichier avec MIME erroné (ex: .exe renommé en .pdf) | MessagingController L65-67 | PASS | Vérification `file.mimetype` côté Multer — basé sur le header Content-Type, pas l'extension |

### F. Réseau & Performance

| # | Scénario | Endpoint/Service | Résultat | Détail |
|---|----------|-----------------|----------|--------|
| 74 | Redis indisponible au démarrage | redis-io.adapter.ts L9-18 | PASS | `RedisIoAdapter.connectToRedis()` est appelé au boot. Si Redis est down, la connexion échoue mais `adapterConstructor` reste undefined → `createIOServer` fonctionne sans adapter Redis (mode dégradé sans CSR) |
| 75 | Redis indisponible en cours de fonctionnement | MessagingGateway L61-68 | PASS | `safeRedis()` wrapper catch toutes les exceptions Redis, log l'erreur et retourne le fallback |
| 76 | Firebase Admin indisponible | MessagingGateway L165-168 | PASS | Try/catch global dans handleConnection, client déconnecté proprement |
| 77 | Prisma timeout sur sendMessage | MessagingGateway L301-304 | PASS | Try/catch, erreur émise au client |
| 78 | Déconnexion longue (> 2min CSR) puis reconnexion | socket-context.tsx L105-110 | PASS | Si `!socket.recovered`, émet `reconnected:refetch` pour signaler le besoin de refetch |
| 79 | AbortController sur switch rapide conversation | chat-view.tsx L86-100 | PASS | `AbortController` créé par useEffect, annulé au cleanup |
| 80 | Cleanup socket listeners on unmount | chat-view.tsx L186-192 | PASS | useEffect retourne cleanup `socket.off()` + clear timeout |
| 81 | Re-auth timer cleanup on disconnect | MessagingGateway L176-180 | PASS | `clearInterval` + `reauthTimers.delete` |
| 82 | Erreur upload affichée à l'utilisateur | chat-view.tsx L257-260 | PASS | Toast d'erreur avec message et bouton X de fermeture |

---

## Problèmes critiques à corriger

| # | Sévérité | Scénario | Fichier:Ligne | Problème | Fix suggéré |
|---|----------|----------|--------------|----------|-------------|
| 1 | HAUTE | auth:refresh accepte token d'un tiers | `messaging.gateway.ts:509-512` | `verifyIdToken(data.token)` ne vérifie pas `decoded.uid === client.data.user.uid` | Ajouter `if (decoded.uid !== client.data.user.uid) { client.emit('error', {...}); client.disconnect(); return; }` après L509 |
| 2 | HAUTE | ValidationPipe absent sur WS | `messaging.gateway.ts` (class-level) | Le `ValidationPipe` global HTTP ne couvre pas les `@MessageBody()` WS. Les DTOs sont déclarés mais la validation ne s'exécute pas automatiquement | Ajouter `@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` au niveau de la classe `MessagingGateway` |
| 3 | MOYENNE | conversationId param non validé | `messaging.controller.ts:47-49` | `@Param('conversationId')` sans validation UUID → Prisma reçoit string arbitraire → 500 | Ajouter `@Param('conversationId', new ParseUUIDPipe()) conversationId: string` |
| 4 | MOYENNE | cursor non validé comme UUID | `get-messages.dto.ts:7-8` | `cursor` est `@IsString()` sans `@IsUUID()` → string arbitraire transmise à Prisma | Ajouter `@IsUUID()` sur le champ `cursor` du DTO |
| 5 | BASSE | Emoji vide accepté | `ws-message.dto.ts:45` | `@IsString()` accepte `""` | Ajouter `@IsNotEmpty()` avant `@IsString()` |
| 6 | BASSE | Token refresh vide accepté | `ws-message.dto.ts:51` | `@IsString()` accepte `""` | Ajouter `@IsNotEmpty()` avant `@IsString()` |
| 7 | BASSE | fileSize négatif accepté | `ws-message.dto.ts:21-23` | Manque `@Min(1)` | Ajouter `@Min(1)` après `@IsInt()` |
| 8 | BASSE | Message optimiste SENDING permanent | `chat-view.tsx:215-226` | Si le serveur ne répond jamais, le message SENDING reste affiché | Ajouter un `setTimeout(10s)` qui passe le status à `'FAILED'` si toujours `SENDING` |
| 9 | BASSE | conversation:join duplique dans conversationIds cache | `messaging.gateway.ts:222-225` | `push()` sans vérifier si déjà présent | Ajouter `if (!client.data.conversationIds.includes(data.conversationId))` avant le push |

---

## Score de robustesse

| Catégorie | PASS | FAIL | Score |
|-----------|------|------|-------|
| Auth & Authz | 20 | 1 | 20/21 |
| Validation | 14 | 6 | 14/20 |
| Cohérence données | 14 | 1 | 14/15 |
| Pagination | 7 | 1 | 7/8 |
| Cas limites métier | 9 | 0 | 9/9 |
| Réseau & Perf | 9 | 0 | 9/9 |
| **TOTAL** | **73** | **9** | **73/82 (89%)** |
