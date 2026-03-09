'use client';

import { UserPlus, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui';

export function SidebarRight() {
    return (
        <div className="space-y-6 h-full overflow-y-auto pb-4">

            {/* Widget 1: Suggestions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm">À suivre</h3>
                    <TrendingUp className="w-4 h-4 text-kezak-primary" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0"></div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">Alex Intech</p>
                                <p className="text-xs text-gray-500 truncate">CTO @ FinTechX</p>
                                <button className="mt-2 text-xs font-semibold text-kezak-primary hover:text-kezak-dark flex items-center gap-1">
                                    <UserPlus className="w-3 h-3" /> Suivre
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Widget 2: Partners (Ads) */}
            <div className="bg-gradient-to-br from-kezak-dark to-gray-900 rounded-2xl shadow-lg p-5 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-all"></div>
                <h3 className="font-bold text-lg mb-2 relative z-10">Lygos Pay</h3>
                <p className="text-sm text-gray-300 mb-4 relative z-10">
                    La solution de paiement pour votre startup au Cameroun.
                </p>
                <Button variant="secondary" className="w-full text-sm h-10 bg-white text-kezak-dark hover:bg-gray-100 border-none">
                    Découvrir
                </Button>
            </div>

            {/* Widget 3: Footer Links */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 px-2">
                {['À propos', 'Aide', 'Confidentialité', 'CGU', 'Publicité'].map((link) => (
                    <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-600">
                        {link}
                    </a>
                ))}
                <p className="text-xs text-gray-300 w-full mt-2">© 2026 MojiraX Inc.</p>
            </div>
        </div>
    );
}
