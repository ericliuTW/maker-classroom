import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

function serializeDoc(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data()!
  const result: any = { id: doc.id }
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === "object" && typeof val.toDate === "function") {
      result[key] = val.toDate().toISOString()
    } else {
      result[key] = val
    }
  }
  return result
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, description } = body

  if (!title || !description) {
    return NextResponse.json({ error: "請提供專案標題和描述" }, { status: 400 })
  }

  // Fetch current inventory
  const itemsSnapshot = await adminDb.collection("items").where("quantity", ">", 0).get()
  const inventoryList = itemsSnapshot.docs
    .map((d) => d.data())
    .map((i: any) => `${i.name} (${i.quantity}${i.unit})`)
    .join("\n")

  // Fetch knowledge base
  const knowledgeSnapshot = await adminDb.collection("knowledge_base").limit(20).get()
  const knowledgeRef = knowledgeSnapshot.docs
    .map((d) => d.data())
    .map((k: any) => `- ${k.title}: ${k.description} (難度:${k.difficulty})`)
    .join("\n")

  const prompt = `你是一位Maker教室的專案顧問。學生想做以下專案：

【專案名稱】${title}
【專案描述】${description}

【教室現有材料與設備】
${inventoryList || "（尚無庫存資料）"}

【參考專案知識庫】
${knowledgeRef || "（尚無參考專案）"}

請回覆以下 JSON 格式（不要加 markdown code block）：
{
  "summary": "一段專案建議摘要",
  "materials": [
    {"name": "材料名稱", "quantity": 數量, "unit": "單位", "in_classroom": true/false, "note": "備註"}
  ],
  "equipment": [
    {"name": "設備名稱", "in_classroom": true/false, "note": "如何使用或替代方案"}
  ],
  "todo": [
    {"step": 1, "task": "步驟描述", "materials": ["需要的材料"], "equipment": ["需要的設備"]}
  ],
  "tips": "專家建議與注意事項",
  "related_projects": ["相關可參考的專案名稱"]
}`

  try {
    const aiResponse = await callAI(prompt)

    let parsed
    try {
      const jsonStr = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = { summary: aiResponse, materials: [], equipment: [], todo: [], tips: "" }
    }

    const now = new Date().toISOString()
    const docRef = await adminDb.collection("projects").add({
      title,
      description,
      ai_response: aiResponse,
      materials_json: parsed.materials || [],
      equipment_json: parsed.equipment || [],
      todo_json: (parsed.todo || []).map((t: any, i: number) => ({
        ...t,
        step: i + 1,
        done: false,
      })),
      session_token: body.session_token || null,
      created_at: now,
      updated_at: now,
    })

    const doc = await docRef.get()
    return NextResponse.json({
      project: serializeDoc(doc),
      parsed,
    })
  } catch (err: any) {
    return NextResponse.json({ error: "AI 服務暫時無法使用：" + err.message }, { status: 500 })
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096 }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || ""
}
