import type { DayDot } from "@/lib/db/queries/event";
import { projectColor } from "@/lib/design/category";
import { dayOfMonth } from "@/lib/date";

const WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"];
const MAX_DOTS = 4;

/**
 * 이번 주 미니 캘린더. (기획서 §4.1 ⑤)
 * 7일 스트립. 날짜별로 일정 개수와 색만 점으로 찍는다 — 상세는 캘린더 탭에서.
 */
export function WeekStrip({
  week,
  dots,
  today,
}: {
  week: string[];
  dots: DayDot[];
  today: string;
}) {
  const byDate = new Map<string, DayDot[]>();
  for (const d of dots) {
    const list = byDate.get(d.date);
    if (list) list.push(d);
    else byDate.set(d.date, [d]);
  }

  return (
    <ul className="grid grid-cols-7 gap-1">
      {week.map((date, i) => {
        const dayDots = byDate.get(date) ?? [];
        const isToday = date === today;
        return (
          <li
            key={date}
            className={`rounded-c border px-1 py-2 text-center ${
              isToday ? "border-c-text-muted" : "border-c-line"
            }`}
          >
            <div className="text-[10px] text-c-text-faint">{WEEKDAY_KO[i]}</div>
            <div
              className={`text-sm tabular-nums ${
                isToday
                  ? "font-semibold text-c-text-strong"
                  : "text-c-text-muted"
              }`}
            >
              {dayOfMonth(date)}
            </div>
            {/* 점은 최대 4개까지. 그 이상은 개수로 대신한다. */}
            <div className="mt-1 flex h-2 items-center justify-center gap-0.5">
              {dayDots.slice(0, MAX_DOTS).map((d, j) => (
                <span
                  key={j}
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: d.category
                      ? projectColor(d.category, d.shade ?? 1)
                      : "var(--color-c-line-strong)",
                  }}
                  aria-hidden
                />
              ))}
              {dayDots.length > MAX_DOTS && (
                <span className="text-[9px] leading-none text-c-text-faint">
                  +{dayDots.length - MAX_DOTS}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
