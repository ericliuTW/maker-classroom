"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  MapPin, Plus, Save, Trash2, X, Monitor, Package, Search,
  ChevronDown, Check, Settings, Copy, Printer, List,
  DoorOpen, Square, Zap, RectangleHorizontal,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react"
import type {
  Item, Classroom, ClassroomVersion, ClassroomGridCell, FurnitureItem,
} from "@/types/database"

// ============================================================
// Constants
// ============================================================

const CELL_SIZE = 40
const CELL_GAP = 1

const FURNITURE_PRESETS: { label: string; icon: string; defaultW: number; defaultH: number }[] = [
  { label: "工作台", icon: "🔧", defaultW: 3, defaultH: 2 },
  { label: "電腦桌", icon: "🖥️", defaultW: 2, defaultH: 1 },
  { label: "置物架", icon: "📦", defaultW: 2, defaultH: 1 },
  { label: "材料架", icon: "🗄️", defaultW: 2, defaultH: 1 },
  { label: "黑板", icon: "📝", defaultW: 4, defaultH: 1 },
  { label: "白板", icon: "⬜", defaultW: 4, defaultH: 1 },
  { label: "門", icon: "🚪", defaultW: 2, defaultH: 1 },
  { label: "窗戶", icon: "🪟", defaultW: 3, defaultH: 1 },
  { label: "講台", icon: "🎤", defaultW: 3, defaultH: 2 },
  { label: "水槽", icon: "🚰", defaultW: 2, defaultH: 1 },
  { label: "3D印表機", icon: "🖨️", defaultW: 2, defaultH: 2 },
  { label: "雷切機", icon: "⚡", defaultW: 3, defaultH: 2 },
  { label: "鑽床", icon: "🔩", defaultW: 2, defaultH: 2 },
  { label: "砂輪機", icon: "⚙️", defaultW: 1, defaultH: 1 },
  { label: "線鋸機", icon: "🪚", defaultW: 2, defaultH: 2 },
  { label: "CNC雕刻機", icon: "🛠️", defaultW: 3, defaultH: 2 },
  { label: "緊急開關", icon: "🔴", defaultW: 1, defaultH: 1 },
  { label: "電箱", icon: "⚡", defaultW: 1, defaultH: 2 },
  { label: "滅火器", icon: "🧯", defaultW: 1, defaultH: 1 },
  { label: "急救箱", icon: "🩹", defaultW: 1, defaultH: 1 },
  { label: "垃圾桶", icon: "🗑️", defaultW: 1, defaultH: 1 },
]

function getFurnitureColor(label: string): string {
  if (["門", "窗戶"].includes(label)) return "bg-amber-100 border-amber-300"
  if (["緊急開關", "電箱", "滅火器"].includes(label)) return "bg-red-50 border-red-300"
  if (["急救箱"].includes(label)) return "bg-green-50 border-green-300"
  if (["黑板", "白板", "講台"].includes(label)) return "bg-slate-100 border-slate-300"
  if (["3D印表機", "雷切機", "鑽床", "砂輪機", "線鋸機", "CNC雕刻機"].includes(label)) return "bg-blue-50 border-blue-300"
  if (["工作台", "電腦桌"].includes(label)) return "bg-orange-50 border-orange-300"
  return "bg-gray-100 border-gray-300"
}

// ============================================================
// Helpers: occupied cells calculation
// ============================================================

function getOccupiedCells(cells: ClassroomGridCell[]): Set<string> {
  const occupied = new Set<string>()
  for (const c of cells) {
    if (c.type !== "furniture") continue
    const w = c.width || 1
    const h = c.height || 1
    for (let r = 0; r < h; r++) {
      for (let cl = 0; cl < w; cl++) {
        occupied.add(`${c.row + r}-${c.col + cl}`)
      }
    }
  }
  return occupied
}

function canPlace(cells: ClassroomGridCell[], row: number, col: number, w: number, h: number, rows: number, cols: number, excludeCell?: ClassroomGridCell): boolean {
  if (row + h > rows || col + w > cols) return false
  const occupied = getOccupiedCells(excludeCell ? cells.filter(c => c !== excludeCell) : cells)
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (occupied.has(`${row + r}-${col + c}`)) return false
    }
  }
  return true
}

// ============================================================
// DraggableItem — sidebar item to drag onto furniture
// ============================================================

function DraggableItem({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-item-${item.id}`,
    data: { type: "sidebar-item", item },
  })
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs cursor-grab active:cursor-grabbing select-none hover:shadow-sm ${isDragging ? "opacity-30" : ""}`}
    >
      <Package className="w-3 h-3 text-indigo-500 shrink-0" />
      <span className="truncate flex-1">{item.name}</span>
      <span className="text-muted-foreground shrink-0">{item.quantity}{item.unit}</span>
    </div>
  )
}

// ============================================================
// DroppableCell — one grid cell
// ============================================================

function DroppableCell({
  row, col, highlighted,
}: {
  row: number; col: number; highlighted: boolean
}) {
  const cellId = `cell-${row}-${col}`
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { row, col },
  })
  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full rounded-sm transition-colors
        ${isOver ? "bg-primary/20 ring-1 ring-primary" : ""}
        ${highlighted ? "bg-yellow-200 ring-2 ring-yellow-400" : ""}
      `}
      style={{ gridRow: row + 1, gridColumn: col + 1 }}
    />
  )
}

// ============================================================
// FurnitureBlock — rendered furniture spanning multiple cells
// ============================================================

function FurnitureBlock({
  cell, isTeacher, highlighted, onRemove, onClick,
}: {
  cell: ClassroomGridCell; isTeacher: boolean; highlighted: boolean
  onRemove: () => void; onClick: () => void
}) {
  const w = cell.width || 1
  const h = cell.height || 1
  const itemCount = cell.items?.length || 0
  const colorClass = getFurnitureColor(cell.label || "")
  const cellId = `furniture-${cell.row}-${cell.col}`
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { row: cell.row, col: cell.col, furniture: cell },
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`
        group relative rounded border-2 cursor-pointer
        flex flex-col items-center justify-center overflow-hidden
        transition-all hover:shadow-md select-none
        ${colorClass}
        ${highlighted ? "ring-2 ring-yellow-400 shadow-lg shadow-yellow-200" : ""}
        ${isOver ? "ring-2 ring-primary shadow-lg" : ""}
      `}
      style={{
        gridRow: `${cell.row + 1} / span ${h}`,
        gridColumn: `${cell.col + 1} / span ${w}`,
        zIndex: 2,
      }}
    >
      {isTeacher && (
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="absolute top-0 right-0 w-4 h-4 rounded-bl bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <span className="text-[10px] font-medium text-center leading-tight px-0.5 truncate max-w-full">
        {cell.label || "家具"}
      </span>
      {itemCount > 0 && (
        <Badge variant="secondary" className="text-[8px] h-4 px-1 mt-0.5">
          {itemCount} 項器材
        </Badge>
      )}
    </div>
  )
}

// ============================================================
// DragOverlayContent
// ============================================================

function DragOverlayContent({ data }: { data: any }) {
  if (!data) return null
  if (data.type === "sidebar-item") {
    return (
      <div className="px-3 py-2 rounded-lg bg-background border-2 border-primary shadow-xl text-xs font-medium pointer-events-none">
        <Package className="w-4 h-4 text-indigo-500 inline mr-1" />
        {data.item?.name}
      </div>
    )
  }
  return null
}

// ============================================================
// Equipment List Panel
// ============================================================

function EquipmentListPanel({ cells, searchQuery }: { cells: ClassroomGridCell[]; searchQuery: string }) {
  const allItems: { furniture: string; item: FurnitureItem; row: number; col: number }[] = []
  for (const cell of cells) {
    if (cell.type !== "furniture" || !cell.items) continue
    for (const item of cell.items) {
      allItems.push({ furniture: cell.label || "未命名", item, row: cell.row, col: cell.col })
    }
  }

  const filtered = searchQuery
    ? allItems.filter(i =>
        i.item.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.item.item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.furniture.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allItems

  return (
    <div className="space-y-1 max-h-[40vh] overflow-y-auto">
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {searchQuery ? "未找到符合的器材" : "尚無器材擺放"}
        </p>
      ) : (
        filtered.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs border rounded px-2 py-1.5">
            <div className="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[9px] shrink-0">
              {entry.item.quantity}
            </div>
            <span className="truncate flex-1">{entry.item.item?.name || entry.item.label || "物品"}</span>
            <span className="text-muted-foreground shrink-0">📍 {entry.furniture}</span>
          </div>
        ))
      )}
      {!searchQuery && (
        <p className="text-[10px] text-muted-foreground mt-1">共 {allItems.length} 項器材</p>
      )}
    </div>
  )
}

// ============================================================
// Export to printable HTML
// ============================================================

function exportClassroomHTML(classroom: Classroom, version: ClassroomVersion, cells: ClassroomGridCell[]) {
  const cellPx = 36
  const gap = 1
  const furnitureCells = cells.filter(c => c.type === "furniture")

  // Build equipment list
  const equipmentList: { furniture: string; name: string; qty: number }[] = []
  for (const cell of furnitureCells) {
    for (const item of cell.items || []) {
      equipmentList.push({
        furniture: cell.label || "未命名",
        name: item.item?.name || item.label || "物品",
        qty: item.quantity,
      })
    }
  }

  const gridHTML = furnitureCells.map(c => {
    const w = c.width || 1
    const h = c.height || 1
    const colorClass = getFurnitureColor(c.label || "")
    const itemCount = c.items?.length || 0
    return `<div style="grid-row:${c.row+1}/span ${h};grid-column:${c.col+1}/span ${w};
      border:2px solid #ccc;border-radius:4px;display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-size:11px;padding:2px;
      background:${c.label && ["門","窗戶"].includes(c.label) ? "#fef3c7" : c.label && ["緊急開關","電箱","滅火器"].includes(c.label) ? "#fef2f2" : "#f3f4f6"}">
      <b>${c.label || "家具"}</b>
      ${itemCount > 0 ? `<span style="font-size:9px;color:#666">${itemCount}項</span>` : ""}
    </div>`
  }).join("\n")

  const eqRows = equipmentList.map(e =>
    `<tr><td style="padding:4px 8px;border:1px solid #ddd">${e.name}</td>
     <td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${e.qty}</td>
     <td style="padding:4px 8px;border:1px solid #ddd">${e.furniture}</td></tr>`
  ).join("\n")

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${classroom.name} — ${version.name}</title>
<style>@media print{.no-print{display:none!important}body{margin:0}}
body{font-family:sans-serif;padding:20px}
.grid{display:grid;grid-template-columns:repeat(${classroom.cols},${cellPx}px);
grid-template-rows:repeat(${classroom.rows},${cellPx}px);gap:${gap}px;
background:#e5e7eb;border:2px solid #9ca3af;border-radius:4px;padding:${gap}px;margin:16px 0}
table{border-collapse:collapse;width:100%;margin-top:16px}
th{background:#f3f4f6;padding:6px 8px;border:1px solid #ddd;text-align:left;font-size:12px}
td{font-size:12px}</style></head><body>
<h1 style="margin:0">${classroom.name}</h1>
<p style="color:#666;margin:4px 0">版本：${version.name} ｜ 列印日期：${new Date().toLocaleDateString("zh-TW")}</p>
<div class="grid">${gridHTML}</div>
<h2>器材清單</h2>
${equipmentList.length > 0 ? `<table><thead><tr><th>器材名稱</th><th>數量</th><th>擺放位置</th></tr></thead><tbody>${eqRows}</tbody></table>` : "<p>無器材擺放</p>"}
<button class="no-print" onclick="window.print()" style="margin-top:16px;padding:8px 24px;font-size:14px;cursor:pointer">列印</button>
</body></html>`

  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank")
}

// ============================================================
// ClassroomListView — sortable table of all items in classroom
// ============================================================

interface ListRowType {
  key: string; name: string; category: string; furniture: string
  furnitureRow: number; furnitureCol: number; qty: number
  totalQty: number; unit: string; itemId: string
}

function ClassroomListView({
  rows, classroomName, searchQuery, isTeacher, onUpdateQty, onRemoveItem,
}: {
  rows: ListRowType[]
  classroomName: string
  searchQuery: string
  isTeacher: boolean
  onUpdateQty: (fRow: number, fCol: number, itemId: string, qty: number) => void
  onRemoveItem: (fRow: number, fCol: number, itemId: string) => void
}) {
  const [sortKey, setSortKey] = useState<"name" | "furniture" | "qty" | "totalQty" | "category" | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editVal, setEditVal] = useState("")

  const handleSort = (key: typeof sortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc") }
    else if (sortDir === "asc") setSortDir("desc")
    else { setSortKey(null); setSortDir(null) }
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-30" />
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 inline text-blue-600" />
      : <ArrowDown className="ml-1 h-3 w-3 inline text-blue-600" />
  }

  const filtered = searchQuery.trim()
    ? rows.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.furniture.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rows

  const sorted = sortKey && sortDir
    ? [...filtered].sort((a, b) => {
        let cmp = 0
        if (sortKey === "name") cmp = a.name.localeCompare(b.name, "zh-TW")
        else if (sortKey === "furniture") cmp = a.furniture.localeCompare(b.furniture, "zh-TW")
        else if (sortKey === "category") cmp = a.category.localeCompare(b.category, "zh-TW")
        else if (sortKey === "qty") cmp = a.qty - b.qty
        else if (sortKey === "totalQty") cmp = a.totalQty - b.totalQty
        return sortDir === "asc" ? cmp : -cmp
      })
    : filtered

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        {classroomName} — 物品清單（{sorted.length} 項）
      </div>
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium cursor-pointer hover:bg-muted/80 select-none" onClick={() => handleSort("name")}>
                物品名稱 <SortIcon k="name" />
              </th>
              <th className="p-3 text-left font-medium cursor-pointer hover:bg-muted/80 select-none hidden md:table-cell" onClick={() => handleSort("category")}>
                分類 <SortIcon k="category" />
              </th>
              <th className="p-3 text-left font-medium cursor-pointer hover:bg-muted/80 select-none" onClick={() => handleSort("furniture")}>
                擺放位置 <SortIcon k="furniture" />
              </th>
              <th className="p-3 text-right font-medium cursor-pointer hover:bg-muted/80 select-none" onClick={() => handleSort("qty")}>
                擺放數量 <SortIcon k="qty" />
              </th>
              <th className="p-3 text-right font-medium cursor-pointer hover:bg-muted/80 select-none hidden md:table-cell" onClick={() => handleSort("totalQty")}>
                庫存總量 <SortIcon k="totalQty" />
              </th>
              <th className="p-3 text-left font-medium hidden md:table-cell">單位</th>
              {isTeacher && <th className="p-3 text-right font-medium">操作</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={isTeacher ? 7 : 6} className="p-8 text-center text-muted-foreground">
                  {searchQuery ? "未找到符合的器材" : "此教室尚無器材擺放"}
                </td>
              </tr>
            ) : sorted.map(row => (
              <tr key={row.key} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">{row.name}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{row.category}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                    {row.furniture}
                  </div>
                </td>
                <td className="p-3 text-right tabular-nums">
                  {isTeacher && editingKey === row.key ? (
                    <Input
                      autoFocus
                      type="number"
                      min={0}
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onBlur={() => {
                        const n = Number(editVal)
                        if (!isNaN(n) && n >= 0) onUpdateQty(row.furnitureRow, row.furnitureCol, row.itemId, n)
                        setEditingKey(null)
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const n = Number(editVal)
                          if (!isNaN(n) && n >= 0) onUpdateQty(row.furnitureRow, row.furnitureCol, row.itemId, n)
                          setEditingKey(null)
                        }
                        if (e.key === "Escape") setEditingKey(null)
                      }}
                      className="h-7 w-20 text-sm text-right ml-auto"
                    />
                  ) : (
                    <span
                      className={isTeacher ? "cursor-pointer px-1.5 py-0.5 rounded hover:bg-blue-100 hover:text-blue-800 transition-colors" : ""}
                      onClick={isTeacher ? () => { setEditingKey(row.key); setEditVal(String(row.qty)) } : undefined}
                      title={isTeacher ? "點擊編輯" : undefined}
                    >
                      {row.qty}
                    </span>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">{row.totalQty}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{row.unit}</td>
                {isTeacher && (
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onRemoveItem(row.furnitureRow, row.furnitureCol, row.itemId)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================

export default function ClassroomPage() {
  const { isTeacher } = useAuthStore()

  // Data
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroomId, setSelectedClassroomId] = useState("")
  const [versions, setVersions] = useState<ClassroomVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState("")
  const [cells, setCells] = useState<ClassroomGridCell[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [dragData, setDragData] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFurniture, setSelectedFurniture] = useState<ClassroomGridCell | null>(null)
  const [furnitureDialogOpen, setFurnitureDialogOpen] = useState(false)
  const [showAddFurniture, setShowAddFurniture] = useState(false)
  const [customLabel, setCustomLabel] = useState("")
  const [customW, setCustomW] = useState(2)
  const [customH, setCustomH] = useState(1)
  const [versionName, setVersionName] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState("")
  const [editRows, setEditRows] = useState(16)
  const [editCols, setEditCols] = useState(20)
  const [showEquipmentList, setShowEquipmentList] = useState(false)
  const [addItemQty, setAddItemQty] = useState(1)
  const [classroomViewMode, setClassroomViewMode] = useState<"grid" | "spreadsheet">("grid")

  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId)
  const selectedVersion = versions.find(v => v.id === selectedVersionId)
  const rows = selectedClassroom?.rows || 16
  const cols = selectedClassroom?.cols || 20

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // Highlighted furniture from search
  const highlightedCells = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    const q = searchQuery.toLowerCase()
    const set = new Set<string>()
    for (const cell of cells) {
      if (cell.type !== "furniture" || !cell.items) continue
      const match = cell.items.some(item =>
        item.label?.toLowerCase().includes(q) ||
        item.item?.name?.toLowerCase().includes(q)
      )
      if (match) set.add(`${cell.row}-${cell.col}`)
    }
    return set
  }, [cells, searchQuery])

  // Build list-view rows from current cells (reactive — updates when cells change)
  interface ListRow {
    key: string
    name: string
    category: string
    furniture: string
    furnitureRow: number
    furnitureCol: number
    qty: number
    totalQty: number
    unit: string
    itemId: string
  }
  const listViewRows = useMemo((): ListRow[] => {
    const rows: ListRow[] = []
    for (const cell of cells) {
      if (cell.type !== "furniture" || !cell.items) continue
      for (const fi of cell.items) {
        rows.push({
          key: `${cell.row}-${cell.col}-${fi.item_id}`,
          name: fi.item?.name || fi.label || "未知物品",
          category: (fi.item?.category as any)?.name || "-",
          furniture: cell.label || "未命名",
          furnitureRow: cell.row,
          furnitureCol: cell.col,
          qty: fi.quantity,
          totalQty: fi.item?.quantity || 0,
          unit: fi.item?.unit || "",
          itemId: fi.item_id,
        })
      }
    }
    return rows
  }, [cells])

  // ---- Data fetching ----

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

  useEffect(() => {
    if (!selectedClassroomId) return
    fetch(`/api/classrooms/${selectedClassroomId}/versions`)
      .then(r => r.json())
      .then((vers) => {
        if (!Array.isArray(vers)) return
        setVersions(vers)
        const active = vers.find((v: ClassroomVersion) => v.is_active) || vers[0]
        if (active) {
          setSelectedVersionId(active.id)
          loadVersionCells(active)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassroomId])

  const loadVersionCells = useCallback((version: ClassroomVersion) => {
    const joinedCells = (version.cells || []).map(c => {
      if (c.type === "furniture" && c.items) {
        return {
          ...c,
          items: c.items.map(fi => ({
            ...fi,
            item: items.find(i => i.id === fi.item_id),
          })),
        }
      }
      return c
    })
    setCells(joinedCells)
  }, [items])

  useEffect(() => {
    if (!selectedVersionId || !versions.length) return
    const ver = versions.find(v => v.id === selectedVersionId)
    if (ver) loadVersionCells(ver)
  }, [selectedVersionId, items, versions, loadVersionCells])

  // ---- Build empty grid background ----

  const emptyGridCells = useMemo(() => {
    const occupied = getOccupiedCells(cells)
    const empties: { row: number; col: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!occupied.has(`${r}-${c}`)) {
          empties.push({ row: r, col: c })
        }
      }
    }
    return empties
  }, [cells, rows, cols])

  // ---- Drag & Drop ----

  const handleDragStart = (event: DragStartEvent) => {
    setDragData(event.active.data.current)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDragData(null)
    const { over } = event
    if (!over || !isTeacher) return
    const overData = over.data.current as any
    const activeData = event.active.data.current as any

    if (activeData?.type === "sidebar-item" && overData?.furniture) {
      // Drop item onto furniture
      const furnitureCell = overData.furniture as ClassroomGridCell
      const item = activeData.item as Item
      setCells(prev => prev.map(c => {
        if (c.row === furnitureCell.row && c.col === furnitureCell.col) {
          const existingItems = c.items || []
          const existingIdx = existingItems.findIndex(fi => fi.item_id === item.id)
          if (existingIdx >= 0) {
            // Increment quantity
            const updated = [...existingItems]
            updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 }
            return { ...c, items: updated }
          }
          return {
            ...c,
            items: [...existingItems, { item_id: item.id, quantity: 1, label: item.name, item }],
          }
        }
        return c
      }))
      toast.success(`已將 ${item.name} 放入 ${furnitureCell.label}`)
    }
  }

  // ---- Actions ----

  const handleAddFurniture = (label: string, w: number, h: number) => {
    // Find first spot that fits
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (canPlace(cells, r, c, w, h, rows, cols)) {
          setCells(prev => [...prev, {
            row: r, col: c, type: "furniture",
            label, furnitureType: label,
            width: w, height: h, items: [],
          }])
          setShowAddFurniture(false)
          return
        }
      }
    }
    toast.error("沒有足夠的空間放置此家具")
  }

  const handleRemoveFurniture = (row: number, col: number) => {
    setCells(prev => prev.filter(c => !(c.row === row && c.col === col)))
  }

  const handleFurnitureClick = (cell: ClassroomGridCell) => {
    setSelectedFurniture(cell)
    setFurnitureDialogOpen(true)
  }

  const handleRemoveItemFromFurniture = (furnitureRow: number, furnitureCol: number, itemId: string) => {
    setCells(prev => prev.map(c => {
      if (c.row === furnitureRow && c.col === furnitureCol) {
        return { ...c, items: (c.items || []).filter(fi => fi.item_id !== itemId) }
      }
      return c
    }))
    // Update the dialog state
    setSelectedFurniture(prev => {
      if (!prev) return null
      return { ...prev, items: (prev.items || []).filter(fi => fi.item_id !== itemId) }
    })
  }

  const handleAddItemToFurniture = (furnitureRow: number, furnitureCol: number, item: Item, qty: number) => {
    setCells(prev => prev.map(c => {
      if (c.row === furnitureRow && c.col === furnitureCol) {
        const existing = c.items || []
        const idx = existing.findIndex(fi => fi.item_id === item.id)
        if (idx >= 0) {
          const updated = [...existing]
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty }
          return { ...c, items: updated }
        }
        return { ...c, items: [...existing, { item_id: item.id, quantity: qty, label: item.name, item }] }
      }
      return c
    }))
    setSelectedFurniture(prev => {
      if (!prev) return null
      const existing = prev.items || []
      const idx = existing.findIndex(fi => fi.item_id === item.id)
      if (idx >= 0) {
        const updated = [...existing]
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty }
        return { ...prev, items: updated }
      }
      return { ...prev, items: [...existing, { item_id: item.id, quantity: qty, label: item.name, item }] }
    })
    toast.success(`已新增 ${item.name} x${qty}`)
  }

  const handleUpdateItemQty = (furnitureRow: number, furnitureCol: number, itemId: string, qty: number) => {
    if (qty < 1) return
    setCells(prev => prev.map(c => {
      if (c.row === furnitureRow && c.col === furnitureCol) {
        return { ...c, items: (c.items || []).map(fi => fi.item_id === itemId ? { ...fi, quantity: qty } : fi) }
      }
      return c
    }))
    setSelectedFurniture(prev => {
      if (!prev) return null
      return { ...prev, items: (prev.items || []).map(fi => fi.item_id === itemId ? { ...fi, quantity: qty } : fi) }
    })
  }

  // ---- Save / Version management ----

  const handleSaveVersion = async (saveAsNew: boolean) => {
    if (!selectedClassroomId) return
    const body: any = {
      name: versionName || selectedVersion?.name || `配置 ${new Date().toLocaleDateString("zh-TW")}`,
      cells,
    }
    if (!saveAsNew && selectedVersionId) body.id = selectedVersionId

    const res = await fetch(`/api/classrooms/${selectedClassroomId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      toast.success(saveAsNew ? "已建立新版本" : "已儲存")
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
      body: JSON.stringify({ name: "新教室", rows: 16, cols: 20 }),
    })
    if (res.ok) {
      const newCls = await res.json()
      setClassrooms(prev => [...prev, newCls])
      setSelectedClassroomId(newCls.id)
      toast.success("已建立新教室")
    }
  }

  const handleDeleteClassroom = async () => {
    if (!selectedClassroomId || !confirm("確定要刪除此教室及所有版本？")) return
    const res = await fetch(`/api/classrooms/${selectedClassroomId}`, { method: "DELETE" })
    if (res.ok) {
      const remaining = classrooms.filter(c => c.id !== selectedClassroomId)
      setClassrooms(remaining)
      setSelectedClassroomId(remaining[0]?.id || "")
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
        c.id === selectedClassroomId ? { ...c, name: editName, rows: editRows, cols: editCols } : c
      ))
      setShowSettings(false)
      toast.success("教室設定已更新")
    }
  }

  // ---- Render ----

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  }

  const furnitureCells = cells.filter(c => c.type === "furniture")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          教室配置圖
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={selectedClassroomId}
            onValueChange={v => v && setSelectedClassroomId(v)}
            items={classrooms.map(c => ({ value: c.id, label: c.name }))}
          >
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="選擇教室" /></SelectTrigger>
            <SelectContent>
              {classrooms.map(c => <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {versions.length > 0 && (
            <Select
              value={selectedVersionId}
              onValueChange={v => v && setSelectedVersionId(v)}
              items={versions.map(v => ({ value: v.id, label: `${v.name}${v.is_active ? " ✓" : ""}` }))}
            >
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="選擇版本" /></SelectTrigger>
              <SelectContent>
                {versions.map(v => (
                  <SelectItem key={v.id} value={v.id} label={`${v.name}${v.is_active ? " ✓" : ""}`}>
                    {v.name}{v.is_active ? " ✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isTeacher && (
            <>
              <Button variant="outline" size="icon" onClick={() => {
                setEditName(selectedClassroom?.name || "")
                setEditRows(selectedClassroom?.rows || 16)
                setEditCols(selectedClassroom?.cols || 20)
                setShowSettings(true)
              }}><Settings className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" onClick={handleCreateClassroom}>
                <Plus className="w-4 h-4" />
              </Button>
            </>
          )}
          <div className="flex border rounded-md">
            <Button
              variant={classroomViewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setClassroomViewMode("grid")}
              title="配置圖"
            >
              <MapPin className="w-4 h-4" />
            </Button>
            <Button
              variant={classroomViewMode === "spreadsheet" ? "default" : "ghost"}
              size="icon"
              onClick={() => setClassroomViewMode("spreadsheet")}
              title="物品清單"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowEquipmentList(!showEquipmentList)}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            if (selectedClassroom && selectedVersion) {
              exportClassroomHTML(selectedClassroom, selectedVersion, cells)
            }
          }}>
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜尋器材名稱，找到的家具會亮起來..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">尚未建立教室</p>
            {isTeacher && (
              <Button className="mt-4" onClick={handleCreateClassroom}>
                <Plus className="w-4 h-4 mr-2" />建立第一間教室
              </Button>
            )}
          </CardContent>
        </Card>
      ) : classroomViewMode === "spreadsheet" ? (
        <ClassroomListView
          rows={listViewRows}
          classroomName={selectedClassroom?.name || ""}
          searchQuery={searchQuery}
          isTeacher={isTeacher}
          onUpdateQty={(fRow, fCol, itemId, qty) => {
            if (qty <= 0) {
              setCells(prev => prev.map(c =>
                c.row === fRow && c.col === fCol
                  ? { ...c, items: (c.items || []).filter(fi => fi.item_id !== itemId) }
                  : c
              ))
            } else {
              handleUpdateItemQty(fRow, fCol, itemId, qty)
            }
          }}
          onRemoveItem={(fRow, fCol, itemId) => handleRemoveItemFromFurniture(fRow, fCol, itemId)}
        />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Sidebar — teacher only */}
            {isTeacher && (
              <div className="w-full lg:w-56 shrink-0 space-y-3">
                {/* Add furniture */}
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center justify-between">
                      放置家具
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setShowAddFurniture(!showAddFurniture)}>
                        {showAddFurniture ? "收合" : "展開"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  {showAddFurniture && (
                    <CardContent className="px-3 pb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-1 max-h-[30vh] overflow-y-auto">
                        {FURNITURE_PRESETS.map(f => (
                          <Button
                            key={f.label}
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-7 px-1.5 justify-start"
                            onClick={() => handleAddFurniture(f.label, f.defaultW, f.defaultH)}
                          >
                            <span className="mr-1">{f.icon}</span>
                            {f.label}
                          </Button>
                        ))}
                      </div>
                      <Separator />
                      <p className="text-[10px] text-muted-foreground">自訂家具</p>
                      <Input
                        value={customLabel}
                        onChange={e => setCustomLabel(e.target.value)}
                        placeholder="名稱"
                        className="text-xs h-7"
                      />
                      <div className="flex gap-1">
                        <div className="flex-1">
                          <Label className="text-[10px]">寬</Label>
                          <Input type="number" value={customW} onChange={e => setCustomW(Number(e.target.value))} min={1} max={10} className="text-xs h-7" />
                        </div>
                        <div className="flex-1">
                          <Label className="text-[10px]">高</Label>
                          <Input type="number" value={customH} onChange={e => setCustomH(Number(e.target.value))} min={1} max={10} className="text-xs h-7" />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        disabled={!customLabel.trim()}
                        onClick={() => { handleAddFurniture(customLabel.trim(), customW, customH); setCustomLabel("") }}
                      >
                        <Plus className="w-3 h-3 mr-1" />新增
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* Items list (draggable) */}
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs">庫存物品（拖入家具）</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="space-y-0.5 max-h-[35vh] overflow-y-auto">
                      {items.map(item => <DraggableItem key={item.id} item={item} />)}
                      {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">尚無庫存物品</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Version controls */}
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs">版本管理</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-1.5">
                    <Input value={versionName} onChange={e => setVersionName(e.target.value)} placeholder={selectedVersion?.name || "版本名稱"} className="text-xs h-7" />
                    <div className="flex gap-1">
                      <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => handleSaveVersion(false)}>
                        <Save className="w-3 h-3 mr-1" />儲存
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => handleSaveVersion(true)}>
                        <Copy className="w-3 h-3 mr-1" />另存
                      </Button>
                    </div>
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={handleSetActive} disabled={selectedVersion?.is_active}>
                      <Check className="w-3 h-3 mr-1" />
                      {selectedVersion?.is_active ? "目前使用中" : "設為使用中"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main area: Grid + Equipment list */}
            <div className="flex-1 space-y-4">
              {/* Grid */}
              <div className="border rounded-lg bg-muted/30 p-3 overflow-auto">
                <div className="text-xs font-medium text-foreground mb-2">
                  {selectedClassroom?.name} — {selectedVersion?.name || ""}
                  {selectedVersion?.is_active && <span className="ml-1 text-green-600">（使用中）</span>}
                  <span className="ml-2 text-muted-foreground">{rows}×{cols}</span>
                </div>
                <div
                  className="grid relative"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
                    gap: `${CELL_GAP}px`,
                    width: cols * (CELL_SIZE + CELL_GAP) - CELL_GAP,
                    background: "#e5e7eb",
                    borderRadius: 4,
                    padding: CELL_GAP,
                  }}
                >
                  {/* Empty cells (droppable background) */}
                  {emptyGridCells.map(({ row, col }) => (
                    <DroppableCell
                      key={`empty-${row}-${col}`}
                      row={row}
                      col={col}
                      highlighted={false}
                    />
                  ))}

                  {/* Furniture blocks */}
                  {furnitureCells.map(cell => (
                    <FurnitureBlock
                      key={`f-${cell.row}-${cell.col}`}
                      cell={cell}
                      isTeacher={isTeacher}
                      highlighted={highlightedCells.has(`${cell.row}-${cell.col}`)}
                      onRemove={() => handleRemoveFurniture(cell.row, cell.col)}
                      onClick={() => handleFurnitureClick(cell)}
                    />
                  ))}
                </div>
                {isTeacher && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    從左側拖曳物品到家具上放入。點擊家具查看/管理內容物。
                  </p>
                )}
              </div>

              {/* Equipment list panel (toggleable) */}
              {showEquipmentList && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      器材清單
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <EquipmentListPanel cells={cells} searchQuery={searchQuery} />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DragOverlay>
            {dragData && <DragOverlayContent data={dragData} />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Furniture detail dialog */}
      <Dialog open={furnitureDialogOpen} onOpenChange={setFurnitureDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              {selectedFurniture?.label || "家具"}
              <Badge variant="outline" className="text-xs">
                {selectedFurniture?.width || 1}×{selectedFurniture?.height || 1}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              位置：第 {(selectedFurniture?.row || 0) + 1} 列，第 {(selectedFurniture?.col || 0) + 1} 欄
            </p>
            <Separator />
            <p className="text-sm font-medium">存放器材：</p>
            {(!selectedFurniture?.items || selectedFurniture.items.length === 0) ? (
              <p className="text-sm text-muted-foreground">尚無器材。{isTeacher ? "從側邊欄拖曳物品到此家具上。" : ""}</p>
            ) : (
              <div className="space-y-2">
                {selectedFurniture.items.map(fi => (
                  <div key={fi.item_id} className="flex items-center gap-2 border rounded-lg p-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                      {fi.quantity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fi.item?.name || fi.label}</p>
                      {fi.item?.category && <p className="text-xs text-muted-foreground">{(fi.item.category as any)?.name}</p>}
                    </div>
                    {isTeacher && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="icon" className="w-6 h-6"
                          onClick={() => handleUpdateItemQty(selectedFurniture!.row, selectedFurniture!.col, fi.item_id, fi.quantity - 1)}
                        >-</Button>
                        <span className="text-xs w-6 text-center">{fi.quantity}</span>
                        <Button variant="outline" size="icon" className="w-6 h-6"
                          onClick={() => handleUpdateItemQty(selectedFurniture!.row, selectedFurniture!.col, fi.item_id, fi.quantity + 1)}
                        >+</Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive"
                          onClick={() => handleRemoveItemFromFurniture(selectedFurniture!.row, selectedFurniture!.col, fi.item_id)}
                        ><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Quick add item to this furniture */}
            {isTeacher && selectedFurniture && (
              <>
                <Separator />
                <p className="text-sm font-medium">快速新增器材：</p>
                <div className="flex gap-1 items-end">
                  <div className="flex-1">
                    <Select
                      onValueChange={v => {
                        if (!v) return
                        const item = items.find(i => i.id === v)
                        if (item) handleAddItemToFurniture(selectedFurniture.row, selectedFurniture.col, item, addItemQty)
                      }}
                      items={items.map(i => ({ value: i.id, label: i.name }))}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="選擇物品" /></SelectTrigger>
                      <SelectContent>
                        {items.map(item => (
                          <SelectItem key={item.id} value={item.id} label={item.name}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input type="number" value={addItemQty} onChange={e => setAddItemQty(Number(e.target.value))} min={1} className="w-16 h-8 text-xs" />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSettings(false)}>
          <Card className="w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <CardHeader><CardTitle className="text-base">教室設定</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">教室名稱</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-sm">列數</Label>
                  <Input type="number" value={editRows} onChange={e => setEditRows(Number(e.target.value))} min={5} max={30} />
                </div>
                <div className="flex-1">
                  <Label className="text-sm">欄數</Label>
                  <Input type="number" onChange={e => setEditCols(Number(e.target.value))} value={editCols} min={5} max={30} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleSaveSettings}>
                  <Save className="w-4 h-4 mr-2" />儲存
                </Button>
                <Button variant="destructive" onClick={handleDeleteClassroom}>
                  <Trash2 className="w-4 h-4 mr-2" />刪除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
