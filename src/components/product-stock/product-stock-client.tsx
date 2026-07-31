'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Boxes, ShoppingCart, Pencil, X, Save,
  Search, Package, Plus, Minus, ArrowLeftRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Product = {
  id             : string
  name           : string
  sku            : string
  unit_price     : number
  stock_qty      : number
  avg_sell_price : number
  stock_value_inr: number
  stock_value_usd: number
  total_sold     : number
  total_revenue  : number
  notes          : string | null
  updated_at     : string
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({
  product, onClose, onSaved,
}: {
  product: Product
  onClose: () => void
  onSaved: () => void
}) {
  const [qty,    setQty]    = useState(String(product.stock_qty))
  const [price,  setPrice]  = useState(product.avg_sell_price > 0 ? String(product.avg_sell_price) : '')
  const [notes,  setNotes]  = useState(product.notes ?? '')
  const [mode,   setMode]   = useState<'set' | 'add' | 'sub'>('set')
  const [adjQty, setAdjQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const finalQty = mode === 'set'
    ? parseInt(qty) || 0
    : mode === 'add'
    ? product.stock_qty + (parseInt(adjQty) || 0)
    : Math.max(0, product.stock_qty - (parseInt(adjQty) || 0))

  const previewValue = finalQty * (parseFloat(price || '0') || product.avg_sell_price)

  const handleSave = async () => {
    setError(null)
    if (finalQty < 0) return setError('Quantity cannot be negative.')
    setSaving(true)
    const { error: err } = await createClient()
      .from('product_stock')
      .upsert({
        product_id     : product.id,
        quantity       : finalQty,
        avg_sell_price : parseFloat(price || '0') || 0,
        notes          : notes.trim() || null,
        updated_at     : new Date().toISOString(),
      }, { onConflict: 'product_id' })
    setSaving(false)
    if (err) return setError(err.message)
    onSaved(); onClose()
  }

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}>

        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Update Stock</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{product.name}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Current → After */}
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}>
            <div className="text-center flex-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Current</p>
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                {product.stock_qty}
              </p>
            </div>
            <ArrowLeftRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-dim)' }} />
            <div className="text-center flex-1">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>After</p>
              <p className="text-2xl font-black"
                style={{ color: finalQty !== product.stock_qty ? '#10b981' : 'var(--accent)' }}>
                {finalQty}
              </p>
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Update Mode</Label>
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-dim)' }}>
              {([
                { key: 'set', label: 'Set',      icon: <Package className="w-3.5 h-3.5" /> },
                { key: 'add', label: 'Add +',    icon: <Plus className="w-3.5 h-3.5" /> },
                { key: 'sub', label: 'Remove -', icon: <Minus className="w-3.5 h-3.5" /> },
              ] as const).map(m => (
                <button key={m.key} type="button" onClick={() => setMode(m.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all"
                  style={{
                    background: mode === m.key ? 'var(--accent)' : 'var(--bg-input)',
                    color     : mode === m.key ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Qty input */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              {mode === 'set' ? 'Set Quantity' : mode === 'add' ? 'Units to Add' : 'Units to Remove'}
            </Label>
            <Input type="number" min={0} placeholder="e.g. 10"
              value={mode === 'set' ? qty : adjQty}
              onChange={e => mode === 'set' ? setQty(e.target.value) : setAdjQty(e.target.value)}
              className="h-11 border rounded-lg text-sm" style={inputStyle} />
          </div>

          {/* Avg sell price — always INR since orders are INR */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              Avg Selling Price (₹) — for inventory value
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none"
                style={{ color: 'var(--text-dim)' }}>₹</span>
              <Input type="number" min={0} step="0.01"
                placeholder={String(product.unit_price || '0')}
                value={price} onChange={e => setPrice(e.target.value)}
                className="h-11 border rounded-lg text-sm pl-7" style={inputStyle} />
            </div>
            {product.total_sold > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                💡 Order avg: ₹{(product.total_revenue / product.total_sold).toFixed(0)}/unit
              </p>
            )}
          </div>

          {/* Value preview */}
          {previewValue > 0 && finalQty > 0 && (
            <div className="rounded-xl p-3 flex items-center justify-between"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Stock Value after update</p>
              <p className="text-base font-black" style={{ color: 'var(--accent)' }}>
                {fmtINR(previewValue)}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Notes — optional</Label>
            <Input placeholder="e.g. Batch 2, production run Apr 2026"
              value={notes} onChange={e => setNotes(e.target.value)}
              className="h-10 border rounded-lg text-sm" style={inputStyle} />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm"
              style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
              ⚠ {error}
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-dim)' }}>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
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

// ── Product Tile ───────────────────────────────────────────────────────────────
function ProductTile({
  product, currency, usdRate, onEdit,
}: {
  product : Product
  currency: 'INR' | 'USD'
  usdRate : number
  onEdit  : () => void
}) {
  const isEmpty = product.stock_qty === 0
  const isLow   = product.stock_qty > 0 && product.stock_qty <= 5

  const statusColor = isEmpty ? '#ef4444' : isLow ? '#f59e0b' : '#10b981'
  const statusLabel = isEmpty ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'

  const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
  const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

  const stockValue   = currency === 'INR' ? product.stock_value_inr : product.stock_value_usd
  const avgPrice     = currency === 'INR' ? product.avg_sell_price  : product.avg_sell_price * usdRate
  const revenue      = currency === 'INR' ? product.total_revenue   : product.total_revenue * usdRate
  const fmtVal       = (n: number) => currency === 'INR' ? fmtINR(n) : fmtUSD(n)
  const symbol       = currency === 'INR' ? '₹' : '$'

  return (
    <div
      className="relative rounded-2xl border overflow-hidden flex flex-col"
      style={{
        background  : 'var(--bg-card)',
        borderColor : isEmpty ? '#ef444430' : isLow ? '#f59e0b30' : 'var(--border-dim)',
        boxShadow   : '0 4px 16px rgba(0,0,0,0.06)',
        transition  : 'transform 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
    >
      <div className="h-1" style={{
        background: `linear-gradient(90deg, ${statusColor}, ${statusColor}44)`,
      }} />

      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate"
              style={{ color: 'var(--text-primary)' }}>
              {product.name}
            </p>
            {product.sku && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                {product.sku}
              </p>
            )}
          </div>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 transition-all"
            style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
              ;(e.currentTarget as HTMLElement).style.background = 'var(--accent-soft)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}>
            <Pencil className="w-3 h-3" />
          </button>
        </div>

        {/* Stock number */}
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Ready Stock
          </p>
          <p className="text-4xl font-black leading-none mt-0.5" style={{ color: statusColor }}>
            {product.stock_qty.toLocaleString()}
          </p>
          <p className="text-[10px] mt-1 font-semibold" style={{ color: statusColor }}>
            {statusLabel}
          </p>
        </div>

        <div className="border-t" style={{ borderColor: 'var(--border-dim)' }} />

        {/* Price + value in selected currency */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5"
              style={{ color: 'var(--text-secondary)' }}>
              Avg Price ({symbol})
            </p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {avgPrice > 0
                ? fmtVal(avgPrice)
                : <span style={{ color: 'var(--text-dim)' }}>—</span>}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5"
              style={{ color: 'var(--text-secondary)' }}>
              Stock Value
            </p>
            <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {stockValue > 0
                ? fmtVal(stockValue)
                : <span style={{ color: 'var(--text-dim)' }}>—</span>}
            </p>
          </div>
        </div>

        {/* Orders revenue */}
        {product.total_sold > 0 && (
          <div className="rounded-lg px-3 py-2 flex items-center justify-between"
            style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {product.total_sold.toLocaleString()} sold
              </span>
            </div>
            <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>
              {fmtVal(revenue)}
            </span>
          </div>
        )}

        {product.notes && (
          <p className="text-[10px] italic truncate" style={{ color: 'var(--text-dim)' }}>
            {product.notes}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Client ────────────────────────────────────────────────────────────────
export default function ProductStockClient({
  products,
  totalStockValueInr,
  totalStockValueUsd,
  totalUnitsSold,
  totalRevenue,
  usdRate,
}: {
  products          : Product[]
  totalStockValueInr: number
  totalStockValueUsd: number
  totalUnitsSold    : number
  totalRevenue      : number
  usdRate           : number
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search,      setSearch]      = useState('')
  const [currency,    setCurrency]    = useState<'INR' | 'USD'>('INR')
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const refresh = () => startTransition(() => router.refresh())

  const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
  const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

  const fmt = (inr: number) => currency === 'INR' ? fmtINR(inr) : fmtUSD(inr * usdRate)

  const totalStockValue = currency === 'INR' ? totalStockValueInr : totalStockValueUsd
  const totalRevDisp    = currency === 'INR' ? totalRevenue : totalRevenue * usdRate

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const inStock  = products.filter(p => p.stock_qty > 0).length
  const outStock = products.filter(p => p.stock_qty === 0).length

  return (
    <>
      {editProduct && (
        <EditModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={() => { setEditProduct(null); refresh() }}
        />
      )}

      <div className="px-4 sm:px-6 md:px-10 py-6 space-y-6">

        {/* Top row: total value + currency toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

          {/* Total value */}
          <div
            className="rounded-2xl border p-5 flex-1"
            style={{
              background  : 'var(--bg-card)',
              borderColor : 'var(--accent-border)',
              boxShadow   : '0 0 0 1px #3b82f615, 0 8px 32px #3b82f610',
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-secondary)' }}>
              Total Stock Value
            </p>
            <p className="text-3xl font-black" style={{ color: 'var(--accent)' }}>
              {currency === 'INR' ? fmtINR(totalStockValueInr) : fmtUSD(totalStockValueUsd)}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {currency === 'INR'
                ? `≈ ${fmtUSD(totalStockValueUsd)}`
                : `≈ ${fmtINR(totalStockValueInr)}`}
            </p>
          </div>

          {/* Currency toggle */}
          <div className="flex flex-col items-end gap-2">
            <div
              className="flex items-center gap-2 p-1 rounded-2xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
            >
              <button
                onClick={() => setCurrency('INR')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: currency === 'INR' ? 'var(--accent)' : 'transparent',
                  color     : currency === 'INR' ? '#fff' : 'var(--text-secondary)',
                }}>
                ₹ INR
              </button>
              <div className="px-1">
                <ArrowLeftRight className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
              </div>
              <button
                onClick={() => setCurrency('USD')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: currency === 'USD' ? 'var(--accent)' : 'transparent',
                  color     : currency === 'USD' ? '#fff' : 'var(--text-secondary)',
                }}>
                $ USD
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              1 USD = ₹{(1 / usdRate).toFixed(2)} (live)
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue',  value: currency === 'INR' ? fmtINR(totalRevenue) : fmtUSD(totalRevDisp), color: '#10b981',  sub: 'from orders' },
            { label: 'Units Sold',     value: totalUnitsSold.toLocaleString(),                                    color: '#8b5cf6',  sub: 'all orders' },
            { label: 'In Stock',       value: String(inStock),                                                    color: '#10b981',  sub: 'products' },
            { label: 'Out of Stock',   value: String(outStock),                                                   color: outStock > 0 ? '#ef4444' : '#10b981', sub: 'products' },
          ].map(stat => (
            <div key={stat.label}
              className="rounded-2xl border p-4"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold"
                style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
              <p className="text-xl sm:text-2xl font-black mt-0.5" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-border)' }}>
          <ShoppingCart className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <p className="text-xs" style={{ color: 'var(--accent)' }}>
            Stock quantity = <strong>ready goods</strong> (update manually) ·
            Revenue auto-reflects all orders ·
            Avg price from orders used if not set manually.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--text-dim)' }} />
          <input
            placeholder="Search product or SKU…"
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

        {/* Tiles */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border py-16 text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
            <Boxes className="w-10 h-10 mx-auto mb-3 opacity-20"
              style={{ color: 'var(--text-primary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'No products match' : 'No products yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(product => (
              <ProductTile
                key={product.id}
                product={product}
                currency={currency}
                usdRate={usdRate}
                onEdit={() => setEditProduct(product)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}