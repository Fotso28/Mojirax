# Single Published Project Per Founder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce that each founder can have at most 1 PUBLISHED project at a time, and fix the 2 code paths that bypass existing archival logic.

**Architecture:** Extract a shared `archivePublishedProjects(tx, founderId)` helper in `ProjectsService`. Fix `DocumentAnalysisService.analyzeProject()` and `ProjectsController.publish()` to call it before setting PUBLISHED. Frontend sorts projects (PUBLISHED first), shows warnings when creating while one is already published.

**Tech Stack:** NestJS, Prisma, Next.js, React

---

### Task 1: Extract shared archival helper in ProjectsService

**Files:**
- Modify: `api/src/projects/projects.service.ts`

**Step 1: Add the `archivePublishedProjects` method**

Add a new public method to `ProjectsService` that encapsulates the archival logic currently duplicated in `create()` and `createWithStatus()`. This method accepts a Prisma transaction client and a founderId.

```typescript
/**
 * Archive all PUBLISHED projects for a founder within a transaction.
 * Sets them to DRAFT, rejects pending applications, and notifies candidates.
 * Returns the number of archived projects.
 */
async archivePublishedProjects(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    founderId: string,
): Promise<number> {
    const publishedProjects = await tx.project.findMany({
        where: { founderId, status: 'PUBLISHED' },
        select: { id: true, name: true },
    });

    if (publishedProjects.length === 0) return 0;

    const publishedIds = publishedProjects.map(p => p.id);

    await tx.project.updateMany({
        where: { id: { in: publishedIds } },
        data: { status: 'DRAFT' },
    });

    const pendingApplications = await tx.application.findMany({
        where: {
            projectId: { in: publishedIds },
            status: 'PENDING',
        },
        include: {
            project: { select: { name: true } },
            candidate: {
                select: {
                    user: { select: { id: true } },
                },
            },
        },
    });

    if (pendingApplications.length > 0) {
        await tx.application.updateMany({
            where: {
                projectId: { in: publishedIds },
                status: 'PENDING',
            },
            data: { status: 'REJECTED' },
        });

        const notifications = pendingApplications.map(app => ({
            userId: app.candidate.user.id,
            type: 'SYSTEM' as const,
            title: 'Projet archivé',
            message: `Le projet ${app.project.name} a été archivé par le fondateur. Votre candidature en attente a été clôturée.`,
            data: { applicationId: app.id, projectId: app.projectId },
        }));

        await tx.notification.createMany({ data: notifications });
    }

    this.logger.log(`Archived ${publishedProjects.length} projects and rejected ${pendingApplications.length} pending applications for founder ${founderId}`);
    return publishedProjects.length;
}
```

**Step 2: Refactor `create()` to use the helper**

Replace the inline archival block (lines ~328-382) with:

```typescript
await this.archivePublishedProjects(tx, user.id);
```

**Step 3: Refactor `createWithStatus()` to use the helper**

Replace the inline archival block (lines ~450-499) with:

```typescript
await this.archivePublishedProjects(tx, user.id);
```

**Step 4: Verify API starts**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add api/src/projects/projects.service.ts
git commit -m "refactor: extract archivePublishedProjects helper in ProjectsService"
```

---

### Task 2: Fix publish() endpoint to archive before publishing

**Files:**
- Modify: `api/src/projects/projects.controller.ts`

**Step 1: Update the publish() method**

Replace the direct `prisma.project.update` with a transaction that calls `archivePublishedProjects` first:

```typescript
async publish(
    @Request() req,
    @Param('id') id: string,
) {
    const project = await this.findProjectAndVerifyOwnership(id, req.user.uid);

    if (!project.aiSummary) {
        throw new BadRequestException('Le projet doit avoir un resume IA avant publication.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
        await this.projectsService.archivePublishedProjects(tx, project.founderId);

        return tx.project.update({
            where: { id: project.id },
            data: { status: 'PUBLISHED' },
        });
    });

    this.logger.log(`Project ${project.id} published by owner`);
    return updated;
}
```

**Step 2: Verify API compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add api/src/projects/projects.controller.ts
git commit -m "fix: publish endpoint now archives other published projects first"
```

---

### Task 3: Fix DocumentAnalysisService to archive before publishing

**Files:**
- Modify: `api/src/documents/document-analysis.service.ts`
- Modify: `api/src/documents/document-analysis.module.ts` (if needed for injection)

**Step 1: Inject ProjectsService into DocumentAnalysisService**

Add `ProjectsService` to the constructor:

```typescript
import { ProjectsService } from '../projects/projects.service';

constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly storageService: DocumentStorageService,
    private readonly notificationsService: NotificationsService,
    private readonly projectsService: ProjectsService,
) {}
```

Note: Check the module file to ensure `ProjectsService` is provided. If there's a circular dependency, use `forwardRef`.

**Step 2: Wrap the final update in a transaction with archival**

In `analyzeProject()`, around line 102-128, replace the direct `prisma.project.update` with:

```typescript
// 6. Mettre à jour le projet en base (avec archivage si PUBLISHED)
await this.prisma.$transaction(async (tx) => {
    if (projectStatus === 'PUBLISHED') {
        await this.projectsService.archivePublishedProjects(tx, founderId);
    }

    await tx.project.update({
        where: { id: projectId },
        data: {
            aiSummary: summaryBlocks,
            ...(structuredFields.sector && { sector: structuredFields.sector }),
            ...(structuredFields.stage && { stage: structuredFields.stage }),
            ...(structuredFields.scope && { scope: structuredFields.scope }),
            ...(structuredFields.problem && { problem: structuredFields.problem }),
            ...(structuredFields.target && { target: structuredFields.target }),
            ...(structuredFields.solution_current && { solutionCurrent: structuredFields.solution_current }),
            ...(structuredFields.solution_desc && { solutionDesc: structuredFields.solution_desc }),
            ...(structuredFields.uvp && { uvp: structuredFields.uvp }),
            ...(structuredFields.anti_scope && { antiScope: structuredFields.anti_scope }),
            ...(structuredFields.market_type && { marketType: structuredFields.market_type }),
            ...(structuredFields.business_model && { businessModel: structuredFields.business_model }),
            ...(structuredFields.competitors && { competitors: structuredFields.competitors }),
            ...(structuredFields.founder_role && { founderRole: structuredFields.founder_role }),
            ...(structuredFields.time_availability && { timeAvailability: structuredFields.time_availability }),
            ...(structuredFields.traction && { traction: structuredFields.traction }),
            ...(structuredFields.looking_for_role && { lookingForRole: structuredFields.looking_for_role }),
            ...(structuredFields.collab_type && { collabType: structuredFields.collab_type }),
            ...(structuredFields.vision && { vision: structuredFields.vision }),
            ...(structuredFields.description && { description: structuredFields.description }),
            status: projectStatus,
        },
    });
});
```

**Step 3: Handle circular dependency if needed**

If `ProjectsModule` and `DocumentsModule` import each other, use `forwardRef`:

```typescript
// In document-analysis.module.ts
imports: [forwardRef(() => ProjectsModule)]

// In document-analysis.service.ts constructor
@Inject(forwardRef(() => ProjectsService))
private readonly projectsService: ProjectsService,
```

**Step 4: Verify API compiles**

Run: `cd api && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add api/src/documents/document-analysis.service.ts api/src/documents/document-analysis.module.ts
git commit -m "fix: document analysis now archives other published projects before publishing"
```

---

### Task 4: Frontend — Sort projects (PUBLISHED first) on my-project page

**Files:**
- Modify: `web/src/app/(dashboard)/my-project/page.tsx`

**Step 1: Sort projects before rendering**

After `const projects = dbUser?.projects ?? [];` (line 40), add sorting:

```typescript
const sortedProjects = [...projects].sort((a: any, b: any) => {
    if (a.status === 'PUBLISHED' && b.status !== 'PUBLISHED') return -1;
    if (a.status !== 'PUBLISHED' && b.status === 'PUBLISHED') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
});
```

Then replace `projects.map(` in the rendering with `sortedProjects.map(`.

Also update the `DeleteBottomSheet` `projectName` to search in `sortedProjects` (or keep using `projects` since it's for lookup by ID).

**Step 2: Verify it compiles**

Run: `cd web && npx next lint`

**Step 3: Commit**

```bash
git add web/src/app/\(dashboard\)/my-project/page.tsx
git commit -m "feat: sort projects with PUBLISHED first on my-project page"
```

---

### Task 5: Frontend — Warning banner when clicking "Nouveau projet"

**Files:**
- Modify: `web/src/app/(dashboard)/my-project/page.tsx`

**Step 1: Add warning state and confirmation logic**

Replace the simple `<Link>` for "Nouveau projet" with a conditional: if a PUBLISHED project exists, show a warning modal/banner before navigating.

```typescript
const [showNewProjectWarning, setShowNewProjectWarning] = useState(false);
const hasPublished = projects.some((p: any) => p.status === 'PUBLISHED');
```

For the "Nouveau projet" button:

```tsx
{hasPublished ? (
    <button
        onClick={() => setShowNewProjectWarning(true)}
        className="inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-6 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary shrink-0"
    >
        <Plus className="w-5 h-5" />
        Nouveau projet
    </button>
) : (
    <Link
        href="/create/project"
        className="inline-flex items-center justify-center gap-2 bg-kezak-primary text-white hover:bg-kezak-dark h-[52px] px-6 rounded-lg font-semibold transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary shrink-0"
    >
        <Plus className="w-5 h-5" />
        Nouveau projet
    </Link>
)}
```

**Step 2: Add warning banner component**

Below the button or as a bottom sheet:

```tsx
{showNewProjectWarning && (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Projet déjà publié</h3>
            </div>
            <p className="text-sm text-gray-600">
                Vous avez déjà un projet publié. En créer un nouveau archivera automatiquement votre projet actuel et clôturera les candidatures en attente.
            </p>
            <div className="flex gap-3 pt-2">
                <button
                    onClick={() => setShowNewProjectWarning(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Annuler
                </button>
                <Link
                    href="/create/project"
                    className="flex-1 px-4 py-2.5 bg-kezak-primary text-white rounded-lg text-sm font-semibold text-center hover:bg-kezak-dark transition-colors"
                >
                    Continuer
                </Link>
            </div>
        </div>
    </div>
)}
```

**Step 3: Add `AlertTriangle` to imports**

Add `AlertTriangle` to the lucide-react import.

**Step 4: Commit**

```bash
git add web/src/app/\(dashboard\)/my-project/page.tsx
git commit -m "feat: warning modal when creating new project while one is published"
```

---

### Task 6: Frontend — Warning text in AI Review step

**Files:**
- Modify: `web/src/app/create/project/steps/ai-review.tsx`

**Step 1: Fetch user's published projects**

Add a check at the top of `AiReviewStep` to detect if the user has a published project (only in create mode, not edit mode):

```typescript
const { dbUser } = useAuth();
const hasPublished = !isEditMode && (dbUser?.projects ?? []).some((p: any) => p.status === 'PUBLISHED');
```

Add `useAuth` import.

**Step 2: Add warning text below the title**

After the subtitle `<p>` tag, add:

```tsx
{hasPublished && (
    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">
            La publication de ce projet archivera automatiquement votre projet actuel et clôturera les candidatures en attente.
        </p>
    </div>
)}
```

**Step 3: Ensure `AlertTriangle` is already imported**

It should already be imported — verify.

**Step 4: Add the same warning in the submit button area**

In the actions section, below the "Publier le projet" button, add a small text:

```tsx
{hasPublished && (
    <p className="text-xs text-amber-600 text-center sm:text-right">
        Votre projet actuel sera archivé à la publication
    </p>
)}
```

**Step 5: Commit**

```bash
git add web/src/app/create/project/steps/ai-review.tsx
git commit -m "feat: warning in AI review when user has existing published project"
```

---

### Task 7: Verify full flow end-to-end

**Step 1: Start the API**

Run: `cd api && npm run start:dev`
Expected: Compiles and starts without errors

**Step 2: Start the web app**

Run: `cd web && npm run dev`
Expected: Compiles and starts without errors

**Step 3: Manual test checklist**

- [ ] Go to /my-project → projects sorted with PUBLISHED first
- [ ] Click "Nouveau projet" when a published project exists → warning modal appears
- [ ] Cancel → modal closes, no navigation
- [ ] Continue → navigates to /create/project
- [ ] Complete form → AI Review step shows warning banner
- [ ] Submit → old project archived to DRAFT, new project PUBLISHED
- [ ] Go to /my-project → only new project is PUBLISHED

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: enforce single published project per founder"
```
