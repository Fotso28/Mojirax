'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function ProjectProblemStep() {
    const { data, updateData, nextStep } = useOnboarding();

    // Looser validation for text areas to encourage flow
    const isValid = data.problem && data.target && data.solution_current;

    return (
        <WizardStep
            title="Le Problème"
            description="Quelle douleur essayez-vous de guérir ?"
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-8">
                <div className="space-y-4">
                    <Textarea
                        label="Quel problème précis résolvez-vous ? (Max 600 caractères)"
                        placeholder="Décrivez la situation actuelle..."
                        value={data.problem || ''}
                        onChange={(e) => updateData('problem', e.target.value)}
                        maxLength={600}
                    />
                </div>

                <div className="space-y-4">
                    <Input
                        label="Pour qui exactement ? (Persona)"
                        placeholder="Ex: Les étudiants en médecine au Cameroun..."
                        value={data.target || ''}
                        onChange={(e) => updateData('target', e.target.value)}
                    />
                </div>

                <div className="space-y-4">
                    <Textarea
                        label="Quelles solutions utilisent-ils aujourd'hui ?"
                        placeholder="Ex: Excel, Cahiers, WhatsApp..."
                        value={data.solution_current || ''}
                        onChange={(e) => updateData('solution_current', e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
