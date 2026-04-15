'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, parseISO } from 'date-fns'
import { X, CalendarIcon, Trash2, Plus, Save, Percent } from 'lucide-react'
import CreatableCombobox from '@/components/creatable-combobox'
import type { GroupedOrder, Company, Product } from '@/lib/types'

type EditLine = {
  item_id?      : string
  product_id    : string
  quantity      : string
  price_per_unit: string
  _deleted?     : boolean
}

const TAX_PRESETS = [0, 5, 12, 18, 28]

export default function EditOrderModal({
  order,
  companies,
  products,
  onClose,
}: {
  order    : GroupedOrder
  companies: Company[]
  products : Product[]
  onClose  : () => void
}) {
  const router = useRouter()

  const [allCompanies, setAllCompanies] = useState(
    companies.map(c => ({ id: c.id, label: c.name }))
  )
  const [allProducts, setAllProducts] = useState(
    products.map(p => ({ id: p.id, label: p.name }))
  )
  const [priceMap, setPriceMap] = useState<Record<string, number>>(
    Object.fromEntries(products.map(p => [p.id, p.unit_price]))
  )

  const [selCompany, setSelCompany] = useState(order.company_id)
  const [orderDate,  setOrderDate]  = useState<Date>(parseISO(order.order_date))
  const [calOpen,    setCalOpen]    = useState(false)
  const [taxRate,    setTaxRate]    = useState<number>(order.tax_rate ?? 18)
  const [customTax,  setCustomTax]  = useState('')
  const [isCustom,   setIsCustom]   = useState(
    !TAX_PRESETS.includes(order.tax_rate ?? 18)
  )
  const [lines,   setLines]   = useState<EditLine[]>(
    order.items.map(i => ({
      item_id       : i.id,
      product_id    : i.product_id,
      quantity      : String(i.quantity),
      price_per_unit: String(i.price_per_unit),
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const activeLines = lines.filter(l => !l._deleted)

  const subtotal = activeLines.reduce((s, l) => {
    return s + ((parseInt(l.quantity) || 0) * (parseFloat(l.price_per_unit) || 0))
  }, 0)

  const effectiveTaxRate = isCustom ? (parseFloat(customTax) || 0) : taxRate
  const taxAmount        = subtotal * effectiveTaxRate / 100
  const grandTotal       = subtotal + taxAmount

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style                : 'currency',
      currency             : 'INR',
      maximumFractionDigits: 2,
    }).format(n)

  const updateLine = (idx: number, patch: Partial<EditLine>) =>
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))

  const handleProductChange = (idx: number, productId: string) => {
    updateLine(idx, {
      product_id    : productId,
      price_per_unit: String(priceMap[productId] ?? ''),
    })
  }

  const handleCreateCompany = async (name: string) => {
    const sb = createClient()
    const { data } = await sb.from('companies').insert({ name }).select().single()
    if (!data) return null
    const opt = { id: data.id, label: data.name }
    setAllCompanies(p => [...p, opt])
    return opt
  }

  const handleCreateProduct = async (name: string) => {
    const sb = createClient()
    const { data } = await sb.from('products')
      .insert({ name, sku: `SKU-${Date.now()}`, unit_price: 0 }).select().single()
    if (!data) return null
    const opt = { id: data.id, label: data.name }
    setAllProducts(p => [...p, opt])
    setPriceMap(p => ({ ...p, [data.id]: 0 }))
    return opt
  }

  const handleSave = async () => {
    setError(null)
    if (!selCompany) return setError('Please select a company.')
    const active = lines.filter(l => !l._deleted)
    if (active.some(l => !l.product_id || !l.quantity || !l.price_per_unit))
      return setError('Please fill in all product lines.')

    setSaving(true)
    const sb = createClient()

    const { error: oErr } = await sb.from('orders').update({
      company_id : selCompany,
      order_date : format(orderDate, 'yyyy-MM-dd'),
      tax_rate   : effectiveTaxRate,
    }).eq('id', order.order_id)

    if (oErr) {
      setError('Failed to update order: ' + oErr.message)
      return setSaving(false)
    }

    const deleted = lines.filter(l => l._deleted && l.item_id)
    for (const l of deleted) {
      await sb.from('order_items').delete().eq('id', l.item_id!)
    }

    const existing = active.filter(l => l.item_id)
    for (const l of existing) {
      await sb.from('order_items').update({
        product_id    : l.product_id,
        quantity      : parseInt(l.quantity),
        price_per_unit: parseFloat(l.price_per_unit),
      }).eq('id', l.item_id!)
    }

    const newLines = active.filter(l => !l.item_id)
    if (newLines.length > 0) {
      await sb.from('order_items').insert(
        newLines.map(l => ({
          order_id      : order.order_id,
          product_id    : l.product_id,
          quantity      : parseInt(l.quantity),
          price_per_unit: parseFloat(l.price_per_unit),
        }))
      )
    }

    setSaving(false)
    router.refresh()
    onClose()
  }

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-card)' }}>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Edit Order
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              #{order.order_id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {grandTotal > 0 && (
              <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                {fmt(grandTotal)}
              </span>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Company + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Company</Label>
              <CreatableCombobox
                options={allCompanies}
                value={selCompany}
                onChange={setSelCompany}
                placeholder="Select company…"
                createLabel="Create company"
                onCreate={handleCreateCompany}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Order Date</Label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 w-full h-11 px-3 border rounded-lg text-sm"
                    style={inputStyle}>
                    <CalendarIcon className="w-4 h-4"
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
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Products</Label>

            {lines.map((line, idx) => {
              if (line._deleted) return null
              const lineTotal = (parseInt(line.quantity) || 0) * (parseFloat(line.price_per_unit) || 0)
              return (
                <div key={idx}
                  className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}>
                  <div className="col-span-12 sm:col-span-5">
                    <CreatableCombobox
                      options={allProducts}
                      value={line.product_id}
                      onChange={id => handleProductChange(idx, id)}
                      placeholder="Select product…"
                      createLabel="Create product"
                      onCreate={handleCreateProduct}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Input type="number" min={1} placeholder="Qty"
                      value={line.quantity}
                      onChange={e => updateLine(idx, { quantity: e.target.value })}
                      className="h-11 border rounded-lg text-sm" style={inputStyle} />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Input type="number" min={0} placeholder="₹"
                      value={line.price_per_unit}
                      onChange={e => updateLine(idx, { price_per_unit: e.target.value })}
                      className="h-11 border rounded-lg text-sm" style={inputStyle} />
                  </div>
                  <div className="col-span-10 sm:col-span-2 flex items-center h-11 px-2 rounded-lg border text-xs font-bold"
                    style={{
                      background  : lineTotal > 0 ? 'var(--accent-soft)' : 'var(--bg-input)',
                      borderColor : lineTotal > 0 ? 'var(--accent-border)' : 'var(--border-dim)',
                      color       : lineTotal > 0 ? 'var(--accent)' : 'var(--text-dim)',
                    }}>
                    {lineTotal > 0 ? fmt(lineTotal) : '—'}
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button
                      onClick={() => {
                        if (line.item_id) updateLine(idx, { _deleted: true })
                        else setLines(p => p.filter((_, i) => i !== idx))
                      }}
                      disabled={activeLines.length === 1}
                      className="w-9 h-9 rounded-lg flex items-center justify-center border disabled:opacity-30"
                      style={{ borderColor: 'var(--border-dim)', color: 'var(--neon-pink)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}

            <button
              onClick={() => setLines(p => [...p, { product_id: '', quantity: '', price_per_unit: '' }])}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium w-full justify-center"
              style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)', background: 'var(--accent-soft)', borderStyle: 'dashed' }}>
              <Plus className="w-3.5 h-3.5" /> Add Product Line
            </button>
          </div>

          {/* Tax section */}
          <div className="rounded-xl border p-4 space-y-3"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}>
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>
              <Percent className="w-3 h-3" /> Tax (GST)
            </Label>

            <div className="flex flex-wrap gap-2">
              {TAX_PRESETS.map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => { setTaxRate(rate); setIsCustom(false); setCustomTax('') }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    background  : !isCustom && taxRate === rate ? 'var(--accent)' : 'var(--bg-input)',
                    borderColor : !isCustom && taxRate === rate ? 'var(--accent)' : 'var(--border-dim)',
                    color       : !isCustom && taxRate === rate ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {rate}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background  : isCustom ? 'var(--accent)' : 'var(--bg-input)',
                  borderColor : isCustom ? 'var(--accent)' : 'var(--border-dim)',
                  color       : isCustom ? '#fff' : 'var(--text-secondary)',
                }}
              >
                Custom
              </button>
            </div>

            {isCustom && (
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

            {subtotal > 0 && (
              <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-dim)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fmt(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Tax ({effectiveTaxRate}%)
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                    + {fmt(taxAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t"
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

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm"
              style={{ background: '#ff006e10', border: '1px solid #ff006e33', color: '#ff006e' }}>
              ⚠ {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t"
            style={{ borderColor: 'var(--border-dim)' }}>
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}