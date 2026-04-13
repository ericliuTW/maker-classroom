import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  if (!code) return NextResponse.json({ valid: false, message: "請輸入使用碼" })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("access_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return NextResponse.json({ valid: false, message: "使用碼無效" })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, message: "使用碼已過期" })
  }

  const token = crypto.randomBytes(16).toString("hex")
  return NextResponse.json({ valid: true, token })
}
