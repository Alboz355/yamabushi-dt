import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { RegistrationForm } from "@/components/subscription/registration-form"

interface PageProps {
  searchParams: { plan?: string; price?: string; name?: string; category?: string }
}

export default async function RegistrationPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  const { plan, price, name, category } = searchParams

  if (!plan || !price || !name || !category) {
    redirect("/subscription")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <DashboardHeader user={data.user} profile={profile} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="font-serif font-bold text-3xl text-primary mb-2">Inscription</h1>
          <p className="text-muted-foreground">Complétez votre profil pour finaliser votre abonnement</p>
        </div>

        <RegistrationForm
          plan={plan}
          price={price}
          planName={decodeURIComponent(name)}
          category={category}
          userId={data.user.id}
        />
      </div>
    </div>
  )
}
