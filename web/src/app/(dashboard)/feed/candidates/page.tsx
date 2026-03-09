'use client';

import { CandidateStream } from '@/components/feed/candidate-stream';
import { Users, Filter } from 'lucide-react';
import Link from 'next/link';

export default function CandidateFeedPage() {
    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
                <header className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            Découvrir des Talents
                        </h1>
                        <Link href="/feed" className="text-sm font-medium text-kezak-primary hover:underline">
                            Voir Projets
                        </Link>
                    </div>
                    <p className="text-gray-500 text-sm">
                        Trouvez le cofondateur idéal pour votre projet parmi nos candidats qualifiés.
                    </p>
                </header>

                <CandidateStream />
            </div>
        </div>
    );
}
