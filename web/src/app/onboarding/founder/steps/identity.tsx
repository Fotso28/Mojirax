'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { SECTORS } from '@/lib/constants/sectors';

export function FounderIdentityStep() {
    const { data, updateData, nextStep } = useOnboarding();

    const isValid = !!data.name?.trim() && !!data.sector;

    return (
        <WizardStep
            title="Identite du Projet"
            description="Comment s'appelle votre projet ?"
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Nom du Projet
                    </label>
                    <input
                        type="text"
                        placeholder="Ex: MojiraX, EcoPay, Tontina..."
                        value={data.name || ''}
                        onChange={(e) => updateData('name', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 text-lg focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Secteur d'activite
                    </label>
                    <select
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        value={data.sector || ''}
                        onChange={(e) => updateData('sector', e.target.value)}
                    >
                        <option value="">Selectionner...</option>
                        {SECTORS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Stade du Projet
                    </label>
                    <select
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        value={data.stage || ''}
                        onChange={(e) => updateData('stage', e.target.value)}
                    >
                        <option value="">Selectionner...</option>
                        <option value="IDEA">Idee / Concept</option>
                        <option value="MVP">MVP en cours</option>
                        <option value="LAUNCHED">Lance (premiers utilisateurs)</option>
                        <option value="GROWING">En croissance</option>
                    </select>
                </div>
            </div>
        </WizardStep>
    );
}
