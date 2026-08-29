/**
 * 한국어 날짜·시간 규칙 파서
 *
 * 브리프 「만드는 순서 ①」 — 이 단계의 파싱은 날짜/시간까지다.
 * 카테고리 매칭·D-day 플래그·러닝 기록은 파싱 고도화 단계에서 붙인다.
 *
 * 원칙: 완벽한 파싱을 목표로 하지 않는다. 못 읽으면 null 을 돌려주고,
 * 그 캡처는 Inbox 로 간다. 그건 오류가 아니라 정상 상태다.
 *
 * 서버·브라우저 양쪽에서 돌아야 한다(입력 중 미리보기는 브라우저에서).
 * 따라서 이 파일은 DB 도 Node API 도 import 하지 않는다. 순수 함수만.
 */

export interface Span {
  start: number;
  end: number;
}

export interface DateMatch {
  /** 'YYYY-MM-DD' */
  date: string;
  span: Span;
}

export interface TimeMatch {
  /** 'HH:MM' */
  startTime: string;
  endTime: string | null;
  span: Span;
}

/* ------------------------------------------------------------------ 날짜 유틸
   전부 로컬 타임존 기준으로 계산한다.
   toISOString() 은 UTC 로 바꾸므로 절대 쓰지 않는다 — 한국에서 오전 9시 이전에
   입력하면 날짜가 하루 밀린다. */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** 그 주의 월요일. 한국에서 "이번 주"는 월요일에 시작한다. */
function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=일
  return addDays(d, day === 0 ? -6 : 1 - day);
}

/**
 * 월/일만 주어졌을 때 연도를 정한다.
 * 지금보다 3개월 이상 과거면 내년으로 본다.
 * 12월에 "1/5"라고 치면 내년 1월이지 지난 1월이 아니다.
 */
function resolveYear(now: Date, month: number, day: number): number {
  const y = now.getFullYear();
  const candidate = new Date(y, month - 1, day);
  const threeMonthsAgo = addDays(now, -90);
  return candidate < threeMonthsAgo ? y + 1 : y;
}

function isValidMD(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return true;
}

/* --------------------------------------------------------------- 날짜 매처
   위에서부터 순서대로 시도한다. 구체적인 패턴이 먼저 와야 한다.
   ("다음주 화"가 "화"보다 먼저, "2026-09-12"가 "9/12"보다 먼저) */

const WEEKDAY: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

const WEEK_OFFSET: Record<string, number> = {
  이번: 0,
  금: 0,
  다음: 1,
  담: 1,
  차: 1,
  다다음: 2,
};

const RELATIVE_DAY: Record<string, number> = {
  그저께: -2,
  그제: -2,
  어제: -1,
  오늘: 0,
  낼: 1,
  내일: 1,
  모레: 2,
  글피: 3,
};

interface DateRule {
  re: RegExp;
  resolve: (m: RegExpExecArray, now: Date) => Date | null;
}

const DATE_RULES: DateRule[] = [
  // 2026-09-12 / 2026.9.12 / 2026/9/12
  {
    re: /(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})(?![\d:])/,
    resolve: (m) => {
      const [y, mo, d] = [+m[1], +m[2], +m[3]];
      return isValidMD(mo, d) ? new Date(y, mo - 1, d) : null;
    },
  },
  // 9월 12일
  {
    re: /(\d{1,2})\s*월\s*(\d{1,2})\s*일?/,
    resolve: (m, now) => {
      const [mo, d] = [+m[1], +m[2]];
      if (!isValidMD(mo, d)) return null;
      return new Date(resolveYear(now, mo, d), mo - 1, d);
    },
  },
  // 9/12 · 9.12 — 앞뒤에 숫자가 붙으면(8.5km, 15:00) 매치하지 않는다
  {
    re: /(?<![\d:.\/])(\d{1,2})[\/.](\d{1,2})(?![\d:.\/])/,
    resolve: (m, now) => {
      const [mo, d] = [+m[1], +m[2]];
      if (!isValidMD(mo, d)) return null;
      return new Date(resolveYear(now, mo, d), mo - 1, d);
    },
  },
  // 오늘 · 내일 · 모레 …
  {
    re: new RegExp(`(${Object.keys(RELATIVE_DAY).join("|")})`),
    resolve: (m, now) => addDays(now, RELATIVE_DAY[m[1]]),
  },
  // 다음주 화 · 이번 주 목요일 · 담주 금
  {
    re: /(다다음|다음|담|차|이번|금)\s*주\s*([일월화수목금토])(?:요일)?/,
    resolve: (m, now) => {
      const monday = startOfWeek(now);
      const js = WEEKDAY[m[2]];
      // 월요일 시작 기준 오프셋: 일요일은 그 주의 마지막 날이다
      const within = js === 0 ? 6 : js - 1;
      return addDays(monday, WEEK_OFFSET[m[1]] * 7 + within);
    },
  },
  // 요일 없이 "다음주"만 → 그 주 월요일
  {
    re: /(다다음|다음|담|차|이번|금)\s*주/,
    resolve: (m, now) =>
      addDays(startOfWeek(now), WEEK_OFFSET[m[1]] * 7),
  },
  // "화요일" 단독 → 오늘 포함, 다가오는 그 요일
  {
    re: /([일월화수목금토])요일/,
    resolve: (m, now) => addDays(now, (WEEKDAY[m[1]] - now.getDay() + 7) % 7),
  },
  // 3일 뒤 · 2주 후
  {
    re: /(\d{1,3})\s*(일|주)\s*(뒤|후)/,
    resolve: (m, now) => addDays(now, +m[1] * (m[2] === "주" ? 7 : 1)),
  },
  // D-30 · D30 — 30일 남았다는 뜻
  {
    re: /\bD\s*-?\s*(\d{1,3})\b/i,
    resolve: (m, now) => addDays(now, +m[1]),
  },
];

export function matchDate(text: string, now: Date): DateMatch | null {
  for (const rule of DATE_RULES) {
    const m = rule.re.exec(text);
    if (!m) continue;
    const d = rule.resolve(m, now);
    if (!d) continue; // 규칙은 맞았지만 값이 말이 안 됨 (13월 등) → 다음 규칙으로
    return {
      date: toISODate(d),
      span: { start: m.index, end: m.index + m[0].length },
    };
  }
  return null;
}

/* --------------------------------------------------------------- 시간 매처 */

/** 오전/오후를 붙였을 때의 24시간제 값 */
function applyMeridiem(hour: number, meridiem: string | undefined): number {
  if (hour > 23) return NaN;
  switch (meridiem) {
    case "오전":
    case "아침":
      return hour === 12 ? 0 : hour;
    case "새벽":
      return hour === 12 ? 0 : hour; // 새벽 2시 = 02:00
    case "오후":
    case "저녁":
    case "밤":
    case "점심":
    case "낮":
      return hour < 12 ? hour + 12 : hour;
    default:
      // 오전/오후 표기가 없을 때.
      // "3시"는 오후 3시, "10시"는 오전 10시로 읽는 게 이 사용자의 하루에 맞다.
      // (기획서 예시: "9/12 3시 …" → 15:00, "내일 10시 …" → 10:00)
      return hour >= 1 && hour <= 7 ? hour + 12 : hour;
  }
}

function hhmm(hour: number, minute: number): string | null {
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * 시간 규칙.
 *
 * 정규식은 반드시 리터럴로 쓴다. new RegExp + 템플릿 리터럴 조합은
 * 백슬래시를 두 번 이스케이프해야 해서 `\s` 가 조용히 `s` 로 죽는다.
 * 오전/오후 목록이 중복되더라도 리터럴이 안전하다.
 */
interface TimeRule {
  re: RegExp;
  resolve: (m: RegExpExecArray) => { start: string; end: string | null } | null;
}

const TIME_RULES: TimeRule[] = [
  // 15:00-16:00 · 15:00 ~ 16:30
  {
    re: /(\d{1,2}):(\d{2})\s*(?:~|-|–|부터)\s*(\d{1,2}):(\d{2})/,
    resolve: (m) => {
      const start = hhmm(+m[1], +m[2]);
      const end = hhmm(+m[3], +m[4]);
      return start ? { start, end } : null;
    },
  },
  // 오후 3-5시 · 3시~5시 · 저녁 7시부터 9시까지
  {
    re: /(?:(오전|오후|아침|점심|저녁|밤|새벽|낮)\s*)?(\d{1,2})\s*시?\s*(?:~|-|–|부터)\s*(\d{1,2})\s*시(?:까지)?/,
    resolve: (m) => {
      const h1 = applyMeridiem(+m[2], m[1]);
      const start = hhmm(h1, 0);
      if (!start) return null;
      // 끝 시각은 시작의 오전/오후를 따라간다. 그래도 앞서면 12시간 더한다.
      let h2 = applyMeridiem(+m[3], m[1]);
      if (h2 < h1 && h2 + 12 <= 23) h2 += 12;
      return { start, end: hhmm(h2, 0) };
    },
  },
  // 15:00 · 9:30
  {
    re: /(?<![\d.])(\d{1,2}):(\d{2})(?![\d:])/,
    resolve: (m) => {
      const start = hhmm(+m[1], +m[2]);
      return start ? { start, end: null } : null;
    },
  },
  // 오후 3시 30분 · 3시반 · 저녁 7시
  {
    re: /(?:(오전|오후|아침|점심|저녁|밤|새벽|낮)\s*)?(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분|(반))?/,
    resolve: (m) => {
      const minute = m[4] ? 30 : m[3] ? +m[3] : 0;
      const start = hhmm(applyMeridiem(+m[2], m[1]), minute);
      return start ? { start, end: null } : null;
    },
  },
];

export function matchTime(text: string, skip?: Span): TimeMatch | null {
  // 날짜로 이미 소비된 구간은 공백으로 가려서 다시 읽지 않게 한다.
  const target = skip
    ? text.slice(0, skip.start) +
      " ".repeat(skip.end - skip.start) +
      text.slice(skip.end)
    : text;

  for (const rule of TIME_RULES) {
    const m = rule.re.exec(target);
    if (!m) continue;
    const r = rule.resolve(m);
    if (!r) continue;
    return {
      startTime: r.start,
      endTime: r.end,
      span: { start: m.index, end: m.index + m[0].length },
    };
  }
  return null;
}
