# Payment Flow Continuity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the user's payment intent (`?plan=PRO`) through login, signup, and onboarding so they land on Stripe checkout automatically at the end.

**Architecture:** A `?plan=PLUS|PRO|ELITE` query param is passed through each navigation step. The param is a UX hint only — the backend validates plan eligibility at checkout. A shared helper validates the param against a whitelist. The payment success page is redesigned as a confirmation page.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Stripe Checkout (existing)

**Spec:** `docs/superpowers/specs/2026-04-15-payment-flow-continuity-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `web/src/lib/utils/plan-intent.ts` | Create | Shared helper: validate plan param, build URLs with plan, trigger checkout |
| `web/src/components/landing/pricing-section.tsx` | Modify | Add `?plan=` to login links for unauthenticated users |
| `web/src/app/login/page.tsx` | Modify | Read `?plan=`, propagate to onboarding redirect, trigger checkout for existing users |
| `web/src/app/onboarding/role/page.tsx` | Modify | Propagate `?plan=` to onboarding path |
| `web/src/app/onboarding/candidate/steps/pitch.tsx` | Modify | After submit, trigger checkout if `?plan=` present instead of `router.push('/')` |
| `web/src/app/onboarding/founder/steps/team.tsx` | Modify | Same as pitch.tsx — trigger checkout if `?plan=` present |
| `web/src/app/payment/success/page.tsx` | Rewrite | Confirmation page showing plan name, features, CTA to feed |

---

### Task 1: Create plan-intent helper

**Files:**
- Create: `web/src/lib/utils/plan-intent.ts`

- [ ] **Step 1: Create the helper file**

```typescript
// web/src/lib/utils/plan-intent.ts
import { AXIOS_INSTANCE } from '@/api/axios-instance';

const VALID_PLAN_KEYS = ['PLUS', 'PRO', 'ELITE'] as const;
type PlanKey = typeof VALID_PLAN_KEYS[number];

/**
 * Extract and validate the plan param from URL search params.
 * Returns null if absent or invalid (whitelist security).
 */
export function getPlanIntent(searchParams: URLSearchParams): PlanKey | null {
    const raw = searchParams.get('plan')?.toUpperCase();
    if (!raw) return null;
    return VALID_PLAN_KEYS.includes(raw as PlanKey) ? (raw as PlanKey) : null;
}

/**
 * Append ?plan=X to a path if planKey is set. Preserves existing query params.
 */
export function withPlanIntent(path: string, planKey: string | null): string {
    if (!planKey) return path;
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}plan=${planKey}`;
}

/**
 * Resolve a planKey (e.g. "PRO") to its planId (UUID) by fetching pricing plans,
 * then trigger Stripe checkout. Redirects the browser to Stripe.
 * Returns false if the plan was not found or checkout failed.
 */
export async function triggerCheckoutByPlanKey(planKey: string): Promise<boolean> {
    try {
        const { data: plans } = await AXIOS_INSTANCE.get('/landing/plans');
        const plan = plans.find((p: any) => p.planKey === planKey);
        if (!plan) return false;

        const { data } = await AXIOS_INSTANCE.post('/payment/checkout', { planId: plan.id });
        window.location.href = data.url;
        return true;
    } catch {
        return false;
    }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd web && npx tsc --noEmit src/lib/utils/plan-intent.ts 2>&1 || echo "Check imports"`

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/utils/plan-intent.ts
git commit -m "feat: add plan-intent helper for payment flow continuity"
```

---

### Task 2: Modify pricing-section.tsx — Add ?plan= to login links

**Files:**
- Modify: `web/src/components/landing/pricing-section.tsx:175-186`

- [ ] **Step 1: Update the unauthenticated user link**

In `web/src/components/landing/pricing-section.tsx`, find the Link for paid plans (unauthenticated users), around line 175-186:

```typescript
// BEFORE (line 177)
href="/login"

// AFTER
href={`/login?plan=${plan.planKey}`}
```

The full block becomes:

```typescript
) : (
  <Link
    href={`/login?plan=${plan.planKey}`}
    className={`w-full h-11 rounded-lg font-semibold flex items-center justify-center transition-all duration-200 text-sm ${
      plan.isPopular
        ? 'bg-kezak-primary text-white hover:bg-kezak-dark shadow-lg shadow-kezak-primary/20'
        : 'border-2 border-kezak-primary text-kezak-primary hover:bg-kezak-primary hover:text-white'
    }`}
  >
    {plan.ctaLabel}
  </Link>
)}
```

- [ ] **Step 2: Verify visually**

Open http://localhost:3000, scroll to pricing, hover over a paid plan button (non-connected). The link should show `/login?plan=PRO` (or PLUS/ELITE) in the browser status bar.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/landing/pricing-section.tsx
git commit -m "feat: pass plan intent to login link from pricing section"
```

---

### Task 3: Modify login/page.tsx — Read ?plan= and propagate

**Files:**
- Modify: `web/src/app/login/page.tsx:3-11,75-86,108-127,129-150`

- [ ] **Step 1: Add imports and read the plan param**

At the top of login/page.tsx, add the import:

```typescript
import { useSearchParams } from 'next/navigation';
import { getPlanIntent, withPlanIntent, triggerCheckoutByPlanKey } from '@/lib/utils/plan-intent';
```

Inside the component function, after existing state declarations, add:

```typescript
const searchParams = useSearchParams();
const planIntent = getPlanIntent(searchParams);
```

- [ ] **Step 2: Modify the post-login redirect for existing users**

Replace the useEffect (around lines 75-86):

```typescript
// BEFORE
useEffect(() => {
    if (!loading && user && !justSignedUp.current) {
        const isNewGoogleUser = sessionStorage.getItem('google_new_user');
        if (isNewGoogleUser) {
            sessionStorage.removeItem('google_new_user');
            justSignedUp.current = true;
            setStep('role');
            return;
        }
        router.push('/');
    }
}, [user, loading, router]);
```

```typescript
// AFTER
useEffect(() => {
    if (!loading && user && !justSignedUp.current) {
        const isNewGoogleUser = sessionStorage.getItem('google_new_user');
        if (isNewGoogleUser) {
            sessionStorage.removeItem('google_new_user');
            justSignedUp.current = true;
            setStep('role');
            return;
        }
        // Existing user with plan intent → go straight to checkout
        if (planIntent) {
            triggerCheckoutByPlanKey(planIntent).then((ok) => {
                if (!ok) router.push('/');
            });
            return;
        }
        router.push('/');
    }
}, [user, loading, router, planIntent]);
```

- [ ] **Step 3: Propagate ?plan= in the role selection redirect (handleContinueIntention)**

In `handleContinueIntention` (around line 143), replace `router.push(...)`:

```typescript
// BEFORE
router.push(selectedIntention === 'PUBLISH' ? '/onboarding/founder' : '/onboarding/candidate');

// AFTER
const onboardingPath = selectedIntention === 'PUBLISH' ? '/onboarding/founder' : '/onboarding/candidate';
router.push(withPlanIntent(onboardingPath, planIntent));
```

- [ ] **Step 4: Propagate ?plan= in the email signup flow (handleSignup)**

In `handleSignup` (around line 119), after `setStep('role')` — no change needed here because the role step is within the same page and `planIntent` is already in scope. The propagation happens in step 3 when leaving the login page.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/login/page.tsx
git commit -m "feat: read plan intent on login and propagate to onboarding or checkout"
```

---

### Task 4: Modify onboarding/role/page.tsx — Propagate ?plan=

**Files:**
- Modify: `web/src/app/onboarding/role/page.tsx:1-7,31-46`

- [ ] **Step 1: Add imports and read plan param**

Add imports:

```typescript
import { useSearchParams } from 'next/navigation';
import { getPlanIntent, withPlanIntent } from '@/lib/utils/plan-intent';
```

Inside the component, add:

```typescript
const searchParams = useSearchParams();
const planIntent = getPlanIntent(searchParams);
```

- [ ] **Step 2: Propagate in handleContinue**

Replace the redirect in `handleContinue` (around line 40):

```typescript
// BEFORE
router.push(selected === 'PUBLISH' ? '/onboarding/founder' : '/onboarding/candidate');

// AFTER
const path = selected === 'PUBLISH' ? '/onboarding/founder' : '/onboarding/candidate';
router.push(withPlanIntent(path, planIntent));
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/onboarding/role/page.tsx
git commit -m "feat: propagate plan intent through role selection"
```

---

### Task 5: Modify onboarding last steps — Trigger checkout instead of redirect

**Files:**
- Modify: `web/src/app/onboarding/candidate/steps/pitch.tsx:1-8,48`
- Modify: `web/src/app/onboarding/founder/steps/team.tsx:1-8,36`

- [ ] **Step 1: Modify candidate pitch.tsx**

Add imports:

```typescript
import { useSearchParams } from 'next/navigation';
import { getPlanIntent, triggerCheckoutByPlanKey } from '@/lib/utils/plan-intent';
```

Inside the component, add:

```typescript
const searchParams = useSearchParams();
const planIntent = getPlanIntent(searchParams);
```

Replace the redirect at the end of `handleSubmit` (line 48):

```typescript
// BEFORE
showToast('Profil créé ! Vérification en cours...', 'success');
await refreshDbUser();
router.push('/');

// AFTER
showToast('Profil créé ! Vérification en cours...', 'success');
await refreshDbUser();
if (planIntent) {
    const ok = await triggerCheckoutByPlanKey(planIntent);
    if (!ok) router.push('/');
} else {
    router.push('/');
}
```

- [ ] **Step 2: Modify founder team.tsx — same pattern**

Add the same imports:

```typescript
import { useSearchParams } from 'next/navigation';
import { getPlanIntent, triggerCheckoutByPlanKey } from '@/lib/utils/plan-intent';
```

Inside the component, add:

```typescript
const searchParams = useSearchParams();
const planIntent = getPlanIntent(searchParams);
```

Replace the redirect at the end of `handleSubmit` (line 36):

```typescript
// BEFORE
showToast('Projet cree avec succes !', 'success');
await refreshDbUser();
router.push('/');

// AFTER
showToast('Projet cree avec succes !', 'success');
await refreshDbUser();
if (planIntent) {
    const ok = await triggerCheckoutByPlanKey(planIntent);
    if (!ok) router.push('/');
} else {
    router.push('/');
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/onboarding/candidate/steps/pitch.tsx web/src/app/onboarding/founder/steps/team.tsx
git commit -m "feat: trigger Stripe checkout after onboarding when plan intent is set"
```

---

### Task 6: Rewrite payment/success/page.tsx — Confirmation page

**Files:**
- Rewrite: `web/src/app/payment/success/page.tsx`

- [ ] **Step 1: Rewrite the full page**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Crown, Zap, Shield } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';

const PLAN_DETAILS: Record<string, { name: string; icon: typeof Crown; color: string; features: string[] }> = {
    PLUS: {
        name: 'Plus',
        icon: Zap,
        color: 'text-blue-600 bg-blue-100',
        features: ['Voir qui a consulté votre profil', 'Badge vérifié', 'Filtres avancés'],
    },
    PRO: {
        name: 'Pro',
        icon: Crown,
        color: 'text-kezak-primary bg-kezak-light',
        features: ['Tout Plus +', 'Statistiques détaillées', 'Priorité dans le feed', 'Contact illimité'],
    },
    ELITE: {
        name: 'Elite',
        icon: Shield,
        color: 'text-purple-600 bg-purple-100',
        features: ['Tout Pro +', 'Mode invisible', 'Support prioritaire', 'Matching IA avancé'],
    },
};

export default function PaymentSuccessPage() {
    const { refreshDbUser } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [planKey, setPlanKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSession() {
            try {
                await refreshDbUser();
                const { data } = await AXIOS_INSTANCE.get('/payment/status');
                setPlanKey(data.plan);
            } catch {
                // Fallback — page still works without plan details
            } finally {
                setLoading(false);
            }
        }
        fetchSession();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-kezak-primary" />
            </div>
        );
    }

    const details = planKey ? PLAN_DETAILS[planKey] : null;
    const PlanIcon = details?.icon || CheckCircle;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm max-w-md w-full text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${details?.color || 'bg-green-100 text-green-600'}`}>
                    <PlanIcon size={32} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {details ? `Votre plan ${details.name} est actif !` : 'Paiement réussi !'}
                </h1>

                <p className="text-gray-500 mb-6">
                    Merci pour votre confiance. Profitez de toutes vos nouvelles fonctionnalités.
                </p>

                {details && (
                    <ul className="text-left space-y-2 mb-6">
                        {details.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                {f}
                            </li>
                        ))}
                    </ul>
                )}

                <Link
                    href="/feed"
                    className="inline-block w-full py-3 px-6 bg-kezak-primary text-white rounded-xl font-semibold hover:bg-kezak-dark transition-colors"
                >
                    Accéder au feed
                </Link>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify visually**

Ouvrir http://localhost:3000/payment/success dans le navigateur (connecté). La page doit afficher le plan actuel de l'utilisateur avec les features correspondantes. Si l'utilisateur est FREE, le fallback "Paiement réussi !" s'affiche.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/payment/success/page.tsx
git commit -m "feat: redesign payment success as plan confirmation page"
```

---

### Task 7: Test end-to-end des 4 tunnels

- [ ] **Step 1: Tunnel 3 — Utilisateur connecté sur landing**

1. Se connecter sur http://localhost:3000
2. Aller sur la landing page, section pricing
3. Cliquer sur un plan payant → doit aller directement vers Stripe Checkout
4. (Annuler sur Stripe) → retour sur `/#pricing`

- [ ] **Step 2: Tunnel 2 — Utilisateur existant non connecté**

1. Se déconnecter
2. Aller sur la landing, cliquer "Choisir PRO"
3. Vérifier que l'URL est `/login?plan=PRO`
4. Se connecter avec un compte existant
5. Doit aller directement vers Stripe Checkout (sans passer par `/`)

- [ ] **Step 3: Tunnel 1 — Nouvel utilisateur**

1. Aller sur la landing, cliquer "Choisir PRO"
2. Créer un nouveau compte (email ou Google)
3. Passer l'onboarding complet
4. À la fin de l'onboarding → doit aller vers Stripe Checkout
5. Vérifier que `?plan=PRO` est dans l'URL à chaque étape

- [ ] **Step 4: Tunnel 4 — Mise à niveau /settings/billing**

1. Connecté, aller sur /settings/billing
2. Cliquer sur un plan → Stripe Checkout
3. (Simuler succès) → page confirmation avec nom du plan et features

- [ ] **Step 5: Test sécurité — param invalide**

1. Aller sur `/login?plan=FAKE_PLAN`
2. Se connecter → doit aller vers `/` normalement (param ignoré)
3. Aller sur `/login?plan=FREE`
4. Se connecter → doit aller vers `/` normalement (FREE ignoré)

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "test: verify payment flow continuity across all 4 tunnels"
```
