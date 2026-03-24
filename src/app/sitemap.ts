import type { MetadataRoute } from 'next'

/**
 * Sitemap estático para rotas públicas do ProjectForge.
 * Rotas autenticadas (/app, /portal) são excluídas intencionalmente.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://projectforge.app'

  return [
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/recuperar-senha`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
