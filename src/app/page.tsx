import { QuickCapture } from "@/components/QuickCapture";
import { InboxList } from "@/components/InboxList";
import { inboxCount, listInbox } from "@/lib/db/queries/capture";
import { listRecentEvents } from "@/lib/db/queries/event";
import { formatDateKo, formatTimeRange } from "@/lib/format";

// 1단계 화면. 브리프 「만드는 순서」상 홈 대시보드는 2단계이므로
// 지금은 Quick Capture 와 Inbox 만 있고, 저장된 일정은 확인용 목록으로만 둔다.
export const dynamic = "force-dynamic";

export default function Home() {
  const inbox = listInbox();
  const count = inboxCount();
  const events = listRecentEvents(20);

  return (
    <>
      <QuickCapture />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <section className="mb-10">
          <SectionTitle count={count}>Inbox</SectionTitle>
          <InboxList items={inbox} />
        </section>

        <section>
          <SectionTitle count={events.length}>저장된 일정</SectionTitle>
          {events.length === 0 ? (
            <p className="rounded-c border border-dashed border-c-line px-4 py-6 text-center text-sm text-c-text-faint">
              위 입력창에 한 줄 던져보세요
            </p>
          ) : (
            <ul className="divide-y divide-c-line rounded-c border border-c-line">
              {events.map((e) => (
                <li key={e.id} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 break-words text-sm text-c-text-strong">
                      {e.title}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-c-text-muted">
                      {formatDateKo(e.date)}
                      <span className="ml-2 text-c-text-faint">
                        {formatTimeRange(e.startTime, e.endTime)}
                      </span>
                    </span>
                  </div>
                  {/* 캡처 원문 보존 — 제목과 다를 때만 보여준다 */}
                  {e.rawText && e.rawText !== e.title && (
                    <p className="mt-1 break-words text-[11px] text-c-text-faint">
                      {e.rawText}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-10 text-xs text-c-text-faint">
          다음 단계: 홈 대시보드 (오늘의 To-do · D-day · 프로젝트 보드)
        </p>
      </main>
    </>
  );
}

function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-c-text-faint">
      {children}
      {count > 0 && (
        <span className="rounded-full bg-c-surface-2 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-c-text-muted">
          {count}
        </span>
      )}
    </h2>
  );
}
