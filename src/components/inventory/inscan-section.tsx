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
import {
  CalendarIcon, PackagePlus, Hash,
  DollarSign, FileText, X, Check,
} from 'lucide-react'
import CreatableCombobox from '@/components/creatable-combobox'
import type { Vendor, Material } from '@/lib/types'

const MATERIAL_TYPES = [
  'IC / Microcontroller',
  'Passive Component',
  'Sensor / Module',
  'Connector / Cable',
  'Other',
]

// Mini modal that appears when user wants to create a new material
function CreateMaterialModal({
  name,
  onConfirm,
  onCancel,
}: {
  name     : string
  onConfirm: (type: string, description: string) => Promise<void>
  onCancel : () => void
}) {
  const [type,        setType]        = useState('')
  const [description, setDescription] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [err,         setErr]         = useState('')

  const handleConfirm = async () => {
    if (!type) return setErr('Please select a component type.')
    setSaving(true)
    await onConfirm(type, description)
    setSaving(false)
  }

  const TYPE_OPTIONS = [
    { value: 'IC / Microcontroller', icon: '⚙️', desc: 'STM32, ESP32, MCUs, FPGAs' },
    { value: 'Passive Component',    icon: '〰️', desc: 'Resistors, Capacitors, Inductors' },
    { value: 'Sensor / Module',      icon: '📡', desc: 'GNSS, IMU, Barometer, Camera' },
    { value: 'Connector / Cable',    icon: '🔌', desc: 'JST, USB, FPC, Pin headers' },
    { value: 'Other',                icon: '📦', desc: 'Anything else' },
  ]

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style                : 'currency',
    currency             : 'USD',
    maximumFractionDigits: 2,
  }).format(n)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-fade-up"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}
      >
        {/* Header */}
        <div
          className="relative px-6 pt-6 pb-5 border-b overflow-hidden"
          style={{ borderColor: 'var(--border-dim)' }}
        >
          {/* Glow blob */}
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: 'var(--accent)' }}
          />

          <div className="flex items-start justify-between relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                  style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
                >
                  🧩
                </div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  New Material
                </p>
              </div>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono mt-1"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
              >
                <span style={{ color: 'var(--text-dim)' }}>name:</span> {name}
              </div>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all mt-1"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--neon-pink)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--neon-pink)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Type selector — visual cards */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}>
              Component Type <span style={{ color: 'var(--neon-pink)' }}>*</span>
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {TYPE_OPTIONS.map(opt => {
                const isSelected = type === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setType(opt.value); setErr('') }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all duration-150"
                    style={{
                      background  : isSelected ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                      borderColor : isSelected ? 'var(--accent)' : 'var(--border-dim)',
                      transform   : isSelected ? 'scale(1.01)' : 'scale(1)',
                    }}
                  >
                    <span className="text-xl w-7 text-center shrink-0">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold"
                        style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {opt.value}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {opt.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'var(--accent)' }}
                      >
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Part number / description */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}>
              Part No. / Description
              <span className="ml-1 normal-case font-normal" style={{ color: 'var(--text-dim)' }}>
                — optional
              </span>
            </Label>
            <Input
              placeholder="e.g. STM32F103C8T6, 0402 10kΩ 1%, u-blox M8"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              className="h-11 border rounded-lg text-sm"
              style={inputStyle}
            />
          </div>

          {err && (
            <p className="text-xs px-3 py-2.5 rounded-lg"
              style={{ background: '#ff006e10', border: '1px solid #ff006e33', color: '#ff006e' }}>
              ⚠ {err}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={saving || !type}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
              style={{ background: 'var(--accent)', color: '#000' }}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Material
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              className="px-5 py-3 rounded-xl text-sm font-medium border transition-all"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InscanSection({
  vendors   : initialVendors,
  materials : initialMaterials,
}: {
  vendors   : Vendor[]
  materials : Material[]
}) {
  const router = useRouter()

  const [allVendors,   setAllVendors]   = useState(initialVendors.map(v => ({ id: v.id, label: v.name })))
  const [allMaterials, setAllMaterials] = useState(initialMaterials.map(m => ({ id: m.id, label: m.name })))
  const [materialTypeMap, setMaterialTypeMap] = useState<Record<string, string>>(
    Object.fromEntries(initialMaterials.map(m => [m.id, m.type]))
  )

  // Modal state for creating new material
  const [pendingMaterialName, setPendingMaterialName] = useState<string | null>(null)
  const [pendingResolve,      setPendingResolve]      = useState<((opt: { id: string; label: string } | null) => void) | null>(null)

  // Form state
  const [selMaterial,  setSelMaterial]  = useState('')
  const [materialType, setMaterialType] = useState('')
  const [selVendor,    setSelVendor]    = useState('')
  const [quantity,     setQuantity]     = useState('')
  const [unitCost,     setUnitCost]     = useState('')
  const [notes,        setNotes]        = useState('')
  const [receivedAt,   setReceivedAt]   = useState<Date>(new Date())
  const [calOpen,      setCalOpen]      = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState(false)

  /* ── when user selects existing material, auto-fill type ── */
  const handleMaterialChange = (id: string) => {
    setSelMaterial(id)
    const type = materialTypeMap[id]
    if (type) setMaterialType(type)
  }

  /* ── vendor create ── */
  const handleCreateVendor = async (name: string) => {
    const sb = createClient()
    const { data } = await sb.from('vendors').insert({ name }).select().single()
    if (!data) return null
    const opt = { id: data.id, label: data.name }
    setAllVendors(p => [...p, opt])
    return opt
  }

  /* ── material create — opens modal, waits for user to fill type ── */
  const handleCreateMaterial = (name: string): Promise<{ id: string; label: string } | null> => {
    return new Promise(resolve => {
      setPendingMaterialName(name)
      setPendingResolve(() => resolve)
    })
  }

  /* ── called when user confirms the modal ── */
  const handleModalConfirm = async (type: string, description: string) => {
    if (!pendingMaterialName || !pendingResolve) return
    const sb = createClient()
    const { data } = await sb.from('materials').insert({
      name        : pendingMaterialName,
      type,
      description : description || null,
    }).select().single()

    if (!data) {
      pendingResolve(null)
    } else {
      const opt = { id: data.id, label: data.name }
      setAllMaterials(p => [...p, opt])
      setMaterialTypeMap(p => ({ ...p, [data.id]: type }))
      setMaterialType(type)
      pendingResolve(opt)
    }

    setPendingMaterialName(null)
    setPendingResolve(null)
  }

  const handleModalCancel = () => {
    pendingResolve?.(null)
    setPendingMaterialName(null)
    setPendingResolve(null)
  }

  /* ── submit inscan ── */
  const handleSubmit = async () => {
    setError(null); setSuccess(false)
    if (!selMaterial) return setError('Please select or create a material.')
    if (!selVendor)   return setError('Please select or create a vendor.')
    if (!quantity || parseInt(quantity) <= 0) return setError('Enter a valid quantity.')

    setSubmitting(true)
    const sb = createClient()
    const { error: err } = await sb.from('stock_entries').insert({
      material_id : selMaterial,
      vendor_id   : selVendor,
      quantity    : parseInt(quantity),
      unit_cost   : unitCost ? parseFloat(unitCost) : null,
      notes       : notes || null,
      received_at : format(receivedAt, 'yyyy-MM-dd'),
    })

    if (err) {
      setError('Failed: ' + err.message)
      return setSubmitting(false)
    }

    setSelMaterial(''); setSelVendor(''); setQuantity('')
    setUnitCost(''); setNotes(''); setMaterialType('')
    setReceivedAt(new Date())
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
    <>
      {/* Create material modal */}
      {pendingMaterialName && (
        <CreateMaterialModal
          name={pendingMaterialName}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}

      <div className="rounded-2xl border overflow-hidden"
        style={{ borderColor: 'var(--accent-border)', background: 'var(--bg-card)', boxShadow: '0 0 40px color-mix(in srgb, var(--accent) 5%, transparent)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-border)' }}>
            <PackagePlus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Inscan Stock</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Add incoming stock from a vendor
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">

            {/* Material */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Component / Material
              </Label>
              <CreatableCombobox
                options={allMaterials}
                value={selMaterial}
                onChange={handleMaterialChange}
                placeholder="Search or create material…"
                createLabel="Create material"
                onCreate={handleCreateMaterial}
              />
            </div>

            {/* Type — read only if existing, select if new */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Component Type
              </Label>
              <div className="h-11 px-3 flex items-center rounded-lg border text-sm"
                style={{
                  background  : 'var(--bg-input)',
                  borderColor : 'var(--border-dim)',
                  color       : materialType ? 'var(--text-primary)' : 'var(--text-dim)',
                }}>
                {materialType || 'Auto-filled from material'}
              </div>
            </div>

            {/* Vendor */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                Vendor
              </Label>
              <CreatableCombobox
                options={allVendors}
                value={selVendor}
                onChange={setSelVendor}
                placeholder="Search or create vendor…"
                createLabel="Create vendor"
                onCreate={handleCreateVendor}
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                <Hash className="w-3 h-3" /> Quantity (Units)
              </Label>
              <Input type="number" min={1} placeholder="e.g. 500"
                value={quantity} onChange={e => setQuantity(e.target.value)}
                className="h-11 border rounded-lg text-sm" style={inputStyle} />
            </div>

            {/* Unit cost */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                <DollarSign className="w-3 h-3" /> Unit Cost (₹) — optional
              </Label>
              <Input type="number" min={0} placeholder="e.g. 85"
                value={unitCost} onChange={e => setUnitCost(e.target.value)}
                className="h-11 border rounded-lg text-sm" style={inputStyle} />
            </div>

            {/* Received date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                <CalendarIcon className="w-3 h-3" /> Received Date
              </Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 w-full h-11 px-3 border rounded-lg text-sm"
                    style={inputStyle}>
                    <CalendarIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    {format(receivedAt, 'dd MMM yyyy')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                  <Calendar mode="single" selected={receivedAt}
                    onSelect={d => { if (d) { setReceivedAt(d); setCalOpen(false) } }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>
                <FileText className="w-3 h-3" /> Notes — optional
              </Label>
              <Input placeholder="e.g. Batch A, urgent restock, invoice #1234"
                value={notes} onChange={e => setNotes(e.target.value)}
                className="h-11 border rounded-lg text-sm" style={inputStyle} />
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
              ✓ Stock inscanned successfully!
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button onClick={handleSubmit} disabled={submitting}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#000' }}>
              {submitting ? 'Saving…' : '+ Inscan Stock'}
            </button>
            {(selMaterial || selVendor || quantity) && (
              <button
                onClick={() => { setSelMaterial(''); setSelVendor(''); setQuantity(''); setUnitCost(''); setNotes(''); setMaterialType('') }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}