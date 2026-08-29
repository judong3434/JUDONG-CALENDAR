"use server";

import { revalidatePath } from "next/cache";
import { batch } from "@/lib/db/client";
import {
  captureStmt,
  markResolvedStmt,
  deleteCapture as removeCapture,
  getCapture,
} from "@/lib/db/queries/capture";
import { eventStmt } from "@/lib/db/queries/event";

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
  projectId: string | null;
  /** D-day 스트립에 올릴지. 파싱으로 자동 감지하는 건 계획에서 뺐다. */
  isDday: boolean;
}

export async function saveCapture(input: ConfirmedCapture) {
  const raw = input.raw.trim();
  if (!raw) return { ok: false as const, error: "빈 입력" };

  const date = input.date || null;

  // 날짜가 없으면 Inbox 에 남는다. 실패가 아니라 정상 상태다.
  const capture = captureStmt(raw, date ? "resolved" : "inbox");

  if (!date) {
    await batch([capture.stmt]);
  } else {
    const event = eventStmt({
      title: input.title.trim() || raw,
      date,
      startTime: input.startTime || null,
      // 시작 없이 종료만 있는 건 일정이 아니다
      endTime: input.startTime ? input.endTime || null : null,
      allDay: !input.startTime,
      projectId: input.projectId || null,
      isDday: input.isDday,
      captureId: capture.id,
    });
    // 캡처가 먼저 들어가야 event.capture_id 의 외래키가 성립한다
    await batch([capture.stmt, event.stmt]);
  }

  revalidatePath("/", "layout");
  return {
    ok: true as const,
    kind: date ? ("event" as const) : ("inbox" as const),
  };
}

/** Inbox 항목에 날짜를 줘서 일정으로 확정한다. */
export async function scheduleInboxItem(
  captureId: string,
  date: string,
  startTime: string | null,
  endTime: string | null,
) {
  const capture = await getCapture(captureId);
  if (!capture) return { ok: false as const, error: "없는 캡처" };
  if (!date) return { ok: false as const, error: "날짜 없음" };

  const event = eventStmt({
    title: capture.rawText,
    date,
    startTime: startTime || null,
    // 시작 없이 종료만 있는 건 일정이 아니다
    endTime: startTime ? endTime || null : null,
    allDay: !startTime,
    captureId,
  });

  await batch([event.stmt, markResolvedStmt(captureId)]);

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function discardCapture(captureId: string) {
  await removeCapture(captureId);
  revalidatePath("/", "layout");
  return { ok: true as const };
}
