'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/context/i18n-context';

export function ProjectTractionStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    return (
        <WizardStep
            title={t('project.traction_title')}
            description={t('project.traction_description')}
            onNext={nextStep}
            isValid={!!data.founder_role}
        >
            <div className="space-y-8">
                <div className="space-y-4">
                    <Select
                        label={t('project.traction_role_label')}
                        value={data.founder_role || ''}
                        onChange={(value) => updateData('founder_role', value)}
                        options={[
                            { value: 'CEO', label: t('project.traction_role_ceo') },
                            { value: 'CTO', label: t('project.traction_role_cto') },
                            { value: 'CPO', label: t('project.traction_role_cpo') },
                            { value: 'CMO', label: t('project.traction_role_cmo') },
                            { value: 'COO', label: t('project.traction_role_coo') }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <Select
                        label={t('project.traction_time_label')}
                        value={data.time_availability || ''}
                        onChange={(value) => updateData('time_availability', value)}
                        options={[
                            { value: '2-5H', label: t('project.traction_time_2_5') },
                            { value: '5-10H', label: t('project.traction_time_5_10') },
                            { value: '10-20H', label: t('project.traction_time_10_20') },
                            { value: 'FULLTIME', label: t('project.traction_time_fulltime') }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <Textarea
                        label={t('project.traction_proof_label')}
                        placeholder={t('project.traction_proof_placeholder')}
                        value={data.traction || ''}
                        onChange={(e) => updateData('traction', e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
