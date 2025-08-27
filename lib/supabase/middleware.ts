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
    console.error("[v0] Missing Supabase environment variables in middleware")
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
  const isApiPath = pathname.startsWith("/api")

  // Only redirect unauthenticated users from protected routes
  if (!isRootPath && !user && !isAuthPath && !isSubscriptionPath && !isApiPath) {
    const url = request.nextUrl.clone()
    const locale = pathname.split("/")[1]
    if (locale && locale.length === 2) {
      url.pathname = `/${locale}/auth/login`
    } else {
      url.pathname = "/fr/auth/login"
    }
    console.log(`[v0] MIDDLEWARE: Redirecting unauthenticated user to login: ${pathname}`)
    return NextResponse.redirect(url)
  }

  // Block access to admin routes for non-admins (no redirect, just block)
  if (user && isAdminPath && !isApiPath) {
    const isHardcodedAdmin = user.email === "admin@admin.com"

    if (!isHardcodedAdmin) {
      // Check database role with error handling
      try {
        const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        if (error || !profile || profile.role !== "admin") {
          console.log(`[v0] MIDDLEWARE: Blocking non-admin access to ${pathname}: ${user.email}`)
          const url = request.nextUrl.clone()
          url.pathname = "/dashboard"
          return NextResponse.redirect(url)
        }
      } catch (error) {
        console.error(`[v0] MIDDLEWARE: Error checking admin role:`, error)
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }
    }

    console.log(`[v0] MIDDLEWARE: Admin access granted to ${pathname}: ${user.email}`)
  }

  // Block access to instructor routes for non-instructors (no redirect, just block)
  if (user && isInstructorPath && !isApiPath) {
    try {
      const adminApiUrl = new URL("/api/admin/users", request.nextUrl.origin)
      const adminResponse = await fetch(adminApiUrl.toString(), {
        headers: {
          Cookie: request.headers.get("cookie") || "",
        },
      })

      if (adminResponse.ok) {
        const adminData = await adminResponse.json()
        const isInstructor = adminData.users?.some((u: any) => u.email === user.email && u.role === "instructor")

        if (!isInstructor) {
          console.log(`[v0] MIDDLEWARE: Blocking non-instructor access to ${pathname}: ${user.email}`)
          const url = request.nextUrl.clone()
          url.pathname = "/dashboard"
          return NextResponse.redirect(url)
        }

        console.log(`[v0] MIDDLEWARE: Instructor access granted to ${pathname}: ${user.email}`)
      } else {
        // Fallback to database query if API fails
        const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        if (error || !profile || profile.role !== "instructor") {
          console.log(`[v0] MIDDLEWARE: Blocking non-instructor access to ${pathname}: ${user.email}`)
          const url = request.nextUrl.clone()
          url.pathname = "/dashboard"
          return NextResponse.redirect(url)
        }

        console.log(`[v0] MIDDLEWARE: Instructor access granted to ${pathname}: ${user.email}`)
      }
    } catch (error) {
      console.error(`[v0] MIDDLEWARE: Error checking instructor role:`, error)
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: Return the supabaseResponse object as-is to maintain cookie sync
  return supabaseResponse
}
