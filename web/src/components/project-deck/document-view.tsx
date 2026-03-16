'use client';

import { motion } from 'framer-motion';
import {
    AlertCircle,
    Lightbulb,
    TrendingUp,
    Rocket,
    Users,
    UserPlus,
    Download,
    FileText,
} from 'lucide-react';

interface BlockConfig {
    key: string;
    label: string;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
}

const BLOCKS: BlockConfig[] = [
    { key: 'problem', label: 'Problème', icon: AlertCircle, iconColor: 'text-red-500', iconBg: 'bg-red-50' },
    { key: 'solution', label: 'Solution', icon: Lightbulb, iconColor: 'text-amber-500', iconBg: 'bg-amber-50' },
    { key: 'market', label: 'Marché', icon: TrendingUp, iconColor: 'text-blue-500', iconBg: 'bg-blue-50' },
    { key: 'traction', label: 'Traction', icon: Rocket, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-50' },
    { key: 'team', label: 'Équipe', icon: Users, iconColor: 'text-purple-500', iconBg: 'bg-purple-50' },
    { key: 'cofounder', label: 'Cofondateur recherché', icon: UserPlus, iconColor: 'text-indigo-500', iconBg: 'bg-indigo-50' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Resolve document URL: if relative (starts with /), prefix with API base URL.
 * Production URLs from MinIO are already absolute.
 */
function resolveDocumentUrl(url: string): string {
    if (url.startsWith('/')) {
        return `${API_URL}${url}`;
    }
    return url;
}

export function DocumentView({ project }: { project: any }) {
    const summary = project.aiSummary;
    const documentUrl = project.documentUrl ? resolveDocumentUrl(project.documentUrl) : null;

    if (!summary && !documentUrl) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Aucune synthèse disponible pour ce projet.</p>
            </div>
        );
    }

    const hasBlocks = summary && BLOCKS.some(b => summary[b.key]);

    return (
        <div className="space-y-8 py-2">
            {/* Blocs de synthèse */}
            {hasBlocks && (
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Synthèse du projet
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {BLOCKS.map((block, index) => {
                            const text = summary[block.key];
                            if (!text) return null;
                            const Icon = block.icon;

                            return (
                                <motion.div
                                    key={block.key}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: index * 0.04 }}
                                    className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm"
                                >
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className={`w-8 h-8 rounded-lg ${block.iconBg} flex items-center justify-center`}>
                                            <Icon className={`w-4 h-4 ${block.iconColor}`} />
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                                            {block.label}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                        {text}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Document download */}
            {documentUrl && (
                <div className="flex justify-end">
                    <a
                        href={documentUrl}
                        download={project.documentName || 'document'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Télécharger le document
                    </a>
                </div>
            )}
        </div>
    );
}
