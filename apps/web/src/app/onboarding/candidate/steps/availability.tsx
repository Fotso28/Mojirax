'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';

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
                    <select
                        className="w-full rounded-xl border-gray-200 py-3 px-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        value={data.time_availability || ''}
                        onChange={(e) => updateData('time_availability', e.target.value)}
                    >
                        <option value="">Sélectionner...</option>
                        <option value="2-5H">2-5h (Soirs & WE)</option>
                        <option value="5-10H">5-10h</option>
                        <option value="10-20H">10-20h (Mi-temps)</option>
                        <option value="FULLTIME">Temps plein</option>
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Type d'engagement visé
                    </label>
                    <select
                        className="w-full rounded-xl border-gray-200 py-3 px-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        value={data.commitment_type || ''}
                        onChange={(e) => updateData('commitment_type', e.target.value)}
                    >
                        <option value="">Sélectionner...</option>
                        <option value="SIDE">Side Project</option>
                        <option value="SERIOUS">Sérieux (Obj. Full-time)</option>
                        <option value="FULLTIME">Full-time immédiat</option>
                    </select>
                </div>
            </div>
        </WizardStep>
    );
}
