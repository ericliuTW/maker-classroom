"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import type { ProjectPlan, ProcessStep, MaterialItem, EquipmentItem, EquipmentSchedule } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  ClipboardList, Plus, Trash2, ChevronUp, ChevronDown,
  Package, Wrench, CalendarClock, CheckSquare, ArrowLeft,
  AlertTriangle, GripVertical, Edit2, Check, Key, Calendar
} from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

// ── Period definitions（國高中節次）──────────────────────────────────────────

const PERIODS = [
  { period: 1, label: "第1節", time: "08:10-09:00" },
  { period: 2, label: "第2節", time: "09:10-10:00" },
  { period: 3, label: "第3節", time: "10:10-11:00" },
  { period: 4, label: "第4節", time: "11:10-12:00" },
  { period: 5, label: "午休",  time: "12:00-13:00" },
  { period: 6, label: "第5節", time: "13:10-14:00" },
  { period: 7, label: "第6節", time: "14:10-15:00" },
  { period: 8, label: "第7節", time: "15:10-16:00" },
]

// ── Status config ──────────────────────────────────────────────────────────────

const statusConfig: Record<ProjectPlan["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; next?: ProjectPlan["status"]; nextLabel?: string }> = {
  draft:       { label: "草稿",   variant: "outline",   next: "planning",    nextLabel: "開始規劃" },
  planning:    { label: "規劃中", variant: "secondary", next: "in_progress", nextLabel: "開始製作" },
  in_progress: { label: "製作中", variant: "default",   next: "completed",   nextLabel: "標記完成" },
  completed:   { label: "已完成", variant: "outline" },
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ProjectPlannerPage() {
  const { isTeacher, sessionToken } = useAuthStore()
  const [plans, setPlans] = useState<ProjectPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<ProjectPlan | null>(null)

  const fetchPlans = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    else if (!isTeacher && sessionToken) params.set("session_token", sessionToken)

    const res = await fetch(`/api/project-plans?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setPlans(data)
    setLoading(false)
  }, [statusFilter, isTeacher, sessionToken])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此專案規劃？")) return
    const res = await fetch("/api/project-plans", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success("已刪除")
      fetchPlans()
    } else {
      toast.error("刪除失敗")
    }
  }

  // Open detail view
  if (selectedPlan) {
    return (
      <PlanDetailView
        plan={selectedPlan}
        isTeacher={isTeacher}
        onBack={() => { setSelectedPlan(null); fetchPlans() }}
        onDeleted={() => { setSelectedPlan(null); fetchPlans() }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6" />
          專案規劃區
        </h2>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新增專案
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "全部" },
          { value: "draft", label: "草稿" },
          { value: "planning", label: "規劃中" },
          { value: "in_progress", label: "製作中" },
          { value: "completed", label: "已完成" },
        ].map(tab => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card
              key={plan.id}
              className="hover:shadow-md transition-shadow cursor-pointer relative group"
              onClick={() => setSelectedPlan(plan)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2 flex-1">{plan.title}</CardTitle>
                  <Badge variant={statusConfig[plan.status].variant}>
                    {statusConfig[plan.status].label}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {format(new Date(plan.created_at), "yyyy/MM/dd", { locale: zhTW })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                )}
                <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                  {plan.session_token && (
                    <span className="flex items-center gap-1 text-indigo-600">
                      <Key className="w-3 h-3" />
                      {plan.session_token.slice(0, 8)}…
                    </span>
                  )}
                  {plan.materials.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      材料 {plan.materials.length} 項
                    </span>
                  )}
                  {plan.equipment.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      設備 {plan.equipment.length} 項
                    </span>
                  )}
                  {plan.equipment_schedules && plan.equipment_schedules.length > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Calendar className="w-3 h-3" />
                      已排 {plan.equipment_schedules.length} 節
                    </span>
                  )}
                  {plan.process_steps && plan.process_steps.length > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      步驟 {plan.process_steps.length} 步
                    </span>
                  )}
                </div>
                {isTeacher && (
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleDelete(plan.id) }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>尚無專案規劃</p>
              <p className="text-xs mt-1">點擊「新增專案」開始建立</p>
            </div>
          )}
        </div>
      )}

      {/* New plan dialog */}
      <NewPlanDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        sessionToken={sessionToken}
        onSaved={(plan) => { setNewDialogOpen(false); fetchPlans(); setSelectedPlan(plan) }}
      />
    </div>
  )
}

// ── New plan dialog ────────────────────────────────────────────────────────────

function NewPlanDialog({
  open, onOpenChange, sessionToken, onSaved
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  sessionToken: string | null
  onSaved: (plan: ProjectPlan) => void
}) {
  const [form, setForm] = useState({ title: "", description: "" })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error("請輸入專案名稱"); return }
    setSaving(true)
    const res = await fetch("/api/project-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        session_token: sessionToken,
        status: "draft",
        materials: [],
        equipment: [],
        process_steps: [],
      }),
    })
    if (res.ok) {
      const plan = await res.json()
      toast.success("專案已建立")
      setForm({ title: "", description: "" })
      onSaved(plan)
    } else {
      toast.error("建立失敗")
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>新增專案規劃</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>專案名稱 *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="例：Arduino 自動澆水器"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>簡短描述</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="這個專案想要做什麼..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "建立中..." : "建立"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Plan detail view ───────────────────────────────────────────────────────────

function PlanDetailView({
  plan: initialPlan,
  isTeacher,
  onBack,
  onDeleted,
}: {
  plan: ProjectPlan
  isTeacher: boolean
  onBack: () => void
  onDeleted: () => void
}) {
  const router = useRouter()
  const [plan, setPlan] = useState<ProjectPlan>(initialPlan)
  const [saving, setSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(plan.title)

  // Auto-save helper
  const save = useCallback(async (updates: Partial<ProjectPlan>) => {
    setSaving(true)
    const res = await fetch("/api/project-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, ...updates }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPlan(updated)
    } else {
      toast.error("儲存失敗")
    }
    setSaving(false)
  }, [plan.id])

  const handleTitleSave = () => {
    if (!titleDraft.trim()) { toast.error("名稱不能空白"); return }
    setEditingTitle(false)
    save({ title: titleDraft })
  }

  const handleStatusAdvance = () => {
    const cfg = statusConfig[plan.status]
    if (!cfg.next) return
    const updated = { ...plan, status: cfg.next }
    setPlan(updated)
    save({ status: cfg.next })
  }

  const handleGoBooking = () => {
    // Navigate to bookings with pre-filled query params
    const params = new URLSearchParams({
      plan_id: plan.id,
      title: plan.title,
    })
    router.push(`/bookings?${params}`)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                className="text-xl font-bold h-auto py-1"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setEditingTitle(false) }}
              />
              <Button size="icon" variant="ghost" onClick={handleTitleSave}><Check className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-2xl font-bold truncate">{plan.title}</h2>
              <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => { setTitleDraft(plan.title); setEditingTitle(true) }}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        <Badge variant={statusConfig[plan.status].variant} className="shrink-0">
          {statusConfig[plan.status].label}
        </Badge>
        {saving && <span className="text-xs text-muted-foreground">儲存中...</span>}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        {statusConfig[plan.status].next && (
          <Button onClick={handleStatusAdvance} size="sm">
            {statusConfig[plan.status].nextLabel}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleGoBooking}>
          <CalendarClock className="w-4 h-4 mr-2" />
          預約排程
        </Button>
        {isTeacher && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              if (!confirm("確定要刪除？")) return
              const res = await fetch("/api/project-plans", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: plan.id }),
              })
              if (res.ok) { toast.success("已刪除"); onDeleted() }
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            刪除專案
          </Button>
        )}
      </div>

      {/* Access code */}
      {plan.session_token && (
        <Card className="bg-indigo-50/60 border-indigo-200">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Key className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <span className="text-xs font-medium text-indigo-600">使用代碼</span>
              <p className="text-sm font-mono font-bold text-indigo-900">{plan.session_token}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Description & Objectives */}
      <EditableTextArea
        label="專案描述"
        value={plan.description}
        onSave={v => save({ description: v })}
        placeholder="描述這個專案的背景和目的..."
      />
      <EditableTextArea
        label="學習目標"
        value={plan.objectives || ""}
        onSave={v => save({ objectives: v })}
        placeholder="完成這個專案後，學生能夠..."
      />

      <Separator />

      {/* Process Steps */}
      <ProcessStepsEditor
        steps={plan.process_steps || []}
        onSave={steps => save({ process_steps: steps })}
      />

      <Separator />

      {/* Materials */}
      <MaterialsEditor
        materials={plan.materials}
        onSave={materials => save({ materials })}
      />

      <Separator />

      {/* Equipment */}
      <EquipmentEditor
        equipment={plan.equipment}
        onSave={equipment => save({ equipment })}
      />

      {/* Equipment Scheduling */}
      {plan.equipment.filter(e => e.name).length > 0 && (
        <>
          <Separator />
          <EquipmentScheduler
            equipment={plan.equipment}
            schedules={plan.equipment_schedules || []}
            planId={plan.id}
            onSave={schedules => save({ equipment_schedules: schedules })}
          />
        </>
      )}

      {/* Pickup summary */}
      {(plan.materials.some(m => !m.in_classroom) || plan.equipment.some(e => !e.in_classroom)) && (
        <>
          <Separator />
          <PickupSection materials={plan.materials} equipment={plan.equipment} />
        </>
      )}
    </div>
  )
}

// ── Editable textarea ──────────────────────────────────────────────────────────

function EditableTextArea({ label, value, onSave, placeholder }: {
  label: string; value: string; onSave: (v: string) => void; placeholder?: string
}) {
  const [draft, setDraft] = useState(value)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { setDraft(value); setDirty(false) }, [value])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{label}</Label>
        {dirty && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { onSave(draft); setDirty(false) }}>
            儲存
          </Button>
        )}
      </div>
      <Textarea
        value={draft}
        onChange={e => { setDraft(e.target.value); setDirty(e.target.value !== value) }}
        onBlur={() => { if (dirty) { onSave(draft); setDirty(false) } }}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
      />
    </div>
  )
}

// ── Process steps editor ───────────────────────────────────────────────────────

function ProcessStepsEditor({ steps, onSave }: {
  steps: ProcessStep[]; onSave: (steps: ProcessStep[]) => void
}) {
  const [local, setLocal] = useState<ProcessStep[]>(steps)

  useEffect(() => { setLocal(steps) }, [steps])

  const update = (newSteps: ProcessStep[]) => {
    setLocal(newSteps)
    onSave(newSteps)
  }

  const addStep = () => {
    const newStep: ProcessStep = {
      step: local.length + 1,
      title: `步驟 ${local.length + 1}`,
      description: "",
    }
    update([...local, newStep])
  }

  const removeStep = (idx: number) => {
    const newSteps = local.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }))
    update(newSteps)
  }

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newSteps = [...local]
    const target = idx + dir
    if (target < 0 || target >= newSteps.length) return
    ;[newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]]
    update(newSteps.map((s, i) => ({ ...s, step: i + 1 })))
  }

  const updateStep = (idx: number, field: keyof ProcessStep, val: string) => {
    const newSteps = local.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    setLocal(newSteps)
  }

  const saveStep = (idx: number) => {
    onSave(local)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">製作步驟</Label>
        <Button size="sm" variant="outline" onClick={addStep}>
          <Plus className="w-3 h-3 mr-1" />
          新增步驟
        </Button>
      </div>

      {local.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">尚未新增步驟</p>
      )}

      <div className="space-y-3">
        {local.map((step, idx) => (
          <Card key={idx} className="border-l-4 border-l-primary/40">
            <CardContent className="pt-4 pb-3 space-y-3">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground w-6 shrink-0">
                  {step.step}.
                </span>
                <Input
                  value={step.title}
                  onChange={e => updateStep(idx, "title", e.target.value)}
                  onBlur={() => saveStep(idx)}
                  placeholder="步驟標題"
                  className="flex-1 h-8"
                />
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveStep(idx, 1)} disabled={idx === local.length - 1}>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeStep(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={step.description}
                onChange={e => updateStep(idx, "description", e.target.value)}
                onBlur={() => saveStep(idx)}
                placeholder="步驟說明..."
                rows={2}
                className="resize-none text-sm"
              />
              {/* Safety note */}
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-2 shrink-0" />
                <Input
                  value={step.safety_note || ""}
                  onChange={e => updateStep(idx, "safety_note", e.target.value)}
                  onBlur={() => saveStep(idx)}
                  placeholder="安全注意事項（選填）"
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Materials editor ───────────────────────────────────────────────────────────

function MaterialsEditor({ materials, onSave }: {
  materials: MaterialItem[]; onSave: (m: MaterialItem[]) => void
}) {
  const [local, setLocal] = useState<MaterialItem[]>(materials)

  useEffect(() => { setLocal(materials) }, [materials])

  const update = (newList: MaterialItem[]) => {
    setLocal(newList)
    onSave(newList)
  }

  const add = () => update([...local, { name: "", quantity: 1, unit: "個", in_classroom: false }])

  const change = (idx: number, field: keyof MaterialItem, val: any) => {
    const newList = local.map((m, i) => i === idx ? { ...m, [field]: val } : m)
    setLocal(newList)
  }

  const blur = () => onSave(local)

  const remove = (idx: number) => update(local.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Package className="w-4 h-4" />
          材料清單
        </Label>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3 h-3 mr-1" />
          新增材料
        </Button>
      </div>

      {local.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">尚未新增材料</p>
      )}

      <div className="space-y-2">
        {local.map((mat, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Input
              value={mat.name}
              onChange={e => change(idx, "name", e.target.value)}
              onBlur={blur}
              placeholder="材料名稱"
              className="flex-1 min-w-[140px]"
            />
            <Input
              type="number"
              value={mat.quantity}
              onChange={e => change(idx, "quantity", Number(e.target.value))}
              onBlur={blur}
              className="w-20"
              min={1}
            />
            <Input
              value={mat.unit}
              onChange={e => change(idx, "unit", e.target.value)}
              onBlur={blur}
              placeholder="單位"
              className="w-16"
            />
            <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={mat.in_classroom}
                onChange={e => { change(idx, "in_classroom", e.target.checked); setTimeout(blur, 0) }}
                className="w-4 h-4"
              />
              教室有
            </label>
            <Button size="icon" variant="ghost" onClick={() => remove(idx)} className="text-destructive hover:text-destructive shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Equipment editor ───────────────────────────────────────────────────────────

function EquipmentEditor({ equipment, onSave }: {
  equipment: EquipmentItem[]; onSave: (e: EquipmentItem[]) => void
}) {
  const [local, setLocal] = useState<EquipmentItem[]>(equipment)

  useEffect(() => { setLocal(equipment) }, [equipment])

  const update = (newList: EquipmentItem[]) => {
    setLocal(newList)
    onSave(newList)
  }

  const add = () => update([...local, { name: "", in_classroom: false }])

  const change = (idx: number, field: keyof EquipmentItem, val: any) => {
    const newList = local.map((e, i) => i === idx ? { ...e, [field]: val } : e)
    setLocal(newList)
  }

  const blur = () => onSave(local)

  const remove = (idx: number) => update(local.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          設備清單
        </Label>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-3 h-3 mr-1" />
          新增設備
        </Button>
      </div>

      {local.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">尚未新增設備</p>
      )}

      <div className="space-y-2">
        {local.map((eq, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={eq.name}
              onChange={e => change(idx, "name", e.target.value)}
              onBlur={blur}
              placeholder="設備名稱（例：烙鐵、3D 印表機）"
              className="flex-1"
            />
            <Input
              value={eq.note || ""}
              onChange={e => change(idx, "note", e.target.value)}
              onBlur={blur}
              placeholder="備註"
              className="w-32 hidden sm:block"
            />
            <label className="flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={eq.in_classroom}
                onChange={e => { change(idx, "in_classroom", e.target.checked); setTimeout(blur, 0) }}
                className="w-4 h-4"
              />
              教室有
            </label>
            <Button size="icon" variant="ghost" onClick={() => remove(idx)} className="text-destructive hover:text-destructive shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Equipment scheduler ───────────────────────────────────────────────────────

interface OccupiedSlot {
  equipment_name: string
  date: string
  period: number
  project_plan_id: string
  plan_title: string
}

function EquipmentScheduler({
  equipment, schedules, planId, onSave,
}: {
  equipment: EquipmentItem[]
  schedules: EquipmentSchedule[]
  planId: string
  onSave: (s: EquipmentSchedule[]) => void
}) {
  const [local, setLocal] = useState<EquipmentSchedule[]>(schedules)
  const [occupied, setOccupied] = useState<OccupiedSlot[]>([])
  const [loadingAvail, setLoadingAvail] = useState(false)

  // Date state for date input (shared for quick use)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => { setLocal(schedules) }, [schedules])

  // Fetch occupied slots whenever local dates change
  const activeDates = [...new Set(local.map(s => s.date).filter(Boolean))]

  useEffect(() => {
    async function fetchAvailability() {
      if (activeDates.length === 0) {
        // Fetch next 14 days by default
        const from = today
        const to = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
        setLoadingAvail(true)
        try {
          const res = await fetch(`/api/equipment/availability?from=${from}&to=${to}&exclude_plan_id=${planId}`)
          const data = await res.json()
          setOccupied(data.slots || [])
        } catch { /* ignore */ }
        setLoadingAvail(false)
        return
      }

      // Fetch for specific dates
      setLoadingAvail(true)
      try {
        const allSlots: OccupiedSlot[] = []
        for (const date of activeDates) {
          const res = await fetch(`/api/equipment/availability?date=${date}&exclude_plan_id=${planId}`)
          const data = await res.json()
          allSlots.push(...(data.slots || []))
        }
        setOccupied(allSlots)
      } catch { /* ignore */ }
      setLoadingAvail(false)
    }
    fetchAvailability()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDates.join(","), planId])

  const isSlotOccupied = (equipName: string, date: string, period: number) => {
    return occupied.some(s =>
      s.equipment_name === equipName && s.date === date && s.period === period
    )
  }

  const getSlotInfo = (equipName: string, date: string, period: number) => {
    return occupied.find(s =>
      s.equipment_name === equipName && s.date === date && s.period === period
    )
  }

  // Get schedules for a specific equipment
  const getEquipSchedules = (name: string) => local.filter(s => s.equipment_name === name)

  const addSchedule = (equipName: string) => {
    const newSched: EquipmentSchedule = { equipment_name: equipName, date: today, period: 1 }
    const updated = [...local, newSched]
    setLocal(updated)
    onSave(updated)
  }

  const updateSchedule = (idx: number, field: "date" | "period", val: string | number) => {
    const updated = local.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    setLocal(updated)
    onSave(updated)
  }

  const removeSchedule = (idx: number) => {
    const updated = local.filter((_, i) => i !== idx)
    setLocal(updated)
    onSave(updated)
  }

  const namedEquipment = equipment.filter(e => e.name.trim())

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <CalendarClock className="w-4 h-4" />
        待排程
        {loadingAvail && <span className="text-xs text-muted-foreground font-normal">（檢查中...）</span>}
      </Label>
      <p className="text-xs text-muted-foreground -mt-1">
        為每項設備選擇借用日期和節數。已被其他專案佔用的時段會標示為不可選。
      </p>

      <div className="space-y-4">
        {namedEquipment.map((eq) => {
          const eqSchedules = getEquipSchedules(eq.name)
          return (
            <Card key={eq.name} className="border-blue-200/60">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-blue-500" />
                    {eq.name}
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addSchedule(eq.name)}>
                    <Plus className="w-3 h-3 mr-1" />
                    新增時段
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {eqSchedules.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">尚未排程</p>
                )}
                {eqSchedules.map((sched) => {
                  // Find the real index in the full local array
                  const realIdx = local.indexOf(sched)
                  return (
                    <div key={realIdx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* Date */}
                      <Input
                        type="date"
                        value={sched.date}
                        onChange={e => updateSchedule(realIdx, "date", e.target.value)}
                        min={today}
                        className="w-[150px] text-sm h-8"
                      />
                      {/* Period selector */}
                      <div className="flex gap-1 flex-wrap flex-1">
                        {PERIODS.map(p => {
                          const isOcc = isSlotOccupied(eq.name, sched.date, p.period)
                          const isSelected = sched.period === p.period
                          const slotInfo = isOcc ? getSlotInfo(eq.name, sched.date, p.period) : null
                          return (
                            <button
                              key={p.period}
                              disabled={isOcc}
                              onClick={() => {
                                if (!isOcc) updateSchedule(realIdx, "period", p.period)
                              }}
                              title={isOcc
                                ? `已被「${slotInfo?.plan_title}」佔用`
                                : `${p.label} ${p.time}`
                              }
                              className={`
                                px-2 py-1 rounded text-[11px] border transition-colors
                                ${isSelected
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : isOcc
                                    ? "bg-red-50 text-red-300 border-red-200 cursor-not-allowed line-through"
                                    : "bg-white hover:bg-blue-50 border-gray-200 cursor-pointer"
                                }
                              `}
                            >
                              {p.label}
                            </button>
                          )
                        })}
                      </div>
                      {/* Remove */}
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => removeSchedule(realIdx)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ── Pickup section ─────────────────────────────────────────────────────────────

function PickupSection({ materials, equipment }: {
  materials: MaterialItem[]; equipment: EquipmentItem[]
}) {
  const pickupMaterials = materials.filter(m => !m.in_classroom && m.name)
  const pickupEquipment = equipment.filter(e => !e.in_classroom && e.name)

  if (pickupMaterials.length === 0 && pickupEquipment.length === 0) return null

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2 text-amber-600">
        <AlertTriangle className="w-4 h-4" />
        器材領取清單（需自備 / 另外準備）
      </Label>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4 space-y-3">
          {pickupMaterials.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">材料</p>
              <ul className="space-y-1">
                {pickupMaterials.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="flex-1">{m.name}</span>
                    <Badge variant="outline" className="text-xs">{m.quantity} {m.unit}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pickupEquipment.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">設備</p>
              <ul className="space-y-1">
                {pickupEquipment.map((e, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                    <span className="flex-1">{e.name}</span>
                    {e.note && <span className="text-xs text-muted-foreground">{e.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
