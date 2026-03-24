// ─── CONSTANTES DE ANTI-FADIGA DE NOTIFICAÇÕES ───────────────────────────────

export const NOTIFICATION_LIMITS = {
  // Anti-fadiga: máximo de notificações por janela de tempo
  MAX_PER_DAY:           10,             // máximo de notificações por usuário por dia
  MAX_PER_TYPE_PER_5MIN: 3,             // máximo do mesmo tipo em 5 minutos
  COOLDOWN_MS:           5 * 60 * 1000, // janela de agrupamento (5 min)
  DEDUP_WINDOW_MS:       5 * 60 * 1000, // janela de deduplicação de emails

  // Quiet hours (padrão; sobrescrito por preferências do usuário)
  QUIET_HOURS_START: 22,  // 22h
  QUIET_HOURS_END:    8,  // 8h

  // Email
  EMAIL_BATCH_SIZE:      50,  // lote máximo para Resend
  EMAIL_RETRY_ATTEMPTS:   3,  // tentativas em falha de entrega

  // Severity thresholds para notificações automáticas
  SCOPE_DEVIATION_PCT_THRESHOLD:  20,    // % de desvio que aciona alerta ScopeShield
  PROFIT_MARGIN_LOW_THRESHOLD:    0.15,  // margem < 15% aciona alerta para SOCIO
  UTILIZATION_HIGH_THRESHOLD:     0.95,  // utilização > 95% notifica DEV
} as const
