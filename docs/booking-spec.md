# 線上預約＋付款＋供應商後台 規格（2026-10-17）

## 業主已拍板的決策
1. **時段由供應商自己設定**：每家供應商在後台設「每週可接時段」＋單日請假／加開。
2. **每個體驗 SET 綁一家主供應商**：客人選一個時段，主供應商負責協調其他合作者（如攝影）。
3. **付款完成即確認**：不需供應商再按確認。
4. **線上付全額**，金流 **PChomePay 支付連**，收款主體＝給樂行銷（與給樂官網同一組商店金鑰）。
5. **價格、時長由管理後台填寫**；未設定價格／時長／供應商的 SET 不開放線上預約（維持原「預約詢問」表單）。

## 參考實作
- 預約（時段模型、create_booking RPC、防重、前台步驟、手機結帳列）：`~/.gemini/File/Tinna`（`supabase/migrations/0001_init.sql`、`0003_review_fixes.sql`、`apps/api/src/lib/availability.ts`、`apps/web/components/booking/*`）。Tinna 是單一老師＋綠界；本案是多供應商＋PChomePay。
- PChomePay：`~/.gemini/File/gather-landing/lib/pchomepay.ts`、`lib/payment.ts`（notify 無簽章 → 一律 GET 回查；status_code ∈ {S,00,1} = paid；金額比對；最低 NT$30）。
- 供應商專區隔離思路：DT 會議室（角色＋外鍵隔離、對外簡化狀態）；本案用 Postgres RLS／view 實作，不用投影集合。

## 角色
- **管理員**（業主兩人）：管理供應商、SET 設定、看全部預約、手動標記取消／已退款。
- **供應商**：只看得到自己 SET 的預約；設定自己的時段。
- 登入：Supabase Auth Email 一次性登入連結（magic link），**不開放自行註冊**，帳號由管理員建立。

## 不做（本階段）
- 自動退款（退款在 PChomePay 後台手動做，後台只記錄狀態）
- 電子發票自動開立
- 客人帳號／會員中心
