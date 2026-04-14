import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Public paths - always allow
  const publicPaths = ["/login", "/student", "/api/"]
  if (publicPaths.some((p) => path.startsWith(p))) {
    return NextResponse.next()
  }

  // Check for teacher token or student session
  const teacherToken = request.cookies.get("firebase_token")
  const studentSession = request.cookies.get("student_session")

  // Student-accessible paths
  const studentPaths = ["/inventory", "/ai-designer", "/knowledge", "/bookings", "/classroom", "/scanner", "/project-planner"]
  if (studentPaths.some((p) => path.startsWith(p))) {
    if (!teacherToken && !studentSession) {
      return NextResponse.redirect(new URL("/student", request.url))
    }
    return NextResponse.next()
  }

  // Teacher-only paths
  const teacherPaths = ["/settings", "/transactions"]
  if (teacherPaths.some((p) => path.startsWith(p)) && !teacherToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Root redirect
  if (path === "/") {
    if (teacherToken) {
      return NextResponse.redirect(new URL("/inventory", request.url))
    }
    return NextResponse.redirect(new URL("/student", request.url))
  }

  return NextResponse.next()
}
