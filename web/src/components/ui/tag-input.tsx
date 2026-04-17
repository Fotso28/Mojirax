'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

export interface TagInputProps {
    label?: string;
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    maxTags?: number;
}

export function TagInput({
    label,
    value,
    onChange,
    placeholder = 'Tapez et appuyez sur Entrée...',
    maxTags = 20,
}: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const addTag = (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
        onChange([...value, trimmed]);
        setInputValue('');
    };

    const removeTag = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue);
        }
        if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeTag(value.length - 1);
        }
    };

    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-gray-700">{label}</label>
            )}
            <div className={`min-h-[52px] w-full bg-white border border-gray-300 rounded-lg px-3 py-2 flex flex-wrap items-center gap-2 transition-all duration-200 hover:border-gray-400 focus-within:ring-2 focus-within:ring-kezak-primary/20 focus-within:border-kezak-primary`}>
                {value.map((tag, index) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="ms-0.5 rounded-full p-0.5 hover:bg-blue-100 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] h-8 bg-transparent border-none outline-none text-base text-gray-900 placeholder:text-gray-400"
                />
            </div>
            <p className="text-xs text-gray-400 flex justify-between">
                <span>Appuyez sur Entrée pour ajouter</span>
                <span>{value.length}/{maxTags}</span>
            </p>
        </div>
    );
}
