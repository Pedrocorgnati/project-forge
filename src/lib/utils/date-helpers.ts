/**
 * ISO Week helpers — extraidos de rentabilia.ts para reuso.
 */

/**
 * Retorna a data de inicio (segunda-feira) de uma semana ISO.
 */
export function getISOWeekStart(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const startOfYear = new Date(jan4)
  startOfYear.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const start = new Date(startOfYear)
  start.setDate(start.getDate() + (week - 1) * 7)
  return start
}

/**
 * Retorna o numero da semana ISO para uma data.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
