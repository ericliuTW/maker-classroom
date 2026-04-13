import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyTeacher } from "@/lib/auth-helper"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get("category")
  const search = searchParams.get("search")

  let query: FirebaseFirestore.Query = adminDb.collection("items").orderBy("name")

  if (category) {
    query = query.where("category_id", "==", category)
  }

  const snapshot = await query.get()
  let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  // Client-side search filter (Firestore doesn't support ilike)
  if (search) {
    const s = search.toLowerCase()
    items = items.filter((item: any) =>
      item.name?.toLowerCase().includes(s) ||
      item.barcode?.toLowerCase().includes(s) ||
      item.description?.toLowerCase().includes(s)
    )
  }

  // Join category data
  const catSnapshot = await adminDb.collection("categories").get()
  const catMap = new Map(catSnapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }]))

  items = items.map((item: any) => ({
    ...item,
    category: item.category_id ? catMap.get(item.category_id) || null : null,
  }))

  return NextResponse.json(items)
}

export async function POST(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const now = new Date().toISOString()

  const docRef = await adminDb.collection("items").add({
    name: body.name,
    category_id: body.category_id || null,
    barcode: body.barcode || null,
    qr_code: body.qr_code || null,
    quantity: body.quantity || 0,
    unit: body.unit || "個",
    description: body.description || null,
    image_url: body.image_url || null,
    status: body.status || "available",
    min_quantity: body.min_quantity || 0,
    created_at: now,
    updated_at: now,
  })

  const doc = await docRef.get()
  const item: any = { id: doc.id, ...doc.data() }

  // Join category
  if (item.category_id) {
    const catDoc = await adminDb.collection("categories").doc(item.category_id).get()
    item.category = catDoc.exists ? { id: catDoc.id, ...catDoc.data() } : null
  }

  return NextResponse.json(item)
}

export async function PUT(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id, ...updates } = body
  updates.updated_at = new Date().toISOString()

  await adminDb.collection("items").doc(id).update(updates)

  const doc = await adminDb.collection("items").doc(id).get()
  const item: any = { id: doc.id, ...doc.data() }

  if (item.category_id) {
    const catDoc = await adminDb.collection("categories").doc(item.category_id).get()
    item.category = catDoc.exists ? { id: catDoc.id, ...catDoc.data() } : null
  }

  return NextResponse.json(item)
}

export async function DELETE(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  await adminDb.collection("items").doc(id).delete()
  return NextResponse.json({ success: true })
}
