// export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import InventoryValueClient from '@/components/inventory/inventory-value-client'
import { BarChart3 } from 'lucide-react'

export default async function InventoryValuePage() {
  const supabase = await createClient()

  const { data: stock } = await supabase
    .from('stock_summary')
    .select('*')
    .order('material_name')

  return (
    <div className="min-h-screen grid-bg animate-fade-up">

      {/* Header */}
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
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Inventory Value
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Current worth of all stock · unit cost × remaining
              </p>
            </div>
          </div>
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: '#00ff9f10', border: '1px solid #00ff9f25' }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--neon-green)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--neon-green)' }}>
              Live Value
            </span>
          </div>
        </div>
      </div>

      <InventoryValueClient stock={stock ?? []} />
    </div>
  )
}