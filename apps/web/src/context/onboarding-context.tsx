'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface OnboardingState {
    data: Record<string, any>;
    currentStep: number;
    totalSteps: number;
    isSubmitting: boolean;
}

interface OnboardingContextType extends OnboardingState {
    setData: (data: Record<string, any>) => void;
    updateData: (key: string, value: any) => void;
    nextStep: () => void;
    prevStep: () => void;
    setTotalSteps: (count: number) => void;
    submitForm: (submitFn: (data: any) => Promise<void>) => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

import { useAuth } from './auth-context';

/* ... interfaces ... */

export function OnboardingProvider({ children, storageKey }: { children: ReactNode, storageKey: string }) {
    const { user } = useAuth();
    const [data, setDataState] = useState<Record<string, any>>({});
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load from API + Local Storage on mount
    useEffect(() => {
        const loadDraft = async () => {
            let loadedFromServer = false;

            if (user) {
                try {
                    // 1. Try fetching from server
                    const token = await user.getIdToken();
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/creating-projet`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const serverDraft = await response.json();
                        if (serverDraft && Object.keys(serverDraft).length > 0) {
                            // console.log("Loaded draft from server");
                            // Server wins
                            setDataState(serverDraft.data || {});
                            if (typeof serverDraft.step === 'number') setCurrentStep(serverDraft.step);
                            loadedFromServer = true;
                        }
                    }
                } catch (e) {
                    console.warn("Failed to load server draft", e);
                }
            }

            // 2. Fallback to LocalStorage if server empty or failed/not auth
            if (!loadedFromServer) {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        setDataState(parsed.data || {});
                        if (typeof parsed.step === 'number') setCurrentStep(parsed.step);
                    } catch (e) {
                        console.error("Failed to load local draft", e);
                    }
                }
            }
        };

        loadDraft();
    }, [storageKey, user]);

    // Save to LocalStorage immediately & Server with Debounce
    useEffect(() => {
        // Local Save
        const stateToSave = { data, step: currentStep };
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));

        // Server Save (Debounced)
        const timeoutId = setTimeout(async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/creating-projet`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(stateToSave)
                });
            } catch (e) {
                console.warn("Auto-save failed", e);
            }
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timeoutId);
    }, [data, currentStep, storageKey, user]);

    const updateData = (key: string, value: any) => {
        setDataState(prev => ({ ...prev, [key]: value }));
    };

    const nextStep = () => {
        if (currentStep < totalSteps - 1) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(c => c - 1);
    };

    const submitForm = async (submitFn: (data: any) => Promise<void>) => {
        setIsSubmitting(true);
        try {
            await submitFn(data);
            localStorage.removeItem(storageKey); // Clear draft on success
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <OnboardingContext.Provider value={{
            data, currentStep, totalSteps, isSubmitting,
            setData: setDataState, updateData, nextStep, prevStep, setTotalSteps, submitForm
        }}>
            {children}
        </OnboardingContext.Provider>
    );
}

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
    return context;
};
