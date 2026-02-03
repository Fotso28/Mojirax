'use client';

import { MoreHorizontal, MapPin, Briefcase, Calendar } from 'lucide-react';
import { Button } from '@/components/ui';

interface ProjectCardProps {
    project: {
        id: string;
        title: string;
        description: string;
        stage: string;
        sector: string;
        location: string;
        author: {
            name: string;
            role: string;
            image?: string;
        };
        tags: string[];
        postedAt: string;
    };
}

export function ProjectCard({ project }: ProjectCardProps) {
    return (
        <article className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0">
                        {project.author.image && (
                            <img src={project.author.image} alt={project.author.name} className="w-full h-full rounded-full object-cover" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{project.author.name}</h3>
                        <p className="text-xs text-gray-500">{project.author.role}</p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="mb-4">
                <h2 className="text-xl font-bold text-kezak-dark mb-3 group-hover:text-kezak-primary transition-colors leading-tight">
                    {project.title}
                </h2>
                <p className="text-gray-600 leading-relaxed text-base line-clamp-3">
                    {project.description}
                </p>
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-gray-500 mb-6">
                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                    <span>{project.sector}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{project.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{project.postedAt}</span>
                </div>
            </div>

            {/* Skills / Needs (Tags) */}
            <div className="flex flex-wrap gap-2 mb-6">
                {project.tags.map(tag => (
                    <span key={tag} className="text-sm font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        {tag}
                    </span>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-4 pt-4 mt-auto">
                <Button className="flex-1 rounded-xl h-11 text-base font-semibold shadow-lg shadow-blue-500/20">
                    Voir le projet
                </Button>
                <Button variant="secondary" className="flex-1 rounded-xl h-11 text-base font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200">
                    Sauvegarder
                </Button>
            </div>
        </article>
    );
}
