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
 *
 * 진행률(완료 Task ÷ 전체 Task)은 화면에서 뺐으므로 세지 않는다.
 * 안 보여줄 숫자를 위해 Task 를 두 번 훑을 이유가 없다.
 */
export interface ProjectCard extends Project {
  /** 다음 마감까지. 프로젝트의 미래 일정 중 가장 가까운 것, 없으면 최종 마감일. */
  nextDate: string | null;
}

export async function listProjectCards(today: string): Promise<ProjectCard[]> {
  const rows = await all<ProjectRow & { next_event_date: string | null }>(
    `SELECT p.*,
            (SELECT MIN(e.date)
               FROM event e
              WHERE e.project_id = p.id AND e.date >= ?) AS next_event_date
       FROM project p
      WHERE p.status <> 'done'
      ORDER BY p.sort_order, p.rowid`,
    today,
  );

  return rows.map((r) => ({
    ...toProject(r),
    nextDate: r.next_event_date ?? r.due_date,
  }));
}

/** Quick Capture 의 프로젝트 선택용. 색을 칠하려면 category·shade 가 필요하다. */
export async function listProjectOptions(): Promise<
  Pick<Project, "id" | "name" | "category" | "shade">[]
> {
  const rows = await all<ProjectRow>(
    `SELECT id, name, category, shade, status, due_date, stage, sort_order
       FROM project WHERE status <> 'done' ORDER BY sort_order, rowid`,
  );
  return rows.map(toProject);
}

export interface NewProject {
  name: string;
  category: Category;
}

export async function insertProject(p: NewProject): Promise<string> {
  // shade 는 자동 배정한다. 같은 카테고리 안에서 1→2→3→4→1 로 돌린다.
  // 사용자가 색을 고르게 하면 2단 색 체계가 곧바로 무너진다.
  const used =
    (await get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM project WHERE category = ?",
      p.category,
    ))?.n ?? 0;
  const shade = (used % 4) + 1;

  const nextOrder =
    ((await get<{ n: number | null }>("SELECT MAX(sort_order) AS n FROM project"))
      ?.n ?? 0) + 1;

  const id = newId();
  await run(
    `INSERT INTO project (id, name, category, shade, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    p.name,
    p.category,
    shade,
    nextOrder,
  );
  return id;
}

/**
 * 프로젝트 삭제. 스키마상 event.project_id / task.project_id 는 ON DELETE SET NULL 이라
 * 일정과 할 일은 남고 소속만 풀린다. 프로젝트를 지웠다고 일정까지 날아가면 안 된다.
 */
export async function deleteProject(id: string): Promise<void> {
  await run("DELETE FROM project WHERE id = ?", id);
}

export async function setProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<void> {
  await run(
    "UPDATE project SET status = ?, updated_at = datetime('now') WHERE id = ?",
    status,
    id,
  );
}
