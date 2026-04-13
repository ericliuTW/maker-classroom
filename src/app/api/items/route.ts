import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase, createServiceClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get("category")
  const search = searchParams.get("search")

  let query = supabase
    .from("items")
    .select("*, category:categories(*)")
    .order("name")

  if (category) query = query.eq("category_id", category)
  if (search) query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,description.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from("items")
    .insert({
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
    })
    .select("*, category:categories(*)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", id)
    .select("*, category:categories(*)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase.from("items").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
