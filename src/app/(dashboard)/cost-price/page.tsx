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
      id, product_id, assembly_qty, version, notes,
      failure_rate, selling_price, created_at,
      products ( name ),
      cost_sheet_items (
        id, cost_sheet_id, component_name,
        quantity, unit_price, currency, customs_percent, sort_order
      ),
      cost_sheet_onetime (
        id, cost_sheet_id, label, amount, currency, sort_order
      )
    `)
    .order('created_at', { ascending: false })

  const usdToInr = await getUsdRate()

  const sheets = (sheetsRaw ?? []).map((s: any) => {
    const items   = (s.cost_sheet_items   ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)
    const onetime = (s.cost_sheet_onetime ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)

    const failureRate = s.failure_rate ?? 0

    // BOM base (components only, no customs)
    let bomBase     = 0
    let customsTotal = 0

    items.forEach((item: any) => {
      const priceInr = item.currency === 'USD'
        ? item.unit_price * usdToInr
        : item.unit_price
      const lineBase = priceInr * item.quantity
      const customs  = lineBase * (item.customs_percent ?? 0) / 100
      bomBase      += lineBase
      customsTotal += customs
    })

    const bomPerUnit     = bomBase + customsTotal

    // Effective BOM after failure rate
    const effectiveBom = failureRate > 0 && failureRate < 100
      ? bomPerUnit / (1 - failureRate / 100)
      : bomPerUnit

    const failureImpact = effectiveBom - bomPerUnit

    // One-time costs
    const onetimeTotal = onetime.reduce((sum: number, ot: any) => {
      const inr = ot.currency === 'USD' ? ot.amount * usdToInr : ot.amount
      return sum + inr
    }, 0)

    const amortizedPerUnit = s.assembly_qty > 0 ? onetimeTotal / s.assembly_qty : 0
    const trueCostPerUnit  = effectiveBom + amortizedPerUnit

    // Selling & margin
    const sellingPrice  = s.selling_price ?? 0
    const profitPerUnit = sellingPrice - trueCostPerUnit
    const marginPercent = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0
    const totalProfit   = profitPerUnit * s.assembly_qty

    return {
      id                : s.id,
      product_id        : s.product_id,
      product_name      : s.products?.name ?? '—',
      assembly_qty      : s.assembly_qty,
      version           : s.version,
      notes             : s.notes,
      failure_rate      : failureRate,
      selling_price     : sellingPrice,
      created_at        : s.created_at,
      items,
      onetime,
      bom_base          : bomBase,
      customs_total     : customsTotal,
      bom_per_unit      : bomPerUnit,
      effective_bom     : effectiveBom,
      failure_impact    : failureImpact,
      onetime_total     : onetimeTotal,
      amortized_per_unit: amortizedPerUnit,
      true_cost_per_unit: trueCostPerUnit,
      total_inr         : trueCostPerUnit * s.assembly_qty,
      per_unit_inr      : trueCostPerUnit,
      profit_per_unit   : profitPerUnit,
      margin_percent    : marginPercent,
      total_profit      : totalProfit,
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
                BOM · One-time costs · Margin analysis
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