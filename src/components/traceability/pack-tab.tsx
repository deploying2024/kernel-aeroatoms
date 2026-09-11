'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, Truck, X, CheckCircle2 } from 'lucide-react'
import type { Unit, Batch, Company, Order } from './types'


export default function PackTab({
  batches,
  companies,
  orders,
}: {
  batches  : Batch[]
  companies: Company[]
  orders   : Order[]
}) {
  const router    = useRouter()
  const [, start] = useTransition()
  const scanRef   = useRef<HTMLInputElement>(null)

  // ── Session state ──
  const [packedSerials, setPackedSerials] = useState<string[]>([])
  const [scanErr,       setScanErr]       = useState<string | null>(null)
  const [scanMsg,       setScanMsg]       = useState<string | null>(null)

  // ── Ship form ──
  const [selectedOrder,   setSelectedOrder]   = useState(orders[0]?.id ?? '')
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id ?? '')
  const [courier,         setCourier]         = useState('')
  const [trackingNo,      setTrackingNo]      = useState('')
  const [shipping,        setShipping]        = useState(false)
  const [shipSuccess,     setShipSuccess]     = useState(false)
  const [shipMode,        setShipMode]        = useState<'order' | 'direct'>('order')

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  // Find a unit across all batches
  const findUnit = (serial: string): (Unit & { product_name: string; batch_name: string }) | null => {
    for (const b of batches) {
      const u = b.units.find(u => u.serial === serial)
      if (u) return { ...u, product_name: b.product_name, batch_name: b.batch_name }
    }
    return null
  }
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = scanRef.current?.value?.trim().toUpperCase() ?? ''
    if (!raw) return
    setScanErr(null); setScanMsg(null)

    if (!/^ORB-[A-Z0-9]+-\d{4}-[A-Z0-9]+-[A-Z0-9]{4}$/.test(raw)) {
      setScanErr(`Not a valid AeroAtoms serial: ${raw}`)
      if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
      return
    }

    if (packedSerials.includes(raw)) {
      setScanErr(`Already in this pack: ${raw}`)
      if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
      return
    }

    // Check unit status — must be qa_passed
    let unit = findUnit(raw)
    if (!unit) {
      // Check DB for older batches
      const sb = createClient()
      const { data } = await sb
        .from('product_units')
        .select('serial, status, product_batches (batch_name), products (name)')
        .eq('serial', raw)
        .maybeSingle()

      if (!data) {
        setScanErr(`Serial not found: ${raw}`)
        if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
        return
      }

      const b = Array.isArray(data.product_batches) ? data.product_batches[0] : data.product_batches
      const p = Array.isArray(data.products)        ? data.products[0]        : data.products
      unit = { serial: data.serial, status: data.status, order_id: null, shipped_at: null, customer_id: null, customer_name: null, product_name: p?.name ?? '—', batch_name: b?.batch_name ?? '—' }
    }

    if (!unit) return

    if (unit.status === 'shipped') {
      setScanErr(`Already shipped: ${raw}`)
      if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
      return
    }

    if (unit.status !== 'qa_passed') {
      setScanErr(`Must be QA-passed first. Current status: ${unit.status}`)
      if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
      return
    }

    setPackedSerials(prev => [...prev, raw])
    setScanMsg(`✓ Added: ${raw}`)
    if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
  }

  const removeSerial = (serial: string) => {
    setPackedSerials(prev => prev.filter(s => s !== serial))
  }

  const handleShip = async () => {
    if (packedSerials.length === 0) return
    setShipping(true)

    const sb         = createClient()
    const now        = new Date().toISOString()
    const orderId    = shipMode === 'order' ? selectedOrder || null : null
    const companyId  = shipMode === 'direct' ? selectedCompany || null : null

    // Update all packed units
    await sb.from('product_units')
      .update({
        status     : 'shipped',
        order_id   : orderId,
        customer_id: companyId,
        shipped_at : now,
      })
      .in('serial', packedSerials)

    // Log events
    const events = packedSerials.map(serial => ({
      serial,
      kind: 'shipped',
      data: { courier, tracking_no: trackingNo, order_id: orderId, company_id: companyId },
    }))
    await sb.from('unit_events').insert(events)

    setShipping(false)
    setShipSuccess(true)
    setPackedSerials([])
    setCourier(''); setTrackingNo('')
    start(() => router.refresh())
    setTimeout(() => setShipSuccess(false), 3000)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">

      {/* ── Left: Scan ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)', boxShadow: '0 0 0 1px #3b82f615' }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
          <Package className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Packing Station</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Scan QA-passed units to pack for shipment
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Scan input */}
          <form onSubmit={handleScan} className="flex gap-2">
            <Input
              ref={scanRef}
              autoFocus
              placeholder="Scan or type serial…"
              className="flex-1 h-11 border rounded-lg text-sm font-mono"
              style={inputStyle}
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Add
            </button>
          </form>

          {scanErr && (
            <p className="px-3 py-2 rounded-lg text-sm"
              style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
              ⚠ {scanErr}
            </p>
          )}
          {scanMsg && !scanErr && (
            <p className="px-3 py-2 rounded-lg text-sm"
              style={{ background: '#10b98110', border: '1px solid #10b98128', color: '#10b981' }}>
              {scanMsg}
            </p>
          )}

          {/* Packed list */}
          {packedSerials.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-dim)' }}>
              <div className="px-4 py-2.5 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Packed
                </p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                  {packedSerials.length}
                </span>
              </div>
              <div className="divide-y max-h-60 overflow-y-auto" style={{ borderColor: 'var(--border-dim)' }}>
                {packedSerials.map(serial => (
                  <div key={serial} className="flex items-center justify-between px-4 py-2.5">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                      {serial}
                    </span>
                    <button
                      onClick={() => removeSerial(serial)}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ color: '#ef4444' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Ship form ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
          <Truck className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Ship</p>
        </div>

        <div className="p-5 space-y-4">

          {/* Mode toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}>
            {(['order', 'direct'] as const).map(m => (
              <button
                key={m}
                onClick={() => setShipMode(m)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: shipMode === m ? 'var(--accent)' : 'transparent',
                  color     : shipMode === m ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {m === 'order' ? 'Link to Order' : 'Direct to Customer'}
              </button>
            ))}
          </div>

          {/* Order picker */}
          {shipMode === 'order' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Order</Label>
              {orders.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  No active orders. Create one in the Orders page first.
                </p>
              ) : (
                <select
                  value={selectedOrder}
                  onChange={e => setSelectedOrder(e.target.value)}
                  className="w-full h-10 px-3 border rounded-lg text-sm"
                  style={inputStyle}
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.company_name} · {new Date(o.created_at).toLocaleDateString('en-IN')}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Direct customer picker */}
          {shipMode === 'direct' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}>Customer</Label>
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                className="w-full h-10 px-3 border rounded-lg text-sm"
                style={inputStyle}
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Courier */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Courier — optional</Label>
            <Input
              placeholder="e.g. BlueDart, FedEx, DHL"
              value={courier}
              onChange={e => setCourier(e.target.value)}
              className="h-10 border rounded-lg text-sm"
              style={inputStyle}
            />
          </div>

          {/* Tracking */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}>Tracking No. — optional</Label>
            <Input
              placeholder="e.g. 1234567890"
              value={trackingNo}
              onChange={e => setTrackingNo(e.target.value)}
              className="h-10 border rounded-lg text-sm"
              style={inputStyle}
            />
          </div>

          {shipSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: '#10b98110', border: '1px solid #10b98128', color: '#10b981' }}>
              <CheckCircle2 className="w-4 h-4" />
              Shipment recorded successfully!
            </div>
          )}

          <button
            onClick={handleShip}
            disabled={shipping || packedSerials.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Truck className="w-4 h-4" />
            {shipping ? 'Shipping…' : `Ship ${packedSerials.length} unit${packedSerials.length !== 1 ? 's' : ''}`}
          </button>

          {packedSerials.length === 0 && (
            <p className="text-xs text-center" style={{ color: 'var(--text-dim)' }}>
              Scan units on the left to add them to this shipment
            </p>
          )}
        </div>
      </div>
    </div>
  )
}