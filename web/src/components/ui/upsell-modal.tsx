'use client';

import { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Sparkles, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/i18n-context';

export type UpsellFeature = 'apply' | 'create_project' | 'send_message' | 'generic';

interface UpsellModalProps {
    feature: UpsellFeature | null;
    onClose: () => void;
}

const FEATURE_COPY: Record<UpsellFeature, { titleKey: string; subtitleKey: string }> = {
    apply: {
        titleKey: 'common.upsell.apply.title',
        subtitleKey: 'common.upsell.apply.subtitle',
    },
    create_project: {
        titleKey: 'common.upsell.create_project.title',
        subtitleKey: 'common.upsell.create_project.subtitle',
    },
    send_message: {
        titleKey: 'common.upsell.send_message.title',
        subtitleKey: 'common.upsell.send_message.subtitle',
    },
    generic: {
        titleKey: 'common.upsell.generic.title',
        subtitleKey: 'common.upsell.generic.subtitle',
    },
};

export function UpsellModal({ feature, onClose }: UpsellModalProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (feature) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [feature, handleKeyDown]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleUpgrade = () => {
        onClose();
        router.push('/settings/billing');
    };

    const copy = feature ? FEATURE_COPY[feature] : null;

    // Order benefits so the one the user just tried to use shows first.
    // Visibility is always last (secondary value prop, no specific trigger).
    const BENEFITS_BY_TRIGGER: Record<UpsellFeature, (keyof typeof BENEFIT_KEYS)[]> = {
        apply:          ['apply', 'send_message', 'create_project', 'visibility'],
        send_message:   ['send_message', 'apply', 'create_project', 'visibility'],
        create_project: ['create_project', 'apply', 'send_message', 'visibility'],
        generic:        ['apply', 'create_project', 'send_message', 'visibility'],
    };
    const BENEFIT_KEYS = {
        apply: 'common.upsell.benefits.apply',
        create_project: 'common.upsell.benefits.create_project',
        send_message: 'common.upsell.benefits.send_message',
        visibility: 'common.upsell.benefits.visibility',
    } as const;

    const benefits = feature
        ? BENEFITS_BY_TRIGGER[feature].map((k) => t(BENEFIT_KEYS[k]))
        : [];

    return (
        <AnimatePresence>
            {feature && copy && (
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
                        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                    >
                        {/* Close button — sits on the gradient header, needs white text */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 end-4 z-10 p-2 rounded-full text-white/70 hover:bg-white/15 hover:text-white transition-colors"
                            aria-label={t('common.upsell.close')}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header with gradient */}
                        <div className="bg-gradient-to-br from-kezak-primary to-kezak-dark px-6 pt-8 pb-6 text-white">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold mb-1">{t(copy.titleKey)}</h2>
                            <p className="text-sm text-white/90">{t(copy.subtitleKey)}</p>
                        </div>

                        {/* Benefits */}
                        <div className="px-6 py-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-kezak-primary" />
                                <h3 className="text-sm font-semibold text-gray-900">
                                    {t('common.upsell.benefits_title')}
                                </h3>
                            </div>
                            <ul className="space-y-2">
                                {benefits.map((benefit, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                        <Check className="w-4 h-4 text-kezak-primary flex-shrink-0 mt-0.5" />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6 pt-2 flex flex-col gap-2">
                            <button
                                onClick={handleUpgrade}
                                className="w-full h-[52px] rounded-lg font-semibold text-white bg-kezak-primary hover:bg-kezak-dark shadow-lg shadow-kezak-primary/30 hover:shadow-kezak-primary/40 transition-all"
                            >
                                {t('common.upsell.cta_upgrade')}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full h-[44px] rounded-lg font-medium text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                            >
                                {t('common.upsell.cta_later')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
