import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

interface FurnitureItem {
  item_id: string
  quantity: number
  label?: string
}

interface ClassroomGridCell {
  row: number
  col: number
  type: "furniture" | "empty"
  label?: string
  width?: number
  height?: number
  items?: FurnitureItem[]
}

interface PlacementEntry {
  itemId: string
  classroomId: string
  classroomName: string
  furnitureLabel: string
  furnitureRow: number
  furnitureCol: number
  quantity: number
}

export async function GET() {
  // Fetch classrooms and active transactions in parallel
  const [classroomsSnap, transactionsSnap] = await Promise.all([
    adminDb.collection("classrooms").get(),
    adminDb
      .collection("transactions")
      .where("status", "==", "active")
      .where("type", "==", "borrow")
      .get(),
  ])

  // Build borrowed quantities map: itemId -> total borrowed qty
  const borrowedMap: Record<string, number> = {}
  for (const doc of transactionsSnap.docs) {
    const data = doc.data()
    const itemId: string = data.item_id
    const qty: number = data.quantity ?? 0
    if (itemId) {
      borrowedMap[itemId] = (borrowedMap[itemId] ?? 0) + qty
    }
  }

  // For each classroom, fetch its versions subcollection in parallel
  const classroomDocs = classroomsSnap.docs
  const versionsResults = await Promise.all(
    classroomDocs.map((classroomDoc) =>
      adminDb
        .collection("classrooms")
        .doc(classroomDoc.id)
        .collection("versions")
        .get()
    )
  )

  const placements: PlacementEntry[] = []

  for (let i = 0; i < classroomDocs.length; i++) {
    const classroomDoc = classroomDocs[i]
    const classroomData = classroomDoc.data()
    const classroomId = classroomDoc.id
    const classroomName: string = classroomData.name ?? classroomId

    const versionSnap = versionsResults[i]
    if (versionSnap.empty) continue

    // Find active version, fall back to first
    const versionDocs = versionSnap.docs
    const activeDoc =
      versionDocs.find((d) => d.data().is_active === true) ?? versionDocs[0]

    const versionData = activeDoc.data()
    const cells: ClassroomGridCell[] = versionData.cells ?? []

    for (const cell of cells) {
      if (cell.type !== "furniture" || !cell.items?.length) continue

      for (const furnitureItem of cell.items) {
        if (!furnitureItem.item_id) continue

        placements.push({
          itemId: furnitureItem.item_id,
          classroomId,
          classroomName,
          furnitureLabel: cell.label ?? `(${cell.row},${cell.col})`,
          furnitureRow: cell.row,
          furnitureCol: cell.col,
          quantity: furnitureItem.quantity ?? 0,
        })
      }
    }
  }

  return NextResponse.json({ placements, borrowedMap })
}
