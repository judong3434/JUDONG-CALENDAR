import { all, get, run, newId, type Stmt } from "../client";
import type { Capture } from "@/types/domain";

/** DB 행 그대로. snake_case, 불리언은 0/1. */
interface CaptureRow {
  id: string;
  raw_text: string;
  status: Capture["status"];
  parsed_by: Capture["parsedBy"];
  created_at: string;
}

function toCapture(r: CaptureRow): Capture {
  return {
    id: r.id,
    rawText: r.raw_text,
    status: r.status,
    parsedBy: r.parsed_by,
    createdAt: r.created_at,
  };
}

/**
 * 모든 입력은 일단 여기 남는다. 일정이 됐든 안 됐든.
 *
 * 캡처와 일정은 한 트랜잭션에 같이 들어가야 하므로 문장만 만들어 돌려준다.
 * id 를 함께 주는 이유는, 뒤따르는 문장(event.capture_id)이 그 값을 알아야 해서다.
 */
export function captureStmt(
  rawText: string,
  status: Capture["status"],
  parsedBy: Capture["parsedBy"] = "rule",
): { id: string; stmt: Stmt } {
  const id = newId();
  return {
    id,
    stmt: {
      sql: "INSERT INTO capture (id, raw_text, status, parsed_by) VALUES (?, ?, ?, ?)",
      args: [id, rawText, status, parsedBy],
    },
  };
}

export function markResolvedStmt(captureId: string): Stmt {
  return {
    sql: "UPDATE capture SET status = 'resolved' WHERE id = ?",
    args: [captureId],
  };
}

export async function deleteCapture(captureId: string): Promise<void> {
  await run("DELETE FROM capture WHERE id = ?", captureId);
}

export async function getCapture(captureId: string): Promise<Capture | null> {
  const row = await get<CaptureRow>(
    "SELECT * FROM capture WHERE id = ?",
    captureId,
  );
  return row ? toCapture(row) : null;
}

/** Inbox — 아직 아무것에도 귀속되지 않은 캡처. 최근 것이 위로. */
export async function listInbox(): Promise<Capture[]> {
  const rows = await all<CaptureRow>(
    "SELECT * FROM capture WHERE status = 'inbox' ORDER BY created_at DESC, rowid DESC",
  );
  return rows.map(toCapture);
}

/** 배지에 찍을 개수. */
export async function inboxCount(): Promise<number> {
  const r = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM capture WHERE status = 'inbox'",
  );
  return r?.n ?? 0;
}
