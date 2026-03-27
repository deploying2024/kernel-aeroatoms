'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card, CardContent,
  CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleLogin = async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  const handleSignUp = async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    setError('Check your email to confirm your account.')
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md px-4">

      {/* Brand */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-5">
          <Image
            src="/logo.png"
            alt="AeroAtoms Logo"
            width={72}
            height={72}
            className="rounded-2xl"
            priority
          />
        </div>
        <h1
          className="text-4xl font-black tracking-tight uppercase"
          style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}
        >
          KERNEL
        </h1>
        <p className="text-sm mt-1 font-medium uppercase tracking-widest"
          style={{ color: 'var(--accent)' }}>
          by AeroAtoms
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          Operations Platform
        </p>
      </div>

      <Card
        className="border shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
      >
        <CardHeader className="pb-4">
          <CardTitle className="text-lg" style={{ color: 'var(--text-primary)' }}>
            Welcome back
          </CardTitle>
          <CardDescription style={{ color: 'var(--text-secondary)' }}>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              Email
            </Label>
            <Input
              type="email"
              placeholder="you@aeroatoms.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-11 border rounded-lg text-sm"
              style={{
                background  : 'var(--bg-input)',
                borderColor : 'var(--border-dim)',
                color       : 'var(--text-primary)',
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              Password
            </Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="h-11 border rounded-lg text-sm"
              style={{
                background  : 'var(--bg-input)',
                borderColor : 'var(--border-dim)',
                color       : 'var(--text-primary)',
              }}
            />
          </div>

          {error && (
            <p
              className="text-sm px-3 py-2.5 rounded-lg"
              style={error.includes('Check your email')
                ? { background: '#10b98110', border: '1px solid #10b98128', color: '#10b981' }
                : { background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }
              }
            >
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" style={{ borderColor: 'var(--border-dim)' }} />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 text-xs" style={{ background: 'var(--bg-card)', color: 'var(--text-dim)' }}>
                or
              </span>
            </div>
          </div>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full h-11 rounded-lg text-sm font-semibold border disabled:opacity-50 transition-all"
            style={{
              borderColor : 'var(--border-dim)',
              color       : 'var(--text-secondary)',
              background  : 'transparent',
            }}
          >
            Create Account
          </button>
        </CardContent>
      </Card>

      <p className="text-center text-xs mt-6" style={{ color: 'var(--text-dim)' }}>
        Kernel © {new Date().getFullYear()} · AeroAtoms
      </p>
    </div>
  )
}