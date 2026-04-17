/**
 * Locale-aware date formatting.
 *
 * Centralize all toLocaleDateString calls to ensure non-French users
 * don't see dates in French (H-2/B.3 from UX audit).
 */

import type { Locale } from '@/context/i18n-context';

const LOCALE_MAP: Record<Locale, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-BR',
    ar: 'ar',
};

function toBcp47(locale: Locale | string): string {
    return LOCALE_MAP[locale as Locale] ?? 'fr-FR';
}

/**
 * Format an ISO date string (or Date) into a localized human-readable date.
 * Returns empty string on invalid input rather than throwing.
 */
export function formatDate(
    value: string | Date | null | undefined,
    locale: Locale | string = 'fr',
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(toBcp47(locale), options);
}

/**
 * Short form — good for tables and tight layouts.
 */
export function formatDateShort(
    value: string | Date | null | undefined,
    locale: Locale | string = 'fr',
): string {
    return formatDate(value, locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Date + time — used in logs, transactions, timestamps.
 */
export function formatDateTime(
    value: string | Date | null | undefined,
    locale: Locale | string = 'fr',
): string {
    return formatDate(value, locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
