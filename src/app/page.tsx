import { QuickCapture } from "@/components/QuickCapture";
import { InboxList } from "@/components/InboxList";
import { TodoList } from "@/components/dashboard/TodoList";
import { TodayEvents } from "@/components/dashboard/TodayEvents";
import { DdayStrip } from "@/components/dashboard/DdayStrip";
import { ProjectBoard } from "@/components/dashboard/ProjectBoard";
import { WeekStrip } from "@/components/dashboard/WeekStrip";

import { inboxCount, listInbox } from "@/lib/db/queries/capture";
import { listEventDots, listEventsOn, listUpcomingDdays } from "@/lib/db/queries/event";
import { listProjectCards, listProjectOptions } from "@/lib/db/queries/project";
import { countOpenTasksByProject, listTodayTasks } from "@/lib/db/queries/task";
import { todayISO, weekOf } from "@/lib/date";
import { formatDateKo } from "@/lib/format";

/**
 * 홈 — 상황판. (기획서 §4.1)
 *
 * 일정 목록이 아니라 대시보드다. "프로젝트가 눈에 보여야 안심이 된다"는
 * 기능 요구가 아니라 감정 요구고, 그래서 첫 화면에서 전부 보여야 한다.
 * 여기 있는 어떤 정보도 탭 뒤에 숨기지 않는다.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  // 하루의 기준을 한 번만 정하고 전부 여기서 파생시킨다.
  // 렌더 도중 자정을 넘겨 섹션마다 날짜가 달라지는 일이 없게.
  const today = todayISO();
  const week = weekOf(today);

  const projects = listProjectOptions();
  const cards = listProjectCards(today);
  const openCounts = countOpenTasksByProject();
  const tasks = listTodayTasks(today);
  const events = listEventsOn(today);
  const ddays = listUpcomingDdays(today);
  const dots = listEventDots(week[0], week[6]);
  const inbox = listInbox();

  return (
    <>
      <QuickCapture projects={projects} />

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-6">
          <h1 className="text-sm font-semibold text-c-text-strong">
            {formatDateKo(today)}
          </h1>
        </header>

        <Section title="오늘 할 일" count={tasks.filter((t) => !t.done).length}>
          <TodoList items={tasks} projects={projects} today={today} />
        </Section>

        <Section title="오늘 일정" count={events.length}>
          <TodayEvents events={events} />
        </Section>

        <Section title="D-day" count={ddays.length}>
          <DdayStrip events={ddays} today={today} />
        </Section>

        <Section title="진행 중인 프로젝트" count={cards.length}>
          <ProjectBoard cards={cards} openCounts={openCounts} today={today} />
        </Section>

        <Section title="이번 주">
          <WeekStrip week={week} dots={dots} today={today} />
        </Section>

        <Section title="Inbox" count={inboxCount()}>
          <InboxList items={inbox} />
        </Section>
      </main>
    </>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-c-text-faint">
        {title}
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-c-surface-2 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-c-text-muted">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}
