"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/stores/auth-store"
import type { KnowledgeEntry, ProcessStep } from "@/types/database"
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
import {
  BookOpen, Plus, Search, Bot, ExternalLink, Trash2, Send,
  LayoutGrid, Network, ChevronRight, AlertTriangle, Package, Wrench,
  Target, FileText, ListOrdered, Import
} from "lucide-react"

// ─── Types & Constants ──────────────────────────────────────────────────────

const difficultyLabels: Record<string, string> = {
  beginner: "入門",
  intermediate: "中級",
  advanced: "進階",
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700 border-emerald-200",
  intermediate: "bg-amber-100 text-amber-700 border-amber-200",
  advanced: "bg-red-100 text-red-700 border-red-200",
}

type ViewMode = "card" | "mindmap"

// ─── Mind Map Component ──────────────────────────────────────────────────────

interface MindMapNode {
  id: string
  label: string
  type: "root" | "skill" | "project"
  x: number
  y: number
  entry?: KnowledgeEntry
}

interface MindMapEdge {
  from: string
  to: string
}

function MindMap({
  entries,
  onSelectEntry,
}: {
  entries: KnowledgeEntry[]
  onSelectEntry: (entry: KnowledgeEntry) => void
}) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Build nodes radially
  const WIDTH = 900
  const HEIGHT = 600
  const CX = WIDTH / 2
  const CY = HEIGHT / 2

  // Unique skills
  const allSkills = Array.from(
    new Set(entries.flatMap((e) => e.skills ?? []))
  )

  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []

  // Root
  nodes.push({ id: "root", label: "技能地圖", type: "root", x: CX, y: CY })

  // Skill nodes — evenly spaced on a circle
  const skillRadius = 180
  allSkills.forEach((skill, i) => {
    const angle = (2 * Math.PI * i) / allSkills.length - Math.PI / 2
    const x = CX + skillRadius * Math.cos(angle)
    const y = CY + skillRadius * Math.sin(angle)
    nodes.push({ id: `skill-${skill}`, label: skill, type: "skill", x, y })
    edges.push({ from: "root", to: `skill-${skill}` })
  })

  // Project nodes — placed around each skill node
  const projectRadius = 100
  const projectsPlaced = new Set<string>()

  allSkills.forEach((skill, si) => {
    const skillAngle = (2 * Math.PI * si) / allSkills.length - Math.PI / 2
    const skillNode = nodes.find((n) => n.id === `skill-${skill}`)!
    const relatedEntries = entries.filter((e) => e.skills?.includes(skill))
    const count = relatedEntries.length

    relatedEntries.forEach((entry, pi) => {
      const projectId = `project-${entry.id}`
      if (!projectsPlaced.has(projectId)) {
        // Spread projects outward from skill node
        const spreadAngle = skillAngle + ((pi - (count - 1) / 2) * Math.PI) / 6
        const x = skillNode.x + projectRadius * Math.cos(spreadAngle)
        const y = skillNode.y + projectRadius * Math.sin(spreadAngle)
        nodes.push({
          id: projectId,
          label: entry.title.length > 12 ? entry.title.slice(0, 12) + "…" : entry.title,
          type: "project",
          x,
          y,
          entry,
        })
        projectsPlaced.add(projectId)
      }
      edges.push({ from: `skill-${skill}`, to: projectId })
    })
  })

  // Helper: find node by id
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const isHighlighted = (node: MindMapNode) => {
    if (!selectedSkill) return true
    if (node.type === "root") return true
    if (node.id === `skill-${selectedSkill}`) return true
    if (node.type === "project" && node.entry?.skills?.includes(selectedSkill)) return true
    return false
  }

  const isEdgeHighlighted = (edge: MindMapEdge) => {
    if (!selectedSkill) return true
    const fromNode = nodeMap.get(edge.from)
    const toNode = nodeMap.get(edge.to)
    if (!fromNode || !toNode) return false
    return isHighlighted(fromNode) && isHighlighted(toNode)
  }

  return (
    <div className="relative w-full border rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50 overflow-hidden">
      <div className="absolute top-3 left-3 text-xs text-muted-foreground bg-white/80 rounded px-2 py-1">
        點擊技能節點來篩選相關專案
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        style={{ height: "clamp(360px, 55vw, 600px)" }}
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodeMap.get(edge.from)
          const to = nodeMap.get(edge.to)
          if (!from || !to) return null
          const highlighted = isEdgeHighlighted(edge)
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={highlighted ? (edge.from === "root" ? "#6366f1" : "#94a3b8") : "#e2e8f0"}
              strokeWidth={edge.from === "root" ? 2 : 1.5}
              strokeDasharray={edge.from === "root" ? undefined : "4 3"}
              opacity={highlighted ? 1 : 0.3}
              className="transition-all duration-200"
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const highlighted = isHighlighted(node)
          if (node.type === "root") {
            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                <circle r={40} fill="#6366f1" className="drop-shadow-md" />
                <circle r={40} fill="none" stroke="#818cf8" strokeWidth={3} opacity={0.5} />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fill="white"
                  fontSize={13}
                  fontWeight="bold"
                >
                  {node.label}
                </text>
              </g>
            )
          }

          if (node.type === "skill") {
            const isSelected = selectedSkill === node.label
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onClick={() => setSelectedSkill(isSelected ? null : node.label)}
                className="cursor-pointer"
              >
                <circle
                  r={32}
                  fill={isSelected ? "#6366f1" : highlighted ? "#e0e7ff" : "#f1f5f9"}
                  stroke={isSelected ? "#4f46e5" : highlighted ? "#6366f1" : "#cbd5e1"}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className="transition-all duration-200"
                />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fill={isSelected ? "white" : highlighted ? "#4338ca" : "#94a3b8"}
                  fontSize={11}
                  fontWeight="600"
                  className="pointer-events-none select-none"
                >
                  {node.label.length > 6 ? node.label.slice(0, 6) + "…" : node.label}
                </text>
              </g>
            )
          }

          if (node.type === "project" && node.entry) {
            const entry = node.entry
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onClick={() => highlighted && onSelectEntry(entry)}
                className={highlighted ? "cursor-pointer" : "cursor-default"}
              >
                <rect
                  x={-38}
                  y={-14}
                  width={76}
                  height={28}
                  rx={6}
                  fill={highlighted ? "white" : "#f8fafc"}
                  stroke={highlighted ? "#94a3b8" : "#e2e8f0"}
                  strokeWidth={1.5}
                  className="transition-all duration-200 drop-shadow-sm"
                />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fill={highlighted ? "#334155" : "#cbd5e1"}
                  fontSize={9.5}
                  className="pointer-events-none select-none"
                >
                  {node.label}
                </text>
              </g>
            )
          }

          return null
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex gap-3 text-xs bg-white/80 rounded px-3 py-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> 技能
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block" /> 專案
        </span>
      </div>
    </div>
  )
}

// ─── Project Detail Modal ────────────────────────────────────────────────────

function ProjectDetailModal({
  entry,
  onClose,
  onImported,
}: {
  entry: KnowledgeEntry | null
  onClose: () => void
  onImported?: () => void
}) {
  const [importing, setImporting] = useState(false)

  const handleImport = async () => {
    if (!entry) return
    setImporting(true)
    try {
      const res = await fetch("/api/project-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.title,
          description: entry.description,
          source_knowledge_id: entry.id,
          objectives: entry.objectives ?? "",
          process_steps: entry.process_steps ?? [],
          materials: (entry.required_materials ?? []).map((m: string) => ({ name: m, quantity: 1, unit: "個" })),
          equipment: (entry.required_equipment ?? []).map((e: string) => ({ name: e })),
          status: "draft",
        }),
      })
      if (res.ok) {
        toast.success("已匯入專案規劃區！")
        onClose()
        onImported?.()
      } else {
        toast.error("匯入失敗，請稍後再試")
      }
    } catch {
      toast.error("匯入失敗")
    }
    setImporting(false)
  }

  return (
    <Dialog open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {entry && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <DialogTitle className="text-xl leading-snug">{entry.title}</DialogTitle>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${difficultyColors[entry.difficulty]}`}
                    >
                      {difficultyLabels[entry.difficulty]}
                    </span>
                    {entry.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Skills */}
              {entry.skills && entry.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">涵蓋技能</p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.skills.map((skill, i) => (
                      <Badge key={i} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  專案摘要
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
              </div>

              {/* Objectives */}
              {entry.objectives && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    專案目標
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{entry.objectives}</p>
                </div>
              )}

              {/* Content */}
              {entry.content && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    專案內容
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                </div>
              )}

              {/* Process Steps */}
              {entry.process_steps && entry.process_steps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <ListOrdered className="w-4 h-4 text-muted-foreground" />
                    製作過程
                  </div>
                  <div className="space-y-3">
                    {entry.process_steps.map((step: ProcessStep) => (
                      <div
                        key={step.step}
                        className="relative pl-10 pr-4 py-3 rounded-lg border bg-slate-50"
                      >
                        {/* Step number */}
                        <span className="absolute left-3 top-3 w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">
                          {step.step}
                        </span>
                        <p className="text-sm font-semibold mb-0.5">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>

                        {/* Safety note */}
                        {step.safety_note && (
                          <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                            <span>{step.safety_note}</span>
                          </div>
                        )}

                        {/* Step materials/equipment */}
                        {(step.materials?.length || step.equipment?.length) ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {step.materials?.map((m, i) => (
                              <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">
                                {m}
                              </span>
                            ))}
                            {step.equipment?.map((eq, i) => (
                              <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
                                {eq}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials & Equipment */}
              {(entry.required_materials.length > 0 || entry.required_equipment.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {entry.required_materials.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        所需材料
                      </div>
                      <ul className="space-y-1">
                        {entry.required_materials.map((m, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <ChevronRight className="w-3 h-3 shrink-0" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {entry.required_equipment.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                        所需設備
                      </div>
                      <ul className="space-y-1">
                        {entry.required_equipment.map((eq, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <ChevronRight className="w-3 h-3 shrink-0" />
                            {eq}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* External link */}
              {entry.url && (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  查看原始資料
                </a>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={onClose}>關閉</Button>
              <Button onClick={handleImport} disabled={importing} className="gap-2">
                <Import className="w-4 h-4" />
                {importing ? "匯入中..." : "匯入專案規劃區"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Add Knowledge Dialog ────────────────────────────────────────────────────

function AddKnowledgeDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const defaultForm = {
    title: "", url: "", description: "", source: "manual",
    tags: "", required_materials: "", required_equipment: "",
    difficulty: "beginner", image_url: "",
    skills: "", objectives: "", content: "",
    process_steps_raw: "", // JSON text for process steps
  }
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    let process_steps: ProcessStep[] = []
    if (form.process_steps_raw.trim()) {
      try {
        process_steps = JSON.parse(form.process_steps_raw)
      } catch {
        toast.error("製作步驟 JSON 格式有誤，請修正後再試")
        setSaving(false)
        return
      }
    }

    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        required_materials: form.required_materials.split(",").map((s) => s.trim()).filter(Boolean),
        required_equipment: form.required_equipment.split(",").map((s) => s.trim()).filter(Boolean),
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        process_steps,
      }),
    })
    if (res.ok) {
      toast.success("已新增")
      onOpenChange(false)
      onSaved()
      setForm(defaultForm)
    } else {
      toast.error("新增失敗")
    }
    setSaving(false)
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>新增知識庫專案</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>標題 *</Label><Input {...field("title")} required /></div>
          <div className="space-y-2"><Label>URL</Label><Input {...field("url")} /></div>
          <div className="space-y-2"><Label>來源</Label><Input {...field("source")} /></div>
          <div className="space-y-2"><Label>描述 *</Label><Textarea {...field("description")} rows={3} required /></div>
          <div className="space-y-2">
            <Label>難度</Label>
            <Select value={form.difficulty} onValueChange={(v) => v && setForm((f) => ({ ...f, difficulty: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">入門</SelectItem>
                <SelectItem value="intermediate">中級</SelectItem>
                <SelectItem value="advanced">進階</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>標籤（逗號分隔）</Label><Input {...field("tags")} placeholder="Arduino, LED, 感測器" /></div>
          <div className="space-y-2"><Label>技能（逗號分隔）</Label><Input {...field("skills")} placeholder="焊接, 程式設計, 3D建模" /></div>
          <div className="space-y-2"><Label>所需材料（逗號分隔）</Label><Input {...field("required_materials")} /></div>
          <div className="space-y-2"><Label>所需設備（逗號分隔）</Label><Input {...field("required_equipment")} /></div>
          <div className="space-y-2"><Label>專案目標</Label><Textarea {...field("objectives")} rows={2} /></div>
          <div className="space-y-2"><Label>專案內容</Label><Textarea {...field("content")} rows={3} /></div>
          <div className="space-y-2">
            <Label>製作步驟（JSON 格式，選填）</Label>
            <Textarea
              {...field("process_steps_raw")}
              rows={4}
              placeholder={`[{"step":1,"title":"準備材料","description":"...","safety_note":"..."}]`}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "儲存中..." : "儲存"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const { isTeacher } = useAuthStore()
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [viewMode, setViewMode] = useState<ViewMode>("card")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null)
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("確定要刪除這個專案？")) return
    const res = await fetch("/api/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success("已刪除"); fetchEntries() }
    else toast.error("刪除失敗")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          專案知識庫
        </h2>
        <div className="flex gap-2 flex-wrap">
          {isTeacher && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新增專案
            </Button>
          )}
        </div>
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
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="例：我想做一個可以自動餵魚的裝置..."
              onKeyDown={(e) => e.key === "Enter" && handleAiAsk()}
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
                      <Badge
                        variant={
                          p.feasibility === "high" ? "default" :
                          p.feasibility === "medium" ? "secondary" : "outline"
                        }
                      >
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

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋專案..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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

        {/* View mode toggle */}
        <div className="flex rounded-lg border overflow-hidden shrink-0">
          <button
            className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${
              viewMode === "card" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid className="w-4 h-4" />
            卡片
          </button>
          <button
            className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${
              viewMode === "mindmap" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
            onClick={() => setViewMode("mindmap")}
          >
            <Network className="w-4 h-4" />
            心智圖
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">載入中...</div>
      ) : viewMode === "mindmap" ? (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">尚無專案資料</div>
          ) : (
            <MindMap entries={entries} onSelectEntry={setSelectedEntry} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelectedEntry(entry)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {entry.title}
                  </CardTitle>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${difficultyColors[entry.difficulty]}`}
                  >
                    {difficultyLabels[entry.difficulty]}
                  </span>
                </div>
                <CardDescription className="text-xs">{entry.source}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{entry.description}</p>

                {/* Skills badges */}
                {entry.skills && entry.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.skills.map((skill, i) => (
                      <Badge key={i} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {entry.process_steps?.length
                      ? `${entry.process_steps.length} 個步驟`
                      : entry.url ? "點擊查看詳情" : ""}
                  </span>
                  {isTeacher && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(entry.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {entries.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              尚無專案資料
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <AddKnowledgeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSaved={fetchEntries}
      />
      <ProjectDetailModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onImported={fetchEntries}
      />
    </div>
  )
}
