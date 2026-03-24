'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { toActionError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/auth/rate-limit'
import { ROUTES } from '@/lib/constants/routes'

export async function signInWithEmail(email: string, password: string) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? 'unknown'
  const rlKey = `signin:${ip}:${email}`

  const { allowed, retryAfter } = checkRateLimit(rlKey)
  if (!allowed) {
    return { error: `Muitas tentativas. Aguarde ${retryAfter} segundos antes de tentar novamente.` }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      recordFailedAttempt(rlKey)
      return { error: error.message }
    }

    clearAttempts(rlKey)
    return { success: true }
  } catch (error) {
    return toActionError(error)
  }
}

export async function signOut() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
  } catch (error) {
    return toActionError(error)
  }
  // redirect() lança NEXT_REDIRECT — deve ficar FORA do try/catch
  redirect(ROUTES.LOGIN)
}

export async function signInWithGithub() {
  let oauthUrl: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      },
    })

    if (error) return { error: error.message }
    if (data.url) oauthUrl = data.url
  } catch (error) {
    return toActionError(error)
  }

  // redirect() lança NEXT_REDIRECT — deve ficar FORA do try/catch
  if (oauthUrl) redirect(oauthUrl)

  return { success: true }
}

export async function setupMFA() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const rlKey = `mfa-setup:${user.id}`
    const { allowed, retryAfter } = checkRateLimit(rlKey)
    if (!allowed) {
      return { error: `Muitas tentativas. Aguarde ${retryAfter} segundos.` }
    }

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })

    if (error) {
      recordFailedAttempt(rlKey)
      return { error: error.message }
    }

    return {
      success: true,
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    }
  } catch (error) {
    return toActionError(error)
  }
}

export async function verifyMFA(factorId: string, code: string) {
  const rlKey = `mfa-verify:${factorId}`

  const { allowed, retryAfter } = checkRateLimit(rlKey)
  if (!allowed) {
    return { error: `Muitas tentativas. Aguarde ${retryAfter} segundos.` }
  }

  try {
    const supabase = await createClient()

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeError) {
      recordFailedAttempt(rlKey)
      return { error: challengeError.message }
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      recordFailedAttempt(rlKey)
      return { error: verifyError.message }
    }

    clearAttempts(rlKey)

    // Marcar MFA habilitado no perfil
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaEnabled: true },
      })
    }

    return { success: true }
  } catch (error) {
    return toActionError(error)
  }
}

export async function acceptInvite(token: string, password: string) {
  try {
    const supabase = await createClient()
    // Verifica token de convite e define senha via Supabase
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'invite',
    })

    if (error) return { error: error.message }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) return { error: updateError.message }

    return { success: true }
  } catch (error) {
    return toActionError(error)
  }
}
