import { all, run, newId } from "../client";
import type { Category, Event } from "@/types/domain";

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

/** 화면에 찍으려면 소속 프로젝트의 색이 필요하다. */
export interface EventItem extends Event {
  projectName: string | null;
  projectCategory: Category | null;
  projectShade: number | null;
  /**
   * 시간표에서 전개된 수업도 같은 자리에 얹힌다.
   * 수업은 실제 event 행이 아니라 계산된 인스턴스라 지우거나 고칠 수 없다 —
   * 화면에서 그걸 구분하는 데 쓴다.
   */
  kind: "event" | "course";
}

type EventItemRow = EventRow & {
  project_name: string | null;
  project_category: Category | null;
  project_shade: number | null;
};

function toEventItem(r: EventItemRow): EventItem {
  return {
    ...toEvent(r),
    kind: "event",
    projectName: r.project_name,
    projectCategory: r.project_category,
    projectShade: r.project_shade,
  };
}

const EVENT_SELECT = `
  SELECT e.*,
         p.name     AS project_name,
         p.category AS project_category,
         p.shade    AS project_shade
    FROM event e
    LEFT JOIN project p ON p.id = e.project_id
`;

export interface NewEvent {
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  allDay?: boolean;
  projectId?: string | null;
  isDday?: boolean;
  captureId?: string | null;
}

export function insertEvent(e: NewEvent): string {
  const id = newId();
  run(
    `INSERT INTO event
       (id, title, date, start_time, end_time, all_day, project_id, is_dday, capture_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    e.title,
    e.date,
    e.startTime ?? null,
    e.endTime ?? null,
    // 시간이 없으면 종일 일정으로 본다
    (e.allDay ?? !e.startTime) ? 1 : 0,
    e.projectId ?? null,
    e.isDday ? 1 : 0,
    e.captureId ?? null,
  );
  return id;
}

/** 오늘의 일정 — 시간순 타임라인. 종일 일정이 맨 위. */
export function listEventsOn(date: string): EventItem[] {
  return all<EventItemRow>(
    `${EVENT_SELECT}
      WHERE e.date = ?
      ORDER BY e.start_time IS NULL DESC, e.start_time`,
    date,
  ).map(toEventItem);
}

/**
 * D-day 스트립 — 가까운 순. 지난 것은 자동으로 빠진다.
 * (기획서 §4.1 ③ "지난 건 자동으로 사라짐")
 */
export function listUpcomingDdays(today: string, limit = 12): EventItem[] {
  return all<EventItemRow>(
    `${EVENT_SELECT}
      WHERE e.is_dday = 1 AND e.date >= ?
      ORDER BY e.date
      LIMIT ?`,
    today,
    limit,
  ).map(toEventItem);
}

/** 캘린더 — 기간 안의 일정 전부. 날짜순, 같은 날은 종일이 먼저. */
export function listEventsInRange(from: string, to: string): EventItem[] {
  return all<EventItemRow>(
    `${EVENT_SELECT}
      WHERE e.date BETWEEN ? AND ?
      ORDER BY e.date, e.start_time IS NULL DESC, e.start_time`,
    from,
    to,
  ).map(toEventItem);
}

/** 이번 주 미니 캘린더 — 날짜별로 색 점만 찍는다. 상세는 캘린더 탭에서. */
export interface DayDot {
  date: string;
  category: Category | null;
  shade: number | null;
}

export function listEventDots(from: string, to: string): DayDot[] {
  return all<{ date: string; category: Category | null; shade: number | null }>(
    `SELECT e.date, p.category, p.shade
       FROM event e LEFT JOIN project p ON p.id = e.project_id
      WHERE e.date BETWEEN ? AND ?
      ORDER BY e.date, e.start_time IS NULL DESC, e.start_time`,
    from,
    to,
  );
}

export function getEvent(id: string): Event | null {
  const rows = all<EventRow>("SELECT * FROM event WHERE id = ?", id);
  return rows.length > 0 ? toEvent(rows[0]) : null;
}

export function setEventProject(id: string, projectId: string | null): void {
  run(
    "UPDATE event SET project_id = ?, updated_at = datetime('now') WHERE id = ?",
    projectId,
    id,
  );
}

export function deleteEvent(id: string): void {
  run("DELETE FROM event WHERE id = ?", id);
}
