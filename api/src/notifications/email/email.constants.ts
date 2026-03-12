import { NotificationType } from '@prisma/client';

/**
 * Mapping NotificationType -> nom du template MJML.
 * MODERATION_ALERT utilise un sous-template basé sur data.moderationStatus.
 */
export const EMAIL_TEMPLATE_MAP: Record<NotificationType, string> = {
  SYSTEM: 'system',
  APPLICATION_RECEIVED: 'application-received',
  APPLICATION_ACCEPTED: 'application-accepted',
  APPLICATION_REJECTED: 'application-rejected',
  MODERATION_ALERT: 'moderation-pending', // default, overridden by sub-template logic
  DOCUMENT_ANALYZED: 'document-analyzed',
  DOCUMENT_ANALYSIS_FAILED: 'document-failed',
  PROFILE_PUBLISHED: 'profile-published',
  PROFILE_REVIEW: 'profile-review',
  PROFILE_UNLOCKED: 'profile-unlocked',
  WELCOME: 'welcome',
  ONBOARDING_REMINDER: 'onboarding-reminder',
  MESSAGE_RECEIVED: 'system', // uses system template as fallback
};

/**
 * Sous-templates pour MODERATION_ALERT basés sur data.moderationStatus.
 */
export const MODERATION_SUB_TEMPLATES: Record<string, string> = {
  published: 'moderation-published',
  rejected: 'moderation-rejected',
  pending: 'moderation-pending',
};

/**
 * Mapping NotificationType -> actionUrl pattern.
 * Les placeholders {projectSlug}, {targetId} sont remplacés par EmailService.
 */
export const EMAIL_ACTION_URL_MAP: Record<NotificationType, string> = {
  WELCOME: '/onboarding/role',
  APPLICATION_RECEIVED: '/my-project/{projectSlug}/applications',
  APPLICATION_ACCEPTED: '/projects/{projectSlug}',
  APPLICATION_REJECTED: '/applications',
  MODERATION_ALERT: '/my-project',
  DOCUMENT_ANALYZED: '/my-project',
  DOCUMENT_ANALYSIS_FAILED: '/my-project',
  PROFILE_PUBLISHED: '/profile',
  PROFILE_REVIEW: '/profile',
  PROFILE_UNLOCKED: '/founders/{targetId}', // default; overridden for project unlocks
  ONBOARDING_REMINDER: '/onboarding/role',
  SYSTEM: '/',
  MESSAGE_RECEIVED: '/messages',
};

/**
 * Resolve le nom d'utilisateur pour les templates.
 */
export function resolveUserName(user: { firstName?: string; name?: string }): string {
  return user.firstName || user.name || 'Utilisateur';
}

/**
 * Resolve le nom du template pour un type donné.
 * Gère la logique sous-template pour MODERATION_ALERT.
 */
export function resolveTemplateName(
  type: NotificationType,
  data?: Record<string, any>,
): string {
  if (type === NotificationType.MODERATION_ALERT && data?.moderationStatus) {
    return MODERATION_SUB_TEMPLATES[data.moderationStatus] || EMAIL_TEMPLATE_MAP[type];
  }
  return EMAIL_TEMPLATE_MAP[type];
}

/**
 * Resolve l'actionUrl pour un type donné en remplaçant les placeholders.
 */
export function resolveActionUrl(
  frontendUrl: string,
  type: NotificationType,
  data?: Record<string, any>,
): string {
  let path = EMAIL_ACTION_URL_MAP[type];

  // PROFILE_UNLOCKED: use /projects/ for project unlocks, /founders/ for candidate unlocks
  if (type === 'PROFILE_UNLOCKED' && data?.unlockType === 'project') {
    path = '/projects/{targetId}';
  }

  if (data?.projectSlug) {
    path = path.replace('{projectSlug}', data.projectSlug);
  }
  if (data?.targetId) {
    path = path.replace('{targetId}', data.targetId);
  }

  return `${frontendUrl}${path}`;
}
