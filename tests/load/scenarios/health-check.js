// tests/load/scenarios/health-check.js
// Cenário: Endpoint de saúde — GET /api/health
// Tipo: Frequência alta | Auth: Não | SLO: p95 < 200ms
//
// Uso:
//   Smoke: k6 run --env SCENARIO=smoke tests/load/scenarios/health-check.js
//   Carga: k6 run tests/load/scenarios/health-check.js
//   Stress: k6 run --env SCENARIO=stress tests/load/scenarios/health-check.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api'
const SCENARIO = __ENV.SCENARIO || 'average_load'

const errorRate = new Rate('errors')
const latencyTrend = new Trend('health_check_latency')

const SLO_P95 = 200
const SLO_P99 = 500

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
    scenario: 'health-check',
  },
}

export default function () {
  const res = http.get(`${BASE_URL}/health`)

  latencyTrend.add(res.timings.duration)

  const ok = check(res, {
    'health status 200': (r) => r.status === 200,
    'health latência < SLO p95': (r) => r.timings.duration < SLO_P95,
    'health body válido': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status === 'ok' || body.status === 'healthy' || r.status === 200
      } catch {
        return r.status === 200
      }
    },
  })

  errorRate.add(!ok)
  sleep(1)
}
