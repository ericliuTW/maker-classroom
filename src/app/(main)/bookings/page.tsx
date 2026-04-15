"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import type { Booking, Item, Project, ProjectPlan } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  CalendarClock, Plus, Check, X as XIcon, Clock, List, Calendar,
  ChevronLeft, ChevronRight, Package, Wrench, FileText, FolderOpen,
  Pencil, Info
} from "lucide-react"
import {
  format, addHours, startOfHour, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths,
  startOfWeek, endOfWeek, isToday
} from "date-fns"
import { zhTW } from "date-fns/locale"

// ─── Status config ──────────────────────────────────────────────────────────

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending:     { label: "待確認", variant: "secondary",    color: "bg-yellow-400" },
  confirmed:   { label: "已確認", variant: "default",      color: "bg-blue-500"   },
  in_progress: { label: "進行中", variant: "default",      color: "bg-green-500"  },
  completed:   { label: "已完成", variant: "outline",      color: "bg-gray-400"   },
  cancelled:   { label: "已取消", variant: "destructive",  color: "bg-red-400"    },
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"]

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const { isTeacher, sessionToken } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")

  // Detail modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    const res = await fetch(`/api/bookings?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setBookings(data)
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchBookings()
    fetch("/api/items").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setItems(d.filter((i: Item) => i.category?.name === "設備"))
    })
  }, [fetchBookings])

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      toast.success("狀態已更新")
      fetchBookings()
      // Refresh the selected booking in detail modal
      if (selectedBooking?.id === id) {
        setSelectedBooking(prev => prev ? { ...prev, status: status as Booking["status"] } : null)
      }
    } else {
      toast.error("更新失敗")
    }
  }

  const openDetail = (booking: Booking) => {
    setSelectedBooking(booking)
    setDetailOpen(true)
  }

  // Bookings filtered for selected day (calendar view)
  const dayBookings = selectedDay
    ? bookings.filter(b => isSameDay(new Date(b.start_time), selectedDay))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="w-6 h-6" />
          預約排程
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4 mr-1" />
              列表
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-0"
              onClick={() => setViewMode("calendar")}
            >
              <Calendar className="w-4 h-4 mr-1" />
              月曆
            </Button>
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v)}
            items={[
              { value: "all", label: "全部" },
              { value: "pending", label: "待確認" },
              { value: "confirmed", label: "已確認" },
              { value: "in_progress", label: "進行中" },
              { value: "completed", label: "已完成" },
            ]}
          >
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="狀態" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="全部">全部</SelectItem>
              <SelectItem value="pending" label="待確認">待確認</SelectItem>
              <SelectItem value="confirmed" label="已確認">已確認</SelectItem>
              <SelectItem value="in_progress" label="進行中">進行中</SelectItem>
              <SelectItem value="completed" label="已完成">已完成</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增預約
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : viewMode === "list" ? (
        <ListView
          bookings={bookings}
          isTeacher={isTeacher}
          onStatusChange={handleStatusChange}
          onOpenDetail={openDetail}
        />
      ) : (
        <CalendarView
          bookings={bookings}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
          isTeacher={isTeacher}
          onStatusChange={handleStatusChange}
          onOpenDetail={openDetail}
          dayBookings={dayBookings}
        />
      )}

      {/* New Booking Dialog */}
      <NewBookingDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        items={items}
        sessionToken={sessionToken}
        onSaved={fetchBookings}
      />

      {/* Detail Modal */}
      {selectedBooking && (
        <BookingDetailDialog
          open={detailOpen}
          onOpenChange={(v) => { setDetailOpen(v); if (!v) setSelectedBooking(null) }}
          booking={selectedBooking}
          isTeacher={isTeacher}
          onStatusChange={async (id, status) => {
            await handleStatusChange(id, status)
            setDetailOpen(false)
          }}
          onEdit={() => {
            setDetailOpen(false)
            setEditOpen(true)
          }}
        />
      )}

      {/* Edit Dialog */}
      {selectedBooking && (
        <EditBookingDialog
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) setSelectedBooking(null) }}
          booking={selectedBooking}
          items={items}
          onSaved={() => { fetchBookings(); setEditOpen(false); setSelectedBooking(null) }}
        />
      )}
    </div>
  )
}

// ─── List View ───────────────────────────────────────────────────────────────

function ListView({
  bookings, isTeacher, onStatusChange, onOpenDetail,
}: {
  bookings: Booking[]
  isTeacher: boolean
  onStatusChange: (id: string, status: string) => void
  onOpenDetail: (b: Booking) => void
}) {
  if (bookings.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">尚無預約</div>
  }
  return (
    <div className="space-y-4">
      {bookings.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          isTeacher={isTeacher}
          onStatusChange={onStatusChange}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  )
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking, isTeacher, onStatusChange, onOpenDetail,
}: {
  booking: Booking
  isTeacher: boolean
  onStatusChange: (id: string, status: string) => void
  onOpenDetail: (b: Booking) => void
}) {
  const status = statusMap[booking.status] || statusMap.pending
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onOpenDetail(booking)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{booking.title}</CardTitle>
            {booking.project && (
              <CardDescription>專案：{(booking.project as Project)?.title}</CardDescription>
            )}
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>
            {format(new Date(booking.start_time), "MM/dd (EEEE) HH:mm", { locale: zhTW })}
            {" ~ "}
            {format(new Date(booking.end_time), "HH:mm", { locale: zhTW })}
          </span>
        </div>

        {(booking.equipment_items?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {booking.equipment_items.map((eq, i) => (
              <Badge key={i} variant="secondary"><Wrench className="w-3 h-3 mr-1 inline" />{eq}</Badge>
            ))}
          </div>
        )}

        {(booking.material_items?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {booking.material_items!.map((m, i) => (
              <Badge key={i} variant="outline"><Package className="w-3 h-3 mr-1 inline" />{m}</Badge>
            ))}
          </div>
        )}

        {booking.note && (
          <p className="text-sm text-muted-foreground line-clamp-2">{booking.note}</p>
        )}

        {isTeacher && (
          <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
            {booking.status === "pending" && (
              <>
                <Button size="sm" onClick={() => onStatusChange(booking.id, "confirmed")}>
                  <Check className="w-4 h-4 mr-1" />確認
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onStatusChange(booking.id, "cancelled")}>
                  <XIcon className="w-4 h-4 mr-1" />拒絕
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <Button size="sm" variant="outline" onClick={() => onStatusChange(booking.id, "completed")}>
                標記完成
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({
  bookings, currentMonth, onMonthChange, selectedDay, onDaySelect,
  isTeacher, onStatusChange, onOpenDetail, dayBookings,
}: {
  bookings: Booking[]
  currentMonth: Date
  onMonthChange: (d: Date) => void
  selectedDay: Date | null
  onDaySelect: (d: Date | null) => void
  isTeacher: boolean
  onStatusChange: (id: string, status: string) => void
  onOpenDetail: (b: Booking) => void
  dayBookings: Booking[]
}) {
  // Build calendar grid days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Map date string → bookings
  const bookingsByDay: Record<string, Booking[]> = {}
  for (const b of bookings) {
    const key = format(new Date(b.start_time), "yyyy-MM-dd")
    if (!bookingsByDay[key]) bookingsByDay[key] = []
    bookingsByDay[key].push(b)
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, "yyyy年 M月", { locale: zhTW })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 bg-muted">
          {WEEKDAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-medium py-2 text-muted-foreground">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-y">
          {allDays.map(day => {
            const key = format(day, "yyyy-MM-dd")
            const dayBks = bookingsByDay[key] || []
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const todayDay = isToday(day)

            return (
              <div
                key={key}
                className={[
                  "min-h-[80px] p-1.5 cursor-pointer transition-colors select-none",
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                  isSelected && "bg-primary/10 ring-2 ring-inset ring-primary",
                  !isSelected && isCurrentMonth && "hover:bg-accent",
                ].filter(Boolean).join(" ")}
                onClick={() => onDaySelect(isSelected ? null : day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={[
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      todayDay && "bg-primary text-primary-foreground",
                    ].filter(Boolean).join(" ")}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                {/* Booking dots */}
                <div className="flex flex-wrap gap-0.5">
                  {dayBks.slice(0, 3).map(b => {
                    const s = statusMap[b.status] || statusMap.pending
                    return (
                      <span
                        key={b.id}
                        className={`w-2 h-2 rounded-full ${s.color}`}
                        title={b.title}
                      />
                    )
                  })}
                  {dayBks.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{dayBks.length - 3}</span>
                  )}
                </div>
                {/* Show first booking title on larger screens */}
                {dayBks.length > 0 && (
                  <p className="hidden sm:block text-[10px] text-muted-foreground truncate mt-0.5 leading-tight">
                    {dayBks[0].title}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(statusMap).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${v.color}`} />
            {v.label}
          </span>
        ))}
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">
            {format(selectedDay, "M月d日 (EEEE)", { locale: zhTW })} 的預約
            <span className="ml-2 text-muted-foreground font-normal">({dayBookings.length} 筆)</span>
          </h4>
          {dayBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">這天沒有預約</p>
          ) : (
            <div className="space-y-3">
              {dayBookings.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  isTeacher={isTeacher}
                  onStatusChange={onStatusChange}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Booking Detail Dialog ────────────────────────────────────────────────────

function BookingDetailDialog({
  open, onOpenChange, booking, isTeacher, onStatusChange, onEdit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  booking: Booking
  isTeacher: boolean
  onStatusChange: (id: string, status: string) => void
  onEdit: () => void
}) {
  const status = statusMap[booking.status] || statusMap.pending
  const project = booking.project as Project | undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <DialogTitle className="text-lg">{booking.title}</DialogTitle>
              <Badge variant={status.variant} className="mt-1">{status.label}</Badge>
            </div>
            {isTeacher && (
              <Button variant="ghost" size="icon" onClick={onEdit} title="編輯">
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Time range */}
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">時間</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(booking.start_time), "yyyy年M月d日 (EEEE) HH:mm", { locale: zhTW })}
              </p>
              <p className="text-sm text-muted-foreground">
                ~ {format(new Date(booking.end_time), "HH:mm", { locale: zhTW })}
                {" "}（共 {Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 3600000)} 小時）
              </p>
            </div>
          </div>

          {/* Equipment */}
          {(booking.equipment_items?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2">
              <Wrench className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">需要設備</p>
                <div className="flex flex-wrap gap-1">
                  {booking.equipment_items.map((eq, i) => (
                    <Badge key={i} variant="secondary">{eq}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Materials */}
          {(booking.material_items?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">需要材料</p>
                <div className="flex flex-wrap gap-1">
                  {booking.material_items!.map((m, i) => (
                    <Badge key={i} variant="outline">{m}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          {booking.note && (
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">備註</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.note}</p>
              </div>
            </div>
          )}

          {/* Related project */}
          {project && (
            <div className="flex items-start gap-2">
              <FolderOpen className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1">關聯專案</p>
                <p className="text-sm text-muted-foreground">{project.title}</p>
                {project.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Created time */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1 border-t">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>建立於 {format(new Date(booking.created_at), "yyyy/MM/dd HH:mm", { locale: zhTW })}</span>
          </div>
        </div>

        {/* Teacher actions */}
        {isTeacher && (
          <DialogFooter className="flex-wrap gap-2">
            {booking.status === "pending" && (
              <>
                <Button onClick={() => onStatusChange(booking.id, "confirmed")}>
                  <Check className="w-4 h-4 mr-1" />確認預約
                </Button>
                <Button variant="destructive" onClick={() => onStatusChange(booking.id, "cancelled")}>
                  <XIcon className="w-4 h-4 mr-1" />拒絕
                </Button>
              </>
            )}
            {booking.status === "confirmed" && (
              <Button variant="outline" onClick={() => onStatusChange(booking.id, "completed")}>
                標記完成
              </Button>
            )}
            {booking.status === "in_progress" && (
              <Button variant="outline" onClick={() => onStatusChange(booking.id, "completed")}>
                標記完成
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── New Booking Dialog ───────────────────────────────────────────────────────

function NewBookingDialog({
  open, onOpenChange, items, sessionToken, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  items: Item[]
  sessionToken: string | null
  onSaved: () => void
}) {
  const now = startOfHour(addHours(new Date(), 1))
  const defaultForm = {
    title: "",
    start_time: format(now, "yyyy-MM-dd'T'HH:mm"),
    end_time: format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"),
    equipment_items: [] as string[],
    material_items: [] as string[],
    note: "",
    project_id: "",
    project_plan_id: "",
  }
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [projectPlans, setProjectPlans] = useState<ProjectPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [showImportPlans, setShowImportPlans] = useState(false)
  const [materialInput, setMaterialInput] = useState("")

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm(defaultForm)
      setMaterialInput("")
      setShowImportPlans(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fetchProjectPlans = async () => {
    if (projectPlans.length > 0) { setShowImportPlans(true); return }
    setLoadingPlans(true)
    try {
      const res = await fetch("/api/project-plans")
      const data = await res.json()
      if (Array.isArray(data)) setProjectPlans(data)
    } catch {
      toast.error("無法取得專案規劃")
    }
    setLoadingPlans(false)
    setShowImportPlans(true)
  }

  const importFromPlan = (plan: ProjectPlan) => {
    const equipNames = (plan.equipment || []).map(e => e.name)
    const matNames = (plan.materials || []).map(m => m.name)
    setForm(f => ({
      ...f,
      title: f.title || plan.title,
      equipment_items: equipNames,
      material_items: matNames,
      project_plan_id: plan.id,
    }))
    setShowImportPlans(false)
    toast.success(`已從「${plan.title}」匯入設備與材料`)
  }

  const toggleEquipment = (name: string) => {
    setForm(f => ({
      ...f,
      equipment_items: f.equipment_items.includes(name)
        ? f.equipment_items.filter(e => e !== name)
        : [...f.equipment_items, name],
    }))
  }

  const addMaterial = () => {
    const v = materialInput.trim()
    if (!v || form.material_items.includes(v)) return
    setForm(f => ({ ...f, material_items: [...f.material_items, v] }))
    setMaterialInput("")
  }

  const removeMaterial = (m: string) => {
    setForm(f => ({ ...f, material_items: f.material_items.filter(x => x !== m) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        project_id: form.project_id || null,
        project_plan_id: form.project_plan_id || null,
        session_token: sessionToken,
      }),
    })
    if (res.ok) {
      toast.success("預約已提交，等待教師確認")
      onOpenChange(false)
      onSaved()
    } else {
      toast.error("預約失敗")
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>新增預約</DialogTitle></DialogHeader>

        {/* Import from project plan panel */}
        {showImportPlans && (
          <div className="border rounded-lg p-3 space-y-2 mb-2 bg-muted/40">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">選擇專案規劃</p>
              <Button variant="ghost" size="sm" onClick={() => setShowImportPlans(false)}>
                <XIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
            {loadingPlans ? (
              <p className="text-xs text-muted-foreground">載入中...</p>
            ) : projectPlans.length === 0 ? (
              <p className="text-xs text-muted-foreground">尚無專案規劃</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {projectPlans.map(plan => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer text-sm"
                    onClick={() => importFromPlan(plan)}
                  >
                    <span className="font-medium truncate flex-1">{plan.title}</span>
                    <Badge variant="outline" className="ml-2 text-xs shrink-0">
                      {plan.equipment?.length ?? 0}設備 / {plan.materials?.length ?? 0}材料
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>預約名稱 *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={fetchProjectPlans}
              >
                <FolderOpen className="w-3.5 h-3.5 mr-1" />
                從專案規劃匯入
              </Button>
            </div>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="例：3D列印專題製作"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始時間</Label>
              <Input
                type="datetime-local"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>結束時間</Label>
              <Input
                type="datetime-local"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <Label>需要的設備（點選）</Label>
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <Badge
                  key={item.id}
                  variant={form.equipment_items.includes(item.name) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleEquipment(item.name)}
                >
                  {item.name}
                </Badge>
              ))}
              {items.length === 0 && <p className="text-xs text-muted-foreground">尚無設備資料</p>}
            </div>
          </div>

          {/* Materials */}
          <div className="space-y-2">
            <Label>需要的材料</Label>
            <div className="flex gap-2">
              <Input
                value={materialInput}
                onChange={e => setMaterialInput(e.target.value)}
                placeholder="輸入材料名稱後按 Enter"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMaterial() } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addMaterial}>新增</Button>
            </div>
            {form.material_items.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {form.material_items.map(m => (
                  <Badge
                    key={m}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeMaterial(m)}
                  >
                    {m} <XIcon className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>備註</Label>
            <Textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2}
              placeholder="其他需求或說明..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "送出中..." : "送出預約"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Booking Dialog ──────────────────────────────────────────────────────

function EditBookingDialog({
  open, onOpenChange, booking, items, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  booking: Booking
  items: Item[]
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: booking.title,
    start_time: format(new Date(booking.start_time), "yyyy-MM-dd'T'HH:mm"),
    end_time: format(new Date(booking.end_time), "yyyy-MM-dd'T'HH:mm"),
    equipment_items: booking.equipment_items || [],
    material_items: booking.material_items || [],
    note: booking.note || "",
  })
  const [saving, setSaving] = useState(false)
  const [materialInput, setMaterialInput] = useState("")

  // Sync form when booking changes
  useEffect(() => {
    setForm({
      title: booking.title,
      start_time: format(new Date(booking.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(booking.end_time), "yyyy-MM-dd'T'HH:mm"),
      equipment_items: booking.equipment_items || [],
      material_items: booking.material_items || [],
      note: booking.note || "",
    })
    setMaterialInput("")
  }, [booking])

  const toggleEquipment = (name: string) => {
    setForm(f => ({
      ...f,
      equipment_items: f.equipment_items.includes(name)
        ? f.equipment_items.filter(e => e !== name)
        : [...f.equipment_items, name],
    }))
  }

  const addMaterial = () => {
    const v = materialInput.trim()
    if (!v || form.material_items.includes(v)) return
    setForm(f => ({ ...f, material_items: [...f.material_items, v] }))
    setMaterialInput("")
  }

  const removeMaterial = (m: string) => {
    setForm(f => ({ ...f, material_items: f.material_items.filter(x => x !== m) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, ...form }),
    })
    if (res.ok) {
      toast.success("預約已更新")
      onSaved()
    } else {
      toast.error("更新失敗")
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>編輯預約</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>預約名稱 *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始時間</Label>
              <Input
                type="datetime-local"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>結束時間</Label>
              <Input
                type="datetime-local"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>需要的設備（點選）</Label>
            <div className="flex flex-wrap gap-2">
              {items.map(item => (
                <Badge
                  key={item.id}
                  variant={form.equipment_items.includes(item.name) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleEquipment(item.name)}
                >
                  {item.name}
                </Badge>
              ))}
              {items.length === 0 && <p className="text-xs text-muted-foreground">尚無設備資料</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>需要的材料</Label>
            <div className="flex gap-2">
              <Input
                value={materialInput}
                onChange={e => setMaterialInput(e.target.value)}
                placeholder="輸入材料名稱後按 Enter"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMaterial() } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addMaterial}>新增</Button>
            </div>
            {form.material_items.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {form.material_items.map(m => (
                  <Badge
                    key={m}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeMaterial(m)}
                  >
                    {m} <XIcon className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>備註</Label>
            <Textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "儲存中..." : "儲存變更"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
