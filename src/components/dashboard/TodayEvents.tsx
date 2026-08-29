import type { EventItem } from "@/lib/db/queries/event";
import { ProjectDot } from "@/components/ProjectDot";
import { formatTimeRange } from "@/lib/format";
import { DeleteEventButton } from "@/components/DeleteButtons";

/**
 * 오늘의 일정 — 시간순 타임라인. (기획서 §4.1 ②)
 * 종일 일정이 맨 위에 오고, 시간이 있는 것들이 순서대로 붙는다.
 */
export function TodayEvents({ events }: { events: EventItem[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-c border border-dashed border-c-line px-4 py-5 text-center text-sm text-c-text-faint">
        오늘 일정 없음
      </p>
    );
  }

  return (
    <ul className="divide-y divide-c-line rounded-c border border-c-line">
      {events.map((e) => (
        <li key={e.id} className="flex items-baseline gap-3 px-3 py-2">
          <span className="w-24 shrink-0 text-xs tabular-nums text-c-text-muted">
            {formatTimeRange(e.startTime, e.endTime)}
          </span>
          <ProjectDot
            category={e.projectCategory}
            shade={e.projectShade}
            size={7}
          />
          <span className="min-w-0 flex-1 truncate text-sm text-c-text-strong">
            {e.title}
          </span>
          {e.kind === "course" ? (
            <span className="shrink-0 text-[11px] text-c-text-faint">
              {e.location ? `수업 · ${e.location}` : "수업"}
            </span>
          ) : (
            e.projectName && (
              <span className="shrink-0 text-xs text-c-text-faint">
                {e.projectName}
              </span>
            )
          )}
          {/* 수업은 시간표에서 전개된 것이라 여기서 지울 수 없다.
              지우려면 시간표 화면에서 그 수업 자체를 없애야 한다. */}
          {e.kind === "event" && <DeleteEventButton id={e.id} />}
        </li>
      ))}
    </ul>
  );
}
