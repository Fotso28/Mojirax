'use client';

import { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { AnimatePresence, motion } from 'framer-motion';
import { processImage, type ProcessedImage, type ImageProcessingOptions } from '@/utils/image-processing';
import { X, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export interface ImageCropModalProps {
    open: boolean;
    imageSrc: string;
    onClose: () => void;
    onConfirm: (result: ProcessedImage) => void;
    isProcessing: boolean;

    // Configuration
    aspect: number;
    title?: string;
    confirmLabel?: string;
    cropShape?: 'rect' | 'round';

    // Options de traitement
    outputWidth?: number;
    outputHeight?: number;
    quality?: number;
    maxFileSizeKb?: number;
}

export function ImageCropModal({
    open,
    imageSrc,
    onClose,
    onConfirm,
    isProcessing,
    aspect,
    title = "Recadrer l'image",
    confirmLabel = 'Valider',
    cropShape = 'rect',
    outputWidth = 512,
    outputHeight,
    quality = 0.80,
    maxFileSizeKb = 500,
}: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isCropping, setIsCropping] = useState(false);

    const finalHeight = outputHeight ?? Math.round(outputWidth / aspect);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!croppedAreaPixels) return;
        setIsCropping(true);
        try {
            const options: ImageProcessingOptions = {
                cropArea: croppedAreaPixels,
                outputWidth,
                outputHeight: finalHeight,
                quality,
                maxFileSizeKb,
            };
            const result = await processImage(imageSrc, options);
            onConfirm(result);
        } catch (err) {
            logger.error('Crop failed:', err);
        } finally {
            setIsCropping(false);
        }
    }, [croppedAreaPixels, imageSrc, onConfirm, outputWidth, finalHeight, quality, maxFileSizeKb]);

    // Reset state quand la modal s'ouvre
    useEffect(() => {
        if (open) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
        }
    }, [open]);

    // Escape to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isProcessing && !isCropping) onClose();
        };
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, isProcessing, isCropping, onClose]);

    const busy = isProcessing || isCropping;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
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
                            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                            <button
                                onClick={onClose}
                                disabled={busy}
                                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Crop Area */}
                        <div
                            className="relative w-full bg-gray-900"
                            style={{ aspectRatio: `${aspect}` }}
                        >
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspect}
                                cropShape={cropShape}
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
                                disabled={busy}
                                className="flex-1 h-[52px] rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={busy}
                                className="flex-1 h-[52px] rounded-lg font-semibold text-white bg-kezak-primary hover:bg-kezak-primary/90 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {busy ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {isCropping ? 'Traitement...' : 'Envoi...'}
                                    </>
                                ) : (
                                    confirmLabel
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
