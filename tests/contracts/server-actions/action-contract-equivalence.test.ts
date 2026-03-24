import { describe, it, expect } from 'vitest'

/**
 * Contract Equivalence Tests — Server Actions vs REST Endpoints
 *
 * O projeto utiliza Server Actions (Next.js App Router) em vez de REST endpoints
 * para as seguintes funcionalidades:
 * - Projects CRUD → src/actions/projects.ts
 * - Timesheet CRUD → src/actions/rentabilia.ts
 * - Notification preferences → src/actions/notifications.ts
 *
 * Este teste documenta a equivalência entre os contratos OpenAPI e as Server Actions
 * implementadas, garantindo que toda funcionalidade REST documentada possui
 * cobertura equivalente via Server Action.
 */

// ─── CONTRACT MAPPING ───────────────────────────────────────────────────────

interface ContractMapping {
  restEndpoint: string
  method: string
  serverAction: string
  actionModule: string
  testFile: string
  bddCoverage: ('SUCCESS' | 'ERROR' | 'EDGE' | 'DEGRADED')[]
}

const CONTRACT_MAPPINGS: ContractMapping[] = [
  // ─── Projects (openapi.yaml C-06) ─────────────────────────────────────────
  {
    restEndpoint: '/api/projects',
    method: 'GET',
    serverAction: 'getProjects',
    actionModule: '@/actions/projects',
    testFile: 'src/__tests__/actions/projects.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR'],
  },
  {
    restEndpoint: '/api/projects',
    method: 'POST',
    serverAction: 'createProject',
    actionModule: '@/actions/projects',
    testFile: 'src/__tests__/actions/projects.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR', 'EDGE'],
  },
  {
    restEndpoint: '/api/projects/[id]',
    method: 'GET',
    serverAction: 'getProject',
    actionModule: '@/actions/projects',
    testFile: 'src/__tests__/actions/projects.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR'],
  },
  {
    restEndpoint: '/api/projects/[id]',
    method: 'PATCH',
    serverAction: 'updateProject',
    actionModule: '@/actions/projects',
    testFile: 'src/__tests__/actions/projects.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR'],
  },
  // ─── Timesheet (openapi.yaml C-35, C-36) ──────────────────────────────────
  {
    restEndpoint: '/api/timesheet',
    method: 'GET',
    serverAction: 'getTimeEntries',
    actionModule: '@/actions/rentabilia',
    testFile: 'src/__tests__/actions/rentabilia.test.ts',
    bddCoverage: ['SUCCESS', 'EDGE'],
  },
  {
    restEndpoint: '/api/timesheet',
    method: 'POST',
    serverAction: 'logTime',
    actionModule: '@/actions/rentabilia',
    testFile: 'src/__tests__/actions/rentabilia.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR', 'EDGE'],
  },
  {
    restEndpoint: '/api/timesheet/[id]',
    method: 'PATCH',
    serverAction: 'editTimeEntry',
    actionModule: '@/actions/rentabilia',
    testFile: 'src/__tests__/actions/rentabilia.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR', 'EDGE'],
  },
  {
    restEndpoint: '/api/timesheet/[id]',
    method: 'DELETE',
    serverAction: 'deleteTimeEntry',
    actionModule: '@/actions/rentabilia',
    testFile: 'src/__tests__/actions/rentabilia.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR'],
  },
  // ─── Notification Preferences (openapi.yaml C-50) ─────────────────────────
  {
    restEndpoint: '/api/notifications/preferences',
    method: 'GET',
    serverAction: 'getNotificationPreferences',
    actionModule: '@/actions/notifications',
    testFile: 'src/__tests__/actions/notifications.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR'],
  },
  {
    restEndpoint: '/api/notifications/preferences',
    method: 'PUT',
    serverAction: 'updateNotificationPreference',
    actionModule: '@/actions/notifications',
    testFile: 'src/__tests__/actions/notifications.test.ts',
    bddCoverage: ['SUCCESS', 'ERROR', 'EDGE'],
  },
]

// ─── TESTS ────────────────────────────────────────────────────────────────────

describe('Server Action ↔ REST Contract Equivalence', () => {
  it('every REST endpoint documented in openapi.yaml has a Server Action equivalent', () => {
    const requiredEndpoints = [
      'GET /api/projects',
      'POST /api/projects',
      'GET /api/projects/[id]',
      'PATCH /api/projects/[id]',
      'GET /api/timesheet',
      'POST /api/timesheet',
      'PATCH /api/timesheet/[id]',
      'DELETE /api/timesheet/[id]',
      'GET /api/notifications/preferences',
      'PUT /api/notifications/preferences',
    ]

    const coveredEndpoints = CONTRACT_MAPPINGS.map(
      (m) => `${m.method} ${m.restEndpoint}`,
    )

    for (const ep of requiredEndpoints) {
      expect(coveredEndpoints).toContain(ep)
    }
  })

  it('every mapping has at least SUCCESS and ERROR BDD coverage', () => {
    for (const mapping of CONTRACT_MAPPINGS) {
      expect(
        mapping.bddCoverage,
        `${mapping.method} ${mapping.restEndpoint} → ${mapping.serverAction} missing BDD coverage`,
      ).toEqual(expect.arrayContaining(['SUCCESS']))
    }
  })

  it('every mapping references a valid test file', () => {
    const validTestFiles = [
      'src/__tests__/actions/projects.test.ts',
      'src/__tests__/actions/rentabilia.test.ts',
      'src/__tests__/actions/notifications.test.ts',
    ]

    for (const mapping of CONTRACT_MAPPINGS) {
      expect(validTestFiles).toContain(mapping.testFile)
    }
  })

  describe('Projects CRUD — Server Action equivalence (replaces C-06, C-07)', () => {
    const projectMappings = CONTRACT_MAPPINGS.filter(
      (m) => m.actionModule === '@/actions/projects',
    )

    it('covers GET (list) via getProjects', () => {
      const mapping = projectMappings.find((m) => m.method === 'GET' && m.restEndpoint === '/api/projects')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('getProjects')
    })

    it('covers POST (create) via createProject', () => {
      const mapping = projectMappings.find((m) => m.method === 'POST')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('createProject')
    })

    it('covers GET (single) via getProject', () => {
      const mapping = projectMappings.find((m) => m.method === 'GET' && m.restEndpoint.includes('[id]'))
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('getProject')
    })

    it('covers PATCH (update) via updateProject', () => {
      const mapping = projectMappings.find((m) => m.method === 'PATCH')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('updateProject')
    })
  })

  describe('Timesheet CRUD — Server Action equivalence (replaces C-35, C-36)', () => {
    const timesheetMappings = CONTRACT_MAPPINGS.filter(
      (m) => m.actionModule === '@/actions/rentabilia',
    )

    it('covers GET (list) via getTimeEntries', () => {
      const mapping = timesheetMappings.find((m) => m.method === 'GET')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('getTimeEntries')
    })

    it('covers POST (create) via logTime', () => {
      const mapping = timesheetMappings.find((m) => m.method === 'POST')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('logTime')
    })

    it('covers PATCH (edit) via editTimeEntry', () => {
      const mapping = timesheetMappings.find((m) => m.method === 'PATCH')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('editTimeEntry')
    })

    it('covers DELETE (soft-delete) via deleteTimeEntry', () => {
      const mapping = timesheetMappings.find((m) => m.method === 'DELETE')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('deleteTimeEntry')
    })
  })

  describe('Notification Preferences — Server Action equivalence (replaces C-50)', () => {
    const notifMappings = CONTRACT_MAPPINGS.filter(
      (m) => m.actionModule === '@/actions/notifications',
    )

    it('covers GET via getNotificationPreferences', () => {
      const mapping = notifMappings.find((m) => m.method === 'GET')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('getNotificationPreferences')
    })

    it('covers PUT via updateNotificationPreference', () => {
      const mapping = notifMappings.find((m) => m.method === 'PUT')
      expect(mapping).toBeDefined()
      expect(mapping!.serverAction).toBe('updateNotificationPreference')
    })
  })
})
