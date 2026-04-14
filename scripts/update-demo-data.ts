// Update existing demo data for new features
// Run: npx tsx scripts/update-demo-data.ts
import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(__dirname, "../.env.local") })

const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
})
const db = getFirestore(app)

// Skills mapping for existing knowledge entries
const skillsMap: Record<string, string[]> = {
  "Arduino 自動澆水系統": ["程式設計", "電路設計", "微控制器", "物聯網", "焊接"],
  "超音波智慧垃圾桶": ["程式設計", "電路設計", "微控制器", "3D建模", "數位製造"],
  "LED 音樂節奏燈": ["程式設計", "電路設計", "焊接", "音效處理"],
  "木工手機架": ["手工加工", "量測", "材料加工", "設計思考"],
  "3D 列印客製化筆筒": ["3D建模", "CAD設計", "數位製造"],
  "雷切壓克力 LED 夜燈": ["向量繪圖", "數位製造", "電路設計", "光學", "材料加工"],
  "太陽能自走車": ["能源科技", "機械設計", "電路設計", "材料加工"],
  "ESP32 藍牙遙控車": ["程式設計", "電路設計", "物聯網", "機械設計", "微控制器"],
  "Arduino 溫溼度監測站": ["程式設計", "電路設計", "微控制器", "物聯網"],
  "迷你機械手臂": ["程式設計", "機械設計", "3D建模", "微控制器", "數位製造"],
  "風力發電模型": ["能源科技", "機械設計", "量測", "材料加工"],
  "RFID 智慧門鎖": ["程式設計", "電路設計", "微控制器", "焊接"],
}

const objectivesMap: Record<string, string> = {
  "Arduino 自動澆水系統": "學習使用感測器偵測環境並自動控制裝置，理解物聯網基礎概念",
  "超音波智慧垃圾桶": "學習超音波感測器原理與伺服馬達控制，培養解決生活問題的能力",
  "LED 音樂節奏燈": "學習聲音訊號處理與 LED 控制，結合藝術與科技",
  "木工手機架": "學習基礎木工技術，包含量測、鋸切、鑽孔、砂磨、組裝等工序",
  "3D 列印客製化筆筒": "學習 3D 建模軟體操作與 3D 列印參數設定",
  "雷切壓克力 LED 夜燈": "學習向量繪圖軟體操作與雷射切割機使用",
  "太陽能自走車": "探索太陽能電池原理與機械傳動設計",
  "ESP32 藍牙遙控車": "學習無線通訊技術、馬達驅動控制與手機App開發",
  "Arduino 溫溼度監測站": "學習感測器資料讀取與顯示，理解環境監測應用",
  "迷你機械手臂": "學習機械結構設計與多軸馬達控制",
  "風力發電模型": "探索風能轉換原理與葉片設計對效率的影響",
  "RFID 智慧門鎖": "學習 RFID 技術、SPI 通訊協定與門禁系統邏輯",
}

const processStepsMap: Record<string, any[]> = {
  "Arduino 自動澆水系統": [
    { step: 1, title: "電路設計與接線", description: "將土壤濕度感測器、繼電器模組、小型水泵透過麵包板連接到 Arduino", safety_note: "接線時請先斷電，避免短路" },
    { step: 2, title: "程式撰寫", description: "在 Arduino IDE 中撰寫程式，讀取感測器數值，當濕度低於閾值時啟動水泵" },
    { step: 3, title: "測試與校準", description: "調整濕度閾值，測試自動澆水功能是否正常" },
    { step: 4, title: "外殼製作", description: "使用3D列印或雷切製作防水外殼" },
    { step: 5, title: "組裝完成", description: "將所有元件固定在花盆旁，連接水管進行實測", safety_note: "水泵附近的電路需做好防水處理" },
  ],
  "木工手機架": [
    { step: 1, title: "設計與量測", description: "使用游標卡尺量測手機尺寸，在紙上畫出手機架的設計圖" },
    { step: 2, title: "材料裁切", description: "使用線鋸機或手鋸將松木板裁切成需要的形狀", safety_note: "使用線鋸機時必須配戴護目鏡，手指遠離鋸片" },
    { step: 3, title: "鑽孔", description: "使用鑽床在需要的位置鑽孔（充電線孔、裝飾孔）", safety_note: "使用鑽床時必須固定工件，配戴護目鏡" },
    { step: 4, title: "砂磨", description: "使用砂紙由粗到細（#80→#120→#240）打磨表面至光滑" },
    { step: 5, title: "組裝與上漆", description: "使用白膠組裝各部件，晾乾後可選擇上護木油或漆" },
  ],
}

async function updateDemo() {
  console.log("📝 更新知識庫資料（新增 skills、objectives、process_steps）...\n")

  for (const [title, skills] of Object.entries(skillsMap)) {
    const snapshot = await db.collection("knowledge_base").where("title", "==", title).limit(1).get()
    if (snapshot.empty) {
      console.log(`  ✗ 找不到: ${title}`)
      continue
    }
    const doc = snapshot.docs[0]
    const updates: any = { skills }
    if (objectivesMap[title]) updates.objectives = objectivesMap[title]
    if (processStepsMap[title]) updates.process_steps = processStepsMap[title]

    await doc.ref.update(updates)
    console.log(`  ✓ ${title} — ${skills.length} 技能`)
  }

  // Update classroom versions to use new furniture+items data structure
  console.log("\n🏠 更新教室配置為新資料結構...\n")

  // Get item IDs
  const itemsSnap = await db.collection("items").get()
  const itemMap = new Map<string, string>()
  for (const doc of itemsSnap.docs) {
    const data = doc.data()
    itemMap.set(data.name, doc.id)
  }

  // Find classroom 1 (生活科技教室)
  const cls1Snap = await db.collection("classrooms").where("name", "==", "生活科技教室").limit(1).get()
  if (!cls1Snap.empty) {
    const cls1Id = cls1Snap.docs[0].id

    // Update rows/cols to denser grid
    await cls1Snap.docs[0].ref.update({ rows: 16, cols: 20 })

    // Create new version with furniture+items structure
    const versSnap = await db.collection("classrooms").doc(cls1Id).collection("versions").get()
    // Delete old versions
    for (const doc of versSnap.docs) {
      await doc.ref.delete()
    }

    const now = new Date().toISOString()
    const newCells = [
      // Front wall
      { row: 0, col: 2, type: "furniture", label: "黑板", width: 8, height: 1 },
      { row: 0, col: 11, type: "furniture", label: "投影機", width: 1, height: 1 },
      { row: 0, col: 0, type: "furniture", label: "門", width: 2, height: 1 },
      { row: 0, col: 18, type: "furniture", label: "電箱", width: 1, height: 2 },
      { row: 0, col: 19, type: "furniture", label: "緊急開關", width: 1, height: 1 },
      // Lecture area
      { row: 1, col: 4, type: "furniture", label: "講台", width: 4, height: 2 },
      // Computer desks (row 3)
      { row: 3, col: 0, type: "furniture", label: "電腦桌", width: 3, height: 2, items: [
        { item_id: itemMap.get("筆記型電腦") || "", quantity: 5, label: "筆記型電腦" },
      ]},
      { row: 3, col: 4, type: "furniture", label: "電腦桌", width: 3, height: 2, items: [
        { item_id: itemMap.get("筆記型電腦") || "", quantity: 5, label: "筆記型電腦" },
      ]},
      { row: 3, col: 13, type: "furniture", label: "電腦桌", width: 3, height: 2, items: [
        { item_id: itemMap.get("筆記型電腦") || "", quantity: 5, label: "筆記型電腦" },
      ]},
      // Work tables (rows 6-9)
      { row: 6, col: 0, type: "furniture", label: "工作台 A1", width: 4, height: 2, items: [
        { item_id: itemMap.get("烙鐵 60W") || "", quantity: 4, label: "烙鐵" },
        { item_id: itemMap.get("烙鐵架（含海綿）") || "", quantity: 4, label: "烙鐵架" },
        { item_id: itemMap.get("三用電表") || "", quantity: 4, label: "三用電表" },
      ]},
      { row: 6, col: 5, type: "furniture", label: "工作台 A2", width: 4, height: 2, items: [
        { item_id: itemMap.get("烙鐵 60W") || "", quantity: 4, label: "烙鐵" },
        { item_id: itemMap.get("烙鐵架（含海綿）") || "", quantity: 4, label: "烙鐵架" },
        { item_id: itemMap.get("三用電表") || "", quantity: 4, label: "三用電表" },
      ]},
      { row: 6, col: 10, type: "furniture", label: "工作台 A3", width: 4, height: 2, items: [
        { item_id: itemMap.get("熱熔膠槍") || "", quantity: 4, label: "熱熔膠槍" },
        { item_id: itemMap.get("C 型夾 4\"") || "", quantity: 6, label: "C型夾" },
      ]},
      { row: 9, col: 0, type: "furniture", label: "工作台 B1", width: 4, height: 2, items: [
        { item_id: itemMap.get("Arduino UNO R3") || "", quantity: 8, label: "Arduino UNO" },
        { item_id: itemMap.get("麵包板 830 孔") || "", quantity: 8, label: "麵包板" },
        { item_id: itemMap.get("杜邦線（公對母）40P") || "", quantity: 8, label: "杜邦線" },
      ]},
      { row: 9, col: 5, type: "furniture", label: "工作台 B2", width: 4, height: 2, items: [
        { item_id: itemMap.get("Arduino UNO R3") || "", quantity: 7, label: "Arduino UNO" },
        { item_id: itemMap.get("麵包板 830 孔") || "", quantity: 7, label: "麵包板" },
        { item_id: itemMap.get("杜邦線（公對公）40P") || "", quantity: 7, label: "杜邦線" },
      ]},
      { row: 9, col: 10, type: "furniture", label: "工作台 B3", width: 4, height: 2, items: [
        { item_id: itemMap.get("超音波感測器 HC-SR04") || "", quantity: 10, label: "超音波感測器" },
        { item_id: itemMap.get("DHT11 溫溼度感測器") || "", quantity: 10, label: "DHT11" },
        { item_id: itemMap.get("伺服馬達 SG90") || "", quantity: 10, label: "伺服馬達" },
        { item_id: itemMap.get("LED 5mm 綜合包") || "", quantity: 200, label: "LED" },
      ]},
      // Storage shelves (right side)
      { row: 6, col: 16, type: "furniture", label: "置物架", width: 4, height: 2, items: [
        { item_id: itemMap.get("十字螺絲起子組") || "", quantity: 15, label: "螺絲起子" },
        { item_id: itemMap.get("尖嘴鉗") || "", quantity: 12, label: "尖嘴鉗" },
        { item_id: itemMap.get("斜口鉗") || "", quantity: 12, label: "斜口鉗" },
        { item_id: itemMap.get("剝線鉗") || "", quantity: 10, label: "剝線鉗" },
        { item_id: itemMap.get("美工刀") || "", quantity: 15, label: "美工刀" },
      ]},
      { row: 9, col: 16, type: "furniture", label: "置物架", width: 4, height: 2, items: [
        { item_id: itemMap.get("電阻綜合包 1/4W") || "", quantity: 500, label: "電阻" },
        { item_id: itemMap.get("電容綜合包") || "", quantity: 100, label: "電容" },
        { item_id: itemMap.get("按鈕開關 12mm") || "", quantity: 50, label: "按鈕" },
        { item_id: itemMap.get("蜂鳴器模組") || "", quantity: 15, label: "蜂鳴器" },
        { item_id: itemMap.get("焊錫線 1mm 有鉛") || "", quantity: 10, label: "焊錫" },
      ]},
      // Safety equipment area
      { row: 12, col: 16, type: "furniture", label: "置物架", width: 4, height: 2, items: [
        { item_id: itemMap.get("安全護目鏡") || "", quantity: 35, label: "護目鏡" },
        { item_id: itemMap.get("防割手套") || "", quantity: 20, label: "防割手套" },
        { item_id: itemMap.get("隔熱手套") || "", quantity: 10, label: "隔熱手套" },
        { item_id: itemMap.get("防塵口罩") || "", quantity: 50, label: "防塵口罩" },
        { item_id: itemMap.get("防靜電腕帶") || "", quantity: 15, label: "防靜電腕帶" },
      ]},
      // Measurement instruments
      { row: 3, col: 8, type: "furniture", label: "置物架", width: 3, height: 2, items: [
        { item_id: itemMap.get("游標卡尺 150mm") || "", quantity: 20, label: "游標卡尺" },
        { item_id: itemMap.get("鋼尺 30cm") || "", quantity: 35, label: "鋼尺" },
        { item_id: itemMap.get("數位角度尺") || "", quantity: 10, label: "角度尺" },
      ]},
      // Back wall
      { row: 15, col: 0, type: "furniture", label: "窗戶", width: 5, height: 1 },
      { row: 15, col: 6, type: "furniture", label: "窗戶", width: 5, height: 1 },
      { row: 15, col: 17, type: "furniture", label: "水槽", width: 2, height: 1 },
      { row: 15, col: 19, type: "furniture", label: "垃圾桶", width: 1, height: 1 },
      // Safety
      { row: 14, col: 19, type: "furniture", label: "滅火器", width: 1, height: 1, items: [
        { item_id: itemMap.get("乾粉滅火器 10P") || "", quantity: 1, label: "滅火器" },
      ]},
      { row: 14, col: 18, type: "furniture", label: "急救箱", width: 1, height: 1, items: [
        { item_id: itemMap.get("急救箱") || "", quantity: 1, label: "急救箱" },
      ]},
    ]

    await db.collection("classrooms").doc(cls1Id).collection("versions").add({
      classroom_id: cls1Id,
      name: "114 下學期配置（新版）",
      cells: newCells,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    console.log("  ✓ 生活科技教室 — 新版配置已建立")
  }

  // Update 數位製造室 to denser grid
  const cls2Snap = await db.collection("classrooms").where("name", "==", "數位製造室").limit(1).get()
  if (!cls2Snap.empty) {
    const cls2Id = cls2Snap.docs[0].id
    await cls2Snap.docs[0].ref.update({ rows: 12, cols: 16 })

    const versSnap = await db.collection("classrooms").doc(cls2Id).collection("versions").get()
    for (const doc of versSnap.docs) await doc.ref.delete()

    const now = new Date().toISOString()
    const cls2Cells = [
      { row: 0, col: 0, type: "furniture", label: "3D印表機", width: 3, height: 3, items: [
        { item_id: itemMap.get("Creality Ender-3 V3 3D印表機") || "", quantity: 3, label: "3D印表機" },
        { item_id: itemMap.get("PLA 線材 1.75mm 白色") || "", quantity: 5, label: "PLA白" },
        { item_id: itemMap.get("PLA 線材 1.75mm 黑色") || "", quantity: 4, label: "PLA黑" },
        { item_id: itemMap.get("3D列印平台膠") || "", quantity: 3, label: "平台膠" },
      ]},
      { row: 0, col: 5, type: "furniture", label: "雷切機", width: 4, height: 3, items: [
        { item_id: itemMap.get("雷射切割機 40W CO2") || "", quantity: 1, label: "雷切機" },
      ]},
      { row: 0, col: 13, type: "furniture", label: "電箱", width: 1, height: 2 },
      { row: 0, col: 14, type: "furniture", label: "緊急開關", width: 1, height: 1 },
      { row: 4, col: 0, type: "furniture", label: "CNC雕刻機", width: 4, height: 3, items: [
        { item_id: itemMap.get("CNC 雕刻機（小型）") || "", quantity: 1, label: "CNC" },
      ]},
      { row: 4, col: 10, type: "furniture", label: "鑽床", width: 2, height: 3, items: [
        { item_id: itemMap.get("桌上型鑽床") || "", quantity: 2, label: "鑽床" },
      ]},
      { row: 4, col: 13, type: "furniture", label: "砂輪機", width: 2, height: 2, items: [
        { item_id: itemMap.get("桌上型砂輪機") || "", quantity: 2, label: "砂輪機" },
      ]},
      { row: 8, col: 10, type: "furniture", label: "線鋸機", width: 2, height: 3, items: [
        { item_id: itemMap.get("桌上型線鋸機") || "", quantity: 2, label: "線鋸機" },
      ]},
      { row: 8, col: 13, type: "furniture", label: "砂磨機", width: 2, height: 2, items: [
        { item_id: itemMap.get("桌上型圓盤砂磨機") || "", quantity: 1, label: "砂磨機" },
      ]},
      // Work tables
      { row: 5, col: 5, type: "furniture", label: "工作台", width: 4, height: 3, items: [
        { item_id: itemMap.get("熱風槍") || "", quantity: 3, label: "熱風槍" },
      ]},
      // Material storage
      { row: 8, col: 0, type: "furniture", label: "材料架", width: 4, height: 2, items: [
        { item_id: itemMap.get("松木板 30x20x1cm") || "", quantity: 50, label: "松木板" },
        { item_id: itemMap.get("合板 30x30x0.3cm") || "", quantity: 40, label: "合板" },
        { item_id: itemMap.get("壓克力板 透明 20x30x0.3cm") || "", quantity: 25, label: "壓克力透明" },
        { item_id: itemMap.get("壓克力板 彩色 20x30x0.3cm") || "", quantity: 20, label: "壓克力彩色" },
      ]},
      { row: 10, col: 0, type: "furniture", label: "材料架", width: 4, height: 2, items: [
        { item_id: itemMap.get("瓦楞紙板 A3") || "", quantity: 50, label: "瓦楞紙" },
        { item_id: itemMap.get("珍珠板 A3") || "", quantity: 25, label: "珍珠板" },
      ]},
      // Safety
      { row: 11, col: 14, type: "furniture", label: "滅火器", width: 1, height: 1 },
      { row: 11, col: 15, type: "furniture", label: "急救箱", width: 1, height: 1 },
      { row: 11, col: 7, type: "furniture", label: "門", width: 3, height: 1 },
    ]

    await db.collection("classrooms").doc(cls2Id).collection("versions").add({
      classroom_id: cls2Id,
      name: "標準配置（新版）",
      cells: cls2Cells,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    console.log("  ✓ 數位製造室 — 新版配置已建立")
  }

  console.log("\n✅ 更新完成！")
}

updateDemo().catch(console.error)
