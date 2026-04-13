import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createServerSupabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search")
  const difficulty = searchParams.get("difficulty")

  let query = supabase
    .from("knowledge_base")
    .select("*")
    .order("created_at", { ascending: false })

  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
  if (difficulty) query = query.eq("difficulty", difficulty)

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
    .from("knowledge_base")
    .insert({
      title: body.title,
      url: body.url,
      source: body.source || "manual",
      description: body.description,
      tags: body.tags || [],
      required_materials: body.required_materials || [],
      required_equipment: body.required_equipment || [],
      difficulty: body.difficulty || "beginner",
      image_url: body.image_url || null,
    })
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
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
