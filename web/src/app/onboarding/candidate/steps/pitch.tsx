'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';
import { getPlanIntent, triggerCheckoutByPlanKey } from '@/lib/utils/plan-intent';

export function CandidatePitchStep() {
    const { data, updateData, submitForm } = useOnboarding();
    const { refreshDbUser } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const planIntent = getPlanIntent(searchParams);

    const handleSubmit = async () => {
        await submitForm(async (formData) => {
            // 1. Save User-level fields (title, skills, yearsOfExperience)
            const userPatch: Record<string, any> = {};
            if (formData.title) userPatch.title = formData.title;
            if (formData.main_competence) userPatch.skills = [formData.main_competence];
            if (formData.years_exp) {
                const expMap: Record<string, number> = { '0-2': 1, '3-5': 4, '6-10': 8, '10+': 12 };
                userPatch.yearsOfExperience = expMap[formData.years_exp] || null;
            }
            if (formData.achievements) userPatch.bio = formData.achievements;

            if (Object.keys(userPatch).length > 0) {
                await AXIOS_INSTANCE.patch('/users/profile', userPatch);
            }

            // 2. Create candidate profile with candidate-specific fields only
            await AXIOS_INSTANCE.post('/users/candidate-profile', {
                shortPitch: formData.short_pitch,
                longPitch: formData.long_pitch,
                vision: formData.vision,
                locationPref: formData.location_pref,
                availability: formData.time_availability,
                collabPref: formData.collab_pref,
                projectPref: formData.project_pref || [],
                roleType: formData.role_type,
                commitmentType: formData.commitment_type,
                hasCofounded: formData.has_cofounded,
            });

            showToast('Profil créé ! Vérification en cours...', 'success');
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
            title="Pitch Final"
            description="Le mot de la fin pour convaincre."
            onNext={handleSubmit}
            isValid={!!data.short_pitch}
            nextLabel="Publier mon profil"
        >
            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Pitch Court (Carte de profil)
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[80px] bg-white"
                        placeholder="Expert React cherchant CTO ambitieux sur projet Fintech..."
                        value={data.short_pitch || ''}
                        onChange={(e) => updateData('short_pitch', e.target.value)}
                        maxLength={280}
                    />
                    <div className="text-right text-xs text-gray-400">{(data.short_pitch || '').length}/280</div>
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Message libre (Ce qui n'est pas dans le CV)
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none min-h-[120px] bg-white"
                        placeholder="Je suis passionné par..."
                        value={data.long_pitch || ''}
                        onChange={(e) => updateData('long_pitch', e.target.value)}
                        maxLength={2000}
                    />
                    <div className="text-right text-xs text-gray-400">{(data.long_pitch || '').length}/2000</div>
                </div>
            </div>
        </WizardStep>
    );
}
