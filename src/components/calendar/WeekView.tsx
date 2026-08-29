import Link from "next/link";
import type { EventItem } from "@/lib/db/queries/event";
import { ProjectDot } from "@/components/ProjectDot";
import { formatTimeRange } from "@/lib/format";
import { dayOfMonth } from "@/lib/date";

const WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * 주간 뷰. (기획서 §4.2 "주간 뷰 전환 가능")
 *
 * 월간과 달리 접지 않는다 — 7일치 일정을 제목과 시간까지 전부 편다.
 * 주간 뷰의 값어치는 "이번 주에 뭐가 몇 개나 있나"를 빠짐없이 보는 것이지
 * 격자를 다시 보는 게 아니다.
 * 시간축 그리드는 시간표(4단계)에서 다룬다.
 */
export function WeekView({
  week,
  eventsByDate,
  today,
  selected,
  hrefForDate,
}: {
  week: string[];
  eventsByDate: Map<string, EventItem[]>;
  today: string;
  selected: string | null;
  hrefForDate: (date: string) => string;
}) {
  return (
    <ul className="divide-y divide-c-line rounded-c border border-c-line">
      {week.map((date, i) => {
        const events = eventsByDate.get(date) ?? [];
        const isToday = date === today;
        return (
          <li
            key={date}
            className={date === selected ? "bg-c-surface" : undefined}
          >
            <Link
              href={hrefForDate(date)}
              scroll={false}
              className="flex gap-3 px-3 py-2"
              data-anim
            >
              <div className="w-10 shrink-0 text-center">
                <div className="text-[10px] text-c-text-faint">
                  {WEEKDAY_KO[i]}
                </div>
                <div
                  className={`text-sm tabular-nums ${
                    isToday
                      ? "font-semibold text-c-text-strong"
                      : "text-c-text-muted"
                  }`}
                >
                  {dayOfMonth(date)}
                </div>
              </div>

              {events.length === 0 ? (
                <span className="self-center text-xs text-c-text-faint">—</span>
              ) : (
                <ul className="min-w-0 flex-1 space-y-1 self-center">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-baseline gap-2">
                      <span className="w-24 shrink-0 text-[11px] tabular-nums text-c-text-faint">
                        {formatTimeRange(e.startTime, e.endTime)}
                      </span>
                      <ProjectDot
                        category={e.projectCategory}
                        shade={e.projectShade}
                        size={6}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-c-text-strong">
                        {e.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
