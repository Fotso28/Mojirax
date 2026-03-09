'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Rocket, Compass, CheckCircle, ArrowRight } from 'lucide-react';
import { AXIOS_INSTANCE as axiosInstance } from '@/api/axios-instance';
import { Button } from '@/components/ui';

const roles = [
    {
        id: 'FOUNDER',
        label: 'Je suis un Fondateur',
        description: 'J\'ai une vision et je cherche des partenaires pour la concrétiser.',
        icon: Rocket,
    },
    {
        id: 'CANDIDATE',
        label: 'Je suis un Candidat',
        description: 'Je veux rejoindre un projet ambitieux en tant que co-fondateur technique ou business.',
        icon: Compass,
    }
];

export default function RoleSelectionPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSelectRole = (roleId: string) => {
        setSelectedRole(roleId);
        setError('');
    };

    const handleContinue = async () => {
        if (!selectedRole || !user) return;

        setLoading(true);
        setError('');
        try {
            await axiosInstance.patch('/users/profile', {
                role: selectedRole
            });

            if (selectedRole === 'FOUNDER') {
                router.push('/onboarding/founder');
            } else {
                router.push('/onboarding/candidate');
            }
        } catch (error) {
            console.error('Failed to update role:', error);
            setError('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-kezak-primary/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-kezak-accent/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10">
                <div className="text-center mb-16">
                    <img src="/logo/logo.svg" alt="MojiraX" className="mx-auto h-12 w-12 mb-8 opacity-80" />
                    <h1 className="text-4xl md:text-5xl font-bold text-kezak-dark mb-4 tracking-tight">
                        Quel est votre profil ?
                    </h1>
                    <p className="text-lg text-gray-500 max-w-xl mx-auto">
                        Pour personnaliser votre expérience sur MojiraX, dites-nous comment vous souhaitez utiliser la plateforme.
                    </p>
                </div>

                {error && (
                    <div className="mb-8 max-w-md mx-auto bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-12">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            onClick={() => handleSelectRole(role.id)}
                            className={`
                                relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 group
                                ${selectedRole === role.id
                                    ? 'bg-white border-kezak-primary ring-4 ring-kezak-primary/10 shadow-xl scale-[1.02]'
                                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-1'
                                }
                            `}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className={`
                                    w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300
                                    ${selectedRole === role.id ? 'bg-kezak-primary text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-kezak-light group-hover:text-kezak-primary'}
                                `}>
                                    <role.icon className="w-7 h-7" />
                                </div>
                                {selectedRole === role.id && (
                                    <div className="text-kezak-primary">
                                        <CheckCircle className="w-6 h-6 fill-kezak-primary text-white" />
                                    </div>
                                )}
                            </div>

                            <h3 className={`text-xl font-bold mb-3 transition-colors ${selectedRole === role.id ? 'text-kezak-dark' : 'text-gray-900'}`}>
                                {role.label}
                            </h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                {role.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <Button
                        onClick={handleContinue}
                        disabled={!selectedRole || loading}
                        className="!h-14 !px-12 text-lg !rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        {loading ? 'Traitement...' : (
                            <>
                                Continuer <ArrowRight className="ml-2 w-5 h-5" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
