import { matchDate, matchTime, type Span } from "./datetime.ts";

export type { Span } from "./datetime.ts";
export { toISODate } from "./datetime.ts";

export interface ParseResult {
  /** 사용자가 실제로 친 문장. 절대 가공하지 않는다. */
  raw: string;
  /** 날짜·시간 표현을 걷어낸 나머지. 비면 raw 를 그대로 쓴다. */
  title: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  /**
   * event — 날짜를 읽었다. 일정으로 확정할 수 있다.
   * inbox — 날짜가 없다. 실패가 아니라 정상 상태다. 나중에 배치한다.
   */
  kind: "event" | "inbox";
  /** 원문에서 날짜·시간으로 소비된 구간. 미리보기에서 밑줄을 긋는 데 쓴다. */
  spans: Span[];
}

/** 소비된 구간을 걷어내고 남은 텍스트를 제목으로 만든다. */
function extractTitle(raw: string, spans: Span[]): string {
  let out = raw;
  // 뒤에서부터 잘라야 앞쪽 인덱스가 밀리지 않는다.
  for (const s of [...spans].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, s.start) + " " + out.slice(s.end);
  }
  return out
    .replace(/\s+/g, " ")
    // 날짜를 걷어내면 남는 조사·구분자 찌꺼기 (" · 시안 제출", "- 발표")
    .replace(/^[\s·,./~\-–—:|]+|[\s·,./~\-–—:|]+$/g, "")
    .trim();
}

/**
 * 한 줄 입력을 일정 초안으로 만든다.
 *
 * 브라우저(입력 중 미리보기)와 서버 양쪽에서 호출된다.
 * `now` 를 인자로 받는 이유는 테스트 때문이기도 하고,
 * "오늘/내일"의 기준이 호출한 쪽 시계여야 하기 때문이다.
 */
export function parseCapture(raw: string, now: Date = new Date()): ParseResult {
  const text = raw.trim();
  const spans: Span[] = [];

  const d = matchDate(text, now);
  if (d) spans.push(d.span);

  const t = matchTime(text, d?.span);
  if (t) spans.push(t.span);

  const title = extractTitle(text, spans);

  return {
    raw: text,
    title: title || text,
    date: d?.date ?? null,
    startTime: t?.startTime ?? null,
    endTime: t?.endTime ?? null,
    // 날짜는 있는데 시간이 없으면 종일 일정이다.
    allDay: Boolean(d) && !t,
    kind: d ? "event" : "inbox",
    spans,
  };
}
