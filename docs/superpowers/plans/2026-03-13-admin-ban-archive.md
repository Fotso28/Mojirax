# Admin Ban & Archive — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to ban users (with automatic project archival) and archive/restore individual projects.

**Architecture:** Add `AccountStatus` enum + `status` field on User, add `REMOVED_BY_ADMIN` to `ModerationStatus`, new admin endpoints for ban/unban/archive/restore, ban check in FirebaseStrategy + WebSocket gateway, frontend admin UI updates with badges and action buttons.

**Tech Stack:** NestJS 11, Prisma, PostgreSQL, Next.js 16, Axios, Lucide React, class-validator

**Spec:** `docs/superpowers/specs/2026-03-13-admin-ban-archive-design.md`

---

## Chunk 1: Database & DTOs

### Task 1: Prisma schema migration

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Add `AccountStatus` enum and `REMOVED_BY_ADMIN` to schema**

In `api/prisma/schema.prisma`, add the new enum after `UserRole`:

```prisma
enum AccountStatus {
  ACTIVE
  BANNED
}
```

Add `status` field to the `User` model (after the `role` field, line ~30):

```prisma
  status    AccountStatus @default(ACTIVE)
```

Add `REMOVED_BY_ADMIN` to the `ModerationStatus` enum:

```prisma
enum ModerationStatus {
  DRAFT
  ANALYZING
  PENDING_AI
  PUBLISHED
  REJECTED
  REMOVED_BY_ADMIN
}
```

- [ ] **Step 2: Generate and apply migration**

Run:
```bash
cd api && npx prisma migrate dev --name add_account_status_and_removed_by_admin
```

Expected: Migration created and applied successfully. Existing users get `ACTIVE` status by default.

- [ ] **Step 3: Verify Prisma client regenerated**

Run:
```bash
cd api && npx prisma generate
```

Expected: `AccountStatus` enum and updated `ModerationStatus` available in generated client.

- [ ] **Step 4: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(schema): add AccountStatus enum and REMOVED_BY_ADMIN moderation status"
```

---

### Task 2: Admin DTOs for ban/unban/archive

**Files:**
- Modify: `api/src/admin/dto/admin.dto.ts`

- [ ] **Step 1: Add BanUserDto, UnbanUserDto, ArchiveProjectDto**

Add these imports at the top of `api/src/admin/dto/admin.dto.ts`:

```typescript
import { MinLength } from 'class-validator';
```

Then add at the end of the file:

```typescript
export class BanUserDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class UnbanUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ArchiveProjectDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
```

Note: `MaxLength` is already imported. Check if `MinLength` needs importing — add it to the existing `class-validator` import line.

- [ ] **Step 2: Update `ListProjectsDto` to accept `REMOVED_BY_ADMIN`**

In `ListProjectsDto`, change the `@IsIn` decorator:

```typescript
  @IsOptional()
  @IsIn(['DRAFT', 'ANALYZING', 'PENDING_AI', 'PUBLISHED', 'REJECTED', 'REMOVED_BY_ADMIN'])
  status?: string;
```

- [ ] **Step 3: Add `status` filter to `ListUsersDto`**

Add to `ListUsersDto`:

```typescript
  @IsOptional()
  @IsIn(['ACTIVE', 'BANNED'])
  status?: string;
```

- [ ] **Step 4: Commit**

```bash
git add api/src/admin/dto/admin.dto.ts
git commit -m "feat(admin): add DTOs for ban/unban/archive and update list filters"
```

---

## Chunk 2: Backend Service & Controller

### Task 3: Admin service — ban/unban methods

**Files:**
- Modify: `api/src/admin/admin.service.ts`

- [ ] **Step 1: Add `banUser` method**

Add to `AdminService` class:

```typescript
  // ─── Ban / Unban ──────────────────────────────────────────

  async banUser(adminId: string, userId: string, dto: BanUserDto) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true, name: true, email: true },
    });

    if (!target) throw new NotFoundException('Utilisateur introuvable');
    if (target.role === 'ADMIN') throw new BadRequestException('Impossible de bannir un administrateur');
    if (target.status === 'BANNED') throw new BadRequestException('Utilisateur déjà banni');

    // Find published projects to archive
    const publishedProjects = await this.prisma.project.findMany({
      where: { founderId: userId, status: 'PUBLISHED' },
      select: { id: true },
    });
    const archivedProjectIds = publishedProjects.map((p) => p.id);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'BANNED' },
      }),
      ...(archivedProjectIds.length > 0
        ? [
            this.prisma.project.updateMany({
              where: { id: { in: archivedProjectIds } },
              data: { status: 'REMOVED_BY_ADMIN' },
            }),
          ]
        : []),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'BAN_USER',
          targetId: userId,
          details: { reason: dto.reason, archivedProjectIds },
        },
      }),
    ]);

    this.logger.warn(`User banned: userId=${userId} by adminId=${adminId}, reason="${dto.reason}", archivedProjects=${archivedProjectIds.length}`);

    return { id: target.id, name: target.name, email: target.email, role: target.role, status: 'BANNED' as const, archivedProjects: archivedProjectIds.length };
  }
```

- [ ] **Step 2: Add `unbanUser` method**

```typescript
  async unbanUser(adminId: string, userId: string, dto: UnbanUserDto) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, name: true, email: true, role: true },
    });

    if (!target) throw new NotFoundException('Utilisateur introuvable');
    if (target.status !== 'BANNED') throw new BadRequestException('Utilisateur non banni');

    // Find the BAN_USER log to get archivedProjectIds
    const banLog = await this.prisma.adminLog.findFirst({
      where: { targetId: userId, action: 'BAN_USER' },
      orderBy: { createdAt: 'desc' },
      select: { details: true },
    });

    const archivedProjectIds: string[] = (banLog?.details as any)?.archivedProjectIds ?? [];

    // Only restore projects that are still REMOVED_BY_ADMIN (not manually restored)
    const projectsToRestore = archivedProjectIds.length > 0
      ? await this.prisma.project.findMany({
          where: { id: { in: archivedProjectIds }, status: 'REMOVED_BY_ADMIN' },
          select: { id: true },
        })
      : [];
    const restoredProjectIds = projectsToRestore.map((p) => p.id);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      }),
      ...(restoredProjectIds.length > 0
        ? [
            this.prisma.project.updateMany({
              where: { id: { in: restoredProjectIds } },
              data: { status: 'PUBLISHED' },
            }),
          ]
        : []),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'UNBAN_USER',
          targetId: userId,
          details: { reason: dto.reason ?? null, restoredProjectIds },
        },
      }),
    ]);

    this.logger.log(`User unbanned: userId=${userId} by adminId=${adminId}, restoredProjects=${restoredProjectIds.length}`);

    return { id: target.id, name: target.name, email: target.email, role: target.role, status: 'ACTIVE' as const, restoredProjects: restoredProjectIds.length };
  }
```

- [ ] **Step 3: Add `archiveProject` and `restoreProject` methods**

```typescript
  // ─── Archive / Restore Project ────────────────────────────

  async archiveProject(adminId: string, projectId: string, dto: ArchiveProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true, founderId: true },
    });

    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.status === 'REMOVED_BY_ADMIN') throw new BadRequestException('Projet déjà archivé');
    if (project.status !== 'PUBLISHED') throw new BadRequestException('Seuls les projets publiés peuvent être archivés');

    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'REMOVED_BY_ADMIN' },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'ARCHIVE_PROJECT',
          targetId: projectId,
          details: { reason: dto.reason, projectName: project.name },
        },
      }),
    ]);

    this.logger.warn(`Project archived: projectId=${projectId} by adminId=${adminId}, reason="${dto.reason}"`);

    return { id: project.id, name: project.name, status: 'REMOVED_BY_ADMIN' as const, founderId: project.founderId };
  }

  async restoreProject(adminId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true, founderId: true },
    });

    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.status !== 'REMOVED_BY_ADMIN') throw new BadRequestException('Seuls les projets archivés par admin peuvent être restaurés');

    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'PUBLISHED' },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: 'RESTORE_PROJECT',
          targetId: projectId,
          details: { projectName: project.name },
        },
      }),
    ]);

    this.logger.log(`Project restored: projectId=${projectId} by adminId=${adminId}`);

    return { id: project.id, name: project.name, status: 'PUBLISHED' as const, founderId: project.founderId };
  }
```

- [ ] **Step 4: Add import for new DTOs**

At the top of `admin.service.ts`, update the DTO import:

```typescript
import {
  ListUsersDto,
  ListModerationDto,
  ModerationActionDto,
  ChangeRoleDto,
  ListTransactionsDto,
  ListLogsDto,
  ListProjectsDto,
  BanUserDto,
  UnbanUserDto,
  ArchiveProjectDto,
} from './dto/admin.dto';
```

- [ ] **Step 5: Update `getKpis` to include banned/archived counts**

In the `getKpis` method, add these two counts to the existing `Promise.all` array:

```typescript
      // Add to the existing Promise.all:
      this.prisma.user.count({ where: { status: 'BANNED' } }),
      this.prisma.project.count({ where: { status: 'REMOVED_BY_ADMIN' } }),
```

Destructure them (add at the end of the existing destructuring):

```typescript
      bannedUsersCount,
      archivedByAdminCount,
```

Add to the return object, inside `users`:

```typescript
        banned: bannedUsersCount,
```

Add to the return object, inside `projects`:

```typescript
        archivedByAdmin: archivedByAdminCount,
```

- [ ] **Step 6: Update `listUsers` to support `status` filter**

In the `listUsers` method, add to the `where` clause building:

```typescript
    if (dto.status) where.status = dto.status;
```

Also add `status` to the `select` clause of the `findMany`:

```typescript
    select: { id: true, name: true, email: true, role: true, status: true, image: true, createdAt: true, _count: { ... } },
```

- [ ] **Step 7: Update `getUserDetail` to include `status`**

In the `getUserDetail` method, add `status: true` to the top-level `select` object of the `findUnique` call.

- [ ] **Step 8: Commit**

```bash
git add api/src/admin/admin.service.ts
git commit -m "feat(admin): add ban/unban/archive/restore service methods and KPI updates"
```

---

### Task 4: Admin controller — new endpoints

**Files:**
- Modify: `api/src/admin/admin.controller.ts`

- [ ] **Step 1: Add import for new DTOs**

Update the DTO import in `admin.controller.ts`:

```typescript
import {
  ListUsersDto,
  ListModerationDto,
  ModerationActionDto,
  ChangeRoleDto,
  ListTransactionsDto,
  ListLogsDto,
  ListProjectsDto,
  BanUserDto,
  UnbanUserDto,
  ArchiveProjectDto,
} from './dto/admin.dto';
```

- [ ] **Step 2: Add ban/unban endpoints**

Add after the `changeUserRole` method:

```typescript
  @Patch('users/:id/ban')
  async banUser(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminService.banUser(req.user.dbId, id, dto);
  }

  @Patch('users/:id/unban')
  async unbanUser(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UnbanUserDto,
  ) {
    return this.adminService.unbanUser(req.user.dbId, id, dto);
  }
```

- [ ] **Step 3: Add archive/restore endpoints**

Add after the `listProjects` method:

```typescript
  @Patch('projects/:id/archive')
  async archiveProject(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ArchiveProjectDto,
  ) {
    return this.adminService.archiveProject(req.user.dbId, id, dto);
  }

  @Patch('projects/:id/restore')
  async restoreProject(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.adminService.restoreProject(req.user.dbId, id);
  }
```

- [ ] **Step 4: Commit**

```bash
git add api/src/admin/admin.controller.ts
git commit -m "feat(admin): add ban/unban/archive/restore endpoints"
```

---

## Chunk 3: Auth Guard & WebSocket

### Task 5: Ban check in FirebaseStrategy

**Files:**
- Modify: `api/src/auth/firebase.strategy.ts`

- [ ] **Step 1: Inject PrismaService and add ban check**

Update `api/src/auth/firebase.strategy.ts`:

```typescript
import { Inject, Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-firebase-jwt';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(Strategy, 'firebase-jwt') {
    private readonly logger = new Logger(FirebaseStrategy.name);

    constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    async validate(token: string): Promise<admin.auth.DecodedIdToken> {
        try {
            const firebaseUser = await admin.auth().verifyIdToken(token);
            if (!firebaseUser) {
                throw new UnauthorizedException();
            }

            // Check if user is banned
            const user = await this.prisma.user.findUnique({
                where: { firebaseUid: firebaseUser.uid },
                select: { status: true },
            });

            if (user?.status === 'BANNED') {
                this.logger.warn(`Banned user attempted access: firebaseUid=${firebaseUser.uid}`);
                throw new ForbiddenException({
                    statusCode: 403,
                    code: 'ACCOUNT_BANNED',
                    message: 'Votre compte a été désactivé, contactez le support',
                });
            }

            return firebaseUser;
        } catch (error) {
            if (error instanceof ForbiddenException) throw error;
            this.logger.warn(`Firebase token validation failed: ${(error as Error).message}`);
            throw new UnauthorizedException('Invalid Firebase Token');
        }
    }
}
```

Note: `PrismaService` must be available in the auth module. Check `api/src/auth/auth.module.ts` — if `PrismaModule` is not imported, add it.

- [ ] **Step 2: Ensure PrismaService is available in AuthModule**

Check `api/src/auth/auth.module.ts`. `PrismaService` is already listed in `providers`, so the constructor injection will work. If not, add `PrismaModule` to `imports`:

```typescript
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PassportModule, PrismaModule],
  // ...
})
```

- [ ] **Step 3: Commit**

```bash
git add api/src/auth/firebase.strategy.ts api/src/auth/auth.module.ts
git commit -m "feat(auth): add ban check in FirebaseStrategy"
```

---

### Task 6: Ban check in WebSocket gateway

**Files:**
- Modify: `api/src/messaging/messaging.gateway.ts`

- [ ] **Step 1: Add ban check in `handleConnection`**

In `handleConnection`, after the `resolveUserId` call (line ~119), add:

```typescript
      // Check if user is banned
      const userRecord = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });
      if (userRecord?.status === 'BANNED') {
        this.logger.warn(`Banned user tried to connect: userId=${userId}`);
        client.emit('error', { code: 'ACCOUNT_BANNED', message: 'Votre compte a été désactivé' });
        client.disconnect();
        return;
      }
```

Insert this block between `const userId = await this.messagingService.resolveUserId(uid);` (line 119) and `client.data.user = { uid, userId };` (line 122).

- [ ] **Step 2: Add `disconnectUser` method for active disconnect**

Add to `MessagingGateway` class:

```typescript
  /**
   * Disconnect all sockets belonging to a specific user (used by admin ban).
   */
  async disconnectUser(userId: string): Promise<number> {
    let disconnected = 0;
    const sockets = await this.server.fetchSockets();
    for (const socket of sockets) {
      if (socket.data?.user?.userId === userId) {
        socket.emit('error', { code: 'ACCOUNT_BANNED', message: 'Votre compte a été désactivé' });
        socket.disconnect(true);
        disconnected++;
      }
    }
    if (disconnected > 0) {
      this.logger.warn(`Disconnected ${disconnected} socket(s) for banned userId=${userId}`);
    }
    return disconnected;
  }
```

- [ ] **Step 3: Call `disconnectUser` from `AdminService.banUser`**

In `api/src/admin/admin.service.ts`, inject `MessagingGateway`:

```typescript
import { MessagingGateway } from '../messaging/messaging.gateway';
```

Add to constructor:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly messagingGateway: MessagingGateway,
  ) {}
```

At the end of `banUser`, after the transaction and log, add:

```typescript
    // Disconnect active WebSocket sessions
    await this.messagingGateway.disconnectUser(userId);
```

Also add `MessagingModule` to `AdminModule` imports (or add `MessagingGateway` to providers if circular dependency). Check `api/src/admin/admin.module.ts` and use `forwardRef` if needed:

```typescript
import { forwardRef } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    // ... existing imports
    forwardRef(() => MessagingModule),
  ],
})
```

And export `MessagingGateway` from `MessagingModule` if not already exported.

- [ ] **Step 4: Commit**

```bash
git add api/src/messaging/messaging.gateway.ts api/src/admin/admin.service.ts api/src/admin/admin.module.ts api/src/messaging/messaging.module.ts
git commit -m "feat(ws): add ban check on WebSocket connection + active disconnect on ban"
```

---

## Chunk 4: Frontend — Axios Interceptor & Admin UI

### Task 7: Frontend 403 ban interceptor

**Files:**
- Modify: `web/src/api/axios-instance.ts`

- [ ] **Step 1: Add ACCOUNT_BANNED detection in response interceptor**

In the existing response interceptor in `web/src/api/axios-instance.ts`, add a check for ban before the existing 401 check:

```typescript
AXIOS_INSTANCE.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Check for banned account
        if (
            error.response?.status === 403 &&
            error.response?.data?.code === 'ACCOUNT_BANNED'
        ) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('db_user');
                // Import signOut dynamically to avoid circular deps
                const { auth } = await import('@/lib/firebase');
                const { signOut } = await import('firebase/auth');
                await signOut(auth).catch(() => {});
                alert('Votre compte a été désactivé, contactez le support');
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                const isLoginPage = window.location.pathname === '/login';
                const isAuthSync = error.config?.url?.includes('/auth/sync');
                if (!isLoginPage && !isAuthSync) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('db_user');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);
```

- [ ] **Step 2: Commit**

```bash
git add web/src/api/axios-instance.ts
git commit -m "feat(web): add ACCOUNT_BANNED 403 interceptor with signOut"
```

---

### Task 8: Admin Users page — ban/unban UI

**Files:**
- Modify: `web/src/app/admin/users/page.tsx`

- [ ] **Step 1: Add `status` to `UserItem` interface**

```typescript
interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;  // NEW
  image: string | null;
  createdAt: string;
  _count: { projects: number; transactions: number; notifications: number };
}
```

- [ ] **Step 2: Add ban/unban state variables**

In `AdminUsersPage`, after existing state declarations, add:

```typescript
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
```

- [ ] **Step 3: Add `status` filter to `fetchUsers` params**

In the `fetchUsers` callback, add after the `search` param:

```typescript
      if (statusFilter) params.status = statusFilter;
```

Also add `statusFilter` to the dependency array of `useCallback`.

- [ ] **Step 4: Add ban/unban handler functions**

```typescript
  const handleBan = async () => {
    if (!banningUserId || banReason.length < 5) return;
    setBanLoading(true);
    try {
      await api.patch(`/admin/users/${banningUserId}/ban`, { reason: banReason });
      setBanningUserId(null);
      setBanReason('');
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors du bannissement');
    } finally {
      setBanLoading(false);
    }
  };

  const [unbanningUserId, setUnbanningUserId] = useState<string | null>(null);
  const [unbanLoading, setUnbanLoading] = useState(false);

  const handleUnban = async () => {
    if (!unbanningUserId) return;
    setUnbanLoading(true);
    try {
      await api.patch(`/admin/users/${unbanningUserId}/unban`, {});
      setUnbanningUserId(null);
      fetchUsers();
    } catch {
      // handled silently — admin sees the user state didn't change
    } finally {
      setUnbanLoading(false);
    }
  };
```

Note: The `confirm` here is temporary — ideally replace with `ConfirmDialog` component if available. For MVP, this is acceptable in admin-only pages.

- [ ] **Step 5: Add status filter dropdown in the filter bar**

After the existing role filter `<select>`, add:

```tsx
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="BANNED">Banni</option>
            </select>
```

- [ ] **Step 6: Add "Banni" badge and ban/unban buttons in user rows**

In the user list table, after the role badge, add:

```tsx
                    {u.status === 'BANNED' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                        Banni
                      </span>
                    )}
```

Add ban/unban buttons in the actions column of each row:

```tsx
                    {u.role !== 'ADMIN' && (
                      u.status === 'BANNED' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setUnbanningUserId(u.id); }}
                          className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
                        >
                          Débannir
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setBanningUserId(u.id); }}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          Bannir
                        </button>
                      )
                    )}
```

- [ ] **Step 7: Add ban confirmation modal**

At the end of the component JSX, before the closing `</div>`, add:

```tsx
        {/* Ban Modal */}
        {banningUserId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bannir l'utilisateur</h3>
              <p className="text-sm text-gray-600 mb-3">
                L'utilisateur sera banni et tous ses projets publiés seront archivés.
              </p>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Raison du bannissement (min. 5 caractères)..."
                className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setBanningUserId(null); setBanReason(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleBan}
                  disabled={banReason.length < 5 || banLoading}
                  className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                >
                  {banLoading ? 'Bannissement...' : 'Confirmer le ban'}
                </button>
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 8: Add unban confirmation modal**

After the ban modal:

```tsx
        {/* Unban Modal */}
        {unbanningUserId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Débannir l'utilisateur</h3>
              <p className="text-sm text-gray-600 mb-3">
                L'utilisateur pourra se reconnecter et ses projets archivés lors du ban seront restaurés.
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setUnbanningUserId(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUnban}
                  disabled={unbanLoading}
                  className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                >
                  {unbanLoading ? 'Débannissement...' : 'Confirmer le déban'}
                </button>
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 9: Import `Ban` icon from lucide-react (optional)**

Add `Ban` to the lucide-react import if you want an icon on the ban button.

- [ ] **Step 9: Commit**

```bash
git add web/src/app/admin/users/page.tsx
git commit -m "feat(admin-ui): add ban/unban UI with modal, badge, and status filter"
```

---

### Task 9: Admin Projects page — archive/restore UI

**Files:**
- Modify: `web/src/app/admin/projects/page.tsx`

- [ ] **Step 1: Add `REMOVED_BY_ADMIN` to status constants**

```typescript
const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-50 text-green-600',
  PENDING_AI: 'bg-amber-50 text-amber-600',
  REJECTED: 'bg-red-50 text-red-600',
  DRAFT: 'bg-gray-100 text-gray-600',
  ANALYZING: 'bg-blue-50 text-blue-600',
  REMOVED_BY_ADMIN: 'bg-orange-50 text-orange-600',  // NEW
};

const STATUSES = ['', 'PUBLISHED', 'PENDING_AI', 'REJECTED', 'DRAFT', 'ANALYZING', 'REMOVED_BY_ADMIN'];
```

- [ ] **Step 2: Add archive/restore state and handlers**

```typescript
  const [archivingProjectId, setArchivingProjectId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);

  const handleArchive = async () => {
    if (!archivingProjectId || archiveReason.length < 5) return;
    setArchiveLoading(true);
    try {
      await api.patch(`/admin/projects/${archivingProjectId}/archive`, { reason: archiveReason });
      setArchivingProjectId(null);
      setArchiveReason('');
      fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'archivage');
    } finally {
      setArchiveLoading(false);
    }
  };

  const [restoringProjectId, setRestoringProjectId] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const handleRestore = async () => {
    if (!restoringProjectId) return;
    setRestoreLoading(true);
    try {
      await api.patch(`/admin/projects/${restoringProjectId}/restore`);
      setRestoringProjectId(null);
      fetchProjects();
    } catch {
      // handled silently
    } finally {
      setRestoreLoading(false);
    }
  };
```

- [ ] **Step 3: Add archive/restore buttons in project rows**

In the project table row, add action buttons:

```tsx
                    {p.status === 'PUBLISHED' && (
                      <button
                        onClick={() => setArchivingProjectId(p.id)}
                        className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100"
                      >
                        Archiver
                      </button>
                    )}
                    {p.status === 'REMOVED_BY_ADMIN' && (
                      <button
                        onClick={() => setRestoringProjectId(p.id)}
                        className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
                      >
                        Restaurer
                      </button>
                    )}
```

- [ ] **Step 4: Add archive confirmation modal**

At the end of the component JSX:

```tsx
        {/* Archive Modal */}
        {archivingProjectId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Archiver le projet</h3>
              <p className="text-sm text-gray-600 mb-3">
                Le projet sera masqué du feed et des résultats de recherche.
              </p>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Raison de l'archivage (min. 5 caractères)..."
                className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setArchivingProjectId(null); setArchiveReason(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleArchive}
                  disabled={archiveReason.length < 5 || archiveLoading}
                  className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
                >
                  {archiveLoading ? 'Archivage...' : 'Confirmer l\'archivage'}
                </button>
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 5: Add restore confirmation modal**

After the archive modal:

```tsx
        {/* Restore Modal */}
        {restoringProjectId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurer le projet</h3>
              <p className="text-sm text-gray-600 mb-3">
                Le projet sera de nouveau visible dans le feed et les résultats de recherche.
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setRestoringProjectId(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoreLoading}
                  className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
                >
                  {restoreLoading ? 'Restauration...' : 'Confirmer la restauration'}
                </button>
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 6: Update Kpis interface to include `archivedByAdmin`**

```typescript
interface Kpis {
  total: number;
  published: number;
  pendingAi: number;
  rejected: number;
  archivedByAdmin: number;  // NEW
}
```

Update the KPI fetch:

```typescript
      .then((res) => setKpis({
        total: res.data.projects.total,
        published: res.data.projects.published,
        pendingAi: res.data.projects.pendingAi,
        rejected: res.data.moderation.rejectedToday,
        archivedByAdmin: res.data.projects.archivedByAdmin,
      }))
```

- [ ] **Step 6: Commit**

```bash
git add web/src/app/admin/projects/page.tsx
git commit -m "feat(admin-ui): add archive/restore UI with modal, badge, and status filter"
```

---

### Task 10: Admin Dashboard KPIs — banned/archived counters

**Files:**
- Modify: `web/src/app/admin/page.tsx`

- [ ] **Step 1: Update Kpis interface**

In the `Kpis` interface, add to `users`:

```typescript
  users: { total: number; admins: number; founders: number; candidates: number; unassigned: number; newThisWeek: number; banned: number };
```

Add to `projects`:

```typescript
  projects: { total: number; published: number; draft: number; pendingAi: number; analyzingDoc: number; rejected: number; archivedByAdmin: number };
```

- [ ] **Step 2: Add StatCards for banned users and archived projects**

In the `OverviewTab`, in the Users section grid, add:

```tsx
          <StatCard label="Bannis" value={kpis.users.banned} icon={Shield} color="text-red-600" bg="bg-red-50" />
```

In the Projects section grid, add:

```tsx
          <StatCard label="Archivés (admin)" value={kpis.projects.archivedByAdmin} icon={FileX} color="text-orange-600" bg="bg-orange-50" />
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/admin/page.tsx
git commit -m "feat(admin-ui): add banned users and archived projects KPI counters"
```

---

## Chunk 5: Verification

### Task 11: Build verification

- [ ] **Step 1: Build the API**

Run:
```bash
cd api && npx nest build
```

Expected: No compilation errors.

- [ ] **Step 2: Build the frontend**

Run:
```bash
cd web && npx next build
```

Expected: No compilation errors.

- [ ] **Step 3: Start API and verify new routes are mapped**

Run:
```bash
cd api && npx nest start
```

Check logs for:
```
Mapped {/admin/users/:id/ban, PATCH} route
Mapped {/admin/users/:id/unban, PATCH} route
Mapped {/admin/projects/:id/archive, PATCH} route
Mapped {/admin/projects/:id/restore, PATCH} route
```

- [ ] **Step 4: Manual test via curl**

Test ban endpoint (replace `TOKEN` with a valid admin Firebase token and `USER_ID` with a test user ID):

```bash
curl -X PATCH http://localhost:3001/admin/users/USER_ID/ban \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Test ban from admin"}'
```

Expected: 200 with `{ id, name, status: "BANNED", archivedProjects: N }`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(admin): complete ban/archive feature — schema, endpoints, guards, UI"
```
