import { PrismaClient } from '@prisma/client'
import { seedProd } from './seeds/prod'
import { seedDev } from './seeds/dev'
import { seedDevExtended } from './seeds/dev-extended'

const prisma = new PrismaClient()

async function main() {
  const env = process.env.NODE_ENV ?? 'development'
  console.log(`🌱 Running seed for environment: ${env}`)

  // Prod seed primeiro (dados base obrigatórios para qualquer ambiente)
  const { orgId } = await seedProd()
  console.log('✅ Prod seed completed')

  if (env !== 'production') {
    await seedDev(orgId)
    console.log('✅ Dev seed completed')

    await seedDevExtended(orgId)
    console.log('✅ Dev extended seed completed (full enum coverage + edge cases)')
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
