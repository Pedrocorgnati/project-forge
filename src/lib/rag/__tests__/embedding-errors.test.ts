import { describe, it, expect } from 'vitest'
import {
  HandoffEmbeddingError,
  createDimensionMismatchError,
  createIndexationBlockedError,
  createEmbeddingTimeoutError,
} from '../embedding-errors'

describe('HandoffEmbeddingError', () => {
  it('cria erro com code, detail e retryable', () => {
    const err = new HandoffEmbeddingError('HANDOFF_053', 'test detail', false)
    expect(err.code).toBe('HANDOFF_053')
    expect(err.detail).toBe('test detail')
    expect(err.retryable).toBe(false)
    expect(err.name).toBe('HandoffEmbeddingError')
    expect(err.message).toBe('[HANDOFF_053] test detail')
  })
})

describe('createDimensionMismatchError', () => {
  it('retorna HANDOFF_053 não-retentável', () => {
    const err = createDimensionMismatchError(384, 512)
    expect(err.code).toBe('HANDOFF_053')
    expect(err.retryable).toBe(false)
    expect(err.detail).toContain('384')
    expect(err.detail).toContain('512')
  })
})

describe('createIndexationBlockedError', () => {
  it('retorna HANDOFF_050 não-retentável', () => {
    const err = createIndexationBlockedError('Indexação já em andamento')
    expect(err.code).toBe('HANDOFF_050')
    expect(err.retryable).toBe(false)
  })
})

describe('createEmbeddingTimeoutError', () => {
  it('retorna SYS_001 retentável', () => {
    const err = createEmbeddingTimeoutError('openai', 5000)
    expect(err.code).toBe('SYS_001')
    expect(err.retryable).toBe(true)
    expect(err.detail).toContain('5000ms')
    expect(err.detail).toContain('openai')
  })
})
