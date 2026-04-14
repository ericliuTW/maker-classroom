import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyTeacher } from "@/lib/auth-helper"

// GET /api/classrooms/[classroomId]/versions — list versions + join item data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await params

  const snapshot = await adminDb
    .collection("classrooms").doc(classroomId)
    .collection("versions")
    .orderBy("created_at", "desc")
    .get()

  const versions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return NextResponse.json(versions)
}

// POST /api/classrooms/[classroomId]/versions — create or save version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { classroomId } = await params
  const body = await request.json()
  const now = new Date().toISOString()

  // Strip client-only joined data from cells before saving
  const cleanCells = (body.cells || []).map((c: any) => ({
    row: c.row,
    col: c.col,
    type: c.type,
    ...(c.item_id ? { item_id: c.item_id } : {}),
    ...(c.quantity ? { quantity: c.quantity } : {}),
    ...(c.label ? { label: c.label } : {}),
  }))

  if (body.id) {
    // Update existing version
    await adminDb
      .collection("classrooms").doc(classroomId)
      .collection("versions").doc(body.id)
      .update({
        name: body.name,
        cells: cleanCells,
        updated_at: now,
      })
    return NextResponse.json({ success: true, id: body.id })
  } else {
    // Create new version
    const docRef = await adminDb
      .collection("classrooms").doc(classroomId)
      .collection("versions")
      .add({
        classroom_id: classroomId,
        name: body.name || `配置 ${new Date().toLocaleDateString("zh-TW")}`,
        cells: cleanCells,
        is_active: false,
        created_at: now,
        updated_at: now,
      })
    return NextResponse.json({ success: true, id: docRef.id })
  }
}

// PUT /api/classrooms/[classroomId]/versions — set active version
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { classroomId } = await params
  const { versionId } = await request.json()

  // Deactivate all versions
  const snapshot = await adminDb
    .collection("classrooms").doc(classroomId)
    .collection("versions").get()

  for (const doc of snapshot.docs) {
    await doc.ref.update({ is_active: doc.id === versionId })
  }

  return NextResponse.json({ success: true })
}
