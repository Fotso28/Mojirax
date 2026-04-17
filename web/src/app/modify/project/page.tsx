'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { OnboardingProvider, useOnboarding } from '@/context/onboarding-context';
import { WizardLayout } from '@/components/onboarding/wizard/wizard-layout';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { SidebarProvider } from '@/context/sidebar-context';
import { Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

// Steps (same as create wizard)
import { ProjectIdentityStep } from '@/app/create/project/steps/identity';
import { ProjectDetailsStep } from '@/app/create/project/steps/details';
import { ProjectProblemStep } from '@/app/create/project/steps/problem';
import { ProjectSolutionStep } from '@/app/create/project/steps/solution';
import { ProjectMarketStep } from '@/app/create/project/steps/market';
import { ProjectTractionStep } from '@/app/create/project/steps/traction';
import { ProjectCofounderStep } from '@/app/create/project/steps/cofounder';
import { AiReviewStep } from '@/app/create/project/steps/ai-review';

/**
 * Maps camelCase API response fields to the snake_case keys expected by the wizard.
 */
function mapProjectToWizardData(project: Record<string, any>): Record<string, any> {
    return {
        // Fields that need camelCase → snake_case mapping
        solution_current: project.solutionCurrent,
        solution_desc: project.solutionDesc,
        anti_scope: project.antiScope,
        market_type: project.marketType,
        business_model: project.businessModel,
        founder_role: project.founderRole,
        time_availability: project.timeAvailability,
        looking_for_role: project.lookingForRole,
        collab_type: project.collabType,
        _logoBase64: project.logoUrl,

        // Fields that keep their name as-is
        name: project.name,
        pitch: project.pitch,
        country: project.country,
        city: project.city,
        location: project.location,
        scope: project.scope,
        sector: project.sector,
        stage: project.stage,
        problem: project.problem,
        target: project.target,
        uvp: project.uvp,
        traction: project.traction,
        vision: project.vision,
        description: project.description,
        requiredSkills: project.requiredSkills,
        competitors: project.competitors,

        // Force form mode so the wizard shows all form steps
        creation_method: 'form',
    };
}

function ModifyWizardContent() {
    const { currentStep, setTotalSteps } = useOnboarding();
    const { t } = useTranslation();

    // En mode édition, on skip l'étape choix de méthode (formulaire vs document)
    // et on va directement sur les steps de contenu
    const steps = useMemo(() => [
        ProjectIdentityStep,
        ProjectDetailsStep,
        ProjectProblemStep,
        ProjectSolutionStep,
        ProjectMarketStep,
        ProjectTractionStep,
        ProjectCofounderStep,
        AiReviewStep,
    ], []);

    useEffect(() => {
        setTotalSteps(steps.length);
    }, [setTotalSteps, steps.length]);

    const CurrentStepComponent = steps[currentStep] || steps[0];

    return (
        <WizardLayout title={t('project.modify_wizard_title')}>
            <CurrentStepComponent />
        </WizardLayout>
    );
}

function ModifyProjectLoader() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const projectId = searchParams.get('projectId');
    const { t } = useTranslation();

    const [projectData, setProjectData] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            setError(t('project.modify_no_id'));
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function fetchProject() {
            try {
                const { data } = await AXIOS_INSTANCE.get(`/projects/${projectId}`);
                if (cancelled) return;
                const mapped = mapProjectToWizardData(data);
                setProjectData(mapped);
            } catch (err: any) {
                if (cancelled) return;
                if (err?.response?.status === 404) {
                    setError(t('project.modify_not_found'));
                } else {
                    setError(t('project.modify_load_error'));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchProject();

        return () => {
            cancelled = true;
        };
    }, [projectId]);

    if (loading) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
                </div>
            </DashboardShell>
        );
    }

    if (error || !projectData || !projectId) {
        return (
            <DashboardShell>
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                    <p className="text-gray-600 text-lg">{error || t('project.modify_generic_error')}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-kezak-primary text-white rounded-lg hover:bg-kezak-primary/80 transition"
                    >
                        {t('project.modify_back')}
                    </button>
                </div>
            </DashboardShell>
        );
    }

    return (
        <OnboardingProvider
            storageKey={`modify_project_${projectId}`}
            initialData={projectData}
            editProjectId={projectId}
        >
            <DashboardShell>
                <ModifyWizardContent />
            </DashboardShell>
        </OnboardingProvider>
    );
}

export default function ModifyProjectPage() {
    return (
        <SidebarProvider>
            <Suspense
                fallback={
                    <DashboardShell>
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
                        </div>
                    </DashboardShell>
                }
            >
                <ModifyProjectLoader />
            </Suspense>
        </SidebarProvider>
    );
}
