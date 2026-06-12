# Maker 教室管理系統 — AI Agent 交接文件

> 本文件由 Claude（Anthropic）產出，供下一位 AI Agent（Codex 或其他）接手開發使用。
> 最後更新：2026-05-02

---

## 一、專案概述

**Maker 教室管理系統**是一套給國高中生科/Maker 教室使用的全端 Web 應用程式，目標是讓老師和學生能輕鬆管理教室資源、規劃競賽專案、借用設備材料。

- **正式部署**：https://maker-classroom.vercel.app
- **GitHub**：https://github.com/ericliuTW/maker-classroom
- **使用說明**：https://maker-classroom.vercel.app/guide.html
- **開發狀態**：功能測試版（試用中，資料為示範資料）

---

## 二、設計哲學

### 2.1 核心原則

1. **教師管理，學生自主**
   - 教師（Firebase Auth）掌控系統設定、家具佈局、使用代碼
   - 學生（使用碼登入，無需個資）可自主規劃專案、預約設備、查看教室
   - 介面設計刻意讓大多數功能對學生可見，降低使用門檻

2. **不強制工作流**
   - 學生可以從 AI 設計師 → 專案規劃 → 設備預約，也可以直接跳到任何一步
   - 每個模組都是獨立可用的，不需要依賴其他模組的資料才能操作

3. **零個資原則（學生端）**
   - 學生登入只需使用代碼，不收集姓名、email、電話
   - 學生的所有資料（專案規劃、預約）以 `session_token` 識別（隨機 UUID，存在 localStorage）
   - 老師沒辦法從系統中得知「某個 session_token 是哪個學生」

4. **資安優先**
   - 所有寫入/刪除操作都做 server-side 驗證（`verifyTeacher` 或 session_token 比對）
   - 敏感設定（Firebase Admin SDK 私鑰）只在 server-side 使用，不暴露給前端
   - Firestore 的直接存取規則應設為全部拒絕，所有操作走 API routes

5. **即時性 vs 成本平衡**
   - 選擇 Firestore 而非 Supabase，是因為現有 Supabase 免費額度已滿（2/2）
   - AI 功能使用 Google Gemini API（免費額度：1500 req/day），不用 OpenAI 避免費用
   - 目前 AI model：`gemini-3.1-flash-lite-preview`

### 2.2 UI/UX 哲學

- **shadcn/ui + Tailwind CSS**：選用 shadcn 是因為它可客製化、不鎖定版本，適合長期維護
- **Base UI Select**（`@base-ui/react/select`）：部分地方使用，注意它需要在 `Select.Root` 傳 `items` prop，且每個 `SelectItem` 要有 `label` prop，否則 `SelectValue` 只會顯示 value（Firestore doc ID），不會顯示名稱
- **手機優先**：側邊欄在手機上收合，使用底部 sheet 或 hamburger menu；教室配置圖在手機上支援 pinch-to-zoom（尚未完整實作）

---

## 三、技術架構

### 3.1 技術棧

| 層級 | 技術 | 說明 |
|------|------|------|
| 框架 | Next.js 16 (App Router) | **注意：這不是標準 Next.js，有 breaking changes，先讀 `node_modules/next/dist/docs/`** |
| 語言 | TypeScript | 全面使用，型別定義在 `src/types/database.ts` |
| 樣式 | Tailwind CSS v4 + shadcn/ui | |
| 資料庫 | Firebase Firestore | NoSQL，即時同步，Collection 結構見下方 |
| 身份驗證 | Firebase Auth（教師）+ 使用碼（學生）| |
| 狀態管理 | Zustand | 只管理全域身份狀態（`src/stores/auth-store.ts`）|
| 拖放 | @dnd-kit/core | 教室配置圖家具拖放 |
| 掃碼 | html5-qrcode | 條碼/QR Code 掃描 |
| AI | Google Gemini API | 透過 OpenAI-compatible endpoint 呼叫 |
| 部署 | Vercel | 含 Cron Job（每日 6AM 爬取知識庫）|

### 3.2 目錄結構

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # 教師登入（Firebase Auth）
│   │   └── student/page.tsx        # 學生登入（使用代碼）
│   ├── (main)/                     # 主要功能區（含共用側邊欄）
│   │   ├── layout.tsx              # 側邊欄 + 身份驗證守衛
│   │   ├── inventory/page.tsx      # 庫存管理
│   │   ├── transactions/page.tsx   # 借還記錄
│   │   ├── classroom/page.tsx      # 教室配置圖（最複雜）
│   │   ├── scanner/page.tsx        # 條碼掃描
│   │   ├── ai-designer/page.tsx    # AI 專案設計師
│   │   ├── knowledge/page.tsx      # 專案知識庫
│   │   ├── project-planner/page.tsx # 專案規劃（含設備排程）
│   │   ├── bookings/page.tsx       # 預約排程
│   │   └── settings/page.tsx       # 系統設定（僅教師）
│   └── api/
│       ├── access-codes/           # 使用代碼 CRUD + 驗證
│       ├── ai/route.ts             # AI 對話（Gemini）
│       ├── bookings/route.ts       # 預約 CRUD
│       ├── categories/route.ts     # 分類 CRUD
│       ├── classrooms/             # 教室 CRUD + 版本管理
│       ├── equipment/availability/ # 設備可用時段查詢
│       ├── items/                  # 庫存 CRUD + 擺放位置
│       ├── knowledge/              # 知識庫 CRUD + 爬取 + AI推薦
│       ├── project-plans/          # 專案規劃 CRUD
│       └── transactions/route.ts   # 借還記錄 CRUD
├── components/
│   ├── inventory/                  # 庫存相關元件（列表、卡片、Dialog）
│   ├── scanner/barcode-scanner.tsx # 掃碼元件
│   ├── shared/                     # 共用元件（NavBar、SpreadsheetView）
│   └── ui/                         # shadcn/ui 基礎元件
├── hooks/
│   └── use-items.ts                # 庫存資料 hook
├── lib/
│   ├── firebase-admin.ts           # Firebase Admin SDK（server-side only）
│   ├── firebase-client.ts          # Firebase Client SDK（前端用）
│   ├── auth-helper.ts              # verifyTeacher()：驗證教師 JWT
│   └── utils.ts                    # cn() 等工具函式
├── stores/
│   └── auth-store.ts               # Zustand：isTeacher, sessionToken, user
└── types/
    └── database.ts                 # 所有 TypeScript 型別定義
```

### 3.3 身份驗證流程

```
教師登入：
  login/page.tsx → Firebase Auth signInWithEmailAndPassword
  → 取得 ID Token → 存入 cookie (firebase_token)
  → 所有 API 的教師操作：verifyTeacher(request) 驗證 cookie

學生登入：
  student/page.tsx → POST /api/access-codes/verify {code}
  → 驗證成功 → 產生 session_token（UUID）存入 localStorage
  → 學生操作以 session_token 識別（不驗身份，只驗 token 是否存在）

前端判斷：
  auth-store.ts → { isTeacher: boolean, sessionToken: string | null, user: FirebaseUser | null }
  → isTeacher 決定哪些 UI 元素可見
```

---

## 四、Firestore 資料結構

### Collections

```
categories/           # 材料分類
  {id}: { name, icon, description, created_at }

items/                # 庫存物品
  {id}: { name, category_id, barcode, qr_code, quantity, unit,
          description, image_url, status, min_quantity,
          created_at, updated_at }

item_locations/       # 物品在教室家具中的擺放
  {id}: { item_id, pos_x, pos_y, quantity, label }

classrooms/           # 教室（支援多教室）
  {id}: { name, rows, cols, created_at, updated_at }
  versions/           # 子集合：教室配置版本
    {versionId}: { name, cells: ClassroomGridCell[], is_active,
                   created_at, updated_at }

access_codes/         # 使用代碼
  {id}: { code, label, created_by, expires_at, is_active, created_at }

transactions/         # 借還異動記錄
  {id}: { item_id, type, quantity, note, scanned_code,
          session_token, status, due_date, created_at, updated_at }

projects/             # AI 設計師產出的專案（已整合至 project-planner）
  {id}: { title, description, ai_response, materials_json,
          equipment_json, todo_json, session_token,
          created_at, updated_at }

knowledge_base/       # 專案知識庫（自動爬取 + 手動匯入）
  {id}: { title, url, source, description, tags,
          required_materials, required_equipment, difficulty,
          image_url, skills, objectives, content,
          process_steps, created_at }

bookings/             # 設備預約
  {id}: { project_id, project_plan_id, title, equipment_items,
          material_items, start_time, end_time, status,
          session_token, note, created_at }

project_plans/        # 專案規劃區
  {id}: { title, description, source_knowledge_id, objectives,
          process_steps, materials, equipment,
          equipment_schedules, status, session_token,
          created_at, updated_at }
```

### 重要型別（`src/types/database.ts`）

- `ClassroomGridCell`：教室格子，含 `type`（furniture/empty）、`items: FurnitureItem[]`、`width/height`（跨格）
- `EquipmentSchedule`：`{ equipment_name, date: "YYYY-MM-DD", period: 1-8 }`
- `ProjectPlan`：包含 `materials[]`、`equipment[]`、`equipment_schedules[]`

---

## 五、關鍵模組說明

### 5.1 教室配置圖（`classroom/page.tsx`）⭐ 最複雜

- 使用 `@dnd-kit/core` 實作拖放
- 支援多教室（`classrooms` collection）+ 多版本（`versions` 子集合）
- 每個家具格子可存放多個庫存物品（`items: FurnitureItem[]`）
- 家具可跨格（`width/height`）
- **權限分級**：
  - 所有人：可拖拉物品到家具、查看配置
  - 僅教師：新增/刪除家具、新增/切換/儲存版本
- 點擊家具 → Dialog → 複選庫存物品 + 調整數量

### 5.2 專案規劃（`project-planner/page.tsx`）

- `EquipmentSection` 元件（內嵌在 page.tsx）：選擇設備 + 週曆排程一體化
  - 點「選擇設備」→ 從庫存選取或自訂設備名稱
  - 選完後出現 7 天 × 8 節次 的週曆，綠=可用、藍=已選、紅=已被預約
  - 直接點格子排程，上下週切換
- 刪除專案：`isTeacher || plan.session_token === sessionToken` 都可刪

### 5.3 AI 設計師（`ai-designer/page.tsx` + `api/ai/route.ts`）

- 呼叫 Gemini API（OpenAI-compatible endpoint）
- 系統 prompt 讓 Gemini 扮演「Maker 教室 AI 設計師」
- 回傳結構化 JSON：包含 `materials`、`equipment`、`todo_steps`
- 產出後可匯入至「專案規劃區」

### 5.4 知識庫（`knowledge/page.tsx` + `api/knowledge/crawl/route.ts`）

- Vercel Cron Job：每日 UTC 6:00（台灣時間 14:00）自動爬取
- 支援心智圖 View（d3.js 或純 CSS 樹狀圖）
- AI 推薦：根據使用者輸入的專案描述，推薦相關知識庫條目

### 5.5 掃碼（`scanner/page.tsx`）

- html5-qrcode 讀取條碼/QR Code
- 掃到後自動帶入借還表單
- 支援手機相機

---

## 六、環境變數

```bash
# Firebase Client（前端，NEXT_PUBLIC_ 可在瀏覽器中讀取）
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin（server-side only，JSON 字串）
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# AI（Gemini）
AI_API_KEY=                          # Google AI Studio API Key
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
AI_MODEL=gemini-3.1-flash-lite-preview
```

> ⚠️ `.env.local` 只在開發者本機，**從未 commit 進 git**。Vercel 環境變數需另行在 Vercel Dashboard 設定。

---

## 七、已知問題與技術債

| 問題 | 嚴重度 | 說明 |
|------|--------|------|
| `src/lib/supabase-middleware.ts` 存在但未使用 | 低 | 遷移到 Firebase 後的殘留檔案，可刪除 |
| 教室配置圖手機縮放體驗差 | 中 | 大型教室在手機上格子太小，尚未做 pinch-to-zoom |
| 知識庫爬取無防重複機制 | 中 | 同一 URL 可能被多次爬取寫入 |
| session_token 無過期機制 | 低 | localStorage 中的 session_token 永不過期，安全性略低 |
| Firestore Security Rules 未設定 | 高 | 目前靠 API routes 做驗證，但 Firestore 本身應設為全拒絕直接存取 |
| `classroom_config` collection | 低 | 舊版遺留，seed.ts 還會寫入，已不使用，可清理 |

---

## 八、建議的下一步功能（優先序）

以下功能已與用戶討論，按重要性排列：

### 🔴 優先（最能打痛點）

1. **設備損壞回報 + 維修追蹤**
   - 任何人可對設備標記「損壞」，附說明（選填照片）
   - 設備組可更新維修狀態：損壞待修 → 維修中 → 已修復
   - 需在 items collection 新增 `maintenance_status` 欄位
   - 影響：`inventory/page.tsx`、`api/items/route.ts`、新增 `api/items/[id]/maintenance/route.ts`

2. **採購申請書自動生成**
   - 條件：庫存低於 `min_quantity` 的物品
   - 產出：可下載的 HTML/PDF 採購清單（含品名、現有數量、建議補購量、用途）
   - 建議放在 `settings/page.tsx` 的「庫存管理」區塊

### 🟡 中期

3. **材料費用追蹤**
   - 在 `items` 加 `unit_price` 欄位
   - `transactions` 自動計算費用
   - 儀表板顯示各班/各專案耗材費用

4. **課程資源包（教學套組）**
   - 老師建立「套組」（含材料清單），學生一鍵預訂
   - 新 collection：`resource_kits`

5. **學生作品成果頁**
   - `project_plans` 加 `is_public`、`cover_image_url`、`completed_at`
   - 公開頁面：`/showcase/[id]`，不需登入即可瀏覽

### 🟢 錦上添花

6. LINE Notify 借用到期提醒
7. 設備使用率統計報表（給主任看的）
8. 學期末一鍵盤點模式
9. 競賽倒數計時小工具

---

## 九、開發注意事項

### ⚠️ 重要警告

1. **Next.js 版本有 breaking changes**：開始寫任何 Next.js 相關程式碼前，先讀 `node_modules/next/dist/docs/`，不要用訓練資料中的舊知識
2. **不得刪除 Firestore 資料**：`絕對不刪除資料庫資料` — 這是用戶的強制規定，任何刪除操作都要先確認
3. **不執行 git 操作**：commit/push 由用戶透過 GitHub Desktop 操作，不要用 CLI git
4. **API key 安全**：不要把環境變數印在 console.log 或回傳給前端

### 開發流程

```bash
npm run dev          # 開發（http://localhost:3000）
npm run build        # 確認 build 不報錯
npx tsx scripts/seed.ts  # 寫入種子資料（謹慎使用）
```

### Vercel 部署

- Push 到 GitHub main branch → Vercel 自動部署
- 環境變數在 Vercel Dashboard → Settings → Environment Variables
- Cron Job 設定在 `vercel.json`（目前：每日 UTC 6:00 爬取知識庫）

---

## 十、重要檔案路徑速查

| 用途 | 路徑 |
|------|------|
| 型別定義（最重要） | `src/types/database.ts` |
| 身份驗證邏輯 | `src/lib/auth-helper.ts` |
| 全域狀態 | `src/stores/auth-store.ts` |
| 教師登入 | `src/app/(auth)/login/page.tsx` |
| 學生登入 | `src/app/(auth)/student/page.tsx` |
| 教室配置圖 | `src/app/(main)/classroom/page.tsx` |
| 專案規劃 | `src/app/(main)/project-planner/page.tsx` |
| AI 設計師 | `src/app/(main)/ai-designer/page.tsx` |
| AI API | `src/app/api/ai/route.ts` |
| 庫存 API | `src/app/api/items/route.ts` |
| 使用代碼驗證 API | `src/app/api/access-codes/verify/route.ts` |
| 設備可用性 API | `src/app/api/equipment/availability/route.ts` |
| 使用說明 HTML | `public/guide.html` |
| 開發紀錄 | `CLAUDE.md`（changelog 區塊）|
| 本交接文件 | `HANDOFF.md` |
| Next.js 特殊說明 | `AGENTS.md` |
| 環境變數範本 | `.env.local.example` |

---

## 十一、給下一位 AI Agent 的說明

### 你接手的是什麼

一個**已可運作的生產級 Next.js App**，有完整的 CRUD、身份驗證、AI 整合、拖放教室配置、設備排程等功能。不是從零開始，是在一個有 2000+ 行程式碼的既有系統上迭代。

### 最需要理解的三件事

1. **身份系統**：`isTeacher`（Firebase Auth）vs `sessionToken`（localStorage UUID）— 很多 UI 判斷都依賴這個，改功能前先確認權限邊界
2. **教室配置圖最複雜**：`classroom/page.tsx` 有拖放、多教室、多版本、家具物品管理，改這裡前要完整閱讀
3. **Base UI Select 的 label 問題**：任何新增的下拉選單，`Select.Root` 要傳 `items={[{value, label}]}` prop，`SelectItem` 要有 `label` prop，否則顯示 doc ID

### 開始工作的建議順序

1. 讀 `AGENTS.md`（30 秒）
2. 讀 `src/types/database.ts`（了解所有資料型別）
3. 讀 `CLAUDE.md`（了解 changelog 和技術棧）
4. 針對要修改的模組，讀對應的 page.tsx

### 用戶偏好

- **繁體中文溝通**
- 不用 CMD，所有指令由 Claude Code 執行
- 不做 git commit/push，用戶自己用 GitHub Desktop
- 資安優先，有疑慮先問再做
- 不刪除資料庫現有資料

---

*本文件由 Claude（claude-opus-4-5）產出，基於 2026-04-13 至 2026-05-02 的開發記錄。*
