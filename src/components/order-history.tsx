'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import {
  CalendarIcon, Search, Filter, Trash2,
  Pencil, ChevronLeft, ChevronRight,
  Package, ShoppingCart,
} from 'lucide-react'
import EditOrderModal from '@/components/edit-order-modal'
import type { GroupedOrder, Company, Product } from '@/lib/types'

const PAGE_SIZE = 10

export default function OrderHistory({
  orders,
  companies,
  products,
}: {
  orders   : GroupedOrder[]
  companies: Company[]
  products : Product[]
}) {
  const router = useRouter()

  /* ── filters ── */
  const [searchCompany,  setSearchCompany]  = useState('')
  const [filterProduct,  setFilterProduct]  = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>()
  const [filterDateTo,   setFilterDateTo]   = useState<Date | undefined>()
  const [calFromOpen,    setCalFromOpen]    = useState(false)
  const [calToOpen,      setCalToOpen]      = useState(false)

  /* ── pagination ── */
  const [page, setPage] = useState(1)

  /* ── edit / delete ── */
  const [editOrder,    setEditOrder]    = useState<GroupedOrder | null>(null)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style                : 'currency',
    currency             : 'INR',
    maximumFractionDigits: 0,
  }).format(n)

  /* ── all unique products across orders ── */
  const uniqueProducts = [...new Set(
    orders.flatMap(o => o.items.map(i => i.product_name)).filter(Boolean)
  )]

  /* ── filter logic ── */
  const filtered = orders.filter(o => {
    const d = new Date(o.order_date)
    const matchCompany = !searchCompany ||
      o.company_name?.toLowerCase().includes(searchCompany.toLowerCase())
    const matchProduct = filterProduct === 'all' ||
      o.items.some(i => i.product_name === filterProduct)
    const matchFrom = !filterDateFrom || d >= filterDateFrom
    const matchTo   = !filterDateTo   || d <= filterDateTo
    return matchCompany && matchProduct && matchFrom && matchTo
  })

  /* ── pagination ── */
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const paginated   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const totalFiltered = filtered.reduce((s, o) => s + o.total, 0)

  const resetPage = () => setPage(1)

  /* ── delete ── */
  const handleDelete = async (orderId: string) => {
    setDeletingId(orderId)
    const sb = createClient()
    await sb.from('order_items').delete().eq('order_id', orderId)
    await sb.from('orders').delete().eq('id', orderId)
    setDeletingId(null)
    setConfirmDelete(null)
    router.refresh()
  }

  const inputStyle = {
    background  : 'var(--bg-input)',
    borderColor : 'var(--border-dim)',
    color       : 'var(--text-primary)',
  }

  return (
    <>
      {/* Edit modal */}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          companies={companies}
          products={products}
          onClose={() => setEditOrder(null)}
        />
      )}

      <div className="space-y-5">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Order History
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              {filtered.length}
            </span>
          </div>
          {filtered.length > 0 && (
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Total: <span style={{ color: 'var(--accent)' }}>{fmt(totalFiltered)}</span>
            </span>
          )}
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border p-4"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-dim)' }}>Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: 'var(--text-dim)' }} />
              <Input placeholder="Search company…" value={searchCompany}
                onChange={e => { setSearchCompany(e.target.value); resetPage() }}
                className="pl-9 h-9 text-sm border rounded-lg" style={inputStyle} />
            </div>

            <Select value={filterProduct} onValueChange={v => { setFilterProduct(v); resetPage() }}>
              <SelectTrigger className="h-9 text-sm border rounded-lg" style={inputStyle}>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <SelectItem value="all" style={{ color: 'var(--text-primary)' }}>All Products</SelectItem>
                {uniqueProducts.map(p => (
                  <SelectItem key={p} value={p} style={{ color: 'var(--text-primary)' }}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover open={calFromOpen} onOpenChange={setCalFromOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 h-9 px-3 border rounded-lg text-sm text-left w-full"
                  style={{ ...inputStyle, color: filterDateFrom ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                  {filterDateFrom ? format(filterDateFrom, 'dd MMM yyyy') : 'From date'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <Calendar mode="single" selected={filterDateFrom}
                  onSelect={d => { setFilterDateFrom(d); setCalFromOpen(false); resetPage() }} initialFocus />
              </PopoverContent>
            </Popover>

            <Popover open={calToOpen} onOpenChange={setCalToOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 h-9 px-3 border rounded-lg text-sm text-left w-full"
                  style={{ ...inputStyle, color: filterDateTo ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                  {filterDateTo ? format(filterDateTo, 'dd MMM yyyy') : 'To date'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <Calendar mode="single" selected={filterDateTo}
                  onSelect={d => { setFilterDateTo(d); setCalToOpen(false); resetPage() }} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {(searchCompany || filterProduct !== 'all' || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setSearchCompany(''); setFilterProduct('all'); setFilterDateFrom(undefined); setFilterDateTo(undefined); resetPage() }}
              className="mt-3 flex items-center gap-1.5 text-xs"
              style={{ color: 'var(--neon-pink)' }}>
              <Trash2 className="w-3 h-3" /> Clear all filters
            </button>
          )}
        </div>

        {/* Orders list */}
        <div className="space-y-3">
          {paginated.length === 0 ? (
            <div className="rounded-xl border py-16 text-center"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
              <ShoppingCart className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                No orders found. Create your first order above ↑
              </p>
            </div>
          ) : paginated.map(order => (
            <div key={order.order_id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>

              {/* Order header row */}
              <div className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {order.company_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {order.company_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {format(new Date(order.order_date), 'dd MMM yyyy')} ·{' '}
                      #{order.order_id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold mr-2" style={{ color: 'var(--accent)' }}>
                    {fmt(order.total)}
                  </span>

                  {/* Edit */}
                  <button
                    onClick={() => setEditOrder(order)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                    style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--accent)'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-border)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                    }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  {confirmDelete === order.order_id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(order.order_id)}
                        disabled={deletingId === order.order_id}
                        className="px-3 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: 'var(--neon-pink)', color: '#fff' }}>
                        {deletingId === order.order_id ? '…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1 rounded-lg text-xs border"
                        style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(order.order_id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all"
                      style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--neon-pink)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--neon-pink)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-dim)'
                      }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div className="divide-y" style={{ borderColor: 'var(--border-dim)' }}>
                {order.items.map(item => (
                  <div key={item.id}
                    className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-dim)' }} />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {item.product_name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                        ×{item.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {fmt(item.price_per_unit)} / unit
                      </span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {fmt(item.line_total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Page {safePage} of {totalPages} · {filtered.length} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all disabled:opacity-30"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i-1] === 'number' && (p as number) - (arr[i-1] as number) > 1)
                    acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) => p === '...'
                  ? <span key={`ellipsis-${i}`} className="w-8 text-center text-sm"
                      style={{ color: 'var(--text-dim)' }}>…</span>
                  : <button key={p}
                      onClick={() => setPage(p as number)}
                      className="w-8 h-8 rounded-lg text-sm font-medium border transition-all"
                      style={{
                        background  : safePage === p ? 'var(--accent)' : 'transparent',
                        borderColor : safePage === p ? 'var(--accent)' : 'var(--border-dim)',
                        color       : safePage === p ? '#000' : 'var(--text-secondary)',
                      }}>
                      {p}
                    </button>
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all disabled:opacity-30"
                style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}