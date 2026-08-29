import { SemesterForm } from "@/components/timetable/SemesterForm";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import {
  currentSemester,
  listCourses,
  listSemesters,
} from "@/lib/db/queries/course";
import { todayISO } from "@/lib/date";

/**
 * 시간표. (기획서 §4.4)
 * 학기 단위로 한 번 등록하면 캘린더와 홈에 자동으로 반영된다.
 */
export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const today = todayISO();
  const semester = await currentSemester(today);
  const courses = semester ? await listCourses(semester.id) : [];
  const semesters = await listSemesters();

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-4">
        <h1 className="mb-2 text-xs font-semibold uppercase tracking-wider text-c-text-faint">
          시간표
        </h1>
        <SemesterForm semester={semester} />
      </header>

      {semester ? (
        <TimetableGrid semester={semester} courses={courses} />
      ) : (
        <p className="rounded-c border border-dashed border-c-line px-4 py-6 text-center text-sm text-c-text-faint">
          학기를 먼저 만들면 격자가 나옵니다
        </p>
      )}

      {semesters.length > 1 && (
        <p className="mt-4 text-[11px] text-c-text-faint">
          지난 학기 {semesters.length - 1}개가 더 있습니다. 오늘 날짜가 속한
          학기를 보여주고 있습니다.
        </p>
      )}
    </main>
  );
}
