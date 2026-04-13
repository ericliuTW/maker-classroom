"use client"

import { useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Bot, CheckCircle2, Circle, Package, Wrench, ListTodo, Lightbulb, Download } from "lucide-react"

interface AiResult {
  summary: string
  materials: Array<{ name: string; quantity: number; unit: string; in_classroom: boolean; note?: string }>
  equipment: Array<{ name: string; in_classroom: boolean; note?: string }>
  todo: Array<{ step: number; task: string; done: boolean; materials?: string[]; equipment?: string[] }>
  tips: string
  related_projects?: string[]
}

export default function AiDesignerPage() {
  const { sessionToken } = useAuthStore()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiResult | null>(null)
  const [todoState, setTodoState] = useState<boolean[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, session_token: sessionToken }),
      })
      const data = await res.json()
      if (data.parsed) {
        setResult(data.parsed)
        setTodoState(new Array(data.parsed.todo?.length || 0).fill(false))
        toast.success("AI 分析完成！")
      } else {
        toast.error(data.error || "AI 分析失敗")
      }
    } catch {
      toast.error("連線失敗")
    }
    setLoading(false)
  }

  const toggleTodo = (idx: number) => {
    setTodoState(prev => prev.map((v, i) => i === idx ? !v : v))
  }

  const exportTodoList = () => {
    if (!result) return
    let text = `# ${title} - 專案計畫\n\n`
    text += `## 描述\n${description}\n\n`
    text += `## AI 建議\n${result.summary}\n\n`
    text += `## 材料清單\n`
    result.materials.forEach(m => {
      text += `- [${m.in_classroom ? "教室有" : "需採購"}] ${m.name} x${m.quantity}${m.unit}${m.note ? ` (${m.note})` : ""}\n`
    })
    text += `\n## 設備清單\n`
    result.equipment.forEach(e => {
      text += `- [${e.in_classroom ? "教室有" : "需自備"}] ${e.name}${e.note ? ` (${e.note})` : ""}\n`
    })
    text += `\n## TODO List\n`
    result.todo.forEach(t => {
      text += `- [ ] Step ${t.step}: ${t.task}\n`
    })
    text += `\n## 專家建議\n${result.tips}\n`

    const blob = new Blob([text], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title}-project-plan.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("已匯出！")
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Bot className="w-6 h-6" />
        AI 專案設計師
      </h2>

      {/* Input form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">描述你的專案想法</CardTitle>
          <CardDescription>AI 會根據教室現有材料與設備，給你完整的製作建議</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>專案名稱</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：智慧盆栽自動澆水系統" required />
            </div>
            <div className="space-y-2">
              <Label>專案描述</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="描述你想做什麼、解決什麼問題、大概的想法..."
                rows={4}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚙️</span> AI 分析中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Bot className="w-4 h-4" /> 開始 AI 分析
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                AI 建議摘要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                材料清單
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.materials?.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant={m.in_classroom ? "default" : "secondary"}>
                        {m.in_classroom ? "教室有" : "需採購"}
                      </Badge>
                      <span className="font-medium">{m.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {m.quantity} {m.unit}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-green-500" />
                設備清單
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.equipment?.map((e, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant={e.in_classroom ? "default" : "outline"}>
                        {e.in_classroom ? "教室有" : "須自備"}
                      </Badge>
                      <span className="font-medium">{e.name}</span>
                    </div>
                    {e.note && <span className="text-xs text-muted-foreground">{e.note}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TODO List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-purple-500" />
                  TODO List
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportTodoList}>
                  <Download className="w-4 h-4 mr-2" />
                  匯出
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.todo?.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => toggleTodo(i)}
                  >
                    {todoState[i] ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className={todoState[i] ? "line-through text-muted-foreground" : ""}>
                      <p className="font-medium text-sm">Step {t.step}: {t.task}</p>
                      {t.materials && t.materials.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          材料：{t.materials.join("、")}
                        </p>
                      )}
                      {t.equipment && t.equipment.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          設備：{t.equipment.join("、")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          {result.tips && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground italic">{result.tips}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
