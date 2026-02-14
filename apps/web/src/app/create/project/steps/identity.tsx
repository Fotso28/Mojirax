'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Input } from '@/components/ui/input';
import { CountrySelect } from '@/components/ui/country-select';

export function ProjectIdentityStep() {
    const { data, updateData, nextStep } = useOnboarding();

    // Validation: simple check if required fields are present
    const isValid = data.name && data.pitch && data.country && data.city;

    return (
        <WizardStep
            title="Votre Projet"
            description="Commençons par les bases. De quoi s'agit-il ?"
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                <Input
                    label="Nom du projet"
                    placeholder="Ex: MojiraX"
                    value={data.name || ''}
                    onChange={(e) => updateData('name', e.target.value)}
                    autoFocus
                />

                <Input
                    label="Slogan (Punchline)"
                    placeholder="Ex: Le réseau premium pour entrepreneurs"
                    value={data.pitch || ''}
                    onChange={(e) => updateData('pitch', e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <CountrySelect
                        label="Pays"
                        value={data.country || ''}
                        onChange={(value) => {
                            updateData('country', value);
                            updateData('location', `${data.city || ''}, ${value}`);
                        }}
                    />

                    <Input
                        label="Ville"
                        placeholder="Ex: Douala"
                        value={data.city || ''}
                        onChange={(e) => {
                            updateData('city', e.target.value);
                            updateData('location', `${e.target.value}, ${data.country || ''}`);
                        }}
                    />
                </div>

            </div>
        </WizardStep>
    );
}
