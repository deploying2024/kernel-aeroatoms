export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import OutscanSection from '@/components/inventory/outscan-section'
import OutscanLog     from '@/components/inventory/outscan-log'
import { PackageMinus } from 'lucide-react'

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

export default async function OutscanPage() {
  const supabase = await createClient()

  const { data: materials } = await supabase
    .from('materials').select('id, name, type, description').order('name')

  const { data: stock } = await supabase
    .from('stock_summary').select('*').order('material_name')

  const { data: logRows } = await supabase
    .from('stock_outscans')
    .select(`
      id, material_id, stock_entry_id, quantity_taken, reason, taken_at, created_at,
      materials ( name ),
      stock_entries ( vendor_id, vendors ( name ) )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

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
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: '#ef444410', border: '1px solid #ef444430' }}
          >
            <PackageMinus className="w-4 h-4" style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Outscan
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Log stock taken out and view outscan history
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-10">
        <OutscanSection
          stock={stock       ?? []}
          materials={materials ?? []}
        />
        <OutscanLog logs={outscans} />
      </div>
    </div>
  )
}