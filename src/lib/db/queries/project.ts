import { all, get, run, newId } from "../client";
import type { Category, Project, ProjectStatus } from "@/types/domain";

interface ProjectRow {
  id: string;
  name: string;
  category: Category;
  shade: number;
  status: ProjectStatus;
  due_date: string | null;
  stage: string | null;
  sort_order: number;
}

function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    shade: Math.min(Math.max(r.shade, 1), 4) as 1 | 2 | 3 | 4,
    status: r.status,
    dueDate: r.due_date,
    stage: r.stage,
    sortOrder: r.sort_order,
  };
}

/**
 * 프로젝트 보드 카드 하나에 필요한 전부.
 * "내가 지금 뭘 하고 있는지 눈에 보여야 안심된다"에 대응하는 값들이다.
 */
export interface ProjectCard extends Project {
  totalTasks: number;
  doneTasks: number;
  /** 다음 마감까지. 프로젝트의 미래 일정 중 가장 가까운 것, 없으면 최종 마감일. */
  nextDate: string | null;
}

export function listProjectCards(today: string): ProjectCard[] {
  // Task 는 프로젝트에 직접 달리거나 Event 를 거쳐 달린다.
  // COALESCE 로 두 경로를 한 번에 센다.
  const rows = all<
    ProjectRow & {
      total_tasks: number;
      done_tasks: number;
      next_event_date: string | null;
    }
  >(
    `SELECT p.*,
            (SELECT COUNT(*)
               FROM task t LEFT JOIN event e ON e.id = t.event_id
              WHERE COALESCE(t.project_id, e.project_id) = p.id) AS total_tasks,
            (SELECT COUNT(*)
               FROM task t LEFT JOIN event e ON e.id = t.event_id
              WHERE COALESCE(t.project_id, e.project_id) = p.id
                AND t.done = 1)                                  AS done_tasks,
            (SELECT MIN(e.date)
               FROM event e
              WHERE e.project_id = p.id AND e.date >= ?)         AS next_event_date
       FROM project p
      WHERE p.status <> 'done'
      ORDER BY p.sort_order, p.rowid`,
    today,
  );

  return rows.map((r) => ({
    ...toProject(r),
    totalTasks: r.total_tasks,
    doneTasks: r.done_tasks,
    nextDate: r.next_event_date ?? r.due_date,
  }));
}

/** Quick Capture 의 프로젝트 선택용. 색을 칠하려면 category·shade 가 필요하다. */
export function listProjectOptions(): Pick<
  Project,
  "id" | "name" | "category" | "shade"
>[] {
  return all<ProjectRow>(
    `SELECT id, name, category, shade, status, due_date, stage, sort_order
       FROM project WHERE status <> 'done' ORDER BY sort_order, rowid`,
  ).map(toProject);
}

export function getProject(id: string): Project | null {
  const r = get<ProjectRow>("SELECT * FROM project WHERE id = ?", id);
  return r ? toProject(r) : null;
}

export interface NewProject {
  name: string;
  category: Category;
  dueDate?: string | null;
  stage?: string | null;
}

export function insertProject(p: NewProject): string {
  // shade 는 자동 배정한다. 같은 카테고리 안에서 1→2→3→4→1 로 돌린다.
  // 사용자가 색을 고르게 하면 2단 색 체계가 곧바로 무너진다.
  const used =
    get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM project WHERE category = ?",
      p.category,
    )?.n ?? 0;
  const shade = (used % 4) + 1;

  const nextOrder =
    (get<{ n: number | null }>("SELECT MAX(sort_order) AS n FROM project")?.n ??
      0) + 1;

  const id = newId();
  run(
    `INSERT INTO project (id, name, category, shade, due_date, stage, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    p.name,
    p.category,
    shade,
    p.dueDate ?? null,
    p.stage ?? null,
    nextOrder,
  );
  return id;
}

export function setProjectStage(id: string, stage: string | null): void {
  run(
    "UPDATE project SET stage = ?, updated_at = datetime('now') WHERE id = ?",
    stage,
    id,
  );
}

/**
 * 프로젝트 삭제. 스키마상 event.project_id / task.project_id 는 ON DELETE SET NULL 이라
 * 일정과 할 일은 남고 소속만 풀린다. 프로젝트를 지웠다고 일정까지 날아가면 안 된다.
 */
export function deleteProject(id: string): void {
  run("DELETE FROM project WHERE id = ?", id);
}

export function setProjectStatus(id: string, status: ProjectStatus): void {
  run(
    "UPDATE project SET status = ?, updated_at = datetime('now') WHERE id = ?",
    status,
    id,
  );
}
