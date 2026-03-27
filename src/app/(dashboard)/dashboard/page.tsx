export const runtime = 'edge'
import { createClient } from '@/lib/supabase/server'
import {
  TrendingUp, ShoppingCart, Building2,
  Package, Activity,
} from 'lucide-react'
import RevenueChart from '@/components/revenue-chart'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: revenueData } = await supabase
    .from('order_summary').select('line_total')
  const totalRevenue = revenueData?.reduce((s, r) => s + (r.line_total ?? 0), 0) ?? 0

  const { data: ordersData } = await supabase
    .from('order_summary').select('order_id')
  const totalOrders = new Set(ordersData?.map(r => r.order_id)).size

  const { data: productData } = await supabase
    .from('order_summary').select('product_name, quantity')
  const productMap: Record<string, number> = {}
  productData?.forEach(r => {
    if (!r.product_name) return
    productMap[r.product_name] = (productMap[r.product_name] ?? 0) + (r.quantity ?? 0)
  })
  const topProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const { data: companyData } = await supabase
    .from('order_summary').select('company_name, line_total')
  const companyMap: Record<string, number> = {}
  companyData?.forEach(r => {
    if (!r.company_name) return
    companyMap[r.company_name] = (companyMap[r.company_name] ?? 0) + (r.line_total ?? 0)
  })
  const topCompanies = Object.entries(companyMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const totalCompanies = Object.keys(companyMap).length

  const { data: chartRaw } = await supabase
    .from('order_summary').select('order_date, line_total').order('order_date', { ascending: true })
  const monthMap: Record<string, number> = {}
  chartRaw?.forEach(r => {
    if (!r.order_date) return
    const m = r.order_date.slice(0, 7)
    monthMap[m] = (monthMap[m] ?? 0) + (r.line_total ?? 0)
  })
  const revenueByMonth = Object.entries(monthMap).map(([month, total]) => ({ month, total }))

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style                : 'currency',
      currency             : 'INR',
      maximumFractionDigits: 0,
    }).format(n)

  const maxUnits   = topProducts[0]?.[1]  ?? 1
  const maxRevenue = topCompanies[0]?.[1] ?? 1

  const stats = [
    {
      label : 'Total Revenue',
      value : fmt(totalRevenue),
      icon  : TrendingUp,
      color : 'var(--neon-blue)',
      badge : 'All time',
    },
    {
      label : 'Total Orders',
      value : String(totalOrders),
      icon  : ShoppingCart,
      color : 'var(--neon-purple)',
      badge : 'Orders',
    },
    {
      label : 'Total Companies',
      value : String(totalCompanies),
      icon  : Building2,
      color : 'var(--neon-green)',
      badge : 'Clients',
    },
  ]

  return (
    <div className="min-h-screen grid-bg animate-fade-up">

      {/* Page Header */}
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />   
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Dashboard
            </h1>
<p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
  Kernel · AeroAtoms Operations
</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: '#00ff9f10', border: '1px solid #00ff9f25' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--neon-green)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--neon-green)' }}>
              System Online
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-8">

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="relative rounded-2xl p-6 overflow-hidden transition-all duration-200 hover:scale-[1.02] border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
              >
                <div
                  className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl opacity-20 pointer-events-none"
                  style={{ background: s.color }}
                />
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{
                      background : `color-mix(in srgb, ${s.color} 12%, transparent)`,
                      border     : `1px solid color-mix(in srgb, ${s.color} 30%, transparent)`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{
                      background : `color-mix(in srgb, ${s.color} 12%, transparent)`,
                      color      : s.color,
                    }}
                  >
                    {s.badge}
                  </span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--text-secondary)' }}>
                  {s.label}
                </p>
                <p className="text-2xl font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}>
                  {s.value}
                </p>
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
                  style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }}
                />
              </div>
            )
          })}
        </div>

        {/* Revenue Chart */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
            >
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Revenue Over Time
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Monthly breakdown</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Monthly Revenue</span>
            </div>
          </div>
          <RevenueChart data={revenueByMonth} />
        </div>

        {/* Top Products + Companies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Products */}
          <div
            className="rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background : 'color-mix(in srgb, var(--neon-purple) 12%, transparent)',
                  border     : '1px solid color-mix(in srgb, var(--neon-purple) 25%, transparent)',
                }}
              >
                <Package className="w-4 h-4" style={{ color: 'var(--neon-purple)' }} />
              </div>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Top Products
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>by units sold</p>
              </div>
            </div>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  No data yet — create some orders!
                </p>
              ) : topProducts.map(([name, units], i) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-4" style={{ color: 'var(--text-dim)' }}>{i + 1}</span>
                      <span className="text-sm truncate max-w-[170px]"
                        style={{ color: 'var(--text-primary)' }}>{name}</span>
                    </div>
                    <span className="text-xs font-semibold"
                      style={{ color: 'var(--neon-purple)' }}>{units} units</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border-dim)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width      : `${(units / (topProducts[0]?.[1] ?? 1)) * 100}%`,
                        background : 'linear-gradient(90deg, var(--neon-purple), var(--neon-blue))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Companies */}
          <div
            className="rounded-2xl border p-6"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background : 'color-mix(in srgb, var(--neon-green) 12%, transparent)',
                  border     : '1px solid color-mix(in srgb, var(--neon-green) 25%, transparent)',
                }}
              >
                <Building2 className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
              </div>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Top Companies
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>by revenue</p>
              </div>
            </div>
            <div className="space-y-4">
              {topCompanies.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  No data yet — create some orders!
                </p>
              ) : topCompanies.map(([name, revenue], i) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-4" style={{ color: 'var(--text-dim)' }}>{i + 1}</span>
                      <span className="text-sm truncate max-w-[150px]"
                        style={{ color: 'var(--text-primary)' }}>{name}</span>
                    </div>
                    <span className="text-xs font-semibold"
                      style={{ color: 'var(--neon-green)' }}>{fmt(revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border-dim)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width      : `${(revenue / (topCompanies[0]?.[1] ?? 1)) * 100}%`,
                        background : 'linear-gradient(90deg, var(--neon-green), var(--neon-blue))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}