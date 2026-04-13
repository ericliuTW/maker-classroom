import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getAuth, type Auth } from "firebase-admin/auth"

let _app: App | null = null
let _db: Firestore | null = null
let _auth: Auth | null = null

function getAdminApp(): App {
  if (_app) return _app

  if (getApps().length > 0) {
    _app = getApps()[0]
    return _app
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set")
  }

  _app = initializeApp({
    credential: cert(JSON.parse(serviceAccount)),
  })
  return _app
}

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(getAdminApp())
    return (_db as any)[prop]
  },
})

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getAdminApp())
    return (_auth as any)[prop]
  },
})
