'use client';

import { useState } from 'react';
import { FileText, Download, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  uploading?: boolean;
  progress?: number;
}

export function FilePreview({ fileUrl, fileName, fileSize, fileMimeType, uploading = false, progress = 0 }: FilePreviewProps) {
  const { t } = useTranslation();
  const isPdf = fileMimeType === 'application/pdf';
  const isImage = fileMimeType.startsWith('image/');
  const sizeLabel = fileSize < 1024 * 1024
    ? `${Math.round(fileSize / 1024)} KB`
    : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;

  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Image preview
  if (isImage) {
    return <ImagePreview fileUrl={fileUrl} fileName={fileName} uploading={uploading} progress={clampedProgress} />;
  }

  // Document preview (PDF / DOCX)
  const content = (
    <>
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'} ${uploading ? 'animate-pulse' : ''}`}>
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
        {uploading ? (
          <>
            <p className="text-xs text-gray-500">{t('dashboard.messaging_uploading')}</p>
            <div className="mt-1 h-[3px] w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-kezak-primary rounded-full transition-all duration-300"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">{isPdf ? 'PDF' : 'DOCX'} · {sizeLabel}</p>
        )}
      </div>
      {!uploading && <Download className="h-4 w-4 text-gray-400 flex-shrink-0" />}
    </>
  );

  if (uploading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
        {content}
      </div>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      {content}
    </a>
  );
}

// --- Image preview sub-component ---

interface ImagePreviewInternalProps {
  fileUrl: string;
  fileName: string;
  uploading: boolean;
  progress: number;
}

function ImagePreview({ fileUrl, fileName, uploading, progress }: ImagePreviewInternalProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  // Uploading state: placeholder with progress bar
  if (uploading) {
    return (
      <div className="relative rounded-lg overflow-hidden shadow-sm" style={{ maxWidth: 280, maxHeight: 300 }}>
        <div className="w-full bg-gray-200 flex items-center justify-center" style={{ width: 280, height: 180 }}>
          <ImageIcon className="h-10 w-10 text-gray-400 animate-pulse" />
        </div>
        {/* Progress bar overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/30 px-2 py-1.5">
          <div className="h-[3px] w-full rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-white/80 mt-0.5 text-center">{t('dashboard.messaging_uploading_percent', { percent: progress })}</p>
        </div>
      </div>
    );
  }

  // Load error fallback
  if (imgError) {
    const Wrapper = fileUrl ? 'a' : 'div';
    const linkProps = fileUrl ? { href: fileUrl, target: '_blank' as const, rel: 'noopener noreferrer' } : {};
    return (
      <Wrapper
        {...linkProps}
        className="block rounded-lg overflow-hidden shadow-sm"
        style={{ maxWidth: 280 }}
      >
        <div className="w-full bg-gray-100 flex flex-col items-center justify-center gap-2 py-8 px-4">
          <ImageIcon className="h-10 w-10 text-gray-400" />
          <p className="text-xs text-gray-500 truncate max-w-full">{fileName}</p>
        </div>
      </Wrapper>
    );
  }

  // No URL yet (between upload and ack) — show placeholder
  if (!fileUrl) {
    return (
      <div className="rounded-lg overflow-hidden shadow-sm" style={{ maxWidth: 280 }}>
        <div className="w-full bg-gray-100 flex items-center justify-center" style={{ width: 280, height: 180 }}>
          <ImageIcon className="h-10 w-10 text-gray-400" />
        </div>
      </div>
    );
  }

  // Normal image display
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden shadow-sm"
      style={{ maxWidth: 280 }}
    >
      <img
        src={fileUrl}
        alt={fileName}
        className="rounded-lg object-cover"
        style={{ maxWidth: 280, maxHeight: 300 }}
        onError={() => setImgError(true)}
      />
    </a>
  );
}
