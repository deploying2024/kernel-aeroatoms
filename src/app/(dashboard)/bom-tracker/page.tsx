import { createClient } from '@/lib/supabase/server'
import BomTrackerClient from '@/components/bom-tracker/bom-tracker-client'
import { Layers } from 'lucide-react'

export default async function BomTrackerPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .order('name')

  const { data: materials } = await supabase
    .from('materials')
    .select('id, name, type, description')
    .order('name')

  // ── Step 1: Total inscanned per material ──
  const { data: stockEntries } = await supabase
    .from('stock_entries')
    .select('id, material_id, quantity')

  // ── Step 2: Total outscanned per stock_entry ──
  const { data: stockOutscans } = await supabase
    .from('stock_outscans')
    .select('stock_entry_id, quantity_taken')

  // Build outscanned totals per stock_entry_id
  const outPerEntry = new Map<string, number>()
  ;(stockOutscans ?? []).forEach((o: any) => {
    const prev = outPerEntry.get(o.stock_entry_id) ?? 0
    outPerEntry.set(o.stock_entry_id, prev + (o.quantity_taken ?? 0))
  })

  // Build stock map per material_id
  const stockMap = new Map<string, { remaining: number; inscanned: number }>()
  ;(stockEntries ?? []).forEach((e: any) => {
    const mid       = e.material_id
    const inscanned = e.quantity ?? 0
    const outscanned = outPerEntry.get(e.id) ?? 0
    const remaining  = Math.max(0, inscanned - outscanned)

    const prev = stockMap.get(mid) ?? { remaining: 0, inscanned: 0 }
    stockMap.set(mid, {
      inscanned: prev.inscanned + inscanned,
      remaining: prev.remaining + remaining,
    })
  })

  // ── Step 3: BOM links ──
  const { data: bomLinks } = await supabase
    .from('product_bom_materials')
    .select(`
      id, product_id, material_id, quantity_needed, notes,
      materials ( id, name, type, description )
    `)

  const bomMap = new Map<string, any[]>()
  ;(bomLinks ?? []).forEach((b: any) => {
    if (!bomMap.has(b.product_id)) bomMap.set(b.product_id, [])
    const s = stockMap.get(b.material_id) ?? { remaining: 0, inscanned: 0 }
    bomMap.get(b.product_id)!.push({
      id             : b.id,
      product_id     : b.product_id,
      material_id    : b.material_id,
      quantity_needed: b.quantity_needed,
      notes          : b.notes,
      material_name  : b.materials?.name        ?? '—',
      material_type  : b.materials?.type        ?? '—',
      material_desc  : b.materials?.description ?? null,
      stock_remaining: s.remaining,
      stock_inscanned: s.inscanned,
    })
  })

  const productsWithBom = (products ?? []).map((p: any) => ({
    id  : p.id,
    name: p.name,
    bom : bomMap.get(p.id) ?? [],
  }))

  return (
    <div className="min-h-screen grid-bg animate-fade-up">
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <Layers className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}>
              BOM Tracker
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Live inventory health per product BOM
            </p>
          </div>
        </div>
      </div>

      <BomTrackerClient
        products={productsWithBom}
        allMaterials={materials ?? []}
      />
    </div>
  )
}