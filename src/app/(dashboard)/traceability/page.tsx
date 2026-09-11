import { createClient } from '@/lib/supabase/server'
import TraceabilityClient from '@/components/traceability/traceability-client'
import { QrCode } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TraceabilityPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name')
    .order('name')

  const { data: batchesRaw } = await supabase
    .from('product_batches')
    .select(`
      id, batch_name, qty, notes, created_at,
      products (name),
      product_units (
        serial, status, order_id, shipped_at, customer_id,
        companies (name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: companiesRaw } = await supabase
    .from('companies')
    .select('id, name')
    .order('name')

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select(`
      id,
      company_id,
      order_date,
      companies (name),
      order_items (
        id,
        products (name)
      )
    `)
    .order('order_date', { ascending: false })
    .limit(100)

  const batches = (batchesRaw ?? []).map((b: any) => ({
    id          : b.id,
    batch_name  : b.batch_name,
    qty         : b.qty,
    notes       : b.notes,
    created_at  : b.created_at,
    product_name: (Array.isArray(b.products) ? b.products[0] : b.products)?.name ?? '—',
    units       : (b.product_units ?? []).map((u: any) => ({
          ...u,
          customer_name: (Array.isArray(u.companies) ? u.companies[0] : u.companies)?.name ?? null,
        })),
  }))

  const orders = (ordersRaw ?? []).map((o: any) => ({
    id          : o.id,
    company_id  : o.company_id,
    company_name: (Array.isArray(o.companies) ? o.companies[0] : o.companies)?.name ?? '—',
    created_at  : o.order_date,
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
            <QrCode className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Traceability
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Serial batches · QA · Packing · Unit history
            </p>
          </div>
        </div>
      </div>

      <TraceabilityClient
        products={products ?? []}
        batches={batches}
        companies={companiesRaw ?? []}
        orders={orders}
      />
    </div>
  )
}