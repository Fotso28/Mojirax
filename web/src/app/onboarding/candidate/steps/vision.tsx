'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';

const PROJECT_TYPES = [
    { value: 'TECH', label: 'Tech pure (SaaS, Mobile)' },
    { value: 'HYBRID', label: 'Hybride (Tech + Retail/Ops)' },
    { value: 'IMPACT', label: 'Impact Social' },
    { value: 'ANY', label: 'Peu importe' },
];

export function CandidateVisionStep() {
    const { data, updateData, nextStep } = useOnboarding();

    const selectedTypes: string[] = data.project_pref || [];

    const toggleType = (value: string) => {
        const current = [...selectedTypes];
        const idx = current.indexOf(value);
        if (idx >= 0) {
            current.splice(idx, 1);
        } else {
            current.push(value);
        }
        updateData('project_pref', current);
    };

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
                        <span className="text-gray-400 font-normal ml-1">(plusieurs choix possibles)</span>
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {PROJECT_TYPES.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => toggleType(type.value)}
                                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${selectedTypes.includes(type.value)
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </WizardStep>
    );
}
