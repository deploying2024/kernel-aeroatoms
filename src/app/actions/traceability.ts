'use server'

import { createClient } from '@/lib/supabase/server'
import { makeSerial } from '@/lib/serials'

export async function createBatch(
  productId     : string,
  productName   : string,
  batchName     : string,
  qty           : number,
  notes         : string | null,
  manufacturedOn: string,   // ISO date e.g. "2026-09-03" — drives the YYMM in the serial
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

  // Pass mfgDate so serials say e.g. 2609 for Sept 2026, not today's date
  const units = Array.from({ length: qty }, () => ({
    serial    : makeSerial(code, mfgDate),
    product_id: productId,
    batch_id  : batch.id,
  }))

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