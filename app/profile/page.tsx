import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ProfileForm } from "@/components/profile/profile-form"
import { SubscriptionInfo } from "@/components/profile/subscription-info"
import { BottomNav } from "@/components/mobile/bottom-nav"

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("member_id", data.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const currentSubscription = subscriptions?.[0] || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <DashboardHeader user={data.user} profile={profile} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif font-bold text-3xl text-primary mb-2">Mon profil</h1>
          <p className="text-muted-foreground">Gérez vos informations personnelles et votre abonnement</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileForm user={data.user} profile={profile} />
          <SubscriptionInfo subscription={currentSubscription} />
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
