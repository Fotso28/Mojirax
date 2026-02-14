import Link from 'next/link';
import { Users, Clock, Target } from 'lucide-react';

// Mock data for initial implementation
const PROJECTS = [
    {
        id: '1',
        title: 'AgriTech Revolution',
        pitch: 'Revolutionizing small-scale farming with AI-driven crop analysis.',
        stage: 'MVP',
        looking_for: ['CTO', 'Fullstack Dev'],
        equity: '10-20%',
        color: 'from-green-500 to-emerald-700'
    },
    {
        id: '2',
        title: 'Fintech for Unbanked',
        pitch: 'Mobile-first banking solution for rural areas in Cameroon.',
        stage: 'Idea',
        looking_for: ['Cofounder', 'Marketing'],
        equity: '15-25%',
        color: 'from-blue-500 to-indigo-700'
    },
    {
        id: '3',
        title: 'HealthConnect',
        pitch: 'Telemedicine platform connecting patients with local specialists.',
        stage: 'Growth',
        looking_for: ['Lead Dev'],
        equity: '5-10%',
        color: 'from-rose-500 to-pink-700'
    }
];

export default function FeedPage() {
    return (
        <div className="space-y-8 p-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    Découvrez les projets
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                    Des fondateurs passionnés cherchent leur binôme.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROJECTS.map((project) => (
                    <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 border border-gray-100"
                    >
                        <div className={`h-32 w-full bg-gradient-to-br ${project.color} p-6`}>
                            <div className="flex items-start justify-between">
                                <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                                    {project.stage}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-1 flex-col p-6">
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                {project.title}
                            </h3>
                            <p className="mt-3 text-sm text-gray-500 line-clamp-3">
                                {project.pitch}
                            </p>

                            <div className="mt-6 flex flex-wrap gap-2">
                                {project.looking_for.map((role) => (
                                    <span key={role} className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                        {role}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Target size={14} />
                                    <span>{project.equity}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock size={14} />
                                    <span>2j</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
