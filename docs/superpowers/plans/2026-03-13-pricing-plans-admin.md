# Pricing Plans Admin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 administrable pricing plans (Gratuit, Plus, Pro, Elite) with full CRUD in the admin panel and an updated landing page pricing section.

**Architecture:** Migration updates `PricingPlan` model (Decimal price, currency, description). New admin endpoints in `AdminController` for CRUD + reorder. Landing public endpoint updated to include new fields. Frontend: pricing section supports 4 columns in EUR, admin gets a new "Tarifs" tab with modal create/edit.

**Tech Stack:** NestJS 11, Prisma, PostgreSQL, class-validator, Next.js 16, Tailwind CSS, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-13-pricing-plans-admin-design.md`

---

## Chunk 1: Database & Backend

### Task 1: Prisma Migration — Update PricingPlan model

**Files:**
- Modify: `api/prisma/schema.prisma` (lines 909-924, PricingPlan model)
- Create: `api/prisma/migrations/2026031X_update_pricing_plan_fields/migration.sql` (auto-generated)

- [ ] **Step 1: Update schema.prisma**

In `api/prisma/schema.prisma`, replace the `PricingPlan` model:

```prisma
model PricingPlan {
  id          String   @id @default(cuid())
  name        String
  price       Decimal  @default(0) @db.Decimal(10, 2)
  period      String   @default("mois")
  currency    String   @default("EUR")
  description String?
  features    String[]
  isPopular   Boolean  @default(false) @map("is_popular")
  isActive    Boolean  @default(true) @map("is_active")
  order       Int      @default(0)
  ctaLabel    String   @default("Commencer") @map("cta_label")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([isActive, order])
  @@map("pricing_plans")
}
```

- [ ] **Step 2: Generate and apply migration**

Run:
```bash
cd api && npx prisma migrate dev --name update_pricing_plan_fields
```

Expected: Migration created and applied. `price` column becomes `DECIMAL(10,2)`, new columns `currency` and `description` added.

- [ ] **Step 3: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(db): update PricingPlan model — Decimal price, currency, description"
```

---

### Task 2: Seed 4 default plans

**Files:**
- Modify: `api/prisma/seed.sql` (pricing plans section)

- [ ] **Step 1: Replace existing pricing plan seed data**

In `api/prisma/seed.sql`, find the existing `INSERT INTO pricing_plans` block and replace it with:

```sql
-- ============================================
-- PRICING PLANS
-- ============================================

DELETE FROM pricing_plans;

INSERT INTO pricing_plans (id, name, price, period, currency, description, features, is_popular, is_active, "order", cta_label, created_at, updated_at) VALUES

('plan_free', 'Gratuit', 0, 'mois', 'EUR',
 'Parfait pour découvrir MoJiraX et commencer à explorer.',
 ARRAY['Profil complet', 'Explorer & matcher', 'Ajouter des profils en favoris', 'Accès aux fonctionnalités de base', 'Découverte de la plateforme pendant 30 jours'],
 false, true, 0, 'Commencer gratuitement', NOW(), NOW()),

('plan_plus', 'Plus', 4.99, 'mois', 'EUR',
 'Idéal pour améliorer votre visibilité et augmenter vos chances.',
 ARRAY['Tout le plan Gratuit', 'Voir qui a consulté votre profil', 'Filtres avancés pour trouver des profils plus pertinents', 'Retour arrière sur le dernier swipe', 'Plus de visibilité dans les résultats', 'Expérience sans contenu sponsorisé'],
 false, true, 1, 'Passer au plan Plus', NOW(), NOW()),

('plan_pro', 'Pro', 9.99, 'mois', 'EUR',
 'Le plan le plus choisi pour multiplier les connexions.',
 ARRAY['Tout le plan Plus', 'Voir qui vous a aimé', 'Messages illimités', '5 boosts de visibilité par mois', 'Accès prioritaire aux profils les plus actifs', 'Statistiques de profil (vues, matchs, activité)', 'Badge Pro visible sur votre profil'],
 true, true, 2, 'Choisir le plan Pro', NOW(), NOW()),

('plan_elite', 'Elite', 19.99, 'mois', 'EUR',
 ''L''expérience MoJiraX la plus complète pour maximiser vos résultats.',
 ARRAY['Tout le plan Pro', 'Mise en avant prioritaire dans les recherches', 'Boosts supplémentaires pour plus de visibilité', 'Mode navigation privée (profil invisible)', 'Accès anticipé aux nouvelles fonctionnalités', 'Support prioritaire', 'Badge Elite exclusif'],
 false, true, 3, 'Choisir le plan Elite', NOW(), NOW());
```

- [ ] **Step 2: Run seed**

```bash
cd api && psql -U postgres -d co_founder_db -f prisma/seed.sql
```

Or if using npm script: `npm run db:seed`

- [ ] **Step 3: Commit**

```bash
git add api/prisma/seed.sql
git commit -m "feat(db): seed 4 default pricing plans (Gratuit, Plus, Pro, Elite)"
```

---

### Task 3: Admin DTOs for plans

**Files:**
- Create: `api/src/admin/dto/plan.dto.ts`

- [ ] **Step 1: Create DTOs file**

Create `api/src/admin/dto/plan.dto.ts`:

```typescript
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsInt, Min, Max, MaxLength, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreatePlanDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  period?: string = 'mois';

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string = 'EUR';

  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @IsBoolean()
  @IsOptional()
  isPopular?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  ctaLabel?: string = 'Commencer';

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number = 0;
}

export class UpdatePlanDto extends PartialType(CreatePlanDto) {}

export class ReorderPlanItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderPlansDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ReorderPlanItemDto)
  plans: ReorderPlanItemDto[];
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/admin/dto/plan.dto.ts
git commit -m "feat(admin): add plan CRUD DTOs with class-validator"
```

---

### Task 4: Admin service methods for plans

**Files:**
- Modify: `api/src/admin/admin.service.ts`

- [ ] **Step 1: Add plan CRUD methods to AdminService**

Add these methods at the end of `AdminService` class in `api/src/admin/admin.service.ts`:

```typescript
// ─── PRICING PLANS CRUD ───────────────────────────────

async listPlans() {
  return this.prisma.pricingPlan.findMany({
    orderBy: { order: 'asc' },
  });
}

async createPlan(dto: CreatePlanDto, adminId: string) {
  const plan = await this.prisma.pricingPlan.create({
    data: {
      name: dto.name,
      price: dto.price,
      period: dto.period ?? 'mois',
      currency: dto.currency ?? 'EUR',
      description: dto.description,
      features: dto.features,
      isPopular: dto.isPopular ?? false,
      isActive: dto.isActive ?? true,
      ctaLabel: dto.ctaLabel ?? 'Commencer',
      order: dto.order ?? 0,
    },
  });

  // If this plan is popular, un-popular all others
  if (plan.isPopular) {
    await this.prisma.pricingPlan.updateMany({
      where: { id: { not: plan.id }, isPopular: true },
      data: { isPopular: false },
    });
  }

  await this.prisma.adminLog.create({
    data: {
      adminId,
      action: 'CREATE_PLAN',
      targetId: plan.id,
      details: { name: plan.name, price: Number(plan.price) },
    },
  });

  this.logger.log(`Plan created: ${plan.name} (${plan.id})`);
  return plan;
}

async updatePlan(id: string, dto: UpdatePlanDto, adminId: string) {
  const existing = await this.prisma.pricingPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundException('Plan not found');

  const plan = await this.prisma.pricingPlan.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.period !== undefined && { period: dto.period }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.features !== undefined && { features: dto.features }),
      ...(dto.isPopular !== undefined && { isPopular: dto.isPopular }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.ctaLabel !== undefined && { ctaLabel: dto.ctaLabel }),
      ...(dto.order !== undefined && { order: dto.order }),
    },
  });

  // If this plan became popular, un-popular all others in a transaction
  if (dto.isPopular === true) {
    await this.prisma.pricingPlan.updateMany({
      where: { id: { not: id }, isPopular: true },
      data: { isPopular: false },
    });
  }

  await this.prisma.adminLog.create({
    data: {
      adminId,
      action: 'UPDATE_PLAN',
      targetId: id,
      details: { name: plan.name, changes: dto },
    },
  });

  this.logger.log(`Plan updated: ${plan.name} (${id})`);
  return plan;
}

async deletePlan(id: string, adminId: string) {
  const existing = await this.prisma.pricingPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundException('Plan not found');

  await this.prisma.pricingPlan.delete({ where: { id } });

  await this.prisma.adminLog.create({
    data: {
      adminId,
      action: 'DELETE_PLAN',
      targetId: id,
      details: { name: existing.name },
    },
  });

  this.logger.log(`Plan deleted: ${existing.name} (${id})`);
  return { success: true };
}

async reorderPlans(dto: ReorderPlansDto, adminId: string) {
  await this.prisma.$transaction(
    dto.plans.map((item) =>
      this.prisma.pricingPlan.update({
        where: { id: item.id },
        data: { order: item.order },
      }),
    ),
  );

  await this.prisma.adminLog.create({
    data: {
      adminId,
      action: 'REORDER_PLANS',
      targetId: null,
      details: { plans: dto.plans },
    },
  });

  this.logger.log('Plans reordered');
  return this.listPlans();
}
```

- [ ] **Step 2: Add imports at top of file**

Add to the imports of `admin.service.ts`:

```typescript
import { CreatePlanDto, UpdatePlanDto, ReorderPlansDto } from './dto/plan.dto';
import { NotFoundException } from '@nestjs/common';
```

(Check if `NotFoundException` is already imported)

- [ ] **Step 3: Commit**

```bash
git add api/src/admin/admin.service.ts
git commit -m "feat(admin): add plan CRUD service methods with AdminLog"
```

---

### Task 5: Admin controller endpoints for plans

**Files:**
- Modify: `api/src/admin/admin.controller.ts`

- [ ] **Step 1: Add plan endpoints to AdminController**

Add these routes to `AdminController` in `api/src/admin/admin.controller.ts`. **Important:** the `reorder` route must be declared BEFORE the `:id` route.

```typescript
// ─── PRICING PLANS ────────────────────────────────────

@Get('plans')
async listPlans() {
  const plans = await this.adminService.listPlans();
  return plans.map((p) => ({ ...p, price: Number(p.price) }));
}

@Post('plans')
async createPlan(@Request() req, @Body() dto: CreatePlanDto) {
  const plan = await this.adminService.createPlan(dto, req.user.dbId);
  return { ...plan, price: Number(plan.price) };
}

@Post('plans/reorder')
async reorderPlans(@Request() req, @Body() dto: ReorderPlansDto) {
  const plans = await this.adminService.reorderPlans(dto, req.user.dbId);
  return plans.map((p) => ({ ...p, price: Number(p.price) }));
}

@Patch('plans/:id')
async updatePlan(@Request() req, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
  const plan = await this.adminService.updatePlan(id, dto, req.user.dbId);
  return { ...plan, price: Number(plan.price) };
}

@Delete('plans/:id')
async deletePlan(@Request() req, @Param('id') id: string) {
  return this.adminService.deletePlan(id, req.user.dbId);
}
```

- [ ] **Step 2: Add imports**

Add to imports in the controller file:

```typescript
import { CreatePlanDto, UpdatePlanDto, ReorderPlansDto } from './dto/plan.dto';
```

Verify `Post`, `Delete`, `Param` are imported from `@nestjs/common`.

- [ ] **Step 3: Commit**

```bash
git add api/src/admin/admin.controller.ts
git commit -m "feat(admin): add plan CRUD endpoints with Decimal→number serialization"
```

---

### Task 6: Update public landing endpoint

**Files:**
- Modify: `api/src/landing/landing.service.ts`

- [ ] **Step 1: Update getPlans select to include description and currency**

In `api/src/landing/landing.service.ts`, find the `getPlans()` method and update the `select` to add `description` and `currency`:

```typescript
async getPlans() {
  const plans = await this.prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    take: 20,
    select: {
      id: true,
      name: true,
      price: true,
      period: true,
      currency: true,
      description: true,
      features: true,
      isPopular: true,
      order: true,
      ctaLabel: true,
    },
  });
  // Serialize Decimal to number
  return plans.map((p) => ({ ...p, price: Number(p.price) }));
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/landing/landing.service.ts
git commit -m "feat(landing): add currency + description to public plans endpoint, serialize Decimal"
```

---

## Chunk 2: Frontend

### Task 7: Update pricing-section.tsx for 4 columns + EUR

**Files:**
- Modify: `web/src/components/landing/pricing-section.tsx`

- [ ] **Step 1: Update the PricingPlan interface**

Add `currency` and `description` to the interface:

```typescript
interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  currency: string;
  description: string | null;
  features: string[];
  isPopular: boolean;
  ctaLabel: string;
}
```

- [ ] **Step 2: Update grid layout and container**

Change the container `max-w-5xl` to `max-w-7xl`.

Update the grid classes to support 4 columns:
```
grid-cols-1 md:grid-cols-2 lg:grid-cols-4
```

- [ ] **Step 3: Update price display format**

Replace the price display to use EUR formatting:

```tsx
<span className="text-4xl font-bold text-slate-900">
  {plan.price === 0 ? '0' : plan.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
</span>
<span className="text-lg text-slate-500 ml-1">€</span>
{plan.price > 0 && (
  <span className="text-sm text-slate-400 ml-1">/ {plan.period}</span>
)}
```

- [ ] **Step 4: Add description display**

Below the price, add the plan description:

```tsx
{plan.description && (
  <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
)}
```

- [ ] **Step 5: Update skeleton loader to 4 cards**

Change the skeleton grid to show 4 placeholder cards instead of 2, matching the `lg:grid-cols-4` layout.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/landing/pricing-section.tsx
git commit -m "feat(landing): update pricing section — 4 columns, EUR format, description"
```

---

### Task 8: Admin "Tarifs" tab — Plans list + CRUD

**Files:**
- Modify: `web/src/app/admin/page.tsx`

- [ ] **Step 1: Add plan type and state**

Add the `PricingPlan` interface and state variables at the top of the component:

```typescript
interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  currency: string;
  description: string | null;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  order: number;
  ctaLabel: string;
}
```

Add state:
```typescript
const [plans, setPlans] = useState<PricingPlan[]>([]);
const [plansLoading, setPlansLoading] = useState(false);
const [planModal, setPlanModal] = useState<{ open: boolean; plan: PricingPlan | null }>({ open: false, plan: null });
const [planForm, setPlanForm] = useState({
  name: '', price: 0, period: 'mois', currency: 'EUR', description: '',
  features: [''], isPopular: false, isActive: true, ctaLabel: 'Commencer', order: 0,
});
const [planSaving, setPlanSaving] = useState(false);
const [planDeleting, setPlanDeleting] = useState<string | null>(null);
```

- [ ] **Step 2: Add fetch and CRUD functions**

```typescript
const fetchPlans = async () => {
  setPlansLoading(true);
  try {
    const res = await api.get('/admin/plans');
    setPlans(res.data);
  } catch (err) { /* silent */ }
  finally { setPlansLoading(false); }
};

const savePlan = async () => {
  setPlanSaving(true);
  try {
    const payload = {
      ...planForm,
      features: planForm.features.filter((f) => f.trim() !== ''),
    };
    if (planModal.plan) {
      await api.patch(`/admin/plans/${planModal.plan.id}`, payload);
    } else {
      await api.post('/admin/plans', payload);
    }
    setPlanModal({ open: false, plan: null });
    fetchPlans();
  } catch (err) { /* handle error */ }
  finally { setPlanSaving(false); }
};

const deletePlan = async (id: string) => {
  setPlanDeleting(id);
  try {
    await api.delete(`/admin/plans/${id}`);
    fetchPlans();
  } catch (err) { /* handle error */ }
  finally { setPlanDeleting(null); }
};

const movePlan = async (id: string, direction: 'up' | 'down') => {
  const sorted = [...plans].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((p) => p.id === id);
  if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  const reordered = sorted.map((p, i) => {
    if (i === idx) return { id: p.id, order: sorted[swapIdx].order };
    if (i === swapIdx) return { id: p.id, order: sorted[idx].order };
    return { id: p.id, order: p.order };
  });
  try {
    const res = await api.post('/admin/plans/reorder', { plans: reordered });
    setPlans(res.data);
  } catch (err) { /* silent */ }
};

const togglePopular = async (id: string) => {
  try {
    await api.patch(`/admin/plans/${id}`, { isPopular: true });
    fetchPlans();
  } catch (err) { /* silent */ }
};

const toggleActive = async (id: string, isActive: boolean) => {
  try {
    await api.patch(`/admin/plans/${id}`, { isActive });
    fetchPlans();
  } catch (err) { /* silent */ }
};

const openPlanModal = (plan?: PricingPlan) => {
  if (plan) {
    setPlanForm({
      name: plan.name, price: plan.price, period: plan.period,
      currency: plan.currency, description: plan.description || '',
      features: plan.features.length > 0 ? plan.features : [''],
      isPopular: plan.isPopular, isActive: plan.isActive,
      ctaLabel: plan.ctaLabel, order: plan.order,
    });
    setPlanModal({ open: true, plan });
  } else {
    setPlanForm({
      name: '', price: 0, period: 'mois', currency: 'EUR', description: '',
      features: [''], isPopular: false, isActive: true, ctaLabel: 'Commencer',
      order: plans.length,
    });
    setPlanModal({ open: true, plan: null });
  }
};
```

- [ ] **Step 3: Add "Tarifs" tab to the tab list**

Find the tabs array and add a 6th tab:

```typescript
{ id: 'tarifs', label: 'Tarifs', icon: CreditCard }
```

Import `CreditCard` from `lucide-react`.

- [ ] **Step 4: Fetch plans when "Tarifs" tab is selected**

In the existing `useEffect` or tab change handler, add:
```typescript
if (activeTab === 'tarifs') fetchPlans();
```

- [ ] **Step 5: Add the "Tarifs" tab panel content**

Add the tab panel JSX after the last existing tab panel. It should contain:
- A header with title "Gestion des tarifs" and a "+ Nouveau plan" button
- A grid of plan cards (sorted by order), each showing: name, price in EUR, description, features count, badges (Populaire/Inactif), arrow up/down buttons, edit/delete buttons, active toggle
- A `ConfirmDialog` for delete confirmation

- [ ] **Step 6: Add the plan create/edit modal**

A modal (`planModal.open`) with fields:
- Name (input text)
- Price (input number, step 0.01)
- Period (input text)
- Description (textarea)
- Features (dynamic list: each feature has an input + remove button, plus "Ajouter une feature" button)
- CTA Label (input text)
- Populaire (checkbox)
- Actif (checkbox)
- Save/Cancel buttons

Modal styling should follow existing modals in the project: `framer-motion`, overlay `bg-black/50 backdrop-blur-sm`.

- [ ] **Step 7: Commit**

```bash
git add web/src/app/admin/page.tsx
git commit -m "feat(admin): add Tarifs tab with full plan CRUD, reorder, and modal"
```

---

### Task 9: Final verification

- [ ] **Step 1: Test backend endpoints**

```bash
# List plans (as admin)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/admin/plans

# Create plan
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test","price":1.99,"features":["Feature 1"]}' \
  http://localhost:3001/admin/plans

# Update plan
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"price":2.99}' \
  http://localhost:3001/admin/plans/<id>

# Delete plan
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3001/admin/plans/<id>
```

- [ ] **Step 2: Test public endpoint**

```bash
curl http://localhost:3001/landing/plans
```

Expected: 4 plans with `price` as number (not string), `currency: "EUR"`, `description` present.

- [ ] **Step 3: Test frontend landing pricing**

Visit `http://localhost:3000` — pricing section should show 4 plans in a 4-column grid, prices in EUR format.

- [ ] **Step 4: Test admin panel**

Visit `http://localhost:3000/admin` → onglet "Tarifs":
- Plans displayed as cards
- Create, edit, delete, reorder all functional
- Toggle active/inactive
- Toggle popular (one at a time)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: pricing plans admin — complete implementation"
```
