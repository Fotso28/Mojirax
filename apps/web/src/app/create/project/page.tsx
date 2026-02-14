'use client';

import { OnboardingProvider, useOnboarding } from '@/context/onboarding-context';
import { WizardLayout } from '@/components/onboarding/wizard/wizard-layout';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useEffect } from 'react';

// Steps
import { ProjectIdentityStep } from './steps/identity';
import { ProjectDetailsStep } from './steps/details';
import { ProjectProblemStep } from './steps/problem';
import { ProjectSolutionStep } from './steps/solution';
import { ProjectMarketStep } from './steps/market';
import { ProjectTractionStep } from './steps/traction';
import { ProjectCofounderStep } from './steps/cofounder';

function ProjectWizardContent() {
    const { currentStep, setTotalSteps } = useOnboarding();

    const steps = [
        ProjectIdentityStep,
        ProjectDetailsStep,
        ProjectProblemStep,
        ProjectSolutionStep,
        ProjectMarketStep,
        ProjectTractionStep,
        ProjectCofounderStep
    ];

    useEffect(() => {
        setTotalSteps(steps.length);
    }, [setTotalSteps]);

    const CurrentStepComponent = steps[currentStep] || steps[0];

    return (
        <WizardLayout title="Création de Projet">
            <CurrentStepComponent />
        </WizardLayout>
    );
}

export default function ProjectOnboardingPage() {
    return (
        <OnboardingProvider storageKey="onboarding_project_draft">
            <DashboardShell>
                <ProjectWizardContent />
            </DashboardShell>
        </OnboardingProvider>
    );
}
