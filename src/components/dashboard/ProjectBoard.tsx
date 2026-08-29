"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import type { ProjectCard } from "@/lib/db/queries/project";
import { CATEGORY_LIST, projectColor } from "@/lib/design/category";
import { CATEGORIES } from "@/types/domain";
import { advanceProjectStage, createProject } from "@/lib/actions/project";
import { ddayLabel, diffDays } from "@/lib/date";
import { DeleteProjectButton } from "@/components/DeleteButtons";

/**
 * 진행 중인 프로젝트 보드. (기획서 §4.1 ④)
 *
 * "내가 지금 뭘 하고 있는지 눈에 보여야 안심된다"에 정확히 대응하는 영역이다.
 * 그래서 카드 하나에 이름 / 현재 단계 / 다음 마감까지 / 진행률 / 미완료 할 일 수가
 * 전부 들어간다. 클릭해서 들어가야 보이는 정보는 하나도 없다.
 */
export function ProjectBoard({
  cards,
  openCounts,
  today,
}: {
  cards: ProjectCard[];
  openCounts: Record<string, number>;
  today: string;
}) {
  return (
    <div>
      {cards.length === 0 ? (
        <p className="rounded-c border border-dashed border-c-line px-4 py-5 text-center text-sm text-c-text-faint">
          진행 중인 프로젝트 없음
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {cards.map((c) => (
            <Card
              key={c.id}
              card={c}
              open={openCounts[c.id] ?? 0}
              today={today}
            />
          ))}
        </ul>
      )}
      <AddProject />
    </div>
  );
}

function Card({
  card,
  open,
  today,
}: {
  card: ProjectCard;
  open: number;
  today: string;
}) {
  const [pending, startTransition] = useTransition();

  const progress =
    card.totalTasks > 0
      ? Math.round((card.doneTasks / card.totalTasks) * 100)
      : 0;
  const left = card.nextDate ? diffDays(today, card.nextDate) : null;
  const urgent = left !== null && left <= 3;

  return (
    <li
      className={`rounded-c border border-c-line px-3 py-2.5 ${pending ? "opacity-50" : ""}`}
      data-anim
    >
      <div className="flex items-baseline gap-2">
        {/* 프로젝트 색 — 왼쪽 세로 막대로 카드를 구분한다 */}
        <span
          className="h-3 w-[3px] shrink-0 rounded-full"
          style={{ background: projectColor(card.category, card.shade) }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-c-text-strong">
          {card.name}
        </span>
        {card.nextDate && (
          <span
            className={`shrink-0 text-xs font-semibold tabular-nums ${
              urgent ? "text-c-urgent" : "text-c-text-muted"
            }`}
          >
            {ddayLabel(card.nextDate, today)}
          </span>
        )}
        <DeleteProjectButton id={card.id} />
      </div>

      <div className="mt-2 flex items-center gap-2">
        {/* 단계 칩. 클릭 한 번으로 다음 단계로 넘어간다. */}
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await advanceProjectStage(card.id);
            })
          }
          title="클릭하면 다음 단계"
          className="shrink-0 rounded-c bg-c-surface-2 px-1.5 py-0.5 text-[11px] text-c-text-muted"
          data-anim
        >
          {card.stage ?? "단계 없음"}
        </button>

        {/* 진행률 — 무채색. 색은 프로젝트 구분에만 쓴다. */}
        <div className="h-1 min-w-0 flex-1 rounded-full bg-c-surface-2">
          <div
            className="h-1 rounded-full bg-c-text-faint"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="shrink-0 text-[11px] tabular-nums text-c-text-faint">
          {card.totalTasks > 0 ? `${progress}%` : "—"}
          {open > 0 && ` · ${open}개 남음`}
        </span>
      </div>
    </li>
  );
}

function AddProject() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [dueDate, setDueDate] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim() || pending) return;
    startTransition(async () => {
      const res = await createProject({ name, category, dueDate: dueDate || null });
      if (!res.ok) return;
      setName("");
      setDueDate("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-2 px-1 text-sm text-c-text-faint hover:text-c-text-muted"
        data-anim
      >
        <Plus size={13} strokeWidth={1.75} />
        프로젝트 추가
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-2 flex flex-wrap items-center gap-2 rounded-c border border-c-line px-3 py-2"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="프로젝트 이름"
        className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-c-text-faint"
      />
      {/* 색은 고르지 않는다. 카테고리가 색상을, 시스템이 명도를 정한다. */}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="카테고리"
        className="shrink-0 bg-transparent text-xs text-c-text-muted outline-none"
      >
        {CATEGORY_LIST.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        aria-label="최종 마감일"
        className="shrink-0 bg-transparent text-xs text-c-text-muted outline-none"
      />
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="shrink-0 rounded-c border border-c-line px-2 py-1 text-xs text-c-text-muted disabled:opacity-40"
      >
        추가
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="shrink-0 text-xs text-c-text-faint"
      >
        취소
      </button>
    </form>
  );
}
