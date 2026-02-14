'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function ProjectSolutionStep() {
    const { data, updateData, nextStep } = useOnboarding();

    return (
        <WizardStep
            title="Votre Solution"
            description="Comment réglez-vous le problème ?"
            onNext={nextStep}
            isValid={!!data.solution_desc && !!data.uvp}
        >
            <div className="space-y-8">
                <div className="space-y-4">
                    <Textarea
                        label="Décrivez votre solution en 3 phrases"
                        value={data.solution_desc || ''}
                        onChange={(e) => updateData('solution_desc', e.target.value)}
                        maxLength={600}
                        className="min-h-[100px]"
                    />
                </div>

                <div className="space-y-4">
                    <Input
                        label="Votre Proposition de Valeur Unique (UVP)"
                        placeholder="La seule plateforme qui..."
                        value={data.uvp || ''}
                        onChange={(e) => updateData('uvp', e.target.value)}
                    />
                </div>

                <div className="space-y-4">
                    <Textarea
                        label="Ce que vous ne faites PAS (Anti-scope)"
                        placeholder="Pour éviter le flou..."
                        value={data.anti_scope || ''}
                        onChange={(e) => updateData('anti_scope', e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
