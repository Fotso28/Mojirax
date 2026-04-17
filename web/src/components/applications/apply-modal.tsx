'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Send } from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';
import { useTranslation } from '@/context/i18n-context';

interface ApplyModalProps {
    projectId: string;
    projectName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onIncompleteProfile?: (missingFields: string[]) => void;
}

const MAX_MESSAGE_LENGTH = 1000;

export function ApplyModal({ projectId, projectName, isOpen, onClose, onSuccess, onIncompleteProfile }: ApplyModalProps) {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await AXIOS_INSTANCE.post('/applications', {
                projectId,
                message: message.trim() || undefined,
            });
            showToast(t('project.apply_modal.success'), 'success');
            onSuccess();
            onClose();
            setMessage('');
        } catch (err: any) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            if (status === 409) {
                showToast(t('project.apply_modal.already_applied'), 'error');
            } else if (status === 400 && data?.code === 'INCOMPLETE_PROFILE') {
                onClose();
                onIncompleteProfile?.(data.missingFields || []);
            } else if (status === 403) {
                showToast(data?.message || t('project.apply_modal.unauthorized'), 'error');
            } else if (status === 400) {
                showToast(data?.message || t('project.apply_modal.invalid_data'), 'error');
            } else if (status === 404) {
                showToast(t('project.apply_modal.not_found'), 'error');
            } else {
                showToast(err?.message || t('project.apply_modal.generic_error'), 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    ref={overlayRef}
                    onClick={handleOverlayClick}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-2">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{t('project.apply_modal.title')}</h2>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {projectName}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label
                                    htmlFor="apply-message"
                                    className="block text-sm font-medium text-gray-700 mb-1.5"
                                >
                                    {t('project.apply_modal.message_label')}
                                </label>
                                <textarea
                                    id="apply-message"
                                    value={message}
                                    onChange={(e) => {
                                        if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                                            setMessage(e.target.value);
                                        }
                                    }}
                                    placeholder={t('project.apply_modal.message_placeholder')}
                                    rows={5}
                                    className="w-full bg-white border border-gray-300 hover:border-gray-400 rounded-lg text-gray-900 text-base p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary placeholder:text-gray-400 resize-y"
                                />
                                <div className="flex justify-end mt-1">
                                    <span
                                        className={`text-xs ${
                                            message.length > MAX_MESSAGE_LENGTH * 0.9
                                                ? 'text-amber-600'
                                                : 'text-gray-400'
                                        }`}
                                    >
                                        {message.length}/{MAX_MESSAGE_LENGTH}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 px-5 h-[44px] rounded-lg font-semibold text-sm text-gray-600 bg-white border-2 border-gray-200 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                            >
                                {t('project.apply_modal.cancel')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 px-6 h-[44px] rounded-lg font-semibold text-sm text-white bg-kezak-primary hover:bg-kezak-dark shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <span className="w-4 h-4 inline-flex items-center justify-center">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </span>
                                <span>{t('project.apply_modal.submit')}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
