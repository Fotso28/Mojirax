'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useTranslation } from '@/context/i18n-context';

export function CandidateExpertiseStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    const ROLES = [
        { value: 'TECH', label: t('auth.candidate_role_tech') },
        { value: 'PRODUCT', label: t('auth.candidate_role_product') },
        { value: 'MARKETING', label: t('auth.candidate_role_marketing') },
        { value: 'OPS', label: t('auth.candidate_role_ops') },
        { value: 'FINANCE', label: t('auth.candidate_role_finance') },
    ];

    const EXPERIENCE_LEVELS = [
        { value: '0-2', label: t('auth.candidate_exp_junior') },
        { value: '3-5', label: t('auth.candidate_exp_confirmed') },
        { value: '6-10', label: t('auth.candidate_exp_senior') },
        { value: '10+', label: t('auth.candidate_exp_expert') },
    ];

    const isValid = data.title && data.years_exp && data.main_competence;

    return (
        <WizardStep
            title={t('auth.candidate_expertise_title')}
            description={t('auth.candidate_expertise_desc')}
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">{t('auth.candidate_current_title')}</label>
                    <input
                        placeholder={t('auth.candidate_current_title_placeholder')}
                        value={data.title || ''}
                        onChange={(e) => updateData('title', e.target.value)}
                        maxLength={120}
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 text-lg focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        autoFocus
                    />
                    <p className="text-xs text-gray-400 text-right">{(data.title || '').length}/120</p>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">{t('auth.candidate_main_role')}</label>
                    <div className="flex gap-3 flex-wrap">
                        {ROLES.map((role) => (
                            <button
                                key={role.value}
                                type="button"
                                onClick={() => updateData('role_type', role.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.role_type === role.value
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">{t('auth.candidate_experience')}</label>
                    <div className="flex gap-3 flex-wrap">
                        {EXPERIENCE_LEVELS.map((exp) => (
                            <button
                                key={exp.value}
                                type="button"
                                onClick={() => updateData('years_exp', exp.value)}
                                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.years_exp === exp.value
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {exp.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.candidate_key_skill')}
                    </label>
                    <input
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        placeholder={t('auth.candidate_key_skill_placeholder')}
                        value={data.main_competence || ''}
                        onChange={(e) => updateData('main_competence', e.target.value)}
                        maxLength={100}
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.candidate_achievements')}
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[100px] bg-white"
                        placeholder={t('auth.candidate_achievements_placeholder')}
                        value={data.achievements || ''}
                        onChange={(e) => updateData('achievements', e.target.value)}
                        maxLength={600}
                    />
                    <p className="text-xs text-gray-400 text-right">{(data.achievements || '').length}/600</p>
                </div>
            </div>
        </WizardStep>
    );
}
