'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

// Schema matches UpdateUserProfileDto
const profileSchema = z.object({
    firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères').optional(),
    lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    bio: z.string().max(500, 'La bio ne doit pas dépasser 500 caractères').optional(), // Not in DTO yet but useful
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    user: any; // Fallback type
}

export function ProfileForm({ user }: ProfileFormProps) {
    const { updateUser } = useAuth(); // Assuming useAuth has this method, or we add it
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            address: user.address || '',
        },
    });

    const onSubmit = async (data: ProfileFormValues) => {
        setIsSaving(true);
        setMessage(null);
        try {
            // Direct API  call if useAuth doesn't expose it
            // but ideally useAuth or separate service
            // For now, assuming we can fetch authorized axios instance

            // Simulating API Call until Orval/Axios is ready
            // await api.users.updateProfile(data);

            // Using fetch for now if no global axios
            const token = await user.getIdToken?.(); // Firebase token

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/users/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Erreur lors de la mise à jour');

            setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Impossible de mettre à jour le profil.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Informations Personnelles</h2>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Prénom</label>
                        <input
                            {...form.register('firstName')}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Votre prénom"
                        />
                        {form.formState.errors.firstName && (
                            <p className="text-xs text-red-500">{form.formState.errors.firstName.message}</p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nom</label>
                        <input
                            {...form.register('lastName')}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Votre nom"
                        />
                        {form.formState.errors.lastName && (
                            <p className="text-xs text-red-500">{form.formState.errors.lastName.message}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Téléphone</label>
                        <input
                            {...form.register('phone')}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="+237..."
                        />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Ville / Pays</label>
                        <input
                            {...form.register('address')}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Douala, Cameroun"
                        />
                    </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-6">
                    {message && (
                        <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {message.text}
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
}
