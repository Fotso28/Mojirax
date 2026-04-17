'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { LandingHeader } from './landing-header';
import { HeroSection } from './hero-section';
import { ForWhoSection } from './for-who-section';
import { HowItWorksSection } from './how-it-works-section';
import { WhyMojiraxSection } from './why-mojirax-section';
import { TestimonialsSection } from './testimonials-section';
import { PricingSection } from './pricing-section';
import { FaqSection } from './faq-section';
import { CtaSection } from './cta-section';
import { LandingFooter } from './landing-footer';
import { useLocale } from '@/context/i18n-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export function LandingPage() {
  const locale = useLocale();
  const [plans, setPlans] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const headers = { 'Accept-Language': locale };
        const [plansRes, faqsRes, testimonialsRes] = await Promise.allSettled([
          axios.get(`${API_URL}/landing/plans`, { headers }),
          axios.get(`${API_URL}/landing/faq`, { headers }),
          axios.get(`${API_URL}/landing/testimonials`, { headers }),
        ]);

        if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data);
        if (faqsRes.status === 'fulfilled') setFaqs(faqsRes.value.data);
        if (testimonialsRes.status === 'fulfilled')
          setTestimonials(testimonialsRes.value.data);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [locale]);

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <HeroSection />
        <ForWhoSection />
        <HowItWorksSection />
        <WhyMojiraxSection />
        <TestimonialsSection testimonials={testimonials} loading={loading} />
        <PricingSection plans={plans} loading={loading} />
        <FaqSection faqs={faqs} loading={loading} />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
