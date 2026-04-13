import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyTeacher } from "@/lib/auth-helper"

export async function GET(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const snapshot = await adminDb
    .collection("access_codes")
    .orderBy("created_at", "desc")
    .get()

  const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const code = body.code || generateCode()

  const docRef = await adminDb.collection("access_codes").add({
    code: code.toUpperCase(),
    label: body.label || null,
    created_by: uid,
    expires_at: body.expires_at || null,
    is_active: true,
    created_at: new Date().toISOString(),
  })

  const doc = await docRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

export async function PATCH(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  await adminDb.collection("access_codes").doc(body.id).update({
    is_active: body.is_active,
  })

  const doc = await adminDb.collection("access_codes").doc(body.id).get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
