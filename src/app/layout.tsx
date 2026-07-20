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
    capable        : true,
    statusBarStyle : 'black-translucent',
    title          : 'Kernel',
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

        {/* ── Session watcher + SW registration ── */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {

              // ── Register service worker ──
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .catch(function(err) { console.log('SW failed:', err); });
                });
              }

              var SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in ms
              var LOGIN_TIME_KEY   = 'kernel_login_time';

              function getSupabaseSessionKey() {
                try {
                  return Object.keys(localStorage).find(function(k) {
                    return k.startsWith('sb-') && k.endsWith('-auth-token');
                  });
                } catch(e) { return null; }
              }

              function logout() {
                try {
                  // Clear login time
                  localStorage.removeItem(LOGIN_TIME_KEY);

                  // Clear all supabase keys from localStorage
                  Object.keys(localStorage).forEach(function(k) {
                    if (k.startsWith('sb-')) localStorage.removeItem(k);
                  });

                  // Clear supabase cookies
                  document.cookie.split(';').forEach(function(c) {
                    var name = c.trim().split('=')[0];
                    if (name.startsWith('sb-')) {
                      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    }
                  });
                } catch(e) {}

                if (!window.location.pathname.startsWith('/login')) {
                  window.location.href = '/login';
                }
              }

              function checkSession() {
                try {
                  var sessionKey = getSupabaseSessionKey();

                  // No active session — skip
                  if (!sessionKey) return;

                  var loginTime = localStorage.getItem(LOGIN_TIME_KEY);

                  if (!loginTime) {
                    // Session exists but no login time recorded — record it now
                    localStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
                    return;
                  }

                  var elapsed = Date.now() - parseInt(loginTime, 10);

                  if (elapsed >= SESSION_DURATION) {
                    console.log('Kernel: session expired after 2 hours — logging out');
                    logout();
                  }
                } catch(e) {}
              }

              // Check every 30 seconds
              setInterval(checkSession, 30000);

              // Check when user switches back to tab
              document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'visible') {
                  checkSession();
                }
              });

              // Check when window gains focus
              window.addEventListener('focus', checkSession);

              // Check immediately on load
              window.addEventListener('load', checkSession);

              // Record login time when Supabase session is first written
              window.addEventListener('storage', function(e) {
                if (
                  e.key &&
                  e.key.startsWith('sb-') &&
                  e.key.endsWith('-auth-token') &&
                  e.newValue &&
                  !localStorage.getItem(LOGIN_TIME_KEY)
                ) {
                  localStorage.setItem(LOGIN_TIME_KEY, String(Date.now()));
                }
              });

            })();
          `
        }} />
      </body>
    </html>
  )
}