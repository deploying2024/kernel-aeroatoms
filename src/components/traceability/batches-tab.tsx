'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus, Download, QrCode,
  ChevronDown, ChevronUp, Trash2, Pencil, Check, X,
} from 'lucide-react'
import type { Product, Batch, Unit } from './types'
import { createBatch, renameBatch } from '@/app/actions/traceability'
import { createClient } from '@/lib/supabase/client'


const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  created    : { label: 'Created',    color: '#6b7280', bg: '#6b728015' },
  qa_passed  : { label: 'QA Passed',  color: '#3b82f6', bg: '#3b82f615' },
  qa_failed  : { label: 'QA Failed',  color: '#ef4444', bg: '#ef444415' },
  shipped    : { label: 'Shipped',    color: '#10b981', bg: '#10b98115' },
  registered : { label: 'Registered', color: '#8b5cf6', bg: '#8b5cf615' },
  flagged    : { label: 'Flagged',    color: '#f59e0b', bg: '#f59e0b15' },
}

function statusCounts(units: Unit[]) {
  const counts: Record<string, number> = {}
  for (const u of units) counts[u.status] = (counts[u.status] ?? 0) + 1
  return counts
}

export default function BatchesTab({
  products,
  batches: initialBatches,
}: {
  products       : Product[]
  batches        : Batch[]
}) {
  const router        = useRouter()
  const [, start]     = useTransition()
  const [expanded, setExpanded] = useState<string | null>(null)

  // ── Create form ──
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [batchName, setBatchName] = useState('')
  const [qty,       setQty]       = useState('50')
  const [notes,     setNotes]     = useState('')
  const [creating,  setCreating]  = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const today = new Date().toISOString().split('T')[0]
  const [mfgDate, setMfgDate] = useState(today)

  // ── Rename state ──
  const [renamingId,  setRenamingId]  = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming,    setRenaming]    = useState(false)

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }


  const handleCreate = async () => {
    setCreateErr(null)
    if (!batchName.trim()) return setCreateErr('Batch name is required.')
    const qtyNum = Math.max(1, Math.min(500, parseInt(qty) || 0))
    if (!qtyNum)           return setCreateErr('Quantity must be between 1 and 500.')

    const product = products.find(p => p.id === productId)
    if (!product) return setCreateErr('Please select a product.')

    setCreating(true)

    const result = await createBatch(
      productId,
      product.name,
      batchName.trim(),
      qtyNum,
      notes.trim() || null,
      mfgDate,
    )

    if ('error' in result) {
      setCreateErr(result.error)
      return setCreating(false)
    }

    setBatchName(''); setNotes(''); setQty('50')
    setCreating(false)
    start(() => router.refresh())
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDownload = async (batchId: string, name: string) => {
    const res  = await fetch(`/api/traceability/labels/${batchId}`)
    if (!res.ok) return alert('Failed to generate PDF')
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `labels_${name}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRename = async (batchId: string) => {
    if (!renameValue.trim()) return
    setRenaming(true)
    const result = await renameBatch(batchId, renameValue)
    if ('error' in result) alert('Rename failed: ' + result.error)
    setRenamingId(null)
    setRenaming(false)
    start(() => router.refresh())
  }

  const handleDelete = async (batchId: string, batchName: string, hasShipped: boolean) => {
    if (hasShipped) {
      alert(`Cannot delete "${batchName}" — it has shipped units. Flag individual units in the Lookup tab instead.`)
      return
    }
    if (!confirm(`Delete batch "${batchName}" and all its serials? This cannot be undone.`)) return
    setDeletingId(batchId)
    const sb = createClient()
    await sb.from('product_units').delete().eq('batch_id', batchId)
    await sb.from('product_batches').delete().eq('id', batchId)
    setDeletingId(null)
    if (expanded === batchId) setExpanded(null)
    start(() => router.refresh())
  }

  return (
    <div className="space-y-6">

      {/* ── Create batch card ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)', boxShadow: '0 0 0 1px #3b82f615, 0 8px 32px #3b82f608' }}
      >
        <div
          className="flex items-center gap-3 px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-border)' }}>
            <Plus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Generate Serial Batch
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Creates HMAC-signed QR serials for a product
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Product</Label>
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full h-10 px-3 border rounded-lg text-sm"
                style={inputStyle}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Batch Name</Label>
              <Input
                placeholder="e.g. B2609-01"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                className="h-10 border rounded-lg text-sm"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Quantity (max 500)</Label>
              <Input
                type="number" min={1} max={500}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="h-10 border rounded-lg text-sm"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Notes — optional</Label>
              <Input
                placeholder="e.g. For export batch"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-10 border rounded-lg text-sm"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                PCB / Component Received On
              </Label>
              <Input
                type="date"
                value={mfgDate}
                max={today}
                onChange={e => setMfgDate(e.target.value)}
                className="h-10 border rounded-lg text-sm"
                style={inputStyle}
              />
              <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                This date is baked into every serial (e.g. 2609 = Sep 2026). Defaults to today.
              </p>
            </div>
          </div>

          {createErr && (
            <p className="px-3 py-2 rounded-lg text-sm"
              style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
              ⚠ {createErr}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {creating ? 'Generating…' : '+ Generate Serials'}
          </button>
        </div>
      </div>

      {/* ── Batch list ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Batches</h2>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
          >
            {initialBatches.length}
          </span>
        </div>

        {initialBatches.length === 0 ? (
          <div
            className="rounded-2xl border py-16 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
          >
            <QrCode className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'var(--text-primary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              No batches yet — generate your first one above
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialBatches.map(batch => {
              const counts   = statusCounts(batch.units)
              const shipped  = (counts.shipped ?? 0) + (counts.registered ?? 0)
              const qaPassed = counts.qa_passed ?? 0
              const pct      = batch.qty > 0 ? Math.round((shipped / batch.qty) * 100) : 0
              const isOpen   = expanded === batch.id

              return (
                <div
                  key={batch.id}
                  className="rounded-2xl border overflow-hidden"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
                >
                  {/* Card header */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {renamingId === batch.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRename(batch.id); if (e.key === 'Escape') setRenamingId(null) }}
                              className="px-2 py-1 rounded-lg border text-sm font-bold"
                              style={{ background: 'var(--bg-input)', borderColor: 'var(--accent-border)', color: 'var(--text-primary)', width: '160px' }}
                            />
                            <button onClick={() => handleRename(batch.id)} disabled={renaming}
                              className="w-6 h-6 rounded flex items-center justify-center"
                              style={{ background: '#10b98120', color: '#10b981' }}>
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setRenamingId(null)}
                              className="w-6 h-6 rounded flex items-center justify-center"
                              style={{ background: '#ef444420', color: '#ef4444' }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                              {batch.batch_name}
                            </p>
                            <button
                              onClick={() => { setRenamingId(batch.id); setRenameValue(batch.batch_name) }}
                              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-opacity"
                              style={{ color: 'var(--text-dim)' }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {batch.product_name} · {batch.qty} units ·{' '}
                          {new Date(batch.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {batch.notes && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{batch.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDownload(batch.id, batch.batch_name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                          style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                        >
                          <Download className="w-3 h-3" />
                          Labels PDF
                        </button>
                        <button
                          onClick={() => handleDelete(batch.id, batch.batch_name, shipped > 0)}
                          disabled={deletingId === batch.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-40"
                          style={{ borderColor: '#ef444430', color: '#ef4444', background: '#ef444408' }}
                          title="Delete batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpanded(isOpen ? null : batch.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center border"
                          style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                        >
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Status pill row */}
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(counts).map(([status, count]) => {
                        const s = STATUS[status] ?? STATUS.created
                        return (
                          <span
                            key={status}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: s.bg, color: s.color }}
                          >
                            {count} {s.label}
                          </span>
                        )
                      })}
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                          Shipped {shipped} / {batch.qty}
                        </p>
                        <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{pct}%</p>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-dim)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: 'var(--accent)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t" style={{ borderColor: 'var(--border-dim)' }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                              {['Serial', 'Status', 'Shipped To', 'Dispatch Date'].map((h, i) => (
                                <th key={i} className="px-4 py-2 text-left font-semibold uppercase tracking-wider"
                                  style={{ color: 'var(--text-dim)' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {batch.units.map(unit => {
                              const s = STATUS[unit.status] ?? STATUS.created
                              return (
                                <tr key={unit.serial} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                  <td className="px-4 py-2 font-mono" style={{ color: 'var(--text-primary)' }}>
                                    {unit.serial}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                      style={{ background: s.bg, color: s.color }}>
                                      {s.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                                    {unit.customer_name ?? '—'}
                                  </td>
                                  <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                                    {unit.shipped_at
                                      ? new Date(unit.shipped_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                      : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}