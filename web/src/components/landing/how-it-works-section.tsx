'use client';

import { UserPlus, Search, MessageCircle, Handshake } from 'lucide-react';
import { Reveal } from './reveal';

const steps = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Créez votre profil',
    desc: 'Renseignez vos compétences, objectifs et disponibilité',
    bg: 'bg-kezak-primary',
    offset: false,
  },
  {
    num: '02',
    icon: Search,
    title: 'Explorez les projets',
    desc: 'Parcourez les projets et trouvez celui qui vous correspond',
    bg: 'bg-kezak-accent',
    offset: true,
  },
  {
    num: '03',
    icon: MessageCircle,
    title: 'Discutez en privé',
    desc: 'Échangez avec les fondateurs et alignez vos visions',
    bg: 'bg-kezak-primary',
    offset: false,
  },
  {
    num: '04',
    icon: Handshake,
    title: "Lancez l'aventure",
    desc: 'Structurez votre collaboration avec notre Plan 30 jours',
    bg: 'bg-kezak-accent',
    offset: true,
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-28 bg-gray-900 text-white overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-grid-white opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-lg text-gray-400 mb-6">
              4 étapes simples pour trouver votre cofondateur
            </p>
            <div className="w-20 h-1.5 bg-kezak-primary mx-auto rounded-full" />
          </div>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.num} animation="fade-up" delay={i * 150}>
              <div
                className={`relative group p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 ${s.offset ? 'lg:mt-12' : ''}`}
              >
                <div className="text-8xl font-black text-white/[0.04] absolute -top-6 -left-2 group-hover:text-kezak-primary/20 transition-colors select-none pointer-events-none">
                  {s.num}
                </div>
                <div
                  className={`w-14 h-14 ${s.bg} rounded-xl flex items-center justify-center mb-6 shadow-lg`}
                >
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold mb-2">{s.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
