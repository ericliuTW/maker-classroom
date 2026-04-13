// Run: npx tsx scripts/seed.ts
import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(__dirname, "../.env.local") })

const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
})
const db = getFirestore(app)

async function seed() {
  console.log("Seeding categories...")
  const categories = [
    { name: "電子零件", icon: "cpu", description: "Arduino、感測器、LED、電阻等" },
    { name: "工具", icon: "wrench", description: "螺絲起子、鉗子、烙鐵等" },
    { name: "材料", icon: "box", description: "木板、壓克力、3D列印線材等" },
    { name: "設備", icon: "monitor", description: "3D印表機、雷切機、示波器等" },
    { name: "耗材", icon: "package", description: "膠帶、螺絲、熱縮管等" },
  ]

  for (const cat of categories) {
    const existing = await db.collection("categories").where("name", "==", cat.name).get()
    if (existing.empty) {
      await db.collection("categories").add({ ...cat, created_at: new Date().toISOString() })
      console.log(`  Added: ${cat.name}`)
    } else {
      console.log(`  Exists: ${cat.name}`)
    }
  }

  // Ensure classroom_config exists
  const configSnapshot = await db.collection("classroom_config").limit(1).get()
  if (configSnapshot.empty) {
    await db.collection("classroom_config").add({
      name: "Maker教室",
      width: 1200,
      height: 800,
      background_image: null,
      updated_at: new Date().toISOString(),
    })
    console.log("  Added default classroom config")
  } else {
    console.log("  Classroom config exists")
  }

  console.log("Done!")
}

seed().catch(console.error)
