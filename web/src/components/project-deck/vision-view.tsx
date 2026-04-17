import { Target, Lightbulb, AlertTriangle, Rocket, FileText, Download } from 'lucide-react';
import { getSectorLabel } from '@/lib/constants/sectors';
import { useTranslation } from '@/context/i18n-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function resolveDocumentUrl(url: string): string {
    if (url.startsWith('/')) return `${API_URL}${url}`;
    return url;
}

function Section({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-kezak-light flex items-center justify-center">
                    <Icon className="w-4 h-4 text-kezak-primary" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{label}</h3>
            </div>
            {children}
        </div>
    );
}

export function VisionView({ project }: { project: any }) {
    const { t } = useTranslation();

    return (
        <div className="space-y-8 py-2">
            {/* Pitch */}
            <div className="p-6 bg-kezak-light/50 rounded-2xl border border-kezak-primary/10">
                <h3 className="text-sm font-semibold text-kezak-dark uppercase tracking-wide mb-2">{t('project.deck_vision.pitch')}</h3>
                <p className="text-lg text-kezak-dark leading-relaxed font-medium">{project.pitch}</p>
            </div>

            {/* CTA: Télécharger le dossier */}
            {project.documentUrl && (
                <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{t('project.deck_vision.document_available')}</p>
                            <p className="text-xs text-gray-500">{project.documentName || t('project.deck_vision.document_default')}</p>
                        </div>
                    </div>
                    <a
                        href={resolveDocumentUrl(project.documentUrl)}
                        download={project.documentName || 'document'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-kezak-primary text-white rounded-lg text-sm font-semibold hover:bg-kezak-dark transition-colors w-full sm:w-auto"
                    >
                        <Download className="w-3.5 h-3.5" />
                        {t('project.deck_vision.download')}
                    </a>
                </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {project.sector && (
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">{t('project.deck_vision.sector')}</div>
                        <div className="font-semibold text-gray-900 text-sm">{getSectorLabel(project.sector)}</div>
                    </div>
                )}
                {project.stage && (
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">{t('project.deck_vision.stage_label')}</div>
                        <div className="font-semibold text-gray-900 text-sm">
                            {t(`project.stage.${project.stage}`) !== `project.stage.${project.stage}` ? t(`project.stage.${project.stage}`) : project.stage}
                        </div>
                    </div>
                )}
                {project.scope && (
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">{t('project.deck_vision.scope_label')}</div>
                        <div className="font-semibold text-gray-900 text-sm">{t(`project.scope.${project.scope}`) !== `project.scope.${project.scope}` ? t(`project.scope.${project.scope}`) : project.scope}</div>
                    </div>
                )}
                {project.marketType && (
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">{t('project.deck_vision.market_label')}</div>
                        <div className="font-semibold text-gray-900 text-sm">{t(`project.market.${project.marketType}`) !== `project.market.${project.marketType}` ? t(`project.market.${project.marketType}`) : project.marketType}</div>
                    </div>
                )}
            </div>

            {/* Problem */}
            {project.problem && (
                <Section icon={AlertTriangle} label={t('project.deck_vision.problem')}>
                    <p className="text-gray-600 leading-relaxed">{project.problem}</p>
                    {project.target && (
                        <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">{t('project.deck_vision.target')} </span>
                            <span className="text-sm text-orange-900">{project.target}</span>
                        </div>
                    )}
                    {project.solutionCurrent && (
                        <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">{t('project.deck_vision.current_solutions')}</p>
                            <p className="text-sm text-gray-600">{project.solutionCurrent}</p>
                        </div>
                    )}
                </Section>
            )}

            {/* Solution */}
            {project.solutionDesc && (
                <Section icon={Lightbulb} label={t('project.deck_vision.solution')}>
                    <p className="text-gray-600 leading-relaxed">{project.solutionDesc}</p>
                    {project.uvp && (
                        <div className="mt-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide block mb-1">{t('project.deck_vision.uvp')}</span>
                            <p className="text-sm text-emerald-900 font-medium">{project.uvp}</p>
                        </div>
                    )}
                    {project.antiScope && (
                        <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">{t('project.deck_vision.anti_scope')}</p>
                            <p className="text-sm text-gray-500 italic">{project.antiScope}</p>
                        </div>
                    )}
                </Section>
            )}

            {/* Vision */}
            {project.vision && (
                <Section icon={Rocket} label={t('project.deck_vision.vision_3y')}>
                    <p className="text-gray-600 leading-relaxed">{project.vision}</p>
                </Section>
            )}

            {/* Traction */}
            {project.traction && (
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">{t('project.deck_vision.traction')}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{project.traction}</p>
                </div>
            )}

            {/* Competitors */}
            {project.competitors && (
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">{t('project.deck_vision.competitors')}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{project.competitors}</p>
                </div>
            )}
        </div>
    );
}
