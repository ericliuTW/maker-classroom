"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useItems } from "@/hooks/use-items"
import { useAuthStore } from "@/stores/auth-store"
import { ItemTable, type ItemPlacement } from "@/components/inventory/item-table"
import { ItemCards } from "@/components/inventory/item-cards"
import { ItemDialog } from "@/components/inventory/item-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, LayoutGrid, Table, Search } from "lucide-react"
import { toast } from "sonner"
import type { Item } from "@/types/database"

interface PlacementRaw {
  itemId: string
  classroomId: string
  classroomName: string
  furnitureLabel: string
  furnitureRow: number
  furnitureCol: number
  quantity: number
}

export default function InventoryPage() {
  const { items, categories, loading, fetchItems } = useItems()
  const { isTeacher } = useAuthStore()
  const [view, setView] = useState<"table" | "card">("table")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)

  // Location data
  const [rawPlacements, setRawPlacements] = useState<PlacementRaw[]>([])
  const [borrowedMap, setBorrowedMap] = useState<Record<string, number>>({})

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/items/locations")
      const data = await res.json()
      setRawPlacements(data.placements || [])
      setBorrowedMap(data.borrowedMap || {})
    } catch { /* silently fail */ }
  }, [])

  // Fetch locations on mount
  useEffect(() => { fetchLocations() }, [fetchLocations])

  // Build placement map for ItemTable
  const placementMap = useMemo(() => {
    const map = new Map<string, ItemPlacement[]>()
    for (const p of rawPlacements) {
      const list = map.get(p.itemId) || []
      list.push({
        classroomId: p.classroomId,
        classroomName: p.classroomName,
        furnitureLabel: p.furnitureLabel,
        furnitureRow: p.furnitureRow,
        furnitureCol: p.furnitureCol,
        quantity: p.quantity,
      })
      map.set(p.itemId, list)
    }
    return map
  }, [rawPlacements])

  const filteredItems = items.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase())
    const matchCategory = categoryFilter === "all" || item.category_id === categoryFilter
    return matchSearch && matchCategory
  })

  const handleSave = useCallback(async (data: Partial<Item>) => {
    const method = data.id ? "PUT" : "POST"
    const res = await fetch("/api/items", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success(data.id ? "已更新" : "已新增")
      fetchItems()
      fetchLocations()
    } else {
      const err = await res.json()
      toast.error("操作失敗：" + err.error)
    }
  }, [fetchItems, fetchLocations])

  const handleDelete = useCallback(async (item: Item) => {
    if (!confirm(`確定要刪除「${item.name}」嗎？`)) return
    const res = await fetch("/api/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    })
    if (res.ok) {
      toast.success("已刪除")
      fetchItems()
    } else {
      toast.error("刪除失敗")
    }
  }, [fetchItems])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">庫存管理</h2>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size="icon"
              onClick={() => setView("table")}
              title="表格"
            >
              <Table className="w-4 h-4" />
            </Button>
            <Button
              variant={view === "card" ? "default" : "ghost"}
              size="icon"
              onClick={() => setView("card")}
              title="卡片"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          {isTeacher && (
            <Button onClick={() => { setEditItem(null); setDialogOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" />
              新增物品
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜尋名稱、條碼..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={(v) => v && setCategoryFilter(v)}
          items={[{ value: "all", label: "所有分類" }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="所有分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="所有分類">所有分類</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3">
          <p className="text-sm text-muted-foreground">物品總數</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-sm text-muted-foreground">總庫存量</p>
          <p className="text-2xl font-bold">{items.reduce((s, i) => s + i.quantity, 0)}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-sm text-muted-foreground">低庫存</p>
          <p className="text-2xl font-bold text-amber-500">
            {items.filter(i => i.quantity > 0 && i.quantity <= i.min_quantity).length}
          </p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-sm text-muted-foreground">缺貨</p>
          <p className="text-2xl font-bold text-destructive">
            {items.filter(i => i.quantity === 0).length}
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : view === "table" ? (
        <ItemTable
          items={filteredItems}
          isTeacher={isTeacher}
          onEdit={(item) => { setEditItem(item); setDialogOpen(true) }}
          onDelete={handleDelete}
          placements={placementMap}
          borrowedMap={borrowedMap}
        />
      ) : (
        <ItemCards
          items={filteredItems}
          isTeacher={isTeacher}
          onEdit={(item) => { setEditItem(item); setDialogOpen(true) }}
          onDelete={handleDelete}
        />
      )}

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editItem}
        categories={categories}
        onSave={handleSave}
      />
    </div>
  )
}
