// Demo seed: 完整國高中生活科技教室示範資料
// Run: npx tsx scripts/seed-demo.ts
import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(__dirname, "../.env.local") })

const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
})
const db = getFirestore(app)

const now = new Date().toISOString()

// ============================================================
// Categories（7 大分類）
// ============================================================
const categories = [
  { name: "電子零件", icon: "cpu", description: "Arduino、感測器、LED、電阻、電容、麵包板等" },
  { name: "手工具", icon: "wrench", description: "螺絲起子、鉗子、鑿子、鋸子、銼刀等" },
  { name: "材料", icon: "box", description: "木板、壓克力板、PLA線材、鋁板、銅線等" },
  { name: "大型設備", icon: "monitor", description: "3D印表機、雷射切割機、鑽床、砂輪機等" },
  { name: "耗材", icon: "package", description: "焊錫、熱縮管、螺絲螺帽、束線帶、砂紙等" },
  { name: "安全防護", icon: "shield", description: "護目鏡、防割手套、滅火器、急救箱等" },
  { name: "量測儀器", icon: "ruler", description: "三用電表、示波器、游標卡尺、雷射測距儀等" },
]

// ============================================================
// Items（約 75 項，比照真實教室）
// ============================================================
const items = [
  // === 電子零件 ===
  { name: "Arduino UNO R3", category: "電子零件", quantity: 30, unit: "塊", barcode: "4710001000001", description: "最常用的 Arduino 開發板，ATmega328P 晶片", min_quantity: 10 },
  { name: "Arduino Nano", category: "電子零件", quantity: 20, unit: "塊", barcode: "4710001000002", description: "迷你版 Arduino 開發板，適合小型專案", min_quantity: 5 },
  { name: "ESP32 開發板", category: "電子零件", quantity: 15, unit: "塊", barcode: "4710001000003", description: "內建 WiFi + 藍牙的微控制器，適合 IoT 專案", min_quantity: 5 },
  { name: "Raspberry Pi 4B", category: "電子零件", quantity: 10, unit: "塊", barcode: "4710001000004", description: "單板電腦，4GB RAM，可執行 Python、Linux", min_quantity: 3 },
  { name: "麵包板 830 孔", category: "電子零件", quantity: 40, unit: "塊", barcode: "4710001000005", description: "全尺寸免焊麵包板，830 個插孔", min_quantity: 15 },
  { name: "杜邦線（公對公）40P", category: "電子零件", quantity: 30, unit: "排", barcode: "4710001000006", description: "40 條一排，公對公跳線 20cm", min_quantity: 10 },
  { name: "杜邦線（公對母）40P", category: "電子零件", quantity: 30, unit: "排", barcode: "4710001000007", description: "40 條一排，公對母跳線 20cm", min_quantity: 10 },
  { name: "LED 5mm 綜合包", category: "電子零件", quantity: 500, unit: "顆", barcode: "4710001000008", description: "紅綠黃藍白各 100 顆", min_quantity: 100 },
  { name: "RGB LED 共陰", category: "電子零件", quantity: 50, unit: "顆", barcode: "4710001000009", description: "全彩 RGB LED，共陰極", min_quantity: 15 },
  { name: "電阻綜合包 1/4W", category: "電子零件", quantity: 1000, unit: "顆", barcode: "4710001000010", description: "常用阻值 10Ω~1MΩ 各 50 顆", min_quantity: 200 },
  { name: "電容綜合包", category: "電子零件", quantity: 200, unit: "顆", barcode: "4710001000011", description: "陶瓷電容 + 電解電容綜合", min_quantity: 50 },
  { name: "超音波感測器 HC-SR04", category: "電子零件", quantity: 25, unit: "個", barcode: "4710001000012", description: "測距範圍 2cm-400cm", min_quantity: 8 },
  { name: "DHT11 溫溼度感測器", category: "電子零件", quantity: 25, unit: "個", barcode: "4710001000013", description: "數位溫溼度感測器模組", min_quantity: 8 },
  { name: "光敏電阻模組", category: "電子零件", quantity: 25, unit: "個", barcode: "4710001000014", description: "光線感測模組，輸出數位/類比訊號", min_quantity: 8 },
  { name: "紅外線避障模組", category: "電子零件", quantity: 20, unit: "個", barcode: "4710001000015", description: "反射式紅外線感測器，可調靈敏度", min_quantity: 5 },
  { name: "伺服馬達 SG90", category: "電子零件", quantity: 30, unit: "個", barcode: "4710001000016", description: "微型伺服馬達，旋轉角度 0-180°", min_quantity: 10 },
  { name: "直流馬達 + L298N 驅動板", category: "電子零件", quantity: 15, unit: "組", barcode: "4710001000017", description: "雙 H 橋馬達驅動模組 + TT 馬達", min_quantity: 5 },
  { name: "OLED 顯示模組 0.96\"", category: "電子零件", quantity: 15, unit: "個", barcode: "4710001000018", description: "I2C 介面 128x64 OLED 顯示螢幕", min_quantity: 5 },
  { name: "蜂鳴器模組", category: "電子零件", quantity: 30, unit: "個", barcode: "4710001000019", description: "主動式蜂鳴器模組 5V", min_quantity: 10 },
  { name: "按鈕開關 12mm", category: "電子零件", quantity: 100, unit: "個", barcode: "4710001000020", description: "微型瞬時按鈕開關", min_quantity: 30 },
  { name: "9V 電池扣", category: "電子零件", quantity: 40, unit: "個", barcode: "4710001000021", description: "9V 方形電池用電池扣接頭", min_quantity: 15 },
  { name: "USB 傳輸線 Type-B", category: "電子零件", quantity: 30, unit: "條", barcode: "4710001000022", description: "Arduino UNO 專用傳輸線", min_quantity: 10 },

  // === 手工具 ===
  { name: "十字螺絲起子組", category: "手工具", quantity: 30, unit: "支", barcode: "4710002000001", description: "PH1/PH2 雙規格螺絲起子", min_quantity: 10 },
  { name: "一字螺絲起子組", category: "手工具", quantity: 20, unit: "支", barcode: "4710002000002", description: "3mm/5mm 雙規格一字螺絲起子", min_quantity: 8 },
  { name: "尖嘴鉗", category: "手工具", quantity: 25, unit: "支", barcode: "4710002000003", description: "6\" 精密尖嘴鉗，適合電子作業", min_quantity: 8 },
  { name: "斜口鉗", category: "手工具", quantity: 25, unit: "支", barcode: "4710002000004", description: "5\" 迷你斜口鉗，剪線用", min_quantity: 8 },
  { name: "剝線鉗", category: "手工具", quantity: 20, unit: "支", barcode: "4710002000005", description: "自動剝線鉗 AWG 10-24", min_quantity: 5 },
  { name: "美工刀", category: "手工具", quantity: 30, unit: "支", barcode: "4710002000006", description: "18mm 大型美工刀附安全鎖", min_quantity: 10 },
  { name: "鋼尺 30cm", category: "手工具", quantity: 35, unit: "支", barcode: "4710002000007", description: "不鏽鋼直尺 30cm 雙面刻度", min_quantity: 10 },
  { name: "熱熔膠槍", category: "手工具", quantity: 20, unit: "支", barcode: "4710002000008", description: "60W 熱熔膠槍，使用 11mm 膠條", min_quantity: 5 },
  { name: "手持線鋸", category: "手工具", quantity: 15, unit: "支", barcode: "4710002000009", description: "弓型手鋸，適合薄木板與壓克力", min_quantity: 5 },
  { name: "木工鑿刀組", category: "手工具", quantity: 10, unit: "組", barcode: "4710002000010", description: "6/12/18/24mm 四支裝", min_quantity: 3 },
  { name: "C 型夾 4\"", category: "手工具", quantity: 30, unit: "個", barcode: "4710002000011", description: "4 吋 C 型夾具，固定工件用", min_quantity: 10 },
  { name: "烙鐵 60W", category: "手工具", quantity: 25, unit: "支", barcode: "4710002000012", description: "60W 恆溫烙鐵，可調溫 200-450°C", min_quantity: 8 },
  { name: "烙鐵架（含海綿）", category: "手工具", quantity: 25, unit: "個", barcode: "4710002000013", description: "金屬烙鐵座附清潔海綿", min_quantity: 8 },
  { name: "木工鉋刀", category: "手工具", quantity: 10, unit: "支", barcode: "4710002000014", description: "小型手工鉋刀，刀寬 42mm", min_quantity: 3 },

  // === 材料 ===
  { name: "松木板 30x20x1cm", category: "材料", quantity: 100, unit: "片", barcode: "4710003000001", description: "已裁切松木板，適合基礎木工", min_quantity: 30 },
  { name: "合板 30x30x0.3cm", category: "材料", quantity: 80, unit: "片", barcode: "4710003000002", description: "薄合板，適合雷切作業", min_quantity: 20 },
  { name: "壓克力板 透明 20x30x0.3cm", category: "材料", quantity: 50, unit: "片", barcode: "4710003000003", description: "透明壓克力板，適合雷切", min_quantity: 15 },
  { name: "壓克力板 彩色 20x30x0.3cm", category: "材料", quantity: 40, unit: "片", barcode: "4710003000004", description: "紅藍綠黃各 10 片，適合雷切裝飾", min_quantity: 10 },
  { name: "PLA 線材 1.75mm 白色", category: "材料", quantity: 10, unit: "捲", barcode: "4710003000005", description: "1kg/捲，3D 列印用 PLA 線材", min_quantity: 3 },
  { name: "PLA 線材 1.75mm 黑色", category: "材料", quantity: 8, unit: "捲", barcode: "4710003000006", description: "1kg/捲，3D 列印用 PLA 線材", min_quantity: 3 },
  { name: "PLA 線材 1.75mm 彩色", category: "材料", quantity: 6, unit: "捲", barcode: "4710003000007", description: "紅藍綠各 2 捲，1kg/捲", min_quantity: 2 },
  { name: "銅線 0.5mm", category: "材料", quantity: 10, unit: "捲", barcode: "4710003000008", description: "漆包銅線 100g/捲", min_quantity: 3 },
  { name: "單芯線綜合包", category: "材料", quantity: 15, unit: "包", barcode: "4710003000009", description: "紅黑黃綠藍各 5m，22AWG", min_quantity: 5 },
  { name: "瓦楞紙板 A3", category: "材料", quantity: 100, unit: "片", barcode: "4710003000010", description: "厚度 3mm 瓦楞紙板", min_quantity: 30 },
  { name: "珍珠板 A3", category: "材料", quantity: 50, unit: "片", barcode: "4710003000011", description: "厚度 5mm 珍珠板（保麗龍板）", min_quantity: 15 },

  // === 大型設備 ===
  { name: "Creality Ender-3 V3 3D印表機", category: "大型設備", quantity: 3, unit: "台", barcode: "4710004000001", description: "FDM 3D列印機，列印尺寸 220x220x250mm", min_quantity: 1 },
  { name: "雷射切割機 40W CO2", category: "大型設備", quantity: 1, unit: "台", barcode: "4710004000002", description: "桌上型雷射切割/雕刻機，工作範圍 300x200mm", min_quantity: 1 },
  { name: "桌上型鑽床", category: "大型設備", quantity: 2, unit: "台", barcode: "4710004000003", description: "5 段變速桌上鑽床，最大鑽徑 13mm", min_quantity: 1 },
  { name: "桌上型砂輪機", category: "大型設備", quantity: 2, unit: "台", barcode: "4710004000004", description: "6\" 雙砂輪研磨機，粗磨 + 細磨", min_quantity: 1 },
  { name: "桌上型線鋸機", category: "大型設備", quantity: 2, unit: "台", barcode: "4710004000005", description: "16\" 可調速線鋸機，適合曲線裁切", min_quantity: 1 },
  { name: "熱風槍", category: "大型設備", quantity: 5, unit: "支", barcode: "4710004000006", description: "數位調溫熱風槍 100-600°C", min_quantity: 2 },
  { name: "桌上型圓盤砂磨機", category: "大型設備", quantity: 1, unit: "台", barcode: "4710004000007", description: "12\" 圓盤砂磨機，木工表面處理", min_quantity: 1 },
  { name: "CNC 雕刻機（小型）", category: "大型設備", quantity: 1, unit: "台", barcode: "4710004000008", description: "桌上型 3 軸 CNC，工作範圍 300x180mm", min_quantity: 1 },
  { name: "筆記型電腦", category: "大型設備", quantity: 15, unit: "台", barcode: "4710004000009", description: "教學用筆電，安裝 Arduino IDE、Fusion 360", min_quantity: 5 },
  { name: "投影機", category: "大型設備", quantity: 1, unit: "台", barcode: "4710004000010", description: "教室用短焦投影機 3500 流明", min_quantity: 1 },

  // === 耗材 ===
  { name: "焊錫線 1mm 有鉛", category: "耗材", quantity: 20, unit: "捲", barcode: "4710005000001", description: "63/37 有鉛焊錫線 100g/捲", min_quantity: 5 },
  { name: "焊錫線 1mm 無鉛", category: "耗材", quantity: 10, unit: "捲", barcode: "4710005000002", description: "SAC305 無鉛焊錫 100g/捲", min_quantity: 3 },
  { name: "助焊劑", category: "耗材", quantity: 10, unit: "罐", barcode: "4710005000003", description: "松香膏助焊劑 50g/罐", min_quantity: 3 },
  { name: "熱熔膠條 11mm", category: "耗材", quantity: 200, unit: "支", barcode: "4710005000004", description: "透明熱熔膠條 11x200mm", min_quantity: 50 },
  { name: "熱縮管綜合包", category: "耗材", quantity: 15, unit: "包", barcode: "4710005000005", description: "多規格多色熱縮管組合包", min_quantity: 5 },
  { name: "螺絲螺帽組 M3", category: "耗材", quantity: 500, unit: "組", barcode: "4710005000006", description: "M3x8/12/16mm 螺絲 + 螺帽綜合", min_quantity: 100 },
  { name: "束線帶 15cm", category: "耗材", quantity: 500, unit: "條", barcode: "4710005000007", description: "尼龍束線帶 3.6x150mm 白色", min_quantity: 100 },
  { name: "砂紙綜合包", category: "耗材", quantity: 100, unit: "張", barcode: "4710005000008", description: "#80/#120/#240/#400 各 25 張", min_quantity: 20 },
  { name: "AB 膠", category: "耗材", quantity: 20, unit: "組", barcode: "4710005000009", description: "快乾型 AB 環氧樹脂膠 30ml", min_quantity: 5 },
  { name: "白膠 500ml", category: "耗材", quantity: 10, unit: "瓶", barcode: "4710005000010", description: "木工用白膠", min_quantity: 3 },
  { name: "洞洞板 7x9cm", category: "耗材", quantity: 40, unit: "片", barcode: "4710005000011", description: "單面萬用洞洞板，焊接用", min_quantity: 15 },
  { name: "3D列印平台膠", category: "耗材", quantity: 5, unit: "罐", barcode: "4710005000012", description: "3D 列印附著力膠水", min_quantity: 2 },

  // === 安全防護 ===
  { name: "安全護目鏡", category: "安全防護", quantity: 35, unit: "副", barcode: "4710006000001", description: "防飛濺護目鏡，可搭配近視眼鏡", min_quantity: 15 },
  { name: "防割手套", category: "安全防護", quantity: 20, unit: "雙", barcode: "4710006000002", description: "5 級防切割手套，操作刀具時使用", min_quantity: 8 },
  { name: "隔熱手套", category: "安全防護", quantity: 10, unit: "雙", barcode: "4710006000003", description: "耐熱手套，操作烙鐵/熱風槍時使用", min_quantity: 3 },
  { name: "乾粉滅火器 10P", category: "安全防護", quantity: 2, unit: "支", barcode: "4710006000004", description: "ABC 乾粉滅火器 10 磅", min_quantity: 2 },
  { name: "急救箱", category: "安全防護", quantity: 1, unit: "組", barcode: "4710006000005", description: "含 OK 繃、碘酒、紗布、剪刀等急救用品", min_quantity: 1 },
  { name: "防塵口罩", category: "安全防護", quantity: 100, unit: "個", barcode: "4710006000006", description: "N95 等級防塵口罩，砂磨/雷切時使用", min_quantity: 30 },
  { name: "防靜電腕帶", category: "安全防護", quantity: 15, unit: "條", barcode: "4710006000007", description: "有線防靜電手環，操作電子零件時使用", min_quantity: 5 },

  // === 量測儀器 ===
  { name: "三用電表", category: "量測儀器", quantity: 20, unit: "台", barcode: "4710007000001", description: "數位三用電表，測量電壓/電流/電阻", min_quantity: 8 },
  { name: "示波器 100MHz", category: "量測儀器", quantity: 3, unit: "台", barcode: "4710007000002", description: "雙通道數位示波器 100MHz", min_quantity: 1 },
  { name: "游標卡尺 150mm", category: "量測儀器", quantity: 20, unit: "支", barcode: "4710007000003", description: "電子式游標卡尺 0-150mm", min_quantity: 8 },
  { name: "雷射測距儀", category: "量測儀器", quantity: 3, unit: "台", barcode: "4710007000004", description: "手持式雷射測距儀 0.05-40m", min_quantity: 1 },
  { name: "數位角度尺", category: "量測儀器", quantity: 10, unit: "支", barcode: "4710007000005", description: "電子量角器 0-360°", min_quantity: 3 },
  { name: "紅外線測溫槍", category: "量測儀器", quantity: 5, unit: "支", barcode: "4710007000006", description: "非接觸式紅外線溫度計 -50~550°C", min_quantity: 2 },
]

// ============================================================
// Knowledge Base（12 個專案教學資源）
// ============================================================
const knowledgeEntries = [
  {
    title: "Arduino 自動澆水系統",
    url: "https://blog.cavedu.com/arduino-auto-watering/",
    source: "CAVEDU 教育團隊",
    description: "使用 Arduino + 土壤濕度感測器 + 小型水泵，製作一組能依據土壤乾濕自動澆水的智慧盆栽系統。適合初學者了解感測器與繼電器控制的基礎應用。",
    tags: ["Arduino", "感測器", "自動化", "IoT", "農業科技"],
    required_materials: ["Arduino UNO R3", "杜邦線（公對母）40P", "麵包板 830 孔"],
    required_equipment: ["筆記型電腦", "烙鐵 60W"],
    difficulty: "beginner" as const,
  },
  {
    title: "超音波智慧垃圾桶",
    url: "https://www.instructables.com/Smart-Dustbin/",
    source: "Instructables",
    description: "利用 HC-SR04 超音波感測器偵測手部靠近，驅動伺服馬達自動開關垃圾桶蓋。結合 3D 列印外殼，打造實用的生活小物。",
    tags: ["Arduino", "超音波", "伺服馬達", "3D列印", "生活應用"],
    required_materials: ["Arduino UNO R3", "超音波感測器 HC-SR04", "伺服馬達 SG90", "杜邦線（公對母）40P"],
    required_equipment: ["Creality Ender-3 V3 3D印表機", "筆記型電腦"],
    difficulty: "beginner" as const,
  },
  {
    title: "LED 音樂節奏燈",
    url: "https://maker.pro/arduino/projects/led-music-visualizer",
    source: "Maker Pro",
    description: "將麥克風聲音模組的類比訊號輸入 Arduino，經過 FFT 頻譜分析後驅動 WS2812B LED 燈條，產生隨音樂跳動的炫彩燈光效果。",
    tags: ["Arduino", "LED", "聲音", "FFT", "視覺化"],
    required_materials: ["Arduino UNO R3", "LED 5mm 綜合包", "電阻綜合包 1/4W", "麵包板 830 孔"],
    required_equipment: ["筆記型電腦", "烙鐵 60W"],
    difficulty: "intermediate" as const,
  },
  {
    title: "木工手機架",
    url: "https://www.woodmagazine.com/phone-stand/",
    source: "木工雜誌",
    description: "使用松木板經過量測、鋸切、鑽孔、砂磨、上漆等工序，製作一個美觀實用的手機支架。學習基礎木工技術與工具安全操作。",
    tags: ["木工", "手作", "設計", "實用"],
    required_materials: ["松木板 30x20x1cm", "砂紙綜合包", "白膠 500ml"],
    required_equipment: ["桌上型鑽床", "桌上型線鋸機", "桌上型圓盤砂磨機"],
    difficulty: "beginner" as const,
  },
  {
    title: "3D 列印客製化筆筒",
    url: "https://www.thingiverse.com/thing:pencil-holder/",
    source: "Thingiverse",
    description: "使用 Tinkercad 或 Fusion 360 設計個人化筆筒造型，透過 3D 列印機製作實體。學習 3D 建模軟體操作與列印參數設定。",
    tags: ["3D列印", "CAD", "設計", "Tinkercad"],
    required_materials: ["PLA 線材 1.75mm 白色", "3D列印平台膠"],
    required_equipment: ["Creality Ender-3 V3 3D印表機", "筆記型電腦"],
    difficulty: "beginner" as const,
  },
  {
    title: "雷切壓克力 LED 夜燈",
    url: "https://www.hackster.io/acrylic-led-lamp/",
    source: "Hackster.io",
    description: "使用雷射切割機在壓克力板上雕刻圖案，搭配 LED 底座形成光導效果，製作精美的夜燈。結合向量繪圖軟體與雷切機操作。",
    tags: ["雷射切割", "壓克力", "LED", "設計", "光學"],
    required_materials: ["壓克力板 透明 20x30x0.3cm", "LED 5mm 綜合包", "電阻綜合包 1/4W"],
    required_equipment: ["雷射切割機 40W CO2", "筆記型電腦"],
    difficulty: "intermediate" as const,
  },
  {
    title: "太陽能自走車",
    url: "https://sciencebuddies.org/solar-car/",
    source: "Science Buddies",
    description: "設計製作一台以太陽能板驅動直流馬達的小型車輛。探索太陽能電池原理、傳動機構設計，以及車輛動力學的基礎概念。",
    tags: ["太陽能", "機械", "馬達", "能源", "物理"],
    required_materials: ["瓦楞紙板 A3", "單芯線綜合包"],
    required_equipment: ["熱熔膠槍", "美工刀"],
    difficulty: "intermediate" as const,
  },
  {
    title: "ESP32 藍牙遙控車",
    url: "https://randomnerdtutorials.com/esp32-bluetooth-car/",
    source: "Random Nerd Tutorials",
    description: "使用 ESP32 開發板的藍牙功能，搭配手機 App 遙控四輪驅動車。學習無線通訊、馬達驅動與 App 操作介面設計。",
    tags: ["ESP32", "藍牙", "馬達", "遙控", "App"],
    required_materials: ["ESP32 開發板", "直流馬達 + L298N 驅動板", "9V 電池扣"],
    required_equipment: ["筆記型電腦", "烙鐵 60W"],
    difficulty: "advanced" as const,
  },
  {
    title: "Arduino 溫溼度監測站",
    url: "https://create.arduino.cc/projecthub/temperature-monitor/",
    source: "Arduino Project Hub",
    description: "使用 DHT11 感測器搭配 OLED 顯示模組，即時顯示環境溫度與濕度。進階版可加入 WiFi 模組上傳數據至雲端圖表。",
    tags: ["Arduino", "感測器", "OLED", "IoT", "環境監測"],
    required_materials: ["Arduino UNO R3", "DHT11 溫溼度感測器", "OLED 顯示模組 0.96\"", "麵包板 830 孔", "杜邦線（公對公）40P"],
    required_equipment: ["筆記型電腦"],
    difficulty: "beginner" as const,
  },
  {
    title: "迷你機械手臂",
    url: "https://howtomechatronics.com/robotic-arm/",
    source: "How To Mechatronics",
    description: "結合 4 顆伺服馬達與 3D 列印結構件，製作可用搖桿或程式控制的四軸機械手臂。深入學習馬達控制與運動學概念。",
    tags: ["機械手臂", "伺服馬達", "3D列印", "機器人", "Arduino"],
    required_materials: ["Arduino UNO R3", "伺服馬達 SG90", "PLA 線材 1.75mm 白色"],
    required_equipment: ["Creality Ender-3 V3 3D印表機", "筆記型電腦"],
    difficulty: "advanced" as const,
  },
  {
    title: "風力發電模型",
    url: "https://www.teachengineering.org/wind-turbine/",
    source: "Teach Engineering",
    description: "設計並製作小型風力發電機，用扇葉旋轉帶動直流馬達發電，點亮 LED。探索風能轉換效率與葉片角度的關係。",
    tags: ["風力", "發電", "能源", "物理", "環保"],
    required_materials: ["瓦楞紙板 A3", "LED 5mm 綜合包", "單芯線綜合包", "銅線 0.5mm"],
    required_equipment: ["熱熔膠槍", "美工刀", "三用電表"],
    difficulty: "intermediate" as const,
  },
  {
    title: "RFID 智慧門鎖",
    url: "https://lastminuteengineers.com/rfid-door-lock/",
    source: "Last Minute Engineers",
    description: "使用 RFID-RC522 讀卡模組搭配電磁鎖，製作刷卡才能開啟的智慧門鎖。學習 SPI 通訊、RFID 原理與門禁系統邏輯。",
    tags: ["RFID", "Arduino", "安全", "門禁", "SPI"],
    required_materials: ["Arduino UNO R3", "伺服馬達 SG90", "蜂鳴器模組", "LED 5mm 綜合包"],
    required_equipment: ["筆記型電腦", "烙鐵 60W"],
    difficulty: "advanced" as const,
  },
]

// ============================================================
// Classrooms + Versions（2 間教室，各含配置版本）
// ============================================================

// 教室 1: 生活科技教室（主教室）
// 8 rows x 10 cols
const classroom1Cells = [
  // 講台（第 0 行中間）
  { row: 0, col: 3, type: "furniture", label: "講台" },
  { row: 0, col: 4, type: "furniture", label: "講台" },
  { row: 0, col: 5, type: "furniture", label: "白板" },
  { row: 0, col: 6, type: "furniture", label: "白板" },
  // 投影機
  { row: 0, col: 9, type: "furniture", label: "投影機" },
  // 門
  { row: 0, col: 0, type: "furniture", label: "門" },
  // 第 1 行：筆電區
  { row: 1, col: 1, type: "furniture", label: "電腦桌" },
  { row: 1, col: 2, type: "furniture", label: "電腦桌" },
  { row: 1, col: 3, type: "furniture", label: "電腦桌" },
  { row: 1, col: 6, type: "furniture", label: "電腦桌" },
  { row: 1, col: 7, type: "furniture", label: "電腦桌" },
  { row: 1, col: 8, type: "furniture", label: "電腦桌" },
  // 中間走道留空 col 4, 5
  // 第 2-3 行：工作台（學生作業區）
  { row: 2, col: 0, type: "furniture", label: "工作台 A1" },
  { row: 2, col: 1, type: "furniture", label: "工作台 A1" },
  { row: 2, col: 3, type: "furniture", label: "工作台 A2" },
  { row: 2, col: 4, type: "furniture", label: "工作台 A2" },
  { row: 2, col: 6, type: "furniture", label: "工作台 A3" },
  { row: 2, col: 7, type: "furniture", label: "工作台 A3" },
  { row: 3, col: 0, type: "furniture", label: "工作台 B1" },
  { row: 3, col: 1, type: "furniture", label: "工作台 B1" },
  { row: 3, col: 3, type: "furniture", label: "工作台 B2" },
  { row: 3, col: 4, type: "furniture", label: "工作台 B2" },
  { row: 3, col: 6, type: "furniture", label: "工作台 B3" },
  { row: 3, col: 7, type: "furniture", label: "工作台 B3" },
  // 第 5 行：設備區（右側）
  { row: 5, col: 8, type: "furniture", label: "置物架" },
  { row: 5, col: 9, type: "furniture", label: "置物架" },
  { row: 6, col: 8, type: "furniture", label: "置物架" },
  { row: 6, col: 9, type: "furniture", label: "置物架" },
  // 第 7 行：窗戶 & 水槽
  { row: 7, col: 0, type: "furniture", label: "窗戶" },
  { row: 7, col: 1, type: "furniture", label: "窗戶" },
  { row: 7, col: 2, type: "furniture", label: "窗戶" },
  { row: 7, col: 8, type: "furniture", label: "水槽" },
  { row: 7, col: 9, type: "furniture", label: "垃圾桶" },
]

// 教室 2: 數位製造室
// 6 rows x 8 cols
const classroom2Cells = [
  // 3D 印表機區
  { row: 0, col: 0, type: "furniture", label: "3D印表機" },
  { row: 0, col: 1, type: "furniture", label: "3D印表機" },
  { row: 0, col: 2, type: "furniture", label: "3D印表機" },
  // 雷切區
  { row: 0, col: 5, type: "furniture", label: "雷切機" },
  { row: 0, col: 6, type: "furniture", label: "排煙管" },
  // CNC
  { row: 2, col: 0, type: "furniture", label: "CNC雕刻機" },
  { row: 2, col: 1, type: "furniture", label: "工具架" },
  // 鑽床 & 砂輪
  { row: 2, col: 5, type: "furniture", label: "鑽床" },
  { row: 2, col: 6, type: "furniture", label: "鑽床" },
  { row: 2, col: 7, type: "furniture", label: "砂輪機" },
  // 線鋸機
  { row: 3, col: 5, type: "furniture", label: "線鋸機" },
  { row: 3, col: 6, type: "furniture", label: "線鋸機" },
  { row: 3, col: 7, type: "furniture", label: "砂磨機" },
  // 材料架
  { row: 4, col: 0, type: "furniture", label: "材料架" },
  { row: 4, col: 1, type: "furniture", label: "材料架" },
  { row: 4, col: 2, type: "furniture", label: "材料架" },
  // 中間工作台
  { row: 3, col: 2, type: "furniture", label: "工作台" },
  { row: 3, col: 3, type: "furniture", label: "工作台" },
  { row: 4, col: 3, type: "furniture", label: "工作台" },
  { row: 4, col: 4, type: "furniture", label: "工作台" },
  // 安全設備
  { row: 5, col: 0, type: "furniture", label: "滅火器" },
  { row: 5, col: 7, type: "furniture", label: "急救箱" },
  // 門 & 窗
  { row: 5, col: 3, type: "furniture", label: "門" },
  { row: 5, col: 4, type: "furniture", label: "門" },
]

// ============================================================
// Transactions（示範異動記錄）
// ============================================================
const transactions = [
  { itemName: "Arduino UNO R3", type: "borrow", quantity: 5, note: "七年三班專題使用", status: "active", due_date: "2026-04-21" },
  { itemName: "麵包板 830 孔", type: "borrow", quantity: 5, note: "七年三班專題使用", status: "active", due_date: "2026-04-21" },
  { itemName: "超音波感測器 HC-SR04", type: "borrow", quantity: 5, note: "七年三班智慧垃圾桶專題", status: "active", due_date: "2026-04-21" },
  { itemName: "PLA 線材 1.75mm 白色", type: "purchase", quantity: 3, note: "補充庫存，校內採購", status: "completed" },
  { itemName: "烙鐵 60W", type: "repair", quantity: 2, note: "烙鐵頭氧化嚴重，送修更換", status: "active" },
  { itemName: "安全護目鏡", type: "borrow", quantity: 15, note: "八年一班木工課使用", status: "active", due_date: "2026-04-14" },
  { itemName: "焊錫線 1mm 有鉛", type: "purchase", quantity: 5, note: "學期初補貨", status: "completed" },
  { itemName: "松木板 30x20x1cm", type: "borrow", quantity: 20, note: "八年一班手機架專題", status: "active", due_date: "2026-04-18" },
  { itemName: "砂紙綜合包", type: "purchase", quantity: 30, note: "消耗品補充", status: "completed" },
  { itemName: "三用電表", type: "borrow", quantity: 8, note: "九年級電學實驗", status: "completed" },
  { itemName: "伺服馬達 SG90", type: "borrow", quantity: 4, note: "機械手臂社團", status: "active", due_date: "2026-04-25" },
  { itemName: "壓克力板 透明 20x30x0.3cm", type: "borrow", quantity: 10, note: "七年二班夜燈專題", status: "active", due_date: "2026-04-16" },
]

// ============================================================
// Bookings（示範預約記錄）
// ============================================================
const bookings = [
  { title: "七年三班 — Arduino 自動澆水", equipment_items: ["筆記型電腦", "Arduino UNO R3"], start_time: "2026-04-15T08:30:00", end_time: "2026-04-15T10:00:00", status: "confirmed", note: "第 1-2 節" },
  { title: "八年一班 — 木工手機架", equipment_items: ["桌上型鑽床", "桌上型線鋸機", "桌上型圓盤砂磨機"], start_time: "2026-04-15T10:10:00", end_time: "2026-04-15T11:50:00", status: "confirmed", note: "第 3-4 節，需使用數位製造室" },
  { title: "七年二班 — 雷切壓克力夜燈", equipment_items: ["雷射切割機 40W CO2", "筆記型電腦"], start_time: "2026-04-16T13:10:00", end_time: "2026-04-16T14:50:00", status: "confirmed", note: "第 5-6 節" },
  { title: "九年級社團 — 機械手臂", equipment_items: ["Creality Ender-3 V3 3D印表機", "筆記型電腦"], start_time: "2026-04-16T15:20:00", end_time: "2026-04-16T17:00:00", status: "pending", note: "課後社團時間" },
  { title: "八年二班 — LED 音樂節奏燈", equipment_items: ["筆記型電腦", "烙鐵 60W"], start_time: "2026-04-17T08:30:00", end_time: "2026-04-17T10:00:00", status: "confirmed", note: "第 1-2 節" },
  { title: "教師研習 — 3D列印教學", equipment_items: ["Creality Ender-3 V3 3D印表機", "筆記型電腦", "投影機"], start_time: "2026-04-18T13:10:00", end_time: "2026-04-18T16:00:00", status: "confirmed", note: "校內教師增能研習" },
  { title: "七年一班 — 風力發電模型", equipment_items: ["熱熔膠槍", "三用電表"], start_time: "2026-04-18T08:30:00", end_time: "2026-04-18T10:00:00", status: "pending", note: "第 1-2 節" },
]

// ============================================================
// Access Codes（示範使用碼）
// ============================================================
const accessCodes = [
  { code: "MAKER2026", label: "通用使用碼", is_active: true },
  { code: "CLASS701", label: "七年一班", is_active: true },
  { code: "CLASS702", label: "七年二班", is_active: true },
  { code: "CLASS703", label: "七年三班", is_active: true },
  { code: "CLASS801", label: "八年一班", is_active: true },
  { code: "CLASS802", label: "八年二班", is_active: true },
  { code: "CLUB2026", label: "機械手臂社團", is_active: true },
  { code: "TEACHER", label: "教師研習用", is_active: true },
]

// ============================================================
// Main seed function
// ============================================================

async function seedDemo() {
  console.log("🏫 開始建立完整示範資料...\n")

  // 1. Categories
  console.log("📂 建立分類...")
  const categoryMap = new Map<string, string>() // name -> id
  for (const cat of categories) {
    const existing = await db.collection("categories").where("name", "==", cat.name).get()
    if (existing.empty) {
      const ref = await db.collection("categories").add({ ...cat, created_at: now })
      categoryMap.set(cat.name, ref.id)
      console.log(`  ✓ ${cat.name}`)
    } else {
      categoryMap.set(cat.name, existing.docs[0].id)
      console.log(`  - ${cat.name}（已存在）`)
    }
  }

  // 2. Items
  console.log("\n📦 建立物品...")
  const itemMap = new Map<string, string>() // name -> id
  for (const item of items) {
    const existing = await db.collection("items").where("name", "==", item.name).get()
    if (!existing.empty) {
      itemMap.set(item.name, existing.docs[0].id)
      console.log(`  - ${item.name}（已存在）`)
      continue
    }
    const ref = await db.collection("items").add({
      name: item.name,
      category_id: categoryMap.get(item.category) || null,
      barcode: item.barcode,
      qr_code: null,
      quantity: item.quantity,
      unit: item.unit,
      description: item.description,
      image_url: null,
      status: "available",
      min_quantity: item.min_quantity,
      created_at: now,
      updated_at: now,
    })
    itemMap.set(item.name, ref.id)
    console.log(`  ✓ ${item.name}`)
  }

  // 3. Knowledge base
  console.log("\n📚 建立知識庫...")
  for (const entry of knowledgeEntries) {
    const existing = await db.collection("knowledge_base").where("title", "==", entry.title).get()
    if (!existing.empty) {
      console.log(`  - ${entry.title}（已存在）`)
      continue
    }
    await db.collection("knowledge_base").add({
      ...entry,
      image_url: null,
      created_at: now,
    })
    console.log(`  ✓ ${entry.title}`)
  }

  // 4. Classrooms + Versions
  console.log("\n🏠 建立教室...")

  // Classroom 1
  const cls1Existing = await db.collection("classrooms").where("name", "==", "生活科技教室").get()
  let cls1Id: string
  if (cls1Existing.empty) {
    const ref = await db.collection("classrooms").add({
      name: "生活科技教室",
      rows: 8,
      cols: 10,
      created_at: now,
      updated_at: now,
    })
    cls1Id = ref.id
    console.log("  ✓ 生活科技教室")
  } else {
    cls1Id = cls1Existing.docs[0].id
    console.log("  - 生活科技教室（已存在）")
  }

  // Add items to classroom 1 cells
  const cls1CellsWithItems = [
    ...classroom1Cells,
    // 把一些物品放到教室裡
    { row: 1, col: 4, type: "item", item_id: itemMap.get("筆記型電腦") || "", quantity: 8, label: "筆記型電腦" },
    { row: 1, col: 5, type: "item", item_id: itemMap.get("筆記型電腦") || "", quantity: 7, label: "筆記型電腦" },
    { row: 4, col: 0, type: "item", item_id: itemMap.get("烙鐵 60W") || "", quantity: 12, label: "烙鐵 60W" },
    { row: 4, col: 1, type: "item", item_id: itemMap.get("烙鐵架（含海綿）") || "", quantity: 12, label: "烙鐵架" },
    { row: 4, col: 3, type: "item", item_id: itemMap.get("熱熔膠槍") || "", quantity: 10, label: "熱熔膠槍" },
    { row: 4, col: 4, type: "item", item_id: itemMap.get("三用電表") || "", quantity: 10, label: "三用電表" },
    { row: 4, col: 6, type: "item", item_id: itemMap.get("安全護目鏡") || "", quantity: 35, label: "安全護目鏡" },
    { row: 4, col: 7, type: "item", item_id: itemMap.get("防割手套") || "", quantity: 20, label: "防割手套" },
    { row: 5, col: 0, type: "item", item_id: itemMap.get("Arduino UNO R3") || "", quantity: 15, label: "Arduino UNO R3" },
    { row: 5, col: 1, type: "item", item_id: itemMap.get("麵包板 830 孔") || "", quantity: 20, label: "麵包板" },
    { row: 5, col: 2, type: "item", item_id: itemMap.get("超音波感測器 HC-SR04") || "", quantity: 15, label: "超音波感測器" },
    { row: 5, col: 3, type: "item", item_id: itemMap.get("DHT11 溫溼度感測器") || "", quantity: 15, label: "DHT11" },
    { row: 5, col: 4, type: "item", item_id: itemMap.get("伺服馬達 SG90") || "", quantity: 15, label: "伺服馬達" },
    { row: 5, col: 5, type: "item", item_id: itemMap.get("LED 5mm 綜合包") || "", quantity: 200, label: "LED" },
    { row: 6, col: 0, type: "item", item_id: itemMap.get("十字螺絲起子組") || "", quantity: 15, label: "螺絲起子" },
    { row: 6, col: 1, type: "item", item_id: itemMap.get("尖嘴鉗") || "", quantity: 12, label: "尖嘴鉗" },
    { row: 6, col: 2, type: "item", item_id: itemMap.get("斜口鉗") || "", quantity: 12, label: "斜口鉗" },
    { row: 6, col: 3, type: "item", item_id: itemMap.get("剝線鉗") || "", quantity: 10, label: "剝線鉗" },
    { row: 6, col: 4, type: "item", item_id: itemMap.get("游標卡尺 150mm") || "", quantity: 10, label: "游標卡尺" },
    { row: 6, col: 5, type: "item", item_id: itemMap.get("美工刀") || "", quantity: 15, label: "美工刀" },
    { row: 7, col: 4, type: "item", item_id: itemMap.get("乾粉滅火器 10P") || "", quantity: 1, label: "滅火器" },
    { row: 7, col: 5, type: "item", item_id: itemMap.get("急救箱") || "", quantity: 1, label: "急救箱" },
  ]

  // Version for classroom 1
  const ver1Existing = await db.collection("classrooms").doc(cls1Id).collection("versions").where("name", "==", "114 下學期配置").get()
  if (ver1Existing.empty) {
    await db.collection("classrooms").doc(cls1Id).collection("versions").add({
      classroom_id: cls1Id,
      name: "114 下學期配置",
      cells: cls1CellsWithItems,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    console.log("  ✓ 生活科技教室 — 114 下學期配置")
  }

  // Classroom 2
  const cls2Existing = await db.collection("classrooms").where("name", "==", "數位製造室").get()
  let cls2Id: string
  if (cls2Existing.empty) {
    const ref = await db.collection("classrooms").add({
      name: "數位製造室",
      rows: 6,
      cols: 8,
      created_at: now,
      updated_at: now,
    })
    cls2Id = ref.id
    console.log("  ✓ 數位製造室")
  } else {
    cls2Id = cls2Existing.docs[0].id
    console.log("  - 數位製造室（已存在）")
  }

  const ver2Existing = await db.collection("classrooms").doc(cls2Id).collection("versions").where("name", "==", "標準配置").get()
  if (ver2Existing.empty) {
    await db.collection("classrooms").doc(cls2Id).collection("versions").add({
      classroom_id: cls2Id,
      name: "標準配置",
      cells: classroom2Cells,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    console.log("  ✓ 數位製造室 — 標準配置")
  }

  // 5. Transactions
  console.log("\n📝 建立異動記錄...")
  const txExisting = await db.collection("transactions").limit(1).get()
  if (txExisting.empty) {
    for (const tx of transactions) {
      const itemId = itemMap.get(tx.itemName)
      if (!itemId) {
        console.log(`  ✗ 找不到物品: ${tx.itemName}`)
        continue
      }
      await db.collection("transactions").add({
        item_id: itemId,
        type: tx.type,
        quantity: tx.quantity,
        note: tx.note,
        scanned_code: null,
        session_token: null,
        status: tx.status,
        due_date: tx.due_date || null,
        created_at: now,
        updated_at: now,
      })
      console.log(`  ✓ ${tx.type}: ${tx.itemName} x${tx.quantity}`)
    }
  } else {
    console.log("  - 已有異動記錄，跳過")
  }

  // 6. Bookings
  console.log("\n📅 建立預約記錄...")
  const bkExisting = await db.collection("bookings").limit(1).get()
  if (bkExisting.empty) {
    for (const bk of bookings) {
      await db.collection("bookings").add({
        project_id: null,
        title: bk.title,
        equipment_items: bk.equipment_items,
        start_time: bk.start_time,
        end_time: bk.end_time,
        status: bk.status,
        session_token: null,
        note: bk.note,
        created_at: now,
      })
      console.log(`  ✓ ${bk.title}`)
    }
  } else {
    console.log("  - 已有預約記錄，跳過")
  }

  // 7. Access Codes
  console.log("\n🔑 建立使用碼...")
  for (const ac of accessCodes) {
    const existing = await db.collection("access_codes").where("code", "==", ac.code).get()
    if (!existing.empty) {
      console.log(`  - ${ac.code}（已存在）`)
      continue
    }
    await db.collection("access_codes").add({
      code: ac.code,
      label: ac.label,
      created_by: "system",
      expires_at: null,
      is_active: ac.is_active,
      created_at: now,
    })
    console.log(`  ✓ ${ac.code} — ${ac.label}`)
  }

  console.log("\n✅ 示範資料建立完成！")
  console.log(`   📂 分類：${categories.length} 個`)
  console.log(`   📦 物品：${items.length} 項`)
  console.log(`   📚 知識庫：${knowledgeEntries.length} 篇`)
  console.log(`   🏠 教室：2 間`)
  console.log(`   📝 異動：${transactions.length} 筆`)
  console.log(`   📅 預約：${bookings.length} 筆`)
  console.log(`   🔑 使用碼：${accessCodes.length} 組`)
}

seedDemo().catch(console.error)
