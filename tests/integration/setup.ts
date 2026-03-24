import { vi, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

// ─── MOCK: Next.js internals ──────────────────────────────────────────────────
// Necessário para importar Server Actions (usam next/cache, next/navigation)

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
  headers: vi.fn(() => new Headers()),
}))

// ─── DB LIFECYCLE ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})
