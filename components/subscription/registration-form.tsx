"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload, User, Calendar, MapPin, Building } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { uploadPhoto } from "@/app/actions/upload-photo"

interface RegistrationFormProps {
  plan: string
  price: string
  planName: string
  category: string
  userId: string
}

export function RegistrationForm({ plan, price, planName, category, userId }: RegistrationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("[v0] Starting registration process")
      const formData = new FormData(e.currentTarget)
      const supabase = createClient()

      // Upload photo if provided using server action with fallback
      let photoUrl = null
      if (photoFile) {
        console.log("[v0] Uploading photo via server action")
        const uploadFormData = new FormData()
        uploadFormData.append("photo", photoFile)
        uploadFormData.append("userId", userId)

        try {
          const uploadResult = await uploadPhoto(uploadFormData)

          if (!uploadResult.success) {
            console.error("[v0] Photo upload failed:", uploadResult.error)
            throw new Error(`Photo upload failed: ${uploadResult.error}`)
          }

          photoUrl = uploadResult.url
          console.log("[v0] Photo uploaded successfully:", photoUrl)
        } catch (serverActionError) {
          console.warn("[v0] Server action failed, trying client-side upload:", serverActionError)

          try {
            const fileName = `${userId}/${Date.now()}-${photoFile.name}`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("profile-photos")
              .upload(fileName, photoFile, {
                cacheControl: "3600",
                upsert: true,
              })

            if (uploadError) throw uploadError

            const {
              data: { publicUrl },
            } = supabase.storage.from("profile-photos").getPublicUrl(uploadData.path)

            photoUrl = publicUrl
            console.log("[v0] Client-side photo upload successful:", photoUrl)
          } catch (clientError) {
            console.error("[v0] Both server and client photo upload failed:", clientError)
            throw new Error("Impossible d'uploader la photo. Veuillez réessayer.")
          }
        }
      }

      console.log("[v0] Updating profile with data")
      let profileUpdateSuccess = false
      let retryCount = 0
      const maxRetries = 3

      while (!profileUpdateSuccess && retryCount < maxRetries) {
        try {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              first_name: formData.get("firstName") as string,
              last_name: formData.get("lastName") as string,
              date_of_birth: formData.get("dateOfBirth") as string,
              address: formData.get("address") as string,
              primary_club: formData.get("primaryClub") as string,
              profile_image_url: photoUrl,
              age_category: category,
            })
            .eq("id", userId)

          if (profileError) {
            throw profileError
          }

          profileUpdateSuccess = true
          console.log("[v0] Profile updated successfully")
        } catch (error) {
          retryCount++
          console.warn(`[v0] Profile update attempt ${retryCount} failed:`, error)

          if (retryCount >= maxRetries) {
            throw new Error("Impossible de mettre à jour le profil. Veuillez vérifier votre connexion.")
          }

          await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
        }
      }

      console.log("[v0] Redirecting to payment page")
      const paymentUrl = `/subscription/payment?plan=${plan}&age=${category}&price=${price}&planName=${encodeURIComponent(planName)}`
      router.push(paymentUrl)
    } catch (error) {
      console.error("[v0] Error during registration:", error)
      const errorMessage = error instanceof Error ? error.message : "Une erreur inattendue s'est produite"
      alert(`Erreur lors de l'inscription: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-serif text-center">Récapitulatif</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Badge variant="outline" className="text-lg px-4 py-2 mb-2">
            {planName} - {price}.-
          </Badge>
          <p className="text-muted-foreground">
            Catégorie: {category === "child" ? "Enfant (moins de 15 ans)" : "Adulte (15 ans ou plus)"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <User className="w-5 h-5" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input id="lastName" name="lastName" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date de naissance *
              </Label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Adresse complète *
              </Label>
              <Input id="address" name="address" placeholder="Rue, numéro, code postal, ville" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryClub" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Club principal *
              </Label>
              <Select name="primaryClub" required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre club principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yamabushi-lausanne">Yamabushi Lausanne</SelectItem>
                  <SelectItem value="yamabushi-geneve">Yamabushi Genève</SelectItem>
                  <SelectItem value="yamabushi-zurich">Yamabushi Zurich</SelectItem>
                  <SelectItem value="yamabushi-berne">Yamabushi Berne</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Votre abonnement vous permet d'accéder à tous les clubs Yamabushi
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Photo d'identité *
              </Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                {photoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={photoPreview || "/placeholder.svg"}
                      alt="Aperçu"
                      className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-primary/20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview(null)
                      }}
                    >
                      Changer la photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Photo de type passeport</p>
                      <p className="text-xs text-muted-foreground">Format JPG, PNG - Max 5MB</p>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="max-w-xs mx-auto"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => router.back()}>
                Retour
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Inscription en cours..." : "Finaliser l'inscription"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
