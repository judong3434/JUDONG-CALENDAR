// 브리프 §2 데이터 구조에 대응하는 타입.
// DB 스키마(db/migrations/0001_init.sql)와 1:1 로 맞춘다.
// SQLite 에는 boolean 이 없으므로 DB 행 타입은 0/1, 앱 타입은 boolean 으로 나눈다.

/** 색상(hue)을 결정하는 상위 분류. 화면 전체가 이 6색으로 읽힌다. */
export const CATEGORIES = [
  "school",
  "personal",
  "contest",
  "club",
  "work",
  "routine",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type ProjectStatus = "active" | "waiting" | "done";

export type CaptureStatus = "inbox" | "resolved" | "archived";

export interface Project {
  id: string;
  name: string;
  category: Category;
  /** 같은 카테고리 안에서 프로젝트를 구분하는 명도 단계. 1이 가장 진하다. */
  shade: 1 | 2 | 3 | 4;
  status: ProjectStatus;
  dueDate: string | null; // 'YYYY-MM-DD'
  stage: string | null;
  sortOrder: number;
}

export interface Capture {
  id: string;
  /** 사용자가 실제로 친 문장. 가공하지 않는다. */
  rawText: string;
  status: CaptureStatus;
  parsedBy: "rule" | "llm" | null;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string; // 'YYYY-MM-DD'
  startTime: string | null; // 'HH:MM'
  endTime: string | null;
  allDay: boolean;
  projectId: string | null;
  location: string | null;
  isDday: boolean;
  memo: string | null;
  captureId: string | null;
}

export interface Task {
  id: string;
  title: string;
  /** 언제 할 것인가. 오늘의 To-do 는 이 값이 오늘인 Task 다. */
  doDate: string | null;
  estMinutes: number | null;
  eventId: string | null;
  projectId: string | null;
  done: boolean;
  doneAt: string | null;
  sortOrder: number;
  captureId: string | null;
}

export interface Course {
  id: string;
  name: string;
  /** 0=일 … 6=토. JS Date.getDay() 와 동일. */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  semester: string;
  semesterStart: string;
  semesterEnd: string;
  projectId: string | null;
}

export interface Log {
  id: string;
  kind: string;
  date: string;
  distanceM: number | null;
  durationSec: number | null;
  memo: string | null;
  captureId: string | null;
}
