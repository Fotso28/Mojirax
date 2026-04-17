'use client';

import { OnboardingProvider, useOnboarding } from '@/context/onboarding-context';
import { WizardLayout } from '@/components/onboarding/wizard/wizard-layout';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/i18n-context';
import { useAuth } from '@/context/auth-context';
import { useUpsell } from '@/context/upsell-context';

// Steps
import { ProjectIdentityStep } from './steps/identity';
import { ProjectMethodChoiceStep } from './steps/method-choice';
import { DocumentUploadStep } from './steps/document-upload';
import { ProjectDetailsStep } from './steps/details';
import { ProjectProblemStep } from './steps/problem';
import { ProjectSolutionStep } from './steps/solution';
import { ProjectMarketStep } from './steps/market';
import { ProjectTractionStep } from './steps/traction';
import { ProjectCofounderStep } from './steps/cofounder';
import { AiReviewStep } from './steps/ai-review';

function ProjectWizardContent() {
    const { currentStep, setTotalSteps, data } = useOnboarding();
    const { t } = useTranslation();

    // Déterminer les steps selon la méthode choisie
    const steps = useMemo(() => {
        const baseSteps = [
            ProjectIdentityStep,    // Step 0 : Nom, logo, pitch
            ProjectMethodChoiceStep, // Step 1 : Choix formulaire ou document
        ];

        if (data.creation_method === 'document') {
            // Parcours document : upload + IA
            return [...baseSteps, DocumentUploadStep];
        }

        // Parcours formulaire classique (par défaut)
        return [
            ...baseSteps,
            ProjectDetailsStep,     // Step 2
            ProjectProblemStep,     // Step 3
            ProjectSolutionStep,    // Step 4
            ProjectMarketStep,      // Step 5
            ProjectTractionStep,    // Step 6
            ProjectCofounderStep,   // Step 7
            AiReviewStep,           // Step 8 : Revue IA avant publication
        ];
    }, [data.creation_method]);

    useEffect(() => {
        setTotalSteps(steps.length);
    }, [setTotalSteps, steps.length]);

    const CurrentStepComponent = steps[currentStep] || steps[0];

    return (
        <WizardLayout title={t('project.wizard_title')}>
            <CurrentStepComponent />
        </WizardLayout>
    );
}

export default function ProjectOnboardingPage() {
    const { dbUser, loading } = useAuth();
    const { openUpsell } = useUpsell();
    const router = useRouter();
    const isFreeUser = !dbUser?.plan || dbUser.plan === 'FREE';

    useEffect(() => {
        if (!loading && dbUser && isFreeUser) {
            openUpsell('create_project');
            router.replace('/my-project');
        }
    }, [loading, dbUser, isFreeUser, openUpsell, router]);

    if (loading || isFreeUser) {
        return <DashboardShell><div /></DashboardShell>;
    }

    return (
        <OnboardingProvider storageKey="onboarding_project_draft">
            <DashboardShell>
                <ProjectWizardContent />
            </DashboardShell>
        </OnboardingProvider>
    );
}
