import { createClient } from '@/lib/supabase/server'
import InventoryValueClient from '@/components/inventory/inventory-value-client'
import { BarChart3 } from 'lucide-react'

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

export default async function InventoryValuePage() {
  const supabase = await createClient()

  // Fetch all stock entries with pricing
  const { data: stockEntries } = await supabase
    .from('stock_entries')
    .select(`
      id, material_id, quantity, unit_cost, currency, customs_percent,
      materials ( id, name, type, description )
    `)

  // Fetch outscans to compute remaining
  const { data: outscans } = await supabase
    .from('stock_outscans')
    .select('stock_entry_id, quantity_taken')

  // Fetch vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')

  // Fetch vendor per entry
  const { data: entriesWithVendor } = await supabase
    .from('stock_entries')
    .select('id, vendor_id, vendors(name)')

  const usdToInr = await getUsdRate()

  // Build outscanned map
  const outMap = new Map<string, number>()
  ;(outscans ?? []).forEach((o: any) => {
    outMap.set(o.stock_entry_id, (outMap.get(o.stock_entry_id) ?? 0) + o.quantity_taken)
  })

  // Build vendor map
  const vendorMap = new Map<string, string>()
  ;(entriesWithVendor ?? []).forEach((e: any) => {
    if (e.vendors?.name) vendorMap.set(e.id, e.vendors.name)
  })

  // Build material value map
  type MaterialValue = {
    material_id  : string
    material_name: string
    material_type: string
    description  : string | null
    total_qty    : number
    remaining_qty: number
    value_inr    : number
    value_usd    : number
    has_price    : boolean
    vendor_name  : string
    entries      : {
      id             : string
      quantity       : number
      remaining      : number
      unit_cost      : number | null
      currency       : string
      customs_percent: number
      landed_inr     : number
      landed_usd     : number
    }[]
  }

  const materialMap = new Map<string, MaterialValue>()

  ;(stockEntries ?? []).forEach((e: any) => {
    const mid          = e.material_id
    const inscanned    = e.quantity ?? 0
    const outscanned   = outMap.get(e.id) ?? 0
    const remaining    = Math.max(0, inscanned - outscanned)
    const currency     = e.currency ?? 'USD'
    const unitCost     = e.unit_cost ?? 0
    const customsPct   = e.customs_percent ?? 0
    const vendor       = vendorMap.get(e.id) ?? '—'

    // Compute landed cost per unit in both currencies
    const costWithCustoms = unitCost > 0
      ? unitCost + (unitCost * customsPct / 100)
      : 0

    let landedInr = 0
    let landedUsd = 0

    if (costWithCustoms > 0) {
      if (currency === 'INR') {
        landedInr = costWithCustoms
        landedUsd = costWithCustoms / usdToInr
      } else {
        landedUsd = costWithCustoms
        landedInr = costWithCustoms * usdToInr
      }
    }

    const entryValueInr = landedInr * remaining
    const entryValueUsd = landedUsd * remaining

    if (!materialMap.has(mid)) {
      materialMap.set(mid, {
        material_id  : mid,
        material_name: e.materials?.name        ?? '—',
        material_type: e.materials?.type        ?? 'Other',
        description  : e.materials?.description ?? null,
        total_qty    : 0,
        remaining_qty: 0,
        value_inr    : 0,
        value_usd    : 0,
        has_price    : false,
        vendor_name  : vendor,
        entries      : [],
      })
    }

    const mat = materialMap.get(mid)!
    mat.total_qty     += inscanned
    mat.remaining_qty += remaining
    mat.value_inr     += entryValueInr
    mat.value_usd     += entryValueUsd
    if (costWithCustoms > 0) mat.has_price = true

    mat.entries.push({
      id             : e.id,
      quantity       : inscanned,
      remaining,
      unit_cost      : e.unit_cost,
      currency,
      customs_percent: customsPct,
      landed_inr     : landedInr,
      landed_usd     : landedUsd,
    })
  })

  const materials = Array.from(materialMap.values())
    .sort((a, b) => b.value_inr - a.value_inr)

  const totalValueInr = materials.reduce((s, m) => s + m.value_inr, 0)
  const totalValueUsd = totalValueInr / usdToInr

  // By category
  const byCategory = new Map<string, { inr: number; usd: number; count: number }>()
  materials.forEach(m => {
    const cat = m.material_type
    if (!byCategory.has(cat)) byCategory.set(cat, { inr: 0, usd: 0, count: 0 })
    const c = byCategory.get(cat)!
    c.inr += m.value_inr
    c.usd += m.value_usd
    c.count++
  })

  const categories = Array.from(byCategory.entries())
    .map(([name, vals]) => ({ name, ...vals }))
    .sort((a, b) => b.inr - a.inr)

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
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}>
                Inventory Value
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Total worth with USD ↔ INR conversion · customs included
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

      <InventoryValueClient
        materials={materials}
        categories={categories}
        totalValueInr={totalValueInr}
        totalValueUsd={totalValueUsd}
        usdToInr={usdToInr}
      />
    </div>
  )
}