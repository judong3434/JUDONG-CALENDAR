"use server";

import { revalidatePath } from "next/cache";
import { tx } from "@/lib/db/client";
import { deleteEvent as removeEvent, getEvent } from "@/lib/db/queries/event";
import { detachTasksFromEvent } from "@/lib/db/queries/task";

/**
 * 일정 삭제.
 *
 * 스키마상 task.event_id 는 ON DELETE CASCADE 다. 그대로 두면 일정 하나를 지울 때
 * 거기 매달린 할 일이 말없이 같이 사라진다. 되돌릴 수 없는 삭제에서 그건 나쁘다.
 * 그래서 지우기 전에 할 일을 떼어내고, 소속 프로젝트를 물려준다.
 * 할 일이 필요 없으면 사용자가 따로 지우면 된다 — 그건 되돌릴 수 있는 선택이다.
 */
export async function deleteEvent(id: string) {
  const event = getEvent(id);
  if (!event) return { ok: false as const, error: "없는 일정" };

  tx(() => {
    detachTasksFromEvent(id, event.projectId);
    removeEvent(id);
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}
