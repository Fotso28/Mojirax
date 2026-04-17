'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useTranslation } from '@/context/i18n-context';

export function CandidateConditionsStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    const COLLAB_OPTIONS = [
        { value: 'EQUITY', label: t('auth.candidate_collab_equity') },
        { value: 'PAID', label: t('auth.candidate_collab_paid') },
        { value: 'HYBRID', label: t('auth.candidate_collab_hybrid') },
        { value: 'DISCUSS', label: t('auth.candidate_collab_discuss') },
    ];

    const LOCATION_OPTIONS = [
        { value: 'REMOTE', label: t('auth.candidate_location_remote') },
        { value: 'HYBRID', label: t('auth.candidate_location_hybrid') },
        { value: 'ONSITE', label: t('auth.candidate_location_onsite') },
    ];

    return (
        <WizardStep
            title={t('auth.candidate_conditions_title')}
            description={t('auth.candidate_conditions_desc')}
            onNext={nextStep}
            isValid={!!data.collab_pref}
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.candidate_collab_label')}
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {COLLAB_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateData('collab_pref', opt.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.collab_pref === opt.value
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.candidate_location_label')}
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {LOCATION_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateData('location_pref', opt.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.location_pref === opt.value
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </WizardStep>
    );
}
