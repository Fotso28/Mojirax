// web/src/lib/constants/sectors.ts
export const SECTORS = [
    { value: 'FINTECH', label: 'Fintech' },
    { value: 'AGRITECH', label: 'Agritech' },
    { value: 'HEALTHTECH', label: 'Santé / HealthTech' },
    { value: 'EDTECH', label: 'EdTech' },
    { value: 'LOGISTICS', label: 'Logistique' },
    { value: 'ECOMMERCE', label: 'E-commerce' },
    { value: 'SAAS', label: 'SaaS / B2B' },
    { value: 'MARKETPLACE', label: 'Marketplace' },
    { value: 'IMPACT', label: 'Impact Social' },
    { value: 'AI', label: 'IA / Data' },
    { value: 'OTHER', label: 'Autre' },
] as const;

export type SectorValue = typeof SECTORS[number]['value'];

export const SECTOR_VALUES = SECTORS.map(s => s.value);

/** Map a technical sector value (e.g. 'LOGISTICS') to its French label */
export function getSectorLabel(value: string | null | undefined): string {
    if (!value) return '';
    return SECTORS.find(s => s.value === value)?.label || value;
}
