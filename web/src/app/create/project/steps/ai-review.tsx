'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/toast-context';
import { useAuth } from '@/context/auth-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import {
    Loader2, CheckCircle2, AlertTriangle, XCircle,
    Sparkles, ArrowRight, RotateCcw, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/context/i18n-context';

interface FieldFeedback {
    field: string;
    status: 'good' | 'warning' | 'error';
    message: string;
}

interface ValidationResult {
    score: number;
    summary: string;
    suggestions: FieldFeedback[];
    strengths: string[];
}

const FIELD_LABEL_KEYS: Record<string, string> = {
    name: 'project.field_name',
    pitch: 'project.field_pitch',
    problem: 'project.field_problem',
    target: 'project.field_target',
    solution_current: 'project.field_solution_current',
    solution_desc: 'project.field_solution_desc',
    uvp: 'project.field_uvp',
    anti_scope: 'project.field_anti_scope',
    sector: 'project.field_sector',
    stage: 'project.field_stage',
    scope: 'project.field_scope',
    market_type: 'project.field_market_type',
    business_model: 'project.field_business_model',
    competitors: 'project.field_competitors',
    founder_role: 'project.field_founder_role',
    time_availability: 'project.field_time_availability',
    traction: 'project.field_traction',
    looking_for_role: 'project.field_looking_for_role',
    collab_type: 'project.field_collab_type',
    vision: 'project.field_vision',
};

function getStatusIcon(status: string) {
    switch (status) {
        case 'good': return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
        case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
        case 'error': return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
        default: return null;
    }
}

function getStatusBg(status: string) {
    switch (status) {
        case 'good': return 'bg-green-50 border-green-100';
        case 'warning': return 'bg-amber-50 border-amber-100';
        case 'error': return 'bg-red-50 border-red-100';
        default: return 'bg-gray-50 border-gray-100';
    }
}

function ScoreGauge({ score }: { score: number }) {
    const color = score >= 75 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
    const bgColor = score >= 75 ? 'stroke-green-500' : score >= 50 ? 'stroke-amber-500' : 'stroke-red-500';
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative w-32 h-32 mx-auto">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <motion.circle
                    cx="50" cy="50" r="45" fill="none"
                    className={bgColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className={`text-3xl font-bold ${color}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {score}
                </motion.span>
                <span className="text-xs text-gray-400 font-medium">/100</span>
            </div>
        </div>
    );
}

export function AiReviewStep() {
    const { data, submitForm, editProjectId } = useOnboarding();
    const isEditMode = !!editProjectId;
    const router = useRouter();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const { dbUser } = useAuth();
    const hasPublished = !isEditMode && (dbUser?.projects ?? []).some((p: any) => p.status === 'PUBLISHED');

    const runValidation = useCallback(async () => {
        // Cancel any in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsValidating(true);
        setError(null);
        try {
            // Only send whitelisted fields (exclude internal _logo*, creation_method, etc.)
            const ALLOWED_FIELDS = [
                'name', 'pitch', 'country', 'city', 'location', 'scope', 'sector', 'stage',
                'problem', 'target', 'solution_current', 'solution_desc', 'uvp', 'anti_scope',
                'market_type', 'business_model', 'competitors', 'founder_role', 'time_availability',
                'traction', 'looking_for_role', 'collab_type', 'vision', 'description', 'requiredSkills',
            ];
            const filteredData: Record<string, any> = {};
            for (const key of ALLOWED_FIELDS) {
                if (data[key] !== undefined && data[key] !== '') {
                    filteredData[key] = data[key];
                }
            }
            const { data: result } = await AXIOS_INSTANCE.post('/projects/validate', filteredData, {
                timeout: 60000,
                signal: controller.signal,
            });
            if (!controller.signal.aborted) {
                setValidation(result);
            }
        } catch (err: any) {
            if (controller.signal.aborted) return; // Ignore cancelled requests
            const msg = err?.response?.data?.message || t('project.ai_review_analysis_error');
            setError(msg);
        } finally {
            if (!controller.signal.aborted) {
                setIsValidating(false);
            }
        }
    }, [data]);

    useEffect(() => {
        runValidation();
        return () => {
            abortRef.current?.abort();
        };
    }, [runValidation]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await submitForm(async (formData) => {
                // Only send fields declared in CreateProjectDto (whitelist)
                const ALLOWED_FIELDS = [
                    'name', 'pitch', 'country', 'city', 'location', 'scope', 'sector', 'stage',
                    'problem', 'target', 'solution_current', 'solution_desc', 'uvp', 'anti_scope',
                    'market_type', 'business_model', 'competitors', 'founder_role', 'time_availability',
                    'traction', 'looking_for_role', 'collab_type', 'vision', 'description', 'requiredSkills',
                ];
                const projectData: Record<string, any> = {};
                for (const key of ALLOWED_FIELDS) {
                    if (formData[key] !== undefined && formData[key] !== '') {
                        projectData[key] = formData[key];
                    }
                }
                if (isEditMode) {
                    await AXIOS_INSTANCE.patch(`/projects/${editProjectId}`, projectData);

                    // Upload logo if a new base64 image was selected
                    if (formData._logoBase64 && typeof formData._logoBase64 === 'string' && formData._logoBase64.startsWith('data:')) {
                        try {
                            const blob = await fetch(formData._logoBase64).then(r => r.blob());
                            const logoForm = new FormData();
                            logoForm.append('file', blob, 'logo.png');
                            await AXIOS_INSTANCE.post(`/projects/${editProjectId}/logo`, logoForm);
                        } catch {
                            showToast(t('project.ai_review_logo_error'), 'warning');
                        }
                    }
                } else {
                    const created = await AXIOS_INSTANCE.post('/projects', projectData);

                    // Upload logo separately if one was selected
                    if (formData._logoBase64 && created.data?.id) {
                        try {
                            const blob = await fetch(formData._logoBase64).then(r => r.blob());
                            const logoForm = new FormData();
                            logoForm.append('file', blob, 'logo.png');
                            await AXIOS_INSTANCE.post(`/projects/${created.data.id}/logo`, logoForm);
                        } catch {
                            showToast(t('project.ai_review_logo_error'), 'warning');
                        }
                    }
                }
            });
            showToast(isEditMode ? t('project.ai_review_update_success') : t('project.ai_review_create_success'), 'success');
            setTimeout(() => router.push(isEditMode ? '/my-project' : '/'), 500);
        } catch {
            showToast(isEditMode ? t('project.ai_review_update_error') : t('project.ai_review_create_error'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    {isEditMode ? t('project.ai_review_title_edit') : t('project.ai_review_title')}
                </h1>
                <p className="text-lg text-gray-500">
                    {isEditMode ? t('project.ai_review_description_edit') : t('project.ai_review_description')}
                </p>
                {hasPublished && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-700">
                            {t('project.ai_review_archive_warning')}
                        </p>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {isValidating ? (
                    /* Loading */
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-16 space-y-4"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-kezak-light flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-kezak-primary animate-pulse" />
                            </div>
                        </div>
                        <p className="text-base font-semibold text-gray-700">{t('project.ai_review_analyzing')}</p>
                        <p className="text-sm text-gray-400">{t('project.ai_review_analyzing_desc')}</p>
                        <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-kezak-primary rounded-full"
                                initial={{ width: '0%' }}
                                animate={{ width: '90%' }}
                                transition={{ duration: 15, ease: 'easeOut' }}
                            />
                        </div>
                    </motion.div>
                ) : error ? (
                    /* Error */
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center space-y-4"
                    >
                        <XCircle className="w-10 h-10 text-red-400 mx-auto" />
                        <p className="text-base font-semibold text-gray-900">{t('project.ai_review_unavailable')}</p>
                        <p className="text-sm text-gray-500">{error}</p>
                        <div className="flex justify-center gap-3 pt-2">
                            <button
                                onClick={runValidation}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                <RotateCcw className="w-4 h-4" />
                                {t('project.ai_review_retry')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-kezak-primary text-white text-sm font-semibold hover:bg-kezak-dark transition-all disabled:opacity-50"
                            >
                                {t('project.ai_review_publish_without')}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ) : validation ? (
                    /* Results */
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Score + Summary */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <ScoreGauge score={validation.score} />
                                <div className="flex-1 text-center sm:text-left">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                                        {validation.score >= 75 ? t('project.ai_review_score_excellent') :
                                         validation.score >= 50 ? t('project.ai_review_score_good') :
                                         t('project.ai_review_score_weak')}
                                    </h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        {validation.summary}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Points forts */}
                        {validation.strengths.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                    <h3 className="text-base font-bold text-gray-900">{t('project.ai_review_strengths')}</h3>
                                </div>
                                <ul className="space-y-2">
                                    {validation.strengths.map((strength, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            {strength}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Suggestions */}
                        {validation.suggestions.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-kezak-primary" />
                                    <h3 className="text-base font-bold text-gray-900">{t('project.ai_review_suggestions')}</h3>
                                </div>
                                <div className="space-y-3">
                                    {validation.suggestions.map((suggestion, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-start gap-3 p-3 rounded-xl border ${getStatusBg(suggestion.status)}`}
                                        >
                                            {getStatusIcon(suggestion.status)}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                    {FIELD_LABEL_KEYS[suggestion.field] ? t(FIELD_LABEL_KEYS[suggestion.field]) : suggestion.field}
                                                </span>
                                                <p className="text-sm text-gray-700 mt-0.5">
                                                    {suggestion.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : null}
            </AnimatePresence>

            {/* Actions */}
            {!isValidating && !error && validation && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3"
                >
                    <button
                        onClick={runValidation}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                        <RotateCcw className="w-4 h-4" />
                        {t('project.ai_review_reanalyze')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="group flex items-center gap-2 bg-kezak-primary text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-kezak-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-kezak-primary/30"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {isEditMode ? t('project.ai_review_updating') : t('project.ai_review_publishing')}
                            </>
                        ) : (
                            <>
                                {isEditMode ? t('project.ai_review_update') : t('project.ai_review_publish')}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    {hasPublished && (
                        <p className="text-xs text-amber-600 text-center sm:text-right w-full">
                            {t('project.ai_review_archive_note')}
                        </p>
                    )}
                </motion.div>
            )}
        </div>
    );
}
