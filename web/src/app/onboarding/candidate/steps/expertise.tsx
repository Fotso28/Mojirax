'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';

const ROLES = [
    { value: 'TECH', label: 'CTO / Tech' },
    { value: 'PRODUCT', label: 'CPO / Product' },
    { value: 'MARKETING', label: 'CMO / Marketing' },
    { value: 'OPS', label: 'COO / Operations' },
    { value: 'FINANCE', label: 'CFO / Finance' },
];

const EXPERIENCE_LEVELS = [
    { value: '0-2', label: '0-2 ans (Junior)' },
    { value: '3-5', label: '3-5 ans (Confirmé)' },
    { value: '6-10', label: '6-10 ans (Senior)' },
    { value: '10+', label: '10+ ans (Expert)' },
];

export function CandidateExpertiseStep() {
    const { data, updateData, nextStep } = useOnboarding();

    const isValid = data.title && data.years_exp && data.main_competence;

    return (
        <WizardStep
            title="Expertise & Profil"
            description="Quel est votre super-pouvoir ?"
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Votre Titre Actuel</label>
                    <input
                        placeholder="Ex: Senior React Developer, CTO, Growth Hacker..."
                        value={data.title || ''}
                        onChange={(e) => updateData('title', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 text-lg focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        autoFocus
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Rôle Principal</label>
                    <div className="flex gap-3 flex-wrap">
                        {ROLES.map((role) => (
                            <button
                                key={role.value}
                                type="button"
                                onClick={() => updateData('role_type', role.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.role_type === role.value
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Expérience</label>
                    <div className="flex gap-3 flex-wrap">
                        {EXPERIENCE_LEVELS.map((exp) => (
                            <button
                                key={exp.value}
                                type="button"
                                onClick={() => updateData('years_exp', exp.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.years_exp === exp.value
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {exp.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Votre Compétence Clé (Top 1)
                    </label>
                    <input
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        placeholder="Ex: React Native, Vente B2B, Levée de fonds..."
                        value={data.main_competence || ''}
                        onChange={(e) => updateData('main_competence', e.target.value)}
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Réalisations Marquantes (Max 600)
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[100px] bg-white"
                        placeholder="J'ai scalé une app à 10k users..."
                        value={data.achievements || ''}
                        onChange={(e) => updateData('achievements', e.target.value)}
                        maxLength={600}
                    />
                </div>
            </div>
        </WizardStep>
    );
}
