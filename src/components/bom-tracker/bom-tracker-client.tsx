'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Layers, Plus, Trash2, X, Save,
  CheckCircle2, AlertTriangle, XCircle,
  Package, Search, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Material = { id: string; name: string; type: string; description: string | null }

type BomItem = {
  id             : string
  product_id     : string
  material_id    : string
  quantity_needed: number
  notes          : string | null
  material_name  : string
  material_type  : string
  material_desc  : string | null
  stock_remaining: number
  stock_inscanned: number
}

type Product = { id: string; name: string; bom: BomItem[] }

const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  'IC / Microcontroller' : { color: '#3b82f6', bg: '#3b82f615' },
  'Passive Component'    : { color: '#8b5cf6', bg: '#8b5cf615' },
  'Sensor / Module'      : { color: '#10b981', bg: '#10b98115' },
  'Connector / Cable'    : { color: '#f59e0b', bg: '#f59e0b15' },
  'Other'                : { color: '#6b7280', bg: '#6b728015' },
}
const DEFAULT_CFG = { color: '#6b7280', bg: '#6b728015' }

function stockStatus(remaining: number, needed: number) {
  if (remaining <= 0)     return 'out'
  if (remaining < needed) return 'low'
  return 'ok'
}

// ── Add Material Modal ────────────────────────────────────────────────────────
function AddMaterialModal({
  product, allMaterials, existingIds, onClose, onAdded,
}: {
  product      : Product
  allMaterials : Material[]
  existingIds  : string[]
  onClose      : () => void
  onAdded      : () => void
}) {
  const [selMaterial, setSelMaterial] = useState('')
  const [qty,         setQty]         = useState('1')
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const available = allMaterials.filter(m => !existingIds.includes(m.id))

  const handleSave = async () => {
    setError(null)
    if (!selMaterial)      return setError('Select a material.')
    if (parseInt(qty) < 1) return setError('Quantity must be at least 1.')
    setSaving(true)
    const { error: err } = await createClient()
      .from('product_bom_materials')
      .insert({
        product_id      : product.id,
        material_id     : selMaterial,
        quantity_needed : parseInt(qty),
        notes           : notes.trim() || null,
      })
    setSaving(false)
    if (err) return setError(err.message)
    onAdded(); onClose()
  }

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Add BOM Material
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {product.name}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Material *</Label>
            <Select value={selMaterial} onValueChange={setSelMaterial}>
              <SelectTrigger className="h-11 border rounded-lg text-sm" style={inputStyle}>
                <SelectValue placeholder="Select material from inventory…" />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                {available.length === 0
                  ? <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-dim)' }}>
                      All materials already added
                    </div>
                  : available.map(m => (
                    <SelectItem key={m.id} value={m.id} style={{ color: 'var(--text-primary)' }}>
                      <span className="font-medium">{m.name}</span>
                      {m.description && (
                        <span className="ml-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
                          — {m.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Qty Needed per Assembly *</Label>
            <Input type="number" min={1} placeholder="e.g. 2" value={qty}
              onChange={e => setQty(e.target.value)}
              className="h-11 border rounded-lg text-sm" style={inputStyle} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Notes — optional</Label>
            <Input placeholder="e.g. main MCU, RF antenna" value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-11 border rounded-lg text-sm" style={inputStyle} />
          </div>
          {error && (
            <div className="px-4 py-3 rounded-lg text-sm"
              style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
              ⚠ {error}
            </div>
          )}
          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-dim)' }}>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <Save className="w-4 h-4" />
              {saving ? 'Adding…' : 'Add to BOM'}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm border"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Product Tile (collapsed) ──────────────────────────────────────────────────
function ProductTile({
  product,
  onClick,
}: {
  product : Product
  onClick : () => void
}) {
  const bom = product.bom
  const ok  = bom.filter(b => stockStatus(b.stock_remaining, b.quantity_needed) === 'ok').length
  const low = bom.filter(b => stockStatus(b.stock_remaining, b.quantity_needed) === 'low').length
  const out = bom.filter(b => stockStatus(b.stock_remaining, b.quantity_needed) === 'out').length

  const health = bom.length === 0 ? 'empty'
    : out > 0 ? 'critical' : low > 0 ? 'warning' : 'healthy'

  const healthColor = health === 'healthy'  ? '#10b981'
    : health === 'warning'   ? '#f59e0b'
    : health === 'critical'  ? '#ef4444'
    : 'var(--text-dim)'

  const healthLabel = health === 'healthy'  ? 'All OK'
    : health === 'warning'   ? 'Low Stock'
    : health === 'critical'  ? 'Out of Stock'
    : 'No BOM'

  const HealthIcon = health === 'healthy'
    ? CheckCircle2
    : health === 'warning' ? AlertTriangle
    : health === 'critical' ? XCircle
    : Package

  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl border overflow-hidden text-left transition-all active:scale-95"
      style={{
        background  : 'var(--bg-card)',
        borderColor : health === 'empty' ? 'var(--border-dim)' : `${healthColor}40`,
        boxShadow   : health !== 'empty'
          ? `0 0 0 1px ${healthColor}15, 0 4px 20px rgba(0,0,0,0.08)`
          : '0 4px 16px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
    >
      {/* Top bar */}
      <div className="h-1" style={{
        background: bom.length === 0
          ? 'var(--border-dim)'
          : `linear-gradient(90deg, ${healthColor}, ${healthColor}44)`,
      }} />

      <div className="p-4 space-y-3">
        {/* Product initial */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
            style={{ background: `${healthColor}15`, color: healthColor }}>
            {product.name[0]?.toUpperCase()}
          </div>
          <HealthIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: healthColor }} />
        </div>

        {/* Product name */}
        <div>
          <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
            {product.name}
          </p>
          <p className="text-xs mt-0.5 font-semibold" style={{ color: healthColor }}>
            {healthLabel}
          </p>
        </div>

        {/* Mini stats */}
        {bom.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]"
              style={{ color: 'var(--text-secondary)' }}>
              <span>{bom.length} materials</span>
              <span style={{ color: healthColor }}>
                {ok}/{bom.length} OK
              </span>
            </div>
            {/* Mini bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-dim)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width     : `${bom.length > 0 ? (ok / bom.length) * 100 : 0}%`,
                  background: healthColor,
                }} />
            </div>
            {/* Badges */}
            <div className="flex items-center gap-1 flex-wrap">
              {ok  > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: '#10b98115', color: '#10b981' }}>
                  {ok} OK
                </span>
              )}
              {low > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                  {low} LOW
                </span>
              )}
              {out > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: '#ef444415', color: '#ef4444' }}>
                  {out} OUT
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
            Tap to add materials
          </p>
        )}
      </div>
    </button>
  )
}

// ── Expanded Panel ────────────────────────────────────────────────────────────
function ExpandedPanel({
  product,
  allMaterials,
  onClose,
  onRefresh,
}: {
  product     : Product
  allMaterials: Material[]
  onClose     : () => void
  onRefresh   : () => void
}) {
  const [showAdd,    setShowAdd]    = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await createClient().from('product_bom_materials').delete().eq('id', id)
    setDeletingId(null)
    onRefresh()
  }

  const bom = product.bom

  return (
    <>
      {showAdd && (
        <AddMaterialModal
          product={product}
          allMaterials={allMaterials}
          existingIds={bom.map(b => b.material_id)}
          onClose={() => setShowAdd(false)}
          onAdded={onRefresh}
        />
      )}

      {/* Full-screen overlay on mobile, side panel feel on desktop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t overflow-hidden"
        style={{
          background  : 'var(--bg-card)',
          borderColor : 'var(--border-dim)',
          maxHeight   : '85vh',
          boxShadow   : '0 -8px 40px rgba(0,0,0,0.2)',
        }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-dim)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--border-dim)' }}>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              {product.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {bom.length} materials in BOM
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold"
              style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)', background: 'var(--accent-soft)' }}>
              <Plus className="w-3 h-3" /> Add
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BOM material tiles — scrollable */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(85vh - 100px)' }}>
          {bom.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-20"
                style={{ color: 'var(--text-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No BOM materials yet
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-2 text-xs font-semibold"
                style={{ color: 'var(--accent)' }}>
                + Add first material →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {bom.map(item => {
                const status = stockStatus(item.stock_remaining, item.quantity_needed)
                const cfg    = TYPE_CONFIG[item.material_type] ?? DEFAULT_CFG
                const pct    = item.stock_inscanned > 0
                  ? Math.min((item.stock_remaining / item.stock_inscanned) * 100, 100) : 0

                const statusColor = status === 'ok'  ? '#10b981'
                  : status === 'low' ? '#f59e0b' : '#ef4444'
                const statusLabel = status === 'ok'  ? 'In Stock'
                  : status === 'low' ? 'Low' : 'Out'
                const StatusIcon  = status === 'ok' ? CheckCircle2
                  : status === 'low' ? AlertTriangle : XCircle

                return (
                  <div key={item.id}
                    className="rounded-2xl border overflow-hidden flex flex-col"
                    style={{
                      background  : 'var(--bg-secondary)',
                      borderColor : `${statusColor}30`,
                    }}>
                    <div className="h-0.5" style={{
                      background: `linear-gradient(90deg, ${statusColor}, ${statusColor}44)`,
                    }} />
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      {/* Type + delete */}
                      <div className="flex items-start justify-between gap-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold leading-tight"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {item.material_type}
                        </span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="w-5 h-5 rounded flex items-center justify-center shrink-0 disabled:opacity-50"
                          style={{ color: 'var(--text-dim)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}
                        >
                          {deletingId === item.id
                            ? <div className="w-3 h-3 border-2 rounded-full animate-spin"
                                style={{ borderColor: '#ef444430', borderTopColor: '#ef4444' }} />
                            : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Name */}
                      <div>
                        <p className="font-bold text-xs leading-tight"
                          style={{ color: 'var(--text-primary)' }}>
                          {item.material_name}
                        </p>
                        {item.material_desc && (
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>
                            {item.material_desc}
                          </p>
                        )}
                      </div>

                      {/* Big stock number */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}>Stock</p>
                          <p className="text-2xl font-black leading-none" style={{ color: statusColor }}>
                            {item.stock_remaining.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider"
                            style={{ color: 'var(--text-secondary)' }}>Need</p>
                          <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                            {item.quantity_needed}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="h-1 rounded-full overflow-hidden"
                          style={{ background: 'var(--border-dim)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: statusColor }} />
                        </div>
                        <div className="flex items-center gap-1">
                          <StatusIcon className="w-2.5 h-2.5" style={{ color: statusColor }} />
                          <span className="text-[9px] font-semibold" style={{ color: statusColor }}>
                            {statusLabel}
                          </span>
                          {item.notes && (
                            <span className="text-[9px] italic ml-auto truncate"
                              style={{ color: 'var(--text-dim)' }}>
                              {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Main Client ───────────────────────────────────────────────────────────────
export default function BomTrackerClient({
  products,
  allMaterials,
}: {
  products    : Product[]
  allMaterials: Material[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search,          setSearch]          = useState('')
  const [expandedProduct, setExpandedProduct] = useState<Product | null>(null)

  const refresh = () => startTransition(() => router.refresh())

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalProducts = products.length
  const withBom       = products.filter(p => p.bom.length > 0).length
  const needAttention = products.filter(p =>
    p.bom.some(b => stockStatus(b.stock_remaining, b.quantity_needed) !== 'ok')
  ).length

  // Keep expanded product in sync after refresh
  const syncedExpanded = expandedProduct
    ? (products.find(p => p.id === expandedProduct.id) ?? null)
    : null

  return (
    <>
      {/* Expanded panel */}
      {syncedExpanded && (
        <ExpandedPanel
          product={syncedExpanded}
          allMaterials={allMaterials}
          onClose={() => setExpandedProduct(null)}
          onRefresh={refresh}
        />
      )}

      <div className="px-4 sm:px-6 md:px-10 py-6 space-y-6">

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Products',       value: totalProducts, color: 'var(--accent)' },
            { label: 'BOM Set',        value: withBom,       color: '#10b981'       },
            { label: 'Need Attention', value: needAttention,
              color: needAttention > 0 ? '#f59e0b' : '#10b981' },
          ].map(stat => (
            <div key={stat.label}
              className="rounded-2xl border p-3 sm:p-4"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold"
                style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-black mt-0.5" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-dim)' }} />
          <input
            placeholder="Search product…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 border rounded-xl text-sm bg-transparent outline-none"
            style={{
              background : 'var(--bg-input)',
              borderColor: 'var(--border-dim)',
              color      : 'var(--text-primary)',
            }}
          />
        </div>

        {/* Product tiles grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border py-16 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-20"
              style={{ color: 'var(--text-primary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'No products match' : 'No products yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(product => (
              <ProductTile
                key={product.id}
                product={product}
                onClick={() => setExpandedProduct(product)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}