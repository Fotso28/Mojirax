/**
 * Résout un champ multilingue JSON vers la locale demandée.
 * Rétrocompatible avec les anciennes valeurs string.
 */
export function localized(field: unknown, locale: string = 'fr'): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, string>;
    return obj[locale] || obj['fr'] || Object.values(obj)[0] || '';
  }
  return String(field);
}

export function localizedArray(field: unknown, locale: string = 'fr'): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'object' && field !== null) {
    const obj = field as Record<string, string[]>;
    return obj[locale] || obj['fr'] || [];
  }
  return [];
}
