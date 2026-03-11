export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ImageProcessingOptions {
    cropArea: CropArea;
    outputWidth: number;
    outputHeight: number;
    format?: 'webp' | 'jpeg';
    quality?: number;
    maxFileSizeKb?: number;
}

export interface ProcessedImage {
    blob: Blob;
    width: number;
    height: number;
    sizeKb: number;
}

export const IMAGE_PRESETS = {
    avatar: {
        aspect: 4 / 5,
        outputWidth: 512,
        outputHeight: 640,
        quality: 0.80,
        maxFileSizeKb: 500,
        cropShape: 'rect' as const,
        title: 'Recadrer la photo de profil',
    },
    projectLogo: {
        aspect: 1,
        outputWidth: 400,
        outputHeight: 400,
        quality: 0.80,
        maxFileSizeKb: 300,
        cropShape: 'rect' as const,
        title: 'Recadrer le logo',
    },
    adFeed: {
        aspect: 1.91 / 1,
        outputWidth: 1200,
        outputHeight: 628,
        quality: 0.82,
        maxFileSizeKb: 500,
        cropShape: 'rect' as const,
        title: 'Image pub — Feed (1.91:1)',
    },
    adSidebar: {
        aspect: 1,
        outputWidth: 600,
        outputHeight: 600,
        quality: 0.80,
        maxFileSizeKb: 400,
        cropShape: 'rect' as const,
        title: 'Image pub — Sidebar (1:1)',
    },
    adSearch: {
        aspect: 1.91 / 1,
        outputWidth: 1200,
        outputHeight: 628,
        quality: 0.82,
        maxFileSizeKb: 500,
        cropShape: 'rect' as const,
        title: 'Image pub — Recherche (1.91:1)',
    },
} as const;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.crossOrigin = 'anonymous';
        image.src = url;
    });
}

function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality: number,
): Promise<Blob | null> {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
}

export async function processImage(
    imageSrc: string,
    options: ImageProcessingOptions,
): Promise<ProcessedImage> {
    const {
        cropArea,
        outputWidth,
        outputHeight,
        format = 'webp',
        quality = 0.80,
        maxFileSizeKb,
    } = options;

    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        outputWidth,
        outputHeight,
    );

    const primaryMime = `image/${format}`;
    const fallbackMime = 'image/jpeg';

    // Compression itérative si maxFileSizeKb est défini
    let currentQuality = quality;
    const minQuality = 0.40;
    const step = 0.10;

    while (currentQuality >= minQuality) {
        let blob = await canvasToBlob(canvas, primaryMime, currentQuality);

        // Fallback JPEG si WebP non supporté
        if (!blob) {
            blob = await canvasToBlob(canvas, fallbackMime, currentQuality);
        }

        if (!blob) {
            throw new Error("Impossible de traiter l'image");
        }

        const sizeKb = Math.round(blob.size / 1024);

        if (!maxFileSizeKb || sizeKb <= maxFileSizeKb) {
            return { blob, width: outputWidth, height: outputHeight, sizeKb };
        }

        currentQuality -= step;
    }

    // Dernier essai au plancher de qualité
    let blob = await canvasToBlob(canvas, primaryMime, minQuality);
    if (!blob) {
        blob = await canvasToBlob(canvas, fallbackMime, minQuality);
    }
    if (!blob) {
        throw new Error("Impossible de traiter l'image");
    }

    return {
        blob,
        width: outputWidth,
        height: outputHeight,
        sizeKb: Math.round(blob.size / 1024),
    };
}
