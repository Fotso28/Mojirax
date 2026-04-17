'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Loader2, ArrowLeft, MapPin, Briefcase, Mail, Phone, Globe,
    Linkedin, GraduationCap, Calendar, User, ExternalLink,
    Sparkles, Share2, CheckCircle2, MessageCircle, Lock,
} from 'lucide-react';
import { useStartConversation } from '@/hooks/use-start-conversation';
import { useAuth } from '@/context/auth-context';
import { useUpsell } from '@/context/upsell-context';
import { logger } from '@/lib/logger';
import { getSectorLabel } from '@/lib/constants/sectors';
import { AXIOS_INSTANCE } from '@/api/axios-instance';
import { COUNTRIES } from '@/lib/constants/countries';
import { useTranslation, useLocale } from '@/context/i18n-context';
import { formatDate } from '@/lib/utils/format-date';

import { useToast } from '@/context/toast-context';
import { cn } from '@/lib/utils';
import { PlanBadge } from '@/components/ui';

export default function FounderPublicProfilePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { dbUser } = useAuth();
    const { t } = useTranslation();
    const locale = useLocale();
    const { startConversation, loading: messageLoading } = useStartConversation();
    const { openUpsell } = useUpsell();
    const isFreeUser = !dbUser?.plan || dbUser.plan === 'FREE';
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ---- Labels ----
    const STAGE_LABELS = useMemo<Record<string, string>>(() => ({
        IDEA: t('dashboard.stage_idea'), PROTOTYPE: t('dashboard.stage_prototype'), MVP_BUILD: t('dashboard.stage_mvp_build'),
        MVP_LIVE: t('dashboard.stage_mvp_live'), TRACTION: t('dashboard.stage_traction'), SCALE: t('dashboard.stage_scale'),
    }), [t]);

    const ROLE_LABELS = useMemo<Record<string, string>>(() => ({
        TECH: t('dashboard.role_tech'), BIZ: t('dashboard.role_biz'), PRODUCT: t('dashboard.role_product'), FINANCE: t('dashboard.role_finance'),
    }), [t]);

    const ROLE_BADGE = useMemo<Record<string, string>>(() => ({
        ADMIN: t('common.admin'), USER: t('common.member'),
    }), [t]);

    const formatRoleLabels = (lookingForRole: string): string => {
        return lookingForRole.split(',').filter(Boolean)
            .map((r) => ROLE_LABELS[r] || r).join(', ');
    };

    const timeAgo = (dateStr: string): string => {
        const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (seconds < 60) return t('common.time_just_now');
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return t('common.time_minutes_ago', { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('common.time_hours_ago', { count: hours });
        const days = Math.floor(hours / 24);
        if (days < 30) return t('common.time_days_ago', { count: days });
        return t('common.time_months_ago', { count: Math.floor(days / 30) });
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await AXIOS_INSTANCE.get(`/users/${id}/public`);
                setUser(data);
            } catch {
                logger.error('Failed to load public profile');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-kezak-primary animate-spin" />
            </div>
        );
    }

    const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
    const goBack = () => router.back();

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <User className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">{t('dashboard.founder_profile_not_found')}</p>
                {canGoBack && (
                    <button onClick={goBack} className="text-kezak-primary font-semibold hover:underline">
                        {t('common.back')}
                    </button>
                )}
            </div>
        );
    }

    const profile = user; // Professional fields are now directly on User
    const displayName = user.name
        || [user.firstName, user.lastName].filter(Boolean).join(' ')
        || t('common.member');
    const locationParts = [profile.city, profile.country].filter(Boolean);
    const locationStr = locationParts.length > 0 ? locationParts.join(', ') : null;
    const founderCountry = profile.country
        ? COUNTRIES.find(c => c.label === profile.country || c.code === profile.country)
        : null;
    const phoneDisplay = user.phone
        ? `${founderCountry?.dialCode || ''} ${user.phone}`.trim()
        : null;
    const memberSince = user.createdAt
        ? formatDate(user.createdAt, locale, { month: 'long', year: 'numeric' })
        : null;
    const hasLinks = profile.linkedinUrl || profile.websiteUrl;
    const projects = user.projects || [];

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href);
        showToast(t('dashboard.founder_link_copied'), 'success');
    };

    return (
        <div className="max-w-4xl mx-auto py-4 lg:py-6 space-y-6">

            {/* --- HERO --- */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                {/* Gradient banner */}
                <div className="relative h-36 sm:h-44 bg-gradient-to-br from-kezak-dark via-kezak-primary to-blue-400">
                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
                        {canGoBack ? (
                            <button onClick={goBack} className="p-2 -ml-1 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        ) : <div />}
                        <button onClick={handleShare} className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
                    <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/5 rounded-full" />
                </div>

                {/* Avatar + Identity */}
                <div className="relative px-6 sm:px-8 pb-6">
                    {/* Avatar overlapping banner */}
                    <div className="-mt-16 mb-4 flex items-end gap-5">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg shrink-0 bg-gray-100">
                            {user.image ? (
                                <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-kezak-light to-blue-100 flex items-center justify-center">
                                    <User className="w-12 h-12 text-kezak-primary/40" />
                                </div>
                            )}
                        </div>
                        <div className="pb-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{displayName}</h1>
                                <CheckCircle2 className="w-6 h-6 text-blue-500 fill-blue-50 shrink-0" />
                                <PlanBadge plan={user.plan} />
                            </div>
                            {profile.title && (
                                <p className="text-base text-gray-600 mt-1 leading-snug">{profile.title}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                    {ROLE_BADGE[user.role] || t('common.member')}
                                </span>
                                {memberSince && (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                        <Calendar className="w-3 h-3" />
                                        {t('common.member_since', { date: memberSince })}
                                    </span>
                                )}
                            </div>
                            {dbUser && dbUser.id !== user.id && (
                                <button
                                    onClick={() => isFreeUser ? openUpsell('send_message') : startConversation(user.id)}
                                    disabled={messageLoading}
                                    className="flex items-center gap-2 px-5 h-[44px] rounded-xl text-sm font-semibold bg-kezak-primary text-white hover:bg-kezak-primary/90 transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-3"
                                >
                                    {isFreeUser ? <Lock className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                                    {t('common.send_message')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Contact & Location chips */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {locationStr && (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {founderCountry?.flag && <span className="text-base">{founderCountry.flag}</span>}
                                {locationStr}
                            </span>
                        )}
                        {profile.yearsOfExperience != null && (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                {t('common.years_exp', { count: profile.yearsOfExperience })}
                            </span>
                        )}
                        {user.email ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                {user.email}
                            </span>
                        ) : user._isLocked && (
                            <Link href="/settings/billing" className="inline-flex items-center gap-1.5 text-sm font-medium text-kezak-primary bg-kezak-light/50 px-3 py-1.5 rounded-full border border-kezak-primary/20 hover:bg-kezak-light transition-colors">
                                <Lock className="w-3.5 h-3.5" />
                                {t('common.email_hidden')}
                            </Link>
                        )}
                        {phoneDisplay ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                {phoneDisplay}
                            </span>
                        ) : user._isLocked && (
                            <Link href="/settings/billing" className="inline-flex items-center gap-1.5 text-sm font-medium text-kezak-primary bg-kezak-light/50 px-3 py-1.5 rounded-full border border-kezak-primary/20 hover:bg-kezak-light transition-colors">
                                <Lock className="w-3.5 h-3.5" />
                                {t('common.phone_hidden')}
                            </Link>
                        )}
                    </div>

                    {/* Social links */}
                    {hasLinks ? (
                        <div className="flex items-center gap-2 mt-4">
                            {profile.linkedinUrl && (
                                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] text-sm font-medium hover:bg-[#0A66C2]/20 transition-all">
                                    <Linkedin className="w-4 h-4" />
                                    {t('common.linkedin')}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            {profile.websiteUrl && (
                                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-kezak-primary/10 text-kezak-primary text-sm font-medium hover:bg-kezak-primary/20 transition-all">
                                    <Globe className="w-4 h-4" />
                                    {t('common.website')}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    ) : user._isLocked && (
                        <Link
                            href="/settings/billing"
                            className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-kezak-light/50 border border-kezak-primary/10 hover:bg-kezak-light hover:border-kezak-primary/20 transition-all group"
                        >
                            <div className="w-9 h-9 rounded-lg bg-kezak-primary/10 flex items-center justify-center shrink-0 group-hover:bg-kezak-primary/15 transition-colors">
                                <Lock className="w-4 h-4 text-kezak-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{t('common.contact_info_hidden')}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{t('common.upgrade_to_see_contact')}</p>
                            </div>
                        </Link>
                    )}
                </div>
            </div>

            {/* --- BIO --- */}
            {profile.bio && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-3">{t('dashboard.founder_about')}</h2>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                </div>
            )}

            {/* --- COMPETENCES & LANGUES (side by side) --- */}
            {((profile.skills && profile.skills.length > 0) || (profile.languages && profile.languages.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {profile.skills && profile.skills.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-blue-500" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">{t('dashboard.founder_skills')}</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.skills.map((skill: string) => (
                                    <span key={skill} className="text-sm font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {profile.languages && profile.languages.length > 0 && (
                        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-purple-500" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">{t('dashboard.founder_languages')}</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.languages.map((lang: string) => (
                                    <span key={lang} className="text-sm font-medium px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- PARCOURS PROFESSIONNEL --- */}
            {profile.experience && profile.experience.length > 0 && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-kezak-light flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-kezak-primary" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{t('dashboard.founder_experience')}</h2>
                    </div>
                    <div className="space-y-0">
                        {profile.experience.map((exp: any, i: number) => (
                            <div key={i} className="flex gap-4">
                                {/* Timeline */}
                                <div className="flex flex-col items-center pt-1.5">
                                    <div className="w-3 h-3 rounded-full bg-kezak-primary shrink-0 ring-4 ring-kezak-primary/10" />
                                    {i < profile.experience.length - 1 && (
                                        <div className="w-px flex-1 bg-gray-200 mt-1" />
                                    )}
                                </div>
                                {/* Content */}
                                <div className={cn("pb-6 min-w-0", i === profile.experience.length - 1 && "pb-0")}>
                                    <p className="text-base font-semibold text-gray-900 leading-tight">{exp.role}</p>
                                    <p className="text-sm text-gray-600 mt-0.5">{exp.company}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {exp.startYear} — {exp.endYear ?? t('dashboard.founder_today')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- FORMATION --- */}
            {profile.education && profile.education.length > 0 && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-amber-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{t('dashboard.founder_education')}</h2>
                    </div>
                    <div className="space-y-4">
                        {profile.education.map((edu: any, i: number) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                    <GraduationCap className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-base font-semibold text-gray-900 leading-tight">{edu.degree}</p>
                                    <p className="text-sm text-gray-600 mt-0.5">
                                        {edu.school}{edu.year ? ` · ${edu.year}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PROJETS --- */}
            {projects.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {t('dashboard.founder_projects', { name: user.firstName || displayName })}
                        </h2>
                        <span className="text-sm text-gray-400 ml-1">({projects.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {projects.map((project: any) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.slug || project.id}`}
                                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-kezak-primary/20 transition-all group"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                                        {project.logoUrl ? (
                                            <img src={project.logoUrl} alt={project.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-kezak-light to-blue-100 flex items-center justify-center text-kezak-primary font-bold text-lg">
                                                {project.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 group-hover:text-kezak-primary transition-colors leading-tight">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {timeAgo(project.createdAt)}
                                            {project._count?.applications > 0 && (
                                                <> · {project._count.applications > 1
                                                    ? t('common.application_count_plural', { count: project._count.applications })
                                                    : t('common.application_count', { count: project._count.applications })
                                                }</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">
                                    {project.pitch}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {project.sector && (
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                                            {getSectorLabel(project.sector)}
                                        </span>
                                    )}
                                    {project.stage && (
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                                            {STAGE_LABELS[project.stage] || project.stage}
                                        </span>
                                    )}
                                    {project.lookingForRole && (
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            {t('common.looking_for', { roles: formatRoleLabels(project.lookingForRole) })}
                                        </span>
                                    )}
                                    {project.location && (
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                                            <MapPin className="w-3 h-3 inline mr-0.5" />
                                            {project.location}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
