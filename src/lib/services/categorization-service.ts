import { prisma } from '@/lib/db'

// ─── CATEGORIZATION SERVICE ───────────────────────────────────────────────────

interface CategorizationResult {
  category: string
  subcategory?: string
  confidence: number // 0–1
}

// Mapa de keywords → categoria (fallback sem IA para itens simples)
const KEYWORD_MAP: Record<string, string> = {
  'api': 'backend-api', 'endpoint': 'backend-api', 'route': 'backend-api',
  'service': 'backend-api', 'controller': 'backend-api', 'crud': 'backend-api',
  'component': 'frontend-component', 'button': 'frontend-component',
  'form': 'frontend-component', 'modal': 'frontend-component', 'widget': 'frontend-component',
  'page': 'frontend-page', 'screen': 'frontend-page', 'view': 'frontend-page',
  'dashboard': 'frontend-page', 'landing': 'frontend-page',
  'auth': 'auth-system', 'login': 'auth-system', 'oauth': 'auth-system',
  'permission': 'auth-system', 'rbac': 'auth-system', 'autenticação': 'auth-system',
  'migration': 'database-design', 'schema': 'database-design',
  'model': 'database-design', 'index': 'database-design', 'banco': 'database-design',
  'webhook': 'integration', 'payment': 'integration', 'email': 'integration',
  'stripe': 'integration', 'twilio': 'integration', 'pagamento': 'integration',
  'test': 'testing', 'spec': 'testing', 'e2e': 'testing', 'teste': 'testing',
  'docker': 'devops', 'ci': 'devops', 'pipeline': 'devops', 'deploy': 'devops',
  'mobile': 'mobile-screen', 'ios': 'mobile-screen', 'android': 'mobile-screen',
  'ai': 'ai-ml', 'llm': 'ai-ml', 'embedding': 'ai-ml', 'rag': 'ai-ml', 'ia': 'ai-ml',
}

/**
 * Categoriza itens de estimativa por keywords na descrição.
 * Se nenhuma keyword for reconhecida, retorna 'backend-api' como fallback.
 */
export class CategorizationService {
  static async categorize(description: string): Promise<CategorizationResult> {
    const lower = description.toLowerCase()
    const scores: Record<string, number> = {}

    for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
      if (lower.includes(keyword)) {
        scores[category] = (scores[category] ?? 0) + 1
      }
    }

    if (Object.keys(scores).length === 0) {
      return { category: 'backend-api', confidence: 0.3 }
    }

    // Categoria com maior score
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
    const confidence = Math.min(1, best[1] / 3) // 3 keywords → confiança máxima

    // Busca subcategoria mais próxima
    const subcategories = await prisma.projectCategory.findMany({
      where: { parent: { slug: best[0] } },
    })
    const subcatMatch = subcategories.find(
      (s: { name: string; slug: string }) => lower.includes(s.name.toLowerCase()) || lower.includes(s.slug.replace(/-/g, ' ')),
    )

    return {
      category: best[0],
      subcategory: subcatMatch?.slug,
      confidence,
    }
  }

  static async categorizeBatch(descriptions: string[]): Promise<CategorizationResult[]> {
    return Promise.all(descriptions.map(d => this.categorize(d)))
  }
}
