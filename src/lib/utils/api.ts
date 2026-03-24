import type { ApiResponse } from '@/types'

// ─── API CLIENT ──────────────────────────────────────────────────────────────

/**
 * Cliente HTTP que nunca lança exceção — retorna sempre ApiResponse<T>.
 * Usa fetch nativo com suporte a JSON.
 */
export async function apiClient<T>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const body = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        data: null,
        error: {
          code: `HTTP_${response.status}`,
          message: body?.message ?? body?.error ?? `Erro ${response.status}`,
          details: body,
        },
      }
    }

    // Servidor já retorna no formato ApiResponse
    if (body && 'data' in body && 'error' in body) {
      return body as ApiResponse<T>
    }

    return { data: body as T, error: null }
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Erro de rede',
        details: err,
      },
    }
  }
}

// ─── MÉTODOS DE CONVENIÊNCIA ─────────────────────────────────────────────────

export const api = {
  get<T>(url: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return apiClient<T>(url, { ...options, method: 'GET' })
  },

  post<T>(url: string, body: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return apiClient<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  put<T>(url: string, body: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return apiClient<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  patch<T>(url: string, body: unknown, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return apiClient<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  delete<T>(url: string, options?: Omit<RequestInit, 'method'>): Promise<ApiResponse<T>> {
    return apiClient<T>(url, { ...options, method: 'DELETE' })
  },
}
