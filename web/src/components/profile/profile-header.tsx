'use client';

import { CheckCircle2 } from 'lucide-react';
import { ImageUploader } from '@/components/ui/image-uploader';
import { PlanBadge } from '@/components/ui/plan-badge';
import { useToast } from '@/context/toast-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';

export interface ProfileHeaderProps {
    user: {
        firstName?: string;
        lastName?: string;
        role?: string;
        image?: string;
        email?: string;
        isVerified?: boolean;
        plan?: string;
    };
    onAvatarUploaded?: (data: any) => void;
}

export function ProfileHeader({ user, onAvatarUploaded }: ProfileHeaderProps) {
    const { showToast } = useToast();

    const displayName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.email?.split('@')[0] || 'Utilisateur';

    const roleLabel = {
        FOUNDER: 'Fondateur',
        CANDIDATE: 'Candidat',
        ADMIN: 'Admin',
        USER: 'Utilisateur',
    }[user.role as string] || 'Membre';

    return (
        <div className="relative bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm overflow-hidden mb-6">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-50 to-indigo-50 -z-10" />

            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pt-10">
                {/* Avatar via ImageUploader */}
                <ImageUploader
                    preset="avatar"
                    uploadEndpoint="/users/avatar"
                    currentImageUrl={user.image}
                    onUploadComplete={async (url) => {
                        // L'API retourne l'objet user complet, on le fetch
                        try {
                            const { data } = await AXIOS_INSTANCE.get('/users/profile');
                            onAvatarUploaded?.(data);
                        } catch {
                            // Fallback: on passe juste l'URL
                            onAvatarUploaded?.({ ...user, image: url });
                        }
                    }}
                    onError={(msg) => showToast(msg, 'error')}
                    variant="avatar"
                    size="lg"
                    placeholder={displayName}
                />

                {/* Identity */}
                <div className="flex-1 text-center sm:text-left mb-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {displayName}
                        </h1>
                        {user.isVerified && (
                            <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50" />
                        )}
                        <PlanBadge plan={user.plan} />
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {roleLabel}
                        </span>
                        <span className="text-sm text-gray-500">
                            {user.email}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
