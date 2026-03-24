import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, api } from '../api'

// ─── Mock global fetch ──────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }
}

function networkError(message = 'Failed to fetch') {
  return Promise.reject(new Error(message))
}

// ─── apiClient ───────────────────────────────────────────────────────────────

describe('apiClient', () => {
  it('returns data on successful response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: 'Test' }))

    const result = await apiClient('/api/test')

    expect(result.data).toEqual({ id: 1, name: 'Test' })
    expect(result.error).toBeNull()
  })

  it('unwraps ApiResponse-shaped body from server', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: { id: 1 }, error: null }),
    )

    const result = await apiClient('/api/test')

    expect(result.data).toEqual({ id: 1 })
    expect(result.error).toBeNull()
  })

  it('returns error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: 'Not found' }, 404),
    )

    const result = await apiClient('/api/missing')

    expect(result.data).toBeNull()
    expect(result.error).toBeDefined()
    expect(result.error!.code).toBe('HTTP_404')
    expect(result.error!.message).toBe('Not found')
  })

  it('uses fallback error message when body has no message', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500))

    const result = await apiClient('/api/fail')

    expect(result.error!.code).toBe('HTTP_500')
    expect(result.error!.message).toBe('Erro 500')
  })

  it('uses body.error field as fallback message', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: 'Server error' }, 502),
    )

    const result = await apiClient('/api/fail')

    expect(result.error!.message).toBe('Server error')
  })

  it('returns NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockImplementationOnce(() => networkError('Connection refused'))

    const result = await apiClient('/api/down')

    expect(result.data).toBeNull()
    expect(result.error!.code).toBe('NETWORK_ERROR')
    expect(result.error!.message).toBe('Connection refused')
  })

  it('returns generic network error message for non-Error exceptions', async () => {
    mockFetch.mockImplementationOnce(() => Promise.reject('unknown'))

    const result = await apiClient('/api/unknown')

    expect(result.error!.code).toBe('NETWORK_ERROR')
    expect(result.error!.message).toBe('Erro de rede')
  })

  it('handles response.json() failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    const result = await apiClient('/api/bad-json')

    expect(result.data).toBeNull()
    expect(result.error!.code).toBe('HTTP_500')
  })

  it('sets Content-Type header by default', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await apiClient('/api/test')

    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
    }))
  })

  it('allows custom headers to override defaults', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await apiClient('/api/test', {
      headers: { Authorization: 'Bearer token123' },
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
      }),
    }))
  })
})

// ─── api convenience methods ─────────────────────────────────────────────────

describe('api', () => {
  describe('get', () => {
    it('sends GET request', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [] }))

      const result = await api.get('/api/items')

      expect(mockFetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
        method: 'GET',
      }))
      expect(result.data).toEqual({ items: [] })
    })
  })

  describe('post', () => {
    it('sends POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }))

      const result = await api.post('/api/items', { name: 'New' })

      expect(mockFetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New' }),
      }))
      expect(result.data).toEqual({ id: 1 })
    })
  })

  describe('put', () => {
    it('sends PUT request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: 'Updated' }))

      await api.put('/api/items/1', { name: 'Updated' })

      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      }))
    })
  })

  describe('patch', () => {
    it('sends PATCH request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }))

      await api.patch('/api/items/1', { status: 'active' })

      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }))
    })
  })

  describe('delete', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(null))

      await api.delete('/api/items/1')

      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
        method: 'DELETE',
      }))
    })
  })
})
