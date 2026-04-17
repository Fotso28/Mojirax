'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Select } from '@/components/ui/select';
import { SECTORS } from '@/lib/constants/sectors';
import { useTranslation } from '@/context/i18n-context';

export function ProjectDetailsStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    // Validation
    const isValid = data.scope && data.sector && data.stage;

    return (
        <WizardStep
            title={t('project.details_title')}
            description={t('project.details_description')}
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Select
                        label={t('project.details_scope_label')}
                        value={data.scope || ''}
                        onChange={(value) => updateData('scope', value)}
                        options={[
                            { value: 'LOCAL', label: t('project.details_scope_local') },
                            { value: 'DIASPORA', label: t('project.details_scope_diaspora') },
                            { value: 'HYBRID', label: t('project.details_scope_hybrid') }
                        ]}
                    />

                    <Select
                        label={t('project.details_sector_label')}
                        value={data.sector || ''}
                        onChange={(value) => updateData('sector', value)}
                        options={SECTORS.map(s => ({ value: s.value, label: s.label }))}
                    />
                </div>

                <Select
                    label={t('project.details_stage_label')}
                    value={data.stage || ''}
                    onChange={(value) => updateData('stage', value)}
                    options={[
                        { value: 'IDEA', label: t('project.details_stage_idea') },
                        { value: 'PROTOTYPE', label: t('project.details_stage_prototype') },
                        { value: 'MVP_BUILD', label: t('project.details_stage_mvp_build') },
                        { value: 'MVP_LIVE', label: t('project.details_stage_mvp_live') },
                        { value: 'TRACTION', label: t('project.details_stage_traction') },
                        { value: 'SCALE', label: t('project.details_stage_scale') }
                    ]}
                />
            </div>
        </WizardStep>
    );
}
