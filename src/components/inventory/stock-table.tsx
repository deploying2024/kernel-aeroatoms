'use client'

import { useState } from 'react'
import { Search, Layers, TrendingDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import type { StockEntry } from '@/lib/types'

const TYPE_CONFIG: Record<string, {
  color : string
  bg    : string
  border: string
  glow  : string
  icon  : string
}> = {
  'IC / Microcontroller' : { color: '#00d4ff', bg: '#00d4ff10', border: '#00d4ff30', glow: '0 0 20px #00d4ff15', icon: '⚙️' },
  'Passive Component'    : { color: '#bf00ff', bg: '#bf00ff10', border: '#bf00ff30', glow: '0 0 20px #bf00ff15', icon: '〰️' },
  'Sensor / Module'      : { color: '#00ff9f', bg: '#00ff9f10', border: '#00ff9f30', glow: '0 0 20px #00ff9f15', icon: '📡' },
  'Connector / Cable'    : { color: '#ffaa00', bg: '#ffaa0010', border: '#ffaa0030', glow: '0 0 20px #ffaa0015', icon: '🔌' },
  'Other'                : { color: '#aaaacc', bg: '#aaaacc10', border: '#aaaacc30', glow: 'none',               icon: '📦' },
}

const DEFAULT_TYPE = TYPE_CONFIG['Other']

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style                : 'currency',
    currency             : 'USD',
    maximumFractionDigits: 2,
  }).format(n)

export default function StockTable({ stock }: { stock: StockEntry[] }) {
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const uniqueTypes = [...new Set(stock.map(s => s.material_type).filter(Boolean))]

  const filtered = stock.filter(s => {
    const matchSearch = !search ||
      s.material_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.vendor_name?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || s.material_type === typeFilter
    return matchSearch && matchType
  })

  type CardData = {
    material_id     : string
    material_name   : string
    material_type   : string
    description     : string | null
    total_inscanned : number
    total_remaining : number
    vendors         : { vendor_name: string; remaining: number; received_at: string }[]
  }

  const cardMap = new Map<string, CardData>()
  filtered.forEach(s => {
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

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Current Stock
          </h2>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
          >
            {cards.length} materials
          </span>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl border p-4 flex flex-col sm:flex-row gap-3"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--text-dim)' }} />
          <Input
            placeholder="Search material or vendor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm border rounded-lg"
            style={inputStyle}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 text-sm border rounded-lg w-full sm:w-56" style={inputStyle}>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
            <SelectItem value="all" style={{ color: 'var(--text-primary)' }}>All Types</SelectItem>
            {uniqueTypes.map(t => (
              <SelectItem key={t} value={t} style={{ color: 'var(--text-primary)' }}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div
          className="rounded-2xl border py-20 text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
        >
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            No stock entries yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
            Inscan your first batch above ↑
          </p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(card => {
          const cfg     = TYPE_CONFIG[card.material_type] ?? DEFAULT_TYPE
          const isLow   = card.total_remaining > 0 && card.total_remaining <= 10
          const isEmpty = card.total_remaining === 0

          return (
            <div
              key={card.material_id}
              className="relative rounded-2xl border overflow-hidden transition-all duration-200 hover:scale-[1.02]"
              style={{
                background  : 'var(--bg-card)',
                borderColor : cfg.border,
                boxShadow   : cfg.glow,
              }}
            >
              {/* Top color strip */}
              <div
                className="h-1 w-full"
                style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }}
              />

              {/* Glow blob */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ background: cfg.color }}
              />

              <div className="p-5">
                {/* Type badge + low stock */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                  >
                    <span>{cfg.icon}</span>
                    {card.material_type}
                  </span>
                  {(isLow || isEmpty) && (
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: '#ff006e15', color: '#ff006e', border: '1px solid #ff006e33' }}
                    >
                      <TrendingDown className="w-3 h-3" />
                      {isEmpty ? 'OUT OF STOCK' : 'LOW'}
                    </span>
                  )}
                </div>

                {/* Name + description */}
                <h3
                  className="font-bold text-base leading-tight mb-1 truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {card.material_name}
                </h3>
                {card.description && (
                  <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-dim)' }}>
                    {card.description}
                  </p>
                )}

                {/* Big remaining count */}
                <div className="my-4">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ color: 'var(--text-secondary)' }}>
                    Remaining Stock
                  </p>
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

                  {/* Progress bar */}
                  <div
                    className="mt-3 h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border-dim)' }}
                  >
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

                {/* Vendor breakdown */}
                {card.vendors.length > 0 && (
                  <div
                    className="rounded-xl p-3 space-y-2"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-dim)' }}>
                      Vendor Batches
                    </p>
                    {card.vendors.map((v, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: cfg.color }}
                          />
                          <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                            {v.vendor_name}
                          </span>
                          {v.received_at && (
                            <span className="text-[10px] shrink-0" style={{ color: 'var(--text-dim)' }}>
                              · {format(new Date(v.received_at), 'dd MMM yy')}
                            </span>
                          )}
                        </div>
                        <span
                          className="text-xs font-bold shrink-0 ml-2"
                          style={{ color: v.remaining <= 0 ? '#ff006e' : cfg.color }}
                        >
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