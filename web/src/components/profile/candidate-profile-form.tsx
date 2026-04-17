'use client';

import { useState } from 'react';
import {
    Loader2, Save,
    Target, Clock, Handshake, MessageSquare, FileText,
    CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { useToast } from '@/context/toast-context';
import { useTranslation } from '@/context/i18n-context';

// ─── Shared styles ───────────────────────────────────

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
                {badge && <div className="ms-auto">{badge}</div>}
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
    const { t } = useTranslation();
    const config: Record<string, { icon: any; labelKey: string; className: string }> = {
        PUBLISHED: { icon: CheckCircle, labelKey: 'dashboard.candidate_status_published', className: 'bg-green-50 text-green-700 border-green-200' },
        ANALYZING: { icon: RefreshCw, labelKey: 'dashboard.candidate_status_analyzing', className: 'bg-amber-50 text-amber-700 border-amber-200' },
        PENDING_AI: { icon: AlertCircle, labelKey: 'dashboard.candidate_status_pending_ai', className: 'bg-orange-50 text-orange-700 border-orange-200' },
        DRAFT: { icon: AlertCircle, labelKey: 'dashboard.candidate_status_draft', className: 'bg-gray-50 text-gray-600 border-gray-200' },
        REJECTED: { icon: AlertCircle, labelKey: 'dashboard.candidate_status_rejected', className: 'bg-red-50 text-red-700 border-red-200' },
    };
    const c = config[status] || config.DRAFT;
    const Icon = c.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${c.className}`}>
            <Icon className={`w-3.5 h-3.5 ${status === 'ANALYZING' ? 'animate-spin' : ''}`} />
            {t(c.labelKey)}
        </span>
    );
}

// ─── Completeness bar ────────────────────────────────

function CompletenessBar({ value }: { value: number }) {
    const { t } = useTranslation();
    const pct = Math.round(value);
    const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('dashboard.candidate_completeness')}</span>
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
    const { t } = useTranslation();
    const { showToast } = useToast();
    const cp = user.candidateProfile || {};

    // ─── Candidate-specific fields only
    const [roleType, setRoleType] = useState(cp.roleType || '');
    const [vision, setVision] = useState(cp.vision || '');
    const [hasCofounded, setHasCofounded] = useState(cp.hasCofounded || '');
    const [projectPref, setProjectPref] = useState<string[]>(cp.desiredSectors || []);
    const [availability, setAvailability] = useState(cp.availability || '');
    const [commitmentType, setCommitmentType] = useState(cp.commitmentType || '');
    const [collabPref, setCollabPref] = useState(cp.collabPref || '');
    const [locationPref, setLocationPref] = useState(() => {
        if (cp.remoteOnly) return 'REMOTE';
        return cp.locationPref || '';
    });
    const [shortPitch, setShortPitch] = useState(cp.shortPitch || '');
    const [longPitch, setLongPitch] = useState(cp.longPitch || '');
    const [resumeUrl, setResumeUrl] = useState(cp.resumeUrl || '');

    const [isSaving, setIsSaving] = useState(false);

    const saveAll = async () => {
        setIsSaving(true);
        try {
            await AXIOS_INSTANCE.patch('/users/candidate-profile', {
                shortPitch,
                longPitch,
                vision,
                locationPref,
                availability,
                collabPref,
                projectPref,
                roleType,
                commitmentType,
                hasCofounded,
                resumeUrl: resumeUrl || undefined,
            });

            const { data } = await AXIOS_INSTANCE.get('/users/profile');
            onSaved?.(data);
            showToast(t('dashboard.candidate_save_success'), 'success');
        } catch {
            showToast(t('dashboard.candidate_save_error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* ─── Section: Vision & Projet recherché ─── */}
            <SectionCard icon={Target} title={t('dashboard.candidate_vision_title')}>
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label htmlFor="candidate-roleType" className="text-sm font-medium text-gray-700">{t('dashboard.candidate_role_type')}</label>
                        <select id="candidate-roleType" value={roleType} onChange={e => setRoleType(e.target.value)} className={selectClass}>
                            <option value="">{t('dashboard.candidate_role_select')}</option>
                            <option value="TECH">{t('dashboard.candidate_role_tech')}</option>
                            <option value="PRODUCT">{t('dashboard.candidate_role_product')}</option>
                            <option value="MARKETING">{t('dashboard.candidate_role_marketing')}</option>
                            <option value="OPS">{t('dashboard.candidate_role_ops')}</option>
                            <option value="FINANCE">{t('dashboard.candidate_role_finance')}</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">{t('dashboard.candidate_has_cofounded')}</label>
                        <ToggleGroup
                            options={[
                                { value: 'YES', label: t('dashboard.candidate_cofounded_yes') },
                                { value: 'NO', label: t('dashboard.candidate_cofounded_no') },
                            ]}
                            value={hasCofounded}
                            onChange={setHasCofounded}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="candidate-vision" className="text-sm font-medium text-gray-700">{t('dashboard.candidate_vision')}</label>
                        <textarea id="candidate-vision" value={vision} onChange={e => setVision(e.target.value)} placeholder={t('dashboard.candidate_vision_placeholder')} maxLength={500} className={textareaClass} />
                        <p className="text-xs text-gray-400 text-right">{vision.length}/500</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                            {t('dashboard.candidate_project_type')}
                            <span className="text-gray-400 font-normal ms-1">{t('dashboard.candidate_project_type_hint')}</span>
                        </label>
                        <div className="flex gap-3 flex-wrap">
                            {[
                                { value: 'TECH', label: t('dashboard.candidate_project_tech') },
                                { value: 'HYBRID', label: t('dashboard.candidate_project_hybrid') },
                                { value: 'IMPACT', label: t('dashboard.candidate_project_impact') },
                                { value: 'ANY', label: t('dashboard.candidate_project_any') },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        setProjectPref(prev => {
                                            const idx = prev.indexOf(opt.value);
                                            return idx >= 0 ? prev.filter(v => v !== opt.value) : [...prev, opt.value];
                                        });
                                    }}
                                    className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl border text-sm font-medium transition-all ${projectPref.includes(opt.value)
                                        ? 'border-kezak-primary bg-kezak-primary/10 text-kezak-primary'
                                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: Disponibilité ─── */}
            <SectionCard icon={Clock} title={t('dashboard.candidate_availability_title')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label htmlFor="candidate-availability" className="text-sm font-medium text-gray-700">{t('dashboard.candidate_time_label')}</label>
                        <select id="candidate-availability" value={availability} onChange={e => setAvailability(e.target.value)} className={selectClass}>
                            <option value="">{t('dashboard.candidate_time_select')}</option>
                            <option value="2-5H">{t('dashboard.candidate_time_2_5')}</option>
                            <option value="5-10H">{t('dashboard.candidate_time_5_10')}</option>
                            <option value="10-20H">{t('dashboard.candidate_time_10_20')}</option>
                            <option value="FULLTIME">{t('dashboard.candidate_time_fulltime')}</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="candidate-commitmentType" className="text-sm font-medium text-gray-700">{t('dashboard.candidate_commitment_label')}</label>
                        <select id="candidate-commitmentType" value={commitmentType} onChange={e => setCommitmentType(e.target.value)} className={selectClass}>
                            <option value="">{t('dashboard.candidate_commitment_select')}</option>
                            <option value="SIDE">{t('dashboard.candidate_commitment_side')}</option>
                            <option value="SERIOUS">{t('dashboard.candidate_commitment_serious')}</option>
                            <option value="FULLTIME">{t('dashboard.candidate_commitment_fulltime')}</option>
                        </select>
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: Conditions de collaboration ─── */}
            <SectionCard icon={Handshake} title={t('dashboard.candidate_collab_title')}>
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">{t('dashboard.candidate_collab_type')}</label>
                        <ToggleGroup
                            options={[
                                { value: 'EQUITY', label: t('dashboard.candidate_collab_equity') },
                                { value: 'PAID', label: t('dashboard.candidate_collab_paid') },
                                { value: 'HYBRID', label: t('dashboard.candidate_collab_hybrid') },
                                { value: 'DISCUSS', label: t('dashboard.candidate_collab_discuss') },
                            ]}
                            value={collabPref}
                            onChange={setCollabPref}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">{t('dashboard.candidate_location_pref')}</label>
                        <ToggleGroup
                            options={[
                                { value: 'REMOTE', label: t('dashboard.candidate_location_remote') },
                                { value: 'HYBRID', label: t('dashboard.candidate_location_hybrid') },
                                { value: 'ONSITE', label: t('dashboard.candidate_location_onsite') },
                            ]}
                            value={locationPref}
                            onChange={setLocationPref}
                        />
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: Pitch ─── */}
            <SectionCard icon={MessageSquare} title={t('dashboard.candidate_pitch_title')}>
                <div className="space-y-6">
                    <div className="space-y-1.5">
                        <label htmlFor="candidate-shortPitch" className="text-sm font-medium text-gray-700">{t('dashboard.candidate_short_pitch')}</label>
                        <textarea
                            id="candidate-shortPitch"
                            value={shortPitch}
                            onChange={e => setShortPitch(e.target.value)}
                            placeholder={t('dashboard.candidate_short_pitch_placeholder')}
                            maxLength={280}
                            className={`${textareaClass} min-h-[80px]`}
                        />
                        <p className="text-xs text-gray-400 text-right">{shortPitch.length}/280</p>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="candidate-longPitch" className="text-sm font-medium text-gray-700">{t('dashboard.candidate_long_pitch')}</label>
                        <textarea
                            id="candidate-longPitch"
                            value={longPitch}
                            onChange={e => setLongPitch(e.target.value)}
                            placeholder={t('dashboard.candidate_long_pitch_placeholder')}
                            maxLength={2000}
                            className={textareaClass}
                        />
                        <p className="text-xs text-gray-400 text-right">{longPitch.length}/2000</p>
                    </div>
                </div>
            </SectionCard>

            {/* ─── Section: CV / Resume ─── */}
            <SectionCard icon={FileText} title={t('dashboard.candidate_cv_title')}>
                <div className="space-y-1.5">
                    <label htmlFor="candidate-resumeUrl" className="text-sm font-medium text-gray-700">{t('dashboard.candidate_cv_link')}</label>
                    <input
                        id="candidate-resumeUrl"
                        type="url"
                        value={resumeUrl}
                        onChange={e => setResumeUrl(e.target.value)}
                        placeholder={t('dashboard.candidate_cv_placeholder')}
                        maxLength={500}
                        className="w-full border border-gray-300 rounded-xl py-3 px-4 focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary focus:outline-none bg-white"
                    />
                    <p className="text-xs text-gray-400">{t('dashboard.candidate_cv_hint')}</p>
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
                    <span>{t('dashboard.candidate_save')}</span>
                </button>
            </div>
        </div>
    );
}

export { StatusBadge, CompletenessBar };
