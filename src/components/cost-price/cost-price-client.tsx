'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import {
  Plus, Trash2, Save, X, Pencil,
  Calculator, DollarSign, IndianRupee,
  Clock, Copy, ChevronDown, ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import OnetimeTable, { type OnetimeItem } from './onetime-table'
import SellingPriceInput from './selling-price-input'
import CostBreakup from './cost-breakup'

type Product = { id: string; name: string }

type SheetItem = {
  id?             : string
  component_name  : string
  quantity        : string
  unit_price      : string
  currency        : 'INR' | 'USD'
  customs_percent : string
  sort_order      : number
}

type Sheet = {
  id                : string
  product_id        : string
  product_name      : string
  assembly_qty      : number
  version           : number
  notes             : string | null
  failure_rate      : number
  selling_price     : number
  created_at        : string
  items             : any[]
  onetime           : any[]
  bom_base          : number
  customs_total     : number
  bom_per_unit      : number
  effective_bom     : number
  failure_impact    : number
  onetime_total     : number
  amortized_per_unit: number
  true_cost_per_unit: number
  total_inr         : number
  per_unit_inr      : number
  profit_per_unit   : number
  margin_percent    : number
  total_profit      : number
}

const emptyItem = (order: number): SheetItem => ({
  component_name  : '',
  quantity        : '1',
  unit_price      : '',
  currency        : 'INR',
  customs_percent : '',
  sort_order      : order,
})

const emptyOnetime = (order: number): OnetimeItem => ({
  label     : '',
  amount    : '',
  currency  : 'INR',
  sort_order: order,
})

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 4,
  }).format(n)

function computeItem(item: SheetItem, usdToInr: number) {
  const price      = parseFloat(item.unit_price      || '0') || 0
  const qty        = parseFloat(item.quantity        || '0') || 0
  const customsPct = parseFloat(item.customs_percent || '0') || 0
  const inrPrice   = item.currency === 'USD' ? price * usdToInr : price
  const lineBase   = inrPrice * qty
  const customs    = lineBase * customsPct / 100
  const lineTotal  = lineBase + customs
  return { inrPrice, lineBase, customs, lineTotal, qty, customsPct }
}

function computeTotals(
  items      : SheetItem[],
  onetime    : OnetimeItem[],
  assemblyQty: number,
  failureRate: number,
  usdToInr   : number,
) {
  let bomBase      = 0
  let customsTotal = 0

  items.forEach(it => {
    const { lineBase, customs } = computeItem(it, usdToInr)
    bomBase      += lineBase
    customsTotal += customs
  })

  const bomPerUnit   = bomBase + customsTotal
  const effectiveBom = failureRate > 0 && failureRate < 100
    ? bomPerUnit / (1 - failureRate / 100)
    : bomPerUnit
  const failureImpact = effectiveBom - bomPerUnit

  const onetimeTotal = onetime.reduce((s, ot) => {
    const amt = parseFloat(ot.amount || '0') || 0
    return s + (ot.currency === 'USD' ? amt * usdToInr : amt)
  }, 0)

  const qty              = assemblyQty || 1
  const amortizedPerUnit = qty > 0 ? onetimeTotal / qty : 0
  const trueCostPerUnit  = effectiveBom + amortizedPerUnit

  return {
    bomBase, customsTotal, bomPerUnit,
    effectiveBom, failureImpact,
    onetimeTotal, amortizedPerUnit, trueCostPerUnit,
  }
}

// ── ItemRow outside to prevent remount ──────────────────────────────────────
function ItemRow({
  item, idx, onChange, onRemove, canRemove, usdToInr,
}: {
  item     : SheetItem
  idx      : number
  onChange : (patch: Partial<SheetItem>) => void
  onRemove : () => void
  canRemove: boolean
  usdToInr : number
}) {
  const { inrPrice, lineBase, customs, lineTotal, customsPct } =
    computeItem(item, usdToInr)

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <>
      <tr style={{ borderBottom: customs > 0 ? 'none' : '1px solid var(--border-dim)' }}>
        <td className="px-3 py-2.5 text-xs text-center align-middle"
          style={{ color: 'var(--text-dim)', width: 36 }}>
          {idx + 1}
        </td>
        <td className="px-2 py-2 align-middle">
          <Input
            placeholder="e.g. STM32F103, 10kΩ Resistor"
            value={item.component_name}
            onChange={e => onChange({ component_name: e.target.value })}
            className="h-9 border rounded-lg text-sm"
            style={inputStyle}
          />
        </td>
        <td className="px-2 py-2 align-middle" style={{ width: 80 }}>
          <Input
            type="number" min={0} step="0.0001" placeholder="1"
            value={item.quantity}
            onChange={e => onChange({ quantity: e.target.value })}
            className="h-9 border rounded-lg text-sm text-right"
            style={inputStyle}
          />
        </td>
        <td className="px-2 py-2 align-middle" style={{ width: 96 }}>
          <div className="flex rounded-lg overflow-hidden border"
            style={{ borderColor: 'var(--border-dim)' }}>
            {(['INR', 'USD'] as const).map(c => (
              <button key={c} type="button"
                onClick={() => onChange({ currency: c })}
                className="flex-1 py-1.5 text-[10px] font-bold transition-all"
                style={{
                  background: item.currency === c ? 'var(--accent)' : 'var(--bg-input)',
                  color     : item.currency === c ? '#fff' : 'var(--text-secondary)',
                }}>
                {c === 'INR' ? '₹' : '$'}
              </button>
            ))}
          </div>
        </td>
        <td className="px-2 py-2 align-middle" style={{ width: 120 }}>
          <Input
            type="number" min={0} step="0.0001" placeholder="0.00"
            value={item.unit_price}
            onChange={e => onChange({ unit_price: e.target.value })}
            className="h-9 border rounded-lg text-sm text-right"
            style={inputStyle}
          />
        </td>
        <td className="px-2 py-2 align-middle" style={{ width: 90 }}>
          <div className="relative">
            <Input
              type="number" min={0} max={200} step="0.1" placeholder="0"
              value={item.customs_percent}
              onChange={e => onChange({ customs_percent: e.target.value })}
              className="h-9 border rounded-lg text-sm text-right pr-7"
              style={inputStyle}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
              style={{ color: 'var(--text-dim)' }}>%</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right text-sm align-middle" style={{ width: 130 }}>
          <span className="font-semibold"
            style={{ color: lineBase > 0 ? 'var(--text-primary)' : 'var(--text-dim)' }}>
            {lineBase > 0 ? fmtINR(lineBase) : '—'}
          </span>
          {item.currency === 'USD' && parseFloat(item.unit_price || '0') > 0 && (
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
              {fmtUSD(parseFloat(item.unit_price))} × ₹{usdToInr.toFixed(0)}
            </div>
          )}
        </td>
        <td className="px-3 py-2.5 text-right text-sm font-bold align-middle"
          style={{ color: lineTotal > 0 ? 'var(--accent)' : 'var(--text-dim)', width: 130 }}>
          {lineTotal > 0 ? fmtINR(lineTotal) : '—'}
        </td>
        <td className="px-2 py-2 align-middle" style={{ width: 44 }}>
          {canRemove && (
            <button onClick={onRemove}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
              style={{ borderColor: 'var(--border-dim)', color: '#ef4444' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background = '#ef444410'
                ;(e.currentTarget as HTMLElement).style.borderColor = '#ef444430'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
              }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </td>
      </tr>
      {customs > 0 && (
        <tr style={{ borderBottom: '1px solid var(--border-dim)', background: '#f59e0b05' }}>
          <td />
          <td colSpan={5} className="px-3 pb-2 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold"
                style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}>
                CUSTOMS {customsPct}%
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                {fmtINR(lineBase)} × {customsPct}% = {fmtINR(customs)}
              </span>
            </div>
          </td>
          <td className="px-3 pb-2 pt-0.5 text-right text-xs font-semibold"
            style={{ color: '#f59e0b' }}>+ {fmtINR(customs)}</td>
          <td className="px-3 pb-2 pt-0.5 text-right text-xs font-bold"
            style={{ color: 'var(--accent)' }}>{fmtINR(lineTotal)}</td>
          <td />
        </tr>
      )}
    </>
  )
}

function BomTable({
  items, usdToInr, onChange, onRemove, onAdd,
}: {
  items    : SheetItem[]
  usdToInr : number
  onChange : (idx: number, patch: Partial<SheetItem>) => void
  onRemove : (idx: number) => void
  onAdd    : () => void
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-dim)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                {['#', 'Component', 'Qty', 'Curr.', 'Unit Price', 'Customs %', 'Subtotal (₹)', 'Line Total (₹)', ''].map((h, i) => (
                  <th key={i}
                    className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest ${i >= 4 && i <= 7 ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--text-dim)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <ItemRow
                  key={idx} item={item} idx={idx}
                  onChange={p => onChange(idx, p)}
                  onRemove={() => onRemove(idx)}
                  canRemove={items.length > 1}
                  usdToInr={usdToInr}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium w-full justify-center"
        style={{ borderColor: 'var(--accent-border)', color: 'var(--accent)', background: 'var(--accent-soft)', borderStyle: 'dashed' }}>
        <Plus className="w-3.5 h-3.5" /> Add Component
      </button>
    </div>
  )
}

function ReadOnlySheet({ sheet, usdToInr }: { sheet: Sheet; usdToInr: number }) {
  return (
    <div className="space-y-6">
      {/* BOM table */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-secondary)' }}>
          BOM — Bill of Materials
        </p>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-dim)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                  {['#', 'Component', 'Qty', 'Unit Price', 'Curr.', 'Customs', 'Subtotal (₹)', 'Line Total (₹)'].map((h, i) => (
                    <th key={i}
                      className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest ${i >= 3 ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.items.map((item: any, idx: number) => {
                  const inrPrice   = item.currency === 'USD' ? item.unit_price * usdToInr : item.unit_price
                  const lineBase   = inrPrice * item.quantity
                  const customsPct = item.customs_percent ?? 0
                  const customs    = lineBase * customsPct / 100
                  const lineTotal  = lineBase + customs
                  return (
                    <tr key={item.id}
                      style={{ borderBottom: '1px solid var(--border-dim)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td className="px-4 py-2.5 text-xs text-center" style={{ color: 'var(--text-dim)' }}>{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.component_name}
                        {customs > 0 && (
                          <div className="mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                              +{customsPct}% customs = {fmtINR(customs)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {item.currency === 'USD'
                          ? <>{fmtUSD(item.unit_price)}<br /><span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>≈ {fmtINR(inrPrice)}</span></>
                          : fmtINR(item.unit_price)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                          style={item.currency === 'USD'
                            ? { background: '#3b82f610', color: '#3b82f6' }
                            : { background: '#10b98110', color: '#10b981' }}>
                          {item.currency === 'USD'
                            ? <><DollarSign className="w-2.5 h-2.5" /> USD</>
                            : <><IndianRupee className="w-2.5 h-2.5" /> INR</>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {customsPct > 0
                          ? <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{customsPct}%</span>
                          : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {fmtINR(lineBase)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold" style={{ color: 'var(--accent)' }}>
                        {fmtINR(lineTotal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  <td colSpan={7} className="px-4 py-3 text-xs font-bold uppercase"
                    style={{ color: 'var(--text-secondary)' }}>
                    BOM per unit
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-base font-black" style={{ color: 'var(--accent)' }}>
                      {fmtINR(sheet.bom_per_unit)}
                    </p>
                    {sheet.failure_rate > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>
                        After {sheet.failure_rate}% failure: {fmtINR(sheet.effective_bom)}
                      </p>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* One-time costs */}
      {sheet.onetime.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-secondary)' }}>
            One-time Costs
          </p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-dim)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                  {['#', 'Description', 'Curr.', 'Amount (₹)'].map((h, i) => (
                    <th key={i}
                      className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest ${i >= 3 ? 'text-right' : 'text-left'}`}
                      style={{ color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.onetime.map((ot: any, idx: number) => {
                  const inrAmt = ot.currency === 'USD' ? ot.amount * usdToInr : ot.amount
                  return (
                    <tr key={ot.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <td className="px-4 py-2.5 text-xs text-center" style={{ color: 'var(--text-dim)' }}>{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{ot.label}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={ot.currency === 'USD'
                            ? { background: '#3b82f610', color: '#3b82f6' }
                            : { background: '#10b98110', color: '#10b981' }}>
                          {ot.currency}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold" style={{ color: '#8b5cf6' }}>
                        {fmtINR(inrAmt)}
                        {ot.currency === 'USD' && (
                          <div className="text-[10px] font-normal" style={{ color: 'var(--text-dim)' }}>
                            {fmtUSD(ot.amount)}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase"
                    style={{ color: 'var(--text-secondary)' }}>
                    Total · ÷{sheet.assembly_qty} units = {fmtINR(sheet.amortized_per_unit)}/unit
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-base font-black" style={{ color: '#8b5cf6' }}>
                      {fmtINR(sheet.onetime_total)}
                    </p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CostPriceClient({
  products, sheets, usdToInr,
}: {
  products : Product[]
  sheets   : Sheet[]
  usdToInr : number
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm,     setShowForm]     = useState(false)
  const [selProduct,   setSelProduct]   = useState('')
  const [assemblyQty,  setAssemblyQty]  = useState('1')
  const [failureRate,  setFailureRate]  = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [notes,        setNotes]        = useState('')
  const [items,        setItems]        = useState<SheetItem[]>([emptyItem(0)])
  const [onetime,      setOnetime]      = useState<OnetimeItem[]>([])
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState(false)

  const [editSheet,     setEditSheet]     = useState<Sheet | null>(null)
  const [editItems,     setEditItems]     = useState<SheetItem[]>([])
  const [editOnetime,   setEditOnetime]   = useState<OnetimeItem[]>([])
  const [editAssembly,  setEditAssembly]  = useState('1')
  const [editFailRate,  setEditFailRate]  = useState('')
  const [editSellPrice, setEditSellPrice] = useState('')
  const [editNotes,     setEditNotes]     = useState('')
  const [saving,        setSaving]        = useState(false)
  const [editError,     setEditError]     = useState<string | null>(null)

  const [duplicating,   setDuplicating]   = useState<string | null>(null)
  const [expanded,      setExpanded]      = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)

  // ── Live totals ──
  const liveTotals = computeTotals(
    items, onetime,
    parseInt(assemblyQty) || 1,
    parseFloat(failureRate || '0') || 0,
    usdToInr,
  )

  const editTotals = computeTotals(
    editItems, editOnetime,
    parseInt(editAssembly) || 1,
    parseFloat(editFailRate || '0') || 0,
    usdToInr,
  )

  const updateItem      = (idx: number, p: Partial<SheetItem>) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...p } : it))
  const removeItem      = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx))
  const updateOnetime   = (idx: number, p: Partial<OnetimeItem>) =>
    setOnetime(prev => prev.map((it, i) => i === idx ? { ...it, ...p } : it))
  const removeOnetime   = (idx: number) =>
    setOnetime(prev => prev.filter((_, i) => i !== idx))
  const updateEditItem  = (idx: number, p: Partial<SheetItem>) =>
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, ...p } : it))
  const removeEditItem  = (idx: number) =>
    setEditItems(prev => prev.filter((_, i) => i !== idx))
  const updateEditOT    = (idx: number, p: Partial<OnetimeItem>) =>
    setEditOnetime(prev => prev.map((it, i) => i === idx ? { ...it, ...p } : it))
  const removeEditOT    = (idx: number) =>
    setEditOnetime(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    setError(null)
    if (!selProduct)                               return setError('Please select a product.')
    if (!assemblyQty || parseInt(assemblyQty) < 1) return setError('Assembly quantity must be at least 1.')
    if (items.some(it => !it.component_name.trim() || !it.unit_price))
      return setError('Please fill in all component fields.')

    setSubmitting(true)
    const sb = createClient()
    const existing    = sheets.filter(s => s.product_id === selProduct)
    const nextVersion = existing.length > 0
      ? Math.max(...existing.map(s => s.version)) + 1 : 1

    const { data: sheet, error: sErr } = await sb
      .from('cost_sheets')
      .insert({
        product_id   : selProduct,
        assembly_qty : parseInt(assemblyQty),
        version      : nextVersion,
        notes        : notes || null,
        failure_rate : parseFloat(failureRate  || '0') || 0,
        selling_price: parseFloat(sellingPrice || '0') || 0,
      })
      .select().single()

    if (sErr || !sheet) { setError('Failed: ' + sErr?.message); return setSubmitting(false) }

    await sb.from('cost_sheet_items').insert(
      items.map((it, idx) => ({
        cost_sheet_id  : sheet.id,
        component_name : it.component_name.trim(),
        quantity       : parseFloat(it.quantity),
        unit_price     : parseFloat(it.unit_price),
        currency       : it.currency,
        customs_percent: parseFloat(it.customs_percent || '0') || 0,
        sort_order     : idx,
      }))
    )

    const validOT = onetime.filter(ot => ot.label.trim() && ot.amount)
    if (validOT.length > 0) {
      await sb.from('cost_sheet_onetime').insert(
        validOT.map((ot, idx) => ({
          cost_sheet_id: sheet.id,
          label        : ot.label.trim(),
          amount       : parseFloat(ot.amount),
          currency     : ot.currency,
          sort_order   : idx,
        }))
      )
    }

    setSelProduct(''); setAssemblyQty('1'); setNotes('')
    setFailureRate(''); setSellingPrice('')
    setItems([emptyItem(0)]); setOnetime([])
    setShowForm(false); setSuccess(true); setSubmitting(false)
    startTransition(() => router.refresh())
    setTimeout(() => setSuccess(false), 3000)
  }

  const openEdit = (sheet: Sheet) => {
    setEditSheet(sheet)
    setEditAssembly(String(sheet.assembly_qty))
    setEditNotes(sheet.notes ?? '')
    setEditFailRate(sheet.failure_rate > 0 ? String(sheet.failure_rate) : '')
    setEditSellPrice(sheet.selling_price > 0 ? String(sheet.selling_price) : '')
    setEditItems(sheet.items.map((it: any) => ({
      id              : it.id,
      component_name  : it.component_name,
      quantity        : String(it.quantity),
      unit_price      : String(it.unit_price),
      currency        : it.currency as 'INR' | 'USD',
      customs_percent : it.customs_percent ? String(it.customs_percent) : '',
      sort_order      : it.sort_order,
    })))
    setEditOnetime(sheet.onetime.map((ot: any) => ({
      id        : ot.id,
      label     : ot.label,
      amount    : String(ot.amount),
      currency  : ot.currency as 'INR' | 'USD',
      sort_order: ot.sort_order,
    })))
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    if (!editSheet) return
    setEditError(null)
    if (editItems.some(it => !it.component_name.trim() || !it.unit_price))
      return setEditError('Please fill in all component fields.')

    setSaving(true)
    const sb = createClient()

    await sb.from('cost_sheets').update({
      assembly_qty : parseInt(editAssembly),
      notes        : editNotes || null,
      failure_rate : parseFloat(editFailRate  || '0') || 0,
      selling_price: parseFloat(editSellPrice || '0') || 0,
    }).eq('id', editSheet.id)

    await sb.from('cost_sheet_items').delete().eq('cost_sheet_id', editSheet.id)
    await sb.from('cost_sheet_items').insert(
      editItems.map((it, idx) => ({
        cost_sheet_id  : editSheet.id,
        component_name : it.component_name.trim(),
        quantity       : parseFloat(it.quantity),
        unit_price     : parseFloat(it.unit_price),
        currency       : it.currency,
        customs_percent: parseFloat(it.customs_percent || '0') || 0,
        sort_order     : idx,
      }))
    )

    await sb.from('cost_sheet_onetime').delete().eq('cost_sheet_id', editSheet.id)
    const validOT = editOnetime.filter(ot => ot.label.trim() && ot.amount)
    if (validOT.length > 0) {
      await sb.from('cost_sheet_onetime').insert(
        validOT.map((ot, idx) => ({
          cost_sheet_id: editSheet.id,
          label        : ot.label.trim(),
          amount       : parseFloat(ot.amount),
          currency     : ot.currency,
          sort_order   : idx,
        }))
      )
    }

    setSaving(false); setEditSheet(null)
    startTransition(() => router.refresh())
  }

  const handleDuplicate = async (sheet: Sheet) => {
    setDuplicating(sheet.id)
    const sb = createClient()
    const existing    = sheets.filter(s => s.product_id === sheet.product_id)
    const nextVersion = Math.max(...existing.map(s => s.version)) + 1

    const { data: newSheet } = await sb
      .from('cost_sheets')
      .insert({
        product_id   : sheet.product_id,
        assembly_qty : sheet.assembly_qty,
        version      : nextVersion,
        notes        : `Copy of v${sheet.version}`,
        failure_rate : sheet.failure_rate,
        selling_price: sheet.selling_price,
      })
      .select().single()

    if (newSheet) {
      await sb.from('cost_sheet_items').insert(
        sheet.items.map((it: any, idx: number) => ({
          cost_sheet_id  : newSheet.id,
          component_name : it.component_name,
          quantity       : it.quantity,
          unit_price     : it.unit_price,
          currency       : it.currency,
          customs_percent: it.customs_percent ?? 0,
          sort_order     : idx,
        }))
      )
      if (sheet.onetime.length > 0) {
        await sb.from('cost_sheet_onetime').insert(
          sheet.onetime.map((ot: any, idx: number) => ({
            cost_sheet_id: newSheet.id,
            label        : ot.label,
            amount       : ot.amount,
            currency     : ot.currency,
            sort_order   : idx,
          }))
        )
      }
    }

    setDuplicating(null)
    startTransition(() => router.refresh())
  }

  const handleDelete = async (sheet: Sheet) => {
    setDeleting(sheet.id)
    const sb = createClient()
    await sb.from('cost_sheet_onetime').delete().eq('cost_sheet_id', sheet.id)
    await sb.from('cost_sheet_items').delete().eq('cost_sheet_id', sheet.id)
    await sb.from('cost_sheets').delete().eq('id', sheet.id)
    setDeleting(null); setConfirmDelete(null)
    startTransition(() => router.refresh())
  }

  const sheetToDelete = confirmDelete ? sheets.find(s => s.id === confirmDelete) : null

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  const FailureRateField = ({
    value, onChange,
  }: { value: string; onChange: (v: string) => void }) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
        style={{ color: 'var(--text-secondary)' }}>
        <AlertTriangle className="w-3 h-3" style={{ color: '#ef4444' }} />
        Failure Rate — optional
      </Label>
      <div className="relative">
        <Input
          type="number" min={0} max={99} step="0.1" placeholder="e.g. 2.5"
          value={value} onChange={e => onChange(e.target.value)}
          className="h-11 border rounded-lg text-sm pr-8" style={inputStyle}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none"
          style={{ color: 'var(--text-dim)' }}>%</span>
      </div>
    </div>
  )

  // ── Live selling price totals for form ──
  const liveSelling     = parseFloat(sellingPrice || '0') || 0
  const liveProfit      = liveSelling - liveTotals.trueCostPerUnit
  const liveMargin      = liveSelling > 0 ? (liveProfit / liveSelling) * 100 : 0
  const liveTotalProfit = liveProfit * (parseInt(assemblyQty) || 1)

  const editSelling     = parseFloat(editSellPrice || '0') || 0
  const editProfit      = editSelling - editTotals.trueCostPerUnit
  const editMargin      = editSelling > 0 ? (editProfit / editSelling) * 100 : 0
  const editTotalProfit = editProfit * (parseInt(editAssembly) || 1)

  return (
    <>
      {/* ── Delete Dialog ── */}
      {confirmDelete && sheetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: '#ef444430' }}>
            <div className="px-6 py-5 border-b"
              style={{ borderColor: 'var(--border-dim)', background: '#ef444408' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: '#ef444415', border: '1px solid #ef444430' }}>
                  <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                </div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Delete Cost Sheet?
                </p>
              </div>
              <div className="mt-2 px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {sheetToDelete.product_name}
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    v{sheetToDelete.version}
                  </span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {sheetToDelete.items.length} components · {sheetToDelete.assembly_qty} assemblies
                </p>
              </div>
              <p className="text-xs mt-3" style={{ color: '#ef4444' }}>⚠ This cannot be undone.</p>
            </div>
            <div className="flex gap-3 px-6 py-4">
              <button onClick={() => handleDelete(sheetToDelete)}
                disabled={deleting === sheetToDelete.id}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#ef4444', color: '#fff' }}>
                {deleting === sheetToDelete.id
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                  : <><Trash2 className="w-4 h-4" /> Yes, Delete</>}
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditSheet(null) }}>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
              style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-card)' }}>
              <div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Edit — {editSheet.product_name} v{editSheet.version}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  True cost: {fmtINR(editTotals.trueCostPerUnit)} / unit
                  {editSelling > 0 && ` · Margin: ${editMargin.toFixed(1)}%`}
                </p>
              </div>
              <button onClick={() => setEditSheet(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>Assembly Quantity</Label>
                  <Input type="number" min={1} value={editAssembly}
                    onChange={e => setEditAssembly(e.target.value)}
                    className="h-11 border rounded-lg text-sm" style={inputStyle} />
                </div>
                <FailureRateField value={editFailRate} onChange={setEditFailRate} />
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>Notes — optional</Label>
                  <Input placeholder="e.g. Rev B" value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="h-11 border rounded-lg text-sm" style={inputStyle} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  BOM — Bill of Materials
                </p>
                <BomTable
                  items={editItems} usdToInr={usdToInr}
                  onChange={updateEditItem} onRemove={removeEditItem}
                  onAdd={() => setEditItems(p => [...p, emptyItem(p.length)])}
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  One-time Costs
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-dim)' }}>
                    Engineering, certification, licensing etc.
                  </span>
                </p>
                {editOnetime.length === 0 ? (
                  <button
                    onClick={() => setEditOnetime([emptyOnetime(0)])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium w-full justify-center"
                    style={{ borderColor: '#f59e0b30', color: '#f59e0b', background: '#f59e0b08', borderStyle: 'dashed' }}>
                    <Plus className="w-3.5 h-3.5" /> Add One-time Cost
                  </button>
                ) : (
                  <OnetimeTable
                    items={editOnetime} usdToInr={usdToInr}
                    onChange={updateEditOT} onRemove={removeEditOT}
                    onAdd={() => setEditOnetime(p => [...p, emptyOnetime(p.length)])}
                  />
                )}
              </div>

              <SellingPriceInput
                value={editSellPrice}
                onChange={setEditSellPrice}
                trueCostPerUnit={editTotals.trueCostPerUnit}
              />

              {/* Live cost breakup in edit modal */}
              {editTotals.trueCostPerUnit > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Cost Breakup Preview
                  </p>
                  <CostBreakup
                    bomBase          ={editTotals.bomBase}
                    customsTotal     ={editTotals.customsTotal}
                    bomPerUnit       ={editTotals.bomPerUnit}
                    effectiveBom     ={editTotals.effectiveBom}
                    failureImpact    ={editTotals.failureImpact}
                    failureRate      ={parseFloat(editFailRate || '0') || 0}
                    onetimeTotal     ={editTotals.onetimeTotal}
                    amortizedPerUnit ={editTotals.amortizedPerUnit}
                    trueCostPerUnit  ={editTotals.trueCostPerUnit}
                    sellingPrice     ={editSelling}
                    profitPerUnit    ={editProfit}
                    marginPercent    ={editMargin}
                    totalProfit      ={editTotalProfit}
                    assemblyQty      ={parseInt(editAssembly) || 1}
                  />
                </div>
              )}

              {editError && (
                <div className="px-4 py-3 rounded-lg text-sm"
                  style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
                  ⚠ {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t"
                style={{ borderColor: 'var(--border-dim)' }}>
                <button onClick={() => setEditSheet(null)}
                  className="px-4 py-2.5 rounded-lg text-sm border"
                  style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 md:px-10 py-8 space-y-8">

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <Plus className="w-4 h-4" /> New Cost Sheet
          </button>
        )}

        {success && (
          <div className="px-4 py-3 rounded-lg text-sm"
            style={{ background: '#10b98110', border: '1px solid #10b98128', color: '#10b981' }}>
            ✓ Cost sheet saved!
          </div>
        )}

        {/* ── Create form ── */}
        {showForm && (
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)', boxShadow: '0 0 0 1px #3b82f615, 0 8px 32px #3b82f610' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent-border)' }}>
                  <Calculator className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    New Cost Sheet
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    BOM + one-time costs + margin
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); setError(null) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>
                    Product <span style={{ color: '#ef4444' }}>*</span>
                  </Label>
                  <Select value={selProduct} onValueChange={setSelProduct}>
                    <SelectTrigger className="h-11 border rounded-lg text-sm" style={inputStyle}>
                      <SelectValue placeholder="Select product…" />
                    </SelectTrigger>
                    <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}
                          style={{ color: 'var(--text-primary)' }}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>
                    Assembly Qty <span style={{ color: '#ef4444' }}>*</span>
                  </Label>
                  <Input type="number" min={1} placeholder="e.g. 100"
                    value={assemblyQty} onChange={e => setAssemblyQty(e.target.value)}
                    className="h-11 border rounded-lg text-sm" style={inputStyle} />
                </div>
                <FailureRateField value={failureRate} onChange={setFailureRate} />
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>Notes — optional</Label>
                  <Input placeholder="e.g. Q1 2025" value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="h-11 border rounded-lg text-sm" style={inputStyle} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  BOM — Bill of Materials
                </p>
                <BomTable
                  items={items} usdToInr={usdToInr}
                  onChange={updateItem} onRemove={removeItem}
                  onAdd={() => setItems(p => [...p, emptyItem(p.length)])}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    One-time Costs
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-dim)' }}>
                      optional — NRE, Certification, Licensing etc.
                    </span>
                  </p>
                  {liveTotals.onetimeTotal > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                      {fmtINR(liveTotals.onetimeTotal)} ÷ {parseInt(assemblyQty) || 1} units = {fmtINR(liveTotals.amortizedPerUnit)}/unit
                    </p>
                  )}
                </div>
                {onetime.length === 0 ? (
                  <button onClick={() => setOnetime([emptyOnetime(0)])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium w-full justify-center"
                    style={{ borderColor: '#f59e0b30', color: '#f59e0b', background: '#f59e0b08', borderStyle: 'dashed' }}>
                    <Plus className="w-3.5 h-3.5" /> Add One-time Cost
                  </button>
                ) : (
                  <OnetimeTable
                    items={onetime} usdToInr={usdToInr}
                    onChange={updateOnetime} onRemove={removeOnetime}
                    onAdd={() => setOnetime(p => [...p, emptyOnetime(p.length)])}
                  />
                )}
              </div>

              <SellingPriceInput
                value={sellingPrice}
                onChange={setSellingPrice}
                trueCostPerUnit={liveTotals.trueCostPerUnit}
              />

              {/* Live breakup preview in form */}
              {liveTotals.trueCostPerUnit > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Live Cost Breakup
                  </p>
                  <CostBreakup
                    bomBase          ={liveTotals.bomBase}
                    customsTotal     ={liveTotals.customsTotal}
                    bomPerUnit       ={liveTotals.bomPerUnit}
                    effectiveBom     ={liveTotals.effectiveBom}
                    failureImpact    ={liveTotals.failureImpact}
                    failureRate      ={parseFloat(failureRate || '0') || 0}
                    onetimeTotal     ={liveTotals.onetimeTotal}
                    amortizedPerUnit ={liveTotals.amortizedPerUnit}
                    trueCostPerUnit  ={liveTotals.trueCostPerUnit}
                    sellingPrice     ={liveSelling}
                    profitPerUnit    ={liveProfit}
                    marginPercent    ={liveMargin}
                    totalProfit      ={liveTotalProfit}
                    assemblyQty      ={parseInt(assemblyQty) || 1}
                  />
                </div>
              )}

              {error && (
                <div className="px-4 py-3 rounded-lg text-sm"
                  style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
                  ⚠ {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t"
                style={{ borderColor: 'var(--border-dim)' }}>
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  <Save className="w-4 h-4" />
                  {submitting ? 'Saving…' : 'Save Cost Sheet'}
                </button>
                <button onClick={() => { setShowForm(false); setError(null) }}
                  className="px-4 py-2.5 rounded-lg text-sm border"
                  style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Sheets list ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Cost Sheets
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              {sheets.length} sheets
            </span>
          </div>

          {sheets.length === 0 ? (
            <div className="rounded-2xl border py-16 text-center"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
              <Calculator className="w-10 h-10 mx-auto mb-3 opacity-20"
                style={{ color: 'var(--text-primary)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No cost sheets yet — create your first one above
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sheets.map(sheet => (
                <div key={sheet.id}
                  className="rounded-2xl border overflow-hidden"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)', boxShadow: '0 0 0 1px #3b82f608, 0 4px 16px rgba(0,0,0,0.08)' }}>

                  {/* ── Card header ── */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors"
                    style={{ background: 'var(--bg-secondary)' }}
                    onClick={() => setExpanded(expanded === sheet.id ? null : sheet.id)}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                        {sheet.product_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {sheet.product_name}
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                            v{sheet.version}
                          </span>
                          {sheet.failure_rate > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
                              style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444330' }}>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {sheet.failure_rate}% fail
                            </span>
                          )}
                          {sheet.selling_price > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                background: sheet.margin_percent >= 20 ? '#10b98115' : sheet.margin_percent > 0 ? '#f59e0b15' : '#ef444415',
                                color      : sheet.margin_percent >= 20 ? '#10b981'   : sheet.margin_percent > 0 ? '#f59e0b'   : '#ef4444',
                                border     : `1px solid ${sheet.margin_percent >= 20 ? '#10b98130' : sheet.margin_percent > 0 ? '#f59e0b30' : '#ef444430'}`,
                              }}>
                              {sheet.margin_percent.toFixed(1)}% margin
                            </span>
                          )}
                          {sheet.notes && (
                            <span className="text-xs italic" style={{ color: 'var(--text-dim)' }}>
                              · {sheet.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {format(new Date(sheet.created_at), 'dd MMM yyyy, hh:mm a')}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                            · {sheet.assembly_qty} units · {sheet.items.length} components
                            {sheet.onetime.length > 0 && ` · ${sheet.onetime.length} one-time`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right hidden sm:block mr-2">
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>True cost / unit</p>
                        <p className="text-sm font-black" style={{ color: 'var(--accent)' }}>
                          {fmtINR(sheet.true_cost_per_unit)}
                        </p>
                        {sheet.selling_price > 0 && (
                          <p className="text-xs font-semibold"
                            style={{ color: sheet.profit_per_unit >= 0 ? '#10b981' : '#ef4444' }}>
                            {sheet.profit_per_unit >= 0 ? '+' : ''}{fmtINR(sheet.profit_per_unit)}/unit
                          </p>
                        )}
                      </div>

                      <button onClick={e => { e.stopPropagation(); openEdit(sheet) }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                        style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                        }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button onClick={e => { e.stopPropagation(); handleDuplicate(sheet) }}
                        disabled={duplicating === sheet.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all disabled:opacity-50"
                        style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.color = '#8b5cf6'
                          ;(e.currentTarget as HTMLElement).style.borderColor = '#8b5cf630'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                        }}>
                        {duplicating === sheet.id
                          ? <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                              style={{ borderColor: '#8b5cf630', borderTopColor: '#8b5cf6' }} />
                          : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(sheet.id) }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                        style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.color = '#ef4444'
                          ;(e.currentTarget as HTMLElement).style.borderColor = '#ef444430'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                        }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {expanded === sheet.id
                        ? <ChevronUp   className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
                    </div>
                  </div>

                  {/* ── Compact breakup — always visible ── */}
                  <div className="px-5 pb-4 border-t"
                    style={{ borderColor: 'var(--border-dim)' }}>
                    <CostBreakup
                      bomBase          ={sheet.bom_base}
                      customsTotal     ={sheet.customs_total}
                      bomPerUnit       ={sheet.bom_per_unit}
                      effectiveBom     ={sheet.effective_bom}
                      failureImpact    ={sheet.failure_impact}
                      failureRate      ={sheet.failure_rate}
                      onetimeTotal     ={sheet.onetime_total}
                      amortizedPerUnit ={sheet.amortized_per_unit}
                      trueCostPerUnit  ={sheet.true_cost_per_unit}
                      sellingPrice     ={sheet.selling_price}
                      profitPerUnit    ={sheet.profit_per_unit}
                      marginPercent    ={sheet.margin_percent}
                      totalProfit      ={sheet.total_profit}
                      assemblyQty      ={sheet.assembly_qty}
                      compact
                    />
                  </div>

                  {/* ── Expanded — full detail ── */}
                  {expanded === sheet.id && (
                    <div className="p-5 border-t space-y-6"
                      style={{ borderColor: 'var(--border-dim)' }}>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-3"
                          style={{ color: 'var(--text-secondary)' }}>
                          Full Cost Breakup
                        </p>
                        <CostBreakup
                          bomBase          ={sheet.bom_base}
                          customsTotal     ={sheet.customs_total}
                          bomPerUnit       ={sheet.bom_per_unit}
                          effectiveBom     ={sheet.effective_bom}
                          failureImpact    ={sheet.failure_impact}
                          failureRate      ={sheet.failure_rate}
                          onetimeTotal     ={sheet.onetime_total}
                          amortizedPerUnit ={sheet.amortized_per_unit}
                          trueCostPerUnit  ={sheet.true_cost_per_unit}
                          sellingPrice     ={sheet.selling_price}
                          profitPerUnit    ={sheet.profit_per_unit}
                          marginPercent    ={sheet.margin_percent}
                          totalProfit      ={sheet.total_profit}
                          assemblyQty      ={sheet.assembly_qty}
                        />
                      </div>
                      <ReadOnlySheet sheet={sheet} usdToInr={usdToInr} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}