"use client"

import { useState, useEffect } from "react"
import type { Item, Category } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: Item | null
  categories: Category[]
  onSave: (data: Partial<Item>) => Promise<void>
}

export function ItemDialog({ open, onOpenChange, item, categories, onSave }: Props) {
  const [form, setForm] = useState({
    name: "", category_id: "", barcode: "", qr_code: "",
    quantity: 0, unit: "個", description: "", min_quantity: 0,
    status: "available" as string,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        category_id: item.category_id || "",
        barcode: item.barcode || "",
        qr_code: item.qr_code || "",
        quantity: item.quantity,
        unit: item.unit,
        description: item.description || "",
        min_quantity: item.min_quantity,
        status: item.status,
      })
    } else {
      setForm({
        name: "", category_id: "", barcode: "", qr_code: "",
        quantity: 0, unit: "個", description: "", min_quantity: 0,
        status: "available",
      })
    }
  }, [item, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...(item ? { id: item.id } : {}),
      ...form,
      category_id: form.category_id || null,
      barcode: form.barcode || null,
      qr_code: form.qr_code || null,
      description: form.description || null,
    } as Partial<Item>)
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "編輯物品" : "新增物品"}</DialogTitle>
          <DialogDescription>
            {item ? "修改物品資訊" : "加入新的材料或設備"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>名稱 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>分類</Label>
              <Select
                value={form.category_id}
                onValueChange={v => v && setForm(f => ({ ...f, category_id: v }))}
                items={categories.map(c => ({ value: c.id, label: c.name }))}
              >
                <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>狀態</Label>
              <Select
                value={form.status}
                onValueChange={v => v && setForm(f => ({ ...f, status: v }))}
                items={[
                  { value: "available", label: "正常" },
                  { value: "low_stock", label: "低庫存" },
                  { value: "out_of_stock", label: "缺貨" },
                  { value: "discontinued", label: "停用" },
                ]}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available" label="正常">正常</SelectItem>
                  <SelectItem value="low_stock" label="低庫存">低庫存</SelectItem>
                  <SelectItem value="out_of_stock" label="缺貨">缺貨</SelectItem>
                  <SelectItem value="discontinued" label="停用">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>數量</Label>
              <Input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>單位</Label>
              <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>最低庫存警示</Label>
              <Input type="number" min={0} value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>條碼 (Code128)</Label>
              <Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="掃碼或手動輸入" />
            </div>
            <div className="space-y-2">
              <Label>QR Code</Label>
              <Input value={form.qr_code} onChange={e => setForm(f => ({ ...f, qr_code: e.target.value }))} placeholder="掃碼或手動輸入" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>說明</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "儲存中..." : "儲存"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
