"use client";

import { ConfirmDelete } from "@/components/ConfirmDelete";
import { deleteEvent } from "@/lib/actions/event";
import { deleteProject } from "@/lib/actions/project";

/**
 * 서버 컴포넌트(오늘 일정, 캘린더 상세, 프로젝트 보드)에서 그대로 꽂아 쓰는 얇은 래퍼.
 * 서버 컴포넌트는 콜백 함수를 자식에게 넘길 수 없으므로, 액션을 아는 클라이언트
 * 컴포넌트를 따로 둔다.
 */

export function DeleteEventButton({ id }: { id: string }) {
  return <ConfirmDelete onConfirm={() => deleteEvent(id)} label="일정 삭제" />;
}

export function DeleteProjectButton({ id }: { id: string }) {
  return (
    <ConfirmDelete
      onConfirm={() => deleteProject(id)}
      label="프로젝트 삭제"
      size={12}
    />
  );
}
