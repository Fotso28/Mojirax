'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, MapPin, Briefcase, Code } from 'lucide-react';

interface FeedFiltersProps {
    onFilterChange: (filters: { city?: string; sector?: string; skills?: string[] }) => void;
}

const SECTORS = ['FINTECH', 'AGRITECH', 'HEALTH', 'EDTECH', 'LOGISTICS', 'ECOMMERCE', 'OTHER'];
const SKILLS = ['React', 'Node.js', 'Python', 'Marketing', 'Design', 'Sales', 'Finance'];

export function FeedFilters({ onFilterChange }: FeedFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [city, setCity] = useState('');
    const [sector, setSector] = useState('');
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

    const handleApply = () => {
        onFilterChange({
            city: city || undefined,
            sector: sector || undefined,
            skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        });
        setIsOpen(false);
    };

    const handleReset = () => {
        setCity('');
        setSector('');
        setSelectedSkills([]);
        onFilterChange({});
        setIsOpen(false);
    };

    const toggleSkill = (skill: string) => {
        setSelectedSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    return (
        <div className="relative mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isOpen || city || sector || selectedSkills.length > 0
                        ? 'bg-kezak-primary/10 border-kezak-primary text-kezak-primary'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
            >
                <Filter size={18} />
                <span className="text-sm font-medium">Filtres</span>
                {(city || sector || selectedSkills.length > 0) && (
                    <span className="w-2 h-2 bg-kezak-primary rounded-full" />
                )}
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/5 md:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-full md:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-50">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-900">Filtrer par</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* City */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                    <MapPin size={14} /> Ville
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Douala, Paris..."
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20"
                                />
                            </div>

                            {/* Sector */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                    <Briefcase size={14} /> Secteur
                                </label>
                                <select
                                    value={sector}
                                    onChange={(e) => setSector(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kezak-primary/20"
                                >
                                    <option value="">Tous les secteurs</option>
                                    {SECTORS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Skills */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                    <Code size={14} /> Skills recherchés
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {SKILLS.map(skill => (
                                        <button
                                            key={skill}
                                            onClick={() => toggleSkill(skill)}
                                            className={`px-3 py-1 rounded-full text-xs transition-all ${selectedSkills.includes(skill)
                                                    ? 'bg-kezak-primary text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {skill}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={handleReset}
                                className="flex-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Réinitialiser
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-1 py-2 bg-kezak-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-kezak-primary/20 active:scale-95 transition-all"
                            >
                                Appliquer
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
