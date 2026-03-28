'use client'

import { useState } from 'react'
import { ShoppingCart, Users } from 'lucide-react'
import OrderForm from '@/components/order-form'
import OrderHistory from '@/components/order-history'
import ClientList from '@/components/client-list'
import type { GroupedOrder, Company, Product } from '@/lib/types'

type Props = {
  companies    : Company[]
  products     : Product[]
  groupedOrders: GroupedOrder[]
}

export default function OrdersPageClient({
  companies     = [],
  products      = [],
  groupedOrders = [],
}: Props) {
  const [tab, setTab] = useState<'orders' | 'clients'>('orders')

  return (
    <div className="px-6 md:px-10 py-8 space-y-8">

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}
      >
        {[
          { key: 'orders',  label: 'Orders',  icon: ShoppingCart },
          { key: 'clients', label: 'Clients', icon: Users        },
        ].map(t => {
          const Icon     = t.icon
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as 'orders' | 'clients')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={isActive ? {
                background : 'var(--accent)',
                color      : '#fff',
              } : {
                color      : 'var(--text-secondary)',
                background : 'transparent',
              }}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'orders' ? (
        <>
          <OrderForm
            companies={companies}
            products={products}
          />
          <OrderHistory
            orders={groupedOrders}
            companies={companies}
            products={products}
          />
        </>
      ) : (
        <ClientList orders={groupedOrders} />
      )}
    </div>
  )
}