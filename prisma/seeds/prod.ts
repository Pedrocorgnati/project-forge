import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedProd() {
  // ── 1. Organização principal ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'project-forge' },
    update: {},
    create: {
      name: 'Project Forge',
      slug: 'project-forge',
    },
  })

  // ── 2. SOCIO inicial (idempotente via upsert) ─────────────────────────────
  await prisma.user.upsert({
    where: { email: 'pedro@projectforge.app' },
    update: {},
    create: {
      id: process.env.SEED_SOCIO_SUPABASE_ID ?? '00000000-0000-0000-0000-000000000001',
      organizationId: org.id,
      email: 'pedro@projectforge.app',
      name: 'Pedro Corgnati',
      role: UserRole.SOCIO,
    },
  })

  // ── 3. CostRates (1 por role) ─────────────────────────────────────────────
  const costRates = [
    { role: UserRole.SOCIO, hourlyRate: 250 },
    { role: UserRole.PM, hourlyRate: 180 },
    { role: UserRole.DEV, hourlyRate: 140 },
    { role: UserRole.CLIENTE, hourlyRate: 0 },
  ]
  for (const rate of costRates) {
    await prisma.costRate.upsert({
      where: { organizationId_role: { organizationId: org.id, role: rate.role } },
      update: { hourlyRate: rate.hourlyRate },
      create: {
        organizationId: org.id,
        role: rate.role,
        hourlyRate: rate.hourlyRate,
        currency: 'BRL',
      },
    })
  }

  // ── 4. ProjectCategories (12 categorias) ─────────────────────────────────
  const categories = [
    { id: 'cat-frontend', slug: 'frontend', name: 'Frontend', parentId: null },
    { id: 'cat-backend', slug: 'backend', name: 'Backend', parentId: null },
    { id: 'cat-mobile', slug: 'mobile', name: 'Mobile', parentId: null },
    { id: 'cat-devops', slug: 'devops', name: 'DevOps & Infra', parentId: null },
    { id: 'cat-ai', slug: 'ai-ml', name: 'AI / ML', parentId: null },
  ]
  for (const cat of categories) {
    await prisma.projectCategory.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: cat,
    })
  }

  // ── 5. Benchmarks (calibrated by category) ────────────────────────────────
  const benchmarks = [
    { id: 'bm-frontend-page', category: 'frontend-page', subcategory: null, avgHours: 12, p25: 8, p75: 20, source: 'internal-2024' },
    { id: 'bm-frontend-component', category: 'frontend-component', subcategory: null, avgHours: 6, p25: 3, p75: 10, source: 'internal-2024' },
    { id: 'bm-backend-api', category: 'backend-api', subcategory: null, avgHours: 16, p25: 10, p75: 28, source: 'internal-2024' },
    { id: 'bm-auth-system', category: 'auth-system', subcategory: null, avgHours: 30, p25: 20, p75: 45, source: 'internal-2024' },
    { id: 'bm-integration', category: 'integration', subcategory: null, avgHours: 20, p25: 12, p75: 35, source: 'internal-2024' },
    { id: 'bm-devops', category: 'devops', subcategory: null, avgHours: 24, p25: 16, p75: 40, source: 'internal-2024' },
    { id: 'bm-database', category: 'database-design', subcategory: null, avgHours: 18, p25: 10, p75: 30, source: 'internal-2024' },
    { id: 'bm-testing', category: 'testing', subcategory: null, avgHours: 10, p25: 6, p75: 18, source: 'internal-2024' },
    { id: 'bm-ai-ml', category: 'ai-ml', subcategory: null, avgHours: 40, p25: 24, p75: 70, source: 'internal-2024' },
  ]
  for (const b of benchmarks) {
    await prisma.benchmark.upsert({
      where: { id: b.id },
      update: { avgHours: b.avgHours, p25: b.p25, p75: b.p75 },
      create: b,
    })
  }

  console.log('  ✓ Org, SOCIO, CostRates, 5 ProjectCategories, 9 Benchmarks')
  return { orgId: org.id }
}
