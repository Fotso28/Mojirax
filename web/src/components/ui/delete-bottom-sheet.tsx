'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';

export interface DeleteBottomSheetProps {
    open: boolean;
    projectName: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteBottomSheet({
    open,
    projectName,
    loading = false,
    onConfirm,
    onCancel,
}: DeleteBottomSheetProps) {
    const [confirmText, setConfirmText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const isConfirmed = confirmText === projectName;

    // Reset input when sheet opens/closes
    useEffect(() => {
        if (open) {
            setConfirmText('');
            // Focus input after animation
            const timer = setTimeout(() => inputRef.current?.focus(), 350);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Lock body scroll when open
    useEffect(() => {
        if (open) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [open]);

    // Close on Escape
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) {
                onCancel();
            }
        },
        [onCancel, loading]
    );

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [open, handleKeyDown]);

    // Click overlay to dismiss
    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === overlayRef.current && !loading) {
                onCancel();
            }
        },
        [onCancel, loading]
    );

    const consequences = [
        'Le projet et toutes ses informations',
        'Les candidatures reçues',
        'Les statistiques et interactions',
    ];

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Overlay */}
                    <motion.div
                        ref={overlayRef}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        onClick={handleOverlayClick}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, duration: 0.3 }}
                        className="fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto"
                    >
                        <div className="bg-white rounded-t-3xl shadow-2xl p-6 pb-8">
                            {/* Drag handle */}
                            <div className="flex justify-center mb-6">
                                <div className="w-10 h-1 rounded-full bg-gray-300" />
                            </div>

                            {/* Icon */}
                            <div className="flex justify-center mb-4">
                                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                                Supprimer ce projet
                            </h2>

                            {/* Warning message */}
                            <p className="text-sm text-gray-500 text-center mb-4">
                                Cette action est irréversible. Toutes les données associées seront
                                supprimées :
                            </p>

                            {/* Consequences list */}
                            <ul className="space-y-2 mb-6">
                                {consequences.map((item) => (
                                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            {/* Confirmation input */}
                            <div className="space-y-1.5 mb-6">
                                <label
                                    htmlFor="delete-confirm-input"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Tapez &quot;{projectName}&quot; pour confirmer
                                </label>
                                <input
                                    ref={inputRef}
                                    id="delete-confirm-input"
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder={projectName}
                                    disabled={loading}
                                    className="w-full h-[52px] px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base
                                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500
                                        placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed
                                        hover:border-gray-400"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={loading}
                                    className="flex-1 h-[52px] rounded-lg border border-gray-200 text-gray-700 font-semibold
                                        hover:bg-gray-50 transition-colors duration-200
                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={onConfirm}
                                    disabled={!isConfirmed || loading}
                                    className="flex-1 h-[52px] rounded-lg bg-red-600 text-white font-semibold
                                        hover:bg-red-700 transition-colors duration-200
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Suppression...
                                        </>
                                    ) : (
                                        'Supprimer définitivement'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
