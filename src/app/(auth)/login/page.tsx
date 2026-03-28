'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleLogin = async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}>

      {/* ── Animated background blobs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{
            background : '#3b82f6',
            top        : '-10%',
            left       : '-10%',
            animation  : 'blob1 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{
            background : '#8b5cf6',
            bottom     : '10%',
            right      : '-5%',
            animation  : 'blob2 10s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-64 h-64 rounded-full blur-3xl opacity-8"
          style={{
            background : '#10b981',
            bottom     : '30%',
            left       : '20%',
            animation  : 'blob3 12s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Grid overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage : `
            linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Login card ── */}
      <div
        className="relative w-full max-w-sm mx-4 z-10"
        style={{
          opacity          : mounted ? 1 : 0,
          transform        : mounted ? 'translateY(0)' : 'translateY(24px)',
          transition       : 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        {/* Glow behind card */}
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-20 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', transform: 'scale(1.05)' }}
        />

        <div
          className="relative rounded-3xl border overflow-hidden"
          style={{
            background  : 'var(--bg-card)',
            borderColor : 'var(--border-dim)',
            boxShadow   : '0 32px 64px rgba(0,0,0,0.4)',
          }}
        >
          {/* Top accent line */}
          <div
            className="h-px w-full"
            style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)' }}
          />

          <div className="px-8 py-10">

            {/* Logo + brand */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="relative mb-5"
                style={{
                  opacity          : mounted ? 1 : 0,
                  transform        : mounted ? 'scale(1)' : 'scale(0.8)',
                  transition       : 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s',
                }}
              >
                {/* Logo glow ring */}
                <div
                  className="absolute inset-0 rounded-2xl blur-xl opacity-40"
                  style={{ background: '#3b82f6', transform: 'scale(1.3)' }}
                />
                <Image
                  src="/logo.png"
                  alt="Kernel"
                  width={72}
                  height={72}
                  className="relative rounded-2xl"
                  priority
                />
              </div>

              <div
                style={{
                  opacity   : mounted ? 1 : 0,
                  transform : mounted ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s',
                  textAlign : 'center',
                }}
              >
                <h1
                  className="text-3xl font-black uppercase tracking-widest"
                  style={{ color: 'var(--text-primary)', letterSpacing: '0.15em' }}
                >
                  KERNEL
                </h1>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.3em] mt-1"
                  style={{ color: 'var(--accent)' }}
                >
                  by AeroAtoms
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-7">
              <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
              <span className="text-xs uppercase tracking-widest font-medium"
                style={{ color: 'var(--text-dim)' }}>
                Sign In
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
            </div>

            {/* Form */}
            <div
              className="space-y-4"
              style={{
                opacity   : mounted ? 1 : 0,
                transform : mounted ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.5s ease 0.4s, transform 0.5s ease 0.4s',
              }}
            >
              {/* Email */}
              <div className="space-y-1.5">
                <Label
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Email
                </Label>
                <Input
                  type="email"
                  placeholder="you@aeroatoms.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="h-12 border rounded-xl text-sm transition-all"
                  style={{
                    background  : 'var(--bg-input)',
                    borderColor : 'var(--border-dim)',
                    color       : 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Password
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="h-12 border rounded-xl text-sm transition-all"
                  style={{
                    background  : 'var(--bg-input)',
                    borderColor : 'var(--border-dim)',
                    color       : 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{
                    background : '#ef444412',
                    border     : '1px solid #ef444430',
                    color      : '#ef4444',
                  }}
                >
                  <span className="text-base">⚠</span>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="relative w-full h-12 rounded-xl text-sm font-bold tracking-wide disabled:opacity-60 overflow-hidden transition-all duration-200"
                style={{ background: 'var(--accent)', color: '#fff' }}
                onMouseEnter={e => {
                  if (!loading)
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}
              >
                {/* Button shimmer */}
                <div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
                />
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </div>
                ) : (
                  'Sign In →'
                )}
              </button>
            </div>

            {/* Invite notice */}
            <div
              className="mt-6 flex items-center justify-center gap-2"
              style={{
                opacity   : mounted ? 1 : 0,
                transition: 'opacity 0.5s ease 0.6s',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent)', opacity: 0.5 }}
              />
              <p className="text-xs text-center" style={{ color: 'var(--text-dim)' }}>
                Invite only · Contact your admin for access
              </p>
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent)', opacity: 0.5 }}
              />
            </div>
          </div>

          {/* Bottom accent line */}
          <div
            className="h-px w-full"
            style={{ background: 'linear-gradient(90deg, transparent, #8b5cf6, #3b82f6, transparent)' }}
          />
        </div>

        {/* Footer */}
        <p
          className="text-center text-xs mt-5"
          style={{
            color     : 'var(--text-dim)',
            opacity   : mounted ? 1 : 0,
            transition: 'opacity 0.5s ease 0.7s',
          }}
        >
          Kernel © {new Date().getFullYear()} · AeroAtoms
        </p>
      </div>

      {/* ── Blob animations ── */}
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0)   scale(1);    }
          33%       { transform: translate(30px, -20px) scale(1.1); }
          66%       { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0)   scale(1);    }
          33%       { transform: translate(-30px, 20px) scale(1.15); }
          66%       { transform: translate(20px, -30px) scale(0.95); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0)   scale(1);    }
          33%       { transform: translate(20px, 30px) scale(1.05); }
          66%       { transform: translate(-30px, -10px) scale(1.1); }
        }
      `}</style>
    </div>
  )
}