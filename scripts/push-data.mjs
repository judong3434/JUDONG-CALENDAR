// 지금 PC 에 있는 데이터를 Turso 로 옮긴다. 한 번만 쓰면 되는 스크립트다.
//
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:push-data
//
// 스키마는 미리 맞춰져 있어야 한다 — 먼저 db:migrate 를 돌릴 것.
// 대상에 이미 같은 id 의 행이 있으면 건너뛴다(INSERT OR IGNORE).
// 그래서 여러 번 돌려도 데이터가 불어나지 않는다.

import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || url.startsWith("file:")) {
  console.error("TURSO_DATABASE_URL 이 필요합니다 (libsql://... 형태)");
  process.exit(1);
}

const local = createClient({ url: "file:data/studio.db" });
const remote = createClient({ url, authToken });

// 외래키 순서대로. 참조되는 쪽이 먼저 들어가야 한다.
const TABLES = [
  "project",
  "semester",
  "capture",
  "event",
  "task",
  "course",
  "log",
];

for (const table of TABLES) {
  let rows;
  try {
    rows = (await local.execute(`SELECT * FROM ${table}`)).rows;
  } catch {
    console.log(`  ${table}: 로컬에 없음 — 건너뜀`);
    continue;
  }
  if (rows.length === 0) {
    console.log(`  ${table}: 0행`);
    continue;
  }

  const cols = Object.keys(rows[0]);
  const placeholders = cols.map(() => "?").join(", ");
  const sql = `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;

  await remote.batch(
    rows.map((r) => ({ sql, args: cols.map((c) => r[c]) })),
    "write",
  );
  console.log(`  ${table}: ${rows.length}행 옮김`);
}

console.log("완료");
local.close();
remote.close();
