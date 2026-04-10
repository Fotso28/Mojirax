'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';

const COLLAB_OPTIONS = [
    { value: 'EQUITY', label: 'Parts (Associé)' },
    { value: 'PAID', label: 'Mission rémunérée' },
    { value: 'HYBRID', label: 'Mixte' },
    { value: 'DISCUSS', label: 'À discuter' },
];

const LOCATION_OPTIONS = [
    { value: 'REMOTE', label: 'Remote (Télétravail)' },
    { value: 'HYBRID', label: 'Hybride' },
    { value: 'ONSITE', label: 'Présentiel' },
];

export function CandidateConditionsStep() {
    const { data, updateData, nextStep } = useOnboarding();

    return (
        <WizardStep
            title="Conditions"
            description="Vos attentes pour collaborer."
            onNext={nextStep}
            isValid={!!data.collab_pref}
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Type de collaboration recherchée
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {COLLAB_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateData('collab_pref', opt.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.collab_pref === opt.value
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
                        Où voulez-vous travailler ?
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {LOCATION_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateData('location_pref', opt.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.location_pref === opt.value
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
