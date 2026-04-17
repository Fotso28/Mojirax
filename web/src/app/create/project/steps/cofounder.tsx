'use client';

import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/context/i18n-context';

export function ProjectCofounderStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();

    const ROLE_OPTIONS = [
        { value: 'TECH', label: t('project.cofounder_role_tech') },
        { value: 'BIZ', label: t('project.cofounder_role_biz') },
        { value: 'PRODUCT', label: t('project.cofounder_role_product') },
        { value: 'FINANCE', label: t('project.cofounder_role_finance') },
    ];

    const selectedRoles = (data.looking_for_role || '').split(',').filter(Boolean);

    const toggleRole = (role: string) => {
        const updated = selectedRoles.includes(role)
            ? selectedRoles.filter((r: string) => r !== role)
            : [...selectedRoles, role];
        updateData('looking_for_role', updated.join(','));
    };

    return (
        <WizardStep
            title={t('project.cofounder_title')}
            description={t('project.cofounder_description')}
            onNext={nextStep}
            isValid={selectedRoles.length > 0}
            nextLabel={t('project.cofounder_continue')}
        >
            <div className="space-y-8">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('project.cofounder_roles_label')} <span className="text-gray-400 font-normal">{t('project.cofounder_roles_hint')}</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {ROLE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleRole(option.value)}
                                className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${selectedRoles.includes(option.value)
                                    ? 'border-kezak-primary bg-kezak-primary/5 text-kezak-primary'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('project.cofounder_collab_label')}
                    </label>
                    <div className="flex gap-4">
                        {['EQUITY', 'PAID', 'HYBRID'].map((type) => (
                            <button
                                key={type}
                                onClick={() => updateData('collab_type', type)}
                                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${data.collab_type === type
                                    ? 'border-kezak-primary bg-kezak-primary/5 text-kezak-primary'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {type === 'EQUITY' ? t('project.cofounder_collab_equity') : type === 'PAID' ? t('project.cofounder_collab_paid') : t('project.cofounder_collab_hybrid')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <Textarea
                        label={t('project.cofounder_vision_label')}
                        placeholder={t('project.cofounder_vision_placeholder')}
                        value={data.vision || ''}
                        onChange={(e) => updateData('vision', e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>
            </div>
        </WizardStep>
    );
}
