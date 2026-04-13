"use client"

import { useState } from "react"
import { auth } from "@/lib/firebase-client"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const token = await cred.user.getIdToken()
      // Store token in cookie for middleware & API auth
      document.cookie = `firebase_token=${token}; max-age=86400; path=/; samesite=strict`
      toast.success("登入成功")
      router.push("/inventory")
    } catch (error: any) {
      const msg = error.code === "auth/invalid-credential"
        ? "帳號或密碼錯誤"
        : error.message
      toast.error("登入失敗：" + msg)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Maker 教室管理系統</CardTitle>
          <CardDescription>教師登入</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu.tw"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登入中..." : "登入"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => router.push("/student")}>
              我是學生 →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
