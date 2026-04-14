"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import {
  MapPin, Plus, Save, Trash2, X, Monitor, Package,
  ChevronDown, Check, Settings, Copy,
} from "lucide-react"
import type {
  Item, Classroom, ClassroomVersion, ClassroomGridCell, ClassroomCellType,
} from "@/types/database"

// ============================================================
// Constants
// ============================================================

const CELL_SIZE = 80
const CELL_GAP = 3

const FURNITURE_PRESETS = [
  "電腦桌", "工作台", "3D印表機", "雷切機", "置物架",
  "垃圾桶", "門", "窗戶", "白板", "講台", "水槽",
]

// ============================================================
// DraggableItem — sidebar item to drag onto grid
// ============================================================

function DraggableItem({ item }: { item: Item }) {
  const dragId = `sidebar-item-${item.id}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { type: "sidebar-item", item },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-background border text-sm cursor-grab active:cursor-grabbing select-none hover:shadow-sm ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <Package className="w-4 h-4 text-indigo-500 shrink-0" />
      <span className="truncate">{item.name}</span>
      <span className="text-muted-foreground text-xs ml-auto shrink-0">
        {item.quantity} {item.unit}
      </span>
    </div>
  )
}

// ============================================================
// DraggableCellContent — item/furniture already on grid (can be moved)
// ============================================================

function DraggableCellContent({ cell }: { cell: ClassroomGridCell }) {
  const dragId = `cell-content-${cell.row}-${cell.col}`
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { type: "cell-content", cell },
  })

  if (cell.type === "furniture") {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`flex flex-col items-center justify-center w-full h-full cursor-grab active:cursor-grabbing select-none ${
          isDragging ? "opacity-30" : ""
        }`}
      >
        <Monitor className="w-5 h-5 text-gray-400" />
        <span className="text-[10px] font-medium text-gray-600 text-center leading-tight px-1 truncate max-w-full mt-0.5">
          {cell.label || "家具"}
        </span>
      </div>
    )
  }

  // item type
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex flex-col items-center justify-center w-full h-full cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
        {cell.quantity || 1}
      </div>
      <span className="text-[10px] font-medium text-foreground text-center leading-tight px-1 truncate max-w-full mt-0.5">
        {cell.item?.name || cell.label || "物品"}
      </span>
    </div>
  )
}

// ============================================================
// DroppableCell — one grid cell
// ============================================================

function DroppableCell({
  cell,
  isTeacher,
  onRemove,
}: {
  cell: ClassroomGridCell
  isTeacher: boolean
  onRemove: (row: number, col: number) => void
}) {
  const cellId = `cell-${cell.row}-${cell.col}`
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { row: cell.row, col: cell.col, cell },
  })

  if (cell.type === "empty") {
    return (
      <div
        ref={setNodeRef}
        className={`
          relative w-full h-full rounded-lg border border-dashed border-border/50
          flex items-center justify-center
          hover:border-primary/30 hover:bg-primary/5 transition-colors
          ${isOver ? "ring-2 ring-primary border-primary bg-primary/10" : ""}
        `}
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        group relative w-full h-full rounded-lg border shadow-sm
        flex items-center justify-center transition-all overflow-hidden
        ${cell.type === "furniture"
          ? "border-dashed border-gray-300 bg-gray-50"
          : "border-indigo-200 bg-background hover:shadow-md"
        }
        ${isOver ? "ring-2 ring-primary border-primary" : ""}
      `}
    >
      {isTeacher && (
        <button
          onClick={() => onRemove(cell.row, cell.col)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {isTeacher ? (
        <DraggableCellContent cell={cell} />
      ) : (
        // Read-only for students
        cell.type === "furniture" ? (
          <div className="flex flex-col items-center justify-center">
            <Monitor className="w-5 h-5 text-gray-400" />
            <span className="text-[10px] font-medium text-gray-600 text-center leading-tight px-1 truncate max-w-full mt-0.5">
              {cell.label || "家具"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {cell.quantity || 1}
            </div>
            <span className="text-[10px] font-medium text-foreground text-center leading-tight px-1 truncate max-w-full mt-0.5">
              {cell.item?.name || cell.label || "物品"}
            </span>
          </div>
        )
      )}
    </div>
  )
}

// ============================================================
// DragOverlayContent
// ============================================================

function DragOverlayContent({ data }: { data: any }) {
  if (data?.type === "sidebar-item") {
    return (
      <div className="w-16 h-16 rounded-xl bg-background border-2 border-primary shadow-xl flex flex-col items-center justify-center pointer-events-none">
        <Package className="w-5 h-5 text-indigo-500" />
        <p className="text-[9px] font-medium text-foreground truncate max-w-[56px]">
          {data.item?.name}
        </p>
      </div>
    )
  }
  if (data?.type === "cell-content") {
    const cell = data.cell as ClassroomGridCell
    return (
      <div className="w-16 h-16 rounded-xl bg-background border-2 border-primary shadow-xl flex flex-col items-center justify-center pointer-events-none">
        {cell.type === "furniture" ? (
          <Monitor className="w-5 h-5 text-gray-400" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
            {cell.quantity || 1}
          </div>
        )}
        <p className="text-[9px] font-medium truncate max-w-[56px]">
          {cell.type === "furniture" ? (cell.label || "家具") : (cell.item?.name || cell.label || "")}
        </p>
      </div>
    )
  }
  return null
}

// ============================================================
// Main Page
// ============================================================

export default function ClassroomPage() {
  const { isTeacher } = useAuthStore()

  // Data
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("")
  const [versions, setVersions] = useState<ClassroomVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string>("")
  const [cells, setCells] = useState<ClassroomGridCell[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [dragData, setDragData] = useState<any>(null)
  const [placementMode, setPlacementMode] = useState<"item" | "furniture">("item")
  const [furnitureLabel, setFurnitureLabel] = useState("")
  const [versionName, setVersionName] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState("")
  const [editRows, setEditRows] = useState(8)
  const [editCols, setEditCols] = useState(10)

  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId)
  const selectedVersion = versions.find(v => v.id === selectedVersionId)
  const rows = selectedClassroom?.rows || 8
  const cols = selectedClassroom?.cols || 10

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // ---- Data fetching ----

  // Load classrooms + items
  useEffect(() => {
    Promise.all([
      fetch("/api/classrooms").then(r => r.json()),
      fetch("/api/items").then(r => r.json()),
    ]).then(([cls, itms]) => {
      setClassrooms(Array.isArray(cls) ? cls : [])
      setItems(Array.isArray(itms) ? itms : [])
      if (Array.isArray(cls) && cls.length > 0) {
        setSelectedClassroomId(cls[0].id)
      }
      setLoading(false)
    })
  }, [])

  // Load versions when classroom changes
  useEffect(() => {
    if (!selectedClassroomId) return
    fetch(`/api/classrooms/${selectedClassroomId}/versions`)
      .then(r => r.json())
      .then(async (vers) => {
        if (!Array.isArray(vers)) return
        setVersions(vers)
        // Auto-select active version, or first
        const active = vers.find((v: ClassroomVersion) => v.is_active) || vers[0]
        if (active) {
          setSelectedVersionId(active.id)
          await loadVersionCells(active)
        }
      })
  }, [selectedClassroomId])

  // Join item data to cells
  const loadVersionCells = useCallback(async (version: ClassroomVersion) => {
    const joinedCells = (version.cells || []).map(c => {
      if (c.type === "item" && c.item_id) {
        const item = items.find(i => i.id === c.item_id)
        return { ...c, item }
      }
      return c
    })
    setCells(joinedCells)
  }, [items])

  // Reload cells when version selection or items change
  useEffect(() => {
    if (!selectedVersionId || !versions.length) return
    const ver = versions.find(v => v.id === selectedVersionId)
    if (ver) loadVersionCells(ver)
  }, [selectedVersionId, items, versions, loadVersionCells])

  // ---- Build full grid (fill empty cells) ----

  const fullGrid = useMemo(() => {
    const grid: ClassroomGridCell[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const existing = cells.find(cell => cell.row === r && cell.col === c)
        grid.push(existing || { row: r, col: c, type: "empty" })
      }
    }
    return grid
  }, [cells, rows, cols])

  // ---- Drag & Drop handlers ----

  const handleDragStart = (event: DragStartEvent) => {
    setDragData(event.active.data.current)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDragData(null)
    const { active, over } = event
    if (!over || !isTeacher) return

    const overData = over.data.current as any
    const targetRow = overData?.row as number
    const targetCol = overData?.col as number
    if (targetRow == null || targetCol == null) return

    const activeData = active.data.current as any

    if (activeData?.type === "sidebar-item") {
      // Dropping an item from sidebar onto grid
      const item = activeData.item as Item
      setCells(prev => {
        const filtered = prev.filter(c => !(c.row === targetRow && c.col === targetCol))
        return [...filtered, {
          row: targetRow,
          col: targetCol,
          type: "item" as ClassroomCellType,
          item_id: item.id,
          quantity: 1,
          label: item.name,
          item,
        }]
      })
    } else if (activeData?.type === "cell-content") {
      // Moving existing cell content to new position
      const sourceCell = activeData.cell as ClassroomGridCell
      if (sourceCell.row === targetRow && sourceCell.col === targetCol) return

      setCells(prev => {
        // Remove from source
        const filtered = prev.filter(c =>
          !(c.row === sourceCell.row && c.col === sourceCell.col)
        )
        // Remove anything at target
        const filtered2 = filtered.filter(c =>
          !(c.row === targetRow && c.col === targetCol)
        )
        // Place at target
        return [...filtered2, {
          ...sourceCell,
          row: targetRow,
          col: targetCol,
        }]
      })
    }
  }

  // ---- Actions ----

  const handleAddFurniture = (label: string) => {
    // Find first empty cell
    const emptyCell = fullGrid.find(c => c.type === "empty")
    if (!emptyCell) {
      toast.error("沒有空位了")
      return
    }
    setCells(prev => [...prev, {
      row: emptyCell.row,
      col: emptyCell.col,
      type: "furniture" as ClassroomCellType,
      label,
    }])
    setFurnitureLabel("")
  }

  const handleRemoveCell = (row: number, col: number) => {
    setCells(prev => prev.filter(c => !(c.row === row && c.col === col)))
  }

  const handleCellClick = (cell: ClassroomGridCell) => {
    if (!isTeacher || cell.type !== "item") return
    // Increment quantity on click
    setCells(prev => prev.map(c =>
      c.row === cell.row && c.col === cell.col
        ? { ...c, quantity: (c.quantity || 1) + 1 }
        : c
    ))
  }

  const handleSaveVersion = async (saveAsNew: boolean) => {
    if (!selectedClassroomId) return

    const body: any = {
      name: versionName || selectedVersion?.name || `配置 ${new Date().toLocaleDateString("zh-TW")}`,
      cells,
    }
    if (!saveAsNew && selectedVersionId) {
      body.id = selectedVersionId
    }

    const res = await fetch(`/api/classrooms/${selectedClassroomId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      toast.success(saveAsNew ? "已建立新版本" : "已儲存")
      // Reload versions
      const vers = await fetch(`/api/classrooms/${selectedClassroomId}/versions`).then(r => r.json())
      setVersions(vers)
      if (saveAsNew && data.id) setSelectedVersionId(data.id)
      setVersionName("")
    } else {
      toast.error("儲存失敗")
    }
  }

  const handleSetActive = async () => {
    if (!selectedClassroomId || !selectedVersionId) return
    const res = await fetch(`/api/classrooms/${selectedClassroomId}/versions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId: selectedVersionId }),
    })
    if (res.ok) {
      toast.success("已設為使用中版本")
      setVersions(prev => prev.map(v => ({ ...v, is_active: v.id === selectedVersionId })))
    }
  }

  const handleCreateClassroom = async () => {
    const res = await fetch("/api/classrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新教室", rows: 8, cols: 10 }),
    })
    if (res.ok) {
      const newCls = await res.json()
      setClassrooms(prev => [...prev, newCls])
      setSelectedClassroomId(newCls.id)
      toast.success("已建立新教室")
    }
  }

  const handleDeleteClassroom = async () => {
    if (!selectedClassroomId) return
    if (!confirm("確定要刪除此教室及所有版本？")) return
    const res = await fetch(`/api/classrooms/${selectedClassroomId}`, { method: "DELETE" })
    if (res.ok) {
      setClassrooms(prev => prev.filter(c => c.id !== selectedClassroomId))
      setSelectedClassroomId(classrooms.find(c => c.id !== selectedClassroomId)?.id || "")
      toast.success("已刪除教室")
    }
  }

  const handleSaveSettings = async () => {
    if (!selectedClassroomId) return
    const res = await fetch(`/api/classrooms/${selectedClassroomId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, rows: editRows, cols: editCols }),
    })
    if (res.ok) {
      setClassrooms(prev => prev.map(c =>
        c.id === selectedClassroomId
          ? { ...c, name: editName, rows: editRows, cols: editCols }
          : c
      ))
      setShowSettings(false)
      toast.success("教室設定已更新")
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          教室配置圖
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Classroom selector */}
          <Select value={selectedClassroomId} onValueChange={(v) => v && setSelectedClassroomId(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="選擇教室" />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Version selector */}
          {versions.length > 0 && (
            <Select value={selectedVersionId} onValueChange={(v) => v && setSelectedVersionId(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="選擇版本" />
              </SelectTrigger>
              <SelectContent>
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} {v.is_active ? "✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isTeacher && (
            <>
              <Button variant="outline" size="icon" onClick={() => {
                setEditName(selectedClassroom?.name || "")
                setEditRows(selectedClassroom?.rows || 8)
                setEditCols(selectedClassroom?.cols || 10)
                setShowSettings(true)
              }}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleCreateClassroom}>
                <Plus className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">尚未建立教室</p>
            {isTeacher && (
              <Button className="mt-4" onClick={handleCreateClassroom}>
                <Plus className="w-4 h-4 mr-2" />
                建立第一間教室
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Sidebar — teacher only */}
            {isTeacher && (
              <div className="w-full lg:w-64 shrink-0 space-y-4">
                {/* Placement mode */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">放置工具</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-1">
                      <Button
                        variant={placementMode === "item" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setPlacementMode("item")}
                      >
                        <Package className="w-3 h-3 mr-1" />
                        物品
                      </Button>
                      <Button
                        variant={placementMode === "furniture" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setPlacementMode("furniture")}
                      >
                        <Monitor className="w-3 h-3 mr-1" />
                        家具
                      </Button>
                    </div>

                    {placementMode === "furniture" && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          <Input
                            value={furnitureLabel}
                            onChange={e => setFurnitureLabel(e.target.value)}
                            placeholder="家具名稱"
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            disabled={!furnitureLabel.trim()}
                            onClick={() => handleAddFurniture(furnitureLabel.trim())}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {FURNITURE_PRESETS.map(f => (
                            <Button
                              key={f}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => handleAddFurniture(f)}
                            >
                              {f}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Items list (draggable) */}
                {placementMode === "item" && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">庫存物品</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                        {items.map(item => (
                          <DraggableItem key={item.id} item={item} />
                        ))}
                        {items.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            尚無庫存物品
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Version controls */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">版本管理</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input
                      value={versionName}
                      onChange={e => setVersionName(e.target.value)}
                      placeholder={selectedVersion?.name || "版本名稱"}
                      className="text-sm"
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="flex-1" onClick={() => handleSaveVersion(false)}>
                        <Save className="w-3 h-3 mr-1" />
                        儲存
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleSaveVersion(true)}>
                        <Copy className="w-3 h-3 mr-1" />
                        另存新版
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={handleSetActive}
                      disabled={selectedVersion?.is_active}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {selectedVersion?.is_active ? "目前使用中" : "設為使用中"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Grid */}
            <div className="flex-1 overflow-auto">
              <div className="border rounded-lg bg-muted/30 p-4 inline-block min-w-fit">
                <div className="text-sm font-semibold text-foreground mb-2">
                  {selectedClassroom?.name} — {selectedVersion?.name || ""}
                  {selectedVersion?.is_active && (
                    <span className="ml-2 text-xs text-green-600 font-normal">使用中</span>
                  )}
                </div>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
                    gap: `${CELL_GAP}px`,
                  }}
                >
                  {fullGrid.map(cell => (
                    <div
                      key={`${cell.row}-${cell.col}`}
                      style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      onDoubleClick={() => handleCellClick(cell)}
                    >
                      <DroppableCell
                        cell={cell}
                        isTeacher={isTeacher}
                        onRemove={handleRemoveCell}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {isTeacher && (
                <p className="text-xs text-muted-foreground mt-2">
                  從左側拖曳物品到格子上放置。雙擊物品可增加數量。拖曳格子內物品可移動位置。
                </p>
              )}
            </div>
          </div>

          <DragOverlay>
            {dragData && <DragOverlayContent data={dragData} />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSettings(false)}>
          <Card className="w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">教室設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">教室名稱</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground">列數</label>
                  <Input type="number" value={editRows} onChange={e => setEditRows(Number(e.target.value))} min={3} max={20} />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground">欄數</label>
                  <Input type="number" value={editCols} onChange={e => setEditCols(Number(e.target.value))} min={3} max={20} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleSaveSettings}>
                  <Save className="w-4 h-4 mr-2" />
                  儲存
                </Button>
                <Button variant="destructive" onClick={handleDeleteClassroom}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  刪除教室
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Item legend */}
      {cells.filter(c => c.type === "item").length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {cells.filter(c => c.type === "item").map((cell, i) => (
            <div key={i} className="flex items-center gap-2 text-sm border rounded-lg p-2">
              <div className="w-4 h-4 rounded-full bg-indigo-500 shrink-0" />
              <span className="truncate">{cell.item?.name || cell.label}</span>
              <span className="text-muted-foreground ml-auto">x{cell.quantity || 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
