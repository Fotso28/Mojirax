# Design — Admin : Ban utilisateur & Archive projet

> Date : 2026-03-13
> Statut : Validé

---

## Contexte

L'admin doit pouvoir :
- **Bannir** un utilisateur (définitif, avec possibilité de débannir)
- **Archiver** un projet (soft delete par l'admin, réversible)

Actuellement, l'admin peut changer les rôles et modérer les projets/candidats, mais aucun mécanisme de ban ou d'archivage admin n'existe.

---

## 1. Modèle de données

### Nouveau enum `AccountStatus`

```prisma
enum AccountStatus {
  ACTIVE
  BANNED
}
```

### Modification du modèle `User`

```prisma
model User {
  // ... champs existants
  status AccountStatus @default(ACTIVE)
}
```

### Modification de l'enum `ModerationStatus`

```prisma
enum ModerationStatus {
  DRAFT
  ANALYZING
  PENDING_AI
  PUBLISHED
  REJECTED
  REMOVED_BY_ADMIN  // nouveau
}
```

### Logging

Les actions admin sont loguées dans la table `AdminLog` existante avec les valeurs exactes :
- `BAN_USER` — details : `{ reason: string, archivedProjectIds: string[] }`
- `UNBAN_USER` — details : `{ reason?: string, restoredProjectIds: string[] }`
- `ARCHIVE_PROJECT` — details : `{ reason: string }`
- `RESTORE_PROJECT` — details : `{}`

Pas de nouvelle table.

---

## 2. Endpoints API

Tous protégés par `@UseGuards(FirebaseAuthGuard, AdminGuard)`.

### DTOs

```typescript
// BanUserDto
export class BanUserDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

// UnbanUserDto (optionnel)
export class UnbanUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

// ArchiveProjectDto
export class ArchiveProjectDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
```

### `PATCH /admin/users/:id/ban`

- **Body** : `BanUserDto` (raison obligatoire)
- **Actions** (transaction Prisma) :
  1. Vérifier que l'utilisateur cible n'est pas admin (empêcher ban d'admin)
  2. `user.status` → `BANNED`
  3. Tous ses projets `PUBLISHED` → `REMOVED_BY_ADMIN`
  4. Créer `AdminLog` avec action `BAN_USER` + `archivedProjectIds` dans details
- **Retour** : `{ id, name, email, role, status }` (select explicite)

### `PATCH /admin/users/:id/unban`

- **Body** : `UnbanUserDto` (raison optionnelle)
- **Actions** (transaction Prisma) :
  1. `user.status` → `ACTIVE`
  2. Restaurer **uniquement** les projets dont les IDs ont été stockés dans le `AdminLog.details.archivedProjectIds` du ban correspondant (pas tous les `REMOVED_BY_ADMIN` — un projet archivé individuellement avant le ban ne doit pas être restauré)
  3. Créer `AdminLog` avec action `UNBAN_USER` + `restoredProjectIds`
- **Retour** : `{ id, name, email, role, status }` (select explicite)

### `PATCH /admin/projects/:id/archive`

- **Body** : `ArchiveProjectDto` (raison obligatoire)
- **Actions** :
  1. `project.status` → `REMOVED_BY_ADMIN`
  2. Créer `AdminLog` avec action `ARCHIVE_PROJECT`
- **Retour** : `{ id, name, status, founderId }` (select explicite)

### `PATCH /admin/projects/:id/restore`

- **Actions** :
  1. `project.status` → `PUBLISHED` (depuis `REMOVED_BY_ADMIN` uniquement)
  2. Créer `AdminLog` avec action `RESTORE_PROJECT`
- **Retour** : `{ id, name, status, founderId }` (select explicite)

### Modification `GET /admin/kpis`

Ajouter aux stats retournées :
- `bannedUsers` : nombre d'utilisateurs avec `status === BANNED`
- `archivedByAdminProjects` : nombre de projets avec `status === REMOVED_BY_ADMIN`

### Mise à jour DTOs existants

- `ListProjectsDto.status` : ajouter `REMOVED_BY_ADMIN` aux valeurs `@IsIn()`
- `ListUsersDto` : ajouter un champ optionnel `status` filtrable par `ACTIVE` / `BANNED`

---

## 3. Guard & Auth

### `FirebaseStrategy`

Après validation du token Firebase, vérifier `user.status` en BDD :
- Si `BANNED` → `ForbiddenException` avec réponse `{ statusCode: 403, code: 'ACCOUNT_BANNED', message: 'Votre compte a été désactivé, contactez le support' }`
- **Performance** : Le check BDD est acceptable car `FirebaseStrategy.validate()` est appelé uniquement sur les routes protégées et la requête est un simple `findUnique` sur un champ indexé (`firebaseUid`). Si la latence devient un problème, un cache Redis (TTL 60s) pourra être ajouté ultérieurement.

### `MessagingGateway` — `handleConnection`

Après vérification du token, vérifier `user.status` :
- Si `BANNED` → `client.disconnect()` immédiat

### `MessagingGateway` — Déconnexion active au ban

Quand un admin bannit un utilisateur, le service doit émettre un événement pour déconnecter les sockets actifs de cet utilisateur via `server.sockets`.

### Frontend — Axios interceptor

Intercepter le 403 avec `code === 'ACCOUNT_BANNED'` spécifiquement (distinct d'un 403 normal) :
- Afficher un message "Votre compte a été désactivé, contactez le support"
- `signOut()` Firebase
- Redirect vers `/login`

---

## 4. Interface Admin

### Page Utilisateurs (`/admin/users`)

- Inclure le champ `status` dans le select de `listUsers` et `getUserDetail`
- Badge rouge "Banni" à côté du nom des utilisateurs `BANNED`
- Bouton "Bannir" (rouge) → modale `ConfirmDialog` avec champ "Raison" obligatoire (min 5 chars)
- Bouton "Débannir" (vert) sur les bannis → modale `ConfirmDialog` de confirmation
- Filtre par statut (Actif / Banni) dans la liste

### Page Projets (`/admin/projects`)

- Badge "Archivé par admin" sur les projets `REMOVED_BY_ADMIN`
- Bouton "Archiver" (orange) sur les projets `PUBLISHED` → modale avec champ "Raison"
- Bouton "Restaurer" (vert) sur les projets archivés → modale de confirmation
- `REMOVED_BY_ADMIN` disponible dans le filtre de statut

### Dashboard KPIs (`/admin`)

- Section utilisateurs : compteur "Bannis"
- Section projets : compteur "Archivés par admin"

### Composants UI

- Modales via `ConfirmDialog` existant (jamais `window.confirm`)
- Style conforme au `UI-STYLE-GUIDE.md`

---

## 5. Flux de données

### Ban

1. Admin → "Bannir" → modale (raison) → `PATCH /admin/users/:id/ban`
2. Transaction Prisma : `user.status = BANNED` + projets `PUBLISHED` → `REMOVED_BY_ADMIN` + `AdminLog` (avec `archivedProjectIds`)
3. Déconnexion WebSocket active de l'utilisateur banni
4. Utilisateur banni → prochaine requête API → 403 `ACCOUNT_BANNED`
5. Frontend intercepte → signOut → redirect login

### Déban

1. Admin → "Débannir" → confirmation → `PATCH /admin/users/:id/unban`
2. Transaction : `user.status = ACTIVE` + restauration des projets listés dans `AdminLog.details.archivedProjectIds` du ban + `AdminLog`
3. Utilisateur peut se reconnecter

### Archive projet

1. Admin → "Archiver" → modale (raison) → `PATCH /admin/projects/:id/archive`
2. `project.status = REMOVED_BY_ADMIN` + `AdminLog`
3. Projet exclu du feed/search (filtré par `status: PUBLISHED` existant)

### Restore projet

1. Admin → "Restaurer" → confirmation → `PATCH /admin/projects/:id/restore`
2. `project.status = PUBLISHED` + `AdminLog`

---

## 6. Sécurité

- Un admin ne peut pas se bannir lui-même
- Un admin ne peut pas bannir un autre admin
- La raison est obligatoire pour ban et archive (min 5 caractères)
- Toutes les actions sont loguées dans `AdminLog`
- Le check de ban se fait côté guard (impossible de contourner)
- Réponse 403 avec `code: 'ACCOUNT_BANNED'` pour distinguer du 403 classique
- Vérifier que `search.service.ts` filtre bien par `status: PUBLISHED` pour exclure `REMOVED_BY_ADMIN`

---

## 7. Fichiers impactés

- `api/prisma/schema.prisma` — ajout `AccountStatus`, `status` sur User, `REMOVED_BY_ADMIN` dans ModerationStatus
- `api/src/admin/admin.controller.ts` — nouveaux endpoints ban/unban/archive/restore
- `api/src/admin/admin.service.ts` — logique métier
- `api/src/admin/dto/admin.dto.ts` — nouveaux DTOs + mise à jour `ListProjectsDto`, `ListUsersDto`
- `api/src/auth/firebase.strategy.ts` — check ban
- `api/src/messaging/messaging.gateway.ts` — check ban + déconnexion active
- `web/src/api/axios-instance.ts` — interceptor 403 `ACCOUNT_BANNED`
- `web/src/app/admin/page.tsx` — KPIs bannis/archivés
- `web/src/app/admin/users/page.tsx` — boutons ban/unban + badge + filtre
- `web/src/app/admin/projects/page.tsx` — boutons archive/restore + badge + filtre
