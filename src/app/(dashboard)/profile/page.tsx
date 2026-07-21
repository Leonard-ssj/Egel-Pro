import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Palette, Trophy, ChevronRight, Zap, Flame, Bell, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { GlassCard } from '@/components/ui/glass-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ProfileForm } from '@/modules/auth/components/ProfileForm'
import { AvatarUpload } from '@/modules/auth/components/AvatarUpload'
import { ChangePasswordForm } from '@/modules/auth/components/ChangePasswordForm'
import { DangerZone } from '@/modules/auth/components/DangerZone'
import { NotificationPrefsForm } from '@/modules/auth/components/NotificationPrefsForm'
import { ExportQuestionsButton } from '@/modules/auth/components/ExportQuestionsButton'

export const metadata = { title: 'Perfil' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Posicion en ranking (XP)
  const { data: rankData } = await supabase.rpc('get_my_rank', { p_user_id: user.id, p_sort_by: 'xp' })
  const myRank = (rankData?.[0] as { rank: number; total_players: number } | undefined) ?? { rank: 0, total_players: 0 }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Perfil" description="Gestiona tu cuenta y preferencias." gradient />

      <Link
        href="/leaderboard"
        className="block rounded-xl border border-aurora-2/40 bg-aurora-2/10 p-4 backdrop-blur-md transition-all hover:border-aurora-2/60 hover:bg-aurora-2/15"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-aurora-2/20 text-aurora-2">
            <Trophy className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Ranking global</p>
            {myRank.rank > 0 ? (
              <p className="text-xs text-muted-foreground">
                Estas en la posicion <span className="font-bold text-aurora-2">#{myRank.rank}</span> de {myRank.total_players}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Completa quizzes para aparecer en el ranking</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-xp/15 px-2 py-0.5 text-xp">
              <Zap className="h-3 w-3" fill="currentColor" />
              {(profile.xp_total ?? 0).toLocaleString('es-MX')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-streak/15 px-2 py-0.5 text-streak">
              <Flame className="h-3 w-3" />
              {profile.streak_current ?? 0}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Link>

      <GlassCard variant="elevated" padding="lg">
        <h2 className="mb-4 text-lg font-semibold">Avatar</h2>
        <AvatarUpload userId={user.id} currentAvatarUrl={profile.avatar_url} email={profile.email} />
      </GlassCard>

      <GlassCard variant="elevated" padding="lg">
        <h2 className="mb-1 text-lg font-semibold">Datos personales</h2>
        <p className="mb-5 text-sm text-muted-foreground">Tu nombre, universidad y meta de estudio.</p>
        <ProfileForm profile={profile} />
      </GlassCard>

      <GlassCard variant="elevated" padding="lg">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Palette className="h-4 w-4 text-aurora-2" />
          Apariencia
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Cambia entre modo oscuro (Nebulosa Profunda) y modo claro.
        </p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">Click en el icono para alternar</p>
          </div>
          <ThemeToggle size="lg" />
        </div>
      </GlassCard>

      {/* Exportar el banco completo es sensible (todo el contenido): solo admin. */}
      {profile.role === 'admin' ? (
        <GlassCard variant="elevated" padding="lg">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <Download className="h-4 w-4 text-aurora-2" />
            Exportar banco de preguntas
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Descarga todas las preguntas activas en formato Excel para estudiar offline.
          </p>
          <ExportQuestionsButton />
        </GlassCard>
      ) : null}

      <GlassCard variant="elevated" padding="lg">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-4 w-4 text-aurora-2" />
          Notificaciones
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Elige que tipos de notificacion quieres recibir.
        </p>
        <NotificationPrefsForm initial={(profile.notification_prefs ?? {}) as Record<string, boolean>} />
      </GlassCard>

      <GlassCard variant="elevated" padding="lg">
        <h2 className="mb-1 text-lg font-semibold">Cuenta</h2>
        <p className="mb-5 text-sm text-muted-foreground">Email y contrasena.</p>
        <div className="space-y-5">
          <div className="text-sm">
            <span className="text-muted-foreground">Email actual:</span>{' '}
            <span className="font-medium">{profile.email}</span>
          </div>
          <ChangePasswordForm />
        </div>
      </GlassCard>

      <GlassCard variant="flat" padding="lg" className="border-danger/30">
        <h2 className="mb-3 text-lg font-semibold text-danger">Zona peligrosa</h2>
        <DangerZone />
      </GlassCard>
    </div>
  )
}
