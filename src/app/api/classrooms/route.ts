import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyTeacher } from "@/lib/auth-helper"

// GET /api/classrooms — list all classrooms
export async function GET() {
  const snapshot = await adminDb.collection("classrooms").orderBy("created_at", "asc").get()
  const classrooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return NextResponse.json(classrooms)
}

// POST /api/classrooms — create a new classroom (teacher only)
export async function POST(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, rows, cols } = await request.json()
  const now = new Date().toISOString()

  const docRef = await adminDb.collection("classrooms").add({
    name: name || "新教室",
    rows: rows || 8,
    cols: cols || 10,
    created_at: now,
    updated_at: now,
  })

  // Create a default version
  await adminDb.collection("classrooms").doc(docRef.id).collection("versions").add({
    classroom_id: docRef.id,
    name: "預設配置",
    cells: [],
    is_active: true,
    created_at: now,
    updated_at: now,
  })

  const doc = await docRef.get()
  return NextResponse.json({ id: doc.id, ...doc.data() })
}
