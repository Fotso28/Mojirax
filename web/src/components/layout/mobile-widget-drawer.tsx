'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { SidebarRight } from './sidebar-right';
import { useTranslation } from '@/context/i18n-context';

interface MobileWidgetDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileWidgetDrawer({ isOpen, onClose }: MobileWidgetDrawerProps) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setVisible(true));
            });
        } else {
            setVisible(false);
            const timer = setTimeout(() => setMounted(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const { t } = useTranslation();

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
                    visible ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`absolute top-0 right-0 bottom-0 w-[300px] bg-white shadow-2xl transition-transform duration-300 ease-out ${
                    visible ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                    <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                        <span className="text-xl font-bold text-kezak-dark">{t('dashboard.mobile_discovery')}</span>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                    {/* Reuse SidebarRight content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <SidebarRight />
                    </div>
                </div>
            </div>
        </div>
    );
}
