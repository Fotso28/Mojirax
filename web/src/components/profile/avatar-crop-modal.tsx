'use client';

import { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { AnimatePresence, motion } from 'framer-motion';
import { getCroppedImage } from '@/utils/crop-image';
import { X, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

interface AvatarCropModalProps {
    open: boolean;
    imageSrc: string;
    onClose: () => void;
    onConfirm: (blob: Blob) => void;
    isUploading: boolean;
}

export function AvatarCropModal({ open, imageSrc, onClose, onConfirm, isUploading }: AvatarCropModalProps) {
    const { t } = useTranslation();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!croppedAreaPixels) return;
        const blob = await getCroppedImage(imageSrc, croppedAreaPixels);
        onConfirm(blob);
    }, [croppedAreaPixels, imageSrc, onConfirm]);

    // Escape to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isUploading) onClose();
        };
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, isUploading, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget && !isUploading) onClose(); }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">{t('dashboard.crop_title')}</h2>
                            <button
                                onClick={onClose}
                                disabled={isUploading}
                                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Crop Area */}
                        <div className="relative w-full aspect-[4/5] bg-gray-900">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={4 / 5}
                                cropShape="rect"
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        {/* Zoom Control */}
                        <div className="flex items-center gap-3 px-6 py-4">
                            <ZoomOut className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-1 accent-kezak-primary"
                            />
                            <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={onClose}
                                disabled={isUploading}
                                className="flex-1 h-[52px] rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                            >
                                {t('dashboard.crop_cancel')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isUploading}
                                className="flex-1 h-[52px] rounded-lg font-semibold text-white bg-kezak-primary hover:bg-kezak-primary/90 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {t('dashboard.crop_uploading')}
                                    </>
                                ) : (
                                    t('dashboard.crop_confirm')
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
