import type { EventItem } from "@/lib/db/queries/event";
import { ProjectDot } from "@/components/ProjectDot";
import { ddayLabel, diffDays } from "@/lib/date";
import { formatDateKo } from "@/lib/format";

/**
 * D-day 스트립 — 가로로 흐르는 카드 열. (기획서 §4.1 ③)
 * 가까운 순으로 놓고 3일 이내는 강조한다. 지난 건 쿼리에서 이미 빠져 있다.
 *
 * 여기가 화면에서 색이 허용된 세 번째 자리 — D-day 임박 경고다.
 */
export function DdayStrip({
  events,
  today,
}: {
  events: EventItem[];
  today: string;
}) {
  if (events.length === 0) {
    return (
      <p className="rounded-c border border-dashed border-c-line px-4 py-5 text-center text-sm text-c-text-faint">
        D-day 없음 — 입력할 때 D-day 를 켜면 여기 올라옵니다
      </p>
    );
  }

  return (
    // 가로 스크롤은 이 안에서만. 페이지 본문은 절대 가로로 밀리지 않는다.
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
      <ul className="flex gap-2">
        {events.map((e) => {
          const left = diffDays(today, e.date);
          const urgent = left <= 3;
          return (
            <li
              key={e.id}
              className={`w-40 shrink-0 rounded-c border px-3 py-2.5 ${
                urgent ? "border-c-urgent/40" : "border-c-line"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    urgent ? "text-c-urgent" : "text-c-text-strong"
                  }`}
                >
                  {ddayLabel(e.date, today)}
                </span>
                <ProjectDot
                  category={e.projectCategory}
                  shade={e.projectShade}
                  size={7}
                />
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-c-text">{e.title}</p>
              <p className="mt-1 text-[11px] text-c-text-faint">
                {formatDateKo(e.date)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
