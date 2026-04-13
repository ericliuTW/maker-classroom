"use client"

import { NavBar } from "@/components/shared/nav-bar"
import { useAuthStore } from "@/stores/auth-store"
import { useEffect } from "react"
import { createClient } from "@/lib/supabase-client"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { setTeacher, setSessionToken } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setTeacher(true)
    })
    // Check student session cookie
    const cookie = document.cookie.split("; ").find(c => c.startsWith("student_session="))
    if (cookie) setSessionToken(cookie.split("=")[1])
  }, [setTeacher, setSessionToken])

  return (
    <div className="flex min-h-screen">
      <NavBar />
      <main className="flex-1 md:ml-56 mt-14 md:mt-0 p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
