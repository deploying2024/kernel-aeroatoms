'use client'

import { useState } from 'react'
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
import { CalendarIcon, PackageMinus, Hash, FileText } from 'lucide-react'
import type { StockEntry, Material } from '@/lib/types'

export default function OutscanSection({
  stock,
  materials,
}: {
  stock     : StockEntry[]
  materials : Material[]
}) {
  const router = useRouter()

  const [selMaterial,    setSelMaterial]    = useState('')
  const [selEntry,       setSelEntry]       = useState('')
  const [quantity,       setQuantity]       = useState('')
  const [reason,         setReason]         = useState('')
  const [takenAt,        setTakenAt]        = useState<Date>(new Date())
  const [calOpen,        setCalOpen]        = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState(false)

  // Unique materials that have stock entries
  const uniqueMaterials = [...new Map(
    stock.filter(s => s.remaining > 0).map(s => [s.material_id, { id: s.material_id, name: s.material_name }])
  ).values()]

  // Entries for selected material
  const entriesForMaterial = stock.filter(
    s => s.material_id === selMaterial && s.remaining > 0
  )

  const selectedEntry = stock.find(s => s.entry_id === selEntry)
  const maxQty = selectedEntry?.remaining ?? 0

  const handleMaterialChange = (id: string) => {
    setSelMaterial(id)
    setSelEntry('')
    setQuantity('')
  }

  const handleSubmit = async () => {
    setError(null); setSuccess(false)
    if (!selMaterial)  return setError('Please select a material.')
    if (!selEntry)     return setError('Please select a vendor / batch entry.')
    if (!quantity || parseInt(quantity) <= 0) return setError('Enter a valid quantity.')
    if (parseInt(quantity) > maxQty)
      return setError(`Only ${maxQty} units remaining in this batch.`)

    setSubmitting(true)
    const sb = createClient()
    const { error: err } = await sb.from('stock_outscans').insert({
      material_id    : selMaterial,
      stock_entry_id : selEntry,
      quantity_taken : parseInt(quantity),
      reason         : reason || null,
      taken_at       : format(takenAt, 'yyyy-MM-dd'),
    })

    if (err) {
      setError('Failed: ' + err.message)
      return setSubmitting(false)
    }

    setSelMaterial(''); setSelEntry(''); setQuantity(''); setReason('')
    setTakenAt(new Date())
    setSuccess(true); setSubmitting(false)
    router.refresh()
    setTimeout(() => setSuccess(false), 3000)
  }

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'var(--neon-pink)33', background: 'var(--bg-card)', boxShadow: '0 0 40px #ff006e08' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-dim)', background: '#ff006e08' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: '#ff006e22', border: '1px solid #ff006e33' }}>
          <PackageMinus className="w-4 h-4" style={{ color: 'var(--neon-pink)' }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Outscan Stock</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Log units taken from inventory
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">

          {/* Material */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Material</Label>
            <Select value={selMaterial} onValueChange={handleMaterialChange}>
              <SelectTrigger className="h-11 border rounded-lg text-sm" style={inputStyle}>
                <SelectValue placeholder="Select material…" />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                {uniqueMaterials.map(m => (
                  <SelectItem key={m.id} value={m.id} style={{ color: 'var(--text-primary)' }}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor / Batch entry */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Vendor / Batch</Label>
            <Select value={selEntry} onValueChange={setSelEntry} disabled={!selMaterial}>
              <SelectTrigger className="h-11 border rounded-lg text-sm" style={inputStyle}>
                <SelectValue placeholder={selMaterial ? 'Select batch…' : 'Select material first'} />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                {entriesForMaterial.map(e => (
                  <SelectItem key={e.entry_id} value={e.entry_id}
                    style={{ color: 'var(--text-primary)' }}>
                    {e.vendor_name} — {e.remaining} remaining
                    {e.received_at ? ` (${format(new Date(e.received_at), 'dd MMM yy')})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEntry && (
              <p className="text-xs" style={{ color: 'var(--neon-green)' }}>
                {selectedEntry.remaining} units available in this batch
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              <Hash className="w-3 h-3" /> Quantity to Take
            </Label>
            <Input type="number" min={1} max={maxQty}
              placeholder={maxQty > 0 ? `Max ${maxQty}` : 'Select batch first'}
              value={quantity} onChange={e => setQuantity(e.target.value)}
              disabled={!selEntry}
              className="h-11 border rounded-lg text-sm" style={inputStyle} />
          </div>

          {/* Reason */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              <FileText className="w-3 h-3" /> Reason — optional
            </Label>
            <Input placeholder="e.g. Production batch #3, Prototype build"
              value={reason} onChange={e => setReason(e.target.value)}
              className="h-11 border rounded-lg text-sm" style={inputStyle} />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              <CalendarIcon className="w-3 h-3" /> Date Taken
            </Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 w-full h-11 px-3 border rounded-lg text-sm"
                  style={inputStyle}>
                  <CalendarIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  {format(takenAt, 'dd MMM yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <Calendar mode="single" selected={takenAt}
                  onSelect={d => { if (d) { setTakenAt(d); setCalOpen(false) } }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="mt-6 border-t" style={{ borderColor: 'var(--border-dim)' }} />

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg text-sm"
            style={{ background: '#ff006e10', border: '1px solid #ff006e33', color: '#ff006e' }}>
            ⚠ {error}
          </div>
        )}
        {success && (
          <div className="mt-4 px-4 py-3 rounded-lg text-sm"
            style={{ background: 'color-mix(in srgb, var(--neon-green) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--neon-green) 25%, transparent)', color: 'var(--neon-green)' }}>
            ✓ Outscan logged successfully!
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--neon-pink)', color: '#fff' }}>
            {submitting ? 'Logging…' : '− Outscan Stock'}
          </button>
          {(selMaterial || quantity) && (
            <button onClick={() => { setSelMaterial(''); setSelEntry(''); setQuantity(''); setReason('') }}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}