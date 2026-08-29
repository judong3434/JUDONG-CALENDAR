"use server";

import { revalidatePath } from "next/cache";
import {
  insertTask,
  setTaskDone,
  setTaskDate,
  deleteTask as removeTask,
} from "@/lib/db/queries/task";

export async function createTask(input: {
  title: string;
  doDate: string | null;
  projectId: string | null;
}) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "빈 할 일" };

  await insertTask({
    title,
    doDate: input.doDate || null,
    projectId: input.projectId || null,
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function toggleTask(id: string, done: boolean) {
  await setTaskDone(id, done);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** 밀린 할 일을 오늘로 끌어오거나 다른 날로 미룬다. */
export async function rescheduleTask(id: string, doDate: string) {
  await setTaskDate(id, doDate || null);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteTask(id: string) {
  await removeTask(id);
  revalidatePath("/", "layout");
  return { ok: true as const };
}
