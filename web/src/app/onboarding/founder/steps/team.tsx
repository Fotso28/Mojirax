'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';
import { getPlanIntent, triggerCheckoutByPlanKey } from '@/lib/utils/plan-intent';
import { useTranslation } from '@/context/i18n-context';

export function FounderTeamStep() {
    const { data, updateData, submitForm } = useOnboarding();
    const { t } = useTranslation();
    const { refreshDbUser } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const planIntent = getPlanIntent(searchParams);

    const isValid = !!data.requiredSkills?.trim();

    const handleSubmit = async () => {
        await submitForm(async (formData) => {
            const skills = formData.requiredSkills
                ?.split(',')
                .map((s: string) => s.trim())
                .filter(Boolean) || [];

            await AXIOS_INSTANCE.post('/projects', {
                name: formData.name,
                pitch: formData.pitch || formData.description?.substring(0, 100) || '',
                description: formData.description,
                sector: formData.sector,
                requiredSkills: skills,
                stage: formData.stage || 'IDEA',
            });

            showToast(t('auth.founder_toast_success'), 'success');
            await refreshDbUser();
            if (planIntent) {
                const ok = await triggerCheckoutByPlanKey(planIntent);
                if (!ok) router.push('/');
            } else {
                router.push('/');
            }
        });
    };

    return (
        <WizardStep
            title={t('auth.founder_team_title')}
            description={t('auth.founder_team_desc')}
            onNext={handleSubmit}
            isValid={isValid}
            nextLabel={t('auth.founder_submit')}
        >
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.founder_skills_label')}
                    </label>
                    <input
                        type="text"
                        placeholder={t('auth.founder_skills_placeholder')}
                        value={data.requiredSkills || ''}
                        onChange={(e) => updateData('requiredSkills', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                        autoFocus
                    />
                    <p className="text-xs text-gray-400">{t('auth.founder_skills_hint')}</p>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.founder_offer_label')}
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[100px] bg-white"
                        placeholder={t('auth.founder_offer_placeholder')}
                        value={data.offer || ''}
                        onChange={(e) => updateData('offer', e.target.value)}
                        maxLength={500}
                    />
                    <p className="text-xs text-gray-400 text-right">{(data.offer || '').length}/500</p>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('auth.founder_message_label')}
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[100px] bg-white"
                        placeholder={t('auth.founder_message_placeholder')}
                        value={data.founderMessage || ''}
                        onChange={(e) => updateData('founderMessage', e.target.value)}
                        maxLength={500}
                    />
                    <p className="text-xs text-gray-400 text-right">{(data.founderMessage || '').length}/500</p>
                </div>
            </div>
        </WizardStep>
    );
}
