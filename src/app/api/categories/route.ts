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

export async function GET() {
  const snapshot = await adminDb
    .collection("categories")
    .orderBy("name")
    .get()

  const data = snapshot.docs.map(serializeDoc)
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const docRef = await adminDb.collection("categories").add({
    name: body.name,
    icon: body.icon || "package",
    description: body.description || null,
    created_at: new Date().toISOString(),
  })

  const doc = await docRef.get()
  return NextResponse.json(serializeDoc(doc))
}
