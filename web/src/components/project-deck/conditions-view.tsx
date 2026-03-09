import { Clock, PieChart, Briefcase, MapPin, Wallet, Users, AlertCircle } from 'lucide-react';

const COLLAB_LABELS: Record<string, { label: string; desc: string; color: string }> = {
    EQUITY: { label: 'Equity', desc: 'Parts du projet uniquement', color: 'indigo' },
    PAID: { label: 'Rémunéré', desc: 'Rétribution financière', color: 'emerald' },
    HYBRID: { label: 'Hybride', desc: 'Equity + rémunération', color: 'amber' },
};

const TIME_LABELS: Record<string, string> = {
    '2-5H': '2-5h / semaine',
    '5-10H': '5-10h / semaine',
    '10-20H': '10-20h / semaine',
    FULLTIME: 'Temps plein',
};

const FOUNDER_ROLE_LABELS: Record<string, string> = {
    CEO: 'CEO / General',
    CTO: 'CTO / Tech',
    CPO: 'CPO / Product',
    CMO: 'CMO / Marketing',
    COO: 'COO / Operations',
};

const COMMITMENT_LABELS: Record<string, string> = {
    FULL_TIME: 'Temps plein',
    PART_TIME: 'Temps partiel',
    FREELANCE: 'Freelance',
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
    const collab = COLLAB_LABELS[project.collabType];
    const hasAnyCondition = project.collabType || project.timeAvailability || project.commitment || project.isRemote || project.budget;

    if (!hasAnyCondition) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucune condition spécifiée pour ce projet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 py-2">
            {/* Main conditions grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.collabType && collab && (
                    <StatCard
                        icon={PieChart}
                        label="Type de collaboration"
                        value={collab.label}
                        sub={collab.desc}
                        accent={collab.color}
                    />
                )}

                {project.timeAvailability && (
                    <StatCard
                        icon={Clock}
                        label="Disponibilité attendue"
                        value={TIME_LABELS[project.timeAvailability] || project.timeAvailability}
                        accent="orange"
                    />
                )}

                {project.commitment && (
                    <StatCard
                        icon={Briefcase}
                        label="Engagement"
                        value={COMMITMENT_LABELS[project.commitment] || project.commitment}
                        accent="blue"
                    />
                )}

                {project.isRemote !== undefined && (
                    <StatCard
                        icon={MapPin}
                        label="Mode de travail"
                        value={project.isRemote ? 'Remote OK' : 'Sur place'}
                        sub={project.location || undefined}
                        accent={project.isRemote ? 'emerald' : 'gray'}
                    />
                )}

                {project.budget && (
                    <StatCard
                        icon={Wallet}
                        label="Budget"
                        value={formatBudget(project.budget)}
                        accent="purple"
                    />
                )}
            </div>

            {/* Founder section */}
            {project.founderRole && (
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Le fondateur</h4>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                            {(project.founder?.firstName || project.founder?.name || 'F').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">
                                {project.founder?.name || [project.founder?.firstName, project.founder?.lastName].filter(Boolean).join(' ') || 'Fondateur'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {FOUNDER_ROLE_LABELS[project.founderRole] || project.founderRole}
                                {project.timeAvailability && ` · ${TIME_LABELS[project.timeAvailability] || project.timeAvailability}`}
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
                        <p className="text-sm font-semibold text-red-900">Date limite de recrutement</p>
                        <p className="text-sm text-red-700">
                            {new Date(project.deadline).toLocaleDateString('fr-FR', {
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
                            <h4 className="text-xs text-gray-500 uppercase tracking-wide">Taille de l'équipe</h4>
                            <p className="font-semibold text-gray-900">{project.teamSize} personne{project.teamSize > 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatBudget(budget: any): string {
    if (!budget) return '—';
    const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
    const currency = budget.currency || 'XAF';
    if (budget.min && budget.max) return `${fmt(budget.min)} - ${fmt(budget.max)} ${currency}`;
    if (budget.min) return `À partir de ${fmt(budget.min)} ${currency}`;
    if (budget.max) return `Jusqu'à ${fmt(budget.max)} ${currency}`;
    return '—';
}
