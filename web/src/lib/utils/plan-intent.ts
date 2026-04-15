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
