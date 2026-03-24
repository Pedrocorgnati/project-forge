// tests/load/scenarios/create-task.js
// Cenário: Criar task no Kanban — POST /api/projects/:id/tasks
// Tipo: Impacto alto (escrita) | Auth: Sim | SLO: p95 < 800ms
//
// ATENÇÃO: Este cenário cria dados reais no banco. Use apenas com usuário de teste em ambiente de dev/staging.
// Variável extra:
//   LOAD_TEST_PROJECT_ID - ID de projeto real para o teste
//
// Uso:
//   k6 run --env LOAD_TEST_PROJECT_ID=proj-uuid tests/load/scenarios/create-task.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'
const SUPABASE_URL = __ENV.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || ''
const LOAD_TEST_USER = __ENV.LOAD_TEST_USER || 'loadtest@projectforge.local'
const LOAD_TEST_PASS = __ENV.LOAD_TEST_PASS || 'LoadTest@123'
const LOAD_TEST_PROJECT_ID = __ENV.LOAD_TEST_PROJECT_ID || 'PROJECT_ID_PLACEHOLDER'
const SCENARIO = __ENV.SCENARIO || 'smoke'

const errorRate = new Rate('errors')
const latencyTrend = new Trend('create_task_latency')

const SLO_P95 = 800
const SLO_P99 = 2000

// NOTA: Para testes de escrita, usar carga menor por padrão (máx 20 VUs)
const scenarios = {
  smoke: { executor: 'constant-vus', vus: 1, duration: '1m' },
  average_load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 10 },
      { duration: '2m', target: 0 },
    ],
    startTime: '1m',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 20 },
      { duration: '2m', target: 0 },
    ],
    startTime: '10m',
  },
}

export const options = {
  scenarios: {
    [SCENARIO]: scenarios[SCENARIO] || scenarios.smoke,
  },
  thresholds: {
    http_req_duration: [`p(95)<${SLO_P95}`, `p(99)<${SLO_P99}`],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.05'],
  },
  tags: {
    commit: __ENV.COMMIT_SHA || 'local',
    scenario: 'create-task',
  },
}

export function setup() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { token: null }

  const authRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: LOAD_TEST_USER, password: LOAD_TEST_PASS }),
    { headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY } }
  )

  if (authRes.status !== 200) return { token: null }
  return { token: JSON.parse(authRes.body).access_token }
}

export default function (data) {
  const headers = { 'Content-Type': 'application/json' }
  if (data.token) headers['Authorization'] = `Bearer ${data.token}`

  const payload = JSON.stringify({
    title: `[LOAD-TEST] Task ${randomString(8)}`,
    description: 'Task gerada por teste de carga — pode ser removida via db:reset.',
    status: 'TODO',
    estimated_hours: 1,
  })

  const res = http.post(
    `${BASE_URL}/projects/${LOAD_TEST_PROJECT_ID}/tasks`,
    payload,
    { headers }
  )

  latencyTrend.add(res.timings.duration)

  const ok = check(res, {
    'create-task status 201': (r) => r.status === 201,
    'create-task latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'create-task retorna id': (r) => {
      if (r.status !== 201) return true
      try {
        const body = JSON.parse(r.body)
        return body.id != null
      } catch {
        return false
      }
    },
  })

  errorRate.add(!ok)
  sleep(2) // throttle para escrita — evitar flood no banco
}
