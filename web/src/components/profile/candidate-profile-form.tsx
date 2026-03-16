'use client';

import { useState } from 'react';
import {
    Loader2, Save, Briefcase, User, Sparkles,
    Target, Clock, Handshake, MessageSquare, MapPin,
    CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';
import { TagInput } from '@/components/ui/tag-input';

// ─── Shared styles ───────────────────────────────────

const inputClass = 'w-full h-[52px] px-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200';
const selectClass = 'w-full h-[52px] px-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-base hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200';
const textareaClass = 'w-full min-h-[120px] p-4 bg-white border border-gray-300 rounded-xl text-gray-900 text-base placeholder:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary transition-all duration-200 resize-y';

function SectionCard({ icon: Icon, title, badge, children }: {
    icon: any; title: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-kezak-light flex items-center justify-center">
                    <Icon className="w-5 h-5 text-kezak-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                {badge && <div className="ml-auto">{badge}</div>}
            </div>
            {children}
        </div>
    );
}

function ToggleGroup({ options, value, onChange }: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex gap-3 flex-wrap">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${value === opt.value
                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ─── Status badge ────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { icon: any; label: string; className: string }> = {
        PUBLISHED: { icon: CheckCircle, label: 'Publié', className: 'bg-green-50 text-green-700 border-green-200' },
        ANALYZING: { icon: RefreshCw, label: 'En analyse', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        PENDING_AI: { icon: AlertCircle, label: 'En vérification', className: 'bg-orange-50 text-orange-700 border-orange-200' },
        DRAFT: { icon: AlertCircle, label: 'Brouillon', className: 'bg-gray-50 text-gray-600 border-gray-200' },
        REJECTED: { icon: AlertCircle, label: 'Rejeté', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const c = config[status] || config.DRAFT;
    const Icon = c.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${c.className}`}>
            <Icon className={`w-3.5 h-3.5 ${status === 'ANALYZING' ? 'animate-spin' : ''}`} />
            {c.label}
        </span>
    );
}

// ─── Completeness bar ────────────────────────────────

function CompletenessBar({ value }: { value: number }) {
    const pct = Math.round(value);
    const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
                <span className="text-gray-500">Complétude du profil</span>
                <span className="font-semibold text-gray-900">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

// ─── Main form ───────────────────────────────────────

interface CandidateProfileFormProps {
    user: any;
    onSaved?: (data: any) => void;
}

export function CandidateProfileForm({ user, onSaved }: CandidateProfileFormProps) {
    const { showToast } = useToast();
    const cp = user.candidateProfile || {};

    // ─── Personal info (from User)
    const [firstName, setFirstName] = useState(user.firstName || '');
    const [lastName, setLastName] = useState(user.lastName || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');

    // ─── Expertise & Profil
    const [title, setTitle] = useState(cp.title || '');
    const [bio, setBio] = useState(cp.bio || '');
    const [skills, setSkills] = useState<string[]>(cp.skills || []);
    const [yearsExp, setYearsExp] = useState(() => {
        const y = cp.yearsOfExperience;
        if (!y && y !== 0) return '';
        if (y <= 2) return '0-2';
        if (y <= 5) return '3-5';
        if (y <= 10) return '6-10';
        return '10+';
    });
    const [roleType, setRoleType] = useState(cp.roleType || '');

    // ─── Vision
    const [vision, setVision] = useState(cp.vision || '');
    const [hasCofounded, setHasCofounded] = useState(cp.hasCofounded || '');
    const [projectPref, setProjectPref] = useState(cp.desiredSectors?.[0] || '');

    // ─── Disponibilité
    const [availability, setAvailability] = useState(cp.availability || '');
    const [commitmentType, setCommitmentType] = useState(cp.commitmentType || '');

    // ─── Conditions
    const [collabPref, setCollabPref] = useState(cp.collabPref || '');
    const [locationPref, setLocationPref] = useState(() => {
        if (cp.remoteOnly) return 'REMOTE';
        return cp.locationPref || '';
    });

    // ─── Pitch
    const [shortPitch, setShortPitch] = useState(cp.shortPitch || '');
    const [longPitch, setLongPitch] = useState(cp.longPitch || '');

    // ─── Extra fields from CandidateProfile model
    const [location, setLocation] = useState(cp.location || '');
    const [linkedinUrl, setLinkedinUrl] = useState(cp.linkedinUrl || '');
    const [githubUrl, setGithubUrl] = useState(cp.githubUrl || '');
    const [portfolioUrl, setPortfolioUrl] = useState(cp.portfolioUrl || '');
    const [languages, setLanguages] = useState<string[]>(cp.languages || []);
    const [certifications, setCertifications] = useState<string[]>(cp.certifications || []);

    const [isSaving, setIsSaving] = useState(false);

    const saveAll = async () => {
        setIsSaving(true);
        try {
            // 1. Save user personal info
            await AXIOS_INSTANCE.patch('/users/profile', {
                firstName, lastName, email, phone,
            });

            // 2. Save candidate profile via PATCH
            await AXIOS_INSTANCE.patch('/users/candidate-profile', {
                title,
                bio,
                shortPitch,
                longPitch,
                skills,
                languages,
                certifications,
                location,
                linkedinUrl,
                githubUrl,
                portfolioUrl,
                yearsExp,
                vision,
                locationPref,
                availability,
                collabPref,
                projectPref,
                roleType,
                commitmentType,
                hasCofounded,
            });

            // 3. Refresh profile data
            const { data } = await AXIOS_INSTANCE.get('/users/profile');
            onSaved?.(data);
            showToast('Profil mis à jour avec succès', 'success');
        } catch {
            showToast('Erreur lors de la sauvegarde', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* ─── Section: Informations personnelles ─── */}
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
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Localisation</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Douala, Cameroun" className={inputClass} />
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: Expertise & Profil ─── */}
            <SectionCard icon={Briefcase} title="Expertise & Profil">
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Titre professionnel</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Senior React Developer, CTO, Growth Hacker..." className={inputClass} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Rôle principal</label>
                            <select value={roleType} onChange={e => setRoleType(e.target.value)} className={selectClass}>
                                <option value="">Sélectionner...</option>
                                <option value="TECH">CTO / Tech</option>
                                <option value="PRODUCT">CPO / Product</option>
                                <option value="MARKETING">CMO / Marketing</option>
                                <option value="OPS">COO / Operations</option>
                                <option value="FINANCE">CFO / Finance</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Expérience</label>
                            <select value={yearsExp} onChange={e => setYearsExp(e.target.value)} className={selectClass}>
                                <option value="">Sélectionner...</option>
                                <option value="0-2">0-2 ans (Junior)</option>
                                <option value="3-5">3-5 ans (Confirmé)</option>
                                <option value="6-10">6-10 ans (Senior)</option>
                                <option value="10+">10+ ans (Expert)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Bio</label>
                        <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Présentez-vous en quelques phrases..." maxLength={600} className={textareaClass} />
                        <p className="text-xs text-gray-400 text-right">{bio.length}/600</p>
                    </div>

                    <TagInput label="Compétences" value={skills} onChange={setSkills} placeholder="Ex: React, Node.js, Product Management..." maxTags={15} />
                    <TagInput label="Langues" value={languages} onChange={setLanguages} placeholder="Ex: Français, Anglais..." maxTags={10} />
                    <TagInput label="Certifications" value={certifications} onChange={setCertifications} placeholder="Ex: AWS Certified, PMP..." maxTags={10} />
                </div>
            </SectionCard>

            {/* ─── Section: Vision & Projet recherché ─── */}
            <SectionCard icon={Target} title="Vision & Projet recherché">
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Avez-vous déjà cofondé ?</label>
                        <ToggleGroup
                            options={[
                                { value: 'YES', label: 'Oui, déjà fait' },
                                { value: 'NO', label: 'Non, première fois' },
                            ]}
                            value={hasCofounded}
                            onChange={setHasCofounded}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Vision personnelle à 3-5 ans</label>
                        <textarea value={vision} onChange={e => setVision(e.target.value)} placeholder="Décrivez votre ambition à moyen terme..." maxLength={500} className={textareaClass} />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Type de projet recherché</label>
                        <select value={projectPref} onChange={e => setProjectPref(e.target.value)} className={selectClass}>
                            <option value="">Sélectionner...</option>
                            <option value="TECH">Tech pure (SaaS, Mobile)</option>
                            <option value="HYBRID">Hybride (Tech + Retail/Ops)</option>
                            <option value="IMPACT">Impact Social</option>
                            <option value="ANY">Peu importe tant que c'est ambitieux</option>
                        </select>
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: Disponibilité ─── */}
            <SectionCard icon={Clock} title="Disponibilité">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Temps disponible (Hebdo)</label>
                        <select value={availability} onChange={e => setAvailability(e.target.value)} className={selectClass}>
                            <option value="">Sélectionner...</option>
                            <option value="2-5H">2-5h (Soirs & WE)</option>
                            <option value="5-10H">5-10h</option>
                            <option value="10-20H">10-20h (Mi-temps)</option>
                            <option value="FULLTIME">Temps plein</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Type d'engagement visé</label>
                        <select value={commitmentType} onChange={e => setCommitmentType(e.target.value)} className={selectClass}>
                            <option value="">Sélectionner...</option>
                            <option value="SIDE">Side Project</option>
                            <option value="SERIOUS">Sérieux (Obj. Full-time)</option>
                            <option value="FULLTIME">Full-time immédiat</option>
                        </select>
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: Conditions de collaboration ─── */}
            <SectionCard icon={Handshake} title="Conditions de collaboration">
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Type de collaboration recherchée</label>
                        <ToggleGroup
                            options={[
                                { value: 'EQUITY', label: 'Parts (Associé)' },
                                { value: 'PAID', label: 'Mission rémunérée' },
                                { value: 'HYBRID', label: 'Mixte' },
                                { value: 'DISCUSS', label: 'À discuter' },
                            ]}
                            value={collabPref}
                            onChange={setCollabPref}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Préférence de localisation</label>
                        <ToggleGroup
                            options={[
                                { value: 'REMOTE', label: 'Remote' },
                                { value: 'HYBRID', label: 'Hybride' },
                                { value: 'ONSITE', label: 'Présentiel' },
                            ]}
                            value={locationPref}
                            onChange={setLocationPref}
                        />
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: Pitch ─── */}
            <SectionCard icon={MessageSquare} title="Pitch">
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Pitch court</label>
                        <textarea
                            value={shortPitch}
                            onChange={e => setShortPitch(e.target.value)}
                            placeholder="Expert React cherchant CTO ambitieux sur projet Fintech..."
                            maxLength={280}
                            className={`${textareaClass} min-h-[80px]`}
                        />
                        <p className="text-xs text-gray-400 text-right">{shortPitch.length}/280</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Message libre</label>
                        <textarea
                            value={longPitch}
                            onChange={e => setLongPitch(e.target.value)}
                            placeholder="Ce qui n'est pas dans le CV : votre motivation, votre histoire..."
                            className={textareaClass}
                        />
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: Liens ─── */}
            <SectionCard icon={MapPin} title="Liens professionnels">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">LinkedIn</label>
                        <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">GitHub</label>
                        <input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/..." className={inputClass} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium text-gray-700">Portfolio</label>
                        <input type="url" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} placeholder="https://..." className={inputClass} />
                    </div>
                </div>
            </SectionCard>

            {/* ─── Save button ─── */}
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

export { StatusBadge, CompletenessBar };
