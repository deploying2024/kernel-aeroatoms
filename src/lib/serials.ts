import { createHmac, timingSafeEqual } from 'crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function key() {
  const k = process.env.SERIAL_HMAC_KEY
  if (!k) throw new Error('SERIAL_HMAC_KEY is not set')
  return k
}

function sign(body: string) {
  return createHmac('sha256', key()).update(body).digest('hex').slice(0, 4).toUpperCase()
}

export function makeSerial(productCode: string, date?: Date): string {
  const d    = date ?? new Date()
  const yymm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`
  let rand   = ''
  for (let i = 0; i < 6; i++) rand += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  const body = `ORB-${productCode}-${yymm}-${rand}`
  return `${body}-${sign(body)}`
}

export function isValidSerial(serial: string): boolean {
  const s   = serial.trim().toUpperCase()
  const idx = s.lastIndexOf('-')
  if (idx < 0 || s.slice(idx + 1).length !== 4) return false
  const body = s.slice(0, idx)
  const sig  = s.slice(idx + 1)
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(sign(body)))
  } catch { return false }
}

export function verifyUrl(serial: string) {
  const base = process.env.NEXT_PUBLIC_VERIFY_BASE_URL ?? 'http://localhost:3000'
  return `${base}/v/${serial}`
}