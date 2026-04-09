# Subscription Billing UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to view their subscription plan details (plan, dates, payment history) on their profile and a dedicated billing page.

**Architecture:** Add `planStartedAt` and `TransactionType` to the schema. New `GET /payment/billing` endpoint aggregates all billing data. Frontend gets a subscription summary on `/profile` and a full `/settings/billing` page.

**Tech Stack:** Prisma (migration), NestJS (endpoint + DTO), Next.js + Tailwind (2 UI components), Lucide icons.

**Spec:** `docs/superpowers/specs/2026-04-09-subscription-billing-ui-design.md`

---

### Task 1: Add `planStartedAt` to User model + `TransactionType` enum

**Files:**
- Modify: `api/prisma/schema.prisma:56-59` (User model — add `planStartedAt`)
- Modify: `api/prisma/schema.prisma:450-478` (Transaction model — add `type` field + enum)

- [ ] **Step 1: Add `TransactionType` enum and `type` field to Transaction**

In `api/prisma/schema.prisma`, after the `TransactionStatus` enum (line 455), add:

```prisma
enum TransactionType {
  SUBSCRIPTION
  UNLOCK
}
```

In the `Transaction` model (line 457), add after the `status` field:

```prisma
  type     TransactionType   @default(SUBSCRIPTION)
```

- [ ] **Step 2: Add `planStartedAt` to User model**

In `api/prisma/schema.prisma`, after `planExpiresAt` (line 59), add:

```prisma
  planStartedAt        DateTime? @map("plan_started_at")
```

- [ ] **Step 3: Generate and apply migration**

Run:
```bash
cd api && npx prisma migrate dev --name add_plan_started_at_and_transaction_type
```

Expected: Migration created and applied successfully.

- [ ] **Step 4: Backfill existing data**

Create a one-time script. In the migration SQL file that was just generated, add at the end (before the empty line):

```sql
-- Backfill: mark transactions with unlocks as UNLOCK type
UPDATE "transactions" SET "type" = 'UNLOCK' WHERE id IN (SELECT DISTINCT "transaction_id" FROM "unlocks");

-- Backfill: set planStartedAt from first SUBSCRIPTION transaction
UPDATE "users" u SET "plan_started_at" = sub.first_paid
FROM (
  SELECT "user_id", MIN("created_at") as first_paid
  FROM "transactions"
  WHERE "type" = 'SUBSCRIPTION' AND "status" = 'PAID'
  GROUP BY "user_id"
) sub
WHERE u.id = sub.user_id AND u.plan != 'FREE';
```

Then re-apply:
```bash
cd api && npx prisma migrate dev
```

- [ ] **Step 5: Regenerate Prisma client**

Run:
```bash
cd api && npx prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 6: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(db): add planStartedAt to User and TransactionType enum"
```

---

### Task 2: Update webhook to set `planStartedAt` and `TransactionType`

**Files:**
- Modify: `api/src/payment/payment.service.ts:230-252` (handleCheckoutCompleted — set planStartedAt + type)
- Modify: `api/src/payment/payment.service.ts:277-288` (handleInvoicePaid — set type)
- Modify: `api/src/payment/payment.service.ts:302-311` (handleInvoicePaymentFailed — set type)

- [ ] **Step 1: Update `handleCheckoutCompleted` to set `planStartedAt`**

In `api/src/payment/payment.service.ts`, in the `handleCheckoutCompleted` method, update the `this.prisma.user.update` call (line 230) to include `planStartedAt`:

```typescript
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: planKey,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        planExpiresAt: periodEnd,
        planStartedAt: new Date(),
      },
    });
```

- [ ] **Step 2: Set `type: 'SUBSCRIPTION'` on transaction in `handleCheckoutCompleted`**

In the same method, update the `this.prisma.transaction.create` call (line 241):

```typescript
    await this.prisma.transaction.create({
      data: {
        userId,
        amount: (session.amount_total ?? 0) / 100,
        currency: (session.currency ?? 'eur').toUpperCase(),
        status: 'PAID',
        provider: 'STRIPE',
        externalId: session.id,
        type: 'SUBSCRIPTION',
      },
    });
```

- [ ] **Step 3: Set `type: 'SUBSCRIPTION'` on transaction in `handleInvoicePaid`**

In `handleInvoicePaid` (line 277), update the `this.prisma.transaction.create` call:

```typescript
    await this.prisma.transaction.create({
      data: {
        userId: user.id,
        amount: (invoice.amount_paid ?? 0) / 100,
        currency: (invoice.currency ?? 'eur').toUpperCase(),
        status: 'PAID',
        provider: 'STRIPE',
        externalId: invoice.id,
        type: 'SUBSCRIPTION',
      },
    });
```

- [ ] **Step 4: Set `type: 'SUBSCRIPTION'` on transaction in `handleInvoicePaymentFailed`**

In `handleInvoicePaymentFailed` (line 302), update the `this.prisma.transaction.create` call:

```typescript
    await this.prisma.transaction.create({
      data: {
        userId: user.id,
        amount: (invoice.amount_due ?? 0) / 100,
        currency: (invoice.currency ?? 'eur').toUpperCase(),
        status: 'FAILED',
        provider: 'STRIPE',
        externalId: invoice.id,
        type: 'SUBSCRIPTION',
      },
    });
```

- [ ] **Step 5: Commit**

```bash
git add api/src/payment/payment.service.ts
git commit -m "feat(payment): set planStartedAt and TransactionType in webhooks"
```

---

### Task 3: Add `GET /payment/billing` endpoint

**Files:**
- Modify: `api/src/payment/payment.service.ts` (add `getBilling` method)
- Modify: `api/src/payment/payment.controller.ts` (add endpoint)

- [ ] **Step 1: Add `getBilling` method to `PaymentService`**

In `api/src/payment/payment.service.ts`, after the `getStatus` method (after line 138), add:

```typescript
  /**
   * Get full billing info: plan details + subscription transaction history.
   */
  async getBilling(firebaseUid: string, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid },
      select: {
        id: true,
        plan: true,
        planStartedAt: true,
        planExpiresAt: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const isActive =
      user.plan !== UserPlan.FREE &&
      (!user.planExpiresAt || user.planExpiresAt > new Date());

    const userId = user.id;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, type: 'SUBSCRIPTION' },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.count({
        where: { userId, type: 'SUBSCRIPTION' },
      }),
    ]);

    return {
      plan: user.plan,
      planStartedAt: user.planStartedAt?.toISOString() ?? null,
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      isActive,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }
```

- [ ] **Step 2: Add endpoint to `PaymentController`**

In `api/src/payment/payment.controller.ts`, after the `getStatus` method (after line 63), add:

```typescript
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  @Get('billing')
  @ApiOperation({ summary: "Détails complets de l'abonnement + historique paiements" })
  @ApiResponse({ status: 200, description: 'Billing info with transaction history' })
  async getBilling(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentService.getBilling(
      req.user.uid,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
```

Also add `Query` to the import from `@nestjs/common` at line 1:

```typescript
import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Headers,
  Req,
  Request,
  UseGuards,
  Logger,
} from '@nestjs/common';
```

- [ ] **Step 3: Verify compilation**

Run:
```bash
cd api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add api/src/payment/payment.service.ts api/src/payment/payment.controller.ts
git commit -m "feat(payment): add GET /payment/billing endpoint"
```

---

### Task 4: Update `PlanBadge` to show all plans

**Files:**
- Modify: `web/src/components/ui/plan-badge.tsx`

Currently the `PlanBadge` component returns `null` for FREE and PLUS plans. We need it to display all plans for the billing UI.

- [ ] **Step 1: Update `PlanBadge` to support all plans**

Replace the entire content of `web/src/components/ui/plan-badge.tsx`:

```typescript
interface PlanBadgeProps {
    plan?: string;
    showFree?: boolean;
}

const PLAN_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    FREE: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Gratuit' },
    PLUS: { bg: 'bg-green-100', text: 'text-green-700', label: 'Plus' },
    PRO: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pro' },
    ELITE: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Elite' },
};

export function PlanBadge({ plan, showFree = false }: PlanBadgeProps) {
    if (!plan) return null;
    if (plan === 'FREE' && !showFree) return null;

    const style = PLAN_STYLES[plan];
    if (!style) return null;

    return (
        <span className={`inline-flex items-center rounded-full ${style.bg} ${style.text} text-xs font-semibold px-2 py-0.5`}>
            {style.label}
        </span>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/ui/plan-badge.tsx
git commit -m "feat(ui): update PlanBadge to support all plan types"
```

---

### Task 5: Add subscription summary on `/profile`

**Files:**
- Create: `web/src/components/profile/subscription-summary.tsx`
- Modify: `web/src/app/(dashboard)/profile/page.tsx:107-113`

- [ ] **Step 1: Create `SubscriptionSummary` component**

Create `web/src/components/profile/subscription-summary.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { PlanBadge } from '@/components/ui/plan-badge';

interface PaymentStatus {
    plan: string;
    planExpiresAt: string | null;
    isActive: boolean;
}

export function SubscriptionSummary() {
    const [status, setStatus] = useState<PaymentStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AXIOS_INSTANCE.get('/payment/status')
            .then(({ data }) => setStatus(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
        );
    }

    if (!status) return null;

    const isFree = status.plan === 'FREE';
    const isExpired = !isFree && !status.isActive;

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    return (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <h3 className="font-bold text-gray-900 text-sm">Abonnement</h3>
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <PlanBadge plan={status.plan} showFree />
                    {isExpired && (
                        <span className="text-xs text-red-500 font-medium">Expiré</span>
                    )}
                </div>

                {!isFree && status.planExpiresAt && (
                    <p className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                        {isExpired
                            ? `Expiré le ${formatDate(status.planExpiresAt)}`
                            : `Renouvellement le ${formatDate(status.planExpiresAt)}`}
                    </p>
                )}

                {isFree && (
                    <p className="text-xs text-gray-500">Plan gratuit</p>
                )}
            </div>

            <Link
                href="/settings/billing"
                className="mt-3 flex items-center gap-1 text-xs text-kezak-primary hover:underline font-medium"
            >
                Gérer mon abonnement
                <ArrowRight className="w-3 h-3" />
            </Link>
        </div>
    );
}
```

- [ ] **Step 2: Add `SubscriptionSummary` to profile page sidebar**

In `web/src/app/(dashboard)/profile/page.tsx`, add the import at the top (after line 7):

```typescript
import { SubscriptionSummary } from '@/components/profile/subscription-summary';
```

Then in the sidebar `<div className="space-y-6">` (line 124), add `<SubscriptionSummary />` as the first child:

```typescript
                <div className="space-y-6">
                    <SubscriptionSummary />
                    {isCandidate && cp ? (
```

- [ ] **Step 3: Verify the page renders**

Run:
```bash
cd web && npx next build --no-lint 2>&1 | head -20
```

Expected: No compilation errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/profile/subscription-summary.tsx web/src/app/(dashboard)/profile/page.tsx
git commit -m "feat(web): add subscription summary to profile sidebar"
```

---

### Task 6: Create `/settings/billing` page

**Files:**
- Create: `web/src/app/(dashboard)/settings/billing/page.tsx`

- [ ] **Step 1: Create the billing page**

Create `web/src/app/(dashboard)/settings/billing/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { PlanBadge } from '@/components/ui/plan-badge';
import { HideRightSidebar } from '@/context/sidebar-context';
import {
    ArrowLeft,
    CreditCard,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface BillingTransaction {
    id: string;
    amount: number;
    currency: string;
    status: 'PAID' | 'FAILED' | 'REFUNDED';
    createdAt: string;
}

interface BillingData {
    plan: string;
    planStartedAt: string | null;
    planExpiresAt: string | null;
    isActive: boolean;
    transactions: BillingTransaction[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const STATUS_CONFIG = {
    PAID: { label: 'Payé', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    FAILED: { label: 'Échoué', icon: XCircle, color: 'text-red-600 bg-red-50' },
    REFUNDED: { label: 'Remboursé', icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
    }).format(amount);
}

export default function BillingPage() {
    const { user: firebaseUser, loading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [billing, setBilling] = useState<BillingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);

    const fetchBilling = async (p: number) => {
        try {
            const { data } = await AXIOS_INSTANCE.get(`/payment/billing?page=${p}&limit=20`);
            setBilling(data);
            setPage(p);
        } catch {
            // Billing fetch failed
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthLoading) {
            if (firebaseUser) {
                fetchBilling(1);
            } else {
                setIsLoading(false);
            }
        }
    }, [firebaseUser, isAuthLoading]);

    if (isAuthLoading || (firebaseUser && isLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-kezak-primary" />
            </div>
        );
    }

    if (!firebaseUser) {
        router.replace('/login');
        return null;
    }

    if (!billing) {
        return (
            <div className="max-w-3xl mx-auto py-10 px-4">
                <p className="text-gray-500 text-center">Impossible de charger les informations de facturation.</p>
            </div>
        );
    }

    const isFree = billing.plan === 'FREE';
    const isExpired = !isFree && !billing.isActive;

    return (
        <div className="max-w-3xl mx-auto pb-20">
            <HideRightSidebar />

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    href="/profile"
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mon abonnement</h1>
                    <p className="text-sm text-gray-500">Gérez votre plan et consultez vos paiements</p>
                </div>
            </div>

            {/* Plan Card */}
            {isFree ? (
                /* FREE plan card */
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900">Plan gratuit</h2>
                            <p className="text-sm text-gray-500">Vous utilisez actuellement le plan gratuit</p>
                        </div>
                    </div>
                    <Link
                        href="/#pricing"
                        className="inline-flex items-center justify-center w-full h-[52px] bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors"
                    >
                        Découvrir nos offres
                    </Link>
                </div>
            ) : (
                /* Paid plan card */
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-kezak-light flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-kezak-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-bold text-gray-900">Plan {billing.plan}</h2>
                                    <PlanBadge plan={billing.plan} showFree />
                                </div>
                                {billing.planStartedAt && (
                                    <p className="text-sm text-gray-500">
                                        Membre depuis le {formatDate(billing.planStartedAt)}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                                <XCircle className="w-3 h-3" />
                                Expiré
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Actif
                            </span>
                        )}
                    </div>

                    {billing.planExpiresAt && (
                        <div className={`flex items-center gap-2 p-3 rounded-xl ${isExpired ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <Calendar className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-gray-400'}`} />
                            <span className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                                {isExpired
                                    ? `Expiré le ${formatDate(billing.planExpiresAt)}`
                                    : `Prochain renouvellement le ${formatDate(billing.planExpiresAt)}`}
                            </span>
                        </div>
                    )}

                    {isExpired && (
                        <Link
                            href="/#pricing"
                            className="mt-4 inline-flex items-center justify-center w-full h-[52px] bg-kezak-primary text-white font-semibold rounded-xl hover:bg-kezak-dark transition-colors"
                        >
                            Renouveler
                        </Link>
                    )}
                </div>
            )}

            {/* Transaction History */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Historique des paiements</h2>
                </div>

                {billing.transactions.length === 0 ? (
                    <div className="p-6 text-center">
                        <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Aucun paiement</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Montant</th>
                                        <th className="px-6 py-3">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {billing.transactions.map((tx) => {
                                        const cfg = STATUS_CONFIG[tx.status];
                                        const Icon = cfg.icon;
                                        return (
                                            <tr key={tx.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    {formatDate(tx.createdAt)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {formatAmount(tx.amount, tx.currency)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                                        <Icon className="w-3 h-3" />
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile list */}
                        <div className="sm:hidden divide-y divide-gray-50">
                            {billing.transactions.map((tx) => {
                                const cfg = STATUS_CONFIG[tx.status];
                                const Icon = cfg.icon;
                                return (
                                    <div key={tx.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {formatAmount(tx.amount, tx.currency)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(tx.createdAt)}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                            <Icon className="w-3 h-3" />
                                            {cfg.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {billing.pagination.totalPages > 1 && (
                            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    Page {billing.pagination.page} sur {billing.pagination.totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fetchBilling(page - 1)}
                                        disabled={page <= 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => fetchBilling(page + 1)}
                                        disabled={page >= billing.pagination.totalPages}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify the page compiles**

Run:
```bash
cd web && npx next build --no-lint 2>&1 | head -20
```

Expected: No compilation errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(dashboard)/settings/billing/page.tsx
git commit -m "feat(web): add /settings/billing page with plan details and payment history"
```

---

### Task 7: Verify full integration

**Files:** None (verification only)

- [ ] **Step 1: Start the dev environment**

```bash
docker compose up -d && cd web && npm run dev
```

- [ ] **Step 2: Verify `GET /payment/billing` returns correct data**

```bash
curl -s http://localhost:3001/payment/billing -H "Authorization: Bearer <test-token>" | jq .
```

Expected: JSON with `plan`, `planStartedAt`, `planExpiresAt`, `isActive`, `transactions[]`, `pagination`.

- [ ] **Step 3: Verify `/profile` shows subscription summary in sidebar**

Navigate to `http://localhost:3000/profile`. Verify the subscription summary card appears in the sidebar with plan badge, renewal date (or "Plan gratuit"), and "Gérer mon abonnement" link.

- [ ] **Step 4: Verify `/settings/billing` page**

Click "Gérer mon abonnement" link or navigate to `http://localhost:3000/settings/billing`. Verify:
- Plan card displays correctly (name, dates, status badge)
- Transaction history table renders (or "Aucun paiement" if empty)
- Pagination works if > 20 transactions
- Mobile responsive layout (resize browser)

- [ ] **Step 5: Verify FREE user experience**

Log in as a FREE user. Verify:
- Profile sidebar shows "Plan gratuit" + link
- Billing page shows "Vous utilisez actuellement le plan gratuit" + CTA "Découvrir nos offres"

- [ ] **Step 6: Commit final state**

```bash
git add -A && git status
```

If all clean, no commit needed. If any fixes were applied during testing, commit them:

```bash
git commit -m "fix: billing page integration fixes"
```
