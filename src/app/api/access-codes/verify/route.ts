import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  if (!code) return NextResponse.json({ valid: false, message: "請輸入使用碼" })

  const snapshot = await adminDb
    .collection("access_codes")
    .where("code", "==", code.toUpperCase())
    .where("is_active", "==", true)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return NextResponse.json({ valid: false, message: "使用碼無效" })
  }

  const doc = snapshot.docs[0]
  const data = doc.data()

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, message: "使用碼已過期" })
  }

  const token = crypto.randomBytes(16).toString("hex")
  return NextResponse.json({ valid: true, token })
}
