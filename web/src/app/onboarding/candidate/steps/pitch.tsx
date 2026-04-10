'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';

export function CandidatePitchStep() {
    const { data, updateData, submitForm } = useOnboarding();
    const { user } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const handleSubmit = async () => {
        await submitForm(async (formData) => {
            await AXIOS_INSTANCE.post('/users/candidate-profile', {
                title: formData.title,
                shortPitch: formData.short_pitch,
                longPitch: formData.long_pitch,
                mainCompetence: formData.main_competence,
                yearsExp: formData.years_exp,
                vision: formData.vision,
                locationPref: formData.location_pref,
                availability: formData.time_availability,
                collabPref: formData.collab_pref,
                projectPref: formData.project_pref || [],
                roleType: formData.role_type,
                commitmentType: formData.commitment_type,
                achievements: formData.achievements,
                hasCofounded: formData.has_cofounded,
            });

            showToast('Profil créé ! Vérification en cours...', 'success');
            router.push('/');
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
                    <div className="text-right text-xs text-gray-400">280 caractères max</div>
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
                    />
                </div>
            </div>
        </WizardStep>
    );
}
