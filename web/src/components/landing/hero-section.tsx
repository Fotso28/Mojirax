'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Briefcase, Eye, CircleCheck } from 'lucide-react';
import { Reveal } from './reveal';
import { useTranslation } from '@/context/i18n-context';

const SLIDESHOW_INTERVAL = 5_000;

const heroBackgrounds = [
  {
    src: '/images/hero/hero-1.png',
    alt: 'Équipe de fondateurs africains en brainstorming',
  },
  {
    src: '/images/hero/hero-2.png',
    alt: 'Fondatrice africaine travaillant sur son laptop',
  },
  {
    src: '/images/hero/hero-3.png',
    alt: 'Deux cofondateurs africains discutant stratégie',
  },
  {
    src: '/images/hero/hero-4.png',
    alt: 'Équipe africaine célébrant une réussite',
  },
] as const;

// previewProjects is defined inside HeroSection to access t()

const cardRotations = ['-rotate-2', 'rotate-0', 'rotate-2'];
const cardOffsets = ['translate-y-4', 'translate-y-0', 'translate-y-4'];

interface PreviewProject {
  name: string;
  pitch: string;
  sector: string;
  location: string;
  stage: string;
  founder: { name: string; label: string; image: string };
  tags: string[];
}

function PreviewCard({
  project,
  index,
}: {
  project: PreviewProject;
  index: number;
}) {
  return (
    <Reveal animation="fade-up" delay={400 + index * 180}>
      <div
        className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 ${cardRotations[index]} ${cardOffsets[index]}`}
      >
        {/* Founder header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
            <Image
              src={project.founder.image}
              alt={project.founder.name}
              width={44}
              height={44}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-gray-900 text-sm truncate">
              {project.founder.name}
            </h4>
            <p className="text-[11px] text-gray-400">{project.founder.label}</p>
          </div>
        </div>

        {/* Project */}
        <h3 className="text-base font-bold text-kezak-dark mb-1.5 leading-tight">
          {project.name}
        </h3>
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4">
          {project.pitch}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-500 mb-4">
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
            <Briefcase className="w-3 h-3 text-gray-400" />
            <span>{project.sector}</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span>{project.location.split(',')[0]}</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
            <Eye className="w-3 h-3 text-gray-400" />
            <span>{project.stage}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100"
            >
              <CircleCheck className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export function HeroSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useTranslation();

  const previewProjects = [
    {
      name: 'AgriTech Sahel',
      pitch: t('landing.hero_preview_pitch_1'),
      sector: 'AgriTech',
      location: 'Dakar, Sénégal',
      stage: 'MVP',
      founder: {
        name: 'Moussa Diallo',
        label: t('landing.hero_card_founder_m'),
        image:
          'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=200&h=200&fit=crop&crop=face',
      },
      tags: [t('landing.hero_card_looking_for_tech'), t('landing.hero_card_collab_equity')],
    },
    {
      name: 'FinPay Africa',
      pitch: t('landing.hero_preview_pitch_2'),
      sector: 'FinTech',
      location: "Abidjan, Côte d'Ivoire",
      stage: 'Traction',
      founder: {
        name: 'Amina Koné',
        label: t('landing.hero_card_founder_f'),
        image:
          'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face',
      },
      tags: [t('landing.hero_card_looking_for_biz'), t('landing.hero_card_collab_paid')],
    },
    {
      name: 'EduConnect',
      pitch: t('landing.hero_preview_pitch_3'),
      sector: 'EdTech',
      location: 'Douala, Cameroun',
      stage: 'Prototype',
      founder: {
        name: 'Samuel Mbarga',
        label: t('landing.hero_card_founder_m'),
        image:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
      },
      tags: [t('landing.hero_card_looking_for_product'), t('landing.hero_card_collab_hybrid')],
    },
  ];

  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % heroBackgrounds.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(advance, SLIDESHOW_INTERVAL);
    return () => clearInterval(timer);
  }, [advance]);

  return (
    <section className="relative pt-28 pb-10 lg:pt-36 lg:pb-16 overflow-hidden">
      {/* Background slideshow */}
      <div className="absolute inset-0" aria-hidden="true">
        {heroBackgrounds.map((bg, i) => (
          <Image
            key={bg.src}
            src={bg.src}
            alt={bg.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className={`object-cover transition-opacity duration-1000 ease-in-out ${
              i === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Centered text block */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <Reveal animation="fade-down" duration={600}>
            <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-white/15 text-white text-xs font-bold border border-white/25 shadow-sm backdrop-blur-sm">
              {t('landing.hero_badge')}
            </span>
          </Reveal>
          <Reveal animation="fade-up" delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold mb-6 leading-[1.1] text-white tracking-tight">
              {t('landing.hero_title_1')}{' '}
              <br className="hidden sm:block" />
              {t('landing.hero_title_2')}{' '}
              <span className="text-kezak-light">{t('landing.hero_title_highlight')}</span>
            </h1>
          </Reveal>
          <Reveal animation="fade-up" delay={200}>
            <p className="text-base sm:text-lg text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('landing.hero_subtitle')}
            </p>
          </Reveal>
          <Reveal animation="fade-up" delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="h-[52px] px-8 rounded-xl bg-kezak-primary text-white font-semibold text-sm flex items-center justify-center hover:bg-kezak-dark transition-all duration-200 shadow-lg shadow-kezak-primary/25 hover:-translate-y-0.5"
              >
                {t('landing.hero_cta_primary')}
              </Link>
              <Link
                href="/login"
                className="h-[52px] px-8 rounded-xl border border-white/30 bg-white/10 text-white font-semibold text-sm flex items-center justify-center hover:bg-white/20 transition-all duration-200 backdrop-blur-sm"
              >
                {t('landing.hero_cta_secondary')}
              </Link>
            </div>
          </Reveal>
        </div>

        {/* 3 cards side by side */}
        <div className="hidden md:grid grid-cols-3 gap-5 lg:gap-7 max-w-5xl mx-auto">
          {previewProjects.map((project, i) => (
            <PreviewCard key={project.name} project={project} index={i} />
          ))}
        </div>

        {/* Mobile: infinite marquee */}
        <div className="md:hidden -mx-4 overflow-hidden">
          <Reveal animation="fade-up" delay={400}>
            <div className="flex animate-[marquee_35s_linear_infinite] w-max gap-4 py-2">
              {/* Duplicate cards for seamless loop */}
              {[...previewProjects, ...previewProjects].map((project, idx) => (
                <div
                  key={`${project.name}-${idx}`}
                  className="flex-shrink-0 w-[80vw] max-w-[320px] bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
                      <Image
                        src={project.founder.image}
                        alt={project.founder.name}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {project.founder.name}
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        {project.founder.label}
                      </p>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-kezak-dark mb-1.5">
                    {project.name}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4">
                    {project.pitch}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100"
                      >
                        <CircleCheck className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
