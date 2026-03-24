// tests/load/scenarios/rag-query.js
// Cenário: Busca vetorial HandoffAI — POST /api/projects/:id/rag/query
// Tipo: Operação pesada (pgvector) | Auth: Sim | SLO: p95 < 3000ms
//
// Fonte PRD: "Busca vetorial HandoffAI: p95 < 3s (busca) + tempo do Claude CLI para resposta"
// NOTA: Apenas a busca vetorial é testada. A geração de resposta via Claude CLI é client-side
//       e não pode ser testada via load test de servidor.
// Variável extra:
//   LOAD_TEST_PROJECT_ID - ID de projeto com repositório indexado no RAG
//
// Uso:
//   k6 run --env LOAD_TEST_PROJECT_ID=proj-uuid tests/load/scenarios/rag-query.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'
const SUPABASE_URL = __ENV.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || ''
const LOAD_TEST_USER = __ENV.LOAD_TEST_USER || 'loadtest@projectforge.local'
const LOAD_TEST_PASS = __ENV.LOAD_TEST_PASS || 'LoadTest@123'
const LOAD_TEST_PROJECT_ID = __ENV.LOAD_TEST_PROJECT_ID || 'PROJECT_ID_PLACEHOLDER'
const SCENARIO = __ENV.SCENARIO || 'average_load'

const errorRate = new Rate('errors')
const latencyTrend = new Trend('rag_query_latency')

// SLO PRD: p95 < 3s para busca vetorial
const SLO_P95 = 3000
const SLO_P99 = 8000

// Queries de exemplo para simular uso real do HandoffAI
const SAMPLE_QUERIES = [
  'Como funciona a autenticação no projeto?',
  'Quais são os endpoints da API de projetos?',
  'Como está estruturado o banco de dados?',
  'Explique o fluxo de aprovação de documentos',
  'Como o ScopeShield detecta scope creep?',
  'Qual a arquitetura do módulo RentabilIA?',
  'Como funciona o sistema de notificações?',
  'Quais são as permissões RBAC do projeto?',
]

// Carga mínima — pgvector + embedding é CPU-intensivo
const scenarios = {
  smoke: { executor: 'constant-vus', vus: 1, duration: '1m' },
  average_load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 5 },
      { duration: '5m', target: 5 },
      { duration: '2m', target: 0 },
    ],
    startTime: '1m',
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 15 },
      { duration: '5m', target: 15 },
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
    scenario: 'rag-query',
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
    query: randomItem(SAMPLE_QUERIES),
    top_k: 5,
  })

  const res = http.post(
    `${BASE_URL}/projects/${LOAD_TEST_PROJECT_ID}/rag/query`,
    payload,
    { headers, timeout: '15s' }
  )

  latencyTrend.add(res.timings.duration)

  const ok = check(res, {
    'rag-query status 200': (r) => r.status === 200,
    'rag-query latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'rag-query retorna resultados': (r) => {
      if (r.status !== 200) return true
      try {
        const body = JSON.parse(r.body)
        return (
          Array.isArray(body.results) ||
          Array.isArray(body.chunks) ||
          body.context != null
        )
      } catch {
        return false
      }
    },
  })

  errorRate.add(!ok)
  sleep(5) // throttle agressivo — embedding é caro
}
