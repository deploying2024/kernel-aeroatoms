'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import {
  PackagePlus, ChevronLeft, ChevronRight,
  Search, Pencil, Trash2, X, Check, CalendarIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import CreatableCombobox from '@/components/creatable-combobox'

type InscanLogEntry = {
  id           : string
  material_id  : string
  material_name: string
  material_type: string
  vendor_name  : string
  quantity     : number
  unit_cost    : number | null
  notes        : string | null
  received_at  : string
  created_at   : string
}

type EditState = {
  id          : string
  quantity    : string
  unit_cost   : string
  notes       : string
  vendor_id   : string
  received_at : Date
}

const PAGE_SIZE = 10

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style                : 'currency',
    currency             : 'USD',
    maximumFractionDigits: 2,
  }).format(n)

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  'IC / Microcontroller' : { color: '#3b82f6', bg: '#3b82f610' },
  'Passive Component'    : { color: '#8b5cf6', bg: '#8b5cf610' },
  'Sensor / Module'      : { color: '#10b981', bg: '#10b98110' },
  'Connector / Cable'    : { color: '#f59e0b', bg: '#f59e0b10' },
  'Other'                : { color: '#6b7280', bg: '#6b728010' },
}
const DEFAULT_COLOR = { color: '#6b7280', bg: '#6b728010' }

export default function InscanLog({
  logs    = [],
  vendors = [],
}: {
  logs    ?: InscanLogEntry[]
  vendors ?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [page,       setPage]       = useState(1)
  const [search,     setSearch]     = useState('')
  const [editing,    setEditing]    = useState<EditState | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [calOpen,    setCalOpen]    = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const [allVendors, setAllVendors] = useState(
    (vendors ?? []).map(v => ({ id: v.id, label: v.name }))
  )

  const filtered = logs.filter(l =>
    !search ||
    l.material_name.toLowerCase().includes(search.toLowerCase()) ||
    l.vendor_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const getVendorId = (vendorName: string) =>
    allVendors.find(v => v.label === vendorName)?.id ?? ''

  const handleEdit = (log: InscanLogEntry) => {
    setEditing({
      id          : log.id,
      quantity    : String(log.quantity),
      unit_cost   : log.unit_cost ? String(log.unit_cost) : '',
      notes       : log.notes ?? '',
      vendor_id   : getVendorId(log.vendor_name),
      received_at : log.received_at ? parseISO(log.received_at) : new Date(),
    })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    const sb = createClient()
    await sb.from('stock_entries').update({
      quantity    : parseInt(editing.quantity),
      unit_cost   : editing.unit_cost ? parseFloat(editing.unit_cost) : null,
      notes       : editing.notes || null,
      vendor_id   : editing.vendor_id || null,
      received_at : format(editing.received_at, 'yyyy-MM-dd'),
    }).eq('id', editing.id)
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const sb = createClient()
    await sb.from('stock_outscans').delete().eq('stock_entry_id', id)
    await sb.from('stock_entries').delete().eq('id', id)
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
      {/* ── Edit Modal ── */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}
        >
<div
  className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-fade-up max-h-[90vh] overflow-y-auto"
  style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}
>
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Edit Inscan Entry
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  #{editing.id.slice(0, 8).toUpperCase()}
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

              {/* Unit cost */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>Unit Cost (USD) — optional</Label>
                <Input
                  type="number" min={0} placeholder="e.g. 1.85"
                  value={editing.unit_cost}
                  onChange={e => setEditing(p => p && ({ ...p, unit_cost: e.target.value }))}
                  className="h-11 border rounded-lg text-sm"
                  style={inputStyle}
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
                      <CalendarIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      {format(editing.received_at, 'dd MMM yyyy')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                    <Calendar mode="single" selected={editing.received_at}
                      onSelect={d => {
                        if (d) { setEditing(p => p && ({ ...p, received_at: d })); setCalOpen(false) }
                      }}
                      initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>Notes — optional</Label>
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

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Inscan Log
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              {filtered.length} entries
            </span>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: 'var(--text-dim)' }} />
            <Input
              placeholder="Search material or vendor…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 h-9 text-sm border rounded-lg"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  {['Date Received', 'Material', 'Type', 'Vendor', 'Quantity', 'Unit Cost', 'Notes', ''].map((h, i) => (
                    <th key={i}
                      className={`py-3 px-5 text-[10px] font-bold uppercase tracking-widest ${
                        i >= 4 && i <= 6 ? 'text-right' : 'text-left'
                      }`}
                      style={{ color: 'var(--text-dim)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16" style={{ color: 'var(--text-dim)' }}>
                      <PackagePlus className="w-8 h-8 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No inscan logs yet</p>
                    </td>
                  </tr>
                ) : paginated.map(log => {
                  const cfg = TYPE_COLORS[log.material_type] ?? DEFAULT_COLOR
                  return (
                    <tr key={log.id} className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border-dim)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

                      <td className="px-5 py-3.5 whitespace-nowrap text-sm"
                        style={{ color: 'var(--text-secondary)' }}>
                        {log.received_at ? format(new Date(log.received_at), 'dd MMM yyyy') : '—'}
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {log.material_name}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {log.material_type}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {log.vendor_name}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-sm"
                        style={{ color: 'var(--accent)' }}>
                        +{log.quantity.toLocaleString()}
                      </td>

                      <td className="px-5 py-3.5 text-right text-sm"
                        style={{ color: 'var(--text-secondary)' }}>
                        {log.unit_cost ? fmtUSD(log.unit_cost) : '—'}
                      </td>

                      <td className="px-5 py-3.5 text-right text-sm"
                        style={{ color: 'var(--text-dim)' }}>
                        {log.notes ?? '—'}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => handleEdit(log)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-all"
                            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-dim)' }}
                            onMouseEnter={e => {
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                            }}
                            onMouseLeave={e => {
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                            }}>
                            <Pencil className="w-3 h-3" />
                          </button>

                          {confirmDel === log.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(log.id)} disabled={deleting}
                                className="px-2 py-1 rounded text-xs font-semibold"
                                style={{ background: '#ef4444', color: '#fff' }}>
                                {deleting ? '…' : 'Yes'}
                              </button>
                              <button onClick={() => setConfirmDel(null)}
                                className="px-2 py-1 rounded text-xs border"
                                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDel(log.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border transition-all"
                              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-dim)' }}
                              onMouseEnter={e => {
                                ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
                                ;(e.currentTarget as HTMLElement).style.borderColor = '#ef444430'
                              }}
                              onMouseLeave={e => {
                                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'
                                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                              }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Page {safePage} of {totalPages} · {filtered.length} entries
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1)
                    acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '...'
                  ? <span key={`e-${i}`} className="w-8 text-center text-sm"
                      style={{ color: 'var(--text-dim)' }}>…</span>
                  : <button key={p} onClick={() => setPage(p as number)}
                      className="w-8 h-8 rounded-lg text-sm font-medium border"
                      style={{
                        background  : safePage === p ? 'var(--accent)' : 'transparent',
                        borderColor : safePage === p ? 'var(--accent)' : 'var(--border-dim)',
                        color       : safePage === p ? '#fff' : 'var(--text-secondary)',
                      }}>
                      {p}
                    </button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}