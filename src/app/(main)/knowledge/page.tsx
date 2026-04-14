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

/** 將長名稱截斷成最多 10 字，拆成 2 行 */
function truncateLabel(text: string, max = 10): string[] {
  if (text.length <= max / 2) return [text]
  const t = text.length > max ? text.slice(0, max - 1) + "…" : text
  const mid = Math.ceil(t.length / 2)
  return [t.slice(0, mid), t.slice(mid)]
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
  const animFrameRef = useRef<number>(0)

  const WIDTH = 1100
  const HEIGHT = 750
  const CX = WIDTH / 2
  const CY = HEIGHT / 2

  // ── Build graph data (stable refs) ──
  type SimNode = MindMapNode & { vx: number; vy: number; fx?: number; fy?: number; radius: number }

  const allSkills = Array.from(new Set(entries.flatMap(e => e.skills ?? [])))

  const initNodes = useCallback((): SimNode[] => {
    const ns: SimNode[] = []
    ns.push({ id: "root", label: "技能地圖", type: "root", x: CX, y: CY, vx: 0, vy: 0, fx: CX, fy: CY, radius: 42 })

    const skillR = Math.min(260, 140 + allSkills.length * 8)
    allSkills.forEach((skill, i) => {
      const angle = (2 * Math.PI * i) / allSkills.length - Math.PI / 2
      ns.push({
        id: `skill-${skill}`, label: skill, type: "skill",
        x: CX + skillR * Math.cos(angle), y: CY + skillR * Math.sin(angle),
        vx: 0, vy: 0, radius: 34,
      })
    })

    const placed = new Set<string>()
    const projR = Math.min(160, 90 + entries.length * 3)
    allSkills.forEach((skill, si) => {
      const sAngle = (2 * Math.PI * si) / allSkills.length - Math.PI / 2
      const sNode = ns.find(n => n.id === `skill-${skill}`)!
      const related = entries.filter(e => e.skills?.includes(skill))
      related.forEach((entry, pi) => {
        const pid = `project-${entry.id}`
        if (placed.has(pid)) return
        placed.add(pid)
        const spread = sAngle + ((pi - (related.length - 1) / 2) * 0.4)
        ns.push({
          id: pid, label: entry.title, type: "project",
          x: sNode.x + projR * Math.cos(spread),
          y: sNode.y + projR * Math.sin(spread),
          vx: 0, vy: 0, radius: 38, entry,
        })
      })
    })
    return ns
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const edgesRef = useRef<MindMapEdge[]>([])
  const nodesRef = useRef<SimNode[]>(initNodes())
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const dragIdRef = useRef<string | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Build edges
  useEffect(() => {
    const edges: MindMapEdge[] = []
    allSkills.forEach(skill => {
      edges.push({ from: "root", to: `skill-${skill}` })
      entries.filter(e => e.skills?.includes(skill)).forEach(entry => {
        edges.push({ from: `skill-${skill}`, to: `project-${entry.id}` })
      })
    })
    edgesRef.current = edges
    nodesRef.current = initNodes()
  }, [entries, allSkills, initNodes])

  // ── Force simulation with collision ──
  useEffect(() => {
    const nodes = nodesRef.current
    const alpha = { value: 0.8 }
    const decay = 0.985
    const minAlpha = 0.005
    let running = true

    function tick() {
      if (!running) return
      if (alpha.value < minAlpha) {
        // Still listen for drags
        animFrameRef.current = requestAnimationFrame(tick)
        return
      }

      const edges = edgesRef.current
      const a = alpha.value

      // Spring forces (edges)
      for (const edge of edges) {
        const source = nodes.find(n => n.id === edge.from)
        const target = nodes.find(n => n.id === edge.to)
        if (!source || !target) continue
        const idealLen = edge.from === "root" ? 220 : 130
        const dx = target.x - source.x
        const dy = target.y - source.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - idealLen) * 0.015 * a
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        if (!target.fx) { target.vx -= fx; target.vy -= fy }
        if (!source.fx) { source.vx += fx; source.vy += fy }
      }

      // Repulsion (all pairs)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a2 = nodes[i], b = nodes[j]
          const dx = b.x - a2.x
          const dy = b.y - a2.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const minDist = a2.radius + b.radius + 12
          if (dist < minDist) {
            const push = (minDist - dist) * 0.4 * a
            const px = (dx / dist) * push
            const py = (dy / dist) * push
            if (!b.fx) { b.vx += px; b.vy += py }
            if (!a2.fx) { a2.vx -= px; a2.vy -= py }
          }
          // General repulsion
          const repel = 800 * a / (dist * dist + 100)
          const rx = (dx / dist) * repel
          const ry = (dy / dist) * repel
          if (!b.fx) { b.vx += rx; b.vy += ry }
          if (!a2.fx) { a2.vx -= rx; a2.vy -= ry }
        }
      }

      // Center gravity
      for (const node of nodes) {
        if (node.fx != null) continue
        node.vx += (CX - node.x) * 0.002 * a
        node.vy += (CY - node.y) * 0.002 * a
      }

      // Velocity & position update
      const damping = 0.7
      for (const node of nodes) {
        if (node.fx != null) { node.x = node.fx; node.y = node.fy!; continue }
        node.vx *= damping
        node.vy *= damping
        node.x += node.vx
        node.y += node.vy
        // Boundary
        node.x = Math.max(node.radius, Math.min(WIDTH - node.radius, node.x))
        node.y = Math.max(node.radius, Math.min(HEIGHT - node.radius, node.y))
      }

      alpha.value *= decay

      // Update React state
      const map = new Map<string, { x: number; y: number }>()
      for (const n of nodes) map.set(n.id, { x: n.x, y: n.y })
      setPositions(map)

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(animFrameRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  // ── Drag handlers ──
  const svgPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    pt.x = clientX; pt.y = clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: svgP.x, y: svgP.y }
  }

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent, nodeId: string) => {
    e.stopPropagation()
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (!node || node.id === "root") return
    const p = svgPoint(e)
    dragIdRef.current = nodeId
    dragOffsetRef.current = { x: p.x - node.x, y: p.y - node.y }
    node.fx = node.x
    node.fy = node.y
    node.vx = 0; node.vy = 0
  }

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragIdRef.current) return
    const node = nodesRef.current.find(n => n.id === dragIdRef.current)
    if (!node) return
    const p = svgPoint(e)
    node.fx = p.x - dragOffsetRef.current.x
    node.fy = p.y - dragOffsetRef.current.y
    node.x = node.fx; node.y = node.fy
    // Reheat simulation
    const map = new Map<string, { x: number; y: number }>()
    for (const n of nodesRef.current) map.set(n.id, { x: n.x, y: n.y })
    setPositions(map)
  }

  const onPointerUp = () => {
    if (!dragIdRef.current) return
    const node = nodesRef.current.find(n => n.id === dragIdRef.current)
    if (node) { delete node.fx; delete node.fy }
    dragIdRef.current = null
  }

  // ── Render helpers ──
  const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]))
  const getPos = (id: string) => positions.get(id) || { x: nodeMap.get(id)?.x || 0, y: nodeMap.get(id)?.y || 0 }

  const isHighlighted = (node: MindMapNode) => {
    if (!selectedSkill) return true
    if (node.type === "root") return true
    if (node.id === `skill-${selectedSkill}`) return true
    if (node.type === "project" && node.entry?.skills?.includes(selectedSkill)) return true
    return false
  }

  const isEdgeHighlighted = (edge: MindMapEdge) => {
    if (!selectedSkill) return true
    const a = nodeMap.get(edge.from), b = nodeMap.get(edge.to)
    if (!a || !b) return false
    return isHighlighted(a) && isHighlighted(b)
  }

  return (
    <div className="relative w-full border rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50 overflow-hidden">
      <div className="absolute top-3 left-3 z-10 text-xs text-muted-foreground bg-white/80 backdrop-blur rounded px-2 py-1">
        點擊技能篩選 · 拖曳節點調整位置
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full select-none"
        style={{ height: "clamp(400px, 60vw, 700px)", touchAction: "none" }}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        {/* Edges */}
        {edgesRef.current.map((edge, i) => {
          const from = getPos(edge.from)
          const to = getPos(edge.to)
          const hl = isEdgeHighlighted(edge)
          return (
            <line key={i}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={hl ? (edge.from === "root" ? "#6366f1" : "#a5b4fc") : "#e2e8f0"}
              strokeWidth={edge.from === "root" ? 2 : 1.2}
              strokeDasharray={edge.from === "root" ? undefined : "5 4"}
              opacity={hl ? 0.8 : 0.2}
            />
          )
        })}

        {/* Nodes */}
        {nodesRef.current.map(node => {
          const pos = getPos(node.id)
          const hl = isHighlighted(node)

          if (node.type === "root") {
            return (
              <g key={node.id} transform={`translate(${pos.x},${pos.y})`}>
                <circle r={42} fill="#6366f1" />
                <circle r={42} fill="none" stroke="#818cf8" strokeWidth={3} opacity={0.5} />
                <text textAnchor="middle" dy="0.35em" fill="white" fontSize={14} fontWeight="bold" className="pointer-events-none select-none">技能地圖</text>
              </g>
            )
          }

          if (node.type === "skill") {
            const isSel = selectedSkill === node.label
            const lines = truncateLabel(node.label, 8)
            return (
              <g key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                onMouseDown={e => onPointerDown(e, node.id)}
                onTouchStart={e => onPointerDown(e, node.id)}
                onClick={() => { if (!dragIdRef.current) setSelectedSkill(isSel ? null : node.label) }}
                className="cursor-grab active:cursor-grabbing"
              >
                <circle r={34}
                  fill={isSel ? "#6366f1" : hl ? "#e0e7ff" : "#f1f5f9"}
                  stroke={isSel ? "#4f46e5" : hl ? "#6366f1" : "#cbd5e1"}
                  strokeWidth={isSel ? 2.5 : 1.5}
                />
                {lines.map((line, li) => (
                  <text key={li} textAnchor="middle"
                    y={lines.length === 1 ? 4 : li * 14 - 3}
                    fill={isSel ? "white" : hl ? "#4338ca" : "#94a3b8"}
                    fontSize={11} fontWeight="600"
                    className="pointer-events-none select-none"
                  >{line}</text>
                ))}
              </g>
            )
          }

          if (node.type === "project" && node.entry) {
            const entry = node.entry
            const lines = truncateLabel(node.label, 10)
            const boxH = lines.length * 14 + 10
            return (
              <g key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                onMouseDown={e => onPointerDown(e, node.id)}
                onTouchStart={e => onPointerDown(e, node.id)}
                onClick={() => { if (!dragIdRef.current && hl) onSelectEntry(entry) }}
                className={hl ? "cursor-grab active:cursor-grabbing" : "cursor-default"}
              >
                <rect x={-44} y={-boxH / 2} width={88} height={boxH} rx={7}
                  fill={hl ? "white" : "#f8fafc"}
                  stroke={hl ? "#818cf8" : "#e2e8f0"}
                  strokeWidth={1.5}
                />
                {lines.map((line, li) => (
                  <text key={li} textAnchor="middle"
                    y={lines.length === 1 ? 4 : li * 14 - (lines.length - 1) * 7 + 4}
                    fill={hl ? "#334155" : "#cbd5e1"}
                    fontSize={10}
                    className="pointer-events-none select-none"
                  >{line}</text>
                ))}
              </g>
            )
          }
          return null
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex gap-3 text-xs bg-white/80 backdrop-blur rounded px-3 py-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> 技能
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-white border border-indigo-300 inline-block" /> 專案
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
