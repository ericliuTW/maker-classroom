"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Save, Plus, Trash2, MapPin } from "lucide-react"
import type { Item, ItemLocation, ClassroomConfig } from "@/types/database"

interface LocationWithItem extends ItemLocation {
  item?: Item & { category?: { name: string } }
  _delete?: boolean
}

export default function ClassroomPage() {
  const { isTeacher } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [config, setConfig] = useState<ClassroomConfig | null>(null)
  const [locations, setLocations] = useState<LocationWithItem[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState("")
  const [hoveredLoc, setHoveredLoc] = useState<LocationWithItem | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Fetch data
  useEffect(() => {
    fetch("/api/classroom-config").then(r => r.json()).then(data => {
      setConfig(data.config)
      setLocations(data.locations || [])
    })
    fetch("/api/items").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setItems(data)
    })
  }, [])

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !config) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = config.width
    canvas.height = config.height

    // Background
    ctx.fillStyle = "#f8f9fa"
    ctx.fillRect(0, 0, config.width, config.height)

    // Grid
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    for (let x = 0; x < config.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, config.height); ctx.stroke()
    }
    for (let y = 0; y < config.height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(config.width, y); ctx.stroke()
    }

    // Border
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, config.width, config.height)

    // Items
    locations.forEach((loc, i) => {
      if (loc._delete) return
      const isHovered = hoveredLoc?.id === loc.id
      const isDragging = draggingIdx === i

      ctx.beginPath()
      ctx.arc(loc.pos_x, loc.pos_y, isHovered ? 22 : 18, 0, Math.PI * 2)
      ctx.fillStyle = isDragging ? "#3b82f6" : isHovered ? "#2563eb" : "#6366f1"
      ctx.fill()
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Quantity label
      ctx.fillStyle = "#fff"
      ctx.font = "bold 12px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(String(loc.quantity), loc.pos_x, loc.pos_y)

      // Name below
      ctx.fillStyle = "#374151"
      ctx.font = "11px sans-serif"
      ctx.fillText(loc.item?.name || loc.label || "", loc.pos_x, loc.pos_y + 30)
    })

    // Title
    ctx.fillStyle = "#111827"
    ctx.font = "bold 16px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(config.name, 12, 24)
  }, [config, locations, hoveredLoc, draggingIdx])

  useEffect(() => { draw() }, [draw])

  // Mouse handlers
  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    const scaleX = (config?.width || 1200) / rect.width
    const scaleY = (config?.height || 800) / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const findLocAt = (x: number, y: number) => {
    return locations.findIndex(loc => {
      if (loc._delete) return false
      const dx = loc.pos_x - x
      const dy = loc.pos_y - y
      return Math.sqrt(dx * dx + dy * dy) < 25
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e)

    if (draggingIdx !== null && isTeacher) {
      setLocations(prev => prev.map((loc, i) =>
        i === draggingIdx ? { ...loc, pos_x: pos.x, pos_y: pos.y } : loc
      ))
      return
    }

    const idx = findLocAt(pos.x, pos.y)
    if (idx >= 0) {
      setHoveredLoc(locations[idx])
      setTooltipPos({ x: e.clientX, y: e.clientY })
    } else {
      setHoveredLoc(null)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isTeacher) return
    const pos = getCanvasPos(e)
    const idx = findLocAt(pos.x, pos.y)
    if (idx >= 0) setDraggingIdx(idx)
  }

  const handleMouseUp = () => { setDraggingIdx(null) }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isTeacher || !selectedItemId) return
    const pos = getCanvasPos(e)
    const item = items.find(i => i.id === selectedItemId)
    setLocations(prev => [...prev, {
      id: "",
      item_id: selectedItemId,
      pos_x: pos.x,
      pos_y: pos.y,
      quantity: 1,
      label: item?.name || null,
      item: item as any,
    }])
  }

  const handleSave = async () => {
    const res = await fetch("/api/classroom-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config, locations }),
    })
    if (res.ok) toast.success("教室配置已儲存")
    else toast.error("儲存失敗")
  }

  const handleRemoveSelected = () => {
    if (hoveredLoc) {
      setLocations(prev => prev.map(l =>
        l === hoveredLoc ? { ...l, _delete: true } : l
      ))
      setHoveredLoc(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          教室配置圖
        </h2>
        {isTeacher && (
          <div className="flex items-center gap-2">
            <Select value={selectedItemId} onValueChange={(v) => v && setSelectedItemId(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="選擇要放置的物品" />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRemoveSelected} disabled={!hoveredLoc}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              儲存
            </Button>
          </div>
        )}
      </div>

      {isTeacher && (
        <p className="text-sm text-muted-foreground">
          選擇物品後，在地圖上雙擊放置。拖曳可移動位置。
        </p>
      )}

      {/* Canvas */}
      <div className="border rounded-lg overflow-auto bg-white relative">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ maxHeight: "70vh" }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setHoveredLoc(null); setDraggingIdx(null) }}
          onDoubleClick={handleDoubleClick}
        />
      </div>

      {/* Tooltip */}
      {hoveredLoc && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 8 }}
        >
          <Card className="shadow-lg">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm">{hoveredLoc.item?.name || hoveredLoc.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4 space-y-1 text-xs text-muted-foreground">
              <p>數量：{hoveredLoc.quantity}</p>
              {hoveredLoc.item?.category && <p>分類：{(hoveredLoc.item.category as any)?.name}</p>}
              {hoveredLoc.item && <p>總庫存：{hoveredLoc.item.quantity} {hoveredLoc.item.unit}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {locations.filter(l => !l._delete).map((loc, i) => (
          <div key={i} className="flex items-center gap-2 text-sm border rounded-lg p-2">
            <div className="w-4 h-4 rounded-full bg-indigo-500" />
            <span className="truncate">{loc.item?.name || loc.label}</span>
            <span className="text-muted-foreground ml-auto">x{loc.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
