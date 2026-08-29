"use server";

import { revalidatePath } from "next/cache";
import {
  insertProject,
  setProjectStage,
  setProjectStatus,
  getProject,
} from "@/lib/db/queries/project";
import { CATEGORIES, STAGES, type Category } from "@/types/domain";

export async function createProject(input: {
  name: string;
  category: string;
  dueDate: string | null;
}) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "이름 없음" };
  if (!CATEGORIES.includes(input.category as Category)) {
    return { ok: false as const, error: "없는 카테고리" };
  }

  insertProject({
    name,
    category: input.category as Category,
    dueDate: input.dueDate || null,
    stage: STAGES[0],
  });

  revalidatePath("/");
  return { ok: true as const };
}

/**
 * 단계를 다음으로 넘긴다. 마지막 단계에서 한 번 더 누르면 처음으로 돌아간다.
 * 되돌릴 방법이 있어야 잘못 눌렀을 때 곤란하지 않다.
 */
export async function advanceProjectStage(id: string) {
  const p = getProject(id);
  if (!p) return { ok: false as const, error: "없는 프로젝트" };

  const idx = STAGES.indexOf(p.stage as (typeof STAGES)[number]);
  const next = STAGES[(idx + 1) % STAGES.length];
  setProjectStage(id, next);

  revalidatePath("/");
  return { ok: true as const, stage: next };
}

export async function completeProject(id: string) {
  setProjectStatus(id, "done");
  revalidatePath("/");
  return { ok: true as const };
}
