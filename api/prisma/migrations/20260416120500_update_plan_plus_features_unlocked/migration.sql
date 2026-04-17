-- Migration: Add newly-unlocked features to plan_plus
-- Context: FREE plan was restricted (cannot apply, create project, send direct messages).
-- The PLUS plan's feature list must reflect these now-exclusive capabilities.

UPDATE "pricing_plans"
SET "features" = jsonb_build_object(
  'fr', jsonb_build_array(
    'Tout le plan Gratuit',
    'Postuler à des projets',
    'Créer et publier vos projets',
    'Envoyer des messages aux fondateurs',
    'Voir qui a consulté votre profil',
    'Filtres avancés pour trouver des profils plus pertinents',
    'Retour arrière sur le dernier swipe',
    'Plus de visibilité dans les résultats'
  ),
  'en', jsonb_build_array(
    'Everything in Free',
    'Apply to projects',
    'Create and publish your projects',
    'Send messages to founders',
    'See who viewed your profile',
    'Advanced filters for more relevant profiles',
    'Undo last swipe',
    'More visibility in results'
  ),
  'es', jsonb_build_array(
    'Todo el plan Gratis',
    'Postular a proyectos',
    'Crear y publicar tus proyectos',
    'Enviar mensajes a los fundadores',
    'Ver quién ha consultado tu perfil',
    'Filtros avanzados para encontrar perfiles más relevantes',
    'Retroceder en el último swipe',
    'Mayor visibilidad en los resultados'
  ),
  'pt', jsonb_build_array(
    'Tudo do plano Gratuito',
    'Candidatar-se a projetos',
    'Criar e publicar seus projetos',
    'Enviar mensagens aos fundadores',
    'Ver quem consultou seu perfil',
    'Filtros avançados para encontrar perfis mais relevantes',
    'Voltar atrás no último swipe',
    'Mais visibilidade nos resultados'
  ),
  'ar', jsonb_build_array(
    'كل مزايا الخطة المجانية',
    'التقديم على المشاريع',
    'إنشاء ونشر مشاريعك',
    'إرسال رسائل إلى المؤسسين',
    'معرفة من زار ملفك الشخصي',
    'فلاتر متقدمة للعثور على ملفات شخصية أكثر صلة',
    'التراجع عن آخر swipe',
    'ظهور أكبر في النتائج'
  )
)
WHERE "id" = 'plan_plus';
