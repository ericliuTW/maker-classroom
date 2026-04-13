"use client"

import { useState, useCallback } from "react"
import { BarcodeScanner } from "@/components/scanner/barcode-scanner"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ScanLine, Keyboard, Package } from "lucide-react"
import type { Item, TransactionType } from "@/types/database"

export default function ScannerPage() {
  const { sessionToken } = useAuthStore()
  const [mode, setMode] = useState<"camera" | "manual">("camera")
  const [scannedCode, setScannedCode] = useState("")
  const [foundItem, setFoundItem] = useState<Item | null>(null)
  const [action, setAction] = useState<TransactionType>("borrow")
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const [processing, setProcessing] = useState(false)

  const lookupItem = useCallback(async (code: string) => {
    setScannedCode(code)
    const res = await fetch(`/api/items?search=${encodeURIComponent(code)}`)
    const items = await res.json()
    if (Array.isArray(items) && items.length > 0) {
      setFoundItem(items[0])
      toast.success(`找到物品：${items[0].name}`)
    } else {
      setFoundItem(null)
      toast.error("找不到對應的物品")
    }
  }, [])

  const handleSubmit = async () => {
    if (!foundItem) return
    setProcessing(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: foundItem.id,
          type: action,
          quantity,
          note: note || null,
          scanned_code: scannedCode,
          session_token: sessionToken,
        }),
      })
      if (res.ok) {
        toast.success(`${actionLabels[action]}成功！`)
        setFoundItem(null)
        setScannedCode("")
        setNote("")
        setQuantity(1)
      } else {
        const err = await res.json()
        toast.error("操作失敗：" + err.error)
      }
    } catch {
      toast.error("操作失敗")
    }
    setProcessing(false)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <ScanLine className="w-6 h-6" />
        掃碼作業
      </h2>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "camera" ? "default" : "outline"}
          onClick={() => setMode("camera")}
          className="flex-1"
        >
          <ScanLine className="w-4 h-4 mr-2" />
          相機掃碼
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          onClick={() => setMode("manual")}
          className="flex-1"
        >
          <Keyboard className="w-4 h-4 mr-2" />
          手動輸入
        </Button>
      </div>

      {/* Scanner / Manual input */}
      {mode === "camera" ? (
        <Card>
          <CardContent className="pt-6">
            <BarcodeScanner onScan={lookupItem} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Label>輸入條碼或 QR Code</Label>
            <div className="flex gap-2">
              <Input
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                placeholder="條碼編號..."
                className="font-mono"
              />
              <Button onClick={() => lookupItem(scannedCode)} disabled={!scannedCode}>
                查詢
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Found item & action */}
      {foundItem && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>{foundItem.name}</CardTitle>
                <CardDescription>
                  庫存：{foundItem.quantity} {foundItem.unit}
                  {foundItem.category && ` | ${foundItem.category.name}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>操作類型</Label>
                <Select value={action} onValueChange={(v) => v && setAction(v as TransactionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrow">借出</SelectItem>
                    <SelectItem value="return">歸還</SelectItem>
                    <SelectItem value="purchase">購入</SelectItem>
                    <SelectItem value="repair">報修</SelectItem>
                    <SelectItem value="dispose">報銷</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>數量</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={processing}>
              {processing ? "處理中..." : `確認${actionLabels[action]}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const actionLabels: Record<string, string> = {
  borrow: "借出",
  return: "歸還",
  purchase: "購入",
  repair: "報修",
  dispose: "報銷",
}
