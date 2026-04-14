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

// GET /api/classrooms/[classroomId]/versions
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

  const versions = snapshot.docs.map(serializeDoc)
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
  const cleanCells = (body.cells || []).map((c: any) => {
    const cell: any = {
      row: c.row,
      col: c.col,
      type: c.type,
    }
    if (c.label) cell.label = c.label
    if (c.furnitureType) cell.furnitureType = c.furnitureType
    if (c.width && c.width > 1) cell.width = c.width
    if (c.height && c.height > 1) cell.height = c.height
    if (c.items && c.items.length > 0) {
      cell.items = c.items.map((item: any) => ({
        item_id: item.item_id,
        quantity: item.quantity || 1,
        ...(item.label ? { label: item.label } : {}),
      }))
    }
    return cell
  })

  if (body.id) {
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

  const snapshot = await adminDb
    .collection("classrooms").doc(classroomId)
    .collection("versions").get()

  for (const doc of snapshot.docs) {
    await doc.ref.update({ is_active: doc.id === versionId })
  }

  return NextResponse.json({ success: true })
}
