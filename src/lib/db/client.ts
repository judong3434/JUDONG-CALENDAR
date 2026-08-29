import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// 서버 전용. 클라이언트 컴포넌트에서 import 하면 빌드가 깨진다.
import "server-only";

const DATA_DIR = join(process.cwd(), "data");
const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");
const DB_PATH = join(DATA_DIR, "studio.db");

// dev 서버는 HMR 마다 모듈을 다시 평가한다. 그때마다 커넥션을 새로 열면
// 파일 핸들이 쌓이므로 globalThis 에 붙여 재사용한다.
const globalForDb = globalThis as unknown as { __studioDb?: DatabaseSync };

function applyMigrations(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migration (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const applied = new Set(
    (db.prepare("SELECT name FROM _migration").all() as { name: string }[]).map(
      (r) => r.name,
    ),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 0001_, 0002_ … 파일명 순서가 곧 적용 순서다

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // 마이그레이션 전체가 한 트랜잭션 안에서 돌아야 중간에 깨지지 않는다.
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO _migration(name) VALUES(?)").run(file);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error(`마이그레이션 실패: ${file}\n${String(err)}`);
    }
    console.log(`[db] migrated ${file}`);
  }
}

function open(): DatabaseSync {
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  // WAL: 읽기와 쓰기가 서로를 막지 않는다. 폰과 PC 가 동시에 열어도 안전.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  applyMigrations(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__studioDb) {
    globalForDb.__studioDb = open();
    return globalForDb.__studioDb;
  }

  // 커넥션은 globalThis 에 살아 있어서 HMR 로는 다시 열리지 않는다.
  // 그래서 새 마이그레이션 파일을 추가해도 dev 서버를 껐다 켜기 전에는
  // 적용되지 않고 "no such table" 만 나온다.
  // 개발 중에는 매번 확인한다 — readdir 한 번과 SELECT 한 번이고,
  // 이미 적용된 파일은 곧바로 건너뛴다.
  if (process.env.NODE_ENV !== "production") {
    applyMigrations(globalForDb.__studioDb);
  }
  return globalForDb.__studioDb;
}

/* ---------------------------------------------------------------------------
   쿼리 헬퍼

   node:sqlite 의 all()/get() 은 Record<string, SQLOutputValue> 를 돌려주므로
   호출부마다 이중 캐스팅이 필요하다. 그 캐스팅을 여기 세 함수에만 가둔다.
   호출부에서는 as 를 쓰지 말 것 — 대신 제네릭으로 행 타입을 넘긴다.

   행 타입은 DB 컬럼 그대로다(snake_case, 0/1 불리언).
   앱 타입(src/types/domain.ts)으로의 변환은 각 쿼리 모듈이 책임진다.
--------------------------------------------------------------------------- */

type Params = SQLInputValue[];

export function all<T>(sql: string, ...params: Params): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}

export function get<T>(sql: string, ...params: Params): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}

export function run(sql: string, ...params: Params) {
  return getDb().prepare(sql).run(...params);
}

/** 여러 쓰기를 한 트랜잭션으로 묶는다. */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** id 생성 방식을 한 곳에 둔다. */
export function newId(): string {
  return crypto.randomUUID();
}
