'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useTranslation } from '@/context/i18n-context';

export function CandidateVisionStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    const PROJECT_TYPES = [
        { value: 'TECH', label: t('auth.candidate_project_tech') },
        { value: 'HYBRID', label: t('auth.candidate_project_hybrid') },
        { value: 'IMPACT', label: t('auth.candidate_project_impact') },
        { value: 'ANY', label: t('auth.candidate_project_any') },
    ];

    const selectedTypes: string[] = data.project_pref || [];

    const toggleType = (value: string) => {
        const current = [...selectedTypes];
        const idx = current.indexOf(value);
        if (idx >= 0) {
            current.splice(idx, 1);
        } else {
            current.push(value);
        }
        updateData('project_pref', current);
    };

    return (
        <WizardStep
            title={t('auth.candidate_vision_title')}
            description={t('auth.candidate_vision_desc')}
            onNext={nextStep}
            isValid={!!data.vision}
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.candidate_cofounded_label')}
                    </label>
                    <div className="flex gap-4">
                        {['YES', 'NO'].map((opt) => (
                            <button
                                key={opt}
                                onClick={() => updateData('has_cofounded', opt)}
                                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.has_cofounded === opt
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {opt === 'YES' ? t('auth.candidate_cofounded_yes') : t('auth.candidate_cofounded_no')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.candidate_personal_vision')}
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[100px] bg-white"
                        placeholder={t('auth.candidate_personal_vision_placeholder')}
                        value={data.vision || ''}
                        onChange={(e) => updateData('vision', e.target.value)}
                        maxLength={500}
                    />
                    <p className="text-xs text-gray-400 text-right">{(data.vision || '').length}/500</p>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.candidate_project_type')}
                        <span className="text-gray-400 font-normal ms-1">{t('auth.candidate_project_type_hint')}</span>
                    </label>
                    <div className="flex gap-3 flex-wrap">
                        {PROJECT_TYPES.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => toggleType(type.value)}
                                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${selectedTypes.includes(type.value)
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </WizardStep>
    );
}
