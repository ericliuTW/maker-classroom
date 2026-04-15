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
  // Get config (single doc)
  const configSnapshot = await adminDb.collection("classroom_config").limit(1).get()
  let config = null
  if (configSnapshot.empty) {
    // Create default config
    const docRef = await adminDb.collection("classroom_config").add({
      name: "Maker教室",
      width: 1200,
      height: 800,
      background_image: null,
      updated_at: new Date().toISOString(),
    })
    const doc = await docRef.get()
    config = serializeDoc(doc)
  } else {
    const doc = configSnapshot.docs[0]
    config = serializeDoc(doc)
  }

  // Get locations with item data
  const locSnapshot = await adminDb.collection("item_locations").get()
  const locations = []

  for (const locDoc of locSnapshot.docs) {
    const loc: any = serializeDoc(locDoc)
    if (loc.item_id) {
      const itemDoc = await adminDb.collection("items").doc(loc.item_id).get()
      if (itemDoc.exists) {
        const item: any = serializeDoc(itemDoc)
        if (item.category_id) {
          const catDoc = await adminDb.collection("categories").doc(item.category_id).get()
          item.category = catDoc.exists ? serializeDoc(catDoc) : null
        }
        loc.item = item
      }
    }
    locations.push(loc)
  }

  return NextResponse.json({ config, locations })
}

export async function PUT(request: NextRequest) {
  const uid = await verifyTeacher(request)
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  if (body.config) {
    await adminDb.collection("classroom_config").doc(body.config.id).update({
      name: body.config.name,
      width: body.config.width,
      height: body.config.height,
      background_image: body.config.background_image,
      updated_at: new Date().toISOString(),
    })
  }

  if (body.locations) {
    for (const loc of body.locations) {
      if (loc.id && loc._delete) {
        await adminDb.collection("item_locations").doc(loc.id).delete()
      } else if (loc.id) {
        await adminDb.collection("item_locations").doc(loc.id).update({
          pos_x: loc.pos_x,
          pos_y: loc.pos_y,
          quantity: loc.quantity,
          label: loc.label,
        })
      } else {
        await adminDb.collection("item_locations").add({
          item_id: loc.item_id,
          pos_x: loc.pos_x,
          pos_y: loc.pos_y,
          quantity: loc.quantity || 1,
          label: loc.label || null,
        })
      }
    }
  }

  return NextResponse.json({ success: true })
}
