"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import type { Item } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Settings2, MapPin } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────

export interface ItemPlacement {
  classroomId: string
  classroomName: string
  furnitureLabel: string
  furnitureRow: number
  furnitureCol: number
  quantity: number
}

interface Props {
  items: Item[]
  isTeacher: boolean
  onEdit?: (item: Item) => void
  onDelete?: (item: Item) => void
  /** Map from item.id -> placement list */
  placements?: Map<string, ItemPlacement[]>
  /** Map from item.id -> total borrowed quantity */
  borrowedMap?: Record<string, number>
}

// ── Status ─────────────────────────────────────────────────────────

const statusMap: Record<string, { label: string; cls: string }> = {
  available: { label: "正常", cls: "bg-green-100 text-green-800 border-green-200" },
  low_stock: { label: "低庫存", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  out_of_stock: { label: "缺貨", cls: "bg-red-100 text-red-800 border-red-200" },
  discontinued: { label: "停用", cls: "bg-gray-100 text-gray-600 border-gray-200" },
}

// ── Column definition ──────────────────────────────────────────────

type ColKey = "name" | "category" | "quantity" | "unit" | "barcode" | "status" | "location" | "placedQty" | "borrowedQty" | "availableQty"

interface ColDef {
  key: ColKey
  label: string
  sortable: boolean
  alwaysVisible: boolean
  defaultVisible: boolean
  hideOnMobile: boolean
}

const COLUMNS: ColDef[] = [
  { key: "name",         label: "名稱",     sortable: true,  alwaysVisible: true,  defaultVisible: true,  hideOnMobile: false },
  { key: "category",     label: "分類",     sortable: true,  alwaysVisible: false, defaultVisible: true,  hideOnMobile: true },
  { key: "location",     label: "擺放位置", sortable: true,  alwaysVisible: false, defaultVisible: true,  hideOnMobile: true },
  { key: "placedQty",    label: "擺放數量", sortable: true,  alwaysVisible: false, defaultVisible: true,  hideOnMobile: true },
  { key: "quantity",     label: "庫存總量", sortable: true,  alwaysVisible: false, defaultVisible: true,  hideOnMobile: false },
  { key: "borrowedQty",  label: "借出數量", sortable: true,  alwaysVisible: false, defaultVisible: false, hideOnMobile: true },
  { key: "availableQty", label: "現有數量", sortable: true,  alwaysVisible: false, defaultVisible: true,  hideOnMobile: true },
  { key: "unit",         label: "單位",     sortable: false, alwaysVisible: false, defaultVisible: true,  hideOnMobile: true },
  { key: "barcode",      label: "條碼",     sortable: false, alwaysVisible: false, defaultVisible: false, hideOnMobile: true },
  { key: "status",       label: "狀態",     sortable: true,  alwaysVisible: false, defaultVisible: true,  hideOnMobile: false },
]

const LS_KEY = "item-table-columns"

type SortDir = "asc" | "desc" | null

// ── Component ──────────────────────────────────────────────────────

export function ItemTable({ items, isTeacher, onEdit, onDelete, placements, borrowedMap }: Props) {
  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(() => {
    if (typeof window === "undefined") return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) {
        const parsed: ColKey[] = JSON.parse(stored)
        const withRequired = [...COLUMNS.filter(c => c.alwaysVisible).map(c => c.key), ...parsed]
        return new Set(withRequired)
      }
    } catch { /* ignore */ }
    return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  })

  useEffect(() => {
    const toSave = [...visibleCols].filter(k => !COLUMNS.find(c => c.key === k)?.alwaysVisible)
    localStorage.setItem(LS_KEY, JSON.stringify(toSave))
  }, [visibleCols])

  // Column menu
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    if (showMenu) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showMenu])

  // Sorting
  const [sortKey, setSortKey] = useState<ColKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const handleSort = (key: ColKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc") }
    else if (sortDir === "asc") setSortDir("desc")
    else { setSortKey(null); setSortDir(null) }
  }

  // Build row data with placement info
  const rows = useMemo(() => {
    return items.map(item => {
      const locs = placements?.get(item.id) || []
      const totalPlaced = locs.reduce((s, l) => s + l.quantity, 0)
      const borrowed = borrowedMap?.[item.id] || 0
      const locationText = locs.length > 0
        ? locs.map(l => `${l.classroomName}/${l.furnitureLabel}`).join("、")
        : "—"
      return { item, locs, totalPlaced, borrowed, available: item.quantity - borrowed, locationText }
    })
  }, [items, placements, borrowedMap])

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows
    return [...rows].sort((a, b) => {
      let cmp = 0
      const key = sortKey
      if (key === "name") cmp = a.item.name.localeCompare(b.item.name, "zh-TW")
      else if (key === "category") cmp = (a.item.category?.name || "").localeCompare(b.item.category?.name || "", "zh-TW")
      else if (key === "quantity") cmp = a.item.quantity - b.item.quantity
      else if (key === "placedQty") cmp = a.totalPlaced - b.totalPlaced
      else if (key === "borrowedQty") cmp = a.borrowed - b.borrowed
      else if (key === "availableQty") cmp = a.available - b.available
      else if (key === "location") cmp = a.locationText.localeCompare(b.locationText, "zh-TW")
      else if (key === "status") cmp = a.item.status.localeCompare(b.item.status)
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  const activeCols = COLUMNS.filter(c => visibleCols.has(c.key))

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex justify-end">
        <div ref={menuRef} className="relative">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowMenu(v => !v)}>
            <Settings2 className="h-3.5 w-3.5" />
            欄位設定
          </Button>
          {showMenu && (
            <div className="absolute right-0 mt-1 z-50 bg-white border rounded-md shadow-lg p-3 min-w-[160px]">
              <p className="text-xs font-medium text-gray-500 mb-2">顯示欄位</p>
              {COLUMNS.map(col => (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 text-sm py-0.5 cursor-pointer select-none ${col.alwaysVisible ? "opacity-50 cursor-not-allowed" : "hover:text-blue-600"}`}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.key)}
                    disabled={col.alwaysVisible}
                    onChange={() => {
                      if (col.alwaysVisible) return
                      setVisibleCols(prev => {
                        const next = new Set(prev)
                        next.has(col.key) ? next.delete(col.key) : next.add(col.key)
                        return next
                      })
                    }}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {activeCols.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={`p-3 font-medium text-left whitespace-nowrap select-none ${col.hideOnMobile ? "hidden md:table-cell" : ""} ${col.sortable ? "cursor-pointer hover:bg-muted/80 transition-colors" : ""} ${["quantity", "placedQty", "borrowedQty", "availableQty"].includes(col.key) ? "text-right" : "text-left"}`}
                >
                  {col.label}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDir === "asc" ? <ArrowUp className="ml-1 h-3 w-3 inline text-blue-600" /> : <ArrowDown className="ml-1 h-3 w-3 inline text-blue-600" />
                      : <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-30" />
                  )}
                </th>
              ))}
              {isTeacher && <th className="text-right p-3 font-medium">操作</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ item, locs, totalPlaced, borrowed, available, locationText }) => {
              const status = statusMap[item.status] || statusMap.available
              return (
                <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                  {activeCols.map(col => {
                    switch (col.key) {
                      case "name":
                        return (
                          <td key={col.key} className="p-3">
                            <div className="font-medium">{item.name}</div>
                            {item.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</div>}
                          </td>
                        )
                      case "category":
                        return <td key={col.key} className="p-3 hidden md:table-cell text-muted-foreground">{item.category?.name || "—"}</td>
                      case "location":
                        return (
                          <td key={col.key} className="p-3 hidden md:table-cell">
                            {locs.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-0.5">
                                {locs.map((l, i) => (
                                  <div key={i} className="flex items-center gap-1 text-xs">
                                    <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span className="text-foreground">{l.classroomName}</span>
                                    <span className="text-muted-foreground">/ {l.furnitureLabel}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      case "placedQty":
                        return (
                          <td key={col.key} className="p-3 hidden md:table-cell text-right tabular-nums">
                            {totalPlaced > 0 ? totalPlaced : <span className="text-muted-foreground">0</span>}
                          </td>
                        )
                      case "quantity":
                        return (
                          <td key={col.key} className="p-3 text-right tabular-nums">
                            <span className={item.quantity <= item.min_quantity ? "text-destructive font-bold" : ""}>{item.quantity}</span>
                          </td>
                        )
                      case "borrowedQty":
                        return (
                          <td key={col.key} className="p-3 hidden md:table-cell text-right tabular-nums">
                            {borrowed > 0 ? <span className="text-amber-600 font-medium">{borrowed}</span> : <span className="text-muted-foreground">0</span>}
                          </td>
                        )
                      case "availableQty":
                        return (
                          <td key={col.key} className="p-3 hidden md:table-cell text-right tabular-nums">
                            <span className={available <= 0 ? "text-destructive font-bold" : available <= item.min_quantity ? "text-amber-600 font-medium" : ""}>
                              {available}
                            </span>
                          </td>
                        )
                      case "unit":
                        return <td key={col.key} className="p-3 hidden md:table-cell text-muted-foreground">{item.unit}</td>
                      case "barcode":
                        return <td key={col.key} className="p-3 hidden md:table-cell font-mono text-xs text-muted-foreground">{item.barcode || item.qr_code || "—"}</td>
                      case "status":
                        return (
                          <td key={col.key} className="p-3">
                            <Badge variant="outline" className={`text-xs font-normal border ${status.cls}`}>{status.label}</Badge>
                          </td>
                        )
                      default:
                        return null
                    }
                  })}
                  {isTeacher && (
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onEdit?.(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(item)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={activeCols.length + (isTeacher ? 1 : 0)} className="p-8 text-center text-muted-foreground">
                  尚無物品資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">共 {sorted.length} 項物品</p>
      )}
    </div>
  )
}
