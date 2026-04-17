'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/toast-context';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { Upload, FileText, FileIcon, X, Loader2, CheckCircle2, Sparkles, AlertTriangle, ExternalLink, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTranslation } from '@/context/i18n-context';

const ACCEPTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
    if (type === 'application/pdf') {
        return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <FileIcon className="w-8 h-8 text-blue-500" />;
}

function getFileTypeLabel(type: string) {
    if (type === 'application/pdf') return 'PDF';
    return 'Word';
}

type UploadPhase = 'idle' | 'uploading' | 'analyzing' | 'published' | 'review' | 'failed';

const POLL_INTERVAL = 10000; // 10 seconds

const ANALYSIS_STEP_KEYS = ['upload', 'extraction', 'validation', 'publication'] as const;

export function DocumentUploadStep() {
    const { data, submitForm } = useOnboarding();
    const router = useRouter();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const ANALYSIS_STEPS = ANALYSIS_STEP_KEYS.map((key) => ({
        key,
        label: t(`project.document_step_${key}`),
    }));

    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [phase, setPhase] = useState<UploadPhase>('idle');
    const [projectSlug, setProjectSlug] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [analysisStep, setAnalysisStep] = useState(0); // 0=upload, 1=extraction, 2=validation, 3=publication
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Polling: check project status while analyzing
    useEffect(() => {
        if (phase !== 'analyzing' || !projectId) return;

        // Simulate step progression while waiting
        const stepTimer = setInterval(() => {
            setAnalysisStep((prev) => (prev < 2 ? prev + 1 : prev));
        }, 6000);

        pollRef.current = setInterval(async () => {
            try {
                const { data } = await AXIOS_INSTANCE.get(`/projects/${projectId}`);
                const status = data.status || data.moderationStatus;

                if (status === 'PUBLISHED') {
                    setAnalysisStep(3);
                    // Small delay so the user sees "Publication" step complete
                    setTimeout(() => setPhase('published'), 800);
                } else if (status === 'PENDING_AI') {
                    setPhase('review');
                } else if (status === 'DRAFT') {
                    setPhase('failed');
                }
                // ANALYZING → keep polling
            } catch {
                // Silent — keep polling
            }
        }, POLL_INTERVAL);

        return () => {
            clearInterval(stepTimer);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [phase, projectId]);

    const validateFile = (f: File): string | null => {
        if (!ACCEPTED_TYPES.includes(f.type)) {
            return t('project.document_format_error');
        }
        if (f.size > MAX_FILE_SIZE) {
            return t('project.document_size_error', { size: formatFileSize(MAX_FILE_SIZE) });
        }
        return null;
    };

    const handleFile = useCallback((f: File) => {
        const error = validateFile(f);
        if (error) {
            showToast(error, 'error');
            return;
        }
        setFile(f);
    }, [showToast]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFile(droppedFile);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) handleFile(selectedFile);
        e.target.value = '';
    };

    const removeFile = () => {
        setFile(null);
    };

    const handleSubmit = async () => {
        if (!file) return;

        setPhase('uploading');

        try {
            const formData = new FormData();
            formData.append('file', file);

            formData.append('name', data.name || '');
            formData.append('pitch', data.pitch || '');
            if (data.country) formData.append('country', data.country);
            if (data.city) formData.append('city', data.city);
            if (data.location) formData.append('location', data.location);
            if (data._logoBase64) formData.append('logoBase64', data._logoBase64);

            const { data: result } = await AXIOS_INSTANCE.post('/projects/from-document', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 30000,
            });

            setProjectId(result.id);
            setProjectSlug(result.slug);
            setAnalysisStep(1); // Move to "Extraction"
            setPhase('analyzing');

            await submitForm(async () => {
                // Le projet est créé côté API, on nettoie le brouillon
            });
        } catch (error: any) {
            const message = error?.response?.data?.message || t('project.document_send_error');
            showToast(message, 'error');
            setPhase('idle');
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                    {t('project.document_title')}
                </h1>
                <p className="text-lg text-gray-500">
                    {t('project.document_description')}
                </p>
            </div>

            <div className="py-2">
                <AnimatePresence mode="wait">
                    {phase === 'analyzing' ? (
                        /* Analyse en cours — stepper animé */
                        <motion.div
                            key="analyzing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="rounded-2xl border border-kezak-primary/20 bg-gradient-to-br from-kezak-light/30 to-white p-8"
                        >
                            <div className="text-center mb-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                                    className="mx-auto w-16 h-16 rounded-full bg-kezak-primary/10 flex items-center justify-center mb-4"
                                >
                                    <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">
                                    {t('project.document_analyzing_title')}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {t('project.document_analyzing_desc')}
                                </p>
                            </div>

                            {/* Step progress */}
                            <div className="max-w-sm mx-auto space-y-3">
                                {ANALYSIS_STEPS.map((step, idx) => {
                                    const isDone = idx < analysisStep;
                                    const isCurrent = idx === analysisStep;
                                    return (
                                        <motion.div
                                            key={step.key}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-center gap-3"
                                        >
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                                                isDone
                                                    ? 'bg-emerald-500 text-white'
                                                    : isCurrent
                                                    ? 'bg-kezak-primary text-white'
                                                    : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                {isDone ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : isCurrent ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <span className="text-xs font-bold">{idx + 1}</span>
                                                )}
                                            </div>
                                            <span className={`text-sm font-medium transition-colors duration-300 ${
                                                isDone ? 'text-emerald-600' : isCurrent ? 'text-gray-900' : 'text-gray-400'
                                            }`}>
                                                {step.label}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <p className="text-center text-xs text-gray-400 mt-6">
                                {t('project.document_stay_on_page')}
                            </p>
                        </motion.div>
                    ) : phase === 'published' ? (
                        /* Projet publié — succès */
                        <motion.div
                            key="published"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
                                className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5"
                            >
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {t('project.document_published_title')}
                            </h3>
                            <p className="text-gray-600 max-w-md mx-auto">
                                {t('project.document_published_desc')}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                                {projectSlug && (
                                    <Link
                                        href={`/projects/${projectSlug}`}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-kezak-primary text-white rounded-xl font-semibold text-sm hover:bg-kezak-dark transition-colors shadow-md"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {t('project.document_view_project')}
                                    </Link>
                                )}
                                <Link
                                    href="/my-project"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    {t('project.document_my_projects')}
                                </Link>
                            </div>
                        </motion.div>
                    ) : phase === 'review' ? (
                        /* En attente de revue manuelle */
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                                className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5"
                            >
                                <AlertTriangle className="w-8 h-8 text-amber-600" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {t('project.document_review_title')}
                            </h3>
                            <p className="text-gray-600 max-w-md mx-auto">
                                {t('project.document_review_desc')}
                            </p>
                            <Link
                                href="/my-project"
                                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                {t('project.document_view_projects')}
                            </Link>
                        </motion.div>
                    ) : phase === 'failed' ? (
                        /* Échec */
                        <motion.div
                            key="failed"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                                className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-5"
                            >
                                <X className="w-8 h-8 text-red-600" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {t('project.document_failed_title')}
                            </h3>
                            <p className="text-gray-600 max-w-md mx-auto">
                                {t('project.document_failed_desc')}
                            </p>
                            <button
                                onClick={() => {
                                    setPhase('idle');
                                    setFile(null);
                                    setProjectId(null);
                                    setProjectSlug(null);
                                    setAnalysisStep(0);
                                }}
                                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                {t('project.document_retry')}
                            </button>
                        </motion.div>
                    ) : !file ? (
                        /* Zone de drop */
                        <motion.div
                            key="dropzone"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
                                    isDragging
                                        ? 'border-kezak-primary bg-kezak-light/50 scale-[1.01]'
                                        : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={ACCEPTED_EXTENSIONS}
                                    onChange={handleInputChange}
                                    className="hidden"
                                />

                                <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 ${
                                    isDragging
                                        ? 'bg-kezak-primary text-white'
                                        : 'bg-white text-gray-400 shadow-sm border border-gray-200'
                                }`}>
                                    <Upload className="w-7 h-7" />
                                </div>

                                <p className="text-base font-semibold text-gray-700 mb-1">
                                    {isDragging ? t('project.document_drop_active') : t('project.document_drop_text')}
                                </p>
                                <p className="text-sm text-gray-500 mb-4">
                                    {t('project.document_or')} <span className="text-kezak-primary font-medium">{t('project.document_browse')}</span>
                                </p>

                                <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-red-400" />
                                        PDF
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <FileIcon className="w-3.5 h-3.5 text-blue-400" />
                                        Word (.doc, .docx)
                                    </span>
                                    <span>Max {formatFileSize(MAX_FILE_SIZE)}</span>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* Aper\u00e7u du fichier */
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                                        {getFileIcon(file.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-gray-900 truncate">
                                            {file.name}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {getFileTypeLabel(file.type)}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {formatFileSize(file.size)}
                                            </span>
                                        </div>
                                    </div>
                                    {phase === 'idle' && (
                                        <button
                                            onClick={removeFile}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {phase === 'uploading' && (
                                    <div className="mt-5 flex items-center gap-3">
                                        <Loader2 className="w-4 h-4 animate-spin text-kezak-primary" />
                                        <span className="text-sm font-medium text-kezak-primary">
                                            {t('project.document_uploading')}
                                        </span>
                                    </div>
                                )}

                                {phase === 'idle' && (
                                    <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>{t('project.document_file_ready')}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bouton de soumission */}
            {(phase === 'idle' || phase === 'uploading') && (
                <div className="pt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={!file || phase === 'uploading'}
                        className="group flex items-center gap-2 bg-kezak-primary text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-kezak-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-kezak-primary/30"
                    >
                        {phase === 'uploading' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('project.document_submit_uploading')}
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                {t('project.document_submit')}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
