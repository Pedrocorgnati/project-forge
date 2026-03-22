'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { toActionError } from '@/lib/errors'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signInWithEmail(email: string, password: string) {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: error.message }
    }

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
    redirect('/login')
  } catch (error) {
    return toActionError(error)
  }
}

export async function signInWithGithub() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) return { error: error.message }
    if (data.url) redirect(data.url)

    return { success: true }
  } catch (error) {
    return toActionError(error)
  }
}

export async function setupMFA() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })

    if (error) return { error: error.message }

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
  try {
    const supabase = await createClient()

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeError) return { error: challengeError.message }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) return { error: verifyError.message }

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
