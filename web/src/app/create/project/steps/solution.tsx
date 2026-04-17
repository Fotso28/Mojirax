'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/context/i18n-context';

export function ProjectSolutionStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    return (
        <WizardStep
            title={t('project.solution_title')}
            description={t('project.solution_description')}
            onNext={nextStep}
            isValid={!!data.solution_desc && !!data.uvp}
        >
            <div className="space-y-8">
                <div className="space-y-4">
                    <Textarea
                        label={t('project.solution_desc_label')}
                        value={data.solution_desc || ''}
                        onChange={(e) => updateData('solution_desc', e.target.value)}
                        maxLength={600}
                        className="min-h-[100px]"
                    />
                </div>

                <div className="space-y-4">
                    <Input
                        label={t('project.solution_uvp_label')}
                        placeholder={t('project.solution_uvp_placeholder')}
                        value={data.uvp || ''}
                        onChange={(e) => updateData('uvp', e.target.value)}
                    />
                </div>

                <div className="space-y-4">
                    <Textarea
                        label={t('project.solution_anti_scope_label')}
                        placeholder={t('project.solution_anti_scope_placeholder')}
                        value={data.anti_scope || ''}
                        onChange={(e) => updateData('anti_scope', e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
