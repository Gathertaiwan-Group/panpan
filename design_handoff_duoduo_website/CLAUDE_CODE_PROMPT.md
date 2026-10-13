# 貼給 Claude Code 的啟動指令

把整個 `design_handoff_duoduo_website/` 資料夾放到新 repo 根目錄後，對 Claude Code 說：

---

請讀 `design_handoff_duoduo_website/README.md`（完整讀完），再讀 `prototype/site.dc.html`、`content/content.json`、`supabase/schema.sql`。

任務：依 README §4 架構建立 pnpm monorepo（apps/web = Next.js 15 App Router + TS + Tailwind v4 → Vercel；apps/api = Hono → Railway；supabase/ migrations + seed），把「朵朵曉語」官網 **100% 還原** 原型：

1. 視覺：所有色碼、字體、字級、字距、行高、間距、斷行、hover、RWD（820px 斷點、行動漢堡全螢幕選單、詳細頁底部固定 CTA）完全依照 `site.dc.html` 的 inline style。
2. 文案：逐字使用 `content.json` 與原型模板中的文字，不得改寫、不得新增虛構內容（尤其新生故事）。
3. 路由：依 README §5。
4. 資料：Supabase（schema.sql + 由 content.json 產生的 seed），頁面讀 Supabase，失敗 fallback content.json。
5. 表單：合作申請、預約詢問、故事分享 → Server Actions → Supabase；Railway 的 apps/api 接 Database Webhook 寄 Email（Resend）＋ LINE 通知。
6. 每完成一頁，用 Playwright 在 1440 / 820 / 390 寬度分別截圖原型（`npx serve design_handoff_duoduo_website/prototype`，`site.dc.html?page=…`）與實作頁面並比對，修到一致。
7. 最後產出部署說明：GitHub → Vercel（root apps/web）、Railway（root apps/api）、Supabase（db push + webhooks + storage buckets），以及需要填的環境變數（見 `.env.example`）。

先列出計畫與檔案結構給我確認，再開始寫程式。
