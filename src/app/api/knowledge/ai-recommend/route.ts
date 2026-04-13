import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  const { query } = await request.json()
  if (!query) return NextResponse.json({ error: "請輸入問題" }, { status: 400 })

  // Fetch inventory
  const itemsSnapshot = await adminDb.collection("items").where("quantity", ">", 0).get()
  const inventoryList = itemsSnapshot.docs
    .map((d) => d.data())
    .map((i: any) => `${i.name} (${i.quantity}${i.unit})`)
    .join(", ")

  // Fetch knowledge base
  const knowledgeSnapshot = await adminDb.collection("knowledge_base").get()
  const knowledgeList = knowledgeSnapshot.docs
    .map((d) => d.data())
    .map((k: any) =>
      `[${k.title}](${k.url}) - ${k.description} | 材料: ${(k.required_materials || []).join(",")} | 設備: ${(k.required_equipment || []).join(",")}`
    )
    .join("\n")

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
    const aiText = await callAI(prompt)
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

async function callAI(prompt: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta"
  const model = process.env.AI_MODEL || "gemini-2.0-flash"

  if (!apiKey) throw new Error("AI_API_KEY 尚未設定")

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
    if (data.error) throw new Error(data.error.message)
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7 }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || ""
}
