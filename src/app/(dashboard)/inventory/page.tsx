export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import InscanSection  from '@/components/inventory/inscan-section'
import OutscanSection from '@/components/inventory/outscan-section'
import OutscanLog     from '@/components/inventory/outscan-log'
import StockTable     from '@/components/inventory/stock-table'
import { PackageSearch } from 'lucide-react'

type LogRow = {
  id             : string
  material_id    : string
  stock_entry_id : string
  quantity_taken : number
  reason         : string | null
  taken_at       : string
  created_at     : string
  materials      : { name: string } | null
  stock_entries  : { vendor_id: string; vendors: { name: string } | null } | null
}

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: vendors        } = await supabase.from('vendors').select('id, name').order('name')
  const { data: materials      } = await supabase.from('materials').select('id, name, type, description').order('name')
  const { data: stock          } = await supabase.from('stock_summary').select('*').order('material_name')
  const { data: componentTypes } = await supabase.from('component_types').select('name').order('name')

  const typeNames = componentTypes?.map(t => t.name) ?? [
    'IC / Microcontroller',
    'Passive Component',
    'Sensor / Module',
    'Connector / Cable',
    'Other',
  ]

  const { data: logRows } = await supabase
    .from('stock_outscans')
    .select(`
      id, material_id, stock_entry_id, quantity_taken, reason, taken_at, created_at,
      materials ( name ),
      stock_entries ( vendor_id, vendors ( name ) )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const outscans = ((logRows as unknown as LogRow[]) ?? []).map(r => ({
    id             : r.id,
    material_id    : r.material_id,
    stock_entry_id : r.stock_entry_id,
    quantity_taken : r.quantity_taken,
    reason         : r.reason,
    taken_at       : r.taken_at,
    created_at     : r.created_at,
    material_name  : r.materials?.name              ?? '—',
    vendor_name    : r.stock_entries?.vendors?.name ?? '—',
  }))

  return (
    <div className="min-h-screen grid-bg animate-fade-up">

      {/* Header */}
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center glow-blue"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <PackageSearch className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Inventory
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Inscan incoming stock and log outscans
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-10">
        <InscanSection
          vendors={vendors     ?? []}
          materials={materials ?? []}
          types={typeNames}
        />
        <StockTable
          stock={stock     ?? []}
          vendors={vendors ?? []}
        />
        <OutscanSection
          stock={stock       ?? []}
          materials={materials ?? []}
        />
        <OutscanLog logs={outscans} />
      </div>
    </div>
  )
}