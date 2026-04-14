import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyTeacher } from "@/lib/auth-helper"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search")
  const difficulty = searchParams.get("difficulty")

  let query: FirebaseFirestore.Query = adminDb
    .collection("knowledge_base")
    .orderBy("created_at", "desc")

  if (difficulty) {
    query = adminDb
      .collection("knowledge_base")
      .where("difficulty", "==", difficulty)
      .orderBy("created_at", "desc")
  }

  const snapshot = await query.get()
  let entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  if (search) {
    const s = search.toLowerCase()
    entries = entries.filter((e: any) =>
      e.title?.toLowerCase().includes(s) ||
      e.description?.toLowerCase().includes(s)
    )
  }

  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const docRef = await adminDb.collection("knowledge_base").add({
    title: body.title,
    url: body.url || "",
    source: body.source || "manual",
    description: body.description,
    tags: body.tags || [],
    required_materials: body.required_materials || [],
    required_equipment: body.required_equipment || [],
    difficulty: body.difficulty || "beginner",
    image_url: body.image_url || null,
    // New fields
    skills: body.skills || [],
    objectives: body.objectives || "",
    content: body.content || "",
    process_steps: body.process_steps || [],
    created_at: new Date().toISOString(),
  })

  const doc = await docRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}

export async function DELETE(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  await adminDb.collection("knowledge_base").doc(id).delete()
  return NextResponse.json({ success: true })
}
