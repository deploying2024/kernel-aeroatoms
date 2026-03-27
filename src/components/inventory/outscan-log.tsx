'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ClipboardList, ChevronLeft, ChevronRight, PackageMinus } from 'lucide-react'
import type { OutscanLog as OutscanLogType } from '@/lib/types'

const PAGE_SIZE = 10

export default function OutscanLog({ logs }: { logs: OutscanLogType[] }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE))
  const paginated  = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Outscan Log</h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: '#ff006e12', color: 'var(--neon-pink)', border: '1px solid #ff006e33' }}>
          {logs.length} entries
        </span>
      </div>

      <div className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-secondary)' }}>
                {['Date', 'Material', 'Vendor / Batch', 'Qty Taken', 'Reason'].map((h, i) => (
                  <th key={h}
                    className={`py-3 px-5 text-[10px] font-bold uppercase tracking-widest ${i === 3 ? 'text-right' : 'text-left'}`}
                    style={{ color: 'var(--text-dim)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16" style={{ color: 'var(--text-dim)' }}>
                    <PackageMinus className="w-8 h-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No outscan logs yet</p>
                  </td>
                </tr>
              ) : paginated.map(log => (
                <tr key={log.id}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border-dim)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

                  <td className="px-5 py-3.5 whitespace-nowrap text-sm"
                    style={{ color: 'var(--text-secondary)' }}>
                    {log.taken_at ? format(new Date(log.taken_at), 'dd MMM yyyy') : '—'}
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {log.material_name}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {log.vendor_name}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold text-sm" style={{ color: 'var(--neon-pink)' }}>
                      −{log.quantity_taken.toLocaleString()}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {log.reason ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="w-8 h-8 rounded-lg text-sm font-medium border"
                style={{
                  background  : page === p ? 'var(--neon-pink)' : 'transparent',
                  borderColor : page === p ? 'var(--neon-pink)' : 'var(--border-dim)',
                  color       : page === p ? '#fff' : 'var(--text-secondary)',
                }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center border disabled:opacity-30"
              style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}