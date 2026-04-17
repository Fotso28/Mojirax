'use client';

import { useState } from 'react';
import { WizardStep } from '@/components/onboarding/wizard/wizard-layout';
import { useOnboarding } from '@/context/onboarding-context';
import { Input } from '@/components/ui/input';
import { CountrySelect } from '@/components/ui/country-select';
import { ImageUploader } from '@/components/ui/image-uploader';
import type { ProcessedImage } from '@/utils/image-processing';
import { useTranslation } from '@/context/i18n-context';

export function ProjectIdentityStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const { t } = useTranslation();
    const [logoPreview, setLogoPreview] = useState<string | null>(data._logoPreview || null);

    const isValid = data.name && data.pitch && data.country && data.city;

    const handleLogoResult = (result: ProcessedImage) => {
        // Stocker le blob en base64 pour pouvoir le persister dans le draft
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            updateData('_logoBase64', base64);
            updateData('_logoPreview', base64);
            setLogoPreview(base64);
        };
        reader.readAsDataURL(result.blob);
    };

    return (
        <WizardStep
            title={t('project.identity_title')}
            description={t('project.identity_description')}
            onNext={nextStep}
            isValid={isValid}
        >
            <div className="space-y-6">
                {/* Logo */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                        {t('project.identity_logo_label')}
                    </label>
                    <ImageUploader
                        preset="projectLogo"
                        uploadEndpoint=""
                        localMode
                        currentImageUrl={logoPreview}
                        onLocalResult={handleLogoResult}
                        onUploadComplete={() => {}}
                        variant="logo"
                        size="md"
                        placeholder={t('project.identity_logo_placeholder')}
                    />
                </div>

                <Input
                    label={t('project.identity_name_label')}
                    placeholder={t('project.identity_name_placeholder')}
                    value={data.name || ''}
                    onChange={(e) => updateData('name', e.target.value)}
                    autoFocus
                />

                <Input
                    label={t('project.identity_pitch_label')}
                    placeholder={t('project.identity_pitch_placeholder')}
                    value={data.pitch || ''}
                    onChange={(e) => updateData('pitch', e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <CountrySelect
                        label={t('project.identity_country_label')}
                        value={data.country || ''}
                        onChange={(value) => {
                            updateData('country', value);
                            updateData('location', `${data.city || ''}, ${value}`);
                        }}
                    />

                    <Input
                        label={t('project.identity_city_label')}
                        placeholder={t('project.identity_city_placeholder')}
                        value={data.city || ''}
                        onChange={(e) => {
                            updateData('city', e.target.value);
                            updateData('location', `${e.target.value}, ${data.country || ''}`);
                        }}
                    />
                </div>
            </div>
        </WizardStep>
    );
}
