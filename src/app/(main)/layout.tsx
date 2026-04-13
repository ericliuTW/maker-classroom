"use client"

import { NavBar } from "@/components/shared/nav-bar"
import { useAuthStore } from "@/stores/auth-store"
import { useEffect } from "react"
import { auth } from "@/lib/firebase-client"
import { onAuthStateChanged } from "firebase/auth"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { setTeacher, setSessionToken } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTeacher(!!user)
      if (user) {
        // Refresh token cookie
        user.getIdToken().then((token) => {
          document.cookie = `firebase_token=${token}; max-age=86400; path=/; samesite=strict`
        })
      }
    })

    // Check student session cookie
    const cookie = document.cookie.split("; ").find((c) => c.startsWith("student_session="))
    if (cookie) setSessionToken(cookie.split("=")[1])

    return () => unsubscribe()
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
