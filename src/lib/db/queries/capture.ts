import { all, get, run, newId } from "../client";
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

/** 모든 입력은 일단 여기 남는다. 일정이 됐든 안 됐든. */
export function insertCapture(
  rawText: string,
  status: Capture["status"],
  parsedBy: Capture["parsedBy"] = "rule",
): string {
  const id = newId();
  run(
    "INSERT INTO capture (id, raw_text, status, parsed_by) VALUES (?, ?, ?, ?)",
    id,
    rawText,
    status,
    parsedBy,
  );
  return id;
}

export function markResolved(captureId: string): void {
  run("UPDATE capture SET status = 'resolved' WHERE id = ?", captureId);
}

export function deleteCapture(captureId: string): void {
  run("DELETE FROM capture WHERE id = ?", captureId);
}

export function getCapture(captureId: string): Capture | null {
  const row = get<CaptureRow>("SELECT * FROM capture WHERE id = ?", captureId);
  return row ? toCapture(row) : null;
}

/** Inbox — 아직 아무것에도 귀속되지 않은 캡처. 최근 것이 위로. */
export function listInbox(): Capture[] {
  return all<CaptureRow>(
    "SELECT * FROM capture WHERE status = 'inbox' ORDER BY created_at DESC, rowid DESC",
  ).map(toCapture);
}

/** 배지에 찍을 개수. */
export function inboxCount(): number {
  return (
    get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM capture WHERE status = 'inbox'",
    )?.n ?? 0
  );
}
