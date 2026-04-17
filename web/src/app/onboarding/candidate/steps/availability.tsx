'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useTranslation } from '@/context/i18n-context';

export function CandidateAvailabilityStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    const TIME_OPTIONS = [
        { value: '2-5H', label: t('auth.candidate_time_2_5') },
        { value: '5-10H', label: t('auth.candidate_time_5_10') },
        { value: '10-20H', label: t('auth.candidate_time_10_20') },
        { value: 'FULLTIME', label: t('auth.candidate_time_fulltime') },
    ];

    const COMMITMENT_OPTIONS = [
        { value: 'SIDE', label: t('auth.candidate_commitment_side') },
        { value: 'SERIOUS', label: t('auth.candidate_commitment_serious') },
        { value: 'FULLTIME', label: t('auth.candidate_commitment_fulltime') },
    ];

    return (
        <WizardStep
            title={t('auth.candidate_availability_title')}
            description={t('auth.candidate_availability_desc')}
            onNext={nextStep}
            isValid={!!data.time_availability && !!data.commitment_type}
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.candidate_time_label')}
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {TIME_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateData('time_availability', opt.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.time_availability === opt.value
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
                        {t('auth.candidate_commitment_label')}
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {COMMITMENT_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateData('commitment_type', opt.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.commitment_type === opt.value
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
