import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createServerSupabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const date = searchParams.get("date")

  let query = supabase
    .from("bookings")
    .select("*, project:projects(id, title)")
    .order("start_time", { ascending: true })

  if (status) query = query.eq("status", status)
  if (date) {
    query = query.gte("start_time", `${date}T00:00:00`).lte("start_time", `${date}T23:59:59`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  // Check for conflicts
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id, title, start_time, end_time")
    .neq("status", "cancelled")
    .lt("start_time", body.end_time)
    .gt("end_time", body.start_time)

  const hasConflict = (conflicts || []).length > 0

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      project_id: body.project_id || null,
      title: body.title,
      equipment_items: body.equipment_items || [],
      start_time: body.start_time,
      end_time: body.end_time,
      status: "pending",
      session_token: body.session_token || null,
      note: body.note || null,
    })
    .select("*, project:projects(id, title)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, conflicts: conflicts || [] })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, any> = {}
  if (body.status) updates.status = body.status
  if (body.note !== undefined) updates.note = body.note

  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase.from("bookings").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
