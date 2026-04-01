'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ShoppingCart, PackagePlus,
  PackageMinus, BarChart3, Gauge, Truck,
  LogOut, Plane, ChevronLeft, ChevronRight,
  Menu, X, Sun, Moon,
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import Image from 'next/image'

const navItems = [
  { label: 'Dashboard',       href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Orders',          href: '/orders',            icon: ShoppingCart    },
  { label: 'Inscan',          href: '/inscan',            icon: PackagePlus     },
  { label: 'Outscan',         href: '/outscan',           icon: PackageMinus    },
  { label: 'Inventory Value', href: '/inventory-value',   icon: BarChart3       },
  { label: 'Yield Rate',      href: '/yield-rate',        icon: Gauge           },
  { label: 'Shipping',        href: '/shipping',          icon: Truck           },
]

// ── Extracted outside to avoid "component created during render" error ──
function SidebarInner({
  collapsed,
  mobile,
  pathname,
  isDark,
  onToggleTheme,
  onLogout,
  onCollapse,
  onNavClick,
}: {
  collapsed      : boolean
  mobile         : boolean
  pathname       : string
  isDark         : boolean
  onToggleTheme  : () => void
  onLogout       : () => void
  onCollapse     : () => void
  onNavClick     : () => void
}) {
  const isWide = !collapsed || mobile

  return (
    <div className="flex flex-col h-full relative overflow-hidden">

      {/* Brand */}
      <div
        className={cn(
          'flex items-center gap-3 border-b px-4 py-5 transition-all duration-300',
          !isWide && 'justify-center px-2',
        )}
        style={{ borderColor: 'var(--border-dim)' }}
      >
        <div className="relative shrink-0">
          <Image
            src="/logo.png"
            alt="Kernel"
            width={36}
            height={36}
            className="rounded-xl"
            priority
          />
          <div
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--neon-green)' }}
          />
        </div>
        {isWide && (
          <div className="overflow-hidden">
            <p className="font-black text-sm tracking-[0.12em] uppercase"
              style={{ color: 'var(--text-primary)' }}>
              KERNEL
            </p>
            <p className="text-[10px] mt-0.5 tracking-widest uppercase font-medium"
              style={{ color: 'var(--accent)', opacity: 0.8 }}>
              AeroAtoms
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {isWide
          ? <p className="text-[9px] font-bold uppercase tracking-[0.2em] px-3 mb-3"
              style={{ color: 'var(--text-dim)' }}>Navigation</p>
          : <div className="mb-3 h-4" />
        }
        {navItems.map(item => {
          const Icon     = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative',
                !isWide && 'justify-center px-2',
              )}
              style={isActive ? {
                background : 'var(--accent-soft)',
                border     : '1px solid var(--accent-border)',
                color      : 'var(--accent)',
              } : {
                color  : 'var(--text-secondary)',
                border : '1px solid transparent',
              }}
              title={!isWide ? item.label : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                  style={{ background: 'var(--accent)' }} />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              {isWide && <span className="truncate">{item.label}</span>}
              {isActive && isWide && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                  style={{ background: 'var(--accent)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-4 space-y-2 border-t" style={{ borderColor: 'var(--border-dim)' }}>

        {/* Theme toggle */}
        <div className={cn('flex', isWide ? 'px-1' : 'justify-center')}>
          <button
            onClick={onToggleTheme}
            className={cn(
              'flex items-center gap-2 rounded-full border transition-all duration-300',
              isWide ? 'px-3 py-1.5 w-full' : 'w-9 h-9 justify-center p-0',
            )}
            style={{
              background  : 'var(--accent-soft)',
              borderColor : 'var(--accent-border)',
              color       : 'var(--accent)',
            }}
            title="Toggle theme"
          >
            {isDark
              ? <Sun  className="w-3.5 h-3.5 shrink-0" />
              : <Moon className="w-3.5 h-3.5 shrink-0" />
            }
            {isWide && (
              <span className="text-xs font-medium">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>
        </div>

        {/* Sign out */}
        <button
          onClick={onLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium border border-transparent transition-all duration-200',
            !isWide && 'justify-center px-2',
          )}
          style={{ color: 'var(--text-secondary)' }}
          title={!isWide ? 'Sign Out' : undefined}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.color      = 'var(--neon-pink)'
            ;(e.currentTarget as HTMLElement).style.background = '#ef444408'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.color      = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {isWide && <span>Sign Out</span>}
        </button>

        {/* Collapse toggle — desktop only */}
        {!mobile && (
          <div className="flex items-center justify-end px-1">
            <button
              onClick={onCollapse}
              className={cn(
                'flex items-center gap-2 rounded-lg border text-xs font-medium transition-all duration-200',
                isWide ? 'px-3 py-2 w-full' : 'w-9 h-9 justify-center p-0',
              )}
              style={{
                background  : 'var(--accent-soft)',
                borderColor : 'var(--accent-border)',
                color       : 'var(--accent)',
              }}
            >
              {collapsed
                ? <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                : <ChevronLeft  className="w-3.5 h-3.5 shrink-0" />
              }
              {isWide && <span>Collapse</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname         = usePathname()
  const router           = useRouter()
  const { theme, setTheme } = useTheme()
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  const isDark = theme === 'dark'

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out z-30',
          collapsed ? 'w-16 min-w-[4rem]' : 'w-60 min-w-[15rem]',
        )}
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-dim)' }}
      >
        <SidebarInner
          collapsed={collapsed}
          mobile={false}
          pathname={pathname}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
          onCollapse={() => setCollapsed(c => !c)}
          onNavClick={() => {}}
        />
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}
      >
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Kernel" width={28} height={28} className="rounded-lg" />
          <span className="font-black text-sm tracking-wider uppercase"
            style={{ color: 'var(--text-primary)' }}>KERNEL</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center border"
            style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="md:hidden fixed left-0 top-0 h-full w-64 z-40 border-r animate-slide-in"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}
          >
            <SidebarInner
              collapsed={false}
              mobile={true}
              pathname={pathname}
              isDark={isDark}
              onToggleTheme={toggleTheme}
              onLogout={handleLogout}
              onCollapse={() => setCollapsed(c => !c)}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}
    </>
  )
}