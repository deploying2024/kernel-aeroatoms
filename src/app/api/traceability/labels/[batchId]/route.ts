// pdf-lib and qrcode are Node.js-only — must not run on edge
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildLabelPdf } from '@/lib/labels'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params
  const supabase    = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: units } = await supabase
    .from('product_units')
    .select('serial')
    .eq('batch_id', batchId)
    .order('created_at')

  if (!units?.length) return new NextResponse('No units in batch', { status: 404 })

  const pdf = await buildLabelPdf(units.map(u => u.serial))

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type'       : 'application/pdf',
      'Content-Disposition': `attachment; filename="labels_${batchId}.pdf"`,
    },
  })
}