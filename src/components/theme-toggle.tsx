'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300"
      style={{
        background: 'var(--accent-soft)',
        borderColor: 'var(--accent-border)',
        color: 'var(--accent)',
      }}
      title="Toggle theme"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5" />
          <span className="text-xs font-medium hidden sm:block">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium hidden sm:block">Dark</span>
        </>
      )}
    </button>
  )
}