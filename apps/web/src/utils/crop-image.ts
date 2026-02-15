interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export async function getCroppedImage(
    imageSrc: string,
    cropArea: CropArea,
    width = 512,
    height = 640,
): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        width,
        height,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    // Fallback to JPEG if WebP not supported
                    canvas.toBlob(
                        (jpegBlob) => {
                            if (jpegBlob) resolve(jpegBlob);
                            else reject(new Error('Impossible de recadrer l\'image'));
                        },
                        'image/jpeg',
                        0.85,
                    );
                }
            },
            'image/webp',
            0.85,
        );
    });
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.crossOrigin = 'anonymous';
        image.src = url;
    });
}
