"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import type { Booking, Item, Project } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { CalendarClock, Plus, Check, X as XIcon, Clock } from "lucide-react"
import { format, addHours, startOfHour } from "date-fns"
import { zhTW } from "date-fns/locale"

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待確認", variant: "secondary" },
  confirmed: { label: "已確認", variant: "default" },
  in_progress: { label: "進行中", variant: "default" },
  completed: { label: "已完成", variant: "outline" },
  cancelled: { label: "已取消", variant: "destructive" },
}

export default function BookingsPage() {
  const { isTeacher, sessionToken } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchBookings = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    const res = await fetch(`/api/bookings?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setBookings(data)
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchBookings()
    fetch("/api/items").then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d.filter((i: Item) => i.category?.name === "設備")) })
  }, [fetchBookings])

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) { toast.success("狀態已更新"); fetchBookings() }
    else toast.error("更新失敗")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="w-6 h-6" />
          預約排程
        </h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="狀態" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待確認</SelectItem>
              <SelectItem value="confirmed">已確認</SelectItem>
              <SelectItem value="in_progress">進行中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增預約
          </Button>
        </div>
      </div>

      {/* Timeline view */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">尚無預約</div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => {
            const status = statusMap[booking.status] || statusMap.pending
            return (
              <Card key={booking.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{booking.title}</CardTitle>
                      {booking.project && (
                        <CardDescription>專案：{(booking.project as any)?.title}</CardDescription>
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

                  {booking.equipment_items.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {booking.equipment_items.map((eq, i) => (
                        <Badge key={i} variant="secondary">{eq}</Badge>
                      ))}
                    </div>
                  )}

                  {booking.note && (
                    <p className="text-sm text-muted-foreground">{booking.note}</p>
                  )}

                  {isTeacher && booking.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => handleStatusChange(booking.id, "confirmed")}>
                        <Check className="w-4 h-4 mr-1" />
                        確認
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(booking.id, "cancelled")}>
                        <XIcon className="w-4 h-4 mr-1" />
                        拒絕
                      </Button>
                    </div>
                  )}

                  {isTeacher && booking.status === "confirmed" && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(booking.id, "completed")}>
                      標記完成
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add booking dialog */}
      <NewBookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        items={items}
        sessionToken={sessionToken}
        onSaved={fetchBookings}
      />
    </div>
  )
}

function NewBookingDialog({ open, onOpenChange, items, sessionToken, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void
  items: Item[]; sessionToken: string | null; onSaved: () => void
}) {
  const now = startOfHour(addHours(new Date(), 1))
  const [form, setForm] = useState({
    title: "",
    start_time: format(now, "yyyy-MM-dd'T'HH:mm"),
    end_time: format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"),
    equipment_items: [] as string[],
    note: "",
    project_id: "",
  })
  const [saving, setSaving] = useState(false)

  const toggleEquipment = (name: string) => {
    setForm(f => ({
      ...f,
      equipment_items: f.equipment_items.includes(name)
        ? f.equipment_items.filter(e => e !== name)
        : [...f.equipment_items, name]
    }))
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>預約名稱 *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例：3D列印專題製作" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始時間</Label>
              <Input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>結束時間</Label>
              <Input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
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
            <Label>備註</Label>
            <Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} />
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
