'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import {
  CalendarIcon, Plus, Gauge, TrendingUp,
  TrendingDown, Package, AlertTriangle,
  CheckCircle, XCircle, ChevronLeft,
  ChevronRight, Trash2, Award, Activity,
} from 'lucide-react'
import type { PcbBatch } from '@/lib/types'

const DEFECT_REASONS = [
  'Solder Joint Failure',
  'Component Failure',
  'PCB Trace Issue',
  'Short Circuit',
  'Open Circuit',
  'Wrong Component',
  'ESD Damage',
  'Mechanical Damage',
  'Firmware Issue',
  'Other',
]

const PAGE_SIZE = 10

export default function YieldRateClient({
  products,
  initialBatches,
}: {
  products      : { id: string; name: string }[]
  initialBatches: PcbBatch[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  /* ── form state ── */
  const [batchName,      setBatchName]      = useState('')
  const [selProduct,     setSelProduct]     = useState('')
  const [totalUnits,     setTotalUnits]     = useState('')
  const [workingUnits,   setWorkingUnits]   = useState('')
  const [defectReason,   setDefectReason]   = useState('')
  const [notes,          setNotes]          = useState('')
  const [mfgDate,        setMfgDate]        = useState<Date>(new Date())
  const [calOpen,        setCalOpen]        = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState(false)

  /* ── table state ── */
  const [page,           setPage]           = useState(1)
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null)
  const [deletingId,     setDeletingId]     = useState<string | null>(null)
  const [filterProduct,  setFilterProduct]  = useState('all')

  const defectUnits = useMemo(() => {
    const t = parseInt(totalUnits   || '0')
    const w = parseInt(workingUnits || '0')
    return isNaN(t) || isNaN(w) ? 0 : Math.max(0, t - w)
  }, [totalUnits, workingUnits])

  const yieldPreview = useMemo(() => {
    const t = parseInt(totalUnits   || '0')
    const w = parseInt(workingUnits || '0')
    if (!t || isNaN(t) || isNaN(w)) return null
    return ((w / t) * 100).toFixed(1)
  }, [totalUnits, workingUnits])

  /* ── analytics ── */
  const analytics = useMemo(() => {
    if (initialBatches.length === 0) return null
    const total    = initialBatches.reduce((s, b) => s + b.total_units,   0)
    const working  = initialBatches.reduce((s, b) => s + b.working_units, 0)
    const defects  = initialBatches.reduce((s, b) => s + b.defect_units,  0)
    const yieldPct = total > 0 ? (working / total) * 100 : 0
    const defectPct = total > 0 ? (defects / total) * 100 : 0

    const sorted    = [...initialBatches].sort((a, b) => {
      const yA = a.total_units > 0 ? a.working_units / a.total_units : 0
      const yB = b.total_units > 0 ? b.working_units / b.total_units : 0
      return yB - yA
    })
    const best  = sorted[0]
    const worst = sorted[sorted.length - 1]

    // Defect reasons breakdown
    const reasonMap: Record<string, number> = {}
    initialBatches.forEach(b => {
      if (b.defect_units > 0 && b.defect_reason) {
        reasonMap[b.defect_reason] = (reasonMap[b.defect_reason] ?? 0) + b.defect_units
      }
    })
    const topReasons = Object.entries(reasonMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return { total, working, defects, yieldPct, defectPct, best, worst, topReasons }
  }, [initialBatches])

  /* ── filtered + paginated ── */
  const filtered = useMemo(() =>
    initialBatches.filter(b =>
      filterProduct === 'all' || b.product_id === filterProduct
    ), [initialBatches, filterProduct])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* ── submit ── */
  const handleSubmit = async () => {
    setError(null); setSuccess(false)
    if (!batchName.trim())  return setError('Enter a batch name.')
    if (!selProduct)        return setError('Select a product.')
    if (!totalUnits || parseInt(totalUnits) <= 0)
      return setError('Enter total units manufactured.')
    const t = parseInt(totalUnits)
    const w = parseInt(workingUnits || '0')
    if (isNaN(w) || w < 0)   return setError('Working units must be 0 or more.')
    if (w > t)                return setError('Working units cannot exceed total units.')

    setSubmitting(true)
    const sb = createClient()
    const { error: err } = await sb.from('pcb_batches').insert({
      batch_name      : batchName.trim(),
      product_id      : selProduct,
      total_units     : t,
      working_units   : w,
      defect_reason   : defectReason || null,
      notes           : notes || null,
      manufactured_at : format(mfgDate, 'yyyy-MM-dd'),
    })

    if (err) {
      setError('Failed: ' + err.message)
      return setSubmitting(false)
    }

    setBatchName(''); setSelProduct(''); setTotalUnits('')
    setWorkingUnits(''); setDefectReason(''); setNotes('')
    setMfgDate(new Date())
    setSuccess(true); setSubmitting(false)
    startTransition(() => router.refresh())
    setTimeout(() => setSuccess(false), 3000)
  }

  /* ── delete ── */
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const sb = createClient()
    await sb.from('pcb_batches').delete().eq('id', id)
    setDeletingId(null)
    setConfirmDelete(null)
    startTransition(() => router.refresh())
  }

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  const yieldColor = (pct: number) =>
    pct >= 95 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444'

  const fmtPct = (n: number) => `${n.toFixed(1)}%`

  return (
    <div className="px-6 md:px-10 py-8 space-y-8">

      {/* ══ ANALYTICS ══ */}
      {analytics && (
        <div className="space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label : 'Overall Yield',
                value : fmtPct(analytics.yieldPct),
                sub   : `${analytics.working.toLocaleString()} / ${analytics.total.toLocaleString()} units`,
                icon  : Gauge,
                color : yieldColor(analytics.yieldPct),
              },
              {
                label : 'Defect Rate',
                value : fmtPct(analytics.defectPct),
                sub   : `${analytics.defects.toLocaleString()} defective units`,
                icon  : AlertTriangle,
                color : '#ef4444',
              },
              {
                label : 'Total Manufactured',
                value : analytics.total.toLocaleString(),
                sub   : `across ${initialBatches.length} batches`,
                icon  : Package,
                color : '#3b82f6',
              },
              {
                label : 'Total Working',
                value : analytics.working.toLocaleString(),
                sub   : 'passed QC',
                icon  : CheckCircle,
                color : '#10b981',
              },
            ].map(s => {
              const Icon = s.icon
              return (
                <div
                  key={s.label}
                  className="relative rounded-2xl border p-5 overflow-hidden transition-all hover:scale-[1.01]"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
                >
                  <div
                    className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-15 pointer-events-none"
                    style={{ background: s.color }}
                  />
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background : `${s.color}15`,
                        border     : `1px solid ${s.color}30`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--text-secondary)' }}>
                    {s.label}
                  </p>
                  <p className="text-2xl font-black tracking-tight"
                    style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                    {s.sub}
                  </p>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }}
                  />
                </div>
              )
            })}
          </div>

          {/* Best / Worst + Defect reasons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Best batch */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: 'var(--bg-card)', borderColor: '#10b98128' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4" style={{ color: '#10b981' }} />
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Best Batch
                </p>
              </div>
              {analytics.best && (
                <>
                  <p className="font-black text-xl" style={{ color: '#10b981' }}>
                    {fmtPct(analytics.best.total_units > 0
                      ? (analytics.best.working_units / analytics.best.total_units) * 100
                      : 0)}
                  </p>
                  <p className="font-semibold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
                    {analytics.best.batch_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {analytics.best.product_name} · {analytics.best.working_units}/{analytics.best.total_units} units
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {format(new Date(analytics.best.manufactured_at), 'dd MMM yyyy')}
                  </p>
                </>
              )}
            </div>

            {/* Worst batch */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: 'var(--bg-card)', borderColor: '#ef444428' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Worst Batch
                </p>
              </div>
              {analytics.worst && (
                <>
                  <p className="font-black text-xl" style={{ color: '#ef4444' }}>
                    {fmtPct(analytics.worst.total_units > 0
                      ? (analytics.worst.working_units / analytics.worst.total_units) * 100
                      : 0)}
                  </p>
                  <p className="font-semibold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
                    {analytics.worst.batch_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {analytics.worst.product_name} · {analytics.worst.working_units}/{analytics.worst.total_units} units
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {format(new Date(analytics.worst.manufactured_at), 'dd MMM yyyy')}
                  </p>
                </>
              )}
            </div>

            {/* Top defect reasons */}
            <div
              className="rounded-2xl border p-5"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4" style={{ color: '#f59e0b' }} />
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Top Defect Reasons
                </p>
              </div>
              {analytics.topReasons.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No defects recorded</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topReasons.map(([reason, count], i) => {
                    const maxCount = analytics.topReasons[0]?.[1] ?? 1
                    return (
                      <div key={reason}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs truncate max-w-[140px]"
                            style={{ color: 'var(--text-secondary)' }}>
                            {reason}
                          </span>
                          <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>
                            {count}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--border-dim)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width      : `${(count / maxCount) * 100}%`,
                              background : 'linear-gradient(90deg, #f59e0b, #ef4444)',
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
        </div>
      )}

      {/* ══ ADD BATCH FORM ══ */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background  : 'var(--bg-card)',
          borderColor : 'var(--accent-border)',
          boxShadow   : '0 4px 24px color-mix(in srgb, var(--accent) 5%, transparent)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-border)' }}
          >
            <Plus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Log New Batch
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Record a PCB manufacturing batch
            </p>
          </div>
          {yieldPreview !== null && (
            <div
              className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background  : `${yieldColor(parseFloat(yieldPreview))}15`,
                border      : `1px solid ${yieldColor(parseFloat(yieldPreview))}30`,
              }}
            >
              <Gauge className="w-3.5 h-3.5" style={{ color: yieldColor(parseFloat(yieldPreview)) }} />
              <span className="text-sm font-bold" style={{ color: yieldColor(parseFloat(yieldPreview)) }}>
                {yieldPreview}% yield
              </span>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">

            {/* Batch name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Batch Name / ID
              </Label>
              <Input
                placeholder="e.g. BATCH-2024-001"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                className="h-11 border rounded-lg text-sm"
                style={inputStyle}
              />
            </div>

            {/* Product */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Product
              </Label>
              <Select value={selProduct} onValueChange={setSelProduct}>
                <SelectTrigger className="h-11 border rounded-lg text-sm" style={inputStyle}>
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}
                      style={{ color: 'var(--text-primary)' }}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Manufactured Date
              </Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="flex items-center gap-2 w-full h-11 px-3 border rounded-lg text-sm"
                    style={inputStyle}
                  >
                    <CalendarIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                    {format(mfgDate, 'dd MMM yyyy')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                  <Calendar mode="single" selected={mfgDate}
                    onSelect={d => { if (d) { setMfgDate(d); setCalOpen(false) } }}
                    initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Total units */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Total Units Manufactured
              </Label>
              <Input
                type="number" min={1}
                placeholder="e.g. 100"
                value={totalUnits}
                onChange={e => setTotalUnits(e.target.value)}
                className="h-11 border rounded-lg text-sm"
                style={inputStyle}
              />
            </div>

            {/* Working units */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Working Units (Passed QC)
              </Label>
              <Input
                type="number" min={0}
                placeholder="e.g. 94"
                value={workingUnits}
                onChange={e => setWorkingUnits(e.target.value)}
                className="h-11 border rounded-lg text-sm"
                style={inputStyle}
              />
            </div>

            {/* Defect units — read only */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Defective Units
              </Label>
              <div
                className="flex items-center h-11 px-3 rounded-lg border text-sm font-bold"
                style={{
                  background  : defectUnits > 0 ? '#ef444410' : 'var(--bg-input)',
                  borderColor : defectUnits > 0 ? '#ef444430' : 'var(--border-dim)',
                  color       : defectUnits > 0 ? '#ef4444'   : 'var(--text-dim)',
                }}
              >
                {totalUnits ? `${defectUnits} units` : '—'}
              </div>
            </div>

            {/* Defect reason */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Defect Reason — optional
              </Label>
              <Select value={defectReason} onValueChange={setDefectReason}>
                <SelectTrigger className="h-11 border rounded-lg text-sm" style={inputStyle}>
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                  {DEFECT_REASONS.map(r => (
                    <SelectItem key={r} value={r} style={{ color: 'var(--text-primary)' }}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Notes — optional
              </Label>
              <Input
                placeholder="e.g. New solder paste used, temperature profile adjusted"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-11 border rounded-lg text-sm"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="mt-6 border-t" style={{ borderColor: 'var(--border-dim)' }} />

          {error && (
            <div className="mt-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
              ⚠ {error}
            </div>
          )}
          {success && (
            <div className="mt-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: '#10b98110', border: '1px solid #10b98128', color: '#10b981' }}>
              ✓ Batch logged successfully!
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {submitting ? 'Saving…' : '+ Log Batch'}
            </button>
            {(batchName || selProduct || totalUnits) && (
              <button
                onClick={() => {
                  setBatchName(''); setSelProduct(''); setTotalUnits('')
                  setWorkingUnits(''); setDefectReason(''); setNotes('')
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ BATCH HISTORY ══ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Batch History
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
            >
              {filtered.length}
            </span>
          </div>

          {/* Product filter */}
          <Select value={filterProduct} onValueChange={v => { setFilterProduct(v); setPage(1) }}>
            <SelectTrigger className="h-9 text-sm border rounded-lg w-48" style={inputStyle}>
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
              <SelectItem value="all" style={{ color: 'var(--text-primary)' }}>All Products</SelectItem>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id} style={{ color: 'var(--text-primary)' }}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  {['Date', 'Batch', 'Product', 'Total', 'Working', 'Defects', 'Yield', 'Defect Reason', ''].map((h, i) => (
                    <th
                      key={i}
                      className={`py-3 px-4 text-[10px] font-bold uppercase tracking-widest ${
                        i >= 3 && i <= 6 ? 'text-right' : 'text-left'
                      }`}
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-sm"
                      style={{ color: 'var(--text-dim)' }}>
                      No batches logged yet — log your first batch above ↑
                    </td>
                  </tr>
                ) : paginated.map(batch => {
                  const yPct  = batch.total_units > 0
                    ? (batch.working_units / batch.total_units) * 100
                    : 0
                  const color = yieldColor(yPct)
                  return (
                    <tr
                      key={batch.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid var(--border-dim)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm"
                        style={{ color: 'var(--text-secondary)' }}>
                        {format(new Date(batch.manufactured_at), 'dd MMM yyyy')}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {batch.batch_name}
                        </p>
                        {batch.notes && (
                          <p className="text-xs truncate max-w-[140px]" style={{ color: 'var(--text-dim)' }}>
                            {batch.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {batch.product_name}
                      </td>

                      <td className="px-4 py-4 text-right font-mono text-sm"
                        style={{ color: 'var(--text-primary)' }}>
                        {batch.total_units.toLocaleString()}
                      </td>

                      <td className="px-4 py-4 text-right font-mono text-sm"
                        style={{ color: '#10b981' }}>
                        {batch.working_units.toLocaleString()}
                      </td>

                      <td className="px-4 py-4 text-right font-mono text-sm"
                        style={{ color: batch.defect_units > 0 ? '#ef4444' : 'var(--text-dim)' }}>
                        {batch.defect_units > 0 ? batch.defect_units.toLocaleString() : '—'}
                      </td>

                      {/* Yield with ring */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'var(--border-dim)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${yPct}%`, background: color }}
                            />
                          </div>
                          <span className="font-bold text-sm w-14 text-right" style={{ color }}>
                            {fmtPct(yPct)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {batch.defect_reason ? (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ background: '#ef444410', color: '#ef4444', border: '1px solid #ef444428' }}
                          >
                            {batch.defect_reason}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-4">
                        {confirmDelete === batch.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(batch.id)}
                              disabled={deletingId === batch.id}
                              className="px-2 py-1 rounded text-xs font-semibold"
                              style={{ background: '#ef4444', color: '#fff' }}
                            >
                              {deletingId === batch.id ? '…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded text-xs border"
                              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(batch.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-all"
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
              Page {page} of {totalPages} · {filtered.length} batches
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1)
                    acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '...'
                  ? <span key={`e-${i}`} className="w-8 text-center text-sm"
                      style={{ color: 'var(--text-dim)' }}>…</span>
                  : <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className="w-8 h-8 rounded-lg text-sm font-medium border transition-all"
                      style={{
                        background  : page === p ? 'var(--accent)' : 'transparent',
                        borderColor : page === p ? 'var(--accent)' : 'var(--border-dim)',
                        color       : page === p ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {p}
                    </button>
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}