'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Layers, TrendingDown, Pencil, Trash2, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { format, parseISO } from 'date-fns'
import type { StockEntry } from '@/lib/types'
import CreatableCombobox from '@/components/creatable-combobox'

const TYPE_CONFIG: Record<string, {
  color : string
  bg    : string
  border: string
  glow  : string
  icon  : string
}> = {
  'IC / Microcontroller' : { color: '#3b82f6', bg: '#3b82f610', border: '#3b82f628', glow: '0 4px 24px #3b82f618', icon: '⚙️' },
  'Passive Component'    : { color: '#8b5cf6', bg: '#8b5cf610', border: '#8b5cf628', glow: '0 4px 24px #8b5cf618', icon: '〰️' },
  'Sensor / Module'      : { color: '#10b981', bg: '#10b98110', border: '#10b98128', glow: '0 4px 24px #10b98118', icon: '📡' },
  'Connector / Cable'    : { color: '#f59e0b', bg: '#f59e0b10', border: '#f59e0b28', glow: '0 4px 24px #f59e0b18', icon: '🔌' },
  'Other'                : { color: '#6b7280', bg: '#6b728010', border: '#6b728028', glow: 'none',                 icon: '📦' },
}
const DEFAULT_TYPE = TYPE_CONFIG['Other']

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style                : 'currency',
    currency             : 'USD',
    maximumFractionDigits: 2,
  }).format(n)

type EditState = {
  entry_id    : string
  quantity    : string
  vendor_id   : string
  received_at : Date
  notes       : string
}

export default function StockTable({
  stock = [],
  vendors = [],
}: {
  stock  ?: StockEntry[]
  vendors?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [editing,    setEditing]    = useState<EditState | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [calOpen,    setCalOpen]    = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const [allVendors, setAllVendors] = useState(
    (vendors ?? []).map(v => ({ id: v.id, label: v.name }))
  )

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
    entries         : StockEntry[]
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
        entries         : [],
      })
    }
    const card = cardMap.get(s.material_id)!
    card.total_inscanned += s.inscanned  ?? 0
    card.total_remaining += s.remaining ?? 0
    card.entries.push(s)
  })

  const cards = Array.from(cardMap.values())

  const handleEdit = (s: StockEntry) => {
    setEditing({
      entry_id    : s.entry_id,
      quantity    : String(s.inscanned),
      vendor_id   : s.vendor_id,
      received_at : s.received_at ? parseISO(s.received_at) : new Date(),
      notes       : s.notes ?? '',
    })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    const sb = createClient()
    await sb.from('stock_entries').update({
      quantity    : parseInt(editing.quantity),
      vendor_id   : editing.vendor_id,
      received_at : format(editing.received_at, 'yyyy-MM-dd'),
      notes       : editing.notes || null,
    }).eq('id', editing.entry_id)
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  const handleDelete = async (entryId: string) => {
    setDeleting(true)
    const sb = createClient()
    await sb.from('stock_outscans').delete().eq('stock_entry_id', entryId)
    await sb.from('stock_entries').delete().eq('id', entryId)
    setDeleting(false)
    setConfirmDel(null)
    router.refresh()
  }

  const handleCreateVendor = async (name: string) => {
    const sb = createClient()
    const { data } = await sb.from('vendors').insert({ name }).select().single()
    if (!data) return null
    const opt = { id: data.id, label: data.name }
    setAllVendors(p => [...p, opt])
    return opt
  }

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <>
      {/* Edit Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}
        >
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-fade-up"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Edit Inscan Entry
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  #{editing.entry_id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>Quantity</Label>
                <Input
                  type="number" min={1}
                  value={editing.quantity}
                  onChange={e => setEditing(p => p && ({ ...p, quantity: e.target.value }))}
                  className="h-11 border rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>

              {/* Vendor */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>Vendor</Label>
                <CreatableCombobox
                  options={allVendors}
                  value={editing.vendor_id}
                  onChange={v => setEditing(p => p && ({ ...p, vendor_id: v }))}
                  placeholder="Select vendor…"
                  createLabel="Create vendor"
                  onCreate={handleCreateVendor}
                />
              </div>

              {/* Received date */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>Received Date</Label>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 w-full h-11 px-3 border rounded-lg text-sm"
                      style={inputStyle}>
                      {format(editing.received_at, 'dd MMM yyyy')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                    <Calendar mode="single" selected={editing.received_at}
                      onSelect={d => { if (d) { setEditing(p => p && ({ ...p, received_at: d })); setCalOpen(false) } }}
                      initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>Notes</Label>
                <Input
                  placeholder="e.g. Batch A, invoice #1234"
                  value={editing.notes}
                  onChange={e => setEditing(p => p && ({ ...p, notes: e.target.value }))}
                  className="h-11 border rounded-lg text-sm"
                  style={inputStyle}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t"
                style={{ borderColor: 'var(--border-dim)' }}>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(null)}
                  className="px-4 py-2.5 rounded-lg text-sm border"
                  style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Current Stock
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              {cards.length} materials
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border p-4 flex flex-col sm:flex-row gap-3"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: 'var(--text-dim)' }} />
            <Input placeholder="Search material or vendor…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm border rounded-lg" style={inputStyle} />
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
          <div className="rounded-2xl border py-20 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-primary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              No stock entries yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              Inscan your first batch above ↑
            </p>
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map(card => {
            const cfg     = TYPE_CONFIG[card.material_type] ?? DEFAULT_TYPE
            const isLow   = card.total_remaining > 0 && card.total_remaining <= 10
            const isEmpty = card.total_remaining === 0

            return (
              <div key={card.material_id}
                className="relative rounded-2xl border overflow-hidden"
                style={{ background: 'var(--bg-card)', borderColor: cfg.border, boxShadow: cfg.glow }}>

                <div className="h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                  style={{ background: cfg.color }} />

                <div className="p-5">
                  {/* Type + low stock */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {cfg.icon} {card.material_type}
                    </span>
                    {(isLow || isEmpty) && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                        style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430' }}>
                        <TrendingDown className="w-3 h-3" />
                        {isEmpty ? 'OUT OF STOCK' : 'LOW'}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="font-bold text-base leading-tight mb-1 truncate"
                    style={{ color: 'var(--text-primary)' }}>
                    {card.material_name}
                  </h3>
                  {card.description && (
                    <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-dim)' }}>
                      {card.description}
                    </p>
                  )}

                  {/* Big remaining */}
                  <div className="my-4">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--text-secondary)' }}>Remaining Stock</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black tracking-tight leading-none"
                        style={{ color: isEmpty ? '#ef4444' : isLow ? '#f59e0b' : cfg.color }}>
                        {card.total_remaining.toLocaleString()}
                      </span>
                      <span className="text-sm mb-1" style={{ color: 'var(--text-dim)' }}>
                        / {card.total_inscanned.toLocaleString()} total
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--border-dim)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width      : `${card.total_inscanned > 0 ? Math.min((card.total_remaining / card.total_inscanned) * 100, 100) : 0}%`,
                          background : isEmpty ? '#ef4444' : isLow ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : `linear-gradient(90deg,${cfg.color},${cfg.color}88)`,
                        }} />
                    </div>
                  </div>

                  {/* Vendor batches with edit/delete */}
                  {card.entries.length > 0 && (
                    <div className="rounded-xl p-3 space-y-2"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-dim)' }}>Vendor Batches</p>
                      {card.entries.map(entry => (
                        <div key={entry.entry_id}
                          className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: cfg.color }} />
                            <div className="min-w-0">
                              <span className="text-xs truncate block"
                                style={{ color: 'var(--text-secondary)' }}>
                                {entry.vendor_name}
                              </span>
                              {entry.received_at && (
                                <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                                  {format(new Date(entry.received_at), 'dd MMM yy')}
                                  {entry.notes && ` · ${entry.notes}`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-bold"
                              style={{ color: entry.remaining <= 0 ? '#ef4444' : cfg.color }}>
                              {entry.remaining.toLocaleString()} left
                            </span>
                            {/* Edit */}
                            <button
                              onClick={() => handleEdit(entry)}
                              className="w-6 h-6 rounded-md flex items-center justify-center border transition-all"
                              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-dim)' }}
                              onMouseEnter={e => {
                                ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                              }}
                              onMouseLeave={e => {
                                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'
                                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {/* Delete */}
                            {confirmDel === entry.entry_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(entry.entry_id)}
                                  disabled={deleting}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                  style={{ background: '#ef4444', color: '#fff' }}>
                                  {deleting ? '…' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => setConfirmDel(null)}
                                  className="px-1.5 py-0.5 rounded text-[10px] border"
                                  style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDel(entry.entry_id)}
                                className="w-6 h-6 rounded-md flex items-center justify-center border transition-all"
                                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-dim)' }}
                                onMouseEnter={e => {
                                  ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
                                  ;(e.currentTarget as HTMLElement).style.borderColor = '#ef444430'
                                }}
                                onMouseLeave={e => {
                                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'
                                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
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
    </>
  )
}