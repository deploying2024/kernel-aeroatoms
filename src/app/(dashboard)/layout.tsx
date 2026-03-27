// export const runtime = 'edge'

import Sidebar from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}