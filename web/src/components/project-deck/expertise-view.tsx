import { Code, Search, Layers } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

function formatRoleLabels(lookingForRole: string, t: (key: string) => string): string {
    return lookingForRole.split(',').filter(Boolean)
        .map((r) => {
            const translated = t(`project.role.${r}`);
            return translated !== `project.role.${r}` ? translated : r;
        }).join(', ');
}

export function ExpertiseView({ project }: { project: any }) {
    const { t } = useTranslation();

    return (
        <div className="space-y-8 py-2">
            {/* Looking for */}
            {project.lookingForRole && (
                <div className="p-6 bg-kezak-light/50 rounded-2xl border border-kezak-primary/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-kezak-primary/10 flex items-center justify-center">
                            <Search className="w-5 h-5 text-kezak-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-kezak-dark uppercase tracking-wide">{t('project.deck_expertise.looking_for')}</h3>
                            <p className="text-lg font-bold text-kezak-dark">{formatRoleLabels(project.lookingForRole, t)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Required skills */}
            {project.requiredSkills?.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Code className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('project.deck_expertise.required_skills')}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {project.requiredSkills.map((skill: string) => (
                            <span key={skill} className="text-sm font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Tech stack */}
            {project.techStack?.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Layers className="w-4 h-4 text-purple-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('project.deck_expertise.tech_stack')}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {project.techStack.map((tech: string) => (
                            <span key={tech} className="text-sm font-medium px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Business model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {project.businessModel && (
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t('project.deck_expertise.revenue_model')}</h4>
                        <p className="font-semibold text-gray-900">{t(`project.businessModel.${project.businessModel}`) !== `project.businessModel.${project.businessModel}` ? t(`project.businessModel.${project.businessModel}`) : project.businessModel}</p>
                    </div>
                )}
                {project.marketType && (
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t('project.deck_expertise.market_type')}</h4>
                        <p className="font-semibold text-gray-900">
                            {t(`project.market.${project.marketType}`) !== `project.market.${project.marketType}` ? t(`project.market.${project.marketType}`) : project.marketType}
                        </p>
                    </div>
                )}
            </div>

            {/* Founder */}
            {project.founderRole && (
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-3">{t('project.deck_expertise.founder')}</h4>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                            {(project.founder?.firstName || project.founder?.name || 'F').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">
                                {project.founder?.name || [project.founder?.firstName, project.founder?.lastName].filter(Boolean).join(' ') || t('project.founder_default')}
                            </p>
                            <p className="text-sm text-gray-500">
                                {t(`project.founderRole.${project.founderRole}`) !== `project.founderRole.${project.founderRole}` ? t(`project.founderRole.${project.founderRole}`) : project.founderRole}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
