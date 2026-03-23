'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Reveal } from './reveal';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  imageUrl: string;
}

interface Props {
  testimonials: Testimonial[];
  loading: boolean;
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-8 animate-pulse shadow-sm"
        >
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-6" />
          <div className="h-4 bg-gray-200 rounded mb-3" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-6" />
          <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function TestimonialsSection({ testimonials, loading }: Props) {
  return (
    <section className="py-20 lg:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal animation="fade-up">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Ils ont trouvé leur perle rare
            </h2>
            <p className="text-base text-gray-500 max-w-xl mx-auto">
              Découvrez les histoires de ceux qui ont trouvé leur cofondateur
              sur MoJiraX
            </p>
          </div>
        </Reveal>

        {loading ? (
          <Skeleton />
        ) : testimonials.length === 0 ? null : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((t, i) => (
              <Reveal key={t.id} animation="fade-up" delay={i * 150}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center h-full">
                  <div className="relative mb-6 inline-block">
                    <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-kezak-primary to-kezak-accent">
                      <Image
                        src={t.imageUrl}
                        alt={t.name}
                        width={80}
                        height={80}
                        className="w-full h-full rounded-full object-cover border-2 border-white"
                      />
                    </div>
                  </div>
                  <p className="text-gray-600 italic mb-6 leading-relaxed text-sm">
                    &laquo; {t.quote} &raquo;
                  </p>
                  <h4 className="font-bold text-lg text-gray-900 mb-1">
                    {t.name}
                  </h4>
                  <p className="text-kezak-primary font-medium text-sm mb-2">
                    {t.role}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{t.location}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
