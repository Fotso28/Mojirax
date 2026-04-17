import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/context/i18n-context';

interface PrivacyWallProps {
    children: React.ReactNode;
    isPremium?: boolean;
    blurIntensity?: 'sm' | 'md' | 'lg';
    lockedFieldsCount?: number;
}

export function PrivacyWall({
    children,
    isPremium = false,
    blurIntensity = 'md',
    lockedFieldsCount,
}: PrivacyWallProps) {
    const { t } = useTranslation();

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
                    <h4 className="font-bold text-gray-900 mb-1">{t('project.privacy_wall.title')}</h4>
                    <p className="text-xs text-gray-500 mb-4">
                        {lockedFieldsCount
                            ? (lockedFieldsCount > 1
                                ? t('project.privacy_wall.locked_count_plural', { count: lockedFieldsCount })
                                : t('project.privacy_wall.locked_count', { count: lockedFieldsCount }))
                            : t('project.privacy_wall.upgrade_hint')}
                    </p>
                    <a
                        href="/settings/billing"
                        className="block w-full py-2 px-4 bg-kezak-primary hover:bg-kezak-dark text-white rounded-lg text-sm font-semibold shadow-lg shadow-kezak-primary/30 hover:shadow-kezak-primary/40 transition-all text-center"
                    >
                        {t('project.privacy_wall.view_plans')}
                    </a>
                </div>
            </div>
        </div>
    );
}
