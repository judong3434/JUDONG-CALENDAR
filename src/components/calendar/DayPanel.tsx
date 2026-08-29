import type { EventItem } from "@/lib/db/queries/event";
import { ProjectDot } from "@/components/ProjectDot";
import { formatDateKo, formatTimeRange } from "@/lib/format";
import { ddayLabel } from "@/lib/date";
import { DeleteEventButton } from "@/components/DeleteButtons";

/**
 * 날짜 상세. (기획서 §4.2 "날짜 클릭 → 우측 패널에 그날 상세")
 * 넓은 화면에서는 오른쪽에, 좁은 화면에서는 캘린더 아래에 붙는다.
 */
export function DayPanel({
  date,
  events,
  today,
}: {
  date: string | null;
  events: EventItem[];
  today: string;
}) {
  if (!date) {
    return (
      <p className="rounded-c border border-dashed border-c-line px-4 py-6 text-center text-sm text-c-text-faint">
        날짜를 누르면 그날 상세가 여기 나옵니다
      </p>
    );
  }

  return (
    <div className="rounded-c border border-c-line">
      <div className="flex items-baseline justify-between gap-2 border-b border-c-line px-3 py-2">
        <span className="text-sm font-semibold text-c-text-strong">
          {formatDateKo(date)}
        </span>
        <span className="text-[11px] tabular-nums text-c-text-faint">
          {ddayLabel(date, today)}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="px-3 py-5 text-center text-sm text-c-text-faint">
          일정 없음
        </p>
      ) : (
        <ul className="divide-y divide-c-line">
          {events.map((e) => (
            <li key={e.id} className="px-3 py-2">
              <div className="flex items-baseline gap-2">
                <ProjectDot
                  category={e.projectCategory}
                  shade={e.projectShade}
                  size={7}
                />
                <span className="min-w-0 flex-1 break-words text-sm text-c-text-strong">
                  {e.title}
                </span>
                {e.isDday && (
                  <span className="shrink-0 text-[10px] font-semibold text-c-urgent">
                    D-day
                  </span>
                )}
                {/* 수업은 시간표에서 전개된 것이라 여기서 지울 수 없다 */}
                {e.kind === "event" && <DeleteEventButton id={e.id} />}
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 pl-4 text-[11px] text-c-text-faint">
                <span className="tabular-nums">
                  {formatTimeRange(e.startTime, e.endTime)}
                </span>
                {e.kind === "course" && <span>수업</span>}
                {e.projectName && <span>{e.projectName}</span>}
                {e.location && <span>{e.location}</span>}
              </div>
              {e.memo && (
                <p className="mt-1 pl-4 text-[11px] text-c-text-muted">
                  {e.memo}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
