@AGENTS.md

# Maker 教室管理系統

## 專案結構
```
maker-classroom/
├── src/
│   ├── app/
│   │   ├── (auth)/login, student/     # 登入頁面
│   │   ├── (main)/                    # 主要模組（含側邊欄）
│   │   │   ├── inventory/             # 庫存管理
│   │   │   ├── transactions/          # 異動管理
│   │   │   ├── classroom/             # 教室配置圖
│   │   │   ├── scanner/               # 掃碼作業
│   │   │   ├── ai-designer/           # AI 專案設計師
│   │   │   ├── knowledge/             # 專案知識庫
│   │   │   ├── project-planner/       # 專案規劃區
│   │   │   ├── bookings/              # 預約排程
│   │   │   └── settings/              # 系統設定（教師限定）
│   │   └── api/                       # API 路由
│   ├── components/                    # UI 組件
│   ├── hooks/                         # Custom hooks
│   ├── stores/                        # Zustand stores
│   ├── lib/                           # Firebase client/admin、utilities
│   └── types/                         # TypeScript 型別
├── scripts/seed.ts                    # Firestore 種子資料
└── .env.local.example                 # 環境變數範本
```

## 技術棧
- Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Firebase (Firestore + Auth)
- Zustand (狀態管理)
- html5-qrcode (條碼/QR掃描)
- @dnd-kit/core (教室配置圖拖放)
- Vercel (部署)

## 身份系統
- 教師：Firebase Auth (email/password)
- 學生：使用碼（無個資、session-based）

## 部署
- Vercel: https://maker-classroom.vercel.app
- Firebase Project: maker-classroom-cf606

## 常用指令
```bash
npm run dev    # 開發伺服器
npm run build  # 建置
npx tsx scripts/seed.ts  # 寫入種子資料
```

## 環境變數
- NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID
- FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)
- AI_API_KEY, AI_BASE_URL, AI_MODEL

## Firestore Collections
categories, items, item_locations, classroom_config (legacy), classrooms, classrooms/{id}/versions, access_codes, transactions, projects, knowledge_base, bookings, project_plans

## CHANGELOG
- 2026-04-13：初始建立 — 全部七大模組 + Auth + 使用碼系統
- 2026-04-13：從 Supabase 遷移到 Firebase (Firestore + Auth)，部署至 Vercel
- 2026-04-13：教室配置重構 — 支援多教室+多版本，UI 從 Canvas 改為 @dnd-kit + CSS Grid
- 2026-04-14：大功能更新 — 教室配置圖全面改造（家具跨格/多物品/搜尋高亮/器材清單/一鍵輸出HTML/亂碼修復）、知識庫改造（技能標籤/心智圖view/專案詳情頁/匯入按鈕）、新增專案規劃區模組、預約排程改造（日曆view/詳情彈窗/材料欄位/從專案規劃匯入）、知識庫自動爬取排程（Vercel Cron 每日6AM）
- 2026-04-14：心智圖縮放+拖曳範圍限制、庫存＆教室新增試算表VIEW（可選欄位/可編輯/連動資料庫）、新增 /api/items/locations API
- 2026-04-14：全 API serializeDoc 統一修復亂碼、庫存表格升級（排序/欄位設定/擺放位置/借出數量）、教室 LIST VIEW、專案規劃新增「待排程」（設備排程+時段衝突檢查）+ 使用代碼顯示
