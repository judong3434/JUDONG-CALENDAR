"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import type { TaskItem } from "@/lib/db/queries/task";
import type { Project } from "@/types/domain";
import { ProjectDot } from "@/components/ProjectDot";
import { createTask, deleteTask, toggleTask } from "@/lib/actions/task";
import { diffDays } from "@/lib/date";

type ProjectOption = Pick<Project, "id" | "name" | "category" | "shade">;

/**
 * 오늘의 To-do. (기획서 §4.1 ②)
 *
 * 실행 날짜가 오늘인 Task 전부 + 지난 미완료.
 * 지난 것을 빼면 어제 못 한 일이 화면에서 조용히 사라져서,
 * 정확히 이 앱을 만든 이유(2차 정리를 안 하게 되는 것)가 재현된다.
 */
export function TodoList({
  items,
  projects,
  today,
}: {
  items: TaskItem[];
  projects: ProjectOption[];
  today: string;
}) {
  return (
    <div>
      {items.length === 0 ? (
        <p className="rounded-c border border-dashed border-c-line px-4 py-5 text-center text-sm text-c-text-faint">
          오늘 할 일 없음
        </p>
      ) : (
        <ul className="divide-y divide-c-line rounded-c border border-c-line">
          {items.map((t) => (
            <TodoRow key={t.id} task={t} today={today} />
          ))}
        </ul>
      )}
      <AddTask projects={projects} today={today} />
    </div>
  );
}

function TodoRow({ task, today }: { task: TaskItem; today: string }) {
  const [pending, startTransition] = useTransition();

  // 지난 미완료는 며칠 밀렸는지 보여준다. 숫자가 붙으면 눈에 걸린다.
  const late = task.doDate && !task.done ? diffDays(task.doDate, today) : 0;

  return (
    <li
      className={`flex items-center gap-2.5 px-3 py-2 ${pending ? "opacity-50" : ""}`}
      data-anim
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.title}
        onClick={() =>
          startTransition(async () => {
            await toggleTask(task.id, !task.done);
          })
        }
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
          task.done
            ? "border-c-text-muted bg-c-text-muted text-white"
            : "border-c-line-strong"
        }`}
        data-anim
      >
        {task.done && <Check size={11} strokeWidth={3} />}
      </button>

      <ProjectDot category={task.projectCategory} shade={task.projectShade} />

      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          task.done ? "text-c-text-faint line-through" : "text-c-text-strong"
        }`}
      >
        {task.title}
        {task.eventTitle && (
          <span className="ml-2 text-xs text-c-text-faint">
            {task.eventTitle}
          </span>
        )}
      </span>

      {late > 0 && (
        <span className="shrink-0 text-[11px] tabular-nums text-c-urgent">
          {late}일 밀림
        </span>
      )}

      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            await deleteTask(task.id);
          })
        }
        aria-label="삭제"
        className="shrink-0 text-c-text-faint hover:text-c-text"
        data-anim
      >
        <X size={13} strokeWidth={1.75} />
      </button>
    </li>
  );
}

function AddTask({
  projects,
  today,
}: {
  projects: ProjectOption[];
  today: string;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim() || pending) return;
    startTransition(async () => {
      await createTask({ title, doDate: today, projectId: projectId || null });
      setTitle("");
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-2 flex items-center gap-2 px-1"
    >
      <Plus size={13} strokeWidth={1.75} className="shrink-0 text-c-text-faint" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="오늘 할 일 추가"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-c-text-faint"
      />
      {projects.length > 0 && (
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="프로젝트"
          className="shrink-0 bg-transparent text-xs text-c-text-muted outline-none"
        >
          <option value="">프로젝트 없음</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </form>
  );
}
