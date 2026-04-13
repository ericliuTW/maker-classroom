import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createServerSupabase } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: body.name, icon: body.icon || "package", description: body.description })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
