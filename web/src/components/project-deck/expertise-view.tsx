import { Code, Search, Layers } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
    TECH: 'Profil Tech (CTO/Dev)', BIZ: 'Business (Sales/Marketing)',
    PRODUCT: 'Produit', FINANCE: 'Finance',
};
const BUSINESS_LABELS: Record<string, string> = {
    SUBSCRIPTION: 'Abonnement', COMMISSION: 'Commission',
    SALES: 'Vente unitaire', FREEMIUM: 'Freemium', ADS: 'Publicité',
};

export function ExpertiseView({ project }: { project: any }) {
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
                            <h3 className="text-sm font-semibold text-kezak-dark uppercase tracking-wide">Profil recherché</h3>
                            <p className="text-lg font-bold text-kezak-dark">{ROLE_LABELS[project.lookingForRole] || project.lookingForRole}</p>
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
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Compétences requises</h3>
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
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Stack technique</h3>
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
                        <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Modèle de revenu</h4>
                        <p className="font-semibold text-gray-900">{BUSINESS_LABELS[project.businessModel] || project.businessModel}</p>
                    </div>
                )}
                {project.marketType && (
                    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Type de marché</h4>
                        <p className="font-semibold text-gray-900">
                            {{ B2C: 'B2C (Grand Public)', B2B: 'B2B (Entreprises)', B2G: 'B2G (Gouvernement)', MARKETPLACE: 'Marketplace' }[project.marketType as string] || project.marketType}
                        </p>
                    </div>
                )}
            </div>

            {/* Founder */}
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
                                {{ CEO: 'CEO / General', CTO: 'CTO / Tech', CPO: 'CPO / Product', CMO: 'CMO / Marketing', COO: 'COO / Operations' }[project.founderRole as string] || project.founderRole}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
