/**
 * Ajoute les traductions ES (espagnol), PT (portugais brésilien) et AR (arabe standard)
 * aux tables pricing_plans, faqs et testimonials.
 *
 * Usage : node prisma/add-translations-es-pt-ar.js
 *
 * Prérequis : DATABASE_URL configuré dans api/.env
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// ─── PRICING PLANS ──────────────────────────────────────────

const planTranslations = {
  plan_free: {
    name:        { es: 'Gratis',    pt: 'Gratuito',  ar: 'مجاني' },
    period:      { es: 'mes',       pt: 'mês',       ar: 'شهر' },
    description: {
      es: 'Perfecto para descubrir MoJiraX y empezar a explorar.',
      pt: 'Perfeito para descobrir o MoJiraX e começar a explorar.',
      ar: 'مثالي لاكتشاف MoJiraX والبدء في الاستكشاف.',
    },
    ctaLabel: {
      es: 'Empezar gratis',
      pt: 'Começar gratuitamente',
      ar: 'ابدأ مجانا',
    },
    features: {
      es: [
        'Perfil completo',
        'Explorar y hacer matching',
        'Añadir perfiles a favoritos',
        'Acceso a funciones básicas',
        'Descubrimiento de la plataforma durante 30 días',
      ],
      pt: [
        'Perfil completo',
        'Explorar e fazer matching',
        'Adicionar perfis aos favoritos',
        'Acesso às funcionalidades básicas',
        'Descoberta da plataforma durante 30 dias',
      ],
      ar: [
        'ملف شخصي كامل',
        'استكشاف ومطابقة',
        'إضافة ملفات شخصية إلى المفضلة',
        'الوصول إلى الميزات الأساسية',
        'اكتشاف المنصة لمدة 30 يوما',
      ],
    },
  },

  plan_plus: {
    name:        { es: 'Plus',      pt: 'Plus',      ar: 'بلس' },
    period:      { es: 'mes',       pt: 'mês',       ar: 'شهر' },
    description: {
      es: 'Ideal para mejorar tu visibilidad y aumentar tus oportunidades.',
      pt: 'Ideal para melhorar sua visibilidade e aumentar suas chances.',
      ar: 'مثالي لتحسين ظهورك وزيادة فرصك.',
    },
    ctaLabel: {
      es: 'Cambiar al plan Plus',
      pt: 'Mudar para o plano Plus',
      ar: 'الترقية إلى خطة Plus',
    },
    features: {
      es: [
        'Todo el plan Gratis',
        'Ver quién ha consultado tu perfil',
        'Filtros avanzados para encontrar perfiles más relevantes',
        'Retroceder en el último swipe',
        'Mayor visibilidad en los resultados',
      ],
      pt: [
        'Tudo do plano Gratuito',
        'Ver quem consultou seu perfil',
        'Filtros avançados para encontrar perfis mais relevantes',
        'Voltar atrás no último swipe',
        'Mais visibilidade nos resultados',
      ],
      ar: [
        'كل مزايا الخطة المجانية',
        'معرفة من زار ملفك الشخصي',
        'فلاتر متقدمة للعثور على ملفات شخصية أكثر صلة',
        'التراجع عن آخر swipe',
        'ظهور أكبر في النتائج',
      ],
    },
  },

  plan_pro: {
    name:        { es: 'Pro',       pt: 'Pro',       ar: 'برو' },
    period:      { es: 'mes',       pt: 'mês',       ar: 'شهر' },
    description: {
      es: 'El plan más elegido para multiplicar tus conexiones.',
      pt: 'O plano mais escolhido para multiplicar suas conexões.',
      ar: 'الخطة الأكثر اختيارا لمضاعفة اتصالاتك.',
    },
    ctaLabel: {
      es: 'Elegir el plan Pro',
      pt: 'Escolher o plano Pro',
      ar: 'اختيار خطة Pro',
    },
    features: {
      es: [
        'Todo el plan Plus',
        'Ver quién te ha dado like',
        'Mensajes ilimitados',
        '5 boosts de visibilidad al mes',
        'Acceso prioritario a los perfiles más activos',
        'Estadísticas de perfil (visitas, matchs, actividad)',
        'Insignia Pro visible en tu perfil',
      ],
      pt: [
        'Tudo do plano Plus',
        'Ver quem curtiu seu perfil',
        'Mensagens ilimitadas',
        '5 boosts de visibilidade por mês',
        'Acesso prioritário aos perfis mais ativos',
        'Estatísticas de perfil (visualizações, matchs, atividade)',
        'Selo Pro visível no seu perfil',
      ],
      ar: [
        'كل مزايا خطة Plus',
        'معرفة من أعجب بملفك الشخصي',
        'رسائل غير محدودة',
        '5 تعزيزات ظهور شهريا',
        'أولوية الوصول إلى الملفات الشخصية الأكثر نشاطا',
        'إحصائيات الملف الشخصي (المشاهدات، المطابقات، النشاط)',
        'شارة Pro ظاهرة على ملفك الشخصي',
      ],
    },
  },

  plan_elite: {
    name:        { es: 'Elite',     pt: 'Elite',     ar: 'إيليت' },
    period:      { es: 'mes',       pt: 'mês',       ar: 'شهر' },
    description: {
      es: 'La experiencia MoJiraX más completa para maximizar tus resultados.',
      pt: 'A experiência MoJiraX mais completa para maximizar seus resultados.',
      ar: 'تجربة MoJiraX الأكثر اكتمالا لتحقيق أقصى النتائج.',
    },
    ctaLabel: {
      es: 'Elegir el plan Elite',
      pt: 'Escolher o plano Elite',
      ar: 'اختيار خطة Elite',
    },
    features: {
      es: [
        'Todo el plan Pro',
        'Destacado prioritario en las búsquedas',
        'Boosts adicionales para mayor visibilidad',
        'Modo navegación privada (perfil invisible)',
        'Acceso anticipado a nuevas funcionalidades',
        'Soporte prioritario',
        'Insignia Elite exclusiva',
      ],
      pt: [
        'Tudo do plano Pro',
        'Destaque prioritário nas buscas',
        'Boosts adicionais para mais visibilidade',
        'Modo navegação privada (perfil invisível)',
        'Acesso antecipado às novas funcionalidades',
        'Suporte prioritário',
        'Selo Elite exclusivo',
      ],
      ar: [
        'كل مزايا خطة Pro',
        'إبراز ذو أولوية في نتائج البحث',
        'تعزيزات إضافية لمزيد من الظهور',
        'وضع التصفح الخاص (ملف شخصي غير مرئي)',
        'وصول مبكر إلى الميزات الجديدة',
        'دعم ذو أولوية',
        'شارة Elite حصرية',
      ],
    },
  },
};

// ─── FAQ ────────────────────────────────────────────────────

const faqTranslations = {
  faq_1: {
    question: {
      es: '¿MojiraX está abierto a todo el mundo?',
      pt: 'O MojiraX é aberto a todos?',
      ar: 'هل MojiraX مفتوح للجميع؟',
    },
    answer: {
      es: 'Sí, MojiraX está abierto a todos los emprendedores y talentos interesados en el ecosistema africano, ya sea en el continente o en la diáspora mundial.',
      pt: 'Sim, o MojiraX é aberto a todos os empreendedores e talentos interessados no ecossistema africano, seja no continente ou na diáspora mundial.',
      ar: 'نعم، MojiraX مفتوح لجميع أصحاب المشاريع والمواهب المهتمين بالنظام البيئي الأفريقي، سواء في القارة أو في الشتات العالمي.',
    },
  },
  faq_2: {
    question: {
      es: '¿Cómo garantizan la seguridad de los perfiles?',
      pt: 'Como vocês garantem a segurança dos perfis?',
      ar: 'كيف تضمنون أمان الملفات الشخصية؟',
    },
    answer: {
      es: 'Cada perfil es verificado por nuestro equipo y nuestro sistema de IA. Utilizamos un proceso de moderación riguroso para garantizar la calidad y seguridad de nuestra comunidad.',
      pt: 'Cada perfil é verificado pela nossa equipe e pelo nosso sistema de IA. Utilizamos um processo de moderação rigoroso para garantir a qualidade e a segurança da nossa comunidade.',
      ar: 'يتم التحقق من كل ملف شخصي من قبل فريقنا ونظام الذكاء الاصطناعي الخاص بنا. نستخدم عملية إشراف صارمة لضمان جودة وأمان مجتمعنا.',
    },
  },
  faq_3: {
    question: {
      es: '¿Cómo funciona el matching?',
      pt: 'Como funciona o matching?',
      ar: 'كيف تعمل عملية المطابقة؟',
    },
    answer: {
      es: 'Nuestro algoritmo analiza tus competencias, objetivos y disponibilidad para proponerte perfiles compatibles. Cuanto más completo esté tu perfil, más pertinentes serán las sugerencias.',
      pt: 'Nosso algoritmo analisa suas competências, objetivos e disponibilidade para propor perfis compatíveis. Quanto mais completo for seu perfil, mais pertinentes serão as sugestões.',
      ar: 'تحلل خوارزميتنا مهاراتك وأهدافك وتوفرك لاقتراح ملفات شخصية متوافقة. كلما كان ملفك الشخصي أكثر اكتمالا، كانت الاقتراحات أكثر ملاءمة.',
    },
  },
  faq_4: {
    question: {
      es: '¿Qué países están cubiertos?',
      pt: 'Quais países são cobertos?',
      ar: 'ما هي البلدان المشمولة؟',
    },
    answer: {
      es: 'MojiraX cubre el África francófona (Camerún, Senegal, Costa de Marfil, Mali, Benín...) así como la diáspora (Francia, Canadá, Bélgica...).',
      pt: 'O MojiraX cobre a África francófona (Camarões, Senegal, Costa do Marfim, Mali, Benim...) assim como a diáspora (França, Canadá, Bélgica...).',
      ar: 'يغطي MojiraX أفريقيا الناطقة بالفرنسية (الكاميرون، السنغال، ساحل العاج، مالي، بنين...) وكذلك الشتات (فرنسا، كندا، بلجيكا...).',
    },
  },
  faq_5: {
    question: {
      es: '¿El plan gratuito es realmente gratuito?',
      pt: 'O plano gratuito é realmente gratuito?',
      ar: 'هل الخطة المجانية مجانية حقا؟',
    },
    answer: {
      es: 'Sí, el plan gratuito es 100% gratuito y sin compromiso. Puedes crear tu perfil, explorar la plataforma y recibir 3 matchs al mes sin pagar nada.',
      pt: 'Sim, o plano gratuito é 100% gratuito e sem compromisso. Você pode criar seu perfil, explorar a plataforma e receber 3 matchs por mês sem pagar nada.',
      ar: 'نعم، الخطة المجانية مجانية 100% وبدون التزام. يمكنك إنشاء ملفك الشخصي واستكشاف المنصة والحصول على 3 مطابقات شهريا دون دفع أي شيء.',
    },
  },
};

// ─── TESTIMONIALS ───────────────────────────────────────────

const testimonialTranslations = {
  test_1: {
    role: {
      es: 'CEO y Fundador',
      pt: 'CEO e Fundador',
      ar: 'CEO ومؤسس',
    },
    quote: {
      es: 'Gracias a MojiraX, encontré a mi CTO en menos de 3 semanas. Nuestra startup agritech aplica las mejores prácticas del Fintech y estamos creciendo en Dakar.',
      pt: 'Graças ao MojiraX, encontrei meu CTO em menos de 3 semanas. Nossa startup agritech aplica as melhores práticas do Fintech e estamos crescendo em Dakar.',
      ar: 'بفضل MojiraX، وجدت CTO الخاص بي في أقل من 3 أسابيع. شركتنا الناشئة في مجال التكنولوجيا الزراعية تطبق أفضل ممارسات Fintech ونحن ننمو في Dakar.',
    },
  },
  test_2: {
    role: {
      es: 'Product Manager',
      pt: 'Product Manager',
      ar: 'Product Manager',
    },
    quote: {
      es: 'En MojiraX en Lomé, buscaba un cofundador para un proyecto en Accra. El matching está al nivel de las mejores plataformas.',
      pt: 'No MojiraX em Lomé, eu procurava um cofundador para um projeto em Accra. O matching está no nível das melhores plataformas.',
      ar: 'على MojiraX في Lomé، كنت أبحث عن شريك مؤسس لمشروع في Accra. المطابقة على مستوى أفضل المنصات.',
    },
  },
  test_3: {
    role: {
      es: 'Cofundador',
      pt: 'Cofundador',
      ar: 'شريك مؤسس',
    },
    quote: {
      es: 'La calidad de los perfiles en esta plataforma es excepcional. Se ha convertido en mi herramienta principal para buscar talentos en África Occidental.',
      pt: 'A qualidade dos perfis nesta plataforma é excepcional. Tornou-se minha ferramenta principal para encontrar talentos na África Ocidental.',
      ar: 'جودة الملفات الشخصية على هذه المنصة استثنائية. أصبحت أداتي الرئيسية للبحث عن المواهب في غرب أفريقيا.',
    },
  },
};

// ─── EXECUTION ──────────────────────────────────────────────

async function main() {
  console.log('=== Ajout des traductions ES, PT, AR ===\n');

  // --- PLANS ---
  console.log('--- Pricing Plans ---');
  for (const [planId, translations] of Object.entries(planTranslations)) {
    const plan = await p.pricingPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      console.log(`  SKIP: ${planId} introuvable`);
      continue;
    }

    await p.pricingPlan.update({
      where: { id: planId },
      data: {
        name:        { ...plan.name,        ...translations.name },
        period:      { ...plan.period,      ...translations.period },
        description: { ...plan.description, ...translations.description },
        ctaLabel:    { ...plan.ctaLabel,    ...translations.ctaLabel },
        features:    { ...plan.features,    ...translations.features },
      },
    });
    console.log(`  OK: ${planId}`);
  }

  // --- FAQ ---
  console.log('\n--- FAQ ---');
  for (const [faqId, translations] of Object.entries(faqTranslations)) {
    const faq = await p.faq.findUnique({ where: { id: faqId } });
    if (!faq) {
      console.log(`  SKIP: ${faqId} introuvable`);
      continue;
    }

    await p.faq.update({
      where: { id: faqId },
      data: {
        question: { ...faq.question, ...translations.question },
        answer:   { ...faq.answer,   ...translations.answer },
      },
    });
    console.log(`  OK: ${faqId}`);
  }

  // --- TESTIMONIALS ---
  console.log('\n--- Testimonials ---');
  for (const [testId, translations] of Object.entries(testimonialTranslations)) {
    const testimonial = await p.testimonial.findUnique({ where: { id: testId } });
    if (!testimonial) {
      console.log(`  SKIP: ${testId} introuvable`);
      continue;
    }

    await p.testimonial.update({
      where: { id: testId },
      data: {
        role:  { ...testimonial.role,  ...translations.role },
        quote: { ...testimonial.quote, ...translations.quote },
      },
    });
    console.log(`  OK: ${testId}`);
  }

  console.log('\n=== Terminé ! ===');
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await p.$disconnect();
  });
