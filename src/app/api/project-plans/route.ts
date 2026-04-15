import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyTeacher } from "@/lib/auth-helper"

function serializeDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data()!
  const result: any = { id: doc.id }
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === "object" && typeof val.toDate === "function") {
      result[key] = val.toDate().toISOString()
    } else {
      result[key] = val
    }
  }
  return result
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const sessionToken = searchParams.get("session_token")

  let query: FirebaseFirestore.Query = adminDb
    .collection("project_plans")
    .orderBy("created_at", "desc")

  if (status) {
    query = adminDb
      .collection("project_plans")
      .where("status", "==", status)
      .orderBy("created_at", "desc")
  } else if (sessionToken) {
    query = adminDb
      .collection("project_plans")
      .where("session_token", "==", sessionToken)
      .orderBy("created_at", "desc")
  }

  const snapshot = await query.get()
  const plans = snapshot.docs.map(serializeDoc)

  return NextResponse.json(plans)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Teacher auth optional — students can create too (session-based)
  const uid = await verifyTeacher(request).catch(() => null)

  const now = new Date().toISOString()
  const docRef = await adminDb.collection("project_plans").add({
    title: body.title || "未命名專案",
    description: body.description || "",
    source_knowledge_id: body.source_knowledge_id || null,
    objectives: body.objectives || "",
    process_steps: body.process_steps || [],
    materials: body.materials || [],
    equipment: body.equipment || [],
    status: body.status || "draft",
    session_token: body.session_token || null,
    created_by_teacher: uid || null,
    created_at: now,
    updated_at: now,
  })

  const doc = await docRef.get()
  return NextResponse.json(serializeDoc(doc))
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  updates.updated_at = new Date().toISOString()
  await adminDb.collection("project_plans").doc(id).update(updates)

  const doc = await adminDb.collection("project_plans").doc(id).get()
  return NextResponse.json(serializeDoc(doc))
}

export async function DELETE(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await adminDb.collection("project_plans").doc(id).delete()
  return NextResponse.json({ success: true })
}
