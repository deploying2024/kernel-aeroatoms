'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import {
  ClipboardList, ChevronLeft, ChevronRight,
  PackageMinus, Pencil, Trash2, X, Check, CalendarIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { OutscanLog as OutscanLogType } from '@/lib/types'

const PAGE_SIZE = 10

type EditState = {
  id            : string
  quantity_taken: string
  reason        : string
  taken_at      : Date
}

export default function OutscanLog({ logs = [] }: { logs?: OutscanLogType[] }) {
  const router = useRouter()
  const [page,       setPage]       = useState(1)
  const [editing,    setEditing]    = useState<EditState | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [calOpen,    setCalOpen]    = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE))
  const paginated  = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleEdit = (log: OutscanLogType) => {
    setEditing({
      id            : log.id,
      quantity_taken: String(log.quantity_taken),
      reason        : log.reason ?? '',
      taken_at      : log.taken_at ? parseISO(log.taken_at) : new Date(),
    })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    const sb = createClient()
    await sb.from('stock_outscans').update({
      quantity_taken : parseInt(editing.quantity_taken),
      reason         : editing.reason || null,
      taken_at       : format(editing.taken_at, 'yyyy-MM-dd'),
    }).eq('id', editing.id)
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const sb = createClient()
    await sb.from('stock_outscans').delete().eq('id', id)
    setDeleting(false)
    setConfirmDel(null)
    router.refresh()
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
            className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-fade-up"
            style={{ background: 'var(--bg-card)', borderColor: '#ef444430' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-dim)', background: '#ef444408' }}>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Edit Outscan Log
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
                  style={{ color: 'var(--text-secondary)' }}>Quantity Taken</Label>
                <Input type="number" min={1}
                  value={editing.quantity_taken}
                  onChange={e => setEditing(p => p && ({ ...p, quantity_taken: e.target.value }))}
                  className="h-11 border rounded-lg text-sm" style={inputStyle} />
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>Reason</Label>
                <Input placeholder="e.g. Production batch #3"
                  value={editing.reason}
                  onChange={e => setEditing(p => p && ({ ...p, reason: e.target.value }))}
                  className="h-11 border rounded-lg text-sm" style={inputStyle} />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>Date Taken</Label>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 w-full h-11 px-3 border rounded-lg text-sm"
                      style={inputStyle}>
                      <CalendarIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                      {format(editing.taken_at, 'dd MMM yyyy')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                    <Calendar mode="single" selected={editing.taken_at}
                      onSelect={d => { if (d) { setEditing(p => p && ({ ...p, taken_at: d })); setCalOpen(false) } }}
                      initialFocus />
                  </PopoverContent>
                </Popover>
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
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Outscan Log
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: '#ef444412', color: '#ef4444', border: '1px solid #ef444430' }}>
            {logs.length} entries
          </span>
        </div>

        <div className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  {['Date', 'Material', 'Vendor / Batch', 'Qty Taken', 'Reason', ''].map((h, i) => (
                    <th key={i}
                      className={`py-3 px-5 text-[10px] font-bold uppercase tracking-widest ${i === 3 ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-dim)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16" style={{ color: 'var(--text-dim)' }}>
                      <PackageMinus className="w-8 h-8 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No outscan logs yet</p>
                    </td>
                  </tr>
                ) : paginated.map(log => (
                  <tr key={log.id} className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-dim)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

                    <td className="px-5 py-3.5 whitespace-nowrap text-sm"
                      style={{ color: 'var(--text-secondary)' }}>
                      {log.taken_at ? format(new Date(log.taken_at), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {log.material_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {log.vendor_name}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-sm" style={{ color: '#ef4444' }}>
                        −{log.quantity_taken.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {log.reason ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-sm font-medium border"
                  style={{
                    background  : page === p ? '#ef4444' : 'transparent',
                    borderColor : page === p ? '#ef4444' : 'var(--border-dim)',
                    color       : page === p ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
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