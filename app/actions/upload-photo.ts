"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function uploadPhoto(formData: FormData) {
  try {
    console.log("[v0] Starting photo upload server action")

    const file = formData.get("photo") as File
    const userId = formData.get("userId") as string

    if (!file || !userId) {
      throw new Error("Missing file or userId")
    }

    console.log("[v0] File details:", { name: file.name, size: file.size, type: file.type })

    const supabase = createAdminClient()

    const fileExt = file.name.split(".").pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    console.log("[v0] Uploading to path:", fileName)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] Upload error:", uploadError)
      throw uploadError
    }

    console.log("[v0] Upload successful:", uploadData)

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-photos").getPublicUrl(fileName)

    console.log("[v0] Public URL generated:", publicUrl)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error("[v0] Server action error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
