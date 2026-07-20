'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tag } from 'lucide-react'

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n)

export default function SellingPriceInput({
  value,
  onChange,
  trueCostPerUnit,
}: {
  value          : string
  onChange       : (v: string) => void
  trueCostPerUnit: number
}) {
  const selling     = parseFloat(value || '0') || 0
  const profit      = selling - trueCostPerUnit
  const margin      = selling > 0 ? (profit / selling) * 100 : 0
  const isProfit    = profit >= 0
  const isHealthy   = margin >= 20

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
        style={{ color: 'var(--text-secondary)' }}>
        <Tag className="w-3 h-3" style={{ color: '#10b981' }} />
        Selling Price / unit — optional
      </Label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none"
            style={{ color: 'var(--text-dim)' }}>₹</span>
          <Input
            type="number" min={0} step="0.01" placeholder="0.00"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="h-11 border rounded-lg text-sm pl-7"
            style={inputStyle}
          />
        </div>
        {selling > 0 && trueCostPerUnit > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-lg border"
            style={{
              background  : isProfit ? (isHealthy ? '#10b98110' : '#f59e0b10') : '#ef444410',
              borderColor : isProfit ? (isHealthy ? '#10b98130' : '#f59e0b30') : '#ef444430',
            }}
          >
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Margin</p>
              <p className="text-lg font-black"
                style={{ color: isProfit ? (isHealthy ? '#10b981' : '#f59e0b') : '#ef4444' }}>
                {margin.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Profit/unit</p>
              <p className="text-sm font-bold"
                style={{ color: isProfit ? '#10b981' : '#ef4444' }}>
                {isProfit ? '+' : ''}{fmtINR(profit)}
              </p>
            </div>
          </div>
        )}
      </div>
      {selling > 0 && selling < trueCostPerUnit && (
        <p className="text-xs px-3 py-2 rounded-lg"
          style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
          ⚠ Selling price is below cost — you will lose {fmtINR(Math.abs(profit))} per unit
        </p>
      )}
    </div>
  )
}