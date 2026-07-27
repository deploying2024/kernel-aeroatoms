'use client'

import { useState } from 'react'
import {
  BarChart3, TrendingUp, Package,
  ArrowLeftRight, Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

type MaterialValue = {
  material_id  : string
  material_name: string
  material_type: string
  description  : string | null
  total_qty    : number
  remaining_qty: number
  value_inr    : number
  value_usd    : number
  has_price    : boolean
  vendor_name  : string
  entries      : {
    id             : string
    quantity       : number
    remaining      : number
    unit_cost      : number | null
    currency       : string
    customs_percent: number
    landed_inr     : number
    landed_usd     : number
  }[]
}

type Category = {
  name : string
  inr  : number
  usd  : number
  count: number
}

const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  'IC / Microcontroller' : { color: '#3b82f6', bg: '#3b82f615' },
  'Passive Component'    : { color: '#8b5cf6', bg: '#8b5cf615' },
  'Sensor / Module'      : { color: '#10b981', bg: '#10b98115' },
  'Connector / Cable'    : { color: '#f59e0b', bg: '#f59e0b15' },
  'Other'                : { color: '#6b7280', bg: '#6b728015' },
}
const DEFAULT_CFG = { color: '#6b7280', bg: '#6b728015' }

export default function InventoryValueClient({
  materials,
  categories,
  totalValueInr,
  totalValueUsd,
  usdToInr,
}: {
  materials    : MaterialValue[]
  categories   : Category[]
  totalValueInr: number
  totalValueUsd: number
  usdToInr     : number
}) {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR')
  const [search,   setSearch]   = useState('')

  const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(n)

  const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 2,
    }).format(n)

  const fmt = (inr: number, usd: number) =>
    currency === 'INR' ? fmtINR(inr) : fmtUSD(usd)

  const totalValue = currency === 'INR' ? totalValueInr : totalValueUsd

  const filtered = materials.filter(m =>
    !search ||
    m.material_name.toLowerCase().includes(search.toLowerCase()) ||
    m.material_type.toLowerCase().includes(search.toLowerCase())
  )

  const maxValue = Math.max(...filtered.map(m =>
    currency === 'INR' ? m.value_inr : m.value_usd
  ), 1)

  const withPrice    = materials.filter(m => m.has_price).length
  const withoutPrice = materials.length - withPrice

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  return (
    <div className="px-6 md:px-10 py-8 space-y-8">

      {/* ── Currency toggle + total ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

        {/* Total value card */}
        <div
          className="rounded-2xl border p-6 flex-1"
          style={{
            background  : 'var(--bg-card)',
            borderColor : 'var(--accent-border)',
            boxShadow   : '0 0 0 1px #3b82f615, 0 8px 32px #3b82f610',
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-secondary)' }}>
            Total Inventory Value
          </p>
          <p className="text-4xl font-black" style={{ color: 'var(--accent)' }}>
            {currency === 'INR' ? fmtINR(totalValueInr) : fmtUSD(totalValueUsd)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {currency === 'INR'
              ? `≈ ${fmtUSD(totalValueUsd)} USD`
              : `≈ ${fmtINR(totalValueInr)} INR`}
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
            {withPrice} of {materials.length} materials have pricing ·
            {withoutPrice > 0 && ` ${withoutPrice} without price excluded`}
          </p>
        </div>

        {/* Currency toggle */}
        <div className="flex flex-col items-end gap-3">
          <div
            className="flex items-center gap-2 p-1 rounded-2xl border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
          >
            <button
              onClick={() => setCurrency('INR')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background : currency === 'INR' ? 'var(--accent)' : 'transparent',
                color      : currency === 'INR' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              ₹ INR
            </button>
            <div className="flex items-center gap-1 px-2">
              <ArrowLeftRight className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
            </div>
            <button
              onClick={() => setCurrency('USD')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background : currency === 'USD' ? 'var(--accent)' : 'transparent',
                color      : currency === 'USD' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              $ USD
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Rate: 1 USD = ₹{usdToInr.toFixed(2)} (live)
          </p>
        </div>
      </div>

      {/* ── By category ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}>
          By Category
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map(cat => {
            const cfg   = TYPE_CONFIG[cat.name] ?? DEFAULT_CFG
            const value = currency === 'INR' ? cat.inr : cat.usd
            const pct   = totalValue > 0 ? (value / totalValue) * 100 : 0
            return (
              <div
                key={cat.name}
                className="rounded-xl border p-4 space-y-2"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cat.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {cat.count} items
                  </span>
                </div>
                <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                  {fmt(cat.inr, cat.usd)}
                </p>
                <div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border-dim)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: cfg.color }}
                    />
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>
                    {pct.toFixed(1)}% of total
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Material table ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-sm font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}>
            By Material ({filtered.length})
          </h2>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: 'var(--text-dim)' }} />
            <Input
              placeholder="Search material…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm border rounded-lg"
              style={inputStyle}
            />
          </div>
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                  {['#', 'Material', 'Type', 'Remaining', 'Unit Cost', 'Customs', 'Value'].map((h, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest ${i >= 3 ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16"
                      style={{ color: 'var(--text-dim)' }}>
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No materials found</p>
                    </td>
                  </tr>
                ) : filtered.map((mat, idx) => {
                  const cfg   = TYPE_CONFIG[mat.material_type] ?? DEFAULT_CFG
                  const value = currency === 'INR' ? mat.value_inr : mat.value_usd
                  const barW  = value > 0 ? (value / (currency === 'INR' ? maxValue : maxValue)) * 100 : 0

                  // Aggregate unit cost display
                  const priced = mat.entries.filter(e => e.unit_cost != null && e.unit_cost > 0)
                  const avgLandedInr = priced.length > 0
                    ? priced.reduce((s, e) => s + e.landed_inr, 0) / priced.length
                    : 0
                  const avgLandedUsd = priced.length > 0
                    ? priced.reduce((s, e) => s + e.landed_usd, 0) / priced.length
                    : 0
                  const avgCustomsPct = priced.length > 0
                    ? priced.reduce((s, e) => s + e.customs_percent, 0) / priced.length
                    : 0

                  return (
                    <tr
                      key={mat.material_id}
                      style={{ borderBottom: '1px solid var(--border-dim)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      {/* # */}
                      <td className="px-4 py-3.5 text-xs text-center"
                        style={{ color: 'var(--text-dim)', width: 44 }}>
                        {idx + 1}
                      </td>

                      {/* Material */}
                      <td className="px-4 py-3.5" style={{ maxWidth: 220 }}>
                        <p className="font-semibold text-sm truncate"
                          style={{ color: 'var(--text-primary)' }}>
                          {mat.material_name}
                        </p>
                        {mat.description && (
                          <p className="text-xs truncate mt-0.5"
                            style={{ color: 'var(--text-dim)' }}>
                            {mat.description}
                          </p>
                        )}
                        {!mat.has_price && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded mt-0.5 inline-block"
                            style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                            no price
                          </span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {mat.material_type}
                        </span>
                      </td>

                      {/* Remaining */}
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {mat.remaining_qty.toLocaleString()}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                          of {mat.total_qty.toLocaleString()}
                        </p>
                      </td>

                      {/* Unit cost (landed avg) */}
                      <td className="px-4 py-3.5 text-right">
                        {avgLandedInr > 0 ? (
                          <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {currency === 'INR'
                                ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(avgLandedInr)
                                : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(avgLandedUsd)}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                              landed/unit
                            </p>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Customs */}
                      <td className="px-4 py-3.5 text-right">
                        {avgCustomsPct > 0 ? (
                          <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                            {avgCustomsPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Value with bar */}
                      <td className="px-4 py-3.5 text-right" style={{ minWidth: 140 }}>
                        {value > 0 ? (
                          <div>
                            <p className="font-black text-sm" style={{ color: 'var(--accent)' }}>
                              {fmt(mat.value_inr, mat.value_usd)}
                            </p>
                            <div className="mt-1.5 h-1 rounded-full overflow-hidden"
                              style={{ background: 'var(--border-dim)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${barW}%`, background: cfg.color }}
                              />
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                              {totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0}% of total
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                            No pricing
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer total */}
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                    <td colSpan={6} className="px-4 py-4 text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-secondary)' }}>
                      Total Inventory Value · {filtered.length} materials
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-xl font-black" style={{ color: 'var(--accent)' }}>
                        {currency === 'INR' ? fmtINR(totalValueInr) : fmtUSD(totalValueUsd)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {currency === 'INR'
                          ? `≈ ${fmtUSD(totalValueUsd)}`
                          : `≈ ${fmtINR(totalValueInr)}`}
                      </p>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}