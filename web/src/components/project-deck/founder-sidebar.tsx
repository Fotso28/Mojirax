'use client';

import {
    MapPin,
    Linkedin,
    Globe,
    Briefcase,
    GraduationCap,
    Calendar,
    User,
    Mail,
    Phone,
} from 'lucide-react';
import Link from 'next/link';
import { COUNTRIES } from '@/lib/constants/countries';
import { PrivacyWall } from './privacy-wall';

interface FounderExperience {
    company: string;
    role: string;
    startYear: number;
    endYear?: number | null;
}

interface FounderEducation {
    school: string;
    degree: string;
    year?: number;
}

interface FounderProfile {
    title?: string | null;
    bio?: string | null;
    country?: string | null;
    city?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    skills?: string[];
    experience?: FounderExperience[];
    education?: FounderEducation[];
    yearsOfExperience?: number | null;
    languages?: string[];
}

export interface FounderSidebarProps {
    founder: {
        id?: string | null;
        image?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        address?: string | null;
        createdAt?: string | null;
        founderProfile?: FounderProfile | null;
        _isLocked?: boolean;
    };
}

export function FounderSidebar({ founder }: FounderSidebarProps) {
    const profile = founder.founderProfile;

    const displayName =
        founder.name ||
        [founder.firstName, founder.lastName].filter(Boolean).join(' ') ||
        'Fondateur';

    const isLocked = founder._isLocked === true;
    const hasLinks = !isLocked && (profile?.linkedinUrl || profile?.websiteUrl);
    const locationParts = [profile?.city, profile?.country].filter(Boolean);
    const locationStr = locationParts.length > 0 ? locationParts.join(', ') : null;
    const founderCountry = profile?.country
        ? COUNTRIES.find(c => c.label === profile.country || c.code === profile.country)
        : null;
    const phoneDisplay = founder.phone
        ? `${founderCountry?.dialCode || ''} ${founder.phone}`.trim()
        : null;

    const memberSince = founder.createdAt
        ? new Date(founder.createdAt).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric',
          })
        : null;

    return (
        <div className="space-y-0">
            <div className="bg-white rounded-t-2xl md:rounded-2xl md:border border-gray-100 shadow-sm overflow-hidden">
                {/* Photo de profil (grande) */}
                <div className="relative w-full aspect-[4/5] md:aspect-[4/3] lg:aspect-[4/5] bg-gray-100 max-h-[500px] md:max-h-[350px] lg:max-h-none rounded-t-2xl md:rounded-t-2xl overflow-hidden">
                    {founder.image ? (
                        <img
                            src={founder.image}
                            alt={displayName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-kezak-light to-blue-100 flex items-center justify-center">
                            <User className="w-16 h-16 text-kezak-primary/40" />
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
                </div>

                {/* Identité */}
                <div className="p-5 -mt-3 relative">
                    {founder.id ? (
                        <Link href={`/founders/${founder.id}`} className="text-lg font-bold text-gray-900 leading-tight hover:text-kezak-primary transition-colors">
                            {displayName}
                        </Link>
                    ) : (
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                            {displayName}
                        </h3>
                    )}
                    {profile?.title && (
                        <p className="text-sm text-gray-600 mt-1 leading-snug">
                            {profile.title}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                        {locationStr && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                <MapPin className="w-3 h-3" />
                                {locationStr}
                            </span>
                        )}
                        {profile?.yearsOfExperience != null && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                <Briefcase className="w-3 h-3" />
                                {profile.yearsOfExperience} ans d&apos;exp.
                            </span>
                        )}
                        {!isLocked && founder.email && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                <Mail className="w-3 h-3" />
                                {founder.email}
                            </span>
                        )}
                        {!isLocked && phoneDisplay && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                                <Phone className="w-3 h-3" />
                                {phoneDisplay}
                            </span>
                        )}
                    </div>

                    {isLocked && (
                        <div className="mt-3">
                            <PrivacyWall blurIntensity="sm">
                                <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                        <Mail className="w-3 h-3" /> contact@example.com
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                        <Phone className="w-3 h-3" /> +237 6XX XXX XXX
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                        <Linkedin className="w-3 h-3" /> linkedin.com/in/...
                                    </span>
                                </div>
                            </PrivacyWall>
                        </div>
                    )}
                </div>

                {/* Bio */}
                {profile?.bio && (
                    <div className="px-5 pb-5">
                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {profile.bio}
                            </p>
                        </div>
                    </div>
                )}

                {/* Compétences */}
                {profile?.skills && profile.skills.length > 0 && (
                    <div className="px-5 pb-5">
                        <div className="border-t border-gray-100 pt-4">
                            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">
                                Compétences
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {profile.skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Parcours */}
                {profile?.experience && profile.experience.length > 0 && (
                    <div className="px-5 pb-5">
                        <div className="border-t border-gray-100 pt-4">
                            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">
                                Parcours
                            </h4>
                            <div className="space-y-3">
                                {profile.experience.map((exp, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="flex flex-col items-center pt-1.5">
                                            <div className="w-2 h-2 rounded-full bg-kezak-primary shrink-0" />
                                            {i < profile.experience!.length - 1 && (
                                                <div className="w-px flex-1 bg-gray-200 mt-1" />
                                            )}
                                        </div>
                                        <div className="pb-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 leading-tight">
                                                {exp.role}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {exp.company}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {exp.startYear} — {exp.endYear ?? "Aujourd'hui"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Formation */}
                {profile?.education && profile.education.length > 0 && (
                    <div className="px-5 pb-5">
                        <div className="border-t border-gray-100 pt-4">
                            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">
                                Formation
                            </h4>
                            <div className="space-y-3">
                                {profile.education.map((edu, i) => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                            <GraduationCap className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 leading-tight">
                                                {edu.degree}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {edu.school}
                                                {edu.year ? ` · ${edu.year}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Langues */}
                {profile?.languages && profile.languages.length > 0 && (
                    <div className="px-5 pb-5">
                        <div className="border-t border-gray-100 pt-4">
                            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">
                                Langues
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {profile.languages.map((lang) => (
                                    <span
                                        key={lang}
                                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200"
                                    >
                                        {lang}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Liens sociaux */}
                {hasLinks && (
                    <div className="px-5 pb-5">
                        <div className="border-t border-gray-100 pt-4">
                            <div className="flex items-center gap-2">
                                {profile?.linkedinUrl && (
                                    <a
                                        href={profile.linkedinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#0A66C2] hover:bg-blue-50 hover:border-blue-100 transition-all duration-200"
                                        aria-label="LinkedIn"
                                    >
                                        <Linkedin className="w-4 h-4" />
                                    </a>
                                )}
                                {profile?.websiteUrl && (
                                    <a
                                        href={profile.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-kezak-primary hover:bg-kezak-light hover:border-kezak-primary/20 transition-all duration-200"
                                        aria-label="Site web"
                                    >
                                        <Globe className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Membre depuis */}
                {memberSince && (
                    <div className="px-5 pb-5">
                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                Membre depuis {memberSince}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
