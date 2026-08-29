"use server";

import { revalidatePath } from "next/cache";
import { tx } from "@/lib/db/client";
import {
  insertCapture,
  markResolved,
  deleteCapture as removeCapture,
  getCapture,
} from "@/lib/db/queries/capture";
import { insertEvent } from "@/lib/db/queries/event";

/**
 * 사용자가 미리보기에서 확정한 값.
 *
 * 파싱은 브라우저에서 이미 끝났고, 사용자가 Tab 으로 고칠 기회도 가졌다.
 * 그러므로 여기서 다시 파싱하지 않는다 — 확정된 값이 진실이다.
 * raw 만은 손대지 않고 그대로 받는다.
 */
export interface ConfirmedCapture {
  raw: string;
  title: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
}

export async function saveCapture(input: ConfirmedCapture) {
  const raw = input.raw.trim();
  if (!raw) return { ok: false as const, error: "빈 입력" };

  const date = input.date || null;

  tx(() => {
    // 날짜가 없으면 Inbox 에 남는다. 실패가 아니라 정상 상태다.
    const captureId = insertCapture(raw, date ? "resolved" : "inbox");
    if (!date) return;

    insertEvent({
      title: input.title.trim() || raw,
      date,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      allDay: !input.startTime,
      captureId,
    });
  });

  revalidatePath("/");
  return { ok: true as const, kind: date ? ("event" as const) : ("inbox" as const) };
}

/** Inbox 항목에 날짜를 줘서 일정으로 확정한다. */
export async function scheduleInboxItem(
  captureId: string,
  date: string,
  startTime: string | null,
) {
  const capture = getCapture(captureId);
  if (!capture) return { ok: false as const, error: "없는 캡처" };
  if (!date) return { ok: false as const, error: "날짜 없음" };

  tx(() => {
    insertEvent({
      title: capture.rawText,
      date,
      startTime: startTime || null,
      allDay: !startTime,
      captureId,
    });
    markResolved(captureId);
  });

  revalidatePath("/");
  return { ok: true as const };
}

export async function discardCapture(captureId: string) {
  removeCapture(captureId);
  revalidatePath("/");
  return { ok: true as const };
}
