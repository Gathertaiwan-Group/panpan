#!/usr/bin/env node
/**
 * 建立（或升級）朵朵曉語後台管理員：Supabase Auth 帳號（email 已驗證、無密碼）＋ panpan.staff(role=admin)。
 * 之後到 /login 輸入這個 Email 收一次性登入連結。
 *
 * 用法（只在本機執行；service role key 不可外流）：
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admin.mjs owner@example.com
 *   （或在 apps/web/.env.local 已設定時：node --env-file=apps/web/.env.local scripts/create-admin.mjs owner@example.com）
 *
 * 規則：
 *   - 已是管理員 → 不動，直接結束
 *   - 這個 Email 已綁定供應商 → 拒絕（請先在管理後台停用該供應商帳號，再手動處理）
 */
const email = String(process.argv[2] ?? "").trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("用法：node scripts/create-admin.mjs <email>");
  process.exit(1);
}
if (!url || !key) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function call(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, body };
}

async function findUserId() {
  for (let page = 1; page <= 50; page++) {
    const r = await call(`/auth/v1/admin/users?page=${page}&per_page=200`);
    if (!r.ok) throw new Error(`列出使用者失敗：HTTP ${r.status}`);
    const users = r.body?.users ?? [];
    const hit = users.find((u) => String(u.email).toLowerCase() === email);
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

async function main() {
  let userId = null;
  const created = await call("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, email_confirm: true }),
  });
  if (created.ok) {
    userId = created.body?.id ?? created.body?.user?.id ?? null;
    console.log(`已建立 Auth 帳號：${email}`);
  } else if (created.status === 422 || /already/i.test(JSON.stringify(created.body))) {
    userId = await findUserId();
    console.log(`Auth 帳號已存在：${email}`);
  } else {
    throw new Error(`建立帳號失敗：HTTP ${created.status} ${JSON.stringify(created.body)}`);
  }
  if (!userId) throw new Error("找不到使用者 id");

  const rest = { "Accept-Profile": "panpan", "Content-Profile": "panpan" };
  const existing = await call(`/rest/v1/staff?user_id=eq.${userId}&select=role,vendor_id,active`, { headers: rest });
  if (!existing.ok) throw new Error(`讀取 staff 失敗：HTTP ${existing.status}`);
  const row = existing.body?.[0];
  if (row?.role === "admin") {
    if (!row.active) {
      const up = await call(`/rest/v1/staff?user_id=eq.${userId}`, {
        method: "PATCH",
        headers: rest,
        body: JSON.stringify({ active: true }),
      });
      if (!up.ok) throw new Error(`重新啟用失敗：HTTP ${up.status}`);
      console.log("已重新啟用管理員。");
    } else {
      console.log("已經是管理員，不需變更。");
    }
    return;
  }
  if (row?.role === "vendor") {
    throw new Error("這個 Email 已綁定供應商，請改用其他 Email。");
  }
  const ins = await call("/rest/v1/staff", {
    method: "POST",
    headers: { ...rest, Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, email, role: "admin", vendor_id: null, active: true }),
  });
  if (!ins.ok) throw new Error(`寫入 staff 失敗：HTTP ${ins.status} ${JSON.stringify(ins.body)}`);
  console.log(`完成：${email} 已設為管理員。請到 /login 輸入 Email 取得登入連結。`);
}

main().catch((err) => {
  console.error("失敗：", err.message);
  process.exit(1);
});
