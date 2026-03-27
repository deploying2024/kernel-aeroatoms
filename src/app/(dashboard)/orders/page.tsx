// export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import OrderForm from '@/components/order-form'
import OrderHistory from '@/components/order-history'
import { ShoppingCart } from 'lucide-react'
import type { GroupedOrder, OrderRow } from '@/lib/types'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies').select('id, name').order('name')

  const { data: products } = await supabase
    .from('products').select('id, name, unit_price').order('name')

  const { data: rows } = await supabase
    .from('order_summary').select('*').order('order_date', { ascending: false })

  // Group flat rows into orders with multiple items
  const orderMap = new Map<string, GroupedOrder>()
  ;(rows as OrderRow[] ?? []).forEach(row => {
    if (!orderMap.has(row.order_id)) {
      orderMap.set(row.order_id, {
        order_id    : row.order_id,
        order_date  : row.order_date,
        company_id  : row.company_id,
        company_name: row.company_name,
        items       : [],
        total       : 0,
      })
    }
    const order = orderMap.get(row.order_id)!
    if (row.item_id) {
      order.items.push({
        id            : row.item_id,
        product_id    : row.product_id,
        product_name  : row.product_name,
        quantity      : row.quantity,
        price_per_unit: row.price_per_unit,
        line_total    : row.line_total,
      })
      order.total += row.line_total ?? 0
    }
  })

  const groupedOrders = Array.from(orderMap.values())

  return (
    <div className="min-h-screen grid-bg animate-fade-up">
      {/* Page Header */}
      <div className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center glow-blue"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
            <ShoppingCart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Orders
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Create and manage all AeroAtoms orders
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-10">
        {/* New order form */}
        <OrderForm
          companies={companies ?? []}
          products={products   ?? []}
        />

        {/* Order history */}
        <OrderHistory
          orders={groupedOrders}
          companies={companies ?? []}
          products={products   ?? []}
        />
      </div>
    </div>
  )
}