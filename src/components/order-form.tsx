'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import {
  CalendarIcon, Plus, Trash2,
  Building2, Package, Receipt, Percent,
} from 'lucide-react'
import CreatableCombobox from '@/components/creatable-combobox'
import type { Company, Product } from '@/lib/types'

type LineItem = {
  id            : string
  product_id    : string
  product_name  : string
  quantity      : string
  price_per_unit: string
}

const emptyLine = (): LineItem => ({
  id            : crypto.randomUUID(),
  product_id    : '',
  product_name  : '',
  quantity      : '',
  price_per_unit: '',
})

const TAX_PRESETS = [
  { label: '0%',      value: '0'      },
  { label: '5%',      value: '5'      },
  { label: '12%',     value: '12'     },
  { label: '18%',     value: '18'     },
  { label: '28%',     value: '28'     },
  { label: 'Custom',  value: 'custom' },
]

export default function OrderForm({
  companies: initialCompanies = [],
  products : initialProducts  = [],
}: {
  companies?: Company[]
  products ?: Product[]
}) {
  const router = useRouter()

  const [allCompanies, setAllCompanies] = useState(
    initialCompanies.map(c => ({ id: c.id, label: c.name }))
  )
  const [allProducts, setAllProducts] = useState(
    initialProducts.map(p => ({ id: p.id, label: p.name }))
  )
  const [priceMap, setPriceMap] = useState<Record<string, number>>(
    Object.fromEntries(initialProducts.map(p => [p.id, p.unit_price]))
  )

  const [selCompany,    setSelCompany]    = useState('')
  const [orderDate,     setOrderDate]     = useState<Date>(new Date())
  const [calOpen,       setCalOpen]       = useState(false)
  const [lines,         setLines]         = useState<LineItem[]>([emptyLine()])
  const [taxPreset,     setTaxPreset]     = useState('18')
  const [customTax,     setCustomTax]     = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [success,       setSuccess]       = useState(false)

  const taxRate = taxPreset === 'custom'
    ? parseFloat(customTax || '0')
    : parseFloat(taxPreset)

  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

  const removeLine = (id: string) =>
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev)

  const handleProductChange = (lineId: string, productId: string) => {
    const found = allProducts.find(p => p.id === productId)
    updateLine(lineId, {
      product_id    : productId,
      product_name  : found?.label ?? '',
      price_per_unit: String(priceMap[productId] ?? ''),
    })
  }

  const handleCreateCompany = async (name: string) => {
    const sb = createClient()
    const { data, error } = await sb.from('companies').insert({ name }).select().single()
    if (error || !data) return null
    const opt = { id: data.id, label: data.name }
    setAllCompanies(prev => [...prev, opt])
    return opt
  }

  const handleCreateProduct = async (name: string) => {
    const sb = createClient()
    const { data, error } = await sb
      .from('products')
      .insert({ name, sku: `SKU-${Date.now()}`, unit_price: 0 })
      .select().single()
    if (error || !data) return null
    const opt = { id: data.id, label: data.name }
    setAllProducts(prev => [...prev, opt])
    setPriceMap(prev => ({ ...prev, [data.id]: 0 }))
    return opt
  }

  const handleSubmit = async () => {
    setError(null); setSuccess(false)
    if (!selCompany) return setError('Please select a company.')
    if (lines.some(l => !l.product_id || !l.quantity || !l.price_per_unit))
      return setError('Please fill in all product lines.')
    if (taxPreset === 'custom' && (isNaN(taxRate) || taxRate < 0 || taxRate > 100))
      return setError('Enter a valid custom tax rate (0–100).')

    const parsedLines = lines.map(l => ({
      product_id    : l.product_id,
      quantity      : parseInt(l.quantity),
      price_per_unit: parseFloat(l.price_per_unit),
    }))

    if (parsedLines.some(l =>
      isNaN(l.quantity) || l.quantity <= 0 ||
      isNaN(l.price_per_unit) || l.price_per_unit <= 0
    )) return setError('Quantity and price must be positive numbers.')

    setSubmitting(true)
    const sb = createClient()

    const { data: order, error: oErr } = await sb
      .from('orders')
      .insert({
        company_id : selCompany,
        order_date : format(orderDate, 'yyyy-MM-dd'),
        tax_rate   : taxRate,
      })
      .select().single()

    if (oErr || !order) {
      setError('Failed to create order: ' + oErr?.message)
      return setSubmitting(false)
    }

    const { error: iErr } = await sb.from('order_items').insert(
      parsedLines.map(l => ({ order_id: order.id, ...l }))
    )

    if (iErr) {
      setError('Failed to add items: ' + iErr.message)
      return setSubmitting(false)
    }

    setSelCompany('')
    setLines([emptyLine()])
    setOrderDate(new Date())
    setTaxPreset('18')
    setCustomTax('')
    setSuccess(true)
    setSubmitting(false)
    router.refresh()
    setTimeout(() => setSuccess(false), 3000)
  }

  const subtotal = lines.reduce((sum, l) => {
    const q = parseInt(l.quantity   || '0')
    const p = parseFloat(l.price_per_unit || '0')
    return sum + (isNaN(q) || isNaN(p) ? 0 : q * p)
  }, 0)

  const taxAmount  = subtotal * taxRate / 100
  const grandTotal = subtotal + taxAmount

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style                : 'currency',
      currency             : 'INR',
      maximumFractionDigits: 2,
    }).format(n)

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        background  : 'var(--bg-card)',
        borderColor : 'var(--accent-border)',
        boxShadow   : '0 0 40px color-mix(in srgb, var(--accent) 5%, transparent)',
      }}
    >
      {/* Header */}
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
            New Order
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            One order can have multiple products
          </p>
        </div>
        {grandTotal > 0 && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-border)' }}>
            <Receipt className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {fmt(grandTotal)}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">

        {/* Company + Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              <Building2 className="w-3 h-3" /> Company
            </Label>
            <CreatableCombobox
              options={allCompanies}
              value={selCompany}
              onChange={setSelCompany}
              placeholder="Search or create company…"
              createLabel="Create company"
              onCreate={handleCreateCompany}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              <CalendarIcon className="w-3 h-3" /> Order Date
            </Label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 w-full h-11 px-3 border rounded-lg text-sm"
                  style={inputStyle}>
                  <CalendarIcon className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--text-secondary)' }} />
                  {format(orderDate, 'dd MMM yyyy')}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <Calendar mode="single" selected={orderDate}
                  onSelect={d => { if (d) { setOrderDate(d); setCalOpen(false) } }}
                  initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              <Package className="w-3 h-3" /> Products
            </Label>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              {lines.length} line{lines.length !== 1 && 's'}
            </span>
          </div>

          {/* Column headers */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-1">
            {['Product', 'Qty', 'Price / Unit', 'Line Total', ''].map((h, i) => (
              <div key={i}
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  i === 0 ? 'col-span-5' :
                  i === 1 ? 'col-span-2' :
                  i === 2 ? 'col-span-2' :
                  i === 3 ? 'col-span-2' : 'col-span-1'
                }`}
                style={{ color: 'var(--text-dim)' }}>
                {h}
              </div>
            ))}
          </div>

          {lines.map(line => {
            const lineTotal =
              (parseInt(line.quantity      || '0') || 0) *
              (parseFloat(line.price_per_unit || '0') || 0)
            return (
              <div key={line.id}
                className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}>
                <div className="col-span-12 sm:col-span-5">
                  <CreatableCombobox
                    options={allProducts}
                    value={line.product_id}
                    onChange={id => handleProductChange(line.id, id)}
                    placeholder="Select product…"
                    createLabel="Create product"
                    onCreate={handleCreateProduct}
                  />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <Input type="number" min={1} placeholder="Qty"
                    value={line.quantity}
                    onChange={e => updateLine(line.id, { quantity: e.target.value })}
                    className="h-11 border rounded-lg text-sm" style={inputStyle} />
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <Input type="number" min={0} placeholder="₹ Price"
                    value={line.price_per_unit}
                    onChange={e => updateLine(line.id, { price_per_unit: e.target.value })}
                    className="h-11 border rounded-lg text-sm" style={inputStyle} />
                </div>
                <div className="col-span-10 sm:col-span-2 flex items-center h-11 px-3 rounded-lg border text-sm font-bold"
                  style={{
                    background  : lineTotal > 0 ? 'var(--accent-soft)' : 'var(--bg-input)',
                    borderColor : lineTotal > 0 ? 'var(--accent-border)' : 'var(--border-dim)',
                    color       : lineTotal > 0 ? 'var(--accent)' : 'var(--text-dim)',
                  }}>
                  {lineTotal > 0 ? fmt(lineTotal) : '—'}
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  <button onClick={() => removeLine(line.id)} disabled={lines.length === 1}
                    className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all disabled:opacity-30"
                    style={{ borderColor: 'var(--border-dim)', color: 'var(--neon-pink)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}

          <button onClick={() => setLines(prev => [...prev, emptyLine()])}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium w-full justify-center"
            style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)', background: 'var(--accent-soft)', borderStyle: 'dashed' }}>
            <Plus className="w-3.5 h-3.5" /> Add Product Line
          </button>
        </div>

        {/* ── Tax section ── */}
        <div
          className="rounded-xl border p-4 space-y-4"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}
        >
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}>
            <Percent className="w-3 h-3" /> Tax (GST)
          </Label>

          {/* Tax preset buttons */}
          <div className="flex flex-wrap gap-2">
            {TAX_PRESETS.map(t => (
              <button
                key={t.value}
                onClick={() => { setTaxPreset(t.value); if (t.value !== 'custom') setCustomTax('') }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background  : taxPreset === t.value ? 'var(--accent)' : 'var(--bg-input)',
                  borderColor : taxPreset === t.value ? 'var(--accent)' : 'var(--border-dim)',
                  color       : taxPreset === t.value ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Custom tax input */}
          {taxPreset === 'custom' && (
            <div className="flex items-center gap-3">
              <Input
                type="number" min={0} max={100} placeholder="Enter tax %"
                value={customTax}
                onChange={e => setCustomTax(e.target.value)}
                className="h-10 border rounded-lg text-sm w-40"
                style={inputStyle}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>%</span>
            </div>
          )}

          {/* Tax breakdown */}
          {subtotal > 0 && (
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-dim)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {fmt(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Tax ({isNaN(taxRate) ? 0 : taxRate}%)
                </span>
                <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                  + {fmt(taxAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t"
                style={{ borderColor: 'var(--border-dim)' }}>
                <span className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-primary)' }}>
                  Total (incl. tax)
                </span>
                <span className="text-base font-black" style={{ color: 'var(--accent)' }}>
                  {fmt(grandTotal)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: 'var(--border-dim)' }} />

        {error && (
          <div className="px-4 py-3 rounded-lg text-sm"
            style={{ background: '#ff006e10', border: '1px solid #ff006e33', color: '#ff006e' }}>
            ⚠ {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-lg text-sm"
            style={{
              background : 'color-mix(in srgb, var(--neon-green) 10%, transparent)',
              border     : '1px solid color-mix(in srgb, var(--neon-green) 25%, transparent)',
              color      : 'var(--neon-green)',
            }}>
            ✓ Order created successfully!
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {submitting ? 'Creating…' : '+ Create Order'}
          </button>
          {(selCompany || lines.some(l => l.product_id)) && (
            <button
              onClick={() => { setSelCompany(''); setLines([emptyLine()]); setOrderDate(new Date()); setTaxPreset('18'); setCustomTax('') }}
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