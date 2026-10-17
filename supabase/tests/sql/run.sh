#!/usr/bin/env bash
# 用真的（拋棄式）Postgres 驗證 supabase/migrations：依序套用全部 migration → 權限／RPC／併發測試。
#
#   DATABASE_URL=postgres://postgres@localhost:55432/panpan_test bash supabase/tests/sql/run.sh
#
# DATABASE_URL 必須是拋棄式資料庫、以 superuser 連線（會建立 Supabase 角色與 auth/storage 假 schema、dblink）。
# 為避免誤跑到正式／共用資料庫：已有 panpan schema 或 hank schema 就拒絕執行。
set -euo pipefail
: "${DATABASE_URL:?請設定 DATABASE_URL（拋棄式 Postgres）}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q)

if [ "$("${PSQL[@]}" -Atc "select to_regnamespace('panpan') is not null or to_regnamespace('hank') is not null")" = "t" ]; then
  echo "拒絕執行：這個資料庫已經有 panpan／hank schema，請改用拋棄式資料庫" >&2
  exit 1
fi

echo "▶ $("${PSQL[@]}" -Atc 'select version()')"
"${PSQL[@]}" -f "$HERE/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "▶ migration $(basename "$f")"
  # 與 scripts/apply-migrations.mjs 一樣整支包在單一交易
  { echo "begin;"; cat "$f"; echo; echo "commit;"; } | PGOPTIONS='-c client_min_messages=warning' "${PSQL[@]}"
done

for f in "$HERE"/[1-9]*.sql; do
  echo "▶ $(basename "$f")"
  "${PSQL[@]}" -v c2conn="${DBLINK_CONN:-}" -f "$f" 2>&1 \
    | sed -n -e 's/.*NOTICE:  /  /p' -e '/ERROR:/p' -e '/DETAIL:/p' -e '/CONTEXT:/p'
done
echo "✔ SQL 測試全部通過"
