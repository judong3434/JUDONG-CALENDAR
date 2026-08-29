import { all, run, newId, type Stmt } from "../client";
import type { Category } from "@/types/domain";

/**
 * 오늘의 To-do 한 줄에 필요한 전부.
 * 프로젝트 색 점을 찍어야 하므로 소속 프로젝트의 category·shade 를 같이 가져온다.
 */
export interface TaskItem {
  id: string;
  title: string;
  doDate: string | null;
  done: boolean;
  projectId: string | null;
  projectName: string | null;
  projectCategory: Category | null;
  projectShade: number | null;
  /** 소속 일정 제목. "1차 시안 제출 전에 할 일"이라는 맥락이 여기서 나온다. */
  eventTitle: string | null;
}

interface TaskItemRow {
  id: string;
  title: string;
  do_date: string | null;
  done: number;
  project_id: string | null;
  project_name: string | null;
  project_category: Category | null;
  project_shade: number | null;
  event_title: string | null;
}

function toTaskItem(r: TaskItemRow): TaskItem {
  return {
    id: r.id,
    title: r.title,
    doDate: r.do_date,
    done: r.done === 1,
    projectId: r.project_id,
    projectName: r.project_name,
    projectCategory: r.project_category,
    projectShade: r.project_shade,
    eventTitle: r.event_title,
  };
}

// Task 는 프로젝트에 직접 달리거나 Event 를 거쳐 달린다. 두 경로를 COALESCE 로 합친다.
const TASK_SELECT = `
  SELECT t.id, t.title, t.do_date, t.done,
         COALESCE(t.project_id, e.project_id) AS project_id,
         p.name     AS project_name,
         p.category AS project_category,
         p.shade    AS project_shade,
         e.title    AS event_title
    FROM task t
    LEFT JOIN event   e ON e.id = t.event_id
    LEFT JOIN project p ON p.id = COALESCE(t.project_id, e.project_id)
`;

/**
 * 오늘의 To-do.
 *
 * 오늘 것만 보여주면 어제 못 한 일이 화면에서 조용히 사라진다.
 * 그래서 지난 미완료도 함께 올린다 — 날짜는 화면에서 구분해 보여준다.
 * (밀린 것을 몰아서 재배치하는 주간 리뷰 화면은 기획서 P2)
 */
export async function listTodayTasks(today: string): Promise<TaskItem[]> {
  const rows = await all<TaskItemRow>(
    `${TASK_SELECT}
      WHERE t.do_date IS NOT NULL
        AND (t.do_date = ? OR (t.do_date < ? AND t.done = 0))
      ORDER BY t.done, t.do_date, t.sort_order, t.rowid`,
    today,
    today,
  );
  return rows.map(toTaskItem);
}

export interface NewTask {
  title: string;
  doDate?: string | null;
  projectId?: string | null;
  eventId?: string | null;
  estMinutes?: number | null;
}

export async function insertTask(t: NewTask): Promise<string> {
  const id = newId();
  await run(
    `INSERT INTO task (id, title, do_date, project_id, event_id, est_minutes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    t.title,
    t.doDate ?? null,
    t.projectId ?? null,
    t.eventId ?? null,
    t.estMinutes ?? null,
  );
  return id;
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  await run(
    `UPDATE task SET done = ?, done_at = ?, updated_at = datetime('now')
      WHERE id = ?`,
    done ? 1 : 0,
    done ? new Date().toISOString() : null,
    id,
  );
}

export async function setTaskDate(id: string, doDate: string | null): Promise<void> {
  await run(
    "UPDATE task SET do_date = ?, updated_at = datetime('now') WHERE id = ?",
    doDate,
    id,
  );
}

export async function deleteTask(id: string): Promise<void> {
  await run("DELETE FROM task WHERE id = ?", id);
}

/**
 * 일정을 지우기 직전에 그 일정의 할 일을 떼어낸다.
 * event_id 를 비우면 CASCADE 에 휩쓸리지 않고, 소속 프로젝트는 물려받는다.
 * (프로젝트가 이미 직접 달려 있으면 그대로 둔다)
 */
export function detachTasksFromEventStmt(
  eventId: string,
  projectId: string | null,
): Stmt {
  return {
    sql: `UPDATE task
        SET event_id = NULL,
            project_id = COALESCE(project_id, ?),
            updated_at = datetime('now')
      WHERE event_id = ?`,
    args: [projectId, eventId],
  };
}
