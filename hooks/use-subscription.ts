"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

interface Subscription {
  id: string
  status: string
  end_date: string
  plan_type: string
  price: number
  payment_method?: string
}

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for faster updates
const API_COOLDOWN = 15000 // 15 seconds between API calls
const MAX_RETRIES = 2 // Reduced retries to prevent loops
const CIRCUIT_BREAKER_THRESHOLD = 3 // Reduced threshold
const CIRCUIT_BREAKER_TIMEOUT = 30000 // 30 seconds timeout

interface CachedRole {
  role: string
  timestamp: number
  userId: string
}

interface CircuitBreakerState {
  failures: number
  lastFailure: number
  isOpen: boolean
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
}

const globalRedirectionState = {
  isRedirecting: false,
  redirectionInProgress: false,
  lastRedirectTime: 0,
  redirectCooldown: 5000, // 5 seconds between redirections
  processedUsers: new Set<string>(), // Track users who have been processed
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isInstructor, setIsInstructor] = useState(false)
  const router = useRouter()

  const isCheckingRef = useRef(false)
  const lastApiCallRef = useRef(0)
  const mountedRef = useRef(true)
  const hasProcessedRef = useRef(false)

  const getCachedRole = useCallback((userId: string): CachedRole | null => {
    try {
      const cached = localStorage.getItem(`yamabushi_role_${userId}`)
      if (cached) {
        const parsedCache: CachedRole = JSON.parse(cached)
        const now = Date.now()
        if (now - parsedCache.timestamp < CACHE_DURATION && parsedCache.userId === userId) {
          console.log("[v0] CLIENT: Using persistent cached role:", parsedCache.role)
          return parsedCache
        }
      }
    } catch (e) {
      console.log("[v0] CLIENT: Failed to read role cache:", e)
    }
    return null
  }, [])

  const setCachedRole = useCallback((userId: string, role: string) => {
    try {
      const cacheData: CachedRole = {
        role,
        timestamp: Date.now(),
        userId,
      }
      localStorage.setItem(`yamabushi_role_${userId}`, JSON.stringify(cacheData))
      console.log("[v0] CLIENT: Cached role for user:", userId, "role:", role)
    } catch (e) {
      console.log("[v0] CLIENT: Failed to cache role:", e)
    }
  }, [])

  const isCircuitBreakerOpen = useCallback((): boolean => {
    const now = Date.now()

    if (circuitBreaker.isOpen && now - circuitBreaker.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
      console.log("[v0] CLIENT: Circuit breaker reset after timeout")
      circuitBreaker.isOpen = false
      circuitBreaker.failures = 0
    }

    return circuitBreaker.isOpen
  }, [])

  const recordApiFailure = useCallback(() => {
    circuitBreaker.failures++
    circuitBreaker.lastFailure = Date.now()

    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.isOpen = true
      console.log("[v0] CLIENT: Circuit breaker opened due to repeated failures")
    }
  }, [])

  const recordApiSuccess = useCallback(() => {
    circuitBreaker.failures = 0
    circuitBreaker.isOpen = false
  }, [])

  const safeRedirect = useCallback((path: string, reason: string, userId: string) => {
    const now = Date.now()
    const currentPath = typeof window !== "undefined" ? window.location.pathname : ""

    // Absolute prevention checks
    if (globalRedirectionState.isRedirecting) {
      console.log("[v0] CLIENT: BLOCKED - Global redirection already in progress")
      return false
    }

    if (globalRedirectionState.processedUsers.has(userId)) {
      console.log("[v0] CLIENT: BLOCKED - User already processed for redirection:", userId)
      return false
    }

    if (now - globalRedirectionState.lastRedirectTime < globalRedirectionState.redirectCooldown) {
      console.log("[v0] CLIENT: BLOCKED - Redirection cooldown active")
      return false
    }

    if (currentPath === path) {
      console.log("[v0] CLIENT: BLOCKED - Already on target path:", path)
      return false
    }

    console.log(`[v0] CLIENT: EXECUTING REDIRECTION - ${reason} - redirecting to ${path}`)

    // Set all global flags to prevent any further execution
    globalRedirectionState.isRedirecting = true
    globalRedirectionState.redirectionInProgress = true
    globalRedirectionState.lastRedirectTime = now
    globalRedirectionState.processedUsers.add(userId)
    hasProcessedRef.current = true

    // Immediate redirection with complete component shutdown
    if (typeof window !== "undefined") {
      // Use replace instead of href to prevent back button issues
      window.location.replace(path)
    }

    return true
  }, [])

  const checkSubscription = useCallback(async () => {
    if (isCheckingRef.current || !mountedRef.current || hasProcessedRef.current) {
      console.log("[v0] CLIENT: EARLY EXIT - Already checking, unmounted, or processed")
      return
    }

    if (globalRedirectionState.isRedirecting || globalRedirectionState.redirectionInProgress) {
      console.log("[v0] CLIENT: EARLY EXIT - Global redirection in progress")
      return
    }

    isCheckingRef.current = true

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

      if (globalRedirectionState.processedUsers.has(user.id)) {
        console.log("[v0] CLIENT: EARLY EXIT - User already processed:", user.id)
        setLoading(false)
        return
      }

      console.log("[v0] CLIENT: Checking subscription for user:", user.id)
      console.log("[v0] CLIENT: User email:", user.email)

      let userIsAdmin = false
      let userIsInstructor = false

      const cachedRole = getCachedRole(user.id)
      const now = Date.now()

      if (cachedRole) {
        userIsAdmin = cachedRole.role === "admin"
        userIsInstructor = cachedRole.role === "instructor"
        console.log("[v0] CLIENT: Using cached role - Admin:", userIsAdmin, "Instructor:", userIsInstructor)
      } else if (!isCircuitBreakerOpen() && now - lastApiCallRef.current > API_COOLDOWN) {
        try {
          console.log("[v0] CLIENT: Making API call to check roles...")
          lastApiCallRef.current = now

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // Reduced timeout

          const adminResponse = await fetch("/api/admin/users", {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          })

          clearTimeout(timeoutId)

          if (adminResponse.ok) {
            const adminData = await adminResponse.json()
            const currentUser = adminData.users?.find((u: any) => u.id === user.id)
            const userRole = currentUser?.role || "user"

            setCachedRole(user.id, userRole)
            recordApiSuccess()

            userIsAdmin = userRole === "admin"
            userIsInstructor = userRole === "instructor"
            console.log("[v0] CLIENT: API check successful - Admin:", userIsAdmin, "Instructor:", userIsInstructor)
          } else {
            throw new Error(`API returned ${adminResponse.status}`)
          }
        } catch (apiError) {
          console.log("[v0] CLIENT: API check failed:", apiError)
          recordApiFailure()

          const adminEmails = ["admin@admin.com"]
          userIsAdmin = adminEmails.includes(user.email || "")
          userIsInstructor = false

          const fallbackRole = userIsAdmin ? "admin" : "user"
          setCachedRole(user.id, fallbackRole)
          console.log("[v0] CLIENT: Using email fallback - Admin:", userIsAdmin)
        }
      } else {
        console.log("[v0] CLIENT: Using email fallback due to circuit breaker or cooldown")
        const adminEmails = ["admin@admin.com"]
        userIsAdmin = adminEmails.includes(user.email || "")
        userIsInstructor = false
      }

      if (!mountedRef.current || hasProcessedRef.current) return

      console.log("[v0] CLIENT: Final role determination - Admin:", userIsAdmin, "Instructor:", userIsInstructor)
      setIsAdmin(userIsAdmin)
      setIsInstructor(userIsInstructor)

      if (userIsInstructor && typeof window !== "undefined") {
        const currentPath = window.location.pathname
        if (currentPath === "/dashboard" || currentPath === "/") {
          const redirected = safeRedirect("/instructor", "Instructor detected on dashboard", user.id)
          if (redirected) {
            // ABSOLUTE STOP - No further execution after redirection
            isCheckingRef.current = false
            return
          }
        }
      }

      // Continue with subscription logic only if not redirected
      if (userIsAdmin) {
        console.log("[v0] CLIENT: Setting admin subscription")
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

      if (userIsInstructor) {
        console.log("[v0] CLIENT: Setting instructor subscription")
        const instructorSubscription = {
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

      console.log("[v0] CLIENT: User is not admin or instructor, checking regular subscription...")

      let retryCount = 0
      while (retryCount < MAX_RETRIES && mountedRef.current && !hasProcessedRef.current) {
        try {
          const { data, error: queryError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("member_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)

          if (queryError) {
            throw queryError
          }

          const subscriptionData = Array.isArray(data) && data.length > 0 ? data[0] : null
          console.log(
            "[v0] CLIENT: Subscription query result:",
            subscriptionData ? "Found active subscription" : "No active subscription",
          )

          if (subscriptionData) {
            console.log("[v0] CLIENT: Active subscription found, resetting retry count")
            setSubscription(subscriptionData)
            try {
              localStorage.setItem("yamabushi_subscription", JSON.stringify(subscriptionData))
            } catch (e) {
              console.log("[v0] CLIENT: Failed to cache subscription:", e)
            }
            break
          } else if (retryCount === MAX_RETRIES - 1) {
            console.log("[v0] CLIENT: No active subscription found after all retries")
            setSubscription(null)
          }
        } catch (subscriptionError) {
          console.error("[v0] CLIENT: Subscription query error:", subscriptionError)
          if (retryCount === MAX_RETRIES - 1) {
            setError("Failed to check subscription")
            setSubscription(null)
          }
        }

        retryCount++
        if (retryCount < MAX_RETRIES && mountedRef.current && !hasProcessedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
        }
      }
    } catch (err) {
      console.error("[v0] CLIENT: Subscription check failed:", err)

      try {
        const cached = localStorage.getItem("yamabushi_subscription")
        if (cached && mountedRef.current && !hasProcessedRef.current) {
          const cachedSubscription = JSON.parse(cached)
          console.log("[v0] CLIENT: Using cached subscription fallback")
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
      if (mountedRef.current && !hasProcessedRef.current) {
        setLoading(false)
      }
      isCheckingRef.current = false
    }
  }, [getCachedRole, setCachedRole, isCircuitBreakerOpen, recordApiFailure, recordApiSuccess, safeRedirect])

  useEffect(() => {
    mountedRef.current = true
    hasProcessedRef.current = false
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (mountedRef.current && !hasProcessedRef.current && !globalRedirectionState.isRedirecting) {
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
