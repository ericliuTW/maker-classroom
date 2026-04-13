"use client"

import type { Item } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  available: { label: "正常", variant: "default" },
  low_stock: { label: "低庫存", variant: "secondary" },
  out_of_stock: { label: "缺貨", variant: "destructive" },
  discontinued: { label: "停用", variant: "outline" },
}

interface Props {
  items: Item[]
  isTeacher: boolean
  onEdit?: (item: Item) => void
  onDelete?: (item: Item) => void
}

export function ItemTable({ items, isTeacher, onEdit, onDelete }: Props) {
  return (
    <div className="border rounded-lg overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">名稱</th>
            <th className="text-left p-3 font-medium hidden md:table-cell">分類</th>
            <th className="text-right p-3 font-medium">數量</th>
            <th className="text-left p-3 font-medium hidden md:table-cell">單位</th>
            <th className="text-left p-3 font-medium hidden lg:table-cell">條碼</th>
            <th className="text-left p-3 font-medium">狀態</th>
            {isTeacher && <th className="text-right p-3 font-medium">操作</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = statusMap[item.status] || statusMap.available
            return (
              <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="font-medium">{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {item.description}
                    </div>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">
                  {item.category?.name || "-"}
                </td>
                <td className="p-3 text-right tabular-nums">
                  <span className={item.quantity <= item.min_quantity ? "text-destructive font-bold" : ""}>
                    {item.quantity}
                  </span>
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{item.unit}</td>
                <td className="p-3 hidden lg:table-cell font-mono text-xs text-muted-foreground">
                  {item.barcode || item.qr_code || "-"}
                </td>
                <td className="p-3">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
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
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                尚無物品資料
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
