"use client"

import { useState, useEffect, useCallback } from "react"
import type { Transaction } from "@/types/database"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, LayoutGrid, Search, ArrowDownUp } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

const typeLabels: Record<string, { label: string; color: string }> = {
  borrow: { label: "借出", color: "bg-blue-100 text-blue-800" },
  return: { label: "歸還", color: "bg-green-100 text-green-800" },
  purchase: { label: "購入", color: "bg-purple-100 text-purple-800" },
  repair: { label: "報修", color: "bg-amber-100 text-amber-800" },
  dispose: { label: "報銷", color: "bg-red-100 text-red-800" },
}

const statusLabels: Record<string, string> = {
  pending: "待處理",
  active: "進行中",
  completed: "已完成",
  cancelled: "已取消",
}

export default function TransactionsPage() {
  const { isTeacher } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"table" | "card">("table")
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")

  const fetchTransactions = useCallback(async () => {
    const params = new URLSearchParams()
    if (typeFilter !== "all") params.set("type", typeFilter)
    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    if (Array.isArray(data)) setTransactions(data)
    setLoading(false)
  }, [typeFilter])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const filtered = transactions.filter(t =>
    !search || t.item?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.note?.toLowerCase().includes(search.toLowerCase()) ||
    t.scanned_code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ArrowDownUp className="w-6 h-6" />
          異動管理
        </h2>
        <div className="flex border rounded-md">
          <Button variant={view === "table" ? "default" : "ghost"} size="icon" onClick={() => setView("table")}>
            <Table className="w-4 h-4" />
          </Button>
          <Button variant={view === "card" ? "default" : "ghost"} size="icon" onClick={() => setView("card")}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜尋..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="所有類型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有類型</SelectItem>
            <SelectItem value="borrow">借出</SelectItem>
            <SelectItem value="return">歸還</SelectItem>
            <SelectItem value="purchase">購入</SelectItem>
            <SelectItem value="repair">報修</SelectItem>
            <SelectItem value="dispose">報銷</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : view === "table" ? (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">時間</th>
                <th className="text-left p-3 font-medium">類型</th>
                <th className="text-left p-3 font-medium">物品</th>
                <th className="text-right p-3 font-medium">數量</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">條碼</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">備註</th>
                <th className="text-left p-3 font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 text-xs">{format(new Date(t.created_at), "MM/dd HH:mm", { locale: zhTW })}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${typeLabels[t.type]?.color}`}>
                      {typeLabels[t.type]?.label}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{t.item?.name || "-"}</td>
                  <td className="p-3 text-right tabular-nums">{t.quantity}</td>
                  <td className="p-3 hidden md:table-cell font-mono text-xs">{t.scanned_code || "-"}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{t.note || "-"}</td>
                  <td className="p-3"><Badge variant="outline">{statusLabels[t.status]}</Badge></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">尚無異動紀錄</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${typeLabels[t.type]?.color}`}>
                    {typeLabels[t.type]?.label}
                  </span>
                  <Badge variant="outline">{statusLabels[t.status]}</Badge>
                </div>
                <CardTitle className="text-base">{t.item?.name || "未知物品"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">數量</span>
                  <span className="font-bold">{t.quantity}</span>
                </div>
                {t.scanned_code && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">條碼</span>
                    <span className="font-mono text-xs">{t.scanned_code}</span>
                  </div>
                )}
                {t.note && <p className="text-muted-foreground">{t.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(t.created_at), "yyyy/MM/dd HH:mm", { locale: zhTW })}
                </p>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">尚無異動紀錄</div>
          )}
        </div>
      )}
    </div>
  )
}
