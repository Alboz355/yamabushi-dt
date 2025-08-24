"use client"

import type React from "react"

import { useSubscription } from "@/hooks/use-subscription"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

interface SubscriptionGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SubscriptionGuard({ children, fallback }: SubscriptionGuardProps) {
  const { hasActiveSubscription, loading, error, refetch, isAdmin } = useSubscription()
  const router = useRouter()
  const retryCountRef = useRef(0)
  const maxRetries = 2 // Reduced for mobile performance
  const hasRedirectedRef = useRef(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!loading && isAdmin && typeof window !== "undefined" && window.location.pathname !== "/admin") {
      console.log("[v0] CLIENT: Admin detected in SubscriptionGuard, redirecting to admin panel")
      hasRedirectedRef.current = true
      setIsRedirecting(true)

      // Use window.location.href for immediate redirection that actually works
      window.location.href = "/admin"
    }
  }, [isAdmin, loading])

  useEffect(() => {
    if (!loading && !hasActiveSubscription && !error && !hasRedirectedRef.current && !isRedirecting && !isAdmin) {
      if (retryCountRef.current < maxRetries) {
        console.log(
          `[v0] CLIENT: No active subscription found, retrying... (${retryCountRef.current + 1}/${maxRetries})`,
        )
        retryCountRef.current++
        setTimeout(() => {
          refetch()
        }, 1500) // Reduced delay for better mobile UX
      } else {
        console.log("[v0] CLIENT: No active subscription after retries, redirecting to subscription page")
        hasRedirectedRef.current = true
        setIsRedirecting(true)

        setTimeout(() => {
          router.push("/subscription")
        }, 500)
      }
    } else if (hasActiveSubscription || isAdmin) {
      console.log("[v0] CLIENT: Active subscription or admin found, resetting retry count")
      retryCountRef.current = 0
      if (!isAdmin) {
        hasRedirectedRef.current = false
      }
      setIsRedirecting(false)
    }
  }, [hasActiveSubscription, loading, error, router, refetch, isRedirecting, isAdmin])

  if (loading || (!hasActiveSubscription && retryCountRef.current < maxRetries && !hasRedirectedRef.current)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {retryCountRef.current > 0 ? "Vérification de votre abonnement..." : "Chargement..."}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur de vérification d'abonnement</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if ((!hasActiveSubscription && hasRedirectedRef.current) || isRedirecting) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {isAdmin ? "Redirection vers le tableau de bord admin..." : "Redirection vers la page d'abonnement..."}
            </p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
