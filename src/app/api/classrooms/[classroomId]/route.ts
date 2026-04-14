import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyTeacher } from "@/lib/auth-helper"

// PUT /api/classrooms/[classroomId] — update classroom settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { classroomId } = await params
  const body = await request.json()

  await adminDb.collection("classrooms").doc(classroomId).update({
    name: body.name,
    rows: body.rows,
    cols: body.cols,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/classrooms/[classroomId] — delete classroom and all versions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { classroomId } = await params

  const versionsSnap = await adminDb
    .collection("classrooms").doc(classroomId)
    .collection("versions").get()
  for (const doc of versionsSnap.docs) {
    await doc.ref.delete()
  }

  await adminDb.collection("classrooms").doc(classroomId).delete()
  return NextResponse.json({ success: true })
}
