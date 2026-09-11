'use client'

import { useState } from 'react'
import { QrCode, FlaskConical, Package, Search, Plus } from 'lucide-react'
import BatchesTab  from './batches-tab'
import QaTab       from './qa-tab'
import PackTab     from './pack-tab'
import LookupTab   from './lookup-tab'
import type { Product, Batch, Company, Order } from './types'


const TABS = [
  { id: 'batches', label: 'Batches',  icon: QrCode       },
  { id: 'qa',      label: 'QA',       icon: FlaskConical  },
  { id: 'pack',    label: 'Pack',     icon: Package       },
  { id: 'lookup',  label: 'Lookup',   icon: Search        },
]

export default function TraceabilityClient({
  products,
  batches,
  companies,
  orders,
}: {
  products  : Product[]
  batches   : Batch[]
  companies : Company[]
  orders    : Order[]
}) {
  const [activeTab, setActiveTab] = useState('batches')

  return (
    <div className="px-6 md:px-10 py-6 space-y-6">

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-dim)' }}
      >
        {TABS.map(tab => {
          const Icon    = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background : isActive ? 'var(--accent)' : 'transparent',
                color      : isActive ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'batches' && (
        <BatchesTab products={products} batches={batches} />
      )}
      {activeTab === 'qa' && (
        <QaTab batches={batches} />
      )}
      {activeTab === 'pack' && (
        <PackTab batches={batches} companies={companies} orders={orders} />
      )}
      {activeTab === 'lookup' && (
        <LookupTab />
      )}
    </div>
  )
}