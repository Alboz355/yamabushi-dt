"use client"

import type React from "react"

import { useSubscription } from "@/hooks/use-subscription"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

interface SubscriptionGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SubscriptionGuard({ children, fallback }: SubscriptionGuardProps) {
  const { hasActiveSubscription, loading, error, refetch } = useSubscription()
  const router = useRouter()
  const retryCountRef = useRef(0)
  const maxRetries = 2
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    if (!loading && !hasActiveSubscription && !error && !hasRedirectedRef.current) {
      if (retryCountRef.current < maxRetries) {
        console.log(
          `[v0] CLIENT: No active subscription found, retrying... (${retryCountRef.current + 1}/${maxRetries})`,
        )
        retryCountRef.current++
        setTimeout(() => {
          refetch()
        }, 1500)
      } else {
        console.log("[v0] CLIENT: No active subscription after retries, redirecting to subscription page")
        hasRedirectedRef.current = true

        setTimeout(() => {
          router.push("/subscription")
        }, 500)
      }
    } else if (hasActiveSubscription) {
      console.log("[v0] CLIENT: Active subscription found, resetting retry count")
      retryCountRef.current = 0
      hasRedirectedRef.current = false
    }
  }, [hasActiveSubscription, loading, error, router, refetch])

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

  if (!hasActiveSubscription && hasRedirectedRef.current) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Redirection vers la page d'abonnement...</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
