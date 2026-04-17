type Locale = 'fr' | 'en' | 'es' | 'pt' | 'ar';

/**
 * Résout un champ Json multilingue vers la bonne locale.
 * Supporte les valeurs string legacy (rétrocompatibilité).
 */
export function localized(field: unknown, locale: Locale = 'fr'): string {
  if (!field) return '';
  if (typeof field === 'string') return field; // legacy string value
  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, string>;
    return obj[locale] || obj['fr'] || Object.values(obj)[0] || '';
  }
  return String(field);
}

/**
 * Résout un champ Json multilingue de type array.
 */
export function localizedArray(field: unknown, locale: Locale = 'fr'): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field; // legacy string[] value
  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, string[]>;
    return obj[locale] || obj['fr'] || [];
  }
  return [];
}
