"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback, useRef } from "react"
import type { Subscription } from "@/types/subscription"

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isInstructor, setIsInstructor] = useState(false)

  const isCheckingRef = useRef(false)
  const mountedRef = useRef(true)

  const checkSubscription = useCallback(async () => {
    if (isCheckingRef.current || !mountedRef.current) {
      console.log("[v0] CLIENT: Skipping subscription check - already checking or unmounted")
      return
    }

    isCheckingRef.current = true
    console.log("[v0] CLIENT: Starting unified subscription check...")

    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !mountedRef.current) {
        console.log("[v0] CLIENT: No user found or component unmounted")
        setSubscription(null)
        setIsAdmin(false)
        setIsInstructor(false)
        setLoading(false)
        return
      }

      console.log("[v0] CLIENT: Checking roles for user:", user.email)

      let userIsAdmin = false
      let userIsInstructor = false

      if (user.email === "admin@admin.com") {
        console.log("[v0] CLIENT: Hardcoded admin detected")
        userIsAdmin = true
      } else {
        try {
          console.log("[v0] CLIENT: Checking instructor role via admin API...")
          const response = await fetch("/api/admin/users")
          if (response.ok) {
            const result = await response.json()
            const users = result.users || []
            const currentUser = users.find((u: any) => u.email === user.email)

            if (currentUser) {
              userIsAdmin = currentUser.role === "admin"
              userIsInstructor = currentUser.role === "instructor"
              console.log("[v0] CLIENT: API role found:", currentUser.role)
            } else {
              console.log("[v0] CLIENT: User not found in admin API")
            }
          } else {
            console.log("[v0] CLIENT: Admin API not accessible, trying database...")
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .single()

            if (!profileError && profile) {
              userIsAdmin = profile.role === "admin"
              userIsInstructor = profile.role === "instructor"
              console.log("[v0] CLIENT: Database role found:", profile.role)
            } else {
              console.log("[v0] CLIENT: Database role query failed:", profileError?.message)
            }
          }
        } catch (roleError) {
          console.error("[v0] CLIENT: Role check error:", roleError)
        }
      }

      if (!mountedRef.current) return

      setIsAdmin(userIsAdmin)
      setIsInstructor(userIsInstructor)

      if (userIsAdmin) {
        console.log("[v0] CLIENT: Setting admin subscription")
        localStorage.setItem("user_role_cache", "admin")
        const adminSubscription: Subscription = {
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

      if (userIsInstructor) {
        console.log("[v0] CLIENT: Setting instructor subscription")
        localStorage.setItem("user_role_cache", "instructor")
        const instructorSubscription: Subscription = {
          id: "instructor-subscription",
          status: "active",
          end_date: "2099-12-31",
          plan_type: "instructor",
          price: 0,
          payment_method: "instructor",
        }
        setSubscription(instructorSubscription)
        setLoading(false)
        return
      }

      localStorage.setItem("user_role_cache", "user")
      console.log("[v0] CLIENT: Checking regular subscription...")
      const { data, error: queryError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("member_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)

      if (queryError) {
        console.log("[v0] CLIENT: Subscription query error:", queryError.message)
        setSubscription(null)
      } else {
        const subscriptionData = Array.isArray(data) && data.length > 0 ? data[0] : null
        console.log("[v0] CLIENT: Regular subscription data:", subscriptionData)
        setSubscription(subscriptionData)
      }
    } catch (err) {
      console.error("[v0] CLIENT: Subscription check failed:", err)
      setError("Failed to check subscription")
      setSubscription(null)
    } finally {
      if (mountedRef.current) {
        console.log("[v0] CLIENT: Unified subscription check completed")
        setLoading(false)
      }
      isCheckingRef.current = false
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (mountedRef.current) {
      checkSubscription()
    }
  }, [checkSubscription])

  return {
    subscription,
    hasActiveSubscription: !!subscription || isAdmin || isInstructor,
    loading,
    error,
    refetch: checkSubscription,
    isAdmin,
    isInstructor,
  }
}
