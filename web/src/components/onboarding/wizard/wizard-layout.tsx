'use client';

import { useOnboarding } from '@/context/onboarding-context';
import { ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/i18n-context';

interface WizardLayoutProps {
    title: string;
    children: React.ReactNode;
    onBack?: () => void;
}

export function WizardLayout({ title, children, onBack }: WizardLayoutProps) {
    const { currentStep, totalSteps, prevStep } = useOnboarding();

    // Calculate progress percentage
    const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Top Bar - Simplified */}
            <header className="bg-white border-b border-gray-50 h-16 flex items-center px-6 relative z-20">
                <button
                    onClick={currentStep === 0 ? onBack : prevStep}
                    className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-50"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="ms-4 font-semibold text-gray-700">{title}</div>

                <div className="ms-auto text-sm text-gray-400 font-medium">
                    {currentStep + 1} / {totalSteps}
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-50 w-full">
                <motion.div
                    className="h-full bg-kezak-primary origin-left"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
                <div className="flex-1 max-w-3xl mx-auto w-full p-6 sm:p-10 flex flex-col justify-start pt-10 pb-20">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

// Reusable Step Container
export function WizardStep({ title, description, children, onNext, isValid = true, nextLabel }: any) {
    const { isSubmitting } = useOnboarding();
    const { t } = useTranslation();
    const resolvedLabel = nextLabel || t('common.continue');

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-lg text-gray-500">{description}</p>
                )}
            </div>

            <div className="py-2">
                {children}
            </div>

            <div className="pt-6 flex justify-end">
                <button
                    onClick={onNext}
                    disabled={!isValid || isSubmitting}
                    className="group flex items-center gap-2 bg-kezak-primary text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-kezak-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-kezak-primary/30"
                >
                    {isSubmitting ? t('auth.saving') : resolvedLabel}
                    {!isSubmitting && <Check className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
            </div>
        </div>
    );
}
