import type { MetadataRoute } from 'next'

/**
 * Robots.txt para o ProjectForge.
 * Bloqueia crawlers em rotas autenticadas e privadas.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://projectforge.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/login', '/recuperar-senha'],
        disallow: [
          '/',            // redireciona para /app/dashboard (autenticado)
          '/app/',
          '/portal/',
          '/api/',
          '/projects/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
