'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';

const TIME_OPTIONS = [
    { value: '2-5H', label: '2-5h (Soirs & WE)' },
    { value: '5-10H', label: '5-10h' },
    { value: '10-20H', label: '10-20h (Mi-temps)' },
    { value: 'FULLTIME', label: 'Temps plein' },
];

const COMMITMENT_OPTIONS = [
    { value: 'SIDE', label: 'Side Project' },
    { value: 'SERIOUS', label: 'Sérieux (Obj. Full-time)' },
    { value: 'FULLTIME', label: 'Full-time immédiat' },
];

export function CandidateAvailabilityStep() {
    const { data, updateData, nextStep } = useOnboarding();

    return (
        <WizardStep
            title="Disponibilité"
            description="Combien de temps pouvez-vous investir ?"
            onNext={nextStep}
            isValid={!!data.time_availability && !!data.commitment_type}
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Temps disponible (Hebdo)
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {TIME_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateData('time_availability', opt.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.time_availability === opt.value
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Type d'engagement visé
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {COMMITMENT_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateData('commitment_type', opt.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.commitment_type === opt.value
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </WizardStep>
    );
}
