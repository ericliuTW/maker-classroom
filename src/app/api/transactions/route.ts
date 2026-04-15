import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyTeacher } from "@/lib/auth-helper"
import { FieldValue } from "firebase-admin/firestore"

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
  const type = searchParams.get("type")

  let query: FirebaseFirestore.Query = adminDb
    .collection("transactions")
    .orderBy("created_at", "desc")
    .limit(200)

  if (type) {
    query = adminDb
      .collection("transactions")
      .where("type", "==", type)
      .orderBy("created_at", "desc")
      .limit(200)
  }

  const snapshot = await query.get()
  const transactions = snapshot.docs.map(serializeDoc)

  // Join item data
  const itemIds = [...new Set(transactions.map((t: any) => t.item_id).filter(Boolean))]
  const itemMap = new Map<string, any>()
  for (const itemId of itemIds) {
    const itemDoc = await adminDb.collection("items").doc(itemId).get()
    if (itemDoc.exists) {
      itemMap.set(itemId, serializeDoc(itemDoc))
    }
  }

  const result = transactions.map((t: any) => ({
    ...t,
    item: itemMap.get(t.item_id) || null,
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const now = new Date().toISOString()

  const docRef = await adminDb.collection("transactions").add({
    item_id: body.item_id,
    type: body.type,
    quantity: body.quantity || 1,
    note: body.note || null,
    scanned_code: body.scanned_code || null,
    session_token: body.session_token || null,
    status: body.type === "borrow" ? "active" : "completed",
    due_date: body.due_date || null,
    created_at: now,
    updated_at: now,
  })

  // Update item quantity
  const amount = body.quantity || 1
  const itemRef = adminDb.collection("items").doc(body.item_id)

  if (body.type === "borrow" || body.type === "dispose") {
    await itemRef.update({ quantity: FieldValue.increment(-amount), updated_at: now })
  } else if (body.type === "return" || body.type === "purchase") {
    await itemRef.update({ quantity: FieldValue.increment(amount), updated_at: now })
  }

  // Auto-update status
  const itemDoc = await itemRef.get()
  if (itemDoc.exists) {
    const item = itemDoc.data()!
    let status = "available"
    if (item.quantity <= 0) status = "out_of_stock"
    else if (item.quantity <= item.min_quantity) status = "low_stock"
    await itemRef.update({ status })
  }

  const doc = await docRef.get()
  const transaction: any = serializeDoc(doc)
  const itemData = await itemRef.get()
  transaction.item = itemData.exists ? serializeDoc(itemData) : null

  return NextResponse.json(transaction)
}

export async function PATCH(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.status) updates.status = body.status
  if (body.note !== undefined) updates.note = body.note

  await adminDb.collection("transactions").doc(body.id).update(updates)
  const doc = await adminDb.collection("transactions").doc(body.id).get()
  return NextResponse.json(serializeDoc(doc))
}
