// ─── STORAGE KEYS ─────────────────────────────────────────────────────────────
// Chaves centralizadas para localStorage e sessionStorage.
// Uso: evitar strings mágicas espalhadas e facilitar refatorações.

export const STORAGE_KEYS = {
  // Modo degradado por módulo de IA
  DEGRADED_FLAG: (module: string) => `degraded-${module}`,
} as const
