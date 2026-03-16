import { Target, Lightbulb, AlertTriangle, Rocket, FileText, Download } from 'lucide-react';
import { getSectorLabel } from '@/lib/constants/sectors';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

function resolveDocumentUrl(url: string): string {
    if (url.startsWith('/')) return `${API_URL}${url}`;
    return url;
}

const SCOPE_LABELS: Record<string, string> = {
    LOCAL: 'Local', DIASPORA: 'Diaspora', HYBRID: 'Hybride',
};
const MARKET_LABELS: Record<string, string> = {
    B2C: 'B2C (Grand Public)', B2B: 'B2B (Entreprises)',
    B2G: 'B2G (Gouvernement)', MARKETPLACE: 'Marketplace',
};

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
    return (
        <div className="space-y-8 py-2">
            {/* Pitch */}
            <div className="p-6 bg-kezak-light/50 rounded-2xl border border-kezak-primary/10">
                <h3 className="text-sm font-semibold text-kezak-dark uppercase tracking-wide mb-2">Le Pitch</h3>
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
                            <p className="text-sm font-semibold text-gray-900">Dossier complet disponible</p>
                            <p className="text-xs text-gray-500">{project.documentName || 'Document du projet'}</p>
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
                        Télécharger
                    </a>
                </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {project.sector && (
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">Secteur</div>
                        <div className="font-semibold text-gray-900 text-sm">{getSectorLabel(project.sector)}</div>
                    </div>
                )}
                {project.stage && (
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">Stade</div>
                        <div className="font-semibold text-gray-900 text-sm">
                            {{ IDEA: 'Idée', PROTOTYPE: 'Prototype', MVP_BUILD: 'MVP en cours', MVP_LIVE: 'MVP lancé', TRACTION: 'Traction', SCALE: 'Scale' }[project.stage as string] || project.stage}
                        </div>
                    </div>
                )}
                {project.scope && (
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">Périmètre</div>
                        <div className="font-semibold text-gray-900 text-sm">{SCOPE_LABELS[project.scope] || project.scope}</div>
                    </div>
                )}
                {project.marketType && (
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">Marché</div>
                        <div className="font-semibold text-gray-900 text-sm">{MARKET_LABELS[project.marketType] || project.marketType}</div>
                    </div>
                )}
            </div>

            {/* Problem */}
            {project.problem && (
                <Section icon={AlertTriangle} label="Le Problème">
                    <p className="text-gray-600 leading-relaxed">{project.problem}</p>
                    {project.target && (
                        <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Cible : </span>
                            <span className="text-sm text-orange-900">{project.target}</span>
                        </div>
                    )}
                    {project.solutionCurrent && (
                        <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">Solutions actuelles utilisées :</p>
                            <p className="text-sm text-gray-600">{project.solutionCurrent}</p>
                        </div>
                    )}
                </Section>
            )}

            {/* Solution */}
            {project.solutionDesc && (
                <Section icon={Lightbulb} label="La Solution">
                    <p className="text-gray-600 leading-relaxed">{project.solutionDesc}</p>
                    {project.uvp && (
                        <div className="mt-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide block mb-1">Proposition de valeur unique</span>
                            <p className="text-sm text-emerald-900 font-medium">{project.uvp}</p>
                        </div>
                    )}
                    {project.antiScope && (
                        <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">Ce qu'on ne fait pas :</p>
                            <p className="text-sm text-gray-500 italic">{project.antiScope}</p>
                        </div>
                    )}
                </Section>
            )}

            {/* Vision */}
            {project.vision && (
                <Section icon={Rocket} label="Vision à 3 ans">
                    <p className="text-gray-600 leading-relaxed">{project.vision}</p>
                </Section>
            )}

            {/* Traction */}
            {project.traction && (
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Preuves de traction</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{project.traction}</p>
                </div>
            )}

            {/* Competitors */}
            {project.competitors && (
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Concurrents / Alternatives</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{project.competitors}</p>
                </div>
            )}
        </div>
    );
}
