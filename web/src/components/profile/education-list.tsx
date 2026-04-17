'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

export interface EducationItem {
    degree: string;
    school: string;
    year: number | '';
}

export interface EducationListProps {
    value: EducationItem[];
    onChange: (items: EducationItem[]) => void;
}

const currentYear = new Date().getFullYear();
const inputClass = 'w-full h-[52px] px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200';

export function EducationList({ value, onChange }: EducationListProps) {
    const { t } = useTranslation();

    const addItem = () => {
        onChange([...value, { degree: '', school: '', year: '' }]);
    };

    const removeItem = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof EducationItem, val: string) => {
        const updated = [...value];
        if (field === 'year') {
            updated[index] = { ...updated[index], [field]: val ? parseInt(val, 10) : '' };
        } else {
            updated[index] = { ...updated[index], [field]: val };
        }
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {value.map((item, index) => (
                <div
                    key={index}
                    className="relative bg-gray-50 rounded-xl border border-gray-100 p-4 sm:p-5 space-y-4"
                >
                    <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="absolute top-3 right-3 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-10">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('dashboard.profile_edu_degree')}</label>
                            <input
                                type="text"
                                value={item.degree}
                                onChange={(e) => updateItem(index, 'degree', e.target.value)}
                                placeholder={t('dashboard.profile_edu_degree_placeholder')}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('dashboard.profile_edu_school')}</label>
                            <input
                                type="text"
                                value={item.school}
                                onChange={(e) => updateItem(index, 'school', e.target.value)}
                                placeholder={t('dashboard.profile_edu_school_placeholder')}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('dashboard.profile_edu_year')}</label>
                            <input
                                type="number"
                                value={item.year}
                                onChange={(e) => updateItem(index, 'year', e.target.value)}
                                placeholder="2020"
                                min={1970}
                                max={currentYear}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addItem}
                className="w-full flex items-center justify-center gap-2 h-[52px] rounded-lg font-semibold border-2 border-dashed border-gray-200 text-gray-500 hover:border-kezak-primary hover:text-kezak-primary hover:bg-kezak-light/30 transition-all duration-200"
            >
                <Plus className="w-5 h-5" />
                {t('dashboard.profile_add_education')}
            </button>
        </div>
    );
}
