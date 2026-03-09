'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function ProjectCofounderStep() {
    const { data, updateData, nextStep } = useOnboarding();

    return (
        <WizardStep
            title="Cofondateur & Vision"
            description="Qui cherchez-vous pour cette aventure ?"
            onNext={nextStep}
            isValid={!!data.looking_for_role}
            nextLabel="Continuer"
        >
            <div className="space-y-8">
                <div className="space-y-4">
                    <Select
                        label="Profil recherché"
                        value={data.looking_for_role || ''}
                        onChange={(value) => updateData('looking_for_role', value)}
                        options={[
                            { value: 'TECH', label: 'Profil Tech (CTO/Dev)' },
                            { value: 'BIZ', label: 'Profil Business (Sales/Marketing)' },
                            { value: 'PRODUCT', label: 'Profil Produit' },
                            { value: 'FINANCE', label: 'Profil Finance' }
                        ]}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Type de collaboration
                    </label>
                    <div className="flex gap-4">
                        {['EQUITY', 'PAID', 'HYBRID'].map((type) => (
                            <button
                                key={type}
                                onClick={() => updateData('collab_type', type)}
                                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.collab_type === type
                                    ? 'border-kezak-primary bg-kezak-primary/5 text-kezak-primary'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {type === 'EQUITY' ? 'Associé (Parts)' : type === 'PAID' ? 'Rémunéré' : 'Hybride'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <Textarea
                        label="Vision à 3 ans (Pitch final)"
                        placeholder="Où serez-vous dans 3 ans ?"
                        value={data.vision || ''}
                        onChange={(e) => updateData('vision', e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
