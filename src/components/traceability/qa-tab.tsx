'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FlaskConical, CheckCircle, XCircle, RotateCcw, Camera, Keyboard } from 'lucide-react'
import type { Unit, Batch } from './types'
import CameraScanner from './camera-scanner'

const FIRMWARE_VERSIONS = ['1.0.0', '1.1.0', '1.2.0', '1.3.0']

type ScannedUnit = {
  serial      : string
  status      : string
  batch_name  : string
  product_name: string
}

export default function QaTab({ batches }: { batches: Batch[] }) {
  const scanRef   = useRef<HTMLInputElement>(null)

  const [scanned,    setScanned]    = useState<ScannedUnit | null>(null)
  const [scanErr,    setScanErr]    = useState<string | null>(null)
  const [firmware,   setFirmware]   = useState(FIRMWARE_VERSIONS[FIRMWARE_VERSIONS.length - 1])
  const [notes,      setNotes]      = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<{ serial: string; passed: boolean } | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [sessionLog, setSessionLog] = useState<{ serial: string; passed: boolean; at: string }[]>([])

  const inputStyle = {
    background : 'var(--bg-input)',
    borderColor: 'var(--border-dim)',
    color      : 'var(--text-primary)',
  }

  const reset = () => {
    setScanned(null)
    setScanErr(null)
    setNotes('')
    if (scanRef.current) { scanRef.current.value = ''; scanRef.current.focus() }
  }

  // Shared lookup — used by both manual input and camera scan
  const lookupSerial = async (raw: string) => {
    setScanErr(null)
    setScanned(null)
    setLastResult(null)

    if (!/^ORB-[A-Z0-9]+-\d{4}-[A-Z0-9]+-[A-Z0-9]{4}$/.test(raw)) {
      setScanErr(`Not a valid AeroAtoms serial: ${raw}`)
      return
    }

    // Check in-memory batch data first (fast path)
    let found: ScannedUnit | null = null
    for (const b of batches) {
      const u = b.units.find(u => u.serial === raw)
      if (u) {
        found = {
          serial      : u.serial,
          status      : u.status,
          batch_name  : b.batch_name,
          product_name: b.product_name,
        }
        break
      }
    }

    // Fallback: DB lookup for older batches not in current page load
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
        found = {
          serial      : data.serial,
          status      : data.status,
          batch_name  : b?.batch_name ?? '—',
          product_name: p?.name      ?? '—',
        }
      }
    }

    if (!found) {
      setScanErr(`Serial not found in database: ${raw}`)
      return
    }

    setScanned(found)
  }

  // Manual form submit
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = scanRef.current?.value?.trim().toUpperCase() ?? ''
    if (!raw) return
    await lookupSerial(raw)
  }

  // Camera decoded a QR — extract serial from full URL if needed
  const handleCameraScan = async (raw: string) => {
    const serial = raw.includes('/V/') ? raw.split('/V/').pop() ?? raw : raw
    if (scanRef.current) scanRef.current.value = serial
    await lookupSerial(serial)
  }

  const handleQa = async (passed: boolean) => {
    if (!scanned) return
    setSubmitting(true)

    const sb        = createClient()
    const newStatus = passed ? 'qa_passed' : 'qa_failed'

    await sb.from('product_units').update({
      status          : newStatus,
      firmware_version: firmware,
      qa_notes        : notes.trim() || null,
      qa_passed_at    : passed ? new Date().toISOString() : null,
    }).eq('serial', scanned.serial)

    await sb.from('unit_events').insert({
      serial: scanned.serial,
      kind  : newStatus,
      data  : { firmware, notes: notes.trim() || null },
    })

    const entry = { serial: scanned.serial, passed, at: new Date().toLocaleTimeString('en-IN') }
    setSessionLog(prev => [entry, ...prev])
    setLastResult({ serial: scanned.serial, passed })

    setSubmitting(false)
    window.location.reload()
    reset()
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">

      {/* ── Left: Scan + form ── */}
      <div className="space-y-4">
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)', boxShadow: '0 0 0 1px #3b82f615' }}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b"
            style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}>
            <FlaskConical className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>QA Station</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Scan label → verify → pass or fail
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* Camera scanner — shown when open */}
            <CameraScanner
              active={cameraOpen}
              onScan={handleCameraScan}
              onClose={() => setCameraOpen(false)}
            />

            {/* Scan input row */}
            <form onSubmit={handleScan} className="flex gap-2">
              <Input
                ref={scanRef}
                autoFocus={!cameraOpen}
                placeholder="Scan or type serial…"
                className="flex-1 h-11 border rounded-lg text-sm font-mono"
                style={inputStyle}
              />
              {/* Camera toggle */}
              <button
                type="button"
                onClick={() => setCameraOpen(o => !o)}
                className="px-3 py-2.5 rounded-lg border text-sm font-semibold flex items-center gap-1.5"
                style={{
                  background : cameraOpen ? 'var(--accent)' : 'var(--bg-secondary)',
                  borderColor: cameraOpen ? 'var(--accent)' : 'var(--border-dim)',
                  color      : cameraOpen ? '#fff' : 'var(--text-secondary)',
                }}
                title={cameraOpen ? 'Switch to manual input' : 'Scan with camera'}
              >
                {cameraOpen ? <Keyboard className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Find
              </button>
            </form>

            {/* Scan error */}
            {scanErr && (
              <p className="px-3 py-2 rounded-lg text-sm"
                style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
                ⚠ {scanErr}
              </p>
            )}

            {/* Last result banner */}
            {lastResult && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: lastResult.passed ? '#10b98115' : '#ef444415',
                  border    : `1px solid ${lastResult.passed ? '#10b98130' : '#ef444430'}`,
                  color     : lastResult.passed ? '#10b981' : '#ef4444',
                }}
              >
                {lastResult.passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {lastResult.serial} — {lastResult.passed ? 'PASSED' : 'FAILED'}
              </div>
            )}

            {/* Unit found */}
            {scanned && (
              <div
                className="rounded-xl border p-4 space-y-4"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-dim)' }}
              >
                <div>
                  <p className="font-mono font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {scanned.serial}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {scanned.product_name} · {scanned.batch_name}
                  </p>
                  {scanned.status !== 'created' && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: '#f59e0b' }}>
                      ⚠ Current status: {scanned.status} — QA will overwrite
                    </p>
                  )}
                </div>

                {/* Firmware */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>
                    Firmware Version
                  </Label>
                  <select
                    value={firmware}
                    onChange={e => setFirmware(e.target.value)}
                    className="w-full h-10 px-3 border rounded-lg text-sm"
                    style={inputStyle}
                  >
                    {FIRMWARE_VERSIONS.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}>
                    QA Notes — optional
                  </Label>
                  <Input
                    placeholder="e.g. All tests passed, GPS lock 45s"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="h-10 border rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>

                {/* Pass / Fail / Reset */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleQa(true)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ background: '#10b981', color: '#fff' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {submitting ? '…' : 'Pass'}
                  </button>
                  <button
                    onClick={() => handleQa(false)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ background: '#ef4444', color: '#fff' }}
                  >
                    <XCircle className="w-4 h-4" />
                    {submitting ? '…' : 'Fail'}
                  </button>
                  <button
                    onClick={reset}
                    className="px-3 py-2.5 rounded-lg border"
                    style={{ borderColor: 'var(--border-dim)', color: 'var(--text-secondary)' }}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Session log ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-dim)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Session Log
          </p>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
          >
            {sessionLog.length} scanned
          </span>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-dim)' }}>
          {sessionLog.length === 0 ? (
            <div className="py-12 text-center">
              <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No units scanned this session</p>
            </div>
          ) : sessionLog.map((entry, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {entry.serial}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{entry.at}</p>
              </div>
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: entry.passed ? '#10b98115' : '#ef444415',
                  color     : entry.passed ? '#10b981'   : '#ef4444',
                }}
              >
                {entry.passed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {entry.passed ? 'Passed' : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}