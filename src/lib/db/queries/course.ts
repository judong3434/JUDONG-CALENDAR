import { all, get, run, newId } from "../client";
import type { Category } from "@/types/domain";

/* ------------------------------------------------------------------- 학기 */

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface SemesterRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

const toSemester = (r: SemesterRow): Semester => ({
  id: r.id,
  name: r.name,
  startDate: r.start_date,
  endDate: r.end_date,
});

export async function listSemesters(): Promise<Semester[]> {
  const rows = await all<SemesterRow>(
    "SELECT * FROM semester ORDER BY start_date DESC",
  );
  return rows.map(toSemester);
}

/** 오늘이 속한 학기. 없으면 가장 최근에 시작한 학기. 그것도 없으면 null. */
export async function currentSemester(today: string): Promise<Semester | null> {
  const inRange = await get<SemesterRow>(
    "SELECT * FROM semester WHERE ? BETWEEN start_date AND end_date ORDER BY start_date DESC LIMIT 1",
    today,
  );
  if (inRange) return toSemester(inRange);

  const latest = await get<SemesterRow>(
    "SELECT * FROM semester ORDER BY start_date DESC LIMIT 1",
  );
  return latest ? toSemester(latest) : null;
}

export async function getSemester(id: string): Promise<Semester | null> {
  const r = await get<SemesterRow>("SELECT * FROM semester WHERE id = ?", id);
  return r ? toSemester(r) : null;
}

export async function insertSemester(s: Omit<Semester, "id">): Promise<string> {
  const id = newId();
  await run(
    "INSERT INTO semester (id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
    id,
    s.name,
    s.startDate,
    s.endDate,
  );
  return id;
}

/** 시작·종료일을 여기 한 곳에서만 고치면 전개 결과가 통째로 따라온다. */
export async function updateSemester(s: Semester): Promise<void> {
  await run(
    `UPDATE semester
        SET name = ?, start_date = ?, end_date = ?, updated_at = datetime('now')
      WHERE id = ?`,
    s.name,
    s.startDate,
    s.endDate,
    s.id,
  );
}

/** 수업은 CASCADE 로 함께 사라진다. 학기를 지운다는 건 그 시간표를 지운다는 뜻이다. */
export async function deleteSemester(id: string): Promise<void> {
  await run("DELETE FROM semester WHERE id = ?", id);
}

/* ------------------------------------------------------------------- 수업 */

export interface Course {
  id: string;
  name: string;
  semesterId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  projectId: string | null;
  projectCategory: Category | null;
  projectShade: number | null;
}

interface CourseRow {
  id: string;
  name: string;
  semester_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  project_id: string | null;
  project_category: Category | null;
  project_shade: number | null;
}

const toCourse = (r: CourseRow): Course => ({
  id: r.id,
  name: r.name,
  semesterId: r.semester_id,
  dayOfWeek: r.day_of_week,
  startTime: r.start_time,
  endTime: r.end_time,
  room: r.room,
  projectId: r.project_id,
  projectCategory: r.project_category,
  projectShade: r.project_shade,
});

const COURSE_SELECT = `
  SELECT c.*, p.category AS project_category, p.shade AS project_shade
    FROM course c
    LEFT JOIN project p ON p.id = c.project_id
`;

export async function listCourses(semesterId: string): Promise<Course[]> {
  const rows = await all<CourseRow>(
    `${COURSE_SELECT} WHERE c.semester_id = ? ORDER BY c.day_of_week, c.start_time`,
    semesterId,
  );
  return rows.map(toCourse);
}

export interface NewCourse {
  name: string;
  semesterId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
}

export async function insertCourse(c: NewCourse): Promise<string> {
  const id = newId();
  await run(
    `INSERT INTO course (id, name, semester_id, day_of_week, start_time, end_time, room)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    c.name,
    c.semesterId,
    c.dayOfWeek,
    c.startTime,
    c.endTime,
    c.room ?? null,
  );
  return id;
}

export async function deleteCourse(id: string): Promise<void> {
  await run("DELETE FROM course WHERE id = ?", id);
}

/* --------------------------------------------------------------- 전개(展開)
   반복 인스턴스를 테이블에 펼치지 않는다.
   한 학기 15주 × 6과목 = 90행을 만들어 둘 이유가 없고,
   수업 시간을 한 번 고칠 때마다 90행을 따라 고쳐야 한다.
   대신 조회하는 순간 요일 + 학기 범위로 계산한다. */

/** 캘린더·홈에 얹을 수업 한 칸. 실제 행이 아니라 그 날짜에 계산된 인스턴스다. */
export interface CourseInstance extends Course {
  date: string;
}

/**
 * 기간 안의 수업을 날짜별로 전개한다.
 *
 * 학기 범위와 겹치는 수업만 한 번에 읽어 오고, 날짜 순회는 여기서 한다.
 * 날짜 × 요일 매칭을 SQL 로 밀어 넣으면 읽기 어려워지기만 한다.
 */
export async function expandCourses(
  from: string,
  to: string,
): Promise<CourseInstance[]> {
  const rows = await all<CourseRow & { start_date: string; end_date: string }>(
    `SELECT c.*, p.category AS project_category, p.shade AS project_shade,
            s.start_date, s.end_date
       FROM course c
       JOIN semester s ON s.id = c.semester_id
       LEFT JOIN project p ON p.id = c.project_id
      WHERE s.start_date <= ? AND s.end_date >= ?
      ORDER BY c.start_time`,
    to,
    from,
  );
  if (rows.length === 0) return [];

  const out: CourseInstance[] = [];
  const cursor = new Date(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10)),
  );
  const end = new Date(
    Number(to.slice(0, 4)),
    Number(to.slice(5, 7)) - 1,
    Number(to.slice(8, 10)),
  );

  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const date = `${y}-${m}-${d}`;
    const dow = cursor.getDay();

    for (const r of rows) {
      if (r.day_of_week !== dow) continue;
      // 학기 범위 밖의 날짜에는 수업이 없다 (from~to 가 학기보다 넓을 수 있다)
      if (date < r.start_date || date > r.end_date) continue;
      out.push({ ...toCourse(r), date });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** 오늘 수업. (기획서 §4.1 ② "오늘 수업 — 시간표에서 자동으로 끌어옴") */
export function listCoursesOn(date: string): Promise<CourseInstance[]> {
  return expandCourses(date, date);
}
