"use server"

import { headers } from "next/headers"

import { createClient } from "@/lib/supabase/server"

export type SignUpState = { error: string | null; success: boolean }

export async function signUp(_prevState: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const fullName = String(formData.get("full_name") ?? "")

  const requestHeaders = await headers()
  const origin = requestHeaders.get("origin")

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message, success: false }
  }

  return { error: null, success: true }
}
