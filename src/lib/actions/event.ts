"use server";

import { revalidatePath } from "next/cache";
import { batch } from "@/lib/db/client";
import { deleteEventStmt, getEvent } from "@/lib/db/queries/event";
import { detachTasksFromEventStmt } from "@/lib/db/queries/task";

/**
 * 일정 삭제.
 *
 * 스키마상 task.event_id 는 ON DELETE CASCADE 다. 그대로 두면 일정 하나를 지울 때
 * 거기 매달린 할 일이 말없이 같이 사라진다. 되돌릴 수 없는 삭제에서 그건 나쁘다.
 * 그래서 지우기 전에 할 일을 떼어내고, 소속 프로젝트를 물려준다.
 * 할 일이 필요 없으면 사용자가 따로 지우면 된다 — 그건 되돌릴 수 있는 선택이다.
 *
 * 두 문장은 반드시 이 순서로, 한 트랜잭션 안에서 돌아야 한다.
 * 떼어내기만 하고 삭제가 실패하면 할 일이 일정에서 풀린 채 남는다.
 */
export async function deleteEvent(id: string) {
  const event = await getEvent(id);
  if (!event) return { ok: false as const, error: "없는 일정" };

  await batch([
    detachTasksFromEventStmt(id, event.projectId),
    deleteEventStmt(id),
  ]);

  revalidatePath("/", "layout");
  return { ok: true as const };
}
