import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createServerSupabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type")
  const status = searchParams.get("status")

  let query = supabase
    .from("transactions")
    .select("*, item:items(id, name, barcode, unit)")
    .order("created_at", { ascending: false })
    .limit(200)

  if (type) query = query.eq("type", type)
  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      item_id: body.item_id,
      type: body.type,
      quantity: body.quantity || 1,
      note: body.note || null,
      scanned_code: body.scanned_code || null,
      session_token: body.session_token || null,
      status: body.type === "borrow" ? "active" : "completed",
      due_date: body.due_date || null,
    })
    .select("*, item:items(id, name, barcode, unit)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update item quantity
  if (body.type === "borrow" || body.type === "dispose") {
    await supabase.rpc("decrement_item_quantity", { item_uuid: body.item_id, amount: body.quantity || 1 })
  } else if (body.type === "return" || body.type === "purchase") {
    await supabase.rpc("increment_item_quantity", { item_uuid: body.item_id, amount: body.quantity || 1 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from("transactions")
    .update({ status: body.status, note: body.note })
    .eq("id", body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
