import { createClient, type Client, type InValue } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 서버 전용. 클라이언트 컴포넌트에서 import 하면 빌드가 깨진다.
import "server-only";

/**
 * DB 연결.
 *
 * libSQL 은 로컬 파일(file:)과 Turso(libsql://) 를 같은 API 로 다룬다.
 * 그래서 개발과 배포가 같은 코드로 돌고 주소만 달라진다.
 *
 * Vercel 같은 서버리스에서는 파일 시스템이 읽기 전용이고 요청마다 사라지므로
 * 로컬 파일을 쓸 수 없다. 배포 환경에서는 TURSO_DATABASE_URL 이 반드시 있어야 한다.
 *
 * node:sqlite 대신 libSQL 을 쓰는 대가로 모든 쿼리가 비동기가 된다.
 */

const LOCAL_URL = "file:data/studio.db";
const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

const globalForDb = globalThis as unknown as {
  __studioDb?: Client;
  __studioMigrated?: Promise<void>;
};

function createDb(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      // 여기서 조용히 로컬 파일로 넘어가면 배포된 앱이 매 요청 빈 DB 를 본다.
      // 데이터가 사라진 것처럼 보이는 것보다 시작할 때 죽는 편이 낫다.
      throw new Error(
        "TURSO_DATABASE_URL 이 없습니다. 배포 환경에서는 로컬 파일을 쓸 수 없습니다.",
      );
    }
    return createClient({ url: LOCAL_URL });
  }

  return createClient({ url, authToken });
}

export function getDb(): Client {
  if (!globalForDb.__studioDb) globalForDb.__studioDb = createDb();
  return globalForDb.__studioDb;
}

/* ------------------------------------------------------------- 마이그레이션 */

/** db/migrations/*.sql 을 파일명 순으로, 아직 적용되지 않은 것만 적용한다. */
export async function migrate(db: Client = getDb()): Promise<string[]> {
  await db.execute(`CREATE TABLE IF NOT EXISTS _migration (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const applied = new Set(
    (await db.execute("SELECT name FROM _migration")).rows.map(
      (r) => r.name as string,
    ),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 0001_, 0002_ … 파일명 순서가 곧 적용 순서다

  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // 마이그레이션 전체가 한 배치로 돌아야 중간에 깨지지 않는다.
    await db.executeMultiple(`BEGIN;\n${sql}\nCOMMIT;`);
    await db.execute({
      sql: "INSERT INTO _migration(name) VALUES(?)",
      args: [file],
    });
    ran.push(file);
    console.log(`[db] migrated ${file}`);
  }
  return ran;
}

/**
 * 개발 중에는 첫 쿼리 전에 알아서 적용한다. 스키마를 바꿀 때마다
 * 서버를 껐다 켜야 하는 함정을 없애기 위해서다.
 *
 * 배포 환경에서는 하지 않는다 — 서버리스는 컨테이너가 동시에 여러 개 뜨고,
 * 그것들이 같이 마이그레이션을 시작하면 서로 부딪힌다.
 * 배포 전에 `npm run db:migrate` 를 한 번 돌리는 게 맞다.
 */
function ensureMigrated(): Promise<void> {
  if (process.env.NODE_ENV === "production") return Promise.resolve();
  if (!globalForDb.__studioMigrated) {
    globalForDb.__studioMigrated = migrate().then(() => undefined);
  }
  return globalForDb.__studioMigrated;
}

/* ---------------------------------------------------------------- 쿼리 헬퍼

   행 타입은 DB 컬럼 그대로다(snake_case, 0/1 불리언).
   앱 타입(src/types/domain.ts)으로의 변환은 각 쿼리 모듈이 책임진다. */

type Params = InValue[];

export async function all<T>(sql: string, ...args: Params): Promise<T[]> {
  await ensureMigrated();
  const rs = await getDb().execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function get<T>(
  sql: string,
  ...args: Params
): Promise<T | undefined> {
  const rows = await all<T>(sql, ...args);
  return rows[0];
}

export async function run(sql: string, ...args: Params) {
  await ensureMigrated();
  return getDb().execute({ sql, args });
}

/** 실행하지 않고 들고 다닐 수 있는 한 문장. batch 로 묶을 때 쓴다. */
export interface Stmt {
  sql: string;
  args: Params;
}

/**
 * 여러 쓰기를 한 트랜잭션으로 묶는다. 하나라도 실패하면 전부 되돌아간다.
 *
 * 원격 DB 에서는 왕복 한 번으로 끝나므로, 열어 두고 주고받는 트랜잭션보다
 * 이 편이 빠르고 실수할 여지도 적다. 대신 문장을 미리 다 만들어 두어야 해서
 * id 는 앱에서 생성한다(newId) — 어차피 uuid 라 DB 가 정해 줄 것이 없다.
 */
export async function batch(stmts: Stmt[]) {
  await ensureMigrated();
  return getDb().batch(stmts, "write");
}

/** id 생성 방식을 한 곳에 둔다. */
export function newId(): string {
  return crypto.randomUUID();
}
