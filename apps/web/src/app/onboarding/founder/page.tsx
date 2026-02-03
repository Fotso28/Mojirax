'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, LayoutDashboard, SkipForward } from 'lucide-react';
import { AXIOS_INSTANCE as axiosInstance } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui';

interface ProjectData {
    name: string;
    description: string;
    sector: string;
    requiredSkills: string[];
}

const steps = [
    {
        id: 'name',
        question: "Quel est le nom de votre projet ?",
        placeholder: "Ex: MojiraX, EcoPay..."
    },
    {
        id: 'description',
        question: "Quel problème résolvez-vous ?",
        placeholder: "Décrivez votre vision en quelques phrases..."
    },
    {
        id: 'sector',
        question: "Dans quel secteur opérez-vous ?",
        placeholder: "Ex: Fintech, Santé, E-commerce..."
    },
    {
        id: 'skills',
        question: "Quelles compétences recherchez-vous ?",
        placeholder: "Ex: React, Marketing, Finance..."
    }
];

export default function FounderOnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentAnswer, setCurrentAnswer] = useState('');

    const handleNext = async () => {
        if (!currentAnswer.trim()) return;

        const stepId = steps[currentStep].id;
        const newAnswers = { ...answers, [stepId]: currentAnswer };
        setAnswers(newAnswers);

        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
            setCurrentAnswer('');
        } else {
            await submitProject(newAnswers);
        }
    };

    const submitProject = async (finalAnswers: Record<string, string>) => {
        setIsSubmitting(true);
        try {
            const skills = finalAnswers['skills']?.split(',').map(s => s.trim()) || [];

            await axiosInstance.post('/projects', {
                name: finalAnswers['name'],
                pitch: finalAnswers['description']?.substring(0, 100) || '',
                description: finalAnswers['description'],
                sector: finalAnswers['sector'],
                requiredSkills: skills,
                stage: 'IDEA'
            });

            router.push('/');
        } catch (error) {
            console.error("Failed to create project", error);
            // In a real app, show error toast
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-kezak-primary/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-kezak-accent/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-3xl relative z-10">
                {/* Header / Progress */}
                <div className="mb-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 w-8 rounded-full transition-all duration-300 ${idx <= currentStep ? 'bg-kezak-primary' : 'bg-gray-100'}`}
                                />
                            ))}
                        </div>
                        <span className="ml-4 text-sm font-medium text-gray-400">
                            Étape {currentStep + 1}/{steps.length}
                        </span>
                    </div>

                    <button
                        onClick={handleSkip}
                        className="text-sm font-medium text-gray-400 hover:text-kezak-dark transition-colors flex items-center gap-2"
                    >
                        Passer <SkipForward size={16} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-kezak-dark mb-8 leading-tight tracking-tight">
                        {steps[currentStep].question}
                    </h1>

                    <div className="relative group">
                        <textarea
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleNext();
                                }
                            }}
                            placeholder={steps[currentStep].placeholder}
                            className="w-full text-2xl md:text-3xl text-gray-700 placeholder-gray-300 border-none border-b-2 border-gray-100 focus:border-kezak-primary focus:ring-0 bg-transparent resize-none p-0 py-6 transition-all min-h-[160px] leading-relaxed"
                            autoFocus
                        />
                        <div className="absolute bottom-0 left-0 h-0.5 bg-kezak-primary w-0 group-focus-within:w-full transition-all duration-500"></div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="flex items-center justify-between">
                    <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 bg-gray-50 px-3 py-1.5 rounded-md">
                        <span className="font-bold text-gray-600">Entrée ↵</span>
                        <span>pour valider</span>
                    </div>

                    <Button
                        onClick={handleNext}
                        disabled={!currentAnswer.trim() || isSubmitting}
                        className="!h-14 !px-8 text-lg !rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        {isSubmitting ? (
                            'Finalisation...'
                        ) : currentStep === steps.length - 1 ? (
                            'Lancer mon projet'
                        ) : (
                            <>
                                Continuer <ArrowRight size={20} className="ml-1" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
