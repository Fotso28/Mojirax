'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function ProjectMarketStep() {
    const { data, updateData, nextStep } = useOnboarding();

    return (
        <WizardStep
            title="Marché & Business"
            description="Qui paie et comment ?"
            onNext={nextStep}
            isValid={!!data.business_model && !!data.market_type}
        >
            <div className="space-y-8">
                <div className="space-y-2">
                    <Select
                        label="Type de Marché"
                        value={data.market_type || ''}
                        onChange={(value) => updateData('market_type', value)}
                        options={[
                            { value: 'B2C', label: 'B2C (Grand Public)' },
                            { value: 'B2B', label: 'B2B (Entreprises)' },
                            { value: 'B2G', label: 'B2G (Gouvernement)' },
                            { value: 'MARKETPLACE', label: 'Marketplace' }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <Select
                        label="Modèle de Revenus"
                        value={data.business_model || ''}
                        onChange={(value) => updateData('business_model', value)}
                        options={[
                            { value: 'SUBSCRIPTION', label: 'Abonnement' },
                            { value: 'COMMISSION', label: 'Commission' },
                            { value: 'SALES', label: 'Vente unitaire' },
                            { value: 'FREEMIUM', label: 'Freemium' },
                            { value: 'ADS', label: 'Publicité' }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <Textarea
                        label="Concurrents / Alternatives"
                        placeholder="Qui sont vos rivaux ?"
                        value={data.competitors || ''}
                        onChange={(e) => updateData('competitors', e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
