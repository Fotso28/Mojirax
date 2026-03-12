'use client';

import { FileText, Download } from 'lucide-react';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
}

export function FilePreview({ fileUrl, fileName, fileSize, fileMimeType }: FilePreviewProps) {
  const isPdf = fileMimeType === 'application/pdf';
  const sizeLabel = fileSize < 1024 * 1024
    ? `${Math.round(fileSize / 1024)} KB`
    : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
        <p className="text-xs text-gray-500">{isPdf ? 'PDF' : 'DOCX'} · {sizeLabel}</p>
      </div>
      <Download className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </a>
  );
}
