import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title          : 'Kernel — AeroAtoms',
  description    : 'AeroAtoms Operations Platform',
  applicationName: 'Kernel',
  manifest       : '/manifest.json',
  icons          : {
    icon    : '/logo.png',
    apple   : '/logo.png',
    shortcut: '/logo.png',
  },
  appleWebApp: {
    capable       : true,
    statusBarStyle : 'black-translucent',
    title         : 'Kernel',
  },
}

export const viewport: Viewport = {
  themeColor  : '#0a0a0a',
  width       : 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit : 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(reg) { console.log('SW registered'); })
                  .catch(function(err) { console.log('SW failed:', err); });
              });
            }
          `
        }} />
      </body>
    </html>
  )
}