// ─── CONSTANTES DE TIMING ─────────────────────────────────────────────────────

export const TIMING = {
  // UI
  DEBOUNCE_MS:           300,          // debounce de inputs de busca
  TOAST_DURATION_MS:     4_000,        // duração padrão de toasts
  SKELETON_DELAY_MS:     200,          // delay antes de mostrar skeleton (evita flash)
  ANIMATION_DURATION_MS: 200,          // duração de transições CSS
  COPIED_FEEDBACK_MS:    1_500,        // duração do feedback visual de "copiado"
  REFRESH_DELAY_MS:      1_500,        // delay antes de router.refresh() pós-ação
  FOCUS_DELAY_MS:        50,           // delay para focar elemento após renderização
  FORM_FEEDBACK_MS:      400,          // delay de feedback simulado em formulários

  // Cache (TanStack Query)
  CACHE_TTL_MS:   5 * 60 * 1000,      // 5 minutos
  STALE_TIME_MS:  2 * 60 * 1000,      // 2 minutos

  // Business Logic
  APPROVAL_SLA_HOURS:  72,                // SLA de aprovação do cliente (INT-082)
  SESSION_TIMEOUT_MS:  30 * 60 * 1000,   // 30 minutos de inatividade

  // AI
  AI_GENERATE_TIMEOUT_MS:    60_000,  // timeout do Claude CLI (alinhado com ClaudeCliProvider)
  AI_HEALTH_TIMEOUT_MS:       5_000,  // timeout do health check (alinhado com checkAIHealth)
  CIRCUIT_BREAKER_RESET_MS:  60_000,  // tempo até HALF-OPEN (alinhado com CircuitBreaker)

  // Event Bus
  EVENT_WORKER_POLL_MS:  5_000,       // polling do worker de eventos
  EVENT_RETRY_DELAY_MS:  1_000,       // delay entre retries do worker
} as const
