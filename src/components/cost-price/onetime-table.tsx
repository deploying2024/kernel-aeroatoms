'use client'

import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

export type OnetimeItem = {
  id?       : string
  label     : string
  amount    : string
  currency  : 'INR' | 'USD'
  sort_order: number
}

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)

function OnetimeRow({
  item, idx, onChange, onRemove, canRemove, usdToInr,
}: {
  item     : OnetimeItem
  idx      : number
  onChange : (patch: Partial<OnetimeItem>) => void
  onRemove : () => void
  canRemove: boolean
  usdToInr : number
}) {
  const amount  = parseFloat(item.amount || '0') || 0
  const inrAmt  = item.currency === 'USD' ? amount * usdToInr : amount

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <td className="px-3 py-2.5 text-xs text-center align-middle"
        style={{ color: 'var(--text-dim)', width: 36 }}>
        {idx + 1}
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          placeholder="e.g. Engineering NRE, CE Certification, FCC Testing"
          value={item.label}
          onChange={e => onChange({ label: e.target.value })}
          className="h-9 border rounded-lg text-sm"
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
                background: item.currency === c ? '#f59e0b' : 'var(--bg-input)',
                color     : item.currency === c ? '#fff' : 'var(--text-secondary)',
              }}>
              {c === 'INR' ? '₹' : '$'}
            </button>
          ))}
        </div>
      </td>
      <td className="px-2 py-2 align-middle" style={{ width: 140 }}>
        <Input
          type="number" min={0} step="0.01" placeholder="0.00"
          value={item.amount}
          onChange={e => onChange({ amount: e.target.value })}
          className="h-9 border rounded-lg text-sm text-right"
          style={inputStyle}
        />
      </td>
      <td className="px-3 py-2.5 text-right text-sm font-bold align-middle"
        style={{ color: inrAmt > 0 ? '#f59e0b' : 'var(--text-dim)', width: 140 }}>
        {inrAmt > 0 ? fmtINR(inrAmt) : '—'}
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
  )
}

export default function OnetimeTable({
  items, usdToInr, onChange, onRemove, onAdd,
}: {
  items    : OnetimeItem[]
  usdToInr : number
  onChange : (idx: number, patch: Partial<OnetimeItem>) => void
  onRemove : (idx: number) => void
  onAdd    : () => void
}) {
  const total = items.reduce((s, it) => {
    const amt = parseFloat(it.amount || '0') || 0
    return s + (it.currency === 'USD' ? amt * usdToInr : amt)
  }, 0)

  const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 2,
    }).format(n)

  return (
    <div className="space-y-3">
      <div className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--border-dim)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-dim)' }}>
                {['#', 'Description', 'Curr.', 'Amount', 'Total (₹)', ''].map((h, i) => (
                  <th key={i}
                    className={`px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest ${i >= 3 && i <= 4 ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--text-dim)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <OnetimeRow
                  key={idx} item={item} idx={idx}
                  onChange={p => onChange(idx, p)}
                  onRemove={() => onRemove(idx)}
                  canRemove={items.length > 1}
                  usdToInr={usdToInr}
                />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                <td colSpan={4} className="px-3 py-3 text-xs font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}>
                  Total one-time costs
                </td>
                <td className="px-3 py-3 text-right">
                  <p className="text-base font-black" style={{ color: '#f59e0b' }}>
                    {fmtINR(total)}
                  </p>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium w-full justify-center"
        style={{ borderColor: '#f59e0b30', color: '#f59e0b', background: '#f59e0b08', borderStyle: 'dashed' }}>
        <Plus className="w-3.5 h-3.5" /> Add One-time Cost
      </button>
    </div>
  )
}