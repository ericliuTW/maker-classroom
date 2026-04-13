"use client"

import type { Item } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Package } from "lucide-react"

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

export function ItemCards({ items, isTeacher, onEdit, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        尚無物品資料
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => {
        const status = statusMap[item.status] || statusMap.available
        return (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{item.category?.name || "未分類"}</p>
                  </div>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {item.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold tabular-nums">
                  <span className={item.quantity <= item.min_quantity ? "text-destructive" : ""}>
                    {item.quantity}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
                </div>
                {isTeacher && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit?.(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete?.(item)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
              {(item.barcode || item.qr_code) && (
                <p className="text-xs font-mono text-muted-foreground mt-2">
                  {item.barcode || item.qr_code}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
