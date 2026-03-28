export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import ShippingClient from '@/components/shipping/shipping-client'
import { Truck } from 'lucide-react'

export default async function ShippingPage() {
  const supabase = await createClient()

  const { data: labels } = await supabase
    .from('shipping_labels')
    .select('*')
    .order('created_at', { ascending: false })

  const sender = {
    name   : process.env.NEXT_PUBLIC_COMPANY_NAME    ?? 'AeroAtoms Pvt. Ltd.',
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? 'Your Address',
    city   : process.env.NEXT_PUBLIC_COMPANY_CITY    ?? 'City, State - Pincode',
    phone  : process.env.NEXT_PUBLIC_COMPANY_PHONE   ?? '+91 XXXXX XXXXX',
    email  : process.env.NEXT_PUBLIC_COMPANY_EMAIL   ?? 'hello@aeroatoms.com',
  }

  return (
    <div className="min-h-screen grid-bg animate-fade-up">
      <div
        className="px-6 md:px-10 pt-8 pb-6 border-b"
        style={{ borderColor: 'var(--border-dim)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center glow-blue"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}
          >
            <Truck className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Shipping Labels
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Create and manage shipping labels
            </p>
          </div>
        </div>
      </div>

      <ShippingClient
        labels={labels ?? []}
        sender={sender}
      />
    </div>
  )
}