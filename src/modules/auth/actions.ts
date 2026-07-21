'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ONBOARDING_SKIP_COOKIE } from '@/modules/onboarding/constants'
import { sendWelcomeEmail } from '@/modules/notifications/actions'
import {
  signUpSchema,
  signInSchema,
  magicLinkSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type SignUpInput,
  type SignInInput,
  type MagicLinkInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@/lib/validations/auth.schema'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/**
 * Origen REAL desde el que se hace la peticion (preview, prod o localhost).
 * Se usa para los redirects de auth (confirmacion de email, magic link, OAuth,
 * reset de password) para que el usuario vuelva al MISMO entorno donde inicio.
 *
 * Antes se usaba NEXT_PUBLIC_APP_URL (fija a prod), por lo que un login iniciado
 * en un preview de Vercel terminaba autenticando contra produccion.
 */
async function getRequestOrigin(): Promise<string> {
  const h = await headers()
  const origin = h.get('origin')
  if (origin) return origin
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? 'https'
    return `${proto}://${host}`
  }
  return getSiteUrl()
}

// =====================================================
// SIGN UP — Email + Password
// =====================================================
export async function signUp(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await getRequestOrigin()}/auth/callback`,
      data: {
        full_name: parsed.data.full_name,
      },
    },
  })

  if (error) {
    // Detectar email ya registrado para mostrar UX especifica en cliente
    const msg = error.message.toLowerCase()
    const isDuplicate =
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      msg.includes('already been registered') ||
      msg.includes('user already') ||
      error.code === 'user_already_exists'
    if (isDuplicate) {
      return { success: false, error: 'DUPLICATE_EMAIL' }
    }
    return { success: false, error: error.message }
  }

  // Edge case: Supabase puede devolver data.user con identities=[] cuando
  // el email ya existe (sin error). Detectarlo y tratarlo como duplicado.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { success: false, error: 'DUPLICATE_EMAIL' }
  }

  // Si el usuario fue creado pero requiere confirmacion de email,
  // data.user existe pero session no.
  if (data.user && !data.session) {
    return { success: true, data: undefined }
  }

  // Completar campos opcionales del profile creados por el trigger
  if (data.user && (parsed.data.university || parsed.data.exam_date)) {
    await supabase
      .from('profiles')
      .update({
        university: parsed.data.university || null,
        exam_date: parsed.data.exam_date || null,
      })
      .eq('id', data.user.id)
  }

  // Enviar welcome email (best-effort, no bloquea el signUp si falla)
  if (data.user) {
    void sendWelcomeEmail({
      userId: data.user.id,
      email: parsed.data.email,
      fullName: parsed.data.full_name,
    }).catch(() => {
      // RESEND_API_KEY puede no estar configurada en dev — esta bien
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

// =====================================================
// SIGN IN — Email + Password
// =====================================================
export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { success: false, error: 'Email o contrasena incorrectos' }

  revalidatePath('/', 'layout')
  return { success: true }
}

// =====================================================
// SIGN OUT
// =====================================================
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // Borrar el bypass de onboarding: al re-loguear vuelve al onboarding si no lo termino.
  const cookieStore = await cookies()
  cookieStore.delete(ONBOARDING_SKIP_COOKIE)
  revalidatePath('/', 'layout')
  redirect('/login')
}

// =====================================================
// GOOGLE OAUTH
// =====================================================
export async function signInWithGoogle(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const origin = await getRequestOrigin()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })

  if (error || !data.url) return { success: false, error: error?.message ?? 'No se pudo iniciar Google OAuth' }
  return { success: true, data: { url: data.url } }
}

// =====================================================
// MAGIC LINK
// =====================================================
export async function sendMagicLink(input: MagicLinkInput): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Email invalido' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${await getRequestOrigin()}/auth/callback`,
      shouldCreateUser: true,
    },
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// =====================================================
// FORGOT PASSWORD
// =====================================================
export async function forgotPassword(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Email invalido' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getRequestOrigin()}/auth/callback?next=/profile/reset-password`,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// =====================================================
// RESET PASSWORD
// =====================================================
export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Datos invalidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesion expirada. Solicita un nuevo link.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { success: false, error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
