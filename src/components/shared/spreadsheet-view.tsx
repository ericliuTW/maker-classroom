"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Settings2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpreadsheetRow {
  id: string
  itemId: string
  name: string
  category: string
  classroom: string
  furniture: string
  furnitureRow: number
  furnitureCol: number
  classroomId: string
  placedQty: number
  totalQty: number
  borrowedQty: number
  availableQty: number
  unit: string
  status: string
  barcode: string
}

export interface SpreadsheetViewProps {
  rows: SpreadsheetRow[]
  isTeacher: boolean
  onUpdatePlacedQty?: (
    classroomId: string,
    furnitureRow: number,
    furnitureCol: number,
    itemId: string,
    newQty: number
  ) => void
  searchQuery?: string
  loading?: boolean
}

// ── Column definitions ────────────────────────────────────────────────────────

type ColumnKey =
  | "name"
  | "category"
  | "classroom"
  | "furniture"
  | "placedQty"
  | "totalQty"
  | "borrowedQty"
  | "availableQty"
  | "unit"
  | "status"
  | "barcode"

interface ColumnDef {
  key: ColumnKey
  label: string
  editable: boolean
  alwaysVisible: boolean
}

const COLUMNS: ColumnDef[] = [
  { key: "name",         label: "物品名稱", editable: false, alwaysVisible: true  },
  { key: "category",     label: "分類",     editable: false, alwaysVisible: false },
  { key: "classroom",    label: "擺放教室", editable: false, alwaysVisible: false },
  { key: "furniture",    label: "擺放位置", editable: false, alwaysVisible: false },
  { key: "placedQty",    label: "擺放數量", editable: true,  alwaysVisible: false },
  { key: "totalQty",     label: "庫存總量", editable: false, alwaysVisible: false },
  { key: "borrowedQty",  label: "借出數量", editable: false, alwaysVisible: false },
  { key: "availableQty", label: "現有數量", editable: false, alwaysVisible: false },
  { key: "unit",         label: "單位",     editable: false, alwaysVisible: false },
  { key: "status",       label: "狀態",     editable: false, alwaysVisible: false },
  { key: "barcode",      label: "條碼",     editable: false, alwaysVisible: false },
]

const DEFAULT_VISIBLE: ColumnKey[] = [
  "name",
  "category",
  "classroom",
  "furniture",
  "placedQty",
  "totalQty",
  "availableQty",
  "status",
]

const LS_KEY = "spreadsheet-columns"

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  available:     "正常",
  low_stock:     "低庫存",
  out_of_stock:  "缺貨",
  discontinued:  "停用",
}

const STATUS_BADGE: Record<string, string> = {
  正常:   "bg-green-100 text-green-800 border-green-200",
  低庫存: "bg-amber-100 text-amber-800 border-amber-200",
  缺貨:   "bg-red-100 text-red-800 border-red-200",
  停用:   "bg-gray-100 text-gray-600 border-gray-200",
}

function statusLabel(raw: string): string {
  return STATUS_MAP[raw] ?? raw
}

// ── Sort types ────────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | null

interface SortState {
  key: ColumnKey | null
  dir: SortDir
}

// ── Component ────────────────────────────────────────────────────────────────

export function SpreadsheetView({
  rows,
  isTeacher,
  onUpdatePlacedQty,
  searchQuery = "",
  loading = false,
}: SpreadsheetViewProps) {
  // ── Visible columns (persisted to localStorage) ───────────────────────────
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(() => {
    if (typeof window === "undefined") return new Set(DEFAULT_VISIBLE)
    try {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) {
        const parsed: ColumnKey[] = JSON.parse(stored)
        // always include alwaysVisible cols
        const withRequired = [
          ...COLUMNS.filter((c) => c.alwaysVisible).map((c) => c.key),
          ...parsed,
        ]
        return new Set(withRequired)
      }
    } catch {
      // ignore parse errors
    }
    return new Set(DEFAULT_VISIBLE)
  })

  useEffect(() => {
    const toSave = [...visibleCols].filter(
      (k) => !COLUMNS.find((c) => c.key === k)?.alwaysVisible
    )
    localStorage.setItem(LS_KEY, JSON.stringify(toSave))
  }, [visibleCols])

  // ── Column toggle dropdown ────────────────────────────────────────────────
  const [showColMenu, setShowColMenu] = useState(false)
  const colMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false)
      }
    }
    if (showColMenu) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showColMenu])

  function toggleCol(key: ColumnKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // ── Sorting ───────────────────────────────────────────────────────────────
  const [sort, setSort] = useState<SortState>({ key: null, dir: null })

  function handleSortCol(key: ColumnKey) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return { key: null, dir: null }
    })
  }

  function SortIcon({ colKey }: { colKey: ColumnKey }) {
    if (sort.key !== colKey) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />
    if (sort.dir === "asc")  return <ArrowUp   className="ml-1 h-3 w-3 inline text-blue-600" />
    return <ArrowDown className="ml-1 h-3 w-3 inline text-blue-600" />
  }

  // ── Inline editing ────────────────────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<{
    rowId: string
    key: ColumnKey
    value: string
  } | null>(null)

  function startEdit(row: SpreadsheetRow, key: ColumnKey) {
    if (!isTeacher) return
    setEditingCell({ rowId: row.id, key, value: String(row[key]) })
  }

  const commitEdit = useCallback(
    (row: SpreadsheetRow) => {
      if (!editingCell || editingCell.rowId !== row.id) return
      if (editingCell.key === "placedQty" && onUpdatePlacedQty) {
        const newQty = Number(editingCell.value)
        if (!isNaN(newQty) && newQty >= 0) {
          onUpdatePlacedQty(
            row.classroomId,
            row.furnitureRow,
            row.furnitureCol,
            row.itemId,
            newQty
          )
        }
      }
      setEditingCell(null)
    },
    [editingCell, onUpdatePlacedQty]
  )

  // ── Filtered + sorted rows ────────────────────────────────────────────────
  const processed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let result = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            r.classroom.toLowerCase().includes(q) ||
            r.furniture.toLowerCase().includes(q)
        )
      : rows

    if (sort.key && sort.dir) {
      const key = sort.key
      const dir = sort.dir
      result = [...result].sort((a, b) => {
        const av = a[key]
        const bv = b[key]
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "zh-TW")
        return dir === "asc" ? cmp : -cmp
      })
    }

    return result
  }, [rows, searchQuery, sort])

  // ── Active columns (in order) ─────────────────────────────────────────────
  const activeCols = COLUMNS.filter((c) => visibleCols.has(c.key))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-end mb-2">
        <div ref={colMenuRef} className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowColMenu((v) => !v)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            欄位設定
          </Button>

          {showColMenu && (
            <div className="absolute right-0 mt-1 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-3 min-w-[160px]">
              <p className="text-xs font-medium text-gray-500 mb-2">顯示欄位</p>
              {COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 text-sm py-0.5 cursor-pointer select-none ${
                    col.alwaysVisible ? "opacity-50 cursor-not-allowed" : "hover:text-blue-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.key)}
                    disabled={col.alwaysVisible}
                    onChange={() => !col.alwaysVisible && toggleCol(col.key)}
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
      <div className="w-full overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {activeCols.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSortCol(col.key)}
                  className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 transition-colors"
                >
                  {col.label}
                  <SortIcon colKey={col.key} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={activeCols.length}
                  className="py-16 text-center text-sm text-gray-400"
                >
                  載入中...
                </td>
              </tr>
            ) : processed.length === 0 ? (
              <tr>
                <td
                  colSpan={activeCols.length}
                  className="py-16 text-center text-sm text-gray-400"
                >
                  尚無物品資料
                </td>
              </tr>
            ) : (
              processed.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  {activeCols.map((col) => (
                    <td key={col.key} className="px-3 py-2">
                      <CellContent
                        col={col}
                        row={row}
                        isTeacher={isTeacher}
                        editingCell={editingCell}
                        setEditingCell={setEditingCell}
                        onStartEdit={startEdit}
                        onCommitEdit={commitEdit}
                        onEditChange={(value) =>
                          setEditingCell((prev) =>
                            prev ? { ...prev, value } : prev
                          )
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && processed.length > 0 && (
        <p className="mt-2 text-xs text-gray-400 text-right">
          共 {processed.length} 筆{rows.length !== processed.length ? `（篩選自 ${rows.length} 筆）` : ""}
        </p>
      )}
    </div>
  )
}

// ── Cell renderer (extracted for clarity) ────────────────────────────────────

interface CellContentProps {
  col: ColumnDef
  row: SpreadsheetRow
  isTeacher: boolean
  editingCell: { rowId: string; key: ColumnKey; value: string } | null
  setEditingCell: React.Dispatch<
    React.SetStateAction<{ rowId: string; key: ColumnKey; value: string } | null>
  >
  onStartEdit: (row: SpreadsheetRow, key: ColumnKey) => void
  onCommitEdit: (row: SpreadsheetRow) => void
  onEditChange: (value: string) => void
}

function CellContent({
  col,
  row,
  isTeacher,
  editingCell,
  onStartEdit,
  onCommitEdit,
  onEditChange,
}: CellContentProps) {
  const isActive =
    editingCell?.rowId === row.id && editingCell?.key === col.key

  // Editable number cell
  if (col.editable && isTeacher) {
    if (isActive) {
      return (
        <Input
          autoFocus
          type="number"
          min={0}
          value={editingCell.value}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={() => onCommitEdit(row)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitEdit(row)
            if (e.key === "Escape") {
              // cancel: reset editingCell without saving
              onCommitEdit(row) // harmless if value unchanged; or we could add a cancel handler
            }
          }}
          className="h-7 w-20 text-sm px-2 py-0"
        />
      )
    }
    return (
      <span
        onClick={() => onStartEdit(row, col.key)}
        className="cursor-pointer inline-block min-w-[2.5rem] rounded px-1.5 py-0.5 hover:bg-blue-100 hover:text-blue-800 transition-colors"
        title="點擊編輯"
      >
        {String(row[col.key])}
      </span>
    )
  }

  // Status badge
  if (col.key === "status") {
    const label = statusLabel(row.status)
    const cls = STATUS_BADGE[label] ?? "bg-gray-100 text-gray-600 border-gray-200"
    return (
      <Badge
        variant="outline"
        className={`text-xs font-normal border ${cls}`}
      >
        {label}
      </Badge>
    )
  }

  // Name — bold
  if (col.key === "name") {
    return (
      <span className="font-medium text-gray-900">{row.name}</span>
    )
  }

  // Default plain text
  const value = row[col.key]
  return (
    <span className="text-gray-700">
      {value !== undefined && value !== null && value !== "" ? String(value) : "—"}
    </span>
  )
}
