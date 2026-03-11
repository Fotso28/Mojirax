# 03 — SSR + SEO (Meta Tags, Sitemap, Robots)

## Résumé

Optimiser le référencement en rendant les pages publiques côté serveur (SSR), en ajoutant des meta tags dynamiques (Open Graph, Twitter Card), un sitemap.xml et un robots.txt.

## Contexte

**Ce qui existe :**
- Next.js 16 avec App Router (supporte nativement RSC et SSR)
- URLs SEO-friendly avec slugs (`/projects/mojirax-k1cd`)
- Pages projets détaillées (`project-deck.tsx`)
- Aucun meta tag dynamique
- Aucun sitemap.xml
- Aucun robots.txt

## Spécification

### A. Meta Tags Dynamiques (Open Graph + Twitter)

**Pages cibles :**

| Page | Titre | Description | Image |
|------|-------|-------------|-------|
| `/projects/[slug]` | `{project.name} — CoMatch` | `{project.pitch}` | Logo projet ou OG par défaut |
| `/founders/[id]` | `{user.name} — Fondateur — CoMatch` | `{founderProfile.headline}` | Avatar |
| `/feed` | `Découvrir les projets — CoMatch` | Statique | OG par défaut |
| `/` | `CoMatch — Trouvez votre co-fondateur` | Statique | OG par défaut |

**Implémentation :** Utiliser `generateMetadata()` de Next.js App Router dans chaque `page.tsx` :

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const project = await fetchProject(params.slug);
  return {
    title: `${project.name} — CoMatch`,
    description: project.pitch,
    openGraph: {
      title: project.name,
      description: project.pitch,
      images: [project.logoUrl || '/og-default.png'],
    },
    twitter: { card: 'summary_large_image' },
  };
}
```

### B. Sitemap.xml

**Fichier :** `web/app/sitemap.ts`

```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await fetchPublishedProjects();
  return [
    { url: 'https://comatch.cm', lastModified: new Date(), priority: 1 },
    { url: 'https://comatch.cm/feed', priority: 0.8 },
    ...projects.map(p => ({
      url: `https://comatch.cm/projects/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.7,
    })),
  ];
}
```

### C. Robots.txt

**Fichier :** `web/app/robots.ts`

```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/onboarding/'] },
    sitemap: 'https://comatch.cm/sitemap.xml',
  };
}
```

### D. Image OG par défaut

Créer une image `public/og-default.png` (1200x630) avec le logo CoMatch et le slogan.

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `web/app/sitemap.ts` | **Créer** |
| `web/app/robots.ts` | **Créer** |
| `web/app/projects/[slug]/page.tsx` | Ajouter `generateMetadata` |
| `web/app/founders/[id]/page.tsx` | Ajouter `generateMetadata` |
| `web/app/layout.tsx` | Meta tags globaux par défaut |
| `web/public/og-default.png` | **Créer** (image OG) |

## Tests et validation

- [ ] `curl -s https://comatch.cm/projects/mojirax-k1cd | grep "og:title"` retourne le nom du projet
- [ ] `https://comatch.cm/sitemap.xml` retourne un sitemap valide avec les projets publiés
- [ ] `https://comatch.cm/robots.txt` retourne les règles correctes
- [ ] Google Rich Results Test valide les meta tags
- [ ] Partage d'un lien projet sur WhatsApp/Twitter affiche le titre + description + image

### Condition de validation finale

> Chaque page publique a des meta tags dynamiques (OG + Twitter). Un sitemap.xml liste tous les projets publiés. Le robots.txt autorise l'indexation des pages publiques et bloque les pages privées. Le partage social fonctionne avec preview riche.
