'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, Briefcase, User, Tag, Loader2, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useRouter } from 'next/navigation';
import { getSectorLabel, SECTORS } from '@/lib/constants/sectors';

interface UniversalResults {
    projects: { id: string; name: string; slug: string; pitch: string; sector: string; logoUrl?: string; similarity: number }[];
    people: { id: string; firstName: string; lastName: string; name?: string; image?: string; title?: string; similarity: number }[];
    skills: { value: string; label: string; count: number; similarity: number }[];
}

const RECENT_SEARCHES_KEY = 'mojiax_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
    try {
        return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveRecentSearch(query: string) {
    const recent = getRecentSearches().filter(s => s !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
}

// Suggestions rapides quand le champ est vide
const QUICK_LINKS = [
    { label: 'Fintech', path: '/feed?sector=FINTECH', icon: TrendingUp },
    { label: 'EdTech', path: '/feed?sector=EDTECH', icon: TrendingUp },
    { label: 'Logistique', path: '/feed?sector=LOGISTICS', icon: TrendingUp },
    { label: 'Voir les talents', path: '/feed/candidates', icon: User },
];

export function UniversalSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UniversalResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isClosing, setIsClosing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        inputRef.current?.focus();
        setRecentSearches(getRecentSearches());
        // Bloquer le scroll du body
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Fermer avec animation
    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    }, [onClose]);

    // Fermer avec Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleClose]);

    // Recherche avec debounce
    useEffect(() => {
        if (query.length < 2) {
            setResults(null);
            setActiveIndex(-1);
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await AXIOS_INSTANCE.get(`/search/universal?q=${encodeURIComponent(query)}`);
                setResults(data);
                setActiveIndex(-1);
            } catch {
                setResults(null);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const navigate = useCallback((path: string) => {
        if (query.length >= 2) saveRecentSearch(query);
        onClose();
        router.push(path);
    }, [onClose, router, query]);

    // Liste plate de tous les éléments navigables
    const flatItems = useMemo(() => {
        if (!results) return [];
        const items: { type: string; path: string }[] = [];
        results.projects.forEach(p => items.push({ type: 'project', path: `/projects/${p.slug || p.id}` }));
        results.people.forEach(p => items.push({ type: 'person', path: `/founders/${p.id}` }));
        results.skills.forEach(s => items.push({ type: 'skill', path: `/feed?skill=${encodeURIComponent(s.value)}` }));
        return items;
    }, [results]);

    // Navigation clavier dans les résultats
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (flatItems.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % flatItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev <= 0 ? flatItems.length - 1 : prev - 1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            navigate(flatItems[activeIndex].path);
        }
    }, [flatItems, activeIndex, navigate]);

    // Scroll automatique vers l'élément actif
    useEffect(() => {
        if (activeIndex < 0 || !listRef.current) return;
        const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const hasResults = results && (results.projects.length > 0 || results.people.length > 0 || results.skills.length > 0);
    const showIdleState = query.length < 2 && !loading;

    let itemIndex = -1;
    const getNextIndex = () => ++itemIndex;

    return (
        <AnimatePresence>
            {!isClosing && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="max-w-2xl mx-auto mt-4 sm:mt-16 px-0 sm:px-4 h-full sm:h-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-gray-200 overflow-hidden h-full sm:h-auto flex flex-col sm:block">
                            {/* Search input */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
                                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Rechercher un projet, une personne, une compétence..."
                                    className="flex-1 text-base outline-none placeholder:text-gray-400"
                                />
                                {loading && <Loader2 className="w-4 h-4 text-kezak-primary animate-spin shrink-0" />}
                                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
                                    ESC
                                </kbd>
                                <button onClick={handleClose} className="sm:hidden p-1 text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content area */}
                            <div ref={listRef} className="flex-1 overflow-y-auto sm:max-h-[60vh]">

                                {/* Idle state: recent + suggestions */}
                                {showIdleState && (
                                    <div className="p-4 space-y-6">
                                        {/* Recherches récentes */}
                                        {recentSearches.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-between px-1 mb-3">
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" /> Récents
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            clearRecentSearches();
                                                            setRecentSearches([]);
                                                        }}
                                                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        Effacer
                                                    </button>
                                                </div>
                                                <div className="space-y-0.5">
                                                    {recentSearches.map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setQuery(s)}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                                                        >
                                                            <Clock className="w-4 h-4 text-gray-300 shrink-0" />
                                                            <span className="text-sm text-gray-600 flex-1">{s}</span>
                                                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggestions rapides */}
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-3 flex items-center gap-1.5">
                                                <TrendingUp className="w-3 h-3" /> Suggestions
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {QUICK_LINKS.map(link => (
                                                    <button
                                                        key={link.path}
                                                        onClick={() => navigate(link.path)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-kezak-light hover:text-kezak-primary rounded-xl text-sm text-gray-600 font-medium transition-colors border border-gray-100"
                                                    >
                                                        <link.icon className="w-3.5 h-3.5" />
                                                        {link.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Hint raccourci */}
                                        <p className="text-center text-xs text-gray-300 pt-2">
                                            Tapez au moins 2 caractères pour rechercher
                                        </p>
                                    </div>
                                )}

                                {/* Results */}
                                {hasResults && (
                                    <div className="divide-y divide-gray-50">
                                        {/* Projets */}
                                        {results.projects.length > 0 && (
                                            <div className="p-3">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                                                    <Briefcase className="w-3 h-3" /> Projets
                                                </p>
                                                {results.projects.map(p => {
                                                    const idx = getNextIndex();
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            data-index={idx}
                                                            onClick={() => navigate(`/projects/${p.slug || p.id}`)}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                                                                activeIndex === idx ? 'bg-kezak-light' : 'hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-kezak-light flex items-center justify-center shrink-0 overflow-hidden">
                                                                {p.logoUrl ? (
                                                                    <img src={p.logoUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-sm font-bold text-kezak-primary">{p.name?.[0]}</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                                                                <p className="text-xs text-gray-500 truncate">{getSectorLabel(p.sector)} · {p.pitch?.slice(0, 60)}...</p>
                                                            </div>
                                                            {activeIndex === idx && (
                                                                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 rounded border border-gray-200">
                                                                    ↵
                                                                </kbd>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Personnes */}
                                        {results.people.length > 0 && (
                                            <div className="p-3">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                                                    <User className="w-3 h-3" /> Personnes
                                                </p>
                                                {results.people.map(p => {
                                                    const idx = getNextIndex();
                                                    const displayName = p.name || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Utilisateur';
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            data-index={idx}
                                                            onClick={() => navigate(`/founders/${p.id}`)}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                                                                activeIndex === idx ? 'bg-kezak-light' : 'hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-kezak-light flex items-center justify-center shrink-0 overflow-hidden">
                                                                {p.image ? (
                                                                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-sm font-bold text-kezak-primary">{displayName[0]}</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                                                                {p.title && <p className="text-xs text-gray-500 truncate">{p.title}</p>}
                                                            </div>
                                                            {activeIndex === idx && (
                                                                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 rounded border border-gray-200">
                                                                    ↵
                                                                </kbd>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Skills */}
                                        {results.skills.length > 0 && (
                                            <div className="p-3">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                                                    <Tag className="w-3 h-3" /> Compétences
                                                </p>
                                                <div className="flex flex-wrap gap-2 px-2">
                                                    {results.skills.map(s => (
                                                        <button
                                                            key={s.value}
                                                            onClick={() => navigate(`/feed?skill=${encodeURIComponent(s.value)}`)}
                                                            className="px-3 py-1.5 bg-kezak-light text-kezak-primary rounded-full text-xs font-semibold hover:bg-kezak-primary hover:text-white transition-colors"
                                                        >
                                                            {s.label} ({s.count})
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Empty state */}
                                {query.length >= 2 && !loading && !hasResults && (
                                    <div className="py-12 text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">Aucun résultat pour « {query} »</p>
                                        <p className="text-xs text-gray-400 mt-1">Essayez avec d'autres mots-clés</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer hint */}
                            {hasResults && (
                                <div className="hidden sm:flex items-center justify-between px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">↑↓</kbd> naviguer</span>
                                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">↵</kbd> ouvrir</span>
                                        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">esc</kbd> fermer</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
