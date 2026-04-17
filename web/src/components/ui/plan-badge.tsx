import { useTranslation } from '@/context/i18n-context';

interface PlanBadgeProps {
    plan?: string;
    showFree?: boolean;
}

const PLAN_STYLES: Record<string, { bg: string; text: string; labelKey: string }> = {
    FREE: { bg: 'bg-gray-100', text: 'text-gray-600', labelKey: 'common.plan_free' },
    PLUS: { bg: 'bg-green-100', text: 'text-green-700', labelKey: 'common.plan_plus' },
    PRO: { bg: 'bg-blue-100', text: 'text-blue-700', labelKey: 'common.plan_pro' },
    ELITE: { bg: 'bg-amber-100', text: 'text-amber-700', labelKey: 'common.plan_elite' },
};

export function PlanBadge({ plan, showFree = false }: PlanBadgeProps) {
    const { t } = useTranslation();

    if (!plan) return null;
    if (plan === 'FREE' && !showFree) return null;

    const style = PLAN_STYLES[plan];
    if (!style) return null;

    return (
        <span className={`inline-flex items-center rounded-full ${style.bg} ${style.text} text-xs font-semibold px-2 py-0.5`}>
            {t(style.labelKey)}
        </span>
    );
}
