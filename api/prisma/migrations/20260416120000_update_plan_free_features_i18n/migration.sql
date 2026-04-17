-- Migration: Update plan_free features (remove "matcher", restrict to explore-only)
-- + add full i18n translations (fr, en, es, pt, ar)
--
-- Context: FREE plan becomes discovery-only. Users cannot apply to projects,
-- send messages, or create projects (enforced by PlanGuard on endpoints).
-- The landing-page feature list must reflect this: "Explorer & matcher" → "Explorer".

UPDATE "pricing_plans"
SET "features" = jsonb_build_object(
  'fr', jsonb_build_array(
    'Profil complet',
    'Explorer',
    'Ajouter des profils en favoris',
    'Accès aux fonctionnalités de base',
    'Découverte de la plateforme pendant 30 jours'
  ),
  'en', jsonb_build_array(
    'Complete profile',
    'Explore',
    'Add profiles to favorites',
    'Access to basic features',
    '30-day platform discovery'
  ),
  'es', jsonb_build_array(
    'Perfil completo',
    'Explorar',
    'Añadir perfiles a favoritos',
    'Acceso a funciones básicas',
    'Descubrimiento de la plataforma durante 30 días'
  ),
  'pt', jsonb_build_array(
    'Perfil completo',
    'Explorar',
    'Adicionar perfis aos favoritos',
    'Acesso às funcionalidades básicas',
    'Descoberta da plataforma durante 30 dias'
  ),
  'ar', jsonb_build_array(
    'ملف شخصي كامل',
    'استكشاف',
    'إضافة ملفات شخصية إلى المفضلة',
    'الوصول إلى الميزات الأساسية',
    'اكتشاف المنصة لمدة 30 يومًا'
  )
)
WHERE "id" = 'plan_free';
