'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300"
      style={{
        background  : 'var(--accent-soft)',
        borderColor : 'var(--accent-border)',
        color       : 'var(--accent)',
      }}
      title="Toggle theme"
    >
      {isDark
        ? <Sun  className="w-3.5 h-3.5" />
        : <Moon className="w-3.5 h-3.5" />
      }
      <span className="text-xs font-medium hidden sm:block">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  )
}