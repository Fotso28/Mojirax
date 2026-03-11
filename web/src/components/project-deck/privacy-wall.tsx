import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivacyWallProps {
    children: React.ReactNode;
    isPremium?: boolean;
    blurIntensity?: 'sm' | 'md' | 'lg';
    onUnlock?: () => void;
    lockedFieldsCount?: number;
}

export function PrivacyWall({
    children,
    isPremium = false,
    blurIntensity = 'md',
    onUnlock,
    lockedFieldsCount,
}: PrivacyWallProps) {
    if (isPremium) {
        return <>{children}</>;
    }

    return (
        <div className="relative overflow-hidden group">
            <div className={cn(
                "select-none transition-all duration-500",
                blurIntensity === 'sm' && "blur-sm",
                blurIntensity === 'md' && "blur-md",
                blurIntensity === 'lg' && "blur-lg"
            )}>
                {children}
            </div>

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-white/30 backdrop-blur-[2px] opacity-100 transition-opacity">
                <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 flex flex-col items-center text-center max-w-xs transform group-hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                        <Lock size={20} />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Information Masquée</h4>
                    <p className="text-xs text-gray-500 mb-4">
                        {lockedFieldsCount
                            ? `${lockedFieldsCount} information${lockedFieldsCount > 1 ? 's' : ''} masquée${lockedFieldsCount > 1 ? 's' : ''}`
                            : 'Passez Premium pour voir les détails de contact et les liens.'}
                    </p>
                    <button
                        onClick={onUnlock}
                        className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all"
                    >
                        Débloquer
                    </button>
                </div>
            </div>
        </div>
    );
}
