'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';

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
                    <div className="flex gap-4 flex-wrap">
                        {['EQUITY', 'PAID', 'HYBRID', 'DISCUSS'].map((type) => (
                            <button
                                key={type}
                                onClick={() => updateData('collab_pref', type)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.collab_pref === type
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {type === 'EQUITY' ? 'Parts (Associé)' : type === 'PAID' ? 'Mission rémunérée' : type === 'HYBRID' ? 'Mixte' : 'À discuter'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Où voulez-vous travailler ?
                    </label>
                    <select
                        className="w-full rounded-xl border-gray-200 py-3 px-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        value={data.location_pref || ''}
                        onChange={(e) => updateData('location_pref', e.target.value)}
                    >
                        <option value="">Sélectionner...</option>
                        <option value="REMOTE">Remote (Télétravail)</option>
                        <option value="HYBRID">Hybride</option>
                        <option value="ONSITE">Présentiel</option>
                    </select>
                </div>
            </div>
        </WizardStep>
    );
}
