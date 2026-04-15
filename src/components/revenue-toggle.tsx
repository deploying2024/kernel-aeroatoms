'use client'

import { useState } from 'react'
import { TrendingUp, DollarSign } from 'lucide-react'

type Props = {
  grossINR    : number
  netINR      : number
  grossUSD    : number
  netUSD      : number
  usdRate     : number
  color       : string
}

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style                : 'currency',
    currency             : 'INR',
    maximumFractionDigits: 0,
  }).format(n)

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style                : 'currency',
    currency             : 'USD',
    maximumFractionDigits: 2,
  }).format(n)

export default function RevenueToggle({
  grossINR, netINR, grossUSD, netUSD, usdRate, color,
}: Props) {
  const [mode, setMode] = useState<'gross' | 'net'>('net')

  const isGross   = mode === 'gross'
  const valueINR  = isGross ? grossINR  : netINR
  const valueUSD  = isGross ? grossUSD  : netUSD
  const label     = isGross ? 'Gross Revenue' : 'Net Revenue (excl. tax)'

  return (
    <div
      className="relative rounded-2xl border p-5 overflow-hidden transition-all duration-200 hover:scale-[1.02]"
      style={{
        background  : 'var(--bg-card)',
        borderColor : `${color}25`,
        boxShadow   : `0 0 0 1px ${color}15, 0 8px 32px ${color}20, 0 32px 64px ${color}08`,
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute inset-0 rounded-2xl blur-2xl opacity-10 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${color}, transparent)`, transform: 'scale(1.1)' }}
      />

      {/* Top row */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <TrendingUp className="w-4 h-4" style={{ color }} />
        </div>

        {/* Toggle */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}
        >
          <button
            onClick={() => setMode('gross')}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background  : isGross ? color : 'transparent',
              color       : isGross ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Gross
          </button>
          <button
            onClick={() => setMode('net')}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              background  : !isGross ? color : 'transparent',
              color       : !isGross ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Net
          </button>
        </div>
      </div>

      {/* Label */}
      <p className="relative text-xs font-semibold uppercase tracking-wider mb-1"
        style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>

      {/* Main INR value */}
      <p className="relative text-2xl font-black tracking-tight"
        style={{ color: 'var(--text-primary)' }}>
        {fmtINR(valueINR)}
      </p>

      {/* USD value */}
      <div className="relative mt-2 flex items-center gap-1.5">
        <DollarSign className="w-3 h-3" style={{ color: '#10b981' }} />
        <span className="text-sm font-bold" style={{ color: '#10b981' }}>
          {fmtUSD(valueUSD)}
        </span>
      </div>

      {/* Rate */}
      <p className="relative text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
        @ 1 USD = ₹{(1 / usdRate).toFixed(2)}
        {!isGross && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]"
            style={{ background: '#f59e0b15', color: '#f59e0b' }}>
            excl. GST
          </span>
        )}
      </p>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </div>
  )
}