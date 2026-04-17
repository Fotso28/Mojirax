'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/context/i18n-context';

export function ProjectMarketStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    return (
        <WizardStep
            title={t('project.market_title')}
            description={t('project.market_description')}
            onNext={nextStep}
            isValid={!!data.business_model && !!data.market_type}
        >
            <div className="space-y-8">
                <div className="space-y-2">
                    <Select
                        label={t('project.market_type_label')}
                        value={data.market_type || ''}
                        onChange={(value) => updateData('market_type', value)}
                        options={[
                            { value: 'B2C', label: t('project.market_type_b2c') },
                            { value: 'B2B', label: t('project.market_type_b2b') },
                            { value: 'B2G', label: t('project.market_type_b2g') },
                            { value: 'MARKETPLACE', label: t('project.market_type_marketplace') }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <Select
                        label={t('project.market_revenue_label')}
                        value={data.business_model || ''}
                        onChange={(value) => updateData('business_model', value)}
                        options={[
                            { value: 'SUBSCRIPTION', label: t('project.market_revenue_subscription') },
                            { value: 'COMMISSION', label: t('project.market_revenue_commission') },
                            { value: 'SALES', label: t('project.market_revenue_sales') },
                            { value: 'FREEMIUM', label: t('project.market_revenue_freemium') },
                            { value: 'ADS', label: t('project.market_revenue_ads') }
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    <Textarea
                        label={t('project.market_competitors_label')}
                        placeholder={t('project.market_competitors_placeholder')}
                        value={data.competitors || ''}
                        onChange={(e) => updateData('competitors', e.target.value)}
                        className="min-h-[80px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
