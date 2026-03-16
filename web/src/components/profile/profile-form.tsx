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
    const { showToast } = useToast();
    const fp = user.founderProfile || {};

    // Section 1: Infos personnelles
    const [firstName, setFirstName] = useState(user.firstName || '');
    const [lastName, setLastName] = useState(user.lastName || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [country, setCountry] = useState(fp.country || '');
    const [city, setCity] = useState(fp.city || '');
    const [address, setAddress] = useState(user.address || '');

    // Section 2: Profil pro
    const [title, setTitle] = useState(fp.title || '');
    const [bio, setBio] = useState(fp.bio || '');
    const [yearsOfExperience, setYearsOfExperience] = useState<number | ''>(fp.yearsOfExperience ?? '');

    // Section 3: Liens
    const [linkedinUrl, setLinkedinUrl] = useState(fp.linkedinUrl || '');
    const [websiteUrl, setWebsiteUrl] = useState(fp.websiteUrl || '');

    // Section 4: Compétences & Langues
    const [skills, setSkills] = useState<string[]>(fp.skills || []);
    const [languages, setLanguages] = useState<string[]>(fp.languages || []);

    // Section 5: Expériences
    const [experience, setExperience] = useState<ExperienceItem[]>(
        fp.experience?.map((e: any) => ({
            role: e.role || '', company: e.company || '',
            startYear: e.startYear || '', endYear: e.endYear ?? '',
        })) || []
    );

    // Section 6: Formation
    const [education, setEducation] = useState<EducationItem[]>(
        fp.education?.map((e: any) => ({
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
            const founderProfile = {
                title, bio, country, city, linkedinUrl, websiteUrl, skills, languages,
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
            };
            await AXIOS_INSTANCE.patch('/users/profile', {
                firstName, lastName, email, phone, address,
                founderProfile,
            });

            // Refetch full profile (with relations) to update UI
            const { data: freshProfile } = await AXIOS_INSTANCE.get('/users/profile');
            onSaved?.(freshProfile);
            showToast('Profil mis à jour avec succès', 'success');
        } catch {
            showToast('Erreur lors de la sauvegarde', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Section 1: Infos personnelles */}
            <SectionCard icon={User} title="Informations personnelles">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Prénom</label>
                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Votre prénom" className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Nom</label>
                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Votre nom" className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Téléphone</label>
                        <div className="flex">
                            <div className="flex items-center gap-1.5 h-[52px] px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-600 shrink-0">
                                <span className="text-lg">{selectedCountry?.flag ?? ''}</span>
                                <span className="font-medium">{selectedCountry?.dialCode ?? '+...'}</span>
                            </div>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="6XX XXX XXX" className="flex-1 h-[52px] px-4 bg-white border border-gray-300 rounded-r-lg text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200" />
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* Section 2: Localisation */}
            <SectionCard icon={MapPin} title="Localisation">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <CountrySelect
                        label="Pays"
                        value={country}
                        onChange={setCountry}
                        placeholder="Sélectionner un pays..."
                    />
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Ville</label>
                        <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Douala" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Adresse</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Quartier, rue..." className={inputClass} />
                    </div>
                </div>
            </SectionCard>

            {/* Section 3: Profil professionnel */}
            <SectionCard icon={Briefcase} title="Profil professionnel">
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Titre professionnel</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Serial Entrepreneur | Fintech & EdTech" className={inputClass} />
                        <p className="text-xs text-gray-400">Ce titre apparaît dans votre CV sur les pages projets</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Bio</label>
                        <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Présentez-vous en quelques phrases..." maxLength={500} className={textareaClass} />
                        <p className="text-xs text-gray-400 text-right">{bio.length}/500</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Années d&apos;expérience</label>
                        <input type="number" value={yearsOfExperience} onChange={e => setYearsOfExperience(e.target.value ? parseInt(e.target.value, 10) : '')} placeholder="7" min={0} max={50} className={inputClass} />
                    </div>
                </div>
            </SectionCard>

            {/* Section 3: Liens */}
            <SectionCard icon={Link2} title="Liens">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">LinkedIn</label>
                        <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Site web</label>
                        <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." className={inputClass} />
                    </div>
                </div>
            </SectionCard>

            {/* Section 4: Compétences & Langues */}
            <SectionCard icon={Sparkles} title="Compétences et langues">
                <div className="space-y-6">
                    <TagInput label="Compétences" value={skills} onChange={setSkills} placeholder="Ex: Product Management, React..." maxTags={15} />
                    <TagInput label="Langues" value={languages} onChange={setLanguages} placeholder="Ex: Français, Anglais..." maxTags={10} />
                </div>
            </SectionCard>

            {/* Section 5: Parcours professionnel */}
            <SectionCard icon={Briefcase} title="Parcours professionnel">
                <ExperienceList value={experience} onChange={setExperience} />
            </SectionCard>

            {/* Section 6: Formation */}
            <SectionCard icon={GraduationCap} title="Formation">
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
                    <span>Enregistrer le profil</span>
                </button>
            </div>
        </div>
    );
}
