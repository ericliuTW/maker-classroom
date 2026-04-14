import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

// POST /api/knowledge/crawl — auto-crawl maker project resources
// Called by scheduled task (cron) or manually by teacher
// Uses AI to search and parse educational maker project resources

const SEARCH_QUERIES = [
  "Arduino 專題 國中 教學",
  "Maker 教育 動手做 專案",
  "3D列印 教學 中學",
  "雷射切割 專題 教案",
  "STEM 手作 專案 國高中",
  "micro:bit 程式設計 教學",
  "物聯網 IoT 學生專題",
  "木工 生活科技 教案",
]

const SKILL_MAP: Record<string, string[]> = {
  "arduino": ["程式設計", "電路設計", "微控制器"],
  "esp32": ["程式設計", "電路設計", "物聯網", "微控制器"],
  "raspberry": ["程式設計", "Linux", "物聯網"],
  "3d列印": ["3D建模", "CAD設計", "數位製造"],
  "3d print": ["3D建模", "CAD設計", "數位製造"],
  "雷射切割": ["向量繪圖", "數位製造", "材料加工"],
  "laser": ["向量繪圖", "數位製造", "材料加工"],
  "木工": ["手工加工", "量測", "材料加工"],
  "焊接": ["焊接", "電路設計"],
  "soldering": ["焊接", "電路設計"],
  "led": ["電路設計", "光學"],
  "感測器": ["電路設計", "程式設計", "物聯網"],
  "sensor": ["電路設計", "程式設計", "物聯網"],
  "馬達": ["機械設計", "電路設計"],
  "motor": ["機械設計", "電路設計"],
  "機器人": ["機械設計", "程式設計", "電路設計"],
  "robot": ["機械設計", "程式設計", "電路設計"],
  "太陽能": ["能源科技", "電路設計"],
  "solar": ["能源科技", "電路設計"],
  "風力": ["能源科技", "機械設計"],
  "cnc": ["CNC加工", "CAD設計", "數位製造"],
  "python": ["程式設計"],
  "app": ["程式設計", "UI設計"],
  "iot": ["物聯網", "程式設計", "電路設計"],
  "物聯網": ["物聯網", "程式設計", "電路設計"],
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase()
  const skills = new Set<string>()
  for (const [keyword, skillList] of Object.entries(SKILL_MAP)) {
    if (lower.includes(keyword)) {
      skillList.forEach(s => skills.add(s))
    }
  }
  return Array.from(skills)
}

function inferDifficulty(text: string): "beginner" | "intermediate" | "advanced" {
  const lower = text.toLowerCase()
  if (lower.includes("進階") || lower.includes("advanced") || lower.includes("複雜")) return "advanced"
  if (lower.includes("中級") || lower.includes("intermediate")) return "intermediate"
  return "beginner"
}

export async function POST(request: NextRequest) {
  // Optional: verify with a secret key for cron security
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also allow teacher auth
    const token = request.cookies.get("firebase_token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const results: string[] = []

  try {
    // Use AI API to generate/discover maker project resources
    const aiApiKey = process.env.AI_API_KEY
    const aiBaseUrl = process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta"
    const aiModel = process.env.AI_MODEL || "gemini-2.0-flash"

    if (!aiApiKey) {
      return NextResponse.json({ error: "AI_API_KEY not configured" }, { status: 500 })
    }

    // Pick a random search query to vary results each day
    const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)]

    const prompt = `你是一位國高中生活科技教師。請搜尋並推薦 3 個適合國高中學生的 Maker 專題教學資源。

搜尋主題：${query}

請用以下 JSON 格式回覆（只回覆 JSON 陣列，不要其他文字）：
[
  {
    "title": "專案名稱",
    "url": "教學資源網址（如果知道真實網址請提供，否則用合理的假網址）",
    "source": "來源網站名稱",
    "description": "2-3 句描述這個專案的內容和學習重點",
    "tags": ["標籤1", "標籤2", "標籤3"],
    "required_materials": ["材料1", "材料2"],
    "required_equipment": ["設備1", "設備2"],
    "difficulty": "beginner 或 intermediate 或 advanced",
    "objectives": "學習目標（1-2句）",
    "content": "專案內容概述（2-3句）",
    "process_steps": [
      {"step": 1, "title": "步驟標題", "description": "步驟說明", "safety_note": "安全注意事項（如有）"}
    ]
  }
]`

    let entries: any[] = []

    if (aiBaseUrl.includes("generativelanguage.googleapis.com")) {
      // Gemini API
      const res = await fetch(
        `${aiBaseUrl}/models/${aiModel}:generateContent?key=${aiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
          }),
        }
      )
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) entries = JSON.parse(jsonMatch[0])
    } else {
      // OpenAI-compatible API
      const res = await fetch(`${aiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey}`,
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
        }),
      })
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content || ""
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) entries = JSON.parse(jsonMatch[0])
    }

    // Save to Firestore (skip duplicates by title)
    const now = new Date().toISOString()
    for (const entry of entries) {
      const existing = await adminDb
        .collection("knowledge_base")
        .where("title", "==", entry.title)
        .limit(1)
        .get()

      if (!existing.empty) {
        results.push(`跳過（已存在）：${entry.title}`)
        continue
      }

      const skills = extractSkills(
        `${entry.title} ${entry.description} ${entry.tags?.join(" ") || ""}`
      )

      await adminDb.collection("knowledge_base").add({
        title: entry.title,
        url: entry.url || "",
        source: entry.source || "AI 自動爬取",
        description: entry.description || "",
        tags: entry.tags || [],
        required_materials: entry.required_materials || [],
        required_equipment: entry.required_equipment || [],
        difficulty: entry.difficulty || inferDifficulty(entry.description || ""),
        image_url: null,
        skills,
        objectives: entry.objectives || null,
        content: entry.content || null,
        process_steps: entry.process_steps || null,
        created_at: now,
      })
      results.push(`新增：${entry.title}`)
    }
  } catch (error: any) {
    return NextResponse.json({
      error: "Crawl failed",
      details: error.message,
      results,
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  })
}
