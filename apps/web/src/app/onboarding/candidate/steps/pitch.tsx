'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function CandidatePitchStep() {
    const { data, updateData, submitForm } = useOnboarding();
    const { user } = useAuth();
    const router = useRouter();

    // Simulate API call for now
    const handleSubmit = async () => {
        await submitForm(async (formData) => {
            // TODO: Call actual API
            // await api.patch('/users/profile', formData);

            console.log("Submitting Candidate Data:", formData);
            await new Promise(r => setTimeout(r, 1500));

            // Update Auth Context with new role if needed (client-side specific logic)
            // Redirect
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
                        className="w-full rounded-xl border-gray-200 p-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px]"
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
                        className="w-full rounded-xl border-gray-200 p-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[120px]"
                        placeholder="Je suis passionné par..."
                        value={data.long_pitch || ''}
                        onChange={(e) => updateData('long_pitch', e.target.value)}
                    />
                </div>
            </div>
        </WizardStep>
    );
}
