'use client';

// import { UserRole } from '@/api/generated/users.schemas'; // REMOVED: Orval generation failed
import { CheckCircle2, Pencil } from 'lucide-react';
import Image from 'next/image';

// Temporary interface until Orval works or we use shared types
export interface ProfileHeaderProps {
    user: {
        firstName?: string;
        lastName?: string;
        role?: string; // UserRole
        image?: string;
        email?: string;
        isVerified?: boolean; // Not in DTO yet but in design
    };
    onEditAvatar?: () => void;
}

export function ProfileHeader({ user, onEditAvatar }: ProfileHeaderProps) {
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
                {/* Avatar */}
                <div className="relative group">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 flex items-center justify-center">
                        {user.image ? (
                            <Image
                                src={user.image}
                                alt={displayName}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-3xl font-bold text-gray-300">
                                {displayName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    {onEditAvatar && (
                        <button
                            onClick={onEditAvatar}
                            className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Identity */}
                <div className="flex-1 text-center sm:text-left mb-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {displayName}
                        </h1>
                        {user.isVerified && (
                            <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50" />
                        )}
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

                {/* Actions (Placeholder) */}
                {/* <div className="flex items-center gap-3">
                    <Button variant="outline">Voir le profil public</Button>
                </div> */}
            </div>
        </div>
    );
}
