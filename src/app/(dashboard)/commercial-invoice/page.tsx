import { createClient } from '@/lib/supabase/server'
import CommercialInvoiceClient from '@/components/commercial-invoice/invoice-client'
import { FileText } from 'lucide-react'

export default async function CommercialInvoicePage() {
  const supabase = await createClient()

  const { data: invoicesRaw } = await supabase
    .from('commercial_invoices')
    .select(`
      id, invoice_number, invoice_date,
      consignee_name, consignee_company,
      consignee_address, consignee_city, consignee_phone,
      total_weight, notes, created_at,
      commercial_invoice_items (
        id, invoice_id, description, type_of_packing,
        quantity, unit_value, sort_order
      )
    `)
    .order('created_at', { ascending: false })

  const invoices = (invoicesRaw ?? []).map((inv: any) => ({
    ...inv,
    commercial_invoice_items: (inv.commercial_invoice_items ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order),
  }))

  const sender = {
    name   : process.env.NEXT_PUBLIC_COMPANY_NAME    ?? 'AeroAtoms Pvt. Ltd.',
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? 'Your Address',
    city   : process.env.NEXT_PUBLIC_COMPANY_CITY    ?? 'City, State - Pincode',
    phone  : process.env.NEXT_PUBLIC_COMPANY_PHONE   ?? '+91 XXXXX XXXXX',
    email  : process.env.NEXT_PUBLIC_COMPANY_EMAIL   ?? 'hello@aeroatoms.com',
    gstin  : process.env.NEXT_PUBLIC_COMPANY_GSTIN   ?? '',
  }

  const logoUrl = process.env.NEXT_PUBLIC_INVOICE_LOGO_URL ?? '/logo.png'

  return (
    <div className="min-h-screen grid-bg animate-fade-up">
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}>
              Commercial Invoice
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Invoice · Shipping Label · All in one place
            </p>
          </div>
        </div>
      </div>

      <CommercialInvoiceClient
        invoices={invoices}
        sender={sender}
        logoUrl={logoUrl}
      />
    </div>
  )
}