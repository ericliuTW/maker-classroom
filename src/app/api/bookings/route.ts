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

  let query: FirebaseFirestore.Query = adminDb
    .collection("bookings")
    .orderBy("start_time", "asc")

  if (status) {
    query = adminDb
      .collection("bookings")
      .where("status", "==", status)
      .orderBy("start_time", "asc")
  }

  const snapshot = await query.get()
  const bookings = []

  for (const doc of snapshot.docs) {
    const booking: any = serializeDoc(doc)
    if (booking.project_id) {
      const projDoc = await adminDb.collection("projects").doc(booking.project_id).get()
      booking.project = projDoc.exists ? serializeDoc(projDoc) : null
    }
    bookings.push(booking)
  }

  return NextResponse.json(bookings)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Check for conflicts
  const conflictSnapshot = await adminDb
    .collection("bookings")
    .where("start_time", "<", body.end_time)
    .get()

  const conflicts = conflictSnapshot.docs
    .map(serializeDoc)
    .filter((b: any) => b.end_time > body.start_time && b.status !== "cancelled")

  const docRef = await adminDb.collection("bookings").add({
    project_id: body.project_id || null,
    title: body.title,
    equipment_items: body.equipment_items || [],
    start_time: body.start_time,
    end_time: body.end_time,
    status: "pending",
    session_token: body.session_token || null,
    note: body.note || null,
    created_at: new Date().toISOString(),
  })

  const doc = await docRef.get()
  return NextResponse.json({ ...serializeDoc(doc), conflicts })
}

export async function PATCH(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, any> = {}
  if (body.status) updates.status = body.status
  if (body.note !== undefined) updates.note = body.note

  await adminDb.collection("bookings").doc(body.id).update(updates)
  const doc = await adminDb.collection("bookings").doc(body.id).get()
  return NextResponse.json(serializeDoc(doc))
}

export async function DELETE(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  await adminDb.collection("bookings").doc(id).delete()
  return NextResponse.json({ success: true })
}
