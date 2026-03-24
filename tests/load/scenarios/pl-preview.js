// tests/load/scenarios/pl-preview.js
// Cenário: Preview P&L RentabilIA — GET /api/projects/:id/pl-preview
// Tipo: Operação pesada | Auth: Sim | SLO: p95 < 2000ms
//
// Ponto de atenção: endpoint cruza horas/timesheet/custo — pode ser CPU-intensivo sob carga.
// Variável extra:
//   LOAD_TEST_PROJECT_ID - ID de projeto com dados de timesheet populados
//
// Uso:
//   k6 run --env LOAD_TEST_PROJECT_ID=proj-uuid tests/load/scenarios/pl-preview.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'
const SUPABASE_URL = __ENV.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || ''
const LOAD_TEST_USER = __ENV.LOAD_TEST_USER || 'loadtest@projectforge.local'
const LOAD_TEST_PASS = __ENV.LOAD_TEST_PASS || 'LoadTest@123'
const LOAD_TEST_PROJECT_ID = __ENV.LOAD_TEST_PROJECT_ID || 'PROJECT_ID_PLACEHOLDER'
const SCENARIO = __ENV.SCENARIO || 'average_load'

const errorRate = new Rate('errors')
const latencyTrend = new Trend('pl_preview_latency')

// SLO: operação pesada (consolidação P&L com horas/custo)
const SLO_P95 = 2000
const SLO_P99 = 5000

// Carga menor por ser operação pesada
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
      { duration: '2m', target: 30 },
      { duration: '5m', target: 30 },
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
    errors: ['rate<0.05'],
    http_req_failed: ['rate<0.05'],
  },
  tags: {
    commit: __ENV.COMMIT_SHA || 'local',
    scenario: 'pl-preview',
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

  const res = http.get(
    `${BASE_URL}/projects/${LOAD_TEST_PROJECT_ID}/pl-preview`,
    { headers, timeout: '10s' }
  )

  latencyTrend.add(res.timings.duration)

  const ok = check(res, {
    'pl-preview status 200': (r) => r.status === 200,
    'pl-preview latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'pl-preview retorna dados P&L': (r) => {
      if (r.status !== 200) return true
      try {
        const body = JSON.parse(r.body)
        return (
          body.profit_margin != null ||
          body.margin != null ||
          body.total_cost != null ||
          body.pl != null
        )
      } catch {
        return false
      }
    },
  })

  errorRate.add(!ok)
  sleep(3) // throttle — operação pesada
}
