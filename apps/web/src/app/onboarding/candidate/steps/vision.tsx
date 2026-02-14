'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';

export function CandidateVisionStep() {
    const { data, updateData, nextStep } = useOnboarding();

    return (
        <WizardStep
            title="Expérience & Vision"
            description="Que cherchez-vous à construire ?"
            onNext={nextStep}
            isValid={!!data.vision}
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Avez-vous déjà cofondé ?
                    </label>
                    <div className="flex gap-4">
                        {['YES', 'NO'].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => updateData('has_cofounded', opt)}
                                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.has_cofounded === opt
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {opt === 'YES' ? 'Oui, déjà fait' : 'Non, première fois'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Vision personnelle à 3-5 ans
                    </label>
                    <textarea
                        className="w-full rounded-xl border-gray-200 p-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[100px]"
                        value={data.vision || ''}
                        onChange={(e) => updateData('vision', e.target.value)}
                        maxLength={500}
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Type de projet recherché
                    </label>
                    <select
                        className="w-full rounded-xl border-gray-200 py-3 px-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        value={data.project_pref || ''}
                        onChange={(e) => updateData('project_pref', e.target.value)}
                    >
                        <option value="">Sélectionner...</option>
                        <option value="TECH">Tech pure (SaaS, Mobile)</option>
                        <option value="HYBRID">Hybride (Tech + Retail/Ops)</option>
                        <option value="IMPACT">Impact Social</option>
                        <option value="ANY">Peu importe tant que c'est ambitieux</option>
                    </select>
                </div>
            </div>
        </WizardStep>
    );
}
