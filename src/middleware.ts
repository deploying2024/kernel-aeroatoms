import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/sw.js')
  ) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  const isAuthenticated = !!user && !error

  // Security headers
  const securityHeaders: Record<string, string> = {
    'X-Frame-Options'          : 'DENY',
    'X-Content-Type-Options'   : 'nosniff',
    'Referrer-Policy'          : 'strict-origin-when-cross-origin',
    'Permissions-Policy'       : 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection'         : '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  }

  // Login route
  if (pathname.startsWith('/login')) {
    const res = isAuthenticated
      ? NextResponse.redirect(new URL('/dashboard', request.url))
      : supabaseResponse
    Object.entries(securityHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // Root redirect
  if (pathname === '/') {
    const res = NextResponse.redirect(
      new URL(isAuthenticated ? '/dashboard' : '/login', request.url)
    )
    Object.entries(securityHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // Protected routes
  if (!isAuthenticated) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith('sb-')) res.cookies.delete(name)
    })
    Object.entries(securityHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // Authenticated
  Object.entries(securityHeaders).forEach(([k, v]) =>
    supabaseResponse.headers.set(k, v)
  )
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|icon.*|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}