// db/migrations/*.sql 을 적용한다.
//
//   npm run db:migrate            → 로컬 파일(data/studio.db)
//   TURSO_DATABASE_URL=... npm run db:migrate   → Turso
//
// 앱 코드(src/lib/db/client.ts)를 import 하지 않는다.
// 마이그레이션 러너는 앱이 부팅되지 않는 상태에서도 돌아야 하고,
// 그러려면 앱의 모듈 그래프(server-only, 경로 별칭, 번들러 설정)에
// 기대지 않는 편이 낫다.

import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL ?? "file:data/studio.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const dir = join(process.cwd(), "db", "migrations");

const db = createClient(authToken ? { url, authToken } : { url });
console.log(`[db] ${url.startsWith("file:") ? url : "Turso"}`);

await db.execute(`CREATE TABLE IF NOT EXISTS _migration (
  name       TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);

const applied = new Set(
  (await db.execute("SELECT name FROM _migration")).rows.map((r) => r.name),
);

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  - ${file} (이미 적용됨)`);
    continue;
  }
  const sql = readFileSync(join(dir, file), "utf8");
  await db.executeMultiple(`BEGIN;\n${sql}\nCOMMIT;`);
  await db.execute({
    sql: "INSERT INTO _migration(name) VALUES(?)",
    args: [file],
  });
  console.log(`  + ${file}`);
  count++;
}

console.log(count === 0 ? "적용할 마이그레이션 없음" : `${count}개 적용됨`);
db.close();
