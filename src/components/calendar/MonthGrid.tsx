import Link from "next/link";
import type { EventItem } from "@/lib/db/queries/event";
import { projectColor } from "@/lib/design/category";
import { dayOfMonth, isInMonth } from "@/lib/date";

const WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"];
/** 셀 하나에 제목까지 보여줄 최대 개수. 넘치면 +n 으로 접는다. */
const MAX_VISIBLE = 3;

/**
 * 월간 뷰. CSS Grid 로 직접 짠다. (브리프 「첫 버전에 꼭 필요한 기능 4」)
 *
 * FullCalendar 같은 라이브러리를 쓰지 않는 이유는 스타일 커스텀 자유도다.
 * 7열 그리드 하나면 되는 걸 라이브러리에 맡기면 색·밀도·여백을 되찾는 데
 * 더 오래 걸린다.
 *
 * 좁은 화면에서는 제목을 접고 색 점만 남긴다 — 7열은 폰에서 글자를 담기엔 좁다.
 */
export function MonthGrid({
  dates,
  month,
  eventsByDate,
  today,
  selected,
  hrefForDate,
}: {
  dates: string[];
  month: string;
  eventsByDate: Map<string, EventItem[]>;
  today: string;
  selected: string | null;
  hrefForDate: (date: string) => string;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-c-line pb-1">
        {WEEKDAY_KO.map((w) => (
          <div key={w} className="text-center text-[10px] text-c-text-faint">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-c-line">
        {dates.map((date) => {
          const events = eventsByDate.get(date) ?? [];
          const inMonth = isInMonth(date, month);
          const isToday = date === today;
          const isSelected = date === selected;

          return (
            <Link
              key={date}
              href={hrefForDate(date)}
              scroll={false}
              className={`min-h-20 bg-c-bg p-1 sm:min-h-24 ${
                isSelected ? "outline outline-c-text-muted -outline-offset-1" : ""
              }`}
              data-anim
            >
              <div className="flex justify-center sm:justify-start">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums ${
                    isToday
                      ? "bg-c-text-strong font-semibold text-white"
                      : inMonth
                        ? "text-c-text"
                        : "text-c-text-faint"
                  }`}
                >
                  {dayOfMonth(date)}
                </span>
              </div>

              {/* 좁은 화면: 색 점만 */}
              <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                {events.slice(0, 4).map((e) => (
                  <Dot key={e.id} event={e} />
                ))}
              </div>

              {/* 넓은 화면: 점 + 제목 */}
              <ul className="mt-0.5 hidden sm:block">
                {events.slice(0, MAX_VISIBLE).map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-1 overflow-hidden"
                  >
                    <Dot event={e} />
                    <span
                      className={`truncate text-[11px] ${
                        inMonth ? "text-c-text" : "text-c-text-faint"
                      }`}
                    >
                      {e.title}
                    </span>
                  </li>
                ))}
                {events.length > MAX_VISIBLE && (
                  <li className="pl-2 text-[10px] text-c-text-faint">
                    +{events.length - MAX_VISIBLE}
                  </li>
                )}
              </ul>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Dot({ event }: { event: EventItem }) {
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
        event.projectCategory ? "" : "border border-c-line-strong"
      }`}
      style={
        event.projectCategory
          ? {
              background: projectColor(
                event.projectCategory,
                event.projectShade ?? 1,
              ),
            }
          : undefined
      }
      aria-hidden
    />
  );
}
