"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Subscription {
  id: string
  status: string
  end_date: string
  plan_type: string
  price: number
  payment_method?: string
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  const checkSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      await new Promise((resolve) => setTimeout(resolve, 1000))

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log("[v0] CLIENT: No user found, setting subscription to null")
        setSubscription(null)
        setIsAdmin(false)
        setLoading(false)
        return
      }

      console.log("[v0] CLIENT: Checking subscription for user:", user.id)
      console.log("[v0] CLIENT: User email:", user.email)

      let userIsAdmin = false
      try {
        console.log("[v0] CLIENT: Checking admin status via API...")
        const adminResponse = await fetch("/api/admin/users")
        if (adminResponse.ok) {
          const adminData = await adminResponse.json()
          const currentUser = adminData.users?.find((u: any) => u.id === user.id)
          userIsAdmin = currentUser?.role === "admin"
          console.log("[v0] CLIENT: Admin check via API successful:", userIsAdmin)
        } else {
          const adminEmails = ["admin@admin.com", "leartshabija0@gmail.com"]
          userIsAdmin = adminEmails.includes(user.email || "")
          console.log("[v0] CLIENT: Admin check via email fallback:", userIsAdmin)
        }
      } catch (adminError) {
        console.log("[v0] CLIENT: Admin API check failed, using email fallback")
        const adminEmails = ["admin@admin.com", "leartshabija0@gmail.com"]
        userIsAdmin = adminEmails.includes(user.email || "")
      }

      console.log("[v0] CLIENT: Final admin status:", userIsAdmin)
      setIsAdmin(userIsAdmin)

      if (userIsAdmin) {
        console.log("[v0] CLIENT: User is admin, bypassing subscription check")
        const adminSubscription = {
          id: "admin-subscription",
          status: "active",
          end_date: "2099-12-31",
          plan_type: "admin",
          price: 0,
          payment_method: "admin",
        }
        setSubscription(adminSubscription)
        setLoading(false)
        return
      }

      console.log("[v0] CLIENT: User is not admin, checking regular subscription...")

      let retryCount = 0
      const maxRetries = 2

      while (retryCount < maxRetries) {
        const { data, error: queryError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("member_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)

        console.log("[v0] CLIENT: Active subscription query result:", data)
        console.log("[v0] CLIENT: Active subscription query error:", queryError)

        if (queryError) {
          console.error("[v0] CLIENT: Subscription check error:", queryError)
          setError(queryError.message)
          setSubscription(null)
          break
        }

        const subscriptionData = Array.isArray(data) && data.length > 0 ? data[0] : null
        console.log("[v0] CLIENT: Final subscription data:", subscriptionData)

        if (subscriptionData) {
          setSubscription(subscriptionData)
          try {
            localStorage.setItem("yamabushi_subscription", JSON.stringify(subscriptionData))
          } catch (e) {
            console.log("[v0] CLIENT: Failed to cache subscription:", e)
          }
          break
        }

        retryCount++
        if (retryCount < maxRetries) {
          console.log(`[v0] CLIENT: No active subscription found, retrying... (${retryCount}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } else {
          console.log("[v0] CLIENT: No active subscription after retries, redirecting to subscription page")
          setSubscription(null)
        }
      }
    } catch (err) {
      console.error("[v0] CLIENT: Subscription check failed:", err)

      try {
        const cached = localStorage.getItem("yamabushi_subscription")
        if (cached) {
          const cachedSubscription = JSON.parse(cached)
          console.log("[v0] CLIENT: Using cached subscription:", cachedSubscription)
          setSubscription(cachedSubscription)
          setError(null)
        } else {
          setError("Failed to check subscription")
          setSubscription(null)
        }
      } catch (cacheError) {
        setError("Failed to check subscription")
        setSubscription(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])

  return {
    subscription,
    hasActiveSubscription: !!subscription || isAdmin,
    loading,
    error,
    refetch: checkSubscription,
    isAdmin,
  }
}
