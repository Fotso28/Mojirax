'use client';

import { X } from 'lucide-react';
import { SidebarRight } from './sidebar-right';

interface MobileWidgetDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MobileWidgetDrawer({ isOpen, onClose }: MobileWidgetDrawerProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className="absolute top-0 right-0 bottom-0 w-[300px] bg-white shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="flex flex-col h-full">
                    <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                        <span className="text-xl font-bold text-kezak-dark">Découverte</span>
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
