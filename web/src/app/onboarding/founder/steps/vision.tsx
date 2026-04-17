'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useTranslation } from '@/context/i18n-context';

export function FounderVisionStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    const isValid = !!data.description?.trim();

    return (
        <WizardStep
            title={t('auth.founder_vision_title')}
            description={t('auth.founder_vision_desc')}
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.founder_pitch_label')}
                    </label>
                    <input
                        type="text"
                        placeholder={t('auth.founder_pitch_placeholder')}
                        value={data.pitch || ''}
                        onChange={(e) => updateData('pitch', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        maxLength={100}
                        autoFocus
                    />
                    <div className="text-right text-xs text-gray-400">
                        {(data.pitch || '').length}/100
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.founder_description_label')}
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[140px] bg-white"
                        placeholder={t('auth.founder_description_placeholder')}
                        value={data.description || ''}
                        onChange={(e) => updateData('description', e.target.value)}
                        maxLength={1000}
                    />
                    <div className="text-right text-xs text-gray-400">
                        {(data.description || '').length}/1000
                    </div>
                </div>
            </div>
        </WizardStep>
    );
}
