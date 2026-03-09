'use client';

import { OnboardingProvider } from '@/context/onboarding-context';
import { WizardLayout } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useEffect } from 'react';

// Steps
import { CandidateExpertiseStep } from './steps/expertise';
import { CandidateVisionStep } from './steps/vision';
import { CandidateAvailabilityStep } from './steps/availability';
import { CandidateConditionsStep } from './steps/conditions';
import { CandidatePitchStep } from './steps/pitch';

function CandidateWizardContent() {
    const { currentStep, setTotalSteps } = useOnboarding();

    const steps = [
        CandidateExpertiseStep,
        CandidateVisionStep,
        CandidateAvailabilityStep,
        CandidateConditionsStep,
        CandidatePitchStep
    ];

    useEffect(() => {
        setTotalSteps(steps.length);
    }, [setTotalSteps]);

    const CurrentStepComponent = steps[currentStep] || steps[0];

    return (
        <WizardLayout title="Profil Candidat">
            <CurrentStepComponent />
        </WizardLayout>
    );
}

export default function CandidateOnboardingPage() {
    return (
        <OnboardingProvider storageKey="onboarding_candidate_draft">
            <CandidateWizardContent />
        </OnboardingProvider>
    );
}
