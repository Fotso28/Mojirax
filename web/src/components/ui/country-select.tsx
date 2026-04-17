import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CountrySelectProps {
    label?: string;
    error?: string;
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

import { COUNTRIES } from '@/lib/constants/countries';

export function CountrySelect({
    label,
    error,
    value,
    onChange,
    placeholder = "Sélectionner un pays..."
}: CountrySelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCountries = useMemo(() => {
        return COUNTRIES.filter(country =>
            country.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const selectedCountry = COUNTRIES.find(c => c.label === value || c.code === value); // value might be label or code depending on legacy

    const handleSelect = (countryLabel: string) => {
        onChange(countryLabel); // Storing the label mostly, or code if backend prefers. The previous Select used values like "CAMEROUN". 
        // Let's stick to the label or mapped value usage. 
        // The previous code used values like "CAMEROUN". 
        // Let's try to map back to uppercase codes if possible, or just use the label if the backend is flexible.
        // Actually earlier code used: <option value="CAMEROUN">Cameroun</option>
        // Use uppercase label for consistency with previous hardcoded values? 
        // Or simply use the label. Let's use the label for display, but maybe value should be UPPERCASE_SLUG?
        // Let's stick to passing the 'label' as value for now as it's what the user sees, OR the code if legacy required it.
        // The previous usage `value="CAMEROUN"` matches the label partially.
        // Let's assume we pass the LABEL for now as `data.country`.
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="space-y-1.5" ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full h-[52px] bg-white border rounded-lg text-left px-4 flex items-center justify-between
                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary
                        ${error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
                    `}
                >
                    <span className={`block truncate ${!selectedCountry ? 'text-gray-400' : 'text-gray-900'}`}>
                        {selectedCountry ? (
                            <span className="flex items-center gap-2">
                                <span className="text-xl">{selectedCountry.flag}</span>
                                <span>{selectedCountry.label}</span>
                            </span>
                        ) : (
                            placeholder
                        )}
                    </span>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col"
                        >
                            <div className="p-2 border-b border-gray-100 z-10 bg-white sticky top-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Rechercher..."
                                        className="w-full ps-9 pe-4 py-2 text-sm bg-gray-50 border-none rounded-md focus:ring-2 focus:ring-kezak-primary/20 outline-none"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1 p-1">
                                {filteredCountries.length === 0 ? (
                                    <div className="p-3 text-sm text-center text-gray-500">
                                        Aucun résultat
                                    </div>
                                ) : (
                                    filteredCountries.map((country) => (
                                        <button
                                            key={country.code}
                                            type="button"
                                            onClick={() => handleSelect(country.label)} // Changing to pass Label just for simplicity now.
                                            className={`
                                                w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors
                                                ${value === country.label ? 'bg-kezak-primary/10 text-kezak-primary font-medium' : 'hover:bg-gray-50 text-gray-700'}
                                            `}
                                        >
                                            <span className="text-xl">{country.flag}</span>
                                            <span>{country.label}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}
