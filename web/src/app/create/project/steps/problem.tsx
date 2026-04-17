'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/context/i18n-context';

export function ProjectProblemStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    // Looser validation for text areas to encourage flow
    const isValid = data.problem && data.target && data.solution_current;

    return (
        <WizardStep
            title={t('project.problem_title')}
            description={t('project.problem_description')}
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-8">
                <div className="space-y-4">
                    <Textarea
                        label={t('project.problem_label')}
                        placeholder={t('project.problem_placeholder')}
                        value={data.problem || ''}
                        onChange={(e) => updateData('problem', e.target.value)}
                        maxLength={600}
                    />
                </div>

                <div className="space-y-4">
                    <Input
                        label={t('project.problem_target_label')}
                        placeholder={t('project.problem_target_placeholder')}
                        value={data.target || ''}
                        onChange={(e) => updateData('target', e.target.value)}
                    />
                </div>

                <div className="space-y-4">
                    <Textarea
                        label={t('project.problem_current_solutions_label')}
                        placeholder={t('project.problem_current_solutions_placeholder')}
                        value={data.solution_current || ''}
                        onChange={(e) => updateData('solution_current', e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
