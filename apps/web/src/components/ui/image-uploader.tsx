'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { ImageCropModal } from './image-crop-modal';
import {
    IMAGE_PRESETS,
    type ImagePresetKey,
    type ProcessedImage,
} from '@/utils/image-processing';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

export interface ImageUploaderProps {
    // Preset OU config manuelle
    preset?: ImagePresetKey;
    aspect?: number;
    outputWidth?: number;
    outputHeight?: number;
    quality?: number;
    maxFileSizeKb?: number;
    cropTitle?: string;
    cropShape?: 'rect' | 'round';

    // Upload
    uploadEndpoint: string;
    fieldName?: string;

    // État
    currentImageUrl?: string | null;
    onUploadComplete: (url: string) => void;
    onError?: (error: string) => void;

    // Apparence
    variant?: 'avatar' | 'logo';
    size?: 'sm' | 'md' | 'lg';
    placeholder?: string;
    className?: string;

    // Mode local (retourne le blob au lieu d'uploader)
    localMode?: boolean;
    onLocalResult?: (result: ProcessedImage) => void;
}

const SIZE_MAP = {
    sm: { container: 'w-16 h-16', icon: 'w-4 h-4', text: 'text-xs' },
    md: { container: 'w-24 h-24', icon: 'w-5 h-5', text: 'text-xs' },
    lg: { container: 'w-32 h-32', icon: 'w-6 h-6', text: 'text-sm' },
};

export function ImageUploader({
    preset,
    aspect: aspectProp,
    outputWidth: widthProp,
    outputHeight: heightProp,
    quality: qualityProp,
    maxFileSizeKb: maxSizeProp,
    cropTitle: titleProp,
    cropShape: shapeProp,
    uploadEndpoint,
    fieldName = 'file',
    currentImageUrl,
    onUploadComplete,
    onError,
    variant = 'avatar',
    size = 'lg',
    placeholder,
    className = '',
    localMode = false,
    onLocalResult,
}: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageSrcForCrop, setImageSrcForCrop] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Résoudre la config : preset > props > defaults
    const presetConfig = preset ? IMAGE_PRESETS[preset] : null;
    const aspect = aspectProp ?? presetConfig?.aspect ?? 1;
    const outputWidth = widthProp ?? presetConfig?.outputWidth ?? 400;
    const outputHeight = heightProp ?? presetConfig?.outputHeight ?? Math.round(outputWidth / aspect);
    const quality = qualityProp ?? presetConfig?.quality ?? 0.80;
    const maxFileSizeKb = maxSizeProp ?? presetConfig?.maxFileSizeKb ?? 500;
    const cropTitle = titleProp ?? presetConfig?.title ?? "Recadrer l'image";
    const cropShape = shapeProp ?? presetConfig?.cropShape ?? 'rect';

    const sizeStyles = SIZE_MAP[size];

    const validateAndOpen = useCallback((file: File) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            onError?.('Format non supporté. Utilisez JPG, PNG ou WebP.');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            onError?.('Fichier trop volumineux. Maximum 5 Mo.');
            return;
        }
        const url = URL.createObjectURL(file);
        setImageSrcForCrop(url);
        setCropModalOpen(true);
    }, [onError]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) validateAndOpen(file);
        e.target.value = '';
    }, [validateAndOpen]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) validateAndOpen(file);
    }, [validateAndOpen]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleCropConfirm = useCallback(async (result: ProcessedImage) => {
        if (localMode) {
            onLocalResult?.(result);
            setCropModalOpen(false);
            if (imageSrcForCrop) URL.revokeObjectURL(imageSrcForCrop);
            setImageSrcForCrop('');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            const ext = result.blob.type === 'image/webp' ? 'webp' : 'jpg';
            formData.append(fieldName, result.blob, `image.${ext}`);

            const { data } = await AXIOS_INSTANCE.post(uploadEndpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // L'API peut retourner l'objet complet ou juste l'URL
            const url = typeof data === 'string' ? data : (data.image ?? data.logoUrl ?? data.url);
            onUploadComplete(url ?? data);

            setCropModalOpen(false);
            if (imageSrcForCrop) URL.revokeObjectURL(imageSrcForCrop);
            setImageSrcForCrop('');
        } catch {
            onError?.("Erreur lors de l'envoi de la photo");
        } finally {
            setIsUploading(false);
        }
    }, [localMode, onLocalResult, uploadEndpoint, fieldName, onUploadComplete, onError, imageSrcForCrop]);

    const handleCropClose = useCallback(() => {
        if (!isUploading) {
            setCropModalOpen(false);
            if (imageSrcForCrop) {
                URL.revokeObjectURL(imageSrcForCrop);
                setImageSrcForCrop('');
            }
        }
    }, [isUploading, imageSrcForCrop]);

    // ─── Rendu variante Avatar ───
    if (variant === 'avatar') {
        return (
            <>
                <div
                    className={`relative group ${className}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`${sizeStyles.container} rounded-full border-4 shadow-md overflow-hidden bg-gray-100 flex items-center justify-center relative cursor-pointer transition-all duration-200 ${
                            isDragging
                                ? 'border-kezak-primary ring-4 ring-kezak-primary/20'
                                : 'border-white hover:border-kezak-primary/30'
                        }`}
                    >
                        {currentImageUrl ? (
                            <Image
                                src={currentImageUrl}
                                alt="Avatar"
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                                unoptimized={currentImageUrl.includes('localhost')}
                            />
                        ) : (
                            <span className="text-3xl font-bold text-gray-300">
                                {placeholder?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        )}

                        {/* Hover Overlay */}
                        <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity duration-200 ${
                            isUploading
                                ? 'opacity-100 bg-black/40'
                                : 'opacity-0 group-hover:opacity-100 bg-black/30'
                        }`}>
                            {isUploading ? (
                                <Loader2 className={`${sizeStyles.icon} text-white animate-spin`} />
                            ) : (
                                <Camera className={`${sizeStyles.icon} text-white`} />
                            )}
                        </div>
                    </button>

                    {!currentImageUrl && !isUploading && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-kezak-primary hover:underline"
                        >
                            {placeholder || 'Ajouter une photo'}
                        </button>
                    )}
                </div>

                <ImageCropModal
                    open={cropModalOpen}
                    imageSrc={imageSrcForCrop}
                    onClose={handleCropClose}
                    onConfirm={handleCropConfirm}
                    isProcessing={isUploading}
                    aspect={aspect}
                    title={cropTitle}
                    cropShape={cropShape}
                    outputWidth={outputWidth}
                    outputHeight={outputHeight}
                    quality={quality}
                    maxFileSizeKb={maxFileSizeKb}
                />
            </>
        );
    }

    // ─── Rendu variante Logo ───
    return (
        <>
            <div
                className={`relative ${className}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={`${sizeStyles.container} rounded-xl border-2 border-dashed overflow-hidden bg-gray-50 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                        isDragging
                            ? 'border-kezak-primary bg-kezak-light/30'
                            : 'border-gray-300 hover:border-kezak-primary/50 hover:bg-gray-100'
                    }`}
                >
                    {currentImageUrl ? (
                        <Image
                            src={currentImageUrl}
                            alt="Logo"
                            width={200}
                            height={200}
                            className="w-full h-full object-cover rounded-lg"
                            unoptimized={currentImageUrl.includes('localhost')}
                        />
                    ) : isUploading ? (
                        <Loader2 className={`${sizeStyles.icon} text-gray-400 animate-spin`} />
                    ) : (
                        <>
                            <Upload className={`${sizeStyles.icon} text-gray-400`} />
                            <span className={`${sizeStyles.text} text-gray-500 text-center px-2`}>
                                {placeholder || 'Ajouter un logo'}
                            </span>
                        </>
                    )}
                </button>
            </div>

            <ImageCropModal
                open={cropModalOpen}
                imageSrc={imageSrcForCrop}
                onClose={handleCropClose}
                onConfirm={handleCropConfirm}
                isProcessing={isUploading}
                aspect={aspect}
                title={cropTitle}
                cropShape={cropShape}
                outputWidth={outputWidth}
                outputHeight={outputHeight}
                quality={quality}
                maxFileSizeKb={maxFileSizeKb}
            />
        </>
    );
}
