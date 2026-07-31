import { createClient } from '@/lib/supabase/server'
import ProductStockClient from '@/components/product-stock/product-stock-client'
import { Boxes } from 'lucide-react'

async function getUsdRate(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=INR&to=USD',
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return data.rates.USD ?? 0.012
  } catch {
    return 0.012
  }
}

export default async function ProductStockPage() {
  const supabase = await createClient()

  const [usdRate, { data: products }, { data: stockRows }, { data: orderItems }] =
    await Promise.all([
      getUsdRate(),
      supabase.from('products').select('id, name, sku, unit_price').order('name'),
      supabase.from('product_stock').select('product_id, quantity, avg_sell_price, notes, updated_at'),
      supabase.from('order_items').select('product_id, quantity, price_per_unit'),
    ])

  const stockMap = new Map<string, { quantity: number; avg_sell_price: number; notes: string | null; updated_at: string }>()
  ;(stockRows ?? []).forEach((s: any) => {
    stockMap.set(s.product_id, {
      quantity       : s.quantity ?? 0,
      avg_sell_price : s.avg_sell_price ?? 0,
      notes          : s.notes,
      updated_at     : s.updated_at,
    })
  })

  const soldMap = new Map<string, { total_qty: number; total_revenue: number }>()
  ;(orderItems ?? []).forEach((oi: any) => {
    const prev = soldMap.get(oi.product_id) ?? { total_qty: 0, total_revenue: 0 }
    soldMap.set(oi.product_id, {
      total_qty    : prev.total_qty     + (oi.quantity ?? 0),
      total_revenue: prev.total_revenue + ((oi.quantity ?? 0) * (oi.price_per_unit ?? 0)),
    })
  })

  const inrToUsd = usdRate

  const productList = (products ?? []).map((p: any) => {
    const stock = stockMap.get(p.id) ?? { quantity: 0, avg_sell_price: p.unit_price ?? 0, notes: null, updated_at: '' }
    const sold  = soldMap.get(p.id)  ?? { total_qty: 0, total_revenue: 0 }
    const avgSellPrice = stock.avg_sell_price > 0
      ? stock.avg_sell_price
      : sold.total_qty > 0 ? sold.total_revenue / sold.total_qty : (p.unit_price ?? 0)

    return {
      id            : p.id,
      name          : p.name,
      sku           : p.sku,
      unit_price    : p.unit_price ?? 0,
      stock_qty     : stock.quantity,
      avg_sell_price: avgSellPrice,
      stock_value_inr: stock.quantity * avgSellPrice,
      stock_value_usd: stock.quantity * avgSellPrice * inrToUsd,
      total_sold    : sold.total_qty,
      total_revenue : sold.total_revenue,
      notes         : stock.notes,
      updated_at    : stock.updated_at,
    }
  })

  const totalStockValueInr = productList.reduce((s, p) => s + p.stock_value_inr, 0)
  const totalStockValueUsd = totalStockValueInr * inrToUsd
  const totalUnitsSold     = productList.reduce((s, p) => s + p.total_sold, 0)
  const totalRevenue       = productList.reduce((s, p) => s + p.total_revenue, 0)

  return (
    <div className="min-h-screen grid-bg animate-fade-up">
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
            >
              <Boxes className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}>
                Product Stock
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Finished goods inventory · auto-reflects orders
              </p>
            </div>
          </div>
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              1 USD = ₹{(1 / inrToUsd).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <ProductStockClient
        products={productList}
        totalStockValueInr={totalStockValueInr}
        totalStockValueUsd={totalStockValueUsd}
        totalUnitsSold={totalUnitsSold}
        totalRevenue={totalRevenue}
        usdRate={inrToUsd}
      />
    </div>
  )
}