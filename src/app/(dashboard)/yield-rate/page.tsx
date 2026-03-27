// export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import YieldRateClient from '@/components/yield/yield-rate-client'
import { Gauge } from 'lucide-react'

export default async function YieldRatePage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .order('name')

  const { data: batches } = await supabase
    .from('pcb_batches')
    .select(`
      id, batch_name, product_id, total_units, working_units,
      defect_units, defect_reason, notes, manufactured_at, created_at,
      products ( name )
    `)
    .order('manufactured_at', { ascending: false })

  const shaped = (batches ?? []).map((b: any) => ({
    ...b,
    product_name: b.products?.name ?? '—',
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
            <Gauge className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Yield Rate
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Track PCB batch quality and manufacturing yield
            </p>
          </div>
        </div>
      </div>

      <YieldRateClient
        products={products ?? []}
        initialBatches={shaped}
      />
    </div>
  )
}