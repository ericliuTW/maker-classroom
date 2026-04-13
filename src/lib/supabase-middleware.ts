import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public paths
  const publicPaths = ['/login', '/student', '/api/']
  if (publicPaths.some(p => path.startsWith(p))) {
    return supabaseResponse
  }

  // Check student session
  const studentSession = request.cookies.get('student_session')
  const studentPaths = ['/inventory', '/ai-designer', '/knowledge', '/bookings', '/classroom']
  if (!user && studentPaths.some(p => path.startsWith(p))) {
    if (!studentSession) {
      return NextResponse.redirect(new URL('/student', request.url))
    }
    return supabaseResponse
  }

  // Teacher-only paths
  const teacherPaths = ['/settings', '/transactions']
  if (teacherPaths.some(p => path.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Root redirect
  if (path === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/inventory', request.url))
    }
    return NextResponse.redirect(new URL('/student', request.url))
  }

  return supabaseResponse
}
