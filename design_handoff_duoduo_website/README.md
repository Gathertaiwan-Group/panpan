# Handoff：朵朵曉語 Duoduo Whispers 品牌官網

> 給 Claude Code：請先完整讀完本文件，再讀 `prototype/site.dc.html` 與 `content/content.json`，然後依照「實作步驟」執行。目標是 **視覺與文案 100% 還原原型**，並依指定架構部署到 GitHub + Vercel + Supabase + Railway。

---

## 1. Overview

「朵朵曉語」是以創辦人朵朵個人 IP 為情感入口、以「好好告別｜人生轉場體驗」為商業核心的品牌官網。使用者進站要同時理解：

- **朵朵曉語是誰**（個人故事、心語文章）
- **好好告別能為我做什麼**（3 個主打體驗 SET：美甲×寫真、美髮×寫真、美甲×絨霧眉／霧唇改色）

核心使用路徑：短影音導流 → 認識朵朵曉語 → 理解人生轉場 → 看見好好告別 → 探索體驗 → 預約／詢問 → 分享故事 → 回到 IP。

品牌 Slogan：**在人生轉場時・陪妳優雅重啟**　主標：**每一朵花，都有屬於自己的花期**

## 2. About the Design Files

`prototype/` 內的檔案是用 HTML 做的 **設計原型（design reference）**，不是可直接上線的程式碼。

- `prototype/site.dc.html`：整站原型（單檔、所有頁面以 state 切換）。**所有 inline style 即為最終規格，請以此為唯一視覺真相來源（source of truth）。**
- `prototype/mobile-preview.dc.html`：行動版 390×844 預覽板（以 iframe 載入 site.dc.html 的各頁）。
- `prototype/support.js`：原型執行用的 runtime（**不要搬進正式專案**）。

### 如何在本機打開原型
```bash
cd design_handoff_duoduo_website/prototype
npx serve .            # 或 python3 -m http.server
# 開 http://localhost:3000/site.dc.html
# 直接開特定頁：site.dc.html?page=farewell | set&set=0..2 | about | stories | story&story=0..2 | whispers | article&article=0..4 | partner
```

### 原型檔案格式（讀檔時須知）
- `<x-dc>…</x-dc>` 內是 HTML 模板，`{{ name }}` 為資料插值，值來自下方 `<script>` 內 `class Component` 的 `renderVals()`。
- `<sc-for list="{{ items }}" as="x">` = 迴圈；`<sc-if value="{{ flag }}">` = 條件渲染。
- `style-hover="…"` = `:hover` 樣式。
- 文案常數（`SETS`、`ABOUT`、`STORIES`、`STORY_PARTS`、`ARTICLES`、`NAV`）已逐字抽出到 `content/content.json`。

**任務：在 Next.js 中以真實路由與元件重建這些設計，像素級還原**（字體、色碼、字距、行高、間距、斷行都要一致）。

## 3. Fidelity

**High-fidelity。** 色彩、字體、字級、字距、行高、間距、互動、RWD 斷點皆為最終定稿。唯一非最終的是 **圖片**：原型中斜紋底＋等寬字標籤的方塊是「照片佔位」，標籤文字說明該放什麼照片，正式版請改成 Supabase Storage 的圖片（保留相同比例框）。

## 4. 技術架構（指定）

```
GitHub monorepo (pnpm workspaces)
├── apps/web        Next.js 15 (App Router, TypeScript, Tailwind CSS v4)  → Vercel
├── apps/api        Node 20 + Hono (TypeScript)                            → Railway
├── supabase/       migrations/、seed.sql、config.toml                     → Supabase
└── packages/content  共用型別 + content.json（seed 來源）
```

| 層 | 平台 | 職責 |
|---|---|---|
| 前端 | **Vercel** | SSG/ISR 渲染所有頁面；Server Actions 寫入表單；`revalidateTag` 於內容更新時重建 |
| 資料庫/檔案 | **Supabase** | Postgres（文章、故事、體驗、表單）、Storage（照片）、RLS、Auth（後台管理員） |
| 後端服務 | **Railway** | `apps/api`：接 Supabase Database Webhook → 寄 Email（Resend）/ LINE 通知給朵朵團隊；未來預約、金流（綠界 ECPay）webhook、排程 |
| 版控/CI | **GitHub** | PR → Vercel Preview；`main` → Production；GitHub Actions 跑 lint、typecheck、`supabase db push` |

資料流：
1. 訪客送出表單 → Next.js Server Action（zod 驗證）→ Supabase insert（anon key + RLS 只允許 insert）。
2. Supabase Database Webhook（`partner_applications`、`booking_inquiries`、`story_submissions` 的 INSERT）→ `POST https://<railway>/webhooks/supabase`（header 帶 `WEBHOOK_SECRET`）→ 寄通知。
3. 內容（心語、故事、體驗）由 Supabase 讀取；頁面用 `fetch` + `next: { tags: ['whispers'] }` 快取；內容更新時 Railway 呼叫 Vercel 的 `/api/revalidate?tag=…&secret=…`。

> 第一階段只上 3 個 SET，但資料結構必須是 **模組化／可組合**（見 §9 schema 的 `experience_modules`、`experience_set_modules`），未來可加「妝髮×寫真、花藝×寫真…」及使用者自由搭配。

## 5. 路由對照（原型 state → 正式路由）

| 原型 `page` | 正式路由 | 說明 |
|---|---|---|
| `home` | `/` | 首頁 |
| `farewell` | `/farewell` | 好好告別（主要商品頁） |
| `set` (`set=0/1/2`) | `/farewell/nail-photo`、`/farewell/hair-photo`、`/farewell/nail-brow-lip` | 體驗詳細頁 |
| `about` | `/about` | 關於朵朵 |
| `stories` | `/stories` | 新生故事列表 |
| `story` | `/stories/[slug]` | 故事詳細頁（四段架構） |
| `whispers` | `/whispers` | 朵朵曉語列表 |
| `article` (`article=0..4`) | `/whispers/[slug]`（`01-the-beginning`、`02-coming-home`、`03-love-and-responsibility`、`04-the-birth`、`05-the-future`） | 心語文章 |
| `partner` | `/partner` | 一起創造美好（合作招募） |

導覽順序與文字：首頁、好好告別、關於朵朵、新生故事、朵朵曉語、一起創造美好。
**目前所在區段高亮規則**：`/farewell/*` 高亮「好好告別」、`/stories/*` 高亮「新生故事」、`/whispers/*` 高亮「朵朵曉語」。

## 6. Design Tokens

### 色彩
| Token | Hex | 用途 |
|---|---|---|
| `bg` | `#FAF5F2` | 頁面底色、卡片底（淺） |
| `blush` | `#F3E6E0` | 區塊交替底、資訊框 |
| `rose` | `#A35B55` | 品牌主色：Hero 底、主要按鈕、深色區塊 |
| `rose-deep` | `#8C4A46` | 按鈕 hover、強調文字、連結、Logo 字 |
| `rose-hover` | `#A9605A` | 連結 hover、導覽 active 底線 |
| `ink` | `#3A2826` | 主標題文字、Footer 底 |
| `ink-2` | `#4E3835` | 詩意段落／文章內文 |
| `body` | `#5A4340` | 一般內文 |
| `muted` | `#7A615D` | 次要文字、麵包屑、標籤 |
| `gold` | `#9C7A5C` | 英文小標（Cormorant）、編號 |
| `gold-line` | `#C9A88E` | 細分隔線、引言左線、虛線框 |
| `line` | `#EADAD3` | 一般分隔線、卡片邊框 |
| `line-2` | `#D9BFB4` | 四大支柱上下線 |
| `input-line` | `#DCC7BE` | 表單框線 |
| `on-rose` | `#FBEFEA` | 玫瑰底上的文字 |
| `on-rose-2` | `#F4D9CF` | 玫瑰底上的次要文字／英文小標 |
| `foot-text` | `#E9D6CE` | Footer 文字 |
| `foot-muted` | `#BFA59C` | Footer 版權 |
| placeholder 斜紋 | `repeating-linear-gradient(135deg,#EFE1DA 0 10px,#F5EAE4 10px 20px)` | 照片佔位 |

### 字體（Google Fonts）
- 標題／詩意文字：`Noto Serif TC` 300/400/500/600
- 內文／UI：`Noto Sans TC` 300/400/500
- 英文裝飾小標：`Cormorant Garamond` 400/500、italic 400
- 佔位標籤：`ui-monospace, Menlo, monospace` 11px
- 全站 `-webkit-font-smoothing: antialiased`；`box-sizing: border-box`
- 建議用 `next/font/google` 載入，變數 `--font-serif`、`--font-sans`、`--font-en`。

### 字級（皆取自原型）
- H1 Hero：`clamp(32px,4.2vw,54px)` / lh 1.45 / ls .08em / weight 400
- H1 內頁：`clamp(26px,3.2vw,40px)` / lh 1.6 / ls .08em
- H1 好好告別、合作頁：`clamp(28px,3.8vw,46px)`
- H2 區塊：`clamp(24px,2.8vw,34px)` / lh 1.7 / ls .08–.1em
- 卡片標題：20–26px serif 500 / ls .1–.14em
- 詩意段落：`clamp(16px,1.6vw,19px)` / lh 2.2 / ls .08em
- 內文：15–16px / lh 1.9–2.1 / ls .04–.06em；文章內文 16.5px / lh 2.15
- 英文小標：13–14px Cormorant / ls .24–.34em（全大寫）
- 按鈕：14–15px / ls .14–.2em

### 間距與版面
- 內容最大寬：header 1240px；區塊 1140px；文字區 600–760px；文章 680px
- 左右 padding：`clamp(20px,4vw,48px)`
- 區塊上下 padding：`clamp(72px,9vw,120px)`；強調區 `clamp(80px,11vw,150px)`
- 卡片格線：`repeat(auto-fit,minmax(min(100%,300px),1fr))`，gap 24–28px
- **圓角：全部 0**（直角，刻意）；陰影：無（僅行動預覽手機外框有）
- 按鈕：主要 `padding:14–15px 28–30px; background:#A35B55; color:#FBEFEA`，hover `#8C4A46`；次要為 1px 邊框透明底

## 7. Screens（逐頁規格）

> 精確的 inline style 請直接對照 `site.dc.html` 中對應 `data-screen-label` 的區塊。以下為結構摘要。

### 全站 Header（sticky）
- `position:sticky;top:0;z-index:20;background:rgba(250,245,242,.94);backdrop-filter:blur(10px);border-bottom:1px solid #EADAD3`
- 左：文字 Logo「朵朵曉語」Noto Serif TC 21px 500 ls .32em `#8C4A46`；下方「DUODUO WHISPERS」Cormorant 11px ls .3em `#7A615D`。點擊回首頁。
- 右（桌面 ≥820px）：6 個導覽，14px ls .12em，padding 6px 0；active 色 `#8C4A46` + 1px 底線 `#A9605A`，其餘 `#5A4340`。
- 行動（<820px）：漢堡按鈕 44×44（兩條線 24px / 16px，1px `#8C4A46`，靠右對齊，gap 7px）。點開為 **全螢幕選單**：底 `#A35B55`、Logo 反白、右上「×」44×44；項目 serif 21px ls .18em，padding 20px 0，分隔線 `rgba(251,239,234,.22)`，右側 active 顯示「✦」其餘「→」；底部 slogan 13px `#F4D9CF`。點任一項關閉選單並 `scrollTo(0,0)`。

### 首頁 `/`
1. **Hero**（`#A35B55` 底）：兩欄 grid（`minmax(min(100%,380px),1fr)`，窄螢幕堆疊）。左：Logo 圖 `assets/logo.jpg`，2:3，`max-width:440px`（行動 260px），用 `mask-image: radial-gradient(ellipse 72% 66% at 50% 48%,#000 58%,transparent 100%)` 讓邊緣融入底色。右：英文 italic「Every flower has its own season」→ H1「每一朵花，<br>都有屬於自己的花期」→ 副標 → 兩顆 CTA「認識朵朵 →」（實心 `#FBEFEA` 字 `#8C4A46`）、「探索好好告別 →」（1px `#F4D9CF` 框）。
2. **序言**（置中，max 620px）：四段詩意文字，中間 1×48px 金線，最後「我是朵朵，這裡，是「朵朵曉語」。」用 `#8C4A46` 大一級。
3. **IP × 品牌**（`#F3E6E0` 底）：上方左 H2／右三段內文；下方兩張並排卡——「朵朵曉語」（`#FAF5F2` 底，CTA 走進朵朵曉語 →）與「好好告別」（`#A35B55` 底反白，CTA 探索好好告別 →）。
4. **體驗入口**：標題「為自己選一段值得的體驗」+ 右側「查看全部 →」；三張卡（4:5 照片佔位、SET 編號、名稱、tagline），點擊進詳細頁。
5. **品牌收尾**（全站共用，見下）。

### 好好告別 `/farewell`
1. 共鳴（`#A35B55` 底置中）：英文小標「A GRACEFUL FAREWELL · 好好告別」、H1「有些告別，是為了讓我們重新遇見自己。」、兩段。
2. 旅程條：「告別 — 整理 — 重拾自己 — 綻放 — 重新開始」serif，分隔 `—` 為 `#C9A88E`。
3. 是什麼：左 4:5 佔位（形象照），右 H2 + 三段。
4. 組合（`#F3E6E0`）：四大支柱 美麗/紀錄/儀式/生活（30px serif + 英文），上下 1px `#D9BFB4`。
5. 三個 SET：白底卡＋1px `#EADAD3` 框，4:3 佔位，按鈕「探索這段體驗 →」。
6. 「更多人生轉場體驗，陸續加入中」：虛線 chips（`roadmap`）。原型中可開關（prop `showRoadmap`，預設 true）→ 正式版做成 Supabase `site_settings.show_roadmap`。

### 體驗詳細頁 `/farewell/[slug]`
- 麵包屑「← 好好告別 ／ 所有體驗」。兩欄：左 4:5 佔位（桌面 sticky top:110px，行動 static）；右：SET 編號、H1 名稱、headline（serif `#8C4A46`）、40px 金線、body 各段 serif 17px lh 2。
- 資訊框（`#F3E6E0`）：「體驗內容、時長與價格 · 待提供」+「預約這段體驗」「私訊詢問」。
- 「其他體驗」清單（另外兩個 SET）。
- **行動版**：底部固定 CTA 列（`rgba(250,245,242,.97)`、上框線、`padding-bottom: calc(12px + env(safe-area-inset-bottom))`），「私訊詢問」(flex 1) +「預約這段體驗」(flex 1.6)；Footer 底 padding 加到 110px 避免被遮。
- 正式版：「預約」開啟預約詢問表單（寫入 `booking_inquiries`）；「私訊詢問」連到 LINE 官方帳號（env `NEXT_PUBLIC_LINE_URL`）。

### 關於朵朵 `/about`
- 兩欄：左 3:4 形象照佔位（桌面 sticky）+ italic「About Duoduo」；右 H1「我不是天生閃亮，只是決定重新把自己找回來。」+ `about[]` 段落（`>` 開頭的段落用 serif 19px `#8C4A46`）+ 結尾簽名框（上下框線）。

### 新生故事 `/stories`、`/stories/[slug]`
- 列表：介紹 → 3 張卡（3:2 佔位、編號、標題、描述、「閱讀這段故事 →」）→ 分享 CTA 框（含隱私聲明）。
- 詳細頁：四段架構「轉身以前／這一次，我為自己做了／那一天的紀錄／我想留下的一句話」。
- ⚠️ 依品牌文件：**不得預先虛構會員案例**。正式版故事全部來自 Supabase `stories`（`consent_given=true AND published=true`），支援匿名與撤回。3 則範例只作為 seed 的 `draft`。
- 「分享我的轉身故事」→ 表單寫入 `story_submissions`（含必勾同意條款、可選匿名）。

### 朵朵曉語 `/whispers`、`/whispers/[slug]`
- 列表：每列 grid `120px 1fr`（行動 `44px 1fr`）；左大號 Cormorant 編號 `#C9A88E`，右主題／標題／副標；hover 底 `#F7EEEA`。
- 文章頁（max 680px）：主題、H1、副標、內文 blocks（規則見 `content.json._format`）：
  - 小標：serif 22px `#8C4A46` margin-top 28px
  - 引言：serif 19px `#3A2826`，`border-left:2px solid #C9A88E; padding:4px 0 4px 22px`
  - 署名：serif 16px `#8C4A46`
  - 內文：sans 16.5px lh 2.15 `#4E3835`
- 文末「寫給…」信箋框（`#F3E6E0`）＋上一篇／下一篇。
- 正式版：文章存 Supabase `whispers`，`body` 存同格式純文字（或改 Markdown，渲染結果須相同）。

### 一起創造美好 `/partner`
- Hero（`#A35B55`）+ 兩欄：左四段理念（「美麗的魔法師」serif `#8C4A46`），右白底表單：品牌／店家名稱、專業領域（select）、聯絡方式、想對我們說的話 →「送出合作意願」。送出成功顯示「謝謝你，美麗的魔法師／我們會盡快與你聯繫。」。表單寫入 `partner_applications`。

### 品牌收尾（每頁 main 最後，Footer 之前）
`#F3E6E0` 底置中：「妳不需要急著開花。每一朵花，都有自己的花期。」等，見原型 `data-screen-label="品牌收尾"`。

### Footer
`#3A2826` 底；左 Logo + slogan；右導覽；下方 `© 2026 朵朵曉語 Duoduo Whispers · 好好告別`。

## 8. Interactions & Behavior
- 換頁一律 `scrollTo(0,0)`（Next.js 路由預設行為即可）。
- Hover：主要按鈕 `#A35B55 → #8C4A46`；導覽／連結 → `#A9605A`；卡片 opacity .86–.88；心語列表列底色 `#F7EEEA`。無動畫轉場（保持安靜）。
- RWD 斷點：**820px**（<820 行動版：漢堡選單、sticky 取消、Hero Logo 260px、心語列表窄欄、詳細頁底部 CTA）。其餘依 `auto-fit/minmax` 與 `clamp()` 自然流動。
- 表單：zod 驗證必填；送出中按鈕 disabled；失敗顯示 `#8C4A46` 小字錯誤訊息；加 honeypot 欄位防垃圾。
- SEO：每頁 `metadata`（title 格式「頁名｜朵朵曉語」）、OG 圖使用 logo、`lang="zh-Hant-TW"`、sitemap.xml、robots.txt。

## 9. Supabase Schema
完整 SQL 見 `supabase/schema.sql`；seed 由 `content/content.json` 產生（`scripts/seed.ts`）。

## 10. 環境變數
見 `.env.example`（web / api 分開）。

## 11. 實作步驟（給 Claude Code）
1. 建 monorepo（pnpm）：`apps/web`（create-next-app, TS, Tailwind v4, App Router, src/）、`apps/api`（Hono）、`supabase/`、`packages/content`。
2. 把 `content/content.json` 放進 `packages/content`，產生 TS 型別。
3. Tailwind `@theme` 寫入 §6 tokens；`next/font` 載入三種字體。
4. 元件：`SiteHeader`、`MobileMenu`、`SiteFooter`、`BrandClosing`、`PhotoSlot`（比例框＋Storage 圖片，無圖時顯示原型斜紋佔位）、`Button`（primary/outline/onRose）、`SectionEyebrow`、`ExperienceCard`、`WhisperBody`（解析 `##`/`>`/`——`）。
5. 依 §7 逐頁實作；**每頁完成後與原型同寬截圖比對（1440、820、390 三個寬度）**，差異歸零。
6. 套 `supabase/schema.sql`，跑 seed；頁面改為從 Supabase 讀取（失敗時 fallback 到 content.json）。
7. 表單 Server Actions → Supabase；`apps/api` 實作 `/webhooks/supabase`（驗 secret → Resend email + LINE 通知）與 `/health`。
8. 部署：GitHub repo → Vercel（Root `apps/web`）；Railway 新服務（Root `apps/api`，`pnpm --filter api start`）；Supabase 設 Database Webhooks 指向 Railway。
9. GitHub Actions：lint、typecheck、build；`supabase/migrations` 變更時 `supabase db push`。

## 12. Assets
- `assets/logo.jpg`（1024×1536，玫瑰底、粉金色 D 字花瓣 Logo + 中英文字 + slogan）。由品牌方提供。建議請設計師補 **透明底 SVG/PNG 版**（Header、favicon、OG 用）。
- 其餘照片：全部待拍攝／提供，原型以佔位框標示內容。

## 13. Files
```
design_handoff_duoduo_website/
├── README.md                     ← 本文件
├── CLAUDE_CODE_PROMPT.md         ← 直接貼給 Claude Code 的啟動指令
├── .env.example
├── content/content.json          ← 全站文案（逐字）
├── supabase/schema.sql           ← 資料表、RLS、Storage bucket
├── assets/logo.jpg
├── docs/brand-brief-1011.pdf     ← 原始品牌架構與內容文件
└── prototype/
    ├── site.dc.html              ← 視覺 source of truth
    ├── mobile-preview.dc.html
    ├── support.js                ← 僅供原型執行
    └── assets/logo.jpg
```
