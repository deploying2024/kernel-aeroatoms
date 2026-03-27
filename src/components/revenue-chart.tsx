'use client'

import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type TooltipProps = {
  active?  : boolean
  payload? : { value: number }[]
  label?   : string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background   : 'var(--bg-card)',
        border       : '1px solid var(--accent-border)',
        borderRadius : '10px',
        padding      : '10px 14px',
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 2 }}>{label}</p>
        <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
          ₹{payload[0].value.toLocaleString('en-IN')}
        </p>
      </div>
    )
  }
  return null
}

type Props = { data: { month: string; total: number }[] }

export default function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm"
        style={{ color: 'var(--text-dim)' }}>
        No revenue data yet — create some orders to see the chart!
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
        <XAxis dataKey="month"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="total"
          stroke="var(--accent)" strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 4 }}
          activeDot={{ fill: 'var(--accent)', r: 6 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}