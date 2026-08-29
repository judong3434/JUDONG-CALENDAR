import "server-only";

import { listEventsInRange, type EventItem } from "@/lib/db/queries/event";
import { expandCourses } from "@/lib/db/queries/course";

/**
 * 일정과 수업을 한 줄에 섞는다.
 *
 * 기획서 §4.1 은 "오늘의 일정"과 "오늘 수업"을 따로 적었지만,
 * 실제로 하루를 볼 때 알고 싶은 건 "9시부터 뭐가 이어지는가"지
 * 그게 수업이냐 일정이냐가 아니다. 그래서 시간순으로 합치고
 * 수업은 kind 로 구분해 표시만 다르게 한다.
 *
 * 수업은 course 테이블의 실제 행이 아니라 학기 범위에서 계산된 인스턴스다.
 * 그래서 id 에 날짜를 붙여 유일하게 만들고, 삭제 버튼은 붙이지 않는다.
 */
export async function listDayItems(
  from: string,
  to: string,
): Promise<EventItem[]> {
  // 두 조회는 서로를 기다릴 이유가 없다
  const [events, expanded] = await Promise.all([
    listEventsInRange(from, to),
    expandCourses(from, to),
  ]);

  const courses: EventItem[] = expanded.map((c) => ({
    // 같은 수업이 여러 날에 나타나므로 날짜까지 넣어야 키가 겹치지 않는다
    id: `course:${c.id}:${c.date}`,
    title: c.name,
    date: c.date,
    startTime: c.startTime,
    endTime: c.endTime,
    allDay: false,
    projectId: c.projectId,
    location: c.room,
    isDday: false,
    memo: null,
    captureId: null,
    projectName: null,
    // 프로젝트를 안 붙인 수업도 학교 색으로 읽히는 게 맞다
    projectCategory: c.projectCategory ?? "school",
    projectShade: c.projectShade ?? 1,
    kind: "course",
  }));

  return [...events, ...courses].sort(compare);
}

/** 날짜 → 종일 먼저 → 시작 시각. listEventsOn 의 ORDER BY 와 같은 규칙. */
function compare(a: EventItem, b: EventItem): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (!a.startTime && b.startTime) return -1;
  if (a.startTime && !b.startTime) return 1;
  if (!a.startTime && !b.startTime) return 0;
  return a.startTime! < b.startTime! ? -1 : a.startTime! > b.startTime! ? 1 : 0;
}
