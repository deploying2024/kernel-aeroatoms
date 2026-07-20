'use client'

import {
  Package, Receipt, AlertTriangle,
  Wrench, TrendingUp, TrendingDown,
  DollarSign, ChevronRight,
} from 'lucide-react'

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)

type BreakupProps = {
  bomBase          : number
  customsTotal     : number
  bomPerUnit       : number
  effectiveBom     : number
  failureImpact    : number
  failureRate      : number
  onetimeTotal     : number
  amortizedPerUnit : number
  trueCostPerUnit  : number
  sellingPrice     : number
  profitPerUnit    : number
  marginPercent    : number
  totalProfit      : number
  assemblyQty      : number
  compact?         : boolean   // true = card summary, false = full expanded
}

export default function CostBreakup({
  bomBase, customsTotal, bomPerUnit,
  effectiveBom, failureImpact, failureRate,
  onetimeTotal, amortizedPerUnit, trueCostPerUnit,
  sellingPrice, profitPerUnit, marginPercent, totalProfit,
  assemblyQty, compact = false,
}: BreakupProps) {

  const isProfit  = profitPerUnit >= 0
  const isHealthy = marginPercent >= 20

  const marginColor = !sellingPrice    ? 'var(--text-dim)'
    : isProfit && isHealthy            ? '#10b981'
    : isProfit && !isHealthy           ? '#f59e0b'
    : '#ef4444'

  // ── Compact version — shown on card ──────────────────────────────────────
  if (compact) {
    return (
      <div
        className="mt-3 rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-dim)' }}
      >
        {/* Mini stacked bar */}
        <div className="flex h-2">
          {bomBase > 0 && (
            <div
              title={`BOM: ${fmtINR(bomBase)}`}
              style={{
                width     : `${(bomBase / trueCostPerUnit) * 100}%`,
                background: '#3b82f6',
              }}
            />
          )}
          {customsTotal > 0 && (
            <div
              title={`Customs: ${fmtINR(customsTotal)}`}
              style={{
                width     : `${(customsTotal / trueCostPerUnit) * 100}%`,
                background: '#f59e0b',
              }}
            />
          )}
          {failureImpact > 0 && (
            <div
              title={`Failure: ${fmtINR(failureImpact)}`}
              style={{
                width     : `${(failureImpact / trueCostPerUnit) * 100}%`,
                background: '#ef4444',
              }}
            />
          )}
          {amortizedPerUnit > 0 && (
            <div
              title={`One-time: ${fmtINR(amortizedPerUnit)}`}
              style={{
                width     : `${(amortizedPerUnit / trueCostPerUnit) * 100}%`,
                background: '#8b5cf6',
              }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-2.5">
          <LegendDot color="#3b82f6" label="BOM" value={fmtINR(bomBase)} />
          {customsTotal > 0 && (
            <LegendDot color="#f59e0b" label="Customs" value={fmtINR(customsTotal)} />
          )}
          {failureImpact > 0 && (
            <LegendDot color="#ef4444" label={`Failure (${failureRate}%)`} value={`+${fmtINR(failureImpact)}`} />
          )}
          {amortizedPerUnit > 0 && (
            <LegendDot color="#8b5cf6" label="One-time/unit" value={fmtINR(amortizedPerUnit)} />
          )}
        </div>

        {/* True cost + margin inline */}
        <div className="flex items-center justify-between px-3 py-2 border-t"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                True Cost
              </p>
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                {fmtINR(trueCostPerUnit)}
              </p>
            </div>
            {sellingPrice > 0 && (
              <>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                    Selling
                  </p>
                  <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                    {fmtINR(sellingPrice)}
                  </p>
                </div>
              </>
            )}
          </div>
          {sellingPrice > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                Margin
              </p>
              <p className="text-base font-black" style={{ color: marginColor }}>
                {marginPercent.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Full version — shown in expanded view ─────────────────────────────────
  return (
    <div className="space-y-3">

      {/* Stacked bar — full width */}
      <div>
        <div className="flex h-4 rounded-lg overflow-hidden border"
          style={{ borderColor: 'var(--border-dim)' }}>
          {bomBase > 0 && (
            <div
              className="flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
              title={`BOM components: ${fmtINR(bomBase)}`}
              style={{
                width     : `${(bomBase / trueCostPerUnit) * 100}%`,
                background: '#3b82f6',
                minWidth  : '2px',
              }}>
              {(bomBase / trueCostPerUnit) > 0.12 ? 'BOM' : ''}
            </div>
          )}
          {customsTotal > 0 && (
            <div
              className="flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
              title={`Customs: ${fmtINR(customsTotal)}`}
              style={{
                width     : `${(customsTotal / trueCostPerUnit) * 100}%`,
                background: '#f59e0b',
                minWidth  : '2px',
              }}>
              {(customsTotal / trueCostPerUnit) > 0.1 ? 'Customs' : ''}
            </div>
          )}
          {failureImpact > 0 && (
            <div
              className="flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
              title={`Failure (${failureRate}%): ${fmtINR(failureImpact)}`}
              style={{
                width     : `${(failureImpact / trueCostPerUnit) * 100}%`,
                background: '#ef4444',
                minWidth  : '2px',
              }}>
              {(failureImpact / trueCostPerUnit) > 0.1 ? 'Fail' : ''}
            </div>
          )}
          {amortizedPerUnit > 0 && (
            <div
              className="flex items-center justify-center text-[9px] font-bold text-white overflow-hidden"
              title={`One-time/unit: ${fmtINR(amortizedPerUnit)}`}
              style={{
                width     : `${(amortizedPerUnit / trueCostPerUnit) * 100}%`,
                background: '#8b5cf6',
                minWidth  : '2px',
              }}>
              {(amortizedPerUnit / trueCostPerUnit) > 0.1 ? 'NRE' : ''}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
          <LegendDot color="#3b82f6" label="BOM Components" value={fmtINR(bomBase)}
            pct={`${((bomBase / trueCostPerUnit) * 100).toFixed(1)}%`} />
          {customsTotal > 0 && (
            <LegendDot color="#f59e0b" label="Customs & Duties" value={fmtINR(customsTotal)}
              pct={`${((customsTotal / trueCostPerUnit) * 100).toFixed(1)}%`} />
          )}
          {failureImpact > 0 && (
            <LegendDot color="#ef4444" label={`Failure Rate (${failureRate}%)`} value={`+${fmtINR(failureImpact)}`}
              pct={`${((failureImpact / trueCostPerUnit) * 100).toFixed(1)}%`} />
          )}
          {amortizedPerUnit > 0 && (
            <LegendDot color="#8b5cf6" label="One-time / unit" value={fmtINR(amortizedPerUnit)}
              pct={`${((amortizedPerUnit / trueCostPerUnit) * 100).toFixed(1)}%`} />
          )}
        </div>
      </div>

      {/* Detailed rows */}
      <div className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-dim)' }}>

        <Row
          icon={<Package className="w-3.5 h-3.5" />}
          color="#3b82f6"
          label="BOM Components"
          sub="Raw materials, PCB, passives"
          value={fmtINR(bomBase)}
          pct={((bomBase / trueCostPerUnit) * 100).toFixed(1) + '%'}
        />

        {customsTotal > 0 && (
          <Row
            icon={<Receipt className="w-3.5 h-3.5" />}
            color="#f59e0b"
            label="Customs & Duties"
            sub="Import duties on components"
            value={`+${fmtINR(customsTotal)}`}
            pct={((customsTotal / trueCostPerUnit) * 100).toFixed(1) + '%'}
          />
        )}

        <RowDivider label="BOM per unit" value={fmtINR(bomPerUnit)} />

        {failureImpact > 0 && (
          <>
            <Row
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              color="#ef4444"
              label={`Failure Rate — ${failureRate}%`}
              sub={`${fmtINR(bomPerUnit)} ÷ ${(1 - failureRate / 100).toFixed(4)} = ${fmtINR(effectiveBom)}`}
              value={`+${fmtINR(failureImpact)}`}
              pct={((failureImpact / trueCostPerUnit) * 100).toFixed(1) + '%'}
            />
            <RowDivider label="Effective BOM / unit" value={fmtINR(effectiveBom)} />
          </>
        )}

        {onetimeTotal > 0 && (
          <>
            <Row
              icon={<Wrench className="w-3.5 h-3.5" />}
              color="#8b5cf6"
              label="One-time Costs (NRE, Cert, Licensing)"
              sub={`${fmtINR(onetimeTotal)} total ÷ ${assemblyQty} units`}
              value={`+${fmtINR(amortizedPerUnit)}`}
              pct={((amortizedPerUnit / trueCostPerUnit) * 100).toFixed(1) + '%'}
            />
          </>
        )}

        {/* True cost — highlighted */}
        <div className="flex items-center justify-between px-4 py-3.5 border-t"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
              True Cost / unit
            </p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              All costs included
            </p>
          </div>
          <p className="text-xl font-black" style={{ color: 'var(--accent)' }}>
            {fmtINR(trueCostPerUnit)}
          </p>
        </div>

        {/* Selling price & margin */}
        {sellingPrice > 0 && (
          <>
            <Row
              icon={<DollarSign className="w-3.5 h-3.5" />}
              color={marginColor}
              label="Selling Price / unit"
              sub={`Profit: ${isProfit ? '+' : ''}${fmtINR(profitPerUnit)} per unit`}
              value={fmtINR(sellingPrice)}
            />

            {/* Margin bar */}
            <div className="px-4 py-3 border-t"
              style={{ borderColor: 'var(--border-dim)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isProfit
                    ? <TrendingUp  className="w-4 h-4" style={{ color: marginColor }} />
                    : <TrendingDown className="w-4 h-4" style={{ color: marginColor }} />
                  }
                  <span className="text-sm font-bold" style={{ color: marginColor }}>
                    {marginPercent.toFixed(1)}% Gross Margin
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: `${marginColor}15`,
                      color      : marginColor,
                      border     : `1px solid ${marginColor}30`,
                    }}>
                    {!sellingPrice      ? '—'
                      : isHealthy       ? '✓ Healthy'
                      : isProfit        ? '⚠ Low'
                      : '✗ Loss'}
                  </span>
                </div>
                <span className="text-sm font-bold"
                  style={{ color: isProfit ? '#10b981' : '#ef4444' }}>
                  {isProfit ? '+' : ''}{fmtINR(totalProfit)} total
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden"
                style={{ background: 'var(--border-dim)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width     : `${Math.min(Math.max(marginPercent, 0), 100)}%`,
                    background: isProfit
                      ? (isHealthy
                          ? 'linear-gradient(90deg,#10b981,#3b82f6)'
                          : 'linear-gradient(90deg,#f59e0b,#10b981)')
                      : '#ef4444',
                  }}
                />
                {/* 20% marker */}
                <div className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: '20%', background: 'rgba(255,255,255,0.5)' }} />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>0%</span>
                <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>20% target</span>
                <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>100%</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Helper subcomponents ─────────────────────────────────────────────────────

function LegendDot({
  color, label, value, pct,
}: {
  color: string; label: string; value: string; pct?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
      {pct && <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>({pct})</span>}
    </div>
  )
}

function Row({
  icon, color, label, sub, value, pct,
}: {
  icon : React.ReactNode
  color: string
  label: string
  sub  : string
  value: string
  pct? : string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t"
      style={{ borderColor: 'var(--border-dim)' }}>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{sub}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="text-sm font-bold" style={{ color }}>{value}</p>
        {pct && <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{pct} of total</p>}
      </div>
    </div>
  )
}

function RowDivider({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t"
      style={{ borderColor: 'var(--border-dim)', background: '#3b82f606' }}>
      <p className="text-xs font-bold uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm font-black" style={{ color: '#3b82f6' }}>{value}</p>
    </div>
  )
}