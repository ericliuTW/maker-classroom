import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

// GET /api/equipment/availability?date=2026-04-15
// Returns all occupied equipment slots for a given date (or date range)
// Response: { slots: Array<{ equipment_name, date, period, project_plan_id, plan_title }> }

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date")
  const dateFrom = request.nextUrl.searchParams.get("from")
  const dateTo = request.nextUrl.searchParams.get("to")
  const excludePlanId = request.nextUrl.searchParams.get("exclude_plan_id")

  // Fetch all project plans that have equipment_schedules
  const snapshot = await adminDb.collection("project_plans").get()

  const slots: {
    equipment_name: string
    date: string
    period: number
    project_plan_id: string
    plan_title: string
  }[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (excludePlanId && doc.id === excludePlanId) continue
    const schedules = data.equipment_schedules as any[] | undefined
    if (!schedules || schedules.length === 0) continue

    for (const sched of schedules) {
      // Filter by date
      if (date && sched.date !== date) continue
      if (dateFrom && sched.date < dateFrom) continue
      if (dateTo && sched.date > dateTo) continue

      slots.push({
        equipment_name: sched.equipment_name,
        date: sched.date,
        period: sched.period,
        project_plan_id: doc.id,
        plan_title: data.title || "",
      })
    }
  }

  return NextResponse.json({ slots })
}
