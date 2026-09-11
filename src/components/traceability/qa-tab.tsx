'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FlaskConical, CheckCircle, XCircle, X, Camera, Keyboard } from 'lucide-react'
import type { Batch } from './types'
import CameraScanner from './camera-scanner'

const FIRMWARE_VERSIONS = ['1.0.0', '1.1.0', '1.2.0', '1.3.0']

type ScannedUnit = {
  serial      : string
  status      : string
  batch_name  : string
  product_name: string
  valid       : boolean
}

export default function QaTab({ batches }: { batches: Batch[] }) {
  const scanRef = useRef<HTMLInputElement>(null)

  const [scanned,     setScanned]     = useState<ScannedUnit[]>([])
  const [scanErr,     setScanErr]     = useState<string | null>(null)
  const [firmware,    setFirmware]    = useState(FIRMWARE_VERSIONS[FIRMWARE_VERSIONS.length - 1])
  const [notes,       setNotes]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState<{ passed: number; failed: number } | null>(null)
  const [cameraOpen,  setCameraOpen]  = useState(false)

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  const lookupSerial = async (raw: string) => {
    setScanErr(null)

    if (!/^ORB-[A-Z0-9]+-\d{4}-[A-Z0-9]+-[A-Z0-9]{4}$/.test(raw)) {
      setScanErr(`Not a valid serial: ${raw}`)
      return
    }

    if (scanned.find(u => u.serial === raw)) {
      setScanErr(`Already scanned: ${raw}`)
      if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
      return
    }

    // Check in-memory batches first
    let found: ScannedUnit | null = null
    for (const b of batches) {
      const u = b.units.find(u => u.serial === raw)
      if (u) {
        found = { serial: u.serial, status: u.status, batch_name: b.batch_name, product_name: b.product_name, valid: true }
        break
      }
    }

    // Fallback DB lookup
    if (!found) {
      const sb = createClient()
      const { data } = await sb
        .from('product_units')
        .select('serial, status, product_batches (batch_name), products (name)')
        .eq('serial', raw)
        .maybeSingle()

      if (data) {
        const b = Array.isArray(data.product_batches) ? data.product_batches[0] : data.product_batches
        const p = Array.isArray(data.products)        ? data.products[0]        : data.products
        found = { serial: data.serial, status: data.status, batch_name: b?.batch_name ?? '—', product_name: p?.name ?? '—', valid: true }
      } else {
        found = { serial: raw, status: 'unknown', batch_name: '—', product_name: '—', valid: false }
      }
    }

    setScanned(prev => [found!, ...prev])
    if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = scanRef.current?.value?.trim().toUpperCase() ?? ''
    if (!raw) return
    await lookupSerial(raw)
  }

  const handleCameraScan = async (raw: string) => {
    const serial = raw.includes('/V/') || raw.includes('/v/')
      ? decodeURIComponent(raw.split(/\/[Vv]\//)[1]?.split(/[?#]/)[0] ?? raw)
      : raw
    if (scanRef.current) scanRef.current.value = serial.toUpperCase()
    await lookupSerial(serial.trim().toUpperCase())
  }

  const removeUnit = (serial: string) => {
    setScanned(prev => prev.filter(u => u.serial !== serial))
  }

  const handleSubmitAll = async (passed: boolean) => {
    const validUnits = scanned.filter(u => u.valid)
    if (!validUnits.length) return
    setSubmitting(true)

    const sb       = createClient()
    const newStatus = passed ? 'qa_passed' : 'qa_failed'
    const serials   = validUnits.map(u => u.serial)

    await sb.from('product_units').update({
      status          : newStatus,
      firmware_version: firmware,
      qa_notes        : notes.trim() || null,
      qa_passed_at    : passed ? new Date().toISOString() : null,
    }).in('serial', serials)

    const events = serials.map(serial => ({
      serial,
      kind: newStatus,
      data: { firmware, notes: notes.trim() || null },
    }))
    await sb.from('unit_events').insert(events)

    setSubmitted({ passed: passed ? validUnits.length : 0, failed: passed ? 0 : validUnits.length })
    setSubmitting(false)
    setScanned([])
    setNotes('')
  }

  const reset = () => {
    setScanned([])
    setSubmitted(null)
    setScanErr(null)
    setNotes('')
  }

  const validCount   = scanned.filter(u => u.valid).length
  const invalidCount = scanned.filter(u => !u.valid).length

  return (
    <div className="space-y-4">

      {/* Success banner */}
      {submitted && (
        <div className="rounded-2xl border p-5 text-center space-y-3"
          style={{ background: submitted.passed > 0 ? '#10b98110' : '#ef444410', borderColor: submitted.passed > 0 ? '#10b98130' : '#ef444430' }}>
          <div className="flex items-center justify-center gap-2">
            {submitted.passed > 0
              ? <CheckCircle className="w-6 h-6" style={{ color: '#10b981' }} />
              : <XCircle    className="w-6 h-6" style={{ color: '#ef4444' }} />
            }
            <p className="font-bold text-lg" style={{ color: submitted.passed > 0 ? '#10b981' : '#ef4444' }}>
              {submitted.passed > 0
                ? `${submitted.passed} units marked QA Passed`
                : `${submitted.failed} units marked QA Failed`}
            </p>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Firmware: {firmware}</p>
          <button onClick={reset}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Scan Next Batch
          </button>
        </div>
      )}

      {!submitted && (
        <div className="grid md:grid-cols-2 gap-4">

          {/* ── Left: Scan ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)', boxShadow: '0 0 0 1px #3b82f615' }}>

              <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
                <FlaskConical className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>QA Station</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Scan all units → set firmware → Pass All or Fail All
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Camera */}
                <CameraScanner active={cameraOpen} onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />

                {/* Scan input */}
                <form onSubmit={handleScan} className="flex gap-2">
                  <Input
                    ref={scanRef}
                    autoFocus={!cameraOpen}
                    placeholder="Scan or type serial…"
                    className="flex-1 h-11 border rounded-lg text-sm font-mono"
                    style={inputStyle}
                  />
                  <button type="button"
                    onClick={() => setCameraOpen(o => !o)}
                    className="px-3 py-2.5 rounded-lg border text-sm font-semibold"
                    style={{
                      background : cameraOpen ? 'var(--accent)' : 'var(--bg-secondary)',
                      borderColor: cameraOpen ? 'var(--accent)' : 'var(--border-dim)',
                      color      : cameraOpen ? '#fff' : 'var(--text-secondary)',
                    }}>
                    {cameraOpen ? <Keyboard className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  </button>
                  <button type="submit"
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    Add
                  </button>
                </form>

                {scanErr && (
                  <p className="px-3 py-2 rounded-lg text-sm"
                    style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
                    ⚠ {scanErr}
                  </p>
                )}

                {/* Stats */}
                {scanned.length > 0 && (
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg p-3 text-center"
                      style={{ background: '#10b98110', border: '1px solid #10b98128' }}>
                      <p className="text-2xl font-black" style={{ color: '#10b981' }}>{validCount}</p>
                      <p className="text-xs" style={{ color: '#10b981' }}>Ready</p>
                    </div>
                    {invalidCount > 0 && (
                      <div className="flex-1 rounded-lg p-3 text-center"
                        style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                        <p className="text-2xl font-black" style={{ color: '#ef4444' }}>{invalidCount}</p>
                        <p className="text-xs" style={{ color: '#ef4444' }}>Not Found</p>
                      </div>
                    )}
                    <div className="flex-1 rounded-lg p-3 text-center"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}>
                      <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{scanned.length}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Firmware + Actions ── */}
            {scanned.length > 0 && (
              <div className="rounded-2xl border p-5 space-y-4"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>Firmware Version</Label>
                  <select value={firmware} onChange={e => setFirmware(e.target.value)}
                    className="w-full h-10 px-3 border rounded-lg text-sm"
                    style={inputStyle}>
                    {FIRMWARE_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>QA Notes — optional</Label>
                  <Input placeholder="e.g. All tests passed"
                    value={notes} onChange={e => setNotes(e.target.value)}
                    className="h-10 border rounded-lg text-sm" style={inputStyle} />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmitAll(true)}
                    disabled={submitting || validCount === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                    style={{ background: '#10b981', color: '#fff' }}>
                    <CheckCircle className="w-4 h-4" />
                    {submitting ? '…' : `Pass All ${validCount}`}
                  </button>
                  <button
                    onClick={() => handleSubmitAll(false)}
                    disabled={submitting || validCount === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                    style={{ background: '#ef4444', color: '#fff' }}>
                    <XCircle className="w-4 h-4" />
                    {submitting ? '…' : `Fail All ${validCount}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Scanned list ── */}
          <div className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Scanned Units
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                  {scanned.length}
                </span>
                {scanned.length > 0 && (
                  <button onClick={reset}
                    className="text-xs px-2 py-1 rounded-lg border"
                    style={{ borderColor: '#ef444430', color: '#ef4444' }}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y overflow-y-auto" style={{ borderColor: 'var(--border-dim)', maxHeight: '60vh' }}>
              {scanned.length === 0 ? (
                <div className="py-12 text-center">
                  <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-primary)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No units scanned yet</p>
                </div>
              ) : scanned.map((unit, i) => (
                <div key={unit.serial} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {unit.serial}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {unit.valid ? `${unit.product_name} · ${unit.batch_name}` : '⚠ Not found in DB'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: unit.valid ? '#10b98115' : '#ef444415',
                        color     : unit.valid ? '#10b981'   : '#ef4444',
                      }}>
                      {unit.valid ? unit.status : 'invalid'}
                    </span>
                    <button onClick={() => removeUnit(unit.serial)}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ color: 'var(--text-dim)' }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}