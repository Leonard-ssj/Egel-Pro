'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Brain,
  Sparkles,
  BookOpen,
  Map as MapIcon,
  TrendingUp,
  User,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { signOut } from '@/modules/auth/actions'

const ITEMS = [
  { href: '/dashboard',    label: 'Inicio',    icon: LayoutDashboard },
  { href: '/quiz',         label: 'Practicar', icon: Brain },
  { href: '/simulacro',    label: 'Simulacro', icon: Sparkles },
  { href: '/study',        label: 'Estudiar',  icon: BookOpen },
  { href: '/study/mapa',   label: 'Mapa',      icon: MapIcon },
  { href: '/progress',     label: 'Progreso',  icon: TrendingUp },
  { href: '/profile',      label: 'Perfil',    icon: User },
] as const

export function MobileNav() {
  const pathname = usePathname()
  // Solo el match mas especifico queda activo (asi /study/mapa no activa Estudiar).
  const activeHref = ITEMS.filter(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav
      className="fixed inset-x-2 bottom-2 z-50 md:hidden"
      aria-label="Navegacion principal mobile"
    >
      <div className="glass-strong relative rounded-2xl shadow-elev-4">
        {/* Fila deslizable horizontalmente: caben todos los accesos sin amontonar */}
        <ul className="flex snap-x gap-0.5 overflow-x-auto px-1 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ITEMS.map((item) => {
            const active = item.href === activeHref
            const Icon = item.icon
            return (
              <li key={item.href} className="shrink-0 snap-start">
                <Link
                  href={item.href}
                  className={cn(
                    'relative flex w-14 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] font-medium leading-tight transition-colors',
                    active ? 'text-brand-400' : 'text-muted-foreground',
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="mobile-active-pill"
                      className="absolute inset-0 rounded-lg bg-bg-raised/80 shadow-glow-brand"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      'relative z-10 h-4 w-4 transition-transform',
                      active && 'scale-110',
                    )}
                  />
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                </Link>
              </li>
            )
          })}
          <li className="shrink-0 snap-start">
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Cerrar sesion"
                className="relative flex w-14 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] font-medium leading-tight text-muted-foreground transition-colors hover:text-danger"
              >
                <LogOut className="relative z-10 h-4 w-4" />
                <span className="relative z-10 whitespace-nowrap">Salir</span>
              </button>
            </form>
          </li>
        </ul>
      </div>
    </nav>
  )
}
