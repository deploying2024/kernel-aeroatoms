// Uses Web Crypto API — works on Cloudflare Workers and Node.js both

async function getKey(): Promise<CryptoKey> {
  const k = process.env.SERIAL_HMAC_KEY
  if (!k) throw new Error('SERIAL_HMAC_KEY is not set')
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(k),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

async function sign(body: string): Promise<string> {
  const key = await getKey()
  const enc = new TextEncoder()
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const hex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 4).toUpperCase()
}

export async function isValidSerial(serial: string): Promise<boolean> {
  const s   = serial.trim().toUpperCase()
  const idx = s.lastIndexOf('-')
  if (idx < 0 || s.slice(idx + 1).length !== 4) return false
  const body     = s.slice(0, idx)
  const sigInput = s.slice(idx + 1)
  try {
    const expected = await sign(body)
    return expected === sigInput
  } catch { return false }
}