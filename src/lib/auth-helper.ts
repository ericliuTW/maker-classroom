import { NextRequest } from "next/server"
import { adminAuth } from "./firebase-admin"

export async function verifyTeacher(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("firebase_token")?.value
  if (!token) return null

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}
