'use client';

import { useState, useMemo } from 'react';
import { Loader2, Save, Briefcase, User, Link2, Sparkles, GraduationCap, MapPin } from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';
import { TagInput } from '@/components/ui/tag-input';
import { CountrySelect } from '@/components/ui/country-select';
import { COUNTRIES } from '@/lib/constants/countries';
import { ExperienceList, ExperienceItem } from './experience-list';
import { EducationList, EducationItem } from './education-list';
import { useTranslation } from '@/context/i18n-context';
import { logger } from '@/lib/logger';

interface ProfileFormProps {
    user: any;
    onSaved?: (data: any) => void;
}

const inputClass = 'w-full h-[52px] px-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200';
const textareaClass = 'w-full min-h-[120px] p-4 bg-white border border-gray-300 rounded-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200 resize-y';

function SectionCard({ icon: Icon, title, children }: {
    icon: any; title: string; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-kezak-light flex items-center justify-center">
                    <Icon className="w-5 h-5 text-kezak-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            </div>
            {children}
        </div>
    );
}

export function ProfileForm({ user, onSaved }: ProfileFormProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();
    // Section 1: Infos personnelles
    const [firstName, setFirstName] = useState(user.firstName || '');
    const [lastName, setLastName] = useState(user.lastName || '');
    const email = user.email || '';
    const [phone, setPhone] = useState(user.phone || '');
    const [country, setCountry] = useState(user.country || '');
    const [city, setCity] = useState(user.city || '');
    const [address, setAddress] = useState(user.address || '');

    // Section 2: Profil pro
    const [title, setTitle] = useState(user.title || '');
    const [bio, setBio] = useState(user.bio || '');
    const [yearsOfExperience, setYearsOfExperience] = useState<number | ''>(user.yearsOfExperience ?? '');

    // Section 3: Liens
    const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl || '');
    const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl || '');

    // Section 4: Compétences & Langues
    const [skills, setSkills] = useState<string[]>(user.skills || []);
    const [languages, setLanguages] = useState<string[]>(user.languages || []);

    // Section 5: Expériences
    const [experience, setExperience] = useState<ExperienceItem[]>(
        user.experience?.map((e: any) => ({
            role: e.role || '', company: e.company || '',
            startYear: e.startYear || '', endYear: e.endYear ?? '',
        })) || []
    );

    // Section 6: Formation
    const [education, setEducation] = useState<EducationItem[]>(
        user.education?.map((e: any) => ({
            degree: e.degree || '', school: e.school || '', year: e.year || '',
        })) || []
    );

    const selectedCountry = useMemo(
        () => COUNTRIES.find(c => c.label === country || c.code === country),
        [country]
    );

    const [isSaving, setIsSaving] = useState(false);

    const saveAll = async () => {
        setIsSaving(true);
        try {
            await AXIOS_INSTANCE.patch('/users/profile', {
                firstName, lastName, phone, address,
                title, bio, country, city, linkedinUrl, websiteUrl,
                skills, languages,
                yearsOfExperience: yearsOfExperience === '' ? null : yearsOfExperience,
                experience: experience.filter(e => e.role && e.company).map(e => ({
                    role: e.role, company: e.company,
                    startYear: e.startYear || undefined,
                    endYear: e.endYear || null,
                })),
                education: education.filter(e => e.degree && e.school).map(e => ({
                    degree: e.degree, school: e.school,
                    year: e.year || undefined,
                })),
            });

            const { data: freshProfile } = await AXIOS_INSTANCE.get('/users/profile');
            onSaved?.(freshProfile);
            showToast(t('dashboard.profile_save_success'), 'success');
        } catch (err: any) {
            logger.error('[ProfileForm] Save failed:', err?.response?.status, err?.response?.data?.code || err?.message);
            showToast(t('dashboard.profile_save_error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Section 1: Infos personnelles */}
            <SectionCard icon={User} title={t('dashboard.profile_personal_info')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label htmlFor="profile-firstName" className="text-sm font-medium text-gray-700">{t('dashboard.profile_firstName')}</label>
                        <input id="profile-firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('dashboard.profile_firstName_placeholder')} maxLength={100} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="profile-lastName" className="text-sm font-medium text-gray-700">{t('dashboard.profile_lastName')}</label>
                        <input id="profile-lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t('dashboard.profile_lastName_placeholder')} maxLength={100} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="profile-email" className="text-sm font-medium text-gray-700">{t('dashboard.profile_email')}</label>
                        <input id="profile-email" type="email" value={email} readOnly className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} />
                        <p className="text-xs text-gray-400">{t('dashboard.profile_email_hint')}</p>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="profile-phone" className="text-sm font-medium text-gray-700">{t('dashboard.profile_phone')}</label>
                        <div className="flex">
                            <div className="flex items-center gap-1.5 h-[52px] px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-600 shrink-0">
                                <span className="text-lg">{selectedCountry?.flag ?? ''}</span>
                                <span className="font-medium">{selectedCountry?.dialCode ?? '+...'}</span>
                            </div>
                            <input id="profile-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('dashboard.profile_phone_placeholder')} maxLength={25} className="flex-1 h-[52px] px-4 bg-white border border-gray-300 rounded-r-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200" />
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Section 2: Localisation */}
            <SectionCard icon={MapPin} title={t('dashboard.profile_location')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <CountrySelect
                        label={t('dashboard.profile_country')}
                        value={country}
                        onChange={setCountry}
                        placeholder={t('dashboard.profile_country_placeholder')}
                    />
                    <div className="space-y-1.5">
                        <label htmlFor="profile-city" className="text-sm font-medium text-gray-700">{t('dashboard.profile_city')}</label>
                        <input id="profile-city" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder={t('dashboard.profile_city_placeholder')} maxLength={100} className={inputClass} />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                        <label htmlFor="profile-address" className="text-sm font-medium text-gray-700">{t('dashboard.profile_address')}</label>
                        <input id="profile-address" type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('dashboard.profile_address_placeholder')} maxLength={255} className={inputClass} />
                    </div>
                </div>
            </SectionCard>

            {/* Section 3: Profil professionnel */}
            <SectionCard icon={Briefcase} title={t('dashboard.profile_professional')}>
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label htmlFor="profile-title" className="text-sm font-medium text-gray-700">{t('dashboard.profile_title_label')}</label>
                        <input id="profile-title" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('dashboard.profile_title_placeholder')} maxLength={120} className={inputClass} />
                        <div className="flex justify-between">
                            <p className="text-xs text-gray-400">{t('dashboard.profile_title_hint')}</p>
                            <p className="text-xs text-gray-400">{title.length}/120</p>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="profile-bio" className="text-sm font-medium text-gray-700">{t('dashboard.profile_bio')}</label>
                        <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value)} placeholder={t('dashboard.profile_bio_placeholder')} maxLength={2000} className={textareaClass} />
                        <p className="text-xs text-gray-400 text-right">{bio.length}/2000</p>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="profile-yearsOfExperience" className="text-sm font-medium text-gray-700">{t('dashboard.profile_years_exp')}</label>
                        <input id="profile-yearsOfExperience" type="number" value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value ? parseInt(e.target.value, 10) : '')} placeholder="7" min={0} max={50} className={inputClass} />
                    </div>
                </div>
            </SectionCard>

            {/* Section 3: Liens */}
            <SectionCard icon={Link2} title={t('dashboard.profile_links')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label htmlFor="profile-linkedinUrl" className="text-sm font-medium text-gray-700">{t('dashboard.profile_linkedin')}</label>
                        <input id="profile-linkedinUrl" type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder={t('dashboard.profile_linkedin_placeholder')} maxLength={500} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="profile-websiteUrl" className="text-sm font-medium text-gray-700">{t('dashboard.profile_website')}</label>
                        <input id="profile-websiteUrl" type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder={t('dashboard.profile_website_placeholder')} maxLength={500} className={inputClass} />
                    </div>
                </div>
            </SectionCard>

            {/* Section 4: Compétences & Langues */}
            <SectionCard icon={Sparkles} title={t('dashboard.profile_skills_languages')}>
                <div className="space-y-6">
                    <TagInput label={t('dashboard.profile_skills_label')} value={skills} onChange={setSkills} placeholder={t('dashboard.profile_skills_placeholder')} maxTags={15} />
                    <TagInput label={t('dashboard.profile_languages_label')} value={languages} onChange={setLanguages} placeholder={t('dashboard.profile_languages_placeholder')} maxTags={10} />
                </div>
            </SectionCard>

            {/* Section 5: Parcours professionnel */}
            <SectionCard icon={Briefcase} title={t('dashboard.profile_work_experience')}>
                <ExperienceList value={experience} onChange={setExperience} />
            </SectionCard>

            {/* Section 6: Formation */}
            <SectionCard icon={GraduationCap} title={t('dashboard.profile_education')}>
                <EducationList value={education} onChange={setEducation} />
            </SectionCard>

            {/* Bouton global de sauvegarde */}
            <div className="sticky bottom-6 flex justify-end">
                <button
                    type="button"
                    onClick={saveAll}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 h-[52px] bg-kezak-primary text-white rounded-xl font-semibold hover:bg-kezak-dark transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-kezak-primary/25"
                >
                    <span className="w-5 h-5 inline-flex items-center justify-center">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </span>
                    <span>{t('dashboard.profile_save')}</span>
                </button>
            </div>
        </div>
    );
}
