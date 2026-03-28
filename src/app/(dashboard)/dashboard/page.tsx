export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import {
  TrendingUp, ShoppingCart, Building2,
  Package, Activity, DollarSign,
} from 'lucide-react'
import RevenueChart from '@/components/revenue-chart'

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

export default async function DashboardPage() {
  const supabase = await createClient()

  const [usdRate, revenueData, ordersData, productData, companyData, chartRaw] =
    await Promise.all([
      getUsdRate(),
      supabase.from('order_summary').select('line_total'),
      supabase.from('order_summary').select('order_id'),
      supabase.from('order_summary').select('product_name, quantity'),
      supabase.from('order_summary').select('company_name, line_total'),
      supabase.from('order_summary').select('order_date, line_total').order('order_date', { ascending: true }),
    ])

  const totalRevenue    = revenueData.data?.reduce((s, r) => s + (r.line_total ?? 0), 0) ?? 0
  const totalRevenueUSD = totalRevenue * usdRate
  const totalOrders     = new Set(ordersData.data?.map(r => r.order_id)).size
  const totalUnitsSold  = productData.data?.reduce((s, r) => s + (r.quantity ?? 0), 0) ?? 0

  const productMap: Record<string, number> = {}
  productData.data?.forEach(r => {
    if (!r.product_name) return
    productMap[r.product_name] = (productMap[r.product_name] ?? 0) + (r.quantity ?? 0)
  })
  const topProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const companyMap: Record<string, number> = {}
  companyData.data?.forEach(r => {
    if (!r.company_name) return
    companyMap[r.company_name] = (companyMap[r.company_name] ?? 0) + (r.line_total ?? 0)
  })
  const topCompanies  = Object.entries(companyMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const totalCompanies = Object.keys(companyMap).length

  const monthMap: Record<string, number> = {}
  chartRaw.data?.forEach(r => {
    if (!r.order_date) return
    const m = r.order_date.slice(0, 7)
    monthMap[m] = (monthMap[m] ?? 0) + (r.line_total ?? 0)
  })
  const revenueByMonth = Object.entries(monthMap).map(([month, total]) => ({ month, total }))

  const fmtINR = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style                : 'currency',
      currency             : 'INR',
      maximumFractionDigits: 0,
    }).format(n)

  const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style                : 'currency',
      currency             : 'USD',
      maximumFractionDigits: 2,
    }).format(n)

  const stats = [
    {
      label   : 'Total Revenue',
      value   : fmtINR(totalRevenue),
      subvalue: fmtUSD(totalRevenueUSD),
      sublabel: `@ 1 USD = ₹${(1 / usdRate).toFixed(2)}`,
      icon    : TrendingUp,
      color   : '#3b82f6',
      badge   : 'All time',
    },
    {
      label   : 'Total Orders',
      value   : String(totalOrders),
      subvalue: null,
      sublabel: 'orders placed',
      icon    : ShoppingCart,
      color   : '#8b5cf6',
      badge   : 'Orders',
    },
    {
      label   : 'Units Sold',
      value   : totalUnitsSold.toLocaleString(),
      subvalue: null,
      sublabel: 'across all orders',
      icon    : Package,
      color   : '#f59e0b',
      badge   : 'Products',
    },
    {
      label   : 'Companies',
      value   : String(totalCompanies),
      subvalue: null,
      sublabel: 'active clients',
      icon    : Building2,
      color   : '#10b981',
      badge   : 'Clients',
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
              <span className="text-xs uppercase tracking-widest font-semibold"
                style={{ color: 'var(--accent)' }}>
                Live Overview
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}>
              Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Kernel · AeroAtoms Operations
            </p>
          </div>
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: '#10b98110', border: '1px solid #10b98128' }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#10b981' }} />
            <span className="text-xs font-medium" style={{ color: '#10b981' }}>
              System Online
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-8">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="relative rounded-2xl border p-5 overflow-hidden transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background  : 'var(--bg-card)',
                  borderColor : `${s.color}25`,
                  boxShadow   : `0 0 0 1px ${s.color}15, 0 8px 32px ${s.color}20, 0 32px 64px ${s.color}08`,
                }}
              >
                {/* Glow blob */}
                <div
                  className="absolute inset-0 rounded-2xl blur-2xl opacity-10 pointer-events-none"
                  style={{
                    background : `linear-gradient(135deg, ${s.color}, transparent)`,
                    transform  : 'scale(1.1)',
                  }}
                />

                {/* Top row */}
                <div className="relative flex items-center justify-between mb-4">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl"
                    style={{
                      background : `${s.color}15`,
                      border     : `1px solid ${s.color}30`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                    style={{ background: `${s.color}15`, color: s.color }}
                  >
                    {s.badge}
                  </span>
                </div>

                {/* Label */}
                <p className="relative text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--text-secondary)' }}>
                  {s.label}
                </p>

                {/* Main value */}
                <p className="relative text-2xl font-black tracking-tight"
                  style={{ color: 'var(--text-primary)' }}>
                  {s.value}
                </p>

                {/* USD subvalue */}
                {s.subvalue && (
                  <div className="relative mt-2 flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" style={{ color: '#10b981' }} />
                    <span className="text-sm font-bold" style={{ color: '#10b981' }}>
                      {s.subvalue}
                    </span>
                  </div>
                )}

                {/* Sublabel */}
                <p className="relative text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                  {s.sublabel}
                </p>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }}
                />
              </div>
            )
          })}
        </div>

        {/* ── Revenue Chart ── */}
        <div
          className="rounded-2xl border p-6"
          style={{
            background  : 'var(--bg-card)',
            borderColor : '#3b82f625',
            boxShadow   : '0 0 0 1px #3b82f615, 0 8px 32px #3b82f618, 0 32px 64px #3b82f608',
          }}
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
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Monthly breakdown
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Monthly Revenue (₹)
              </span>
            </div>
          </div>
          <RevenueChart data={revenueByMonth} />
        </div>

        {/* ── Top Products + Companies ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Products */}
          <div
            className="rounded-2xl border p-6"
            style={{
              background  : 'var(--bg-card)',
              borderColor : '#8b5cf625',
              boxShadow   : '0 0 0 1px #8b5cf615, 0 8px 32px #8b5cf618, 0 32px 64px #8b5cf608',
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#8b5cf615', border: '1px solid #8b5cf628' }}
              >
                <Package className="w-4 h-4" style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Top Products
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  by units sold
                </p>
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
                      <span className="text-xs w-4" style={{ color: 'var(--text-dim)' }}>
                        {i + 1}
                      </span>
                      <span className="text-sm truncate max-w-[170px]"
                        style={{ color: 'var(--text-primary)' }}>
                        {name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#8b5cf6' }}>
                      {units} units
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border-dim)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width      : `${(units / (topProducts[0]?.[1] ?? 1)) * 100}%`,
                        background : 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
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
            style={{
              background  : 'var(--bg-card)',
              borderColor : '#10b98125',
              boxShadow   : '0 0 0 1px #10b98115, 0 8px 32px #10b98118, 0 32px 64px #10b98108',
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: '#10b98115', border: '1px solid #10b98128' }}
              >
                <Building2 className="w-4 h-4" style={{ color: '#10b981' }} />
              </div>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Top Companies
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  by revenue
                </p>
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
                      <span className="text-xs w-4" style={{ color: 'var(--text-dim)' }}>
                        {i + 1}
                      </span>
                      <span className="text-sm truncate max-w-[150px]"
                        style={{ color: 'var(--text-primary)' }}>
                        {name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
                      {fmtINR(revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border-dim)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width      : `${(revenue / (topCompanies[0]?.[1] ?? 1)) * 100}%`,
                        background : 'linear-gradient(90deg, #10b981, #3b82f6)',
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