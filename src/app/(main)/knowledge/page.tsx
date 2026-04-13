"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import type { KnowledgeEntry } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { BookOpen, Plus, Search, Bot, ExternalLink, Trash2, Send } from "lucide-react"

const difficultyLabels: Record<string, string> = {
  beginner: "入門",
  intermediate: "中級",
  advanced: "進階",
}

export default function KnowledgePage() {
  const { isTeacher } = useAuthStore()
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [aiQuery, setAiQuery] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (difficultyFilter !== "all") params.set("difficulty", difficultyFilter)
    const res = await fetch(`/api/knowledge?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setEntries(data)
    setLoading(false)
  }, [search, difficultyFilter])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleAiAsk = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await fetch("/api/knowledge/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery }),
      })
      const data = await res.json()
      setAiResult(data)
    } catch {
      toast.error("AI 查詢失敗")
    }
    setAiLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除？")) return
    const res = await fetch("/api/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success("已刪除"); fetchEntries() }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          專案知識庫
        </h2>
        {isTeacher && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增專案
          </Button>
        )}
      </div>

      {/* AI Q&A */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            AI 專案推薦
          </CardTitle>
          <CardDescription>描述你想做什麼，AI 會根據教室器材推薦適合的專案</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder="例：我想做一個可以自動餵魚的裝置..."
              onKeyDown={e => e.key === "Enter" && handleAiAsk()}
            />
            <Button onClick={handleAiAsk} disabled={aiLoading}>
              {aiLoading ? "思考中..." : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {aiResult && (
            <div className="bg-white rounded-lg p-4 space-y-3">
              <p className="text-sm">{aiResult.answer}</p>
              {aiResult.recommended_projects?.length > 0 && (
                <>
                  <Separator />
                  <p className="text-sm font-medium">推薦專案：</p>
                  {aiResult.recommended_projects.map((p: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant={
                        p.feasibility === "high" ? "default" :
                        p.feasibility === "medium" ? "secondary" : "outline"
                      }>
                        {p.feasibility === "high" ? "可行性高" :
                         p.feasibility === "medium" ? "中等" : "挑戰性高"}
                      </Badge>
                      <div>
                        <span className="font-medium">{p.title}</span>
                        <span className="text-muted-foreground"> — {p.reason}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {aiResult.additional_tips && (
                <p className="text-xs text-muted-foreground italic mt-2">{aiResult.additional_tips}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜尋專案..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={difficultyFilter} onValueChange={(v) => v && setDifficultyFilter(v)}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="難度" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有難度</SelectItem>
            <SelectItem value="beginner">入門</SelectItem>
            <SelectItem value="intermediate">中級</SelectItem>
            <SelectItem value="advanced">進階</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entries grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(entry => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">{entry.title}</CardTitle>
                  <Badge variant="outline">{difficultyLabels[entry.difficulty]}</Badge>
                </div>
                <CardDescription className="text-xs">{entry.source}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{entry.description}</p>
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    查看原文
                  </a>
                  {isTeacher && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {entries.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              尚無專案資料
            </div>
          )}
        </div>
      )}

      {/* Add dialog */}
      <AddKnowledgeDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSaved={fetchEntries} />
    </div>
  )
}

function AddKnowledgeDialog({ open, onOpenChange, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: "", url: "", description: "", source: "manual",
    tags: "", required_materials: "", required_equipment: "",
    difficulty: "beginner", image_url: "",
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
        required_materials: form.required_materials.split(",").map(s => s.trim()).filter(Boolean),
        required_equipment: form.required_equipment.split(",").map(s => s.trim()).filter(Boolean),
      }),
    })
    if (res.ok) {
      toast.success("已新增")
      onOpenChange(false)
      onSaved()
      setForm({ title: "", url: "", description: "", source: "manual", tags: "", required_materials: "", required_equipment: "", difficulty: "beginner", image_url: "" })
    } else {
      toast.error("新增失敗")
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>新增知識庫專案</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>標題 *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
          <div className="space-y-2"><Label>URL *</Label><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required /></div>
          <div className="space-y-2"><Label>來源</Label><Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} /></div>
          <div className="space-y-2"><Label>描述 *</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} required /></div>
          <div className="space-y-2"><Label>難度</Label>
            <Select value={form.difficulty} onValueChange={v => v && setForm(f => ({ ...f, difficulty: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">入門</SelectItem>
                <SelectItem value="intermediate">中級</SelectItem>
                <SelectItem value="advanced">進階</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>標籤（逗號分隔）</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Arduino, LED, 感測器" /></div>
          <div className="space-y-2"><Label>所需材料（逗號分隔）</Label><Input value={form.required_materials} onChange={e => setForm(f => ({ ...f, required_materials: e.target.value }))} /></div>
          <div className="space-y-2"><Label>所需設備（逗號分隔）</Label><Input value={form.required_equipment} onChange={e => setForm(f => ({ ...f, required_equipment: e.target.value }))} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "儲存中..." : "儲存"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
