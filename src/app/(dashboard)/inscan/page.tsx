export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import InscanSection from '@/components/inventory/inscan-section'
import InscanLog     from '@/components/inventory/inscan-log'
import StockTable    from '@/components/inventory/stock-table'
import { PackagePlus } from 'lucide-react'

type InscanRow = {
  id          : string
  material_id : string
  vendor_id   : string | null
  quantity    : number
  unit_cost   : number | null
  notes       : string | null
  received_at : string
  created_at  : string
  materials   : { name: string; type: string } | null
  vendors     : { name: string } | null
}

export default async function InscanPage() {
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

  const { data: inscanRows } = await supabase
    .from('stock_entries')
    .select(`
      id, material_id, vendor_id, quantity, unit_cost, notes, received_at, created_at,
      materials ( name, type ),
      vendors   ( name )
    `)
    .order('received_at', { ascending: false })
    .limit(100)

  const inscanLogs = ((inscanRows as unknown as InscanRow[]) ?? []).map(r => ({
    id           : r.id,
    material_id  : r.material_id,
    material_name: r.materials?.name     ?? '—',
    material_type: r.materials?.type     ?? '—',
    vendor_name  : r.vendors?.name       ?? '—',
    quantity     : r.quantity,
    unit_cost    : r.unit_cost,
    notes        : r.notes,
    received_at  : r.received_at,
    created_at   : r.created_at,
  }))

  return (
    <div className="min-h-screen grid-bg animate-fade-up">
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center glow-blue"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <PackagePlus className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Inscan
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Add incoming stock and view current inventory
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
        <InscanLog logs={inscanLogs} vendors={vendors ?? []} />
      </div>
    </div>
  )
}