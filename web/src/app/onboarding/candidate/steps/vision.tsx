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
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
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
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[100px] bg-white"
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
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
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
