'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VisionView } from './vision-view';
import { ExpertiseView } from './expertise-view';
import { ConditionsView } from './conditions-view';
import { cn } from '@/lib/utils'; // Assuming you have a utils file

// Mock Data Injector (Simulating Fetch)
const MOCK_PROJECT = {
    id: '1',
    title: 'AgriTech Revolution',
    pitch: 'Revolutionizing small-scale farming with AI-driven crop analysis.',
    stage: 'MVP',
    equity: '10-20%',
};

const TABS = [
    { id: 'vision', label: 'Vision', component: VisionView },
    { id: 'expertise', label: 'Expertise', component: ExpertiseView },
    { id: 'conditions', label: 'Conditions', component: ConditionsView },
];

export default function ProjectDeck({ projectId }: { projectId: string }) {
    const [activeTab, setActiveTab] = useState('vision');
    const project = MOCK_PROJECT; // In real app, use projectId to fetch

    const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || VisionView;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header / Tabs */}
            <div className="border-b border-gray-100 px-6 pt-6">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                                activeTab === tab.id
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/30">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ActiveComponent project={project} />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer / CTA Action */}
            <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center sticky bottom-0 z-10">
                <div className="text-sm text-gray-500">
                    Posté il y a 2 jours
                </div>
                <button className="bg-black text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                    Vérifier le Match
                </button>
            </div>
        </div>
    );
}
