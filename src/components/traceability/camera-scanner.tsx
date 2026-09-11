'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, CameraOff } from 'lucide-react'

interface Props {
  onScan  : (serial: string) => void
  active  : boolean
  onClose : () => void
}

export default function CameraScanner({ onScan, active, onClose }: Props) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const lastRef    = useRef<{ text: string; at: number }>({ text: '', at: 0 })
  const [error, setError] = useState<string | null>(null)

  const handleScan = useCallback((text: string) => {
    const now = Date.now()
    // Debounce — ignore same code within 2s
    if (text === lastRef.current.text && now - lastRef.current.at < 2000) return
    lastRef.current = { text, at: now }
    // Extract serial from full verify URL if needed
    const serial = text.includes('/v/') || text.includes('/V/')
      ? decodeURIComponent(text.split(/\/[Vv]\//)[1]?.split(/[?#]/)[0] ?? text)
      : text
    if (navigator.vibrate) navigator.vibrate(80)
    onScan(serial.trim().toUpperCase())
  }, [onScan])

  useEffect(() => {
    if (!active) return

    let cancelled = false

    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Camera requires HTTPS or localhost. Run: npm run dev:https')
          return
        }

        const { Html5Qrcode } = await import('html5-qrcode')
        const scanner = new Html5Qrcode('qr-reader-kernel')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          handleScan,
          () => {} // ignore frame-level errors
        )

        if (cancelled) {
          await scanner.stop().catch(() => {})
        }
      } catch (err: any) {
        // Retry with any camera if environment-facing fails (desktop/USB cam)
        try {
          const { Html5Qrcode } = await import('html5-qrcode')
          const scanner = new Html5Qrcode('qr-reader-kernel')
          scannerRef.current = scanner
          await scanner.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            handleScan,
            () => {}
          )
          if (cancelled) await scanner.stop().catch(() => {})
        } catch (err2: any) {
          setError(err2?.message ?? 'Could not start camera')
        }
      }
    })()

    return () => {
      cancelled = true
      const s = scannerRef.current
      scannerRef.current = null
      if (s) s.stop().then(() => s.clear()).catch(() => {})
    }
  }, [active, handleScan])

  // Stop when closed
  useEffect(() => {
    if (!active) {
      const s = scannerRef.current
      scannerRef.current = null
      if (s) s.stop().then(() => s.clear()).catch(() => {})
      setError(null)
    }
  }, [active])

  if (!active) return null

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--accent-border)', boxShadow: '0 0 0 1px #3b82f615' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--accent-soft)' }}
      >
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Camera Scanner
          </p>
          {!error && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: '#10b98115', color: '#10b981' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430' }}
        >
          Close
        </button>
      </div>

      {/* html5-qrcode mounts into this div */}
      {!error && (
        <div id="qr-reader-kernel" className="w-full" style={{ background: '#000' }} />
      )}

      {error && (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
          <CameraOff className="w-10 h-10 opacity-40" style={{ color: '#ef4444' }} />
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      <p className="px-4 py-2.5 text-xs text-center" style={{ color: 'var(--text-dim)' }}>
        Point camera at QR label — serial loads automatically · phone vibrates on read
      </p>
    </div>
  )
}