"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth-store"
import {
  Package, MapPin, ArrowLeftRight, ScanLine,
  Bot, BookOpen, CalendarClock, Settings, LogOut, Menu, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const teacherNav = [
  { href: "/inventory", label: "庫存管理", icon: Package },
  { href: "/classroom", label: "教室配置", icon: MapPin },
  { href: "/transactions", label: "異動管理", icon: ArrowLeftRight },
  { href: "/scanner", label: "掃碼", icon: ScanLine },
  { href: "/ai-designer", label: "AI 專案", icon: Bot },
  { href: "/knowledge", label: "知識庫", icon: BookOpen },
  { href: "/bookings", label: "預約排程", icon: CalendarClock },
  { href: "/settings", label: "設定", icon: Settings },
]

const studentNav = [
  { href: "/inventory", label: "庫存查看", icon: Package },
  { href: "/classroom", label: "教室配置", icon: MapPin },
  { href: "/scanner", label: "掃碼借還", icon: ScanLine },
  { href: "/ai-designer", label: "AI 專案", icon: Bot },
  { href: "/knowledge", label: "知識庫", icon: BookOpen },
  { href: "/bookings", label: "預約排程", icon: CalendarClock },
]

export function NavBar() {
  const pathname = usePathname()
  const { isTeacher, reset } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = isTeacher ? teacherNav : studentNav

  const handleLogout = async () => {
    if (isTeacher) {
      const { createClient } = await import("@/lib/supabase-client")
      await createClient().auth.signOut()
    }
    document.cookie = "student_session=; max-age=0; path=/"
    reset()
    window.location.href = "/"
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r bg-card min-h-screen fixed left-0 top-0 z-30">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg">Maker 教室</h1>
          <p className="text-xs text-muted-foreground">
            {isTeacher ? "教師模式" : "學生模式"}
          </p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            登出
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold">Maker 教室</h1>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <nav className="absolute top-14 left-0 right-0 bg-card border-b p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              登出
            </Button>
          </nav>
        </div>
      )}
    </>
  )
}
