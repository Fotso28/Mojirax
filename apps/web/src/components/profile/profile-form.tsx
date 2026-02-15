'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save } from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';

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
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

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
        try {
            await AXIOS_INSTANCE.patch('/users/profile', data);
            showToast('Profil mis à jour avec succès !', 'success');
        } catch {
            showToast('Impossible de mettre à jour le profil.', 'error');
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
                            className="w-full h-[52px] px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200"
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
                            className="w-full h-[52px] px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200"
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
                            className="w-full h-[52px] px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200"
                            placeholder="+237..."
                        />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Ville / Pays</label>
                        <input
                            {...form.register('address')}
                            className="w-full h-[52px] px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200"
                            placeholder="Douala, Cameroun"
                        />
                    </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end pt-4 border-t border-gray-50 mt-6">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 h-[52px] bg-kezak-primary text-white rounded-lg font-semibold hover:bg-kezak-dark transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
}
