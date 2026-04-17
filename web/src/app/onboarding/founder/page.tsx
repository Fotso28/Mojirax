'use client';

import { OnboardingProvider } from '@/context/onboarding-context';
import { WizardLayout } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { useEffect } from 'react';

// Steps
import { FounderIdentityStep } from './steps/identity';
import { FounderVisionStep } from './steps/vision';
import { FounderTeamStep } from './steps/team';
import { useTranslation } from '@/context/i18n-context';

function FounderWizardContent() {
    const { currentStep, setTotalSteps } = useOnboarding();
    const { t } = useTranslation();

    const steps = [
        FounderIdentityStep,
        FounderVisionStep,
        FounderTeamStep,
    ];

    useEffect(() => {
        setTotalSteps(steps.length);
    }, [setTotalSteps]);

    const CurrentStepComponent = steps[currentStep] || steps[0];

    return (
        <WizardLayout title={t('auth.onboarding_founder_title')}>
            <CurrentStepComponent />
        </WizardLayout>
    );
}

export default function FounderOnboardingPage() {
    return (
        <OnboardingProvider storageKey="onboarding_founder_draft">
            <FounderWizardContent />
        </OnboardingProvider>
    );
}
