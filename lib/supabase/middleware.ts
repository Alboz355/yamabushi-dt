import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest, response?: NextResponse) {
  let supabaseResponse =
    response ||
    NextResponse.next({
      request,
    })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase environment variables in middleware:", {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey,
    })
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse =
          response ||
          NextResponse.next({
            request,
          })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isRootPath = pathname === "/" || pathname.match(/^\/[a-z]{2}$/)
  const isAuthPath = pathname.includes("/auth")
  const isSubscriptionPath = pathname.includes("/subscription")
  const isAdminPath = pathname.includes("/admin")
  const isInstructorPath = pathname.includes("/instructor")

  if (!isRootPath && !user && !isAuthPath && !isSubscriptionPath) {
    const url = request.nextUrl.clone()
    const locale = pathname.split("/")[1]
    if (locale && locale.length === 2) {
      url.pathname = `/${locale}/auth/login`
    } else {
      url.pathname = "/fr/auth/login"
    }
    return NextResponse.redirect(url)
  }

  if (user && isAdminPath) {
    const isAdminEmail = user.email === "admin@admin.com" || user.email === "leartshabija0@gmail.com"

    if (!isAdminEmail) {
      // Non-admin trying to access admin routes - redirect to dashboard
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      console.log(`[v0] MIDDLEWARE: Blocking non-admin access to ${pathname}`)
      return NextResponse.redirect(url)
    }
  }

  if (user && isInstructorPath) {
    // TODO: Add proper instructor role checking when instructor system is ready
    console.log(`[v0] MIDDLEWARE: Allowing access to instructor route: ${pathname}`)
  }

  // IMPORTANT: Return the supabaseResponse object as-is to maintain cookie sync
  return supabaseResponse
}
