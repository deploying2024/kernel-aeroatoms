//web-cryto
'use server'

import { createClient } from '@/lib/supabase/server'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes.buffer as ArrayBuffer
}

async function getKey(): Promise<CryptoKey> {
  const k = process.env.SERIAL_HMAC_KEY
  if (!k) throw new Error('SERIAL_HMAC_KEY is not set')
  return crypto.subtle.importKey(
    'raw',
    hexToBytes(k),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

async function sign(body: string): Promise<string> {
  const key    = await getKey()
  const enc    = new TextEncoder()
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const hex    = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 4).toUpperCase()
}

async function makeSerial(productCode: string, date?: Date): Promise<string> {
  const d    = date ?? new Date()
  const yymm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`
  let rand   = ''
  for (let i = 0; i < 6; i++) rand += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  const body = `ORB-${productCode}-${yymm}-${rand}`
  const sig  = await sign(body)
  return `${body}-${sig}`
}

export async function createBatch(
  productId     : string,
  productName   : string,
  batchName     : string,
  qty           : number,
  notes         : string | null,
  manufacturedOn: string,
): Promise<{ error: string } | { batchId: string }> {
  const supabase = await createClient()

  const code    = productName.split(' ').pop()
    ?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) ?? 'ORB'

  const mfgDate = new Date(manufacturedOn)

  const { data: batch, error: bErr } = await supabase
    .from('product_batches')
    .insert({ batch_name: batchName, product_id: productId, qty, notes, manufactured_on: manufacturedOn })
    .select().single()

  if (bErr || !batch) return { error: bErr?.message ?? 'Failed to create batch' }

  const units = await Promise.all(
    Array.from({ length: qty }, async () => ({
      serial    : await makeSerial(code, mfgDate),
      product_id: productId,
      batch_id  : batch.id,
    }))
  )

  const { error: uErr } = await supabase.from('product_units').insert(units)
  if (uErr) return { error: 'Batch created but serial insert failed: ' + uErr.message }

  return { batchId: batch.id }
}

export async function renameBatch(
  batchId  : string,
  batchName: string,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('product_batches')
    .update({ batch_name: batchName.trim() })
    .eq('id', batchId)
  if (error) return { error: error.message }
  return { ok: true }
}