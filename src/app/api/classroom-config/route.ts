import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createServerSupabase } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServiceClient()
  const { data: config } = await supabase.from("classroom_config").select("*").single()
  const { data: locations } = await supabase
    .from("item_locations")
    .select("*, item:items(id, name, quantity, unit, category:categories(name))")

  return NextResponse.json({ config, locations: locations || [] })
}

export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  if (body.config) {
    await supabase
      .from("classroom_config")
      .update(body.config)
      .eq("id", body.config.id)
  }

  if (body.locations) {
    // Upsert locations
    for (const loc of body.locations) {
      if (loc.id && loc._delete) {
        await supabase.from("item_locations").delete().eq("id", loc.id)
      } else if (loc.id) {
        await supabase.from("item_locations").update({
          pos_x: loc.pos_x,
          pos_y: loc.pos_y,
          quantity: loc.quantity,
          label: loc.label,
        }).eq("id", loc.id)
      } else {
        await supabase.from("item_locations").insert({
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
