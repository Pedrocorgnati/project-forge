import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatHours,
  formatPercentage,
  truncate,
  formatPhone,
  formatNumber,
} from '../format'

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a Date object to pt-BR default format', () => {
    const result = formatDate(new Date('2024-06-15T12:00:00Z'))
    expect(result).toMatch(/15/)
    expect(result).toMatch(/06/)
    expect(result).toMatch(/2024/)
  })

  it('formats a date string', () => {
    const result = formatDate('2024-01-01')
    expect(result).toBeTruthy()
    expect(result).not.toBe('—')
  })

  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns dash for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })

  it('accepts custom Intl options', () => {
    const result = formatDate(new Date('2024-06-15'), { year: 'numeric' })
    expect(result).toContain('2024')
  })
})

// ─── formatDateTime ──────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('includes hours and minutes', () => {
    const result = formatDateTime(new Date('2024-06-15T14:30:00'))
    expect(result).toBeTruthy()
    expect(result).not.toBe('—')
  })

  it('returns dash for null', () => {
    expect(formatDateTime(null)).toBe('—')
  })
})

// ─── formatCurrency ──────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats BRL by default', () => {
    const result = formatCurrency(1234.5)
    expect(result).toContain('R$')
    expect(result).toContain('1.234,50')
  })

  it('formats USD', () => {
    const result = formatCurrency(1234.5, 'USD')
    expect(result).toContain('$')
  })

  it('formats EUR', () => {
    const result = formatCurrency(1234.5, 'EUR')
    expect(result).toContain('€')
  })

  it('returns dash for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })

  it('returns dash for undefined', () => {
    expect(formatCurrency(undefined)).toBe('—')
  })

  it('returns dash for NaN', () => {
    expect(formatCurrency(NaN)).toBe('—')
  })

  it('formats zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).not.toBe('—')
    expect(result).toContain('0,00')
  })

  it('formats negative values', () => {
    const result = formatCurrency(-50)
    expect(result).toContain('50,00')
  })
})

// ─── formatHours ─────────────────────────────────────────────────────────────

describe('formatHours', () => {
  it('formats whole hours', () => {
    expect(formatHours(3)).toBe('3h')
  })

  it('formats minutes only when less than 1 hour', () => {
    expect(formatHours(0.5)).toBe('30min')
  })

  it('formats hours and minutes', () => {
    expect(formatHours(1.5)).toBe('1h 30min')
  })

  it('formats zero as 0min', () => {
    expect(formatHours(0)).toBe('0min')
  })

  it('handles negative hours', () => {
    expect(formatHours(-2)).toBe('-2h')
  })

  it('handles negative fractional hours', () => {
    expect(formatHours(-1.5)).toBe('-1h 30min')
  })

  it('returns dash for null', () => {
    expect(formatHours(null)).toBe('—')
  })

  it('returns dash for NaN', () => {
    expect(formatHours(NaN)).toBe('—')
  })
})

// ─── formatPercentage ────────────────────────────────────────────────────────

describe('formatPercentage', () => {
  it('formats decimal value as percentage', () => {
    const result = formatPercentage(0.75)
    expect(result).toContain('75')
    expect(result).toContain('%')
  })

  it('formats already-percent value', () => {
    const result = formatPercentage(75, true)
    expect(result).toContain('75')
    expect(result).toContain('%')
  })

  it('formats zero', () => {
    const result = formatPercentage(0)
    expect(result).toContain('0')
    expect(result).toContain('%')
  })

  it('returns dash for null', () => {
    expect(formatPercentage(null)).toBe('—')
  })

  it('returns dash for NaN', () => {
    expect(formatPercentage(NaN)).toBe('—')
  })
})

// ─── truncate ────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns full text when shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('returns full text when exactly maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('truncates and adds ellipsis when longer than maxLength', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('returns empty string for null', () => {
    expect(truncate(null, 10)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(truncate(undefined, 10)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(truncate('', 10)).toBe('')
  })
})

// ─── formatPhone ─────────────────────────────────────────────────────────────

describe('formatPhone', () => {
  it('formats 11-digit mobile number', () => {
    expect(formatPhone('11912345678')).toBe('(11) 91234-5678')
  })

  it('formats 10-digit landline number', () => {
    expect(formatPhone('1112345678')).toBe('(11) 1234-5678')
  })

  it('strips non-digit characters before formatting', () => {
    expect(formatPhone('(11) 91234-5678')).toBe('(11) 91234-5678')
  })

  it('returns original string for other lengths', () => {
    expect(formatPhone('123')).toBe('123')
  })

  it('returns dash for null', () => {
    expect(formatPhone(null)).toBe('—')
  })

  it('returns dash for empty string', () => {
    expect(formatPhone('')).toBe('—')
  })
})

// ─── formatNumber ────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats with thousand separators (pt-BR)', () => {
    const result = formatNumber(1234567)
    expect(result).toContain('1.234.567')
  })

  it('formats with decimal places', () => {
    const result = formatNumber(1234.567, 2)
    expect(result).toContain('1.234,57')
  })

  it('returns dash for null', () => {
    expect(formatNumber(null)).toBe('—')
  })

  it('returns dash for NaN', () => {
    expect(formatNumber(NaN)).toBe('—')
  })

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})
