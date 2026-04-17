'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/context/i18n-context';

export interface ExperienceItem {
    role: string;
    company: string;
    startYear: number | '';
    endYear: number | '' | null;
}

export interface ExperienceListProps {
    value: ExperienceItem[];
    onChange: (items: ExperienceItem[]) => void;
}

const currentYear = new Date().getFullYear();
const inputClass = 'w-full h-[52px] px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200';

export function ExperienceList({ value, onChange }: ExperienceListProps) {
    const { t } = useTranslation();

    const addItem = () => {
        onChange([...value, { role: '', company: '', startYear: '', endYear: '' }]);
    };

    const removeItem = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof ExperienceItem, val: string) => {
        const updated = [...value];
        if (field === 'startYear' || field === 'endYear') {
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pe-10">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('dashboard.profile_exp_role')}</label>
                            <input
                                type="text"
                                value={item.role}
                                onChange={(e) => updateItem(index, 'role', e.target.value)}
                                placeholder={t('dashboard.profile_exp_role_placeholder')}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('dashboard.profile_exp_company')}</label>
                            <input
                                type="text"
                                value={item.company}
                                onChange={(e) => updateItem(index, 'company', e.target.value)}
                                placeholder={t('dashboard.profile_exp_company_placeholder')}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">{t('dashboard.profile_exp_start')}</label>
                            <input
                                type="number"
                                value={item.startYear}
                                onChange={(e) => updateItem(index, 'startYear', e.target.value)}
                                placeholder="2018"
                                min={1970}
                                max={currentYear}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                {t('dashboard.profile_exp_end')}
                                <span className="text-xs text-gray-400 ms-1">{t('dashboard.profile_exp_end_hint')}</span>
                            </label>
                            <input
                                type="number"
                                value={item.endYear ?? ''}
                                onChange={(e) => updateItem(index, 'endYear', e.target.value)}
                                placeholder={t('dashboard.profile_exp_current')}
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
                {t('dashboard.profile_add_experience')}
            </button>
        </div>
    );
}
