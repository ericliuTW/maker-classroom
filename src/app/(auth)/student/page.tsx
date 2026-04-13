"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function StudentEntryPage() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/access-codes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (data.valid) {
        // Set session cookie (24hr)
        document.cookie = `student_session=${data.token}; max-age=86400; path=/; samesite=strict`
        toast.success("驗證成功，歡迎使用！")
        router.push("/inventory")
      } else {
        toast.error(data.message || "使用碼無效或已過期")
      }
    } catch {
      toast.error("驗證失敗，請重試")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Maker 教室</CardTitle>
          <CardDescription>請輸入老師提供的使用碼</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="輸入使用碼"
              className="text-center text-2xl tracking-widest"
              maxLength={8}
              required
            />
            <Button type="submit" className="w-full" disabled={loading || code.length < 4}>
              {loading ? "驗證中..." : "進入系統"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => router.push("/login")}>
              教師登入 →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
