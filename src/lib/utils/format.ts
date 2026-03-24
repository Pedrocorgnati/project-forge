// ─── UTILITÁRIOS DE FORMATAÇÃO ───────────────────────────────────────────────

/**
 * Formata uma data para exibição localizada.
 * @param date - Data a ser formatada
 * @param options - Opções do Intl.DateTimeFormat
 */
export function formatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', options).format(d)
}

/**
 * Formata uma data com hora.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formata um valor monetário.
 * @param amount - Valor numérico
 * @param currency - Código ISO da moeda (padrão: BRL)
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: 'BRL' | 'USD' | 'EUR' = 'BRL',
): string {
  if (amount == null || isNaN(amount)) return '—'
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formata horas decimais para exibição (ex: 1.5 → "1h 30min").
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null || isNaN(hours)) return '—'
  const h = Math.floor(Math.abs(hours))
  const m = Math.round((Math.abs(hours) - h) * 60)
  const sign = hours < 0 ? '-' : ''
  if (h === 0) return `${sign}${m}min`
  if (m === 0) return `${sign}${h}h`
  return `${sign}${h}h ${m}min`
}

/**
 * Formata um número como percentual.
 * @param value - Valor entre 0 e 1, ou 0 e 100 se `alreadyPercent` for true
 */
export function formatPercentage(
  value: number | null | undefined,
  alreadyPercent = false,
): string {
  if (value == null || isNaN(value)) return '—'
  const pct = alreadyPercent ? value : value * 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(pct / 100)
}

/**
 * Trunca uma string ao comprimento máximo, adicionando reticências.
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Formata um número de telefone brasileiro.
 * Suporta: (11) 91234-5678 ou (11) 1234-5678
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

/**
 * Formata um número com separadores de milhar.
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || isNaN(value)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
