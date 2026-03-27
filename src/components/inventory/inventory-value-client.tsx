'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import {
  BarChart3, Package, Building2,
  TrendingUp, Layers, DollarSign,
} from 'lucide-react'
import type { StockEntry } from '@/lib/types'

const TYPE_CONFIG: Record<string, {
  color : string
  bg    : string
  border: string
  glow  : string
  icon  : string
}> = {
  'IC / Microcontroller' : { color: '#00d4ff', bg: '#00d4ff10', border: '#00d4ff30', glow: '0 0 24px #00d4ff18', icon: '⚙️' },
  'Passive Component'    : { color: '#bf00ff', bg: '#bf00ff10', border: '#bf00ff30', glow: '0 0 24px #bf00ff18', icon: '〰️' },
  'Sensor / Module'      : { color: '#00ff9f', bg: '#00ff9f10', border: '#00ff9f30', glow: '0 0 24px #00ff9f18', icon: '📡' },
  'Connector / Cable'    : { color: '#ffaa00', bg: '#ffaa0010', border: '#ffaa0030', glow: '0 0 24px #ffaa0018', icon: '🔌' },
  'Other'                : { color: '#aaaacc', bg: '#aaaacc10', border: '#aaaacc30', glow: 'none',               icon: '📦' },
}
const DEFAULT_CFG = TYPE_CONFIG['Other']

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style                : 'currency',
    currency             : 'USD',
    maximumFractionDigits: 2,
  }).format(n)

const fmtCompact = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style                : 'currency',
    currency             : 'USD',
    notation             : 'compact',
    maximumFractionDigits: 1,
  }).format(n)

export default function InventoryValueClient({ stock }: { stock: StockEntry[] }) {

  // Only entries with unit_cost set
  const valued = useMemo(() =>
    stock.filter(s => s.unit_cost != null && s.unit_cost > 0 && s.remaining > 0),
    [stock]
  )

  // Total value
  const totalValue = useMemo(() =>
    valued.reduce((sum, s) => sum + (s.unit_cost! * s.remaining), 0),
    [valued]
  )

  // Items with no cost set
  const uncosted = useMemo(() =>
    [...new Set(
      stock
        .filter(s => !s.unit_cost || s.unit_cost === 0)
        .map(s => s.material_name)
    )],
    [stock]
  )

  // ── By category ──
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    valued.forEach(s => {
      const t = s.material_type ?? 'Other'
      map[t] = (map[t] ?? 0) + s.unit_cost! * s.remaining
    })
    return Object.entries(map)
      .map(([type, value]) => ({ type, value }))
      .sort((a, b) => b.value - a.value)
  }, [valued])

  // ── By vendor ──
  const byVendor = useMemo(() => {
    const map: Record<string, number> = {}
    valued.forEach(s => {
      const v = s.vendor_name ?? 'Unknown'
      map[v] = (map[v] ?? 0) + s.unit_cost! * s.remaining
    })
    return Object.entries(map)
      .map(([vendor, value]) => ({ vendor, value }))
      .sort((a, b) => b.value - a.value)
  }, [valued])

  // ── Top items by value ──
  type ItemRow = {
    material_id  : string
    material_name: string
    material_type: string
    description  : string | null
    vendor_name  : string
    remaining    : number
    unit_cost    : number
    total_value  : number
    received_at  : string
  }

  const topItems = useMemo(() => {
    const map = new Map<string, ItemRow>()
    valued.forEach(s => {
      const key = `${s.material_id}-${s.vendor_id}`
      if (!map.has(key)) {
        map.set(key, {
          material_id  : s.material_id,
          material_name: s.material_name,
          material_type: s.material_type,
          description  : s.description,
          vendor_name  : s.vendor_name,
          remaining    : 0,
          unit_cost    : s.unit_cost!,
          total_value  : 0,
          received_at  : s.received_at,
        })
      }
      const row = map.get(key)!
      row.remaining  += s.remaining
      row.total_value = row.unit_cost * row.remaining
    })
    return Array.from(map.values()).sort((a, b) => b.total_value - a.total_value).slice(0, 10)
  }, [valued])

  const maxCatValue    = byCategory[0]?.value ?? 1
  const maxVendorValue = byVendor[0]?.value   ?? 1
  const maxItemValue   = topItems[0]?.total_value ?? 1

  return (
    <div className="px-6 md:px-10 py-8 space-y-8">

      {/* ── Stat cards row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Total value */}
        <div
          className="relative rounded-2xl border p-6 overflow-hidden col-span-1 sm:col-span-1 transition-all hover:scale-[1.01]"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)', boxShadow: '0 0 30px color-mix(in srgb, var(--accent) 8%, transparent)' }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ background: 'var(--accent)' }} />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
              <DollarSign className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              Current
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-secondary)' }}>Total Inventory Value</p>
          <p className="text-3xl font-black tracking-tight"
            style={{ color: 'var(--text-primary)', textShadow: '0 0 30px color-mix(in srgb, var(--accent) 30%, transparent)' }}>
            {fmtCompact(totalValue)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {fmt(totalValue)}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
            style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
        </div>

        {/* Valued items */}
        <div
          className="relative rounded-2xl border p-6 overflow-hidden transition-all hover:scale-[1.01]"
          style={{ background: 'var(--bg-card)', borderColor: '#00ff9f30', boxShadow: '0 0 24px #00ff9f12' }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ background: '#00ff9f' }} />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#00ff9f12', border: '1px solid #00ff9f30' }}>
              <Package className="w-5 h-5" style={{ color: '#00ff9f' }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: '#00ff9f12', color: '#00ff9f' }}>
              Items
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-secondary)' }}>Valued Materials</p>
          <p className="text-3xl font-black tracking-tight"
            style={{ color: 'var(--text-primary)', textShadow: '0 0 30px #00ff9f30' }}>
            {new Set(valued.map(s => s.material_id)).size}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            unique materials with cost set
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
            style={{ background: 'linear-gradient(90deg, #00ff9f, transparent)' }} />
        </div>

        {/* Categories */}
        <div
          className="relative rounded-2xl border p-6 overflow-hidden transition-all hover:scale-[1.01]"
          style={{ background: 'var(--bg-card)', borderColor: '#bf00ff30', boxShadow: '0 0 24px #bf00ff12' }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ background: '#bf00ff' }} />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#bf00ff12', border: '1px solid #bf00ff30' }}>
              <Layers className="w-5 h-5" style={{ color: '#bf00ff' }} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: '#bf00ff12', color: '#bf00ff' }}>
              Types
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-secondary)' }}>Categories Tracked</p>
          <p className="text-3xl font-black tracking-tight"
            style={{ color: 'var(--text-primary)', textShadow: '0 0 30px #bf00ff30' }}>
            {byCategory.length}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            component categories
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
            style={{ background: 'linear-gradient(90deg, #bf00ff, transparent)' }} />
        </div>
      </div>

      {/* Uncosted warning */}
      {uncosted.length > 0 && (
        <div
          className="rounded-xl border px-5 py-4 flex items-start gap-3"
          style={{ background: '#ffaa0008', borderColor: '#ffaa0033' }}
        >
          <span className="text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#ffaa00' }}>
              {uncosted.length} material{uncosted.length !== 1 && 's'} missing unit cost
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              These are excluded from value calculations:{' '}
              <span style={{ color: '#ffaa00' }}>{uncosted.join(', ')}</span>
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
              Set unit cost when inscanning to include them.
            </p>
          </div>
        </div>
      )}

      {/* ── Category + Vendor breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* By Category */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--neon-purple) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--neon-purple) 25%, transparent)' }}>
              <Layers className="w-4 h-4" style={{ color: 'var(--neon-purple)' }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Value by Category
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                unit cost × remaining per type
              </p>
            </div>
          </div>

          {byCategory.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-dim)' }}>
              No valued stock yet
            </p>
          ) : (
            <div className="space-y-4">
              {byCategory.map(({ type, value }) => {
                const cfg = TYPE_CONFIG[type] ?? DEFAULT_CFG
                const pct = (value / totalValue) * 100
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                        >
                          {cfg.icon} {type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                          {pct.toFixed(1)}%
                        </span>
                        <span className="text-sm font-bold" style={{ color: cfg.color }}>
                          {fmt(value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--border-dim)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width      : `${(value / maxCatValue) * 100}%`,
                          background : `linear-gradient(90deg, ${cfg.color}, ${cfg.color}66)`,
                          boxShadow  : `0 0 8px ${cfg.color}44`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* By Vendor */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--neon-blue) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--neon-blue) 25%, transparent)' }}>
              <Building2 className="w-4 h-4" style={{ color: 'var(--neon-blue)' }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Value by Vendor
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                current value of stock per supplier
              </p>
            </div>
          </div>

          {byVendor.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-dim)' }}>
              No valued stock yet
            </p>
          ) : (
            <div className="space-y-4">
              {byVendor.map(({ vendor, value }, i) => {
                const pct    = (value / totalValue) * 100
                const colors = ['#00d4ff', '#bf00ff', '#00ff9f', '#ffaa00', '#ff006e']
                const color  = colors[i % colors.length]
                return (
                  <div key={vendor}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                        >
                          {vendor[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm truncate max-w-[150px]"
                          style={{ color: 'var(--text-primary)' }}>
                          {vendor}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                          {pct.toFixed(1)}%
                        </span>
                        <span className="text-sm font-bold" style={{ color }}>
                          {fmt(value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--border-dim)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width      : `${(value / maxVendorValue) * 100}%`,
                          background : `linear-gradient(90deg, ${color}, ${color}66)`,
                          boxShadow  : `0 0 8px ${color}44`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Top items ranked ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Most Valuable Items
          </h2>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
          >
            Top {topItems.length}
          </span>
        </div>

        <div className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  {['#', 'Material', 'Type', 'Vendor', 'Unit Cost', 'Remaining', 'Value', 'Share'].map((h, i) => (
                    <th
                      key={h}
                      className={`py-3 px-4 text-[10px] font-bold uppercase tracking-widest ${i >= 4 ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-sm"
                      style={{ color: 'var(--text-dim)' }}>
                      No valued items yet — set unit costs when inscanning
                    </td>
                  </tr>
                ) : topItems.map((item, i) => {
                  const cfg   = TYPE_CONFIG[item.material_type] ?? DEFAULT_CFG
                  const share = totalValue > 0 ? (item.total_value / totalValue) * 100 : 0
                  return (
                    <tr
                      key={`${item.material_id}-${item.vendor_name}`}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border-dim)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      {/* Rank */}
                      <td className="px-4 py-4">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                          style={
                            i === 0 ? { background: '#ffaa0022', color: '#ffaa00', border: '1px solid #ffaa0044' } :
                            i === 1 ? { background: '#aaaacc22', color: '#aaaacc', border: '1px solid #aaaacc44' } :
                            i === 2 ? { background: '#cd7f3222', color: '#cd7f32', border: '1px solid #cd7f3244' } :
                            { background: 'var(--border-dim)', color: 'var(--text-dim)' }
                          }
                        >
                          {i + 1}
                        </div>
                      </td>

                      {/* Material */}
                      <td className="px-4 py-4">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {item.material_name}
                        </p>
                        {item.description && (
                          <p className="text-xs truncate max-w-[160px]" style={{ color: 'var(--text-dim)' }}>
                            {item.description}
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                        >
                          {cfg.icon} {item.material_type}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {item.vendor_name}
                      </td>

                      {/* Unit cost */}
                      <td className="px-4 py-4 text-right text-sm font-mono"
                        style={{ color: 'var(--text-secondary)' }}>
                        {fmt(item.unit_cost)}
                      </td>

                      {/* Remaining */}
                      <td className="px-4 py-4 text-right font-mono text-sm"
                        style={{ color: 'var(--text-primary)' }}>
                        {item.remaining.toLocaleString()}
                      </td>

                      {/* Value */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-black text-sm" style={{ color: 'var(--accent)' }}>
                          {fmt(item.total_value)}
                        </span>
                      </td>

                      {/* Share bar */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'var(--border-dim)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width      : `${(item.total_value / maxItemValue) * 100}%`,
                                background : 'linear-gradient(90deg, var(--accent), var(--accent)88)',
                              }}
                            />
                          </div>
                          <span className="text-xs w-8 text-right" style={{ color: 'var(--text-secondary)' }}>
                            {share.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer total */}
              {topItems.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '1px solid var(--accent-border)', background: 'var(--accent-soft)' }}>
                    <td colSpan={6} className="px-4 py-3.5 text-sm font-semibold"
                      style={{ color: 'var(--text-secondary)' }}>
                      Total Inventory Value
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-base"
                      style={{ color: 'var(--accent)' }}>
                      {fmt(totalValue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Stock cards section */}
      <StockCardsSection stock={stock} />
    </div>
  )
}

// ── Inline stock cards (moved from inventory page) ──────────────────────────
function StockCardsSection({ stock }: { stock: StockEntry[] }) {
  const cardMap = new Map<string, {
    material_id     : string
    material_name   : string
    material_type   : string
    description     : string | null
    total_inscanned : number
    total_remaining : number
    vendors         : { vendor_name: string; remaining: number; received_at: string }[]
  }>()

  stock.forEach(s => {
    if (!s.entry_id) return
    if (!cardMap.has(s.material_id)) {
      cardMap.set(s.material_id, {
        material_id     : s.material_id,
        material_name   : s.material_name,
        material_type   : s.material_type,
        description     : s.description,
        total_inscanned : 0,
        total_remaining : 0,
        vendors         : [],
      })
    }
    const card = cardMap.get(s.material_id)!
    card.total_inscanned += s.inscanned  ?? 0
    card.total_remaining += s.remaining ?? 0
    card.vendors.push({
      vendor_name : s.vendor_name  ?? '—',
      remaining   : s.remaining   ?? 0,
      received_at : s.received_at ?? '',
    })
  })

  const cards = Array.from(cardMap.values())

  if (cards.length === 0) return null

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          All Stock
        </h2>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
        >
          {cards.length} materials
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(card => {
          const cfg     = TYPE_CONFIG[card.material_type] ?? DEFAULT_CFG
          const isLow   = card.total_remaining > 0 && card.total_remaining <= 10
          const isEmpty = card.total_remaining === 0

          return (
            <div
              key={card.material_id}
              className="relative rounded-2xl border overflow-hidden transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'var(--bg-card)', borderColor: cfg.border, boxShadow: cfg.glow }}
            >
              <div className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ background: cfg.color }} />

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                  >
                    {cfg.icon} {card.material_type}
                  </span>
                  {(isLow || isEmpty) && (
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: '#ff006e15', color: '#ff006e', border: '1px solid #ff006e33' }}
                    >
                      {isEmpty ? 'OUT OF STOCK' : 'LOW'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base leading-tight mb-1 truncate"
                  style={{ color: 'var(--text-primary)' }}>
                  {card.material_name}
                </h3>
                {card.description && (
                  <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-dim)' }}>
                    {card.description}
                  </p>
                )}

                <div className="my-4">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-secondary)' }}>Remaining Stock</p>
                  <div className="flex items-end gap-2">
                    <span
                      className="text-4xl font-black tracking-tight leading-none"
                      style={{
                        color      : isEmpty ? '#ff006e' : isLow ? '#ffaa00' : cfg.color,
                        textShadow : `0 0 30px ${isEmpty ? '#ff006e' : isLow ? '#ffaa00' : cfg.color}44`,
                      }}
                    >
                      {card.total_remaining.toLocaleString()}
                    </span>
                    <span className="text-sm mb-1" style={{ color: 'var(--text-dim)' }}>
                      / {card.total_inscanned.toLocaleString()} total
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border-dim)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width      : `${card.total_inscanned > 0 ? Math.min((card.total_remaining / card.total_inscanned) * 100, 100) : 0}%`,
                        background : isEmpty
                          ? '#ff006e'
                          : isLow
                          ? 'linear-gradient(90deg, #ffaa00, #ff006e)'
                          : `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
                      }}
                    />
                  </div>
                </div>

                {card.vendors.length > 0 && (
                  <div className="rounded-xl p-3 space-y-2"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-dim)' }}>Vendor Batches</p>
                    {card.vendors.map((v, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: cfg.color }} />
                          <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {v.vendor_name}
                          </span>
                          {v.received_at && (
                            <span className="text-[10px] shrink-0" style={{ color: 'var(--text-dim)' }}>
                              · {format(new Date(v.received_at), 'dd MMM yy')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold shrink-0 ml-2"
                          style={{ color: v.remaining <= 0 ? '#ff006e' : cfg.color }}>
                          {v.remaining.toLocaleString()} left
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}