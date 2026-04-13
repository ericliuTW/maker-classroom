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
│   │   │   ├── bookings/              # 預約排程
│   │   │   └── settings/              # 系統設定（教師限定）
│   │   └── api/                       # API 路由
│   ├── components/                    # UI 組件
│   ├── hooks/                         # Custom hooks
│   ├── stores/                        # Zustand stores
│   ├── lib/                           # Supabase client、utilities
│   └── types/                         # TypeScript 型別
├── supabase/migrations/               # SQL migration 檔
└── .env.local.example                 # 環境變數範本
```

## 技術棧
- Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + RLS + Auth)
- Zustand (狀態管理)
- html5-qrcode (條碼/QR掃描)
- Canvas API (教室配置圖)
- Vercel (部署)

## 身份系統
- 教師：Supabase Auth (email/password)
- 學生：使用碼（無個資、session-based）

## 資料庫表格
categories, items, item_locations, classroom_config, access_codes, transactions, projects, knowledge_base, bookings

## 常用指令
```bash
npm run dev    # 開發伺服器
npm run build  # 建置
```

## 環境變數
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- AI_API_KEY, AI_BASE_URL, AI_MODEL

## CHANGELOG
- 2026-04-13：初始建立 — 全部七大模組（庫存、異動、教室配置、掃碼、AI專案、知識庫、預約排程）+ Auth + 使用碼系統
