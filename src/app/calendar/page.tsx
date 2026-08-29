import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { MonthGrid } from "@/components/calendar/MonthGrid";
import { WeekView } from "@/components/calendar/WeekView";
import { DayPanel } from "@/components/calendar/DayPanel";
import {
  CategoryFilter,
  UNCATEGORIZED,
} from "@/components/calendar/CategoryFilter";

import type { EventItem } from "@/lib/db/queries/event";
import { listDayItems } from "@/lib/dayItems";
import {
  addDaysISO,
  addMonths,
  monthGridDates,
  monthOf,
  todayISO,
  weekOf,
} from "@/lib/date";
import { formatMonthKo } from "@/lib/format";

export const dynamic = "force-dynamic";

type View = "month" | "week";

/** URL 하나가 화면 하나다. 뒤로가기도, 링크 공유도, 새로고침도 그냥 된다. */
interface CalendarState {
  view: View;
  month: string; // 'YYYY-MM' — 월간 뷰의 기준
  day: string | null; // 선택된 날짜
  cats: Set<string>;
}

function buildHref(s: CalendarState): string {
  const q = new URLSearchParams();
  if (s.view !== "month") q.set("v", s.view);
  q.set("m", s.month);
  if (s.day) q.set("d", s.day);
  if (s.cats.size > 0) q.set("c", [...s.cats].join(","));
  return `/calendar?${q.toString()}`;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CalendarPage(props: PageProps<"/calendar">) {
  const sp = await props.searchParams;
  const today = todayISO();

  const view: View = first(sp.v) === "week" ? "week" : "month";
  const day = first(sp.d) ?? null;
  const month = first(sp.m) ?? monthOf(day ?? today);
  const cats = new Set(
    (first(sp.c) ?? "").split(",").filter(Boolean),
  );
  const state: CalendarState = { view, month, day, cats };

  // 주간 뷰의 기준은 선택 날짜(없으면 오늘)다. 월간은 m 이 기준.
  const weekAnchor = day ?? (month === monthOf(today) ? today : `${month}-01`);
  const week = weekOf(weekAnchor);
  const gridDates = monthGridDates(month);

  const from = view === "month" ? gridDates[0] : week[0];
  const to = view === "month" ? gridDates[gridDates.length - 1] : week[6];

  // 필터는 SQL 이 아니라 여기서 건다. 한 달치 일정은 많아야 수십 건이고,
  // "미분류(프로젝트 없음)"를 IN 절로 표현하면 SQL 이 눈에 띄게 지저분해진다.
  const allEvents = listDayItems(from, to);
  const events =
    cats.size === 0
      ? allEvents
      : allEvents.filter((e) =>
          cats.has(e.projectCategory ?? UNCATEGORIZED),
        );

  const eventsByDate = new Map<string, EventItem[]>();
  for (const e of events) {
    const list = eventsByDate.get(e.date);
    if (list) list.push(e);
    else eventsByDate.set(e.date, [e]);
  }

  // 이전/다음 — 월간은 한 달씩, 주간은 한 주씩 움직인다.
  const prev: CalendarState =
    view === "month"
      ? { ...state, month: addMonths(month, -1), day: null }
      : { ...state, day: addDaysISO(week[0], -7) };
  const next: CalendarState =
    view === "month"
      ? { ...state, month: addMonths(month, 1), day: null }
      : { ...state, day: addDaysISO(week[0], 7) };

  const label =
    view === "month"
      ? formatMonthKo(month)
      : `${formatMonthKo(monthOf(week[0]))} ${week[0].slice(8)}–${week[6].slice(8)}일`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <NavButton href={buildHref(prev)} label="이전">
          <ChevronLeft size={15} strokeWidth={1.75} />
        </NavButton>
        <h1 className="min-w-36 text-sm font-semibold text-c-text-strong">
          {label}
        </h1>
        <NavButton href={buildHref(next)} label="다음">
          <ChevronRight size={15} strokeWidth={1.75} />
        </NavButton>

        <Link
          href={buildHref({ ...state, month: monthOf(today), day: today })}
          className="rounded-c border border-c-line px-2 py-1 text-[11px] text-c-text-muted"
          data-anim
        >
          오늘
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {(["month", "week"] as const).map((v) => (
            <Link
              key={v}
              href={buildHref({ ...state, view: v })}
              className={`rounded-c border px-2 py-1 text-[11px] ${
                view === v
                  ? "border-c-line-strong text-c-text-strong"
                  : "border-c-line text-c-text-faint"
              }`}
              data-anim
            >
              {v === "month" ? "월간" : "주간"}
            </Link>
          ))}
        </div>
      </header>

      <div className="mb-3">
        <CategoryFilter
          selected={cats}
          hrefFor={(nextCats) => buildHref({ ...state, cats: nextCats })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {view === "month" ? (
            <MonthGrid
              dates={gridDates}
              month={month}
              eventsByDate={eventsByDate}
              today={today}
              selected={day}
              hrefForDate={(d) => buildHref({ ...state, day: d })}
            />
          ) : (
            <WeekView
              week={week}
              eventsByDate={eventsByDate}
              today={today}
              selected={day}
              hrefForDate={(d) => buildHref({ ...state, day: d })}
            />
          )}
        </div>

        <aside className="min-w-0">
          <DayPanel
            date={day}
            events={day ? (eventsByDate.get(day) ?? []) : []}
            today={today}
          />
        </aside>
      </div>
    </main>
  );
}

function NavButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="rounded-c border border-c-line p-1 text-c-text-muted"
      data-anim
    >
      {children}
    </Link>
  );
}
