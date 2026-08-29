"use server";

import { revalidatePath } from "next/cache";
import {
  insertProject,
  setProjectStatus,
  deleteProject as removeProject,
} from "@/lib/db/queries/project";
import { CATEGORIES, type Category } from "@/types/domain";

export async function createProject(input: { name: string; category: string }) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "이름 없음" };
  if (!CATEGORIES.includes(input.category as Category)) {
    return { ok: false as const, error: "없는 카테고리" };
  }

  // 최종 마감일은 받지 않는다. 카드의 D-day 는 그 프로젝트의 가장 가까운
  // 일정에서 나온다 — 마감을 두 군데에 적게 만들 이유가 없다.
  await insertProject({ name, category: input.category as Category });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function completeProject(id: string) {
  await setProjectStatus(id, "done");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** 일정과 할 일은 남고 소속만 풀린다. 자세한 건 queries/project.ts 참고. */
export async function deleteProject(id: string) {
  await removeProject(id);
  revalidatePath("/", "layout");
  return { ok: true as const };
}
