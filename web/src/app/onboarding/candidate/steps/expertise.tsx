'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';

export function CandidateExpertiseStep() {
    const { data, updateData, nextStep } = useOnboarding();

    // Validation
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Rôle Principal</label>
                        <select
                            className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                            value={data.role_type || ''}
                            onChange={(e) => updateData('role_type', e.target.value)}
                        >
                            <option value="">Sélectionner...</option>
                            <option value="TECH">CTO / Tech</option>
                            <option value="PRODUCT">CPO / Product</option>
                            <option value="MARKETING">CMO / Marketing</option>
                            <option value="OPS">COO / Operations</option>
                            <option value="FINANCE">CFO / Finance</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Expérience</label>
                        <select
                            className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                            value={data.years_exp || ''}
                            onChange={(e) => updateData('years_exp', e.target.value)}
                        >
                            <option value="">Sélectionner...</option>
                            <option value="0-2">0-2 ans (Junior)</option>
                            <option value="3-5">3-5 ans (Confirmé)</option>
                            <option value="6-10">6-10 ans (Senior)</option>
                            <option value="10+">10+ ans (Expert)</option>
                        </select>
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
