import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  const { query } = await request.json()
  if (!query) return NextResponse.json({ error: "請輸入問題" }, { status: 400 })

  const supabase = createServiceClient()

  // Fetch inventory
  const { data: items } = await supabase
    .from("items")
    .select("name, quantity, unit, category:categories(name)")
    .gt("quantity", 0)

  // Fetch knowledge base
  const { data: knowledge } = await supabase
    .from("knowledge_base")
    .select("*")

  const inventoryList = (items || []).map((i: any) =>
    `${i.name} (${i.quantity}${i.unit})`
  ).join(", ")

  const knowledgeList = (knowledge || []).map((k: any) =>
    `[${k.title}](${k.url}) - ${k.description} | 需要材料: ${k.required_materials.join(",")} | 設備: ${k.required_equipment.join(",")}`
  ).join("\n")

  const prompt = `你是 Maker 教室的專案顧問。學生問了以下問題：
"${query}"

【教室現有材料與設備】
${inventoryList || "（無庫存資料）"}

【專案知識庫】
${knowledgeList || "（無參考專案）"}

請根據教室現有的器材和設備，從知識庫中推薦最適合的專案。如果知識庫沒有合適的，也可以提供自己的建議。

回覆格式（JSON，不要 code block）：
{
  "answer": "針對問題的回答",
  "recommended_projects": [
    {"title": "專案名稱", "reason": "推薦原因", "feasibility": "high/medium/low", "url": "知識庫URL或空字串"}
  ],
  "additional_tips": "其他建議"
}`

  try {
    const apiKey = process.env.AI_API_KEY
    const baseUrl = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta"
    const model = process.env.AI_MODEL || "gemini-2.0-flash"

    if (!apiKey) return NextResponse.json({ error: "AI_API_KEY 尚未設定" }, { status: 500 })

    let aiText = ""
    if (baseUrl.includes("generativelanguage.googleapis.com")) {
      const res = await fetch(`${baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      })
      const data = await res.json()
      aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
    } else {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
      })
      const data = await res.json()
      aiText = data.choices?.[0]?.message?.content || ""
    }

    let parsed
    try {
      parsed = JSON.parse(aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim())
    } catch {
      parsed = { answer: aiText, recommended_projects: [], additional_tips: "" }
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
