'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Rocket, Compass, CheckCircle } from 'lucide-react';
import { AXIOS_INSTANCE as axiosInstance } from '@/api/axios-instance';

const roles = [
    {
        id: 'FOUNDER',
        label: 'Project Founder',
        description: 'I have a project idea and I need a co-founder.',
        icon: Rocket,
        color: 'bg-blue-100 text-blue-600',
        ringParam: 'ring-blue-500',
    },
    {
        id: 'CANDIDATE',
        label: 'Candidate',
        description: 'I want to join a project as a technical or business partner.',
        icon: Compass,
        color: 'bg-green-100 text-green-600',
        ringParam: 'ring-green-500',
    }
];

export default function RoleSelectionPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSelectRole = (roleId: string) => {
        setSelectedRole(roleId);
    };

    const handleContinue = async () => {
        if (!selectedRole || !user) return;

        setLoading(true);
        try {
            await axiosInstance.patch('/users/profile', {
                role: selectedRole
            });

            if (selectedRole === 'FOUNDER') {
                router.push('/onboarding/founder');
            } else {
                router.push('/onboarding/candidate'); // Placeholder
            }
        } catch (error) {
            console.error('Failed to update role:', error);
            // TODO: Show toast error
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <img src="/logo/logo" alt="MojiraX" className="mx-auto h-16 w-16 mb-6" />
                <h2 className="text-3xl font-bold text-gray-900">Choose your role</h2>
                <p className="mt-2 text-sm text-gray-600">
                    How do you want to use MojiraX?
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-3xl px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            onClick={() => handleSelectRole(role.id)}
                            className={`
                                relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-200
                                ${selectedRole === role.id
                                    ? `bg-white border-transparent ring-4 ${role.ringParam} shadow-lg scale-105`
                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
                            `}
                        >
                            {selectedRole === role.id && (
                                <div className="absolute top-4 right-4 text-blue-600">
                                    <CheckCircle className="w-6 h-6 fill-blue-600 text-white" />
                                </div>
                            )}

                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${role.color}`}>
                                <role.icon className="w-8 h-8" />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">{role.label}</h3>
                            <p className="text-gray-500">{role.description}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-10 flex justify-center">
                    <button
                        onClick={handleContinue}
                        disabled={!selectedRole || loading}
                        className={`
                            px-8 py-3 rounded-full font-bold text-lg text-white shadow-lg transition-all
                            ${!selectedRole || loading
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-kezak-primary hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-1'
                            }
                        `}
                    >
                        {loading ? 'Processing...' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}
