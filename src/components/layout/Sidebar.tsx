'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Brain,
  BookOpen,
  Map as MapIcon,
  TrendingUp,
  Trophy,
  User,
  Settings,
  Sparkles,
  LogOut,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { signOut } from '@/modules/auth/actions'
import type { Role } from '@/types/global'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/quiz',         label: 'Practicar',    icon: Brain },
  { href: '/simulacro',    label: 'Simulacro',    icon: Sparkles },
  { href: '/study',        label: 'Estudiar',     icon: BookOpen },
  { href: '/study/mapa',   label: 'Mapa temario', icon: MapIcon },
  { href: '/progress',     label: 'Progreso',     icon: TrendingUp },
  { href: '/achievements',  label: 'Logros',         icon: Trophy },
  { href: '/leaderboard',   label: 'Ranking',        icon: Trophy },
  { href: '/notifications', label: 'Notificaciones', icon: Bell },
  { href: '/profile',       label: 'Perfil',         icon: User },
  { href: '/admin',        label: 'Admin',        icon: Settings, adminOnly: true },
]

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin')
  // Solo el match mas especifico queda activo (asi /study/mapa no activa tambien Estudiar).
  const activeHref = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 self-start overflow-hidden border-r border-bg-border/50 md:flex md:flex-col">
      {/* Glass backdrop */}
      <div className="glass absolute inset-0 rounded-none border-l-0 border-t-0 border-b-0" />

      <div className="relative z-10 flex h-full flex-col">
        <Link
          href="/dashboard"
          className="flex h-16 shrink-0 items-center gap-2 border-b border-bg-border/40 px-6 text-lg font-bold"
        >
          <span className="text-aurora">EGEL</span>
          <span className="text-foreground">Pro</span>
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {items.map((item) => {
            const active = item.href === activeHref
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-fast',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {/* Active background con glow */}
                {active ? (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-bg-raised/80 shadow-glow-brand"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                ) : null}

                {/* Hover background sutil */}
                <div className="absolute inset-0 rounded-lg bg-bg-raised/0 transition-colors group-hover:bg-bg-raised/40" />

                <Icon
                  className={cn(
                    'relative z-10 h-4 w-4 transition-colors',
                    active ? 'text-brand-400' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                <span className="relative z-10">{item.label}</span>

                {/* Glow dot al lado derecho cuando activo */}
                {active ? (
                  <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-brand-400 shadow-glow-brand" />
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-bg-border/40 p-3 space-y-2">
          <form action={signOut}>
            <button
              type="submit"
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-bg-raised/60 hover:text-danger"
            >
              <LogOut className="h-4 w-4 transition-colors group-hover:text-danger" />
              <span>Cerrar sesion</span>
            </button>
          </form>
          <p className="px-3 font-mono text-[10px] text-muted-foreground/70">EGELPro v0.2 · Aurora</p>
        </div>
      </div>
    </aside>
  )
}
