'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Select } from '@/components/ui/select';

export function ProjectDetailsStep() {
    const { data, updateData, nextStep } = useOnboarding();

    // Validation
    const isValid = data.scope && data.sector && data.stage;

    return (
        <WizardStep
            title="Détails du Projet"
            description="Quelques précisions sur la nature de votre startup."
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Select
                        label="Périmètre"
                        value={data.scope || ''}
                        onChange={(value) => updateData('scope', value)}
                        options={[
                            { value: 'LOCAL', label: 'Local' },
                            { value: 'DIASPORA', label: 'Diaspora' },
                            { value: 'HYBRID', label: 'Hybride' }
                        ]}
                    />

                    <Select
                        label="Secteur"
                        value={data.sector || ''}
                        onChange={(value) => updateData('sector', value)}
                        options={[
                            { value: 'FINTECH', label: 'Fintech' },
                            { value: 'AGRITECH', label: 'Agritech' },
                            { value: 'HEALTH', label: 'Santé' },
                            { value: 'EDTECH', label: 'Education' },
                            { value: 'LOGISTICS', label: 'Logistique' },
                            { value: 'ECOMMERCE', label: 'E-commerce' },
                            { value: 'OTHER', label: 'Autre' }
                        ]}
                    />
                </div>

                <Select
                    label="Stade actuel"
                    value={data.stage || ''}
                    onChange={(value) => updateData('stage', value)}
                    options={[
                        { value: 'IDEA', label: 'Idée / Recherche' },
                        { value: 'PROTOTYPE', label: 'Prototype' },
                        { value: 'MVP_BUILD', label: 'MVP en cours' },
                        { value: 'MVP_LIVE', label: 'MVP lancé' },
                        { value: 'TRACTION', label: 'Traction / Clients' },
                        { value: 'SCALE', label: 'Scale' }
                    ]}
                />
            </div>
        </WizardStep>
    );
}
