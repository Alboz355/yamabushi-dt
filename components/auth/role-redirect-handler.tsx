"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function RoleRedirectHandler() {
  const [isChecking, setIsChecking] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkRoleAndRedirect = async () => {
      try {
        console.log("[v0] ROLE_REDIRECT: Starting role check...")

        if (hasRedirected) {
          console.log("[v0] ROLE_REDIRECT: Already redirected, skipping")
          return
        }

        const userEmail = localStorage.getItem("supabase.auth.user.email")

        if (!userEmail || !isMounted) {
          setIsChecking(false)
          return
        }

        if (userEmail === "admin@admin.com") {
          console.log("[v0] ROLE_REDIRECT: Hardcoded admin detected, redirecting to admin panel")
          setHasRedirected(true)
          router.push("/admin")
          return
        }

        const cachedRole = localStorage.getItem("user_role_cache")
        if (cachedRole === "instructor" && isMounted) {
          console.log("[v0] ROLE_REDIRECT: Cached instructor detected, redirecting to instructor interface")
          setHasRedirected(true)
          router.push("/instructor")
          return
        }

        console.log("[v0] ROLE_REDIRECT: Regular user, staying on dashboard")
      } catch (error) {
        console.error("[v0] ROLE_REDIRECT: Error checking role:", error)
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    const timer = setTimeout(checkRoleAndRedirect, 50)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [router, hasRedirected])

  // Show nothing while checking (prevents flash)
  if (isChecking) {
    return null
  }

  return null
}
