'use client';

import { Lightbulb, TrendingUp, Globe } from 'lucide-react';
import { Reveal } from './reveal';

const personas = [
  {
    icon: Lightbulb,
    title: 'Porteur de projet',
    description:
      'Vous avez une idée brillante mais il vous manque le partenaire technique ou business pour décider.',
    hoverBg: 'hover:bg-kezak-primary',
  },
  {
    icon: TrendingUp,
    title: 'Entrepreneur / Talent',
    description:
      "Expert en tech, marketing ou finance, vous cherchez l'aventure entrepreneuriale de votre vie.",
    hoverBg: 'hover:bg-kezak-accent',
  },
  {
    icon: Globe,
    title: 'Diaspora',
    description:
      'Vous souhaitez investir vos compétences ou votre capital dans des projets locaux à fort impact.',
    hoverBg: 'hover:bg-gray-900',
  },
];

export function ForWhoSection() {
  return (
    <section id="for-who" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal animation="fade-up">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Conçu pour l&apos;écosystème Africain
            </h2>
            <p className="text-base text-gray-500 max-w-xl mx-auto">
              Rejoignez la communauté qui transforme les idées en leaders de
              demain
            </p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {personas.map((p, i) => (
            <Reveal key={p.title} animation="fade-up" delay={i * 150}>
              <div
                className={`group p-8 lg:p-10 rounded-2xl bg-gray-50 ${p.hoverBg} hover:text-white transition-all duration-500 hover:shadow-xl hover:-translate-y-1`}
              >
                <div className="w-14 h-14 bg-kezak-primary/10 group-hover:bg-white/20 rounded-xl flex items-center justify-center mb-6 transition-colors">
                  <p.icon className="w-6 h-6 text-kezak-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3">{p.title}</h3>
                <p className="text-gray-500 group-hover:text-white/80 leading-relaxed text-sm">
                  {p.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
