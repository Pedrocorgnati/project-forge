import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  {
    slug: 'web-app',
    name: 'Web Application',
    subcategories: [
      { slug: 'web-app-saas', name: 'SaaS' },
      { slug: 'web-app-ecommerce', name: 'E-commerce' },
      { slug: 'web-app-dashboard', name: 'Dashboard / Admin' },
      { slug: 'web-app-portal', name: 'Portal / Extranet' },
    ],
  },
  {
    slug: 'mobile-app',
    name: 'Mobile Application',
    subcategories: [
      { slug: 'mobile-ios', name: 'iOS (Swift/React Native)' },
      { slug: 'mobile-android', name: 'Android (Kotlin/React Native)' },
      { slug: 'mobile-cross', name: 'Cross-platform (Flutter/RN)' },
    ],
  },
  {
    slug: 'api',
    name: 'API / Backend Service',
    subcategories: [
      { slug: 'api-rest', name: 'REST API' },
      { slug: 'api-graphql', name: 'GraphQL API' },
      { slug: 'api-microservices', name: 'Microservices' },
    ],
  },
  {
    slug: 'automation',
    name: 'Automação / Integração',
    subcategories: [
      { slug: 'automation-etl', name: 'ETL / Data Pipeline' },
      { slug: 'automation-rpa', name: 'RPA' },
      { slug: 'automation-webhook', name: 'Webhook / Event-driven' },
    ],
  },
  {
    slug: 'ai-ml',
    name: 'IA / Machine Learning',
    subcategories: [
      { slug: 'ai-chatbot', name: 'Chatbot / Assistente' },
      { slug: 'ai-rag', name: 'RAG / Knowledge Base' },
      { slug: 'ai-classifier', name: 'Classificador / Predição' },
    ],
  },
]

export async function seedProjectCategories() {
  console.log('🌱 Seeding project categories...')
  for (const cat of categories) {
    const parent = await prisma.projectCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { slug: cat.slug, name: cat.name },
    })
    for (const sub of cat.subcategories) {
      await prisma.projectCategory.upsert({
        where: { slug: sub.slug },
        update: { name: sub.name, parentId: parent.id },
        create: { slug: sub.slug, name: sub.name, parentId: parent.id },
      })
    }
  }
  const total = categories.length + categories.reduce((s, c) => s + c.subcategories.length, 0)
  console.log(`✅ ${total} categorias seedadas (5 raízes + 15 subcategorias)`)
}

// Executar diretamente se chamado via ts-node
if (require.main === module) {
  seedProjectCategories()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
