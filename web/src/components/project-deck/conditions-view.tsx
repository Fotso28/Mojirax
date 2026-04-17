import { Clock, PieChart, Briefcase, MapPin, Wallet, Users, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

const COLLAB_COLORS: Record<string, string> = {
    EQUITY: 'indigo',
    PAID: 'emerald',
    HYBRID: 'amber',
};

function StatCard({ icon: Icon, label, value, sub, accent = 'gray' }: {
    icon: any; label: string; value: string; sub?: string; accent?: string;
}) {
    const colors: Record<string, { bg: string; icon: string; border: string; value: string }> = {
        indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100', value: 'text-indigo-700' },
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100', value: 'text-emerald-700' },
        amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100', value: 'text-amber-700' },
        orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100', value: 'text-orange-700' },
        blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100', value: 'text-blue-700' },
        purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100', value: 'text-purple-700' },
        gray: { bg: 'bg-gray-50', icon: 'text-gray-600', border: 'border-gray-100', value: 'text-gray-700' },
    };
    const c = colors[accent] || colors.gray;

    return (
        <div className={`p-5 ${c.bg} rounded-2xl border ${c.border} flex flex-col items-center text-center`}>
            <div className={`w-10 h-10 bg-white rounded-full flex items-center justify-center ${c.icon} shadow-sm mb-3`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
            <div className={`text-lg font-bold ${c.value}`}>{value}</div>
            {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        </div>
    );
}

export function ConditionsView({ project }: { project: any }) {
    const { t, locale } = useTranslation();

    const collabType = project.collabType;
    const collabLabel = collabType ? (t(`project.collab.${collabType}`) !== `project.collab.${collabType}` ? t(`project.collab.${collabType}`) : collabType) : '';
    const collabDesc = collabType ? (t(`project.collab.${collabType}_desc`) !== `project.collab.${collabType}_desc` ? t(`project.collab.${collabType}_desc`) : '') : '';
    const collabColor = COLLAB_COLORS[collabType] || 'gray';

    const hasAnyCondition = project.collabType || project.timeAvailability || project.commitment || project.isRemote || project.budget;

    if (!hasAnyCondition) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">{t('project.deck_conditions.no_conditions')}</p>
            </div>
        );
    }

    const getTimeLabel = (key: string) => {
        const translated = t(`project.time.${key}`);
        return translated !== `project.time.${key}` ? translated : key;
    };

    const getCommitmentLabel = (key: string) => {
        const translated = t(`project.commitment_type.${key}`);
        return translated !== `project.commitment_type.${key}` ? translated : key;
    };

    const getFounderRoleLabel = (key: string) => {
        const translated = t(`project.founderRole.${key}`);
        return translated !== `project.founderRole.${key}` ? translated : key;
    };

    return (
        <div className="space-y-8 py-2">
            {/* Main conditions grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.collabType && (
                    <StatCard
                        icon={PieChart}
                        label={t('project.deck_conditions.collab_type')}
                        value={collabLabel}
                        sub={collabDesc}
                        accent={collabColor}
                    />
                )}

                {project.timeAvailability && (
                    <StatCard
                        icon={Clock}
                        label={t('project.deck_conditions.expected_availability')}
                        value={getTimeLabel(project.timeAvailability)}
                        accent="orange"
                    />
                )}

                {project.commitment && (
                    <StatCard
                        icon={Briefcase}
                        label={t('project.deck_conditions.commitment')}
                        value={getCommitmentLabel(project.commitment)}
                        accent="blue"
                    />
                )}

                {project.isRemote !== undefined && (
                    <StatCard
                        icon={MapPin}
                        label={t('project.deck_conditions.work_mode')}
                        value={project.isRemote ? t('project.deck_conditions.remote_ok') : t('project.deck_conditions.on_site')}
                        sub={project.location || undefined}
                        accent={project.isRemote ? 'emerald' : 'gray'}
                    />
                )}

                {project.budget && (
                    <StatCard
                        icon={Wallet}
                        label={t('project.deck_conditions.budget_label')}
                        value={formatBudget(project.budget, locale)}
                        accent="purple"
                    />
                )}
            </div>

            {/* Founder section */}
            {project.founderRole && (
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">{t('project.deck_conditions.founder')}</h4>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                            {(project.founder?.firstName || project.founder?.name || 'F').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">
                                {project.founder?.name || [project.founder?.firstName, project.founder?.lastName].filter(Boolean).join(' ') || t('project.founder_default')}
                            </p>
                            <p className="text-sm text-gray-500">
                                {getFounderRoleLabel(project.founderRole)}
                                {project.timeAvailability && ` · ${getTimeLabel(project.timeAvailability)}`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Deadline */}
            {project.deadline && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-red-900">{t('project.deck_conditions.deadline')}</p>
                        <p className="text-sm text-red-700">
                            {new Date(project.deadline).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', {
                                day: 'numeric', month: 'long', year: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
            )}

            {/* Team size */}
            {project.teamSize && (
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-xs text-gray-500 uppercase tracking-wide">{t('project.deck_conditions.team_size')}</h4>
                            <p className="font-semibold text-gray-900">
                                {project.teamSize > 1
                                    ? t('project.deck_conditions.persons', { count: project.teamSize })
                                    : t('project.deck_conditions.person', { count: project.teamSize })}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatBudget(budget: any, locale: string = 'fr'): string {
    if (!budget) return '—';
    const fmt = (n: number) => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR').format(n);
    const currency = budget.currency || 'EUR';
    if (budget.min && budget.max) return `${fmt(budget.min)} - ${fmt(budget.max)} ${currency}`;
    if (budget.min) return `${fmt(budget.min)}+ ${currency}`;
    if (budget.max) return `${fmt(budget.max)} ${currency}`;
    return '—';
}
