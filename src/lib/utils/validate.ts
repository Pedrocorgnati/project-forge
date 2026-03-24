// ─── UTILITÁRIOS DE VALIDAÇÃO ────────────────────────────────────────────────

/**
 * Valida formato de e-mail (RFC 5322 simplificado).
 */
export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * Valida número de telefone brasileiro (10 ou 11 dígitos).
 */
export function isValidPhone(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}

/**
 * Valida se o valor é um número positivo (> 0).
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0
}

/**
 * Valida se o valor é uma data válida.
 */
export function isValidDate(value: unknown): value is Date {
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return !Number.isNaN(d.getTime())
  }
  return false
}

/**
 * Detecta tentativas de prompt injection ou conteúdo suspeito.
 * Usado para sanitizar inputs antes de enviar ao AI provider.
 */
export function hasSuspiciousContent(text: string): boolean {
  const patterns = [
    /ignore\s+(previous|all|above)\s+(instructions?|prompts?|context)/i,
    /system\s*:\s*you\s+are/i,
    /\[\s*system\s*\]/i,
    /<\s*system\s*>/i,
    /jailbreak/i,
    /DAN\s+mode/i,
    /act\s+as\s+if\s+you\s+(have|are)/i,
    /pretend\s+(you|to\s+be)/i,
    /forget\s+your\s+(instructions?|training|rules)/i,
  ]
  return patterns.some((pattern) => pattern.test(text))
}

/**
 * Valida se uma string é um UUID v4 válido.
 */
export function isValidUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Valida se uma string não está vazia após trim.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Valida se um valor está dentro de um range numérico [min, max].
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}
