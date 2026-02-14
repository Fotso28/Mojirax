'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function ProjectTractionStep() {
    const { data, updateData, nextStep } = useOnboarding();

    return (
        <WizardStep
            title="Validation & Équipe"
            description="Où en êtes-vous et qui êtes-vous ?"
            onNext={nextStep}
            isValid={!!data.founder_role}
        >
            <div className="space-y-8">
                <div className="space-y-4">
                    <Select
                        label="Votre Rôle Principal"
                        value={data.founder_role || ''}
                        onChange={(value) => updateData('founder_role', value)}
                        options={[
                            { value: 'CEO', label: 'CEO / General' },
                            { value: 'CTO', label: 'CTO / Tech' },
                            { value: 'CPO', label: 'CPO / Product' },
                            { value: 'CMO', label: 'CMO / Marketing' },
                            { value: 'COO', label: 'COO / Operations' }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <Select
                        label="Temps disponible (Hebdo)"
                        value={data.time_availability || ''}
                        onChange={(value) => updateData('time_availability', value)}
                        options={[
                            { value: '2-5H', label: '2-5h (Side project)' },
                            { value: '5-10H', label: '5-10h' },
                            { value: '10-20H', label: '10-20h (Mi-temps)' },
                            { value: 'FULLTIME', label: 'Temps plein' }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <Textarea
                        label="Preuves de traction (Optionnel)"
                        placeholder="CA, Utilisateurs, Liste d'attente..."
                        value={data.traction || ''}
                        onChange={(e) => updateData('traction', e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
