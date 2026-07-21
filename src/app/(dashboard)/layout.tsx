import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ONBOARDING_SKIP_COOKIE } from '@/modules/onboarding/constants'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { PageTransition } from '@/components/layout/PageTransition'
import { OfflineIndicator } from '@/components/shared/OfflineIndicator'
import { InstallPWABanner } from '@/components/shared/InstallPWABanner'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { XPGainPortal } from '@/modules/gamification/components/XPGainFloater'
import { StreakTouch } from '@/modules/gamification/components/StreakTouch'
import { OfflineSyncManager } from '@/modules/quiz/components/OfflineSyncManager'
import type { Role } from '@/types/global'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Si no completo el onboarding y NO lo salto en esta sesion (cookie), lo
  // regresamos al onboarding. La cookie se borra al cerrar sesion, asi vuelve
  // al onboarding en cada nuevo login hasta terminarlo.
  const skippedThisSession =
    (await cookies()).get(ONBOARDING_SKIP_COOKIE)?.value === '1'
  if (profile && !profile.onboarding_completed && !skippedThisSession) {
    redirect('/onboarding')
  }

  const role = (profile?.role ?? 'student') as Role

  return (
    <div className="relative min-h-screen">
      {/* Fondo aurora como capa FIJA detras del contenido. Va aparte (no como
          wrapper) porque AuroraBackground usa overflow-hidden, y un ancestro con
          overflow-hidden rompe el position: sticky del Sidebar (footer se despegaba). */}
      <div aria-hidden className="fixed inset-0 -z-10">
        <AuroraBackground variant="subtle" className="h-full w-full">
          <span className="block h-full w-full" />
        </AuroraBackground>
      </div>

      <div className="flex min-h-screen">
        <Sidebar role={role} />

        {/* min-w-0: permite que esta columna se encoja por debajo del ancho
            intrinseco de su contenido (tablas/codigo de las guias), evitando que
            empuje el layout y recorte texto en movil. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            fullName={profile?.full_name ?? null}
            email={profile?.email ?? user.email ?? ''}
            xpTotal={profile?.xp_total ?? 0}
            level={profile?.level ?? 1}
            streakCurrent={profile?.streak_current ?? 0}
          />
          <main className="safe-x flex-1 overflow-x-clip px-4 pb-24 pt-4 sm:px-6 sm:pt-6 md:px-8 md:pb-8">
            <PageTransition>{children}</PageTransition>
          </main>
          <OfflineIndicator />
          <InstallPWABanner />
          <MobileNav />
          {/* Portal global de XP floaters — montado UNA sola vez por app.
              Cualquier componente puede invocar triggerXPGain(amount, origin). */}
          <XPGainPortal />
          {/* Racha estilo TikTok: cada visita diaria mantiene viva la racha. */}
          <StreakTouch />
          {/* Sube sesiones hechas offline y auto-actualiza el banco al reconectar. */}
          <OfflineSyncManager />
        </div>
      </div>
    </div>
  )
}
