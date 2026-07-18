export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import CostPriceClient from '@/components/cost-price/cost-price-client'
import { Calculator } from 'lucide-react'

async function getUsdRate(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=INR',
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return data.rates.INR ?? 84
  } catch {
    return 84
  }
}

export default async function CostPricePage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .order('name')

  const { data: sheetsRaw } = await supabase
    .from('cost_sheets')
    .select(`
      id, product_id, assembly_qty, version, notes, failure_rate, created_at,
      products ( name ),
      cost_sheet_items (
        id, cost_sheet_id, component_name,
        quantity, unit_price, currency, customs_percent, sort_order
      )
    `)
    .order('created_at', { ascending: false })

  const usdToInr = await getUsdRate()

  const sheets = (sheetsRaw ?? []).map((s: any) => {
    const items = (s.cost_sheet_items ?? []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    )
    const failureRate = s.failure_rate ?? 0
    const perUnit = items.reduce((sum: number, item: any) => {
      const priceInr   = item.currency === 'USD'
        ? item.unit_price * usdToInr
        : item.unit_price
      const lineBase   = priceInr * item.quantity
      const customs    = lineBase * (item.customs_percent ?? 0) / 100
      return sum + lineBase + customs
    }, 0)
    // Effective per unit = BOM cost / (1 - failure_rate/100)
    const effectivePerUnit = failureRate > 0 && failureRate < 100
      ? perUnit / (1 - failureRate / 100)
      : perUnit
    return {
      id                : s.id,
      product_id        : s.product_id,
      product_name      : s.products?.name ?? '—',
      assembly_qty      : s.assembly_qty,
      version           : s.version,
      notes             : s.notes,
      failure_rate      : failureRate,
      created_at        : s.created_at,
      items,
      bom_per_unit      : perUnit,
      total_inr         : effectivePerUnit * s.assembly_qty,
      per_unit_inr      : effectivePerUnit,
    }
  })

  return (
    <div className="min-h-screen grid-bg animate-fade-up">
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center glow-blue"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
            >
              <Calculator className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}>
                Cost Price
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Build and track product cost sheets with live USD/INR conversion
              </p>
            </div>
          </div>
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              1 USD = ₹{usdToInr.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <CostPriceClient
        products={products ?? []}
        sheets={sheets}
        usdToInr={usdToInr}
      />
    </div>
  )
}