import { all, run, newId } from "../client";
import type { Event } from "@/types/domain";

interface EventRow {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: number;
  project_id: string | null;
  location: string | null;
  is_dday: number;
  memo: string | null;
  capture_id: string | null;
}

function toEvent(r: EventRow): Event {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    allDay: r.all_day === 1,
    projectId: r.project_id,
    location: r.location,
    isDday: r.is_dday === 1,
    memo: r.memo,
    captureId: r.capture_id,
  };
}

export interface NewEvent {
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  allDay?: boolean;
  captureId?: string | null;
}

export function insertEvent(e: NewEvent): string {
  const id = newId();
  run(
    `INSERT INTO event (id, title, date, start_time, end_time, all_day, capture_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    e.title,
    e.date,
    e.startTime ?? null,
    e.endTime ?? null,
    // 시간이 없으면 종일 일정으로 본다
    (e.allDay ?? !e.startTime) ? 1 : 0,
    e.captureId ?? null,
  );
  return id;
}

/**
 * 임시 조회. 1단계에서는 캘린더도 대시보드도 없어서 저장된 일정을 볼 곳이 없다.
 * 2단계(홈 대시보드)에서 날짜 기준 조회로 교체된다.
 */
export interface EventWithRaw extends Event {
  /** 이 일정을 만든 원본 한 줄. 정제된 제목보다 이게 기억을 되살린다. */
  rawText: string | null;
}

export function listRecentEvents(limit = 20): EventWithRaw[] {
  return all<EventRow & { raw_text: string | null }>(
    `SELECT e.*, c.raw_text
       FROM event e
       LEFT JOIN capture c ON c.id = e.capture_id
      ORDER BY e.date DESC, e.start_time IS NULL, e.start_time DESC
      LIMIT ?`,
    limit,
  ).map((r) => ({ ...toEvent(r), rawText: r.raw_text }));
}

export function deleteEvent(id: string): void {
  run("DELETE FROM event WHERE id = ?", id);
}
