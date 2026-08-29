/** 화면에 날짜·시간을 찍는 방식을 한 곳에 둔다. 순수 함수 — 서버/클라 결과가 같다. */

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** 2026-09-12 → 9월 12일 (토) */
export function formatDateKo(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const w = WEEKDAY_KO[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${w})`;
}

/** 시작·종료 → 15:00–17:00 / 시간이 없으면 종일 */
export function formatTimeRange(
  start: string | null,
  end: string | null,
): string {
  if (!start) return "종일";
  return end ? `${start}–${end}` : start;
}

/**
 * SQLite 의 datetime('now') 는 'YYYY-MM-DD HH:MM:SS' UTC 다.
 * Z 를 붙이지 않으면 로컬 시각으로 읽혀 9시간이 어긋난다.
 */
export function formatRelative(sqlUtc: string, now: Date = new Date()): string {
  const t = new Date(sqlUtc.replace(" ", "T") + "Z");
  const min = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return `${t.getMonth() + 1}월 ${t.getDate()}일`;
}
