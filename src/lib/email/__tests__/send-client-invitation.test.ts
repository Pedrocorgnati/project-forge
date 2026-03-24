// src/lib/email/__tests__/send-client-invitation.test.ts
// module-16-clientportal-auth / TASK-6 ST003
// Testes unitários para sendClientInvitationEmail
// Rastreabilidade: GAP-015

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { sendClientInvitationEmail } from '../send-client-invitation'

const validParams = {
  to: 'client@test.com',
  projectName: 'Test Project',
  inviterName: 'PM User',
  inviteToken: 'tok-abc-123',
}

describe('sendClientInvitationEmail', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    Object.assign(process.env, originalEnv)
    vi.restoreAllMocks()
  })

  it('sem RESEND_API_KEY (dev mode) → console.log, retorna emailSent: true', async () => {
    delete process.env.RESEND_API_KEY
    Object.assign(process.env, { NODE_ENV: 'development' })

    const result = await sendClientInvitationEmail(validParams)

    expect(result).toEqual({ emailSent: true })
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('tok-abc-123'),
    )
  })

  it('NODE_ENV=test → console.log, retorna emailSent: true', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    Object.assign(process.env, { NODE_ENV: 'test' })

    const result = await sendClientInvitationEmail(validParams)

    expect(result).toEqual({ emailSent: true })
    expect(console.log).toHaveBeenCalled()
  })

  it('com API key, Resend success → retorna emailSent: true', async () => {
    process.env.RESEND_API_KEY = 're_live_key'
    Object.assign(process.env, { NODE_ENV: 'production' })

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }),
    )

    const result = await sendClientInvitationEmail(validParams)

    expect(result).toEqual({ emailSent: true })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' }),
    )
    mockFetch.mockRestore()
  })

  it('com API key, Resend failure → retorna emailSent: false com error', async () => {
    process.env.RESEND_API_KEY = 're_live_key'
    Object.assign(process.env, { NODE_ENV: 'production' })

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Rate limit exceeded' }), { status: 429 }),
    )

    const result = await sendClientInvitationEmail(validParams)

    expect(result.emailSent).toBe(false)
    expect(result.error).toBeDefined()
    mockFetch.mockRestore()
  })

  it('HTML gerado contém link correto com token', async () => {
    process.env.RESEND_API_KEY = 're_live_key'
    Object.assign(process.env, { NODE_ENV: 'production' })
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test.com'

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }),
    )

    await sendClientInvitationEmail(validParams)

    const callBody = JSON.parse(mockFetch.mock.calls[0][1]!.body as string)
    expect(callBody.html).toContain('https://app.test.com/portal/tok-abc-123')
    expect(callBody.html).toContain('Test Project')
    expect(callBody.html).toContain('PM User')
    mockFetch.mockRestore()
  })
})
