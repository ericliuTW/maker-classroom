"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/stores/auth-store"
import type { AccessCode, Category } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Settings, Key, Tags, Plus, Copy, Trash2 } from "lucide-react"

export default function SettingsPage() {
  const { isTeacher } = useAuthStore()
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newCodeLabel, setNewCodeLabel] = useState("")
  const [newCodeExpiry, setNewCodeExpiry] = useState("")
  const [newCatName, setNewCatName] = useState("")
  const [generating, setGenerating] = useState(false)

  const fetchCodes = useCallback(async () => {
    const res = await fetch("/api/access-codes")
    const data = await res.json()
    if (Array.isArray(data)) setCodes(data)
  }, [])

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories")
    const data = await res.json()
    if (Array.isArray(data)) setCategories(data)
  }, [])

  useEffect(() => {
    if (isTeacher) {
      fetchCodes()
      fetchCategories()
    }
  }, [isTeacher, fetchCodes, fetchCategories])

  const generateCode = async () => {
    setGenerating(true)
    const res = await fetch("/api/access-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newCodeLabel || null,
        expires_at: newCodeExpiry || null,
      }),
    })
    if (res.ok) {
      toast.success("使用碼已產生")
      setNewCodeLabel("")
      setNewCodeExpiry("")
      fetchCodes()
    } else {
      toast.error("產生失敗")
    }
    setGenerating(false)
  }

  const toggleCode = async (id: string, active: boolean) => {
    await fetch("/api/access-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: active }),
    })
    fetchCodes()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success("已複製到剪貼簿")
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName }),
    })
    if (res.ok) {
      toast.success("分類已新增")
      setNewCatName("")
      fetchCategories()
    }
  }

  if (!isTeacher) {
    return <div className="text-center py-12 text-muted-foreground">此頁面僅限教師存取</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="w-6 h-6" />
        系統設定
      </h2>

      {/* Access Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            使用碼管理
          </CardTitle>
          <CardDescription>產生使用碼讓學生進入系統</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={newCodeLabel}
              onChange={e => setNewCodeLabel(e.target.value)}
              placeholder="標籤（選填，如：七年一班）"
              className="flex-1"
            />
            <Input
              type="datetime-local"
              value={newCodeExpiry}
              onChange={e => setNewCodeExpiry(e.target.value)}
              className="w-full sm:w-[220px]"
            />
            <Button onClick={generateCode} disabled={generating}>
              <Plus className="w-4 h-4 mr-2" />
              產生
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            {codes.map(code => (
              <div key={code.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <code className="text-lg font-mono font-bold tracking-widest">{code.code}</code>
                  <Button variant="ghost" size="icon" onClick={() => copyCode(code.code)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  {code.label && <Badge variant="secondary">{code.label}</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  {code.expires_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(code.expires_at) < new Date() ? "已過期" : `到期：${new Date(code.expires_at).toLocaleDateString()}`}
                    </span>
                  )}
                  <Switch
                    checked={code.is_active}
                    onCheckedChange={(v) => toggleCode(code.id, v)}
                  />
                </div>
              </div>
            ))}
            {codes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">尚無使用碼</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5" />
            物品分類管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="新分類名稱"
              onKeyDown={e => e.key === "Enter" && addCategory()}
            />
            <Button onClick={addCategory}>
              <Plus className="w-4 h-4 mr-2" />
              新增
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Badge key={cat.id} variant="secondary" className="text-sm py-1 px-3">
                {cat.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
