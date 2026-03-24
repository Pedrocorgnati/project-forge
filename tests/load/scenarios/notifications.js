// tests/load/scenarios/notifications.js
// Cenário: Listagem de notificações — GET /api/notifications
// Tipo: Frequência alta | Auth: Sim | SLO: p95 < 500ms
//
// Uso:
//   k6 run --env LOAD_TEST_USER=user@example.com tests/load/scenarios/notifications.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'
const SUPABASE_URL = __ENV.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || ''
const LOAD_TEST_USER = __ENV.LOAD_TEST_USER || 'loadtest@projectforge.local'
const LOAD_TEST_PASS = __ENV.LOAD_TEST_PASS || 'LoadTest@123'
const SCENARIO = __ENV.SCENARIO || 'average_load'

const errorRate = new Rate('errors')
const latencyTrend = new Trend('notifications_latency')

const SLO_P95 = 500
const SLO_P99 = 1000

const scenarios = {
  smoke: { executor: 'constant-vus', vus: 1, duration: '1m' },
  average_load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 30 },
      { duration: '5m', target: 30 },
      { duration: '2m', target: 0 },
    ],
    startTime: '1m',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 150 },
      { duration: '5m', target: 150 },
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
    scenario: 'notifications',
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

  const res = http.get(`${BASE_URL}/notifications`, { headers })

  latencyTrend.add(res.timings.duration)

  const ok = check(res, {
    'notifications status 200': (r) => r.status === 200,
    'notifications latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'notifications retorna array': (r) => {
      if (r.status !== 200) return true
      try {
        const body = JSON.parse(r.body)
        return (
          Array.isArray(body) ||
          Array.isArray(body.data) ||
          Array.isArray(body.notifications)
        )
      } catch {
        return false
      }
    },
  })

  errorRate.add(!ok)
  sleep(1)
}
