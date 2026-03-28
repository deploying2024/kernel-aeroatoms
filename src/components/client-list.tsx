'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Users, Search, Building2,
  ShoppingCart, CalendarDays, Package,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { GroupedOrder } from '@/lib/types'

type ClientData = {
  company_id   : string
  company_name : string
  total_orders : number
  total_revenue: number
  last_order   : string
  products     : string[]
}

export default function ClientList({
  orders = [],
}: {
  orders?: GroupedOrder[]
}) {
  const [search,    setSearch]    = useState('')
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [sortBy,    setSortBy]    = useState<'name' | 'orders' | 'revenue' | 'date'>('revenue')
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc')

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style                : 'currency',
      currency             : 'INR',
      maximumFractionDigits: 0,
    }).format(n)

  // Build client data from orders
  const clients = useMemo(() => {
    const map = new Map<string, ClientData>()

    orders.forEach(order => {
      if (!order.company_id) return
      if (!map.has(order.company_id)) {
        map.set(order.company_id, {
          company_id   : order.company_id,
          company_name : order.company_name,
          total_orders : 0,
          total_revenue: 0,
          last_order   : order.order_date,
          products     : [],
        })
      }
      const client = map.get(order.company_id)!
      client.total_orders  += 1
      client.total_revenue += order.total
      if (order.order_date > client.last_order) {
        client.last_order = order.order_date
      }
      order.items.forEach(item => {
        if (item.product_name && !client.products.includes(item.product_name)) {
          client.products.push(item.product_name)
        }
      })
    })

    return Array.from(map.values())
  }, [orders])

  // Filter
  const filtered = useMemo(() => {
    let result = clients.filter(c =>
      !search || c.company_name.toLowerCase().includes(search.toLowerCase())
    )

    result = result.sort((a, b) => {
      let diff = 0
      if (sortBy === 'name')    diff = a.company_name.localeCompare(b.company_name)
      if (sortBy === 'orders')  diff = a.total_orders  - b.total_orders
      if (sortBy === 'revenue') diff = a.total_revenue - b.total_revenue
      if (sortBy === 'date')    diff = a.last_order.localeCompare(b.last_order)
      return sortDir === 'desc' ? -diff : diff
    })

    return result
  }, [clients, search, sortBy, sortDir])

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 inline ml-1" />
      : <ChevronUp   className="w-3 h-3 inline ml-1" />
  }

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Client List
          </h2>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
          >
            {filtered.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--text-dim)' }} />
          <Input
            placeholder="Search client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm border rounded-lg"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                {/* Company */}
                <th
                  className="py-3 px-5 text-left text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none"
                  style={{ color: 'var(--text-dim)' }}
                  onClick={() => handleSort('name')}
                >
                  Company <SortIcon col="name" />
                </th>
                {/* Orders */}
                <th
                  className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none"
                  style={{ color: 'var(--text-dim)' }}
                  onClick={() => handleSort('orders')}
                >
                  Orders <SortIcon col="orders" />
                </th>
                {/* Revenue */}
                <th
                  className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none"
                  style={{ color: 'var(--text-dim)' }}
                  onClick={() => handleSort('revenue')}
                >
                  Revenue <SortIcon col="revenue" />
                </th>
                {/* Last order */}
                <th
                  className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none"
                  style={{ color: 'var(--text-dim)' }}
                  onClick={() => handleSort('date')}
                >
                  Last Order <SortIcon col="date" />
                </th>
                {/* Products */}
                <th
                  className="py-3 px-5 text-left text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-dim)' }}
                >
                  Products Bought
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-sm"
                    style={{ color: 'var(--text-dim)' }}>
                    No clients found
                  </td>
                </tr>
              ) : filtered.map(client => (
                <>
                  <tr
                    key={client.company_id}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid var(--border-dim)' }}
                    onMouseEnter={e =>
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e =>
                      (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    onClick={() => setExpanded(
                      expanded === client.company_id ? null : client.company_id
                    )}
                  >
                    {/* Company */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
                        >
                          {client.company_name[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {client.company_name}
                        </span>
                      </div>
                    </td>

                    {/* Orders */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {client.total_orders}
                        </span>
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>
                        {fmt(client.total_revenue)}
                      </span>
                    </td>

                    {/* Last order */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {client.last_order
                            ? format(new Date(client.last_order), 'dd MMM yyyy')
                            : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Products */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {client.products.slice(0, 2).map(p => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background : 'var(--accent-soft)',
                              color      : 'var(--accent)',
                              border     : '1px solid var(--accent-border)',
                            }}
                          >
                            {p}
                          </span>
                        ))}
                        {client.products.length > 2 && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background : 'var(--bg-secondary)',
                              color      : 'var(--text-secondary)',
                              border     : '1px solid var(--border-dim)',
                            }}
                          >
                            +{client.products.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row — all products */}
                  {expanded === client.company_id && (
                    <tr
                      key={`${client.company_id}-expanded`}
                      style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-secondary)' }}
                    >
                      <td colSpan={5} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <Package className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                              style={{ color: 'var(--text-secondary)' }}>
                              All products bought by {client.company_name}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {client.products.map(p => (
                                <span
                                  key={p}
                                  className="px-3 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    background : 'var(--accent-soft)',
                                    color      : 'var(--accent)',
                                    border     : '1px solid var(--accent-border)',
                                  }}
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}