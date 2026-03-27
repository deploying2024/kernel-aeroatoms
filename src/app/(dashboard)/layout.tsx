import Sidebar from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar — fixed width, never shrinks */}
      <Sidebar />

      {/* Main content — scrolls independently */}
      <main className="flex-1 min-w-0 overflow-y-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  )
}