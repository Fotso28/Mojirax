'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION_MS: Record<ToastType, number> = {
    success: 3500,
    warning: 5000,
    error: 5000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextIdRef = useRef(0);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = ++nextIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, TOAST_DURATION_MS[type]);
    }, []);

    // Bridge for non-React contexts (e.g. axios interceptor) to trigger toasts
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ message: string; type?: ToastType }>).detail;
            if (detail?.message) showToast(detail.message, detail.type ?? 'error');
        };
        window.addEventListener('app:toast', handler);
        return () => window.removeEventListener('app:toast', handler);
    }, [showToast]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border backdrop-blur-md ${
                                toast.type === 'success'
                                    ? 'bg-white/95 border-green-200 text-gray-900'
                                    : toast.type === 'warning'
                                    ? 'bg-white/95 border-amber-200 text-gray-900'
                                    : 'bg-white/95 border-red-200 text-gray-900'
                            }`}
                        >
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            ) : toast.type === 'warning' ? (
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            )}
                            <span className="text-sm font-medium">{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="ms-1 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
