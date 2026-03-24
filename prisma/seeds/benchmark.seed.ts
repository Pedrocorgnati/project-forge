import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const benchmarks = [
  // Backend
  { category: 'backend-api', subcategory: 'rest-endpoint', avgHours: 60, p25: 40, p75: 80, source: 'internal-2024' },
  { category: 'backend-api', subcategory: 'crud-service', avgHours: 30, p25: 20, p75: 45, source: 'internal-2024' },
  // Auth
  { category: 'auth-system', subcategory: 'oauth-setup', avgHours: 30, p25: 20, p75: 40, source: 'survey-techbrasil-2024' },
  { category: 'auth-system', subcategory: 'rbac', avgHours: 16, p25: 10, p75: 24, source: 'survey-techbrasil-2024' },
  // Database
  { category: 'database-design', subcategory: 'schema-modeling', avgHours: 15, p25: 10, p75: 20, source: 'internal-2024' },
  { category: 'database-design', subcategory: 'migrations', avgHours: 8, p25: 4, p75: 12, source: 'internal-2024' },
  // Frontend Components
  { category: 'frontend-component', subcategory: 'form-complex', avgHours: 14, p25: 8, p75: 20, source: 'internal-2024' },
  { category: 'frontend-component', subcategory: 'table-interactive', avgHours: 12, p25: 8, p75: 16, source: 'internal-2024' },
  { category: 'frontend-component', subcategory: 'dashboard-widget', avgHours: 10, p25: 6, p75: 16, source: 'internal-2024' },
  // Frontend Pages
  { category: 'frontend-page', subcategory: 'landing-page', avgHours: 20, p25: 12, p75: 32, source: 'survey-techbrasil-2024' },
  { category: 'frontend-page', subcategory: 'dashboard', avgHours: 30, p25: 20, p75: 45, source: 'internal-2024' },
  { category: 'frontend-page', subcategory: 'list-view', avgHours: 8, p25: 4, p75: 14, source: 'internal-2024' },
  // Integrations
  { category: 'integration', subcategory: 'payment-gateway', avgHours: 24, p25: 16, p75: 36, source: 'internal-2024' },
  { category: 'integration', subcategory: 'email-service', avgHours: 8, p25: 4, p75: 12, source: 'internal-2024' },
  { category: 'integration', subcategory: 'webhook', avgHours: 12, p25: 8, p75: 20, source: 'internal-2024' },
  // DevOps
  { category: 'devops', subcategory: 'ci-cd-setup', avgHours: 12, p25: 8, p75: 20, source: 'internal-2024' },
  { category: 'devops', subcategory: 'docker', avgHours: 6, p25: 4, p75: 10, source: 'internal-2024' },
  // Mobile
  { category: 'mobile-screen', subcategory: 'list-screen', avgHours: 10, p25: 6, p75: 14, source: 'survey-techbrasil-2024' },
  { category: 'mobile-screen', subcategory: 'form-screen', avgHours: 12, p25: 8, p75: 18, source: 'survey-techbrasil-2024' },
  // Testing
  { category: 'testing', subcategory: 'unit-tests', avgHours: 8, p25: 4, p75: 12, source: 'internal-2024' },
  { category: 'testing', subcategory: 'integration-tests', avgHours: 12, p25: 8, p75: 20, source: 'internal-2024' },
  // AI/ML
  { category: 'ai-ml', subcategory: 'rag-system', avgHours: 40, p25: 24, p75: 60, source: 'internal-2024' },
  { category: 'ai-ml', subcategory: 'llm-integration', avgHours: 20, p25: 12, p75: 32, source: 'internal-2024' },
]

export async function seedBenchmarks() {
  console.log('🌱 Seeding benchmarks...')
  for (const b of benchmarks) {
    const seedId = `seed-${b.category}-${b.subcategory ?? 'main'}`
    await prisma.benchmark.upsert({
      where: { id: seedId },
      update: { avgHours: b.avgHours, p25: b.p25, p75: b.p75, source: b.source },
      create: {
        id: seedId,
        category: b.category,
        subcategory: b.subcategory ?? null,
        avgHours: b.avgHours,
        p25: b.p25,
        p75: b.p75,
        source: b.source,
      },
    })
  }
  console.log(`✅ ${benchmarks.length} benchmarks seedados`)
}

// Executar diretamente se chamado via ts-node
if (require.main === module) {
  seedBenchmarks()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
