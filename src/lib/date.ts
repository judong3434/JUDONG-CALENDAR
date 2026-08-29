// 상대 경로 + 확장자: Next 와 `node --test` 양쪽에서 로드되는 파일이라
// tsconfig 의 @/ alias 를 쓸 수 없다.
import { toISODate } from "./parse/index.ts";

/**
 * 날짜 계산. format.ts 가 "어떻게 보여줄까"라면 여기는 "며칠 남았나"다.
 *
 * 전부 'YYYY-MM-DD' 문자열을 주고받는다. Date 객체를 넘기지 않는 이유:
 * DB 도 문자열이고, 비교도 문자열로 되고(사전순 = 시간순),
 * 무엇보다 타임존 실수를 할 여지가 사라진다.
 */

export { toISODate };

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** 'YYYY-MM-DD' → 그 날 자정의 로컬 Date */
function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** to − from, 일 단위. 자정 기준이라 서머타임/시분초에 흔들리지 않는다. */
export function diffDays(from: string, to: string): number {
  const ms = fromISO(to).getTime() - fromISO(from).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * D-3 · D-DAY · D+2
 * 지난 것은 D+ 로 표시한다. 마감이 지났다는 사실 자체가 정보다.
 */
export function ddayLabel(target: string, today: string): string {
  const n = diffDays(today, target);
  if (n === 0) return "D-DAY";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

/** 그 날이 속한 주의 월요일부터 일요일까지 7일. */
export function weekOf(iso: string): string[] {
  const d = fromISO(iso);
  const day = d.getDay(); // 0=일
  const monday = addDaysISO(iso, day === 0 ? -6 : 1 - day);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

/** 'YYYY-MM-DD' → 일(day) 숫자만. 미니 캘린더용. */
export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}
