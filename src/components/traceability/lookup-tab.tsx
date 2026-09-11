'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Search, Flag, ExternalLink } from 'lucide-react'

type UnitDetail = {
  serial          : string
  status          : string
  firmware_version: string | null
  qa_notes        : string | null
  qa_passed_at    : string | null
  shipped_at      : string | null
  created_at      : string
  product_name    : string
  batch_name      : string
  order_id        : string | null
  customer_name   : string | null
  scan_count      : number
  events          : { kind: string; at: string; data: any }[]
  registrations   : { email: string; org: string | null; at: string }[]
}

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  created    : { color: '#6b7280', bg: '#6b728015' },
  qa_passed  : { color: '#3b82f6', bg: '#3b82f615' },
  qa_failed  : { color: '#ef4444', bg: '#ef444415' },
  shipped    : { color: '#10b981', bg: '#10b98115' },
  registered : { color: '#8b5cf6', bg: '#8b5cf615' },
  flagged    : { color: '#f59e0b', bg: '#f59e0b15' },
  rma        : { color: '#ef4444', bg: '#ef444415' },
}

export default function LookupTab() {
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<UnitDetail | 'not_found' | null>(null)
  const [flagging, setFlagging] = useState(false)

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  const handleSearch = async () => {
    const q = query.trim().toUpperCase()
    if (!q) return
    setLoading(true); setResult(null)

    const sb = createClient()

    const { data: unit } = await sb
      .from('product_units')
      .select(`
        serial, status, firmware_version, qa_notes, qa_passed_at,
        shipped_at, created_at, order_id,
        products (name),
        product_batches (batch_name),
        companies (name)
      `)
      .eq('serial', q)
      .maybeSingle()

    if (!unit) {
      setResult('not_found')
      return setLoading(false)
    }

    const [
      { data: events },
      { count: scanCount },
      { data: registrations },
    ] = await Promise.all([
      sb.from('unit_events').select('kind, at, data').eq('serial', q).order('at'),
      sb.from('unit_scans').select('id', { count: 'exact', head: true }).eq('serial', q),
      sb.from('unit_registrations').select('email, org, at').eq('serial', q).order('at'),
    ])

    const product  = Array.isArray(unit.products)       ? unit.products[0]       : unit.products
    const batch    = Array.isArray(unit.product_batches) ? unit.product_batches[0] : unit.product_batches
    const customer = Array.isArray(unit.companies)       ? unit.companies[0]       : unit.companies

    setResult({
      serial          : unit.serial,
      status          : unit.status,
      firmware_version: unit.firmware_version,
      qa_notes        : unit.qa_notes,
      qa_passed_at    : unit.qa_passed_at,
      shipped_at      : unit.shipped_at,
      created_at      : unit.created_at,
      order_id        : unit.order_id,
      product_name    : product?.name ?? '—',
      batch_name      : batch?.batch_name ?? '—',
      customer_name   : customer?.name ?? null,
      scan_count      : scanCount ?? 0,
      events          : events ?? [],
      registrations   : registrations ?? [],
    })
    setLoading(false)
  }

  const handleFlag = async () => {
    if (result === null || result === 'not_found') return
    setFlagging(true)
    const sb = createClient()
    await sb.from('product_units').update({ status: 'flagged' }).eq('serial', result.serial)
    await sb.from('unit_events').insert({ serial: result.serial, kind: 'flagged', data: {} })
    setResult({ ...result, status: 'flagged' })
    setFlagging(false)
  }

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="space-y-5">

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-dim)' }} />
          <Input
            placeholder="Type or scan a serial number…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            className="pl-9 h-11 border rounded-lg text-sm font-mono"
            style={inputStyle}
            autoFocus
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {/* Not found */}
      {result === 'not_found' && (
        <div className="rounded-xl border p-5 text-center"
          style={{ background: '#f59e0b08', borderColor: '#f59e0b30' }}>
          <p className="font-semibold text-sm" style={{ color: '#f59e0b' }}>Serial not found</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {query.toUpperCase()} is not in the database.
          </p>
        </div>
      )}

      {/* Full detail */}
      {result && result !== 'not_found' && (() => {
        const s = STATUS_COLOR[result.status] ?? STATUS_COLOR.created
        return (
          <div className="space-y-4">

            {/* Header card */}
            <div
              className="rounded-2xl border p-5 space-y-4"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    {result.serial}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {result.product_name} · Batch {result.batch_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {result.status}
                  </span>
                  {result.status !== 'flagged' && (
                    <button
                      onClick={handleFlag}
                      disabled={flagging}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                      style={{ borderColor: '#f59e0b30', color: '#f59e0b', background: '#f59e0b08' }}
                    >
                      <Flag className="w-3 h-3" />
                      Flag
                    </button>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Created',      fmtDate(result.created_at)],
                  ['QA Passed',    fmtDate(result.qa_passed_at)],
                  ['Firmware',     result.firmware_version ?? '—'],
                  ['Shipped',      fmtDate(result.shipped_at)],
                  ['Customer',     result.customer_name ?? '—'],
                  ['Public Scans', String(result.scan_count)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg p-3"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                      style={{ color: 'var(--text-dim)' }}>
                      {label}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {result.qa_notes && (
                <div className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>
                    QA Notes
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{result.qa_notes}</p>
                </div>
              )}

              {/* Verify link */}
              <a
                href={`${process.env.NEXT_PUBLIC_VERIFY_BASE_URL ?? ''}/v/${result.serial}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--accent)' }}
              >
                <ExternalLink className="w-3 h-3" />
                Open customer verify page
              </a>
            </div>

            {/* Registrations */}
            {result.registrations.length > 0 && (
              <div className="rounded-2xl border overflow-hidden"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
                <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Customer Registrations ({result.registrations.length})
                  </p>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-dim)' }}>
                  {result.registrations.map((r, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.email}</p>
                        {r.org && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.org}</p>}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        {fmtDate(r.at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event timeline */}
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Unit History
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-dim)' }}>
                {result.events.length === 0 ? (
                  <p className="px-5 py-4 text-sm" style={{ color: 'var(--text-dim)' }}>No events logged.</p>
                ) : result.events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-3">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: STATUS_COLOR[ev.kind]?.color ?? 'var(--accent)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                          {ev.kind.replace('_', ' ')}
                        </p>
                        <p className="text-xs shrink-0" style={{ color: 'var(--text-dim)' }}>
                          {fmtDate(ev.at)}
                        </p>
                      </div>
                      {ev.data && Object.keys(ev.data).length > 0 && (
                        <p className="text-xs mt-0.5 font-mono truncate" style={{ color: 'var(--text-dim)' }}>
                          {JSON.stringify(ev.data)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}