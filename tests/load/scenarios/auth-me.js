// tests/load/scenarios/auth-me.js
// Cenário: Verificação de sessão autenticada — GET /api/auth/me
// Tipo: Auth check | Auth: Sim (Supabase JWT) | SLO: p95 < 500ms
//
// Variáveis de ambiente necessárias:
//   BASE_URL         - URL base da API (padrão: http://localhost:3000/api)
//   SUPABASE_URL     - URL do projeto Supabase
//   SUPABASE_ANON_KEY- Chave anon do Supabase
//   LOAD_TEST_USER   - Email do usuário de carga
//   LOAD_TEST_PASS   - Senha do usuário de carga
//
// Uso:
//   k6 run --env LOAD_TEST_USER=user@example.com --env LOAD_TEST_PASS=pass tests/load/scenarios/auth-me.js

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
const latencyTrend = new Trend('auth_me_latency')

const SLO_P95 = 500
const SLO_P99 = 1000

const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
  },
  average_load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 20 },
      { duration: '2m', target: 0 },
    ],
    startTime: '1m',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
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
    scenario: 'auth-me',
  },
}

// Obtém token JWT via Supabase Auth antes de iniciar o teste
export function setup() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      'SUPABASE_URL ou SUPABASE_ANON_KEY não configurados. ' +
      'Cenário auth-me será executado sem token e deve retornar 401.'
    )
    return { token: null }
  }

  const authRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: LOAD_TEST_USER, password: LOAD_TEST_PASS }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
    }
  )

  if (authRes.status !== 200) {
    console.error(`Setup falhou — login retornou ${authRes.status}: ${authRes.body}`)
    return { token: null }
  }

  const body = JSON.parse(authRes.body)
  console.log(`Setup: token obtido para ${LOAD_TEST_USER}`)
  return { token: body.access_token }
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (data.token) {
    headers['Authorization'] = `Bearer ${data.token}`
  }

  const res = http.get(`${BASE_URL}/auth/me`, { headers })

  latencyTrend.add(res.timings.duration)

  const ok = check(res, {
    'auth/me status 200': (r) => r.status === 200,
    'auth/me latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'auth/me retorna user': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.id != null || body.user != null
      } catch {
        return false
      }
    },
  })

  errorRate.add(!ok)
  sleep(1)
}
