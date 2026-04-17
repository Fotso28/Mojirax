'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { SECTORS } from '@/lib/constants/sectors';
import { useTranslation } from '@/context/i18n-context';

export function FounderIdentityStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    const isValid = !!data.name?.trim() && !!data.sector;

    return (
        <WizardStep
            title={t('auth.founder_identity_title')}
            description={t('auth.founder_identity_desc')}
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.founder_project_name')}
                    </label>
                    <input
                        type="text"
                        placeholder={t('auth.founder_project_name_placeholder')}
                        value={data.name || ''}
                        onChange={(e) => updateData('name', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 text-lg focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.founder_sector')}
                    </label>
                    <select
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        value={data.sector || ''}
                        onChange={(e) => updateData('sector', e.target.value)}
                    >
                        <option value="">{t('auth.founder_sector_placeholder')}</option>
                        {SECTORS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.founder_stage')}
                    </label>
                    <select
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        value={data.stage || ''}
                        onChange={(e) => updateData('stage', e.target.value)}
                    >
                        <option value="">{t('auth.founder_stage_placeholder')}</option>
                        <option value="IDEA">{t('auth.founder_stage_idea')}</option>
                        <option value="MVP">{t('auth.founder_stage_mvp')}</option>
                        <option value="LAUNCHED">{t('auth.founder_stage_launched')}</option>
                        <option value="GROWING">{t('auth.founder_stage_growing')}</option>
                    </select>
                </div>
            </div>
        </WizardStep>
    );
}
