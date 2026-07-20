'use client'

import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react'

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)

type Props = {
  bomPerUnit      : number
  effectiveBom    : number
  onetimeTotal    : number
  amortizedPerUnit: number
  trueCostPerUnit : number
  sellingPrice    : number
  profitPerUnit   : number
  marginPercent   : number
  totalProfit     : number
  assemblyQty     : number
  failureRate     : number
}

export default function MarginSummary({
  bomPerUnit, effectiveBom, onetimeTotal,
  amortizedPerUnit, trueCostPerUnit,
  sellingPrice, profitPerUnit, marginPercent,
  totalProfit, assemblyQty, failureRate,
}: Props) {
  const isProfit  = profitPerUnit >= 0
  const isHealthy = marginPercent >= 20

  return (
    <div className="space-y-4">

      {/* Cost breakdown */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-dim)' }}
      >
        <div className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
          <p className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)' }}>
            Cost Breakdown
          </p>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-dim)' }}>
          {/* BOM */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                BOM Cost / unit
              </p>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                Components + customs
              </p>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {fmtINR(bomPerUnit)}
            </p>
          </div>

          {/* Failure rate adjustment */}
          {failureRate > 0 && (
            <div className="flex items-center justify-between px-4 py-3"
              style={{ background: '#ef444406' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
                  Failure Rate ({failureRate}%)
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  BOM ÷ (1 − {failureRate}%)
                </p>
              </div>
              <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
                {fmtINR(effectiveBom)}
              </p>
            </div>
          )}

          {/* One-time amortized */}
          {onetimeTotal > 0 && (
            <div className="flex items-center justify-between px-4 py-3"
              style={{ background: '#f59e0b06' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                  One-time Costs / unit
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  {fmtINR(onetimeTotal)} ÷ {assemblyQty} units
                </p>
              </div>
              <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                + {fmtINR(amortizedPerUnit)}
              </p>
            </div>
          )}

          {/* True cost */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: 'var(--bg-secondary)' }}>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                True Cost / unit
              </p>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                All costs included
              </p>
            </div>
            <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
              {fmtINR(trueCostPerUnit)}
            </p>
          </div>
        </div>
      </div>

      {/* Margin analysis */}
      {sellingPrice > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: isProfit ? (isHealthy ? '#10b98130' : '#f59e0b30') : '#ef444430',
          }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{
              borderColor : isProfit ? (isHealthy ? '#10b98130' : '#f59e0b30') : '#ef444430',
              background  : isProfit ? (isHealthy ? '#10b98108' : '#f59e0b08') : '#ef444408',
            }}>
            <p className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}>
              Margin Analysis
            </p>
            <div className="flex items-center gap-1.5">
              {isProfit
                ? <TrendingUp  className="w-3.5 h-3.5" style={{ color: isHealthy ? '#10b981' : '#f59e0b' }} />
                : <TrendingDown className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
              }
              <span className="text-xs font-bold"
                style={{ color: isProfit ? (isHealthy ? '#10b981' : '#f59e0b') : '#ef4444' }}>
                {isProfit ? (isHealthy ? 'Healthy' : 'Low margin') : 'Loss'}
              </span>
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border-dim)' }}>
            {/* Selling price */}
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Selling Price / unit</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {fmtINR(sellingPrice)}
              </p>
            </div>

            {/* True cost */}
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>True Cost / unit</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {fmtINR(trueCostPerUnit)}
              </p>
            </div>

            {/* Profit per unit */}
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Profit / unit
              </p>
              <p className="text-sm font-bold"
                style={{ color: isProfit ? '#10b981' : '#ef4444' }}>
                {isProfit ? '+' : ''}{fmtINR(profitPerUnit)}
              </p>
            </div>

            {/* Margin % — big */}
            <div className="px-4 py-4 flex items-center justify-between"
              style={{ background: 'var(--bg-secondary)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Gross Margin
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  (Selling − Cost) ÷ Selling
                </p>
              </div>
              <p className="text-3xl font-black"
                style={{ color: isProfit ? (isHealthy ? '#10b981' : '#f59e0b') : '#ef4444' }}>
                {marginPercent.toFixed(1)}%
              </p>
            </div>

            {/* Total profit for batch */}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Total {isProfit ? 'Profit' : 'Loss'} ({assemblyQty} units)
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  If all units sold
                </p>
              </div>
              <p className="text-base font-black"
                style={{ color: isProfit ? '#10b981' : '#ef4444' }}>
                {isProfit ? '+' : ''}{fmtINR(totalProfit)}
              </p>
            </div>
          </div>

          {/* Margin bar */}
          <div className="px-4 pb-4 pt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>0%</span>
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                Target 20%
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>50%+</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--border-dim)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width     : `${Math.min(Math.max(marginPercent, 0), 100)}%`,
                  background: isProfit
                    ? (isHealthy ? 'linear-gradient(90deg,#10b981,#3b82f6)' : 'linear-gradient(90deg,#f59e0b,#10b981)')
                    : '#ef4444',
                }}
              />
            </div>
            {/* 20% marker */}
            <div className="relative h-1">
              <div className="absolute h-3 w-px -top-2"
                style={{ left: '20%', background: 'var(--text-dim)' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}