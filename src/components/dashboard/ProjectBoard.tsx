"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import type { ProjectCard } from "@/lib/db/queries/project";
import { CATEGORY_LIST, projectColor } from "@/lib/design/category";
import { CATEGORIES } from "@/types/domain";
import { createProject } from "@/lib/actions/project";
import { ddayLabel, diffDays } from "@/lib/date";
import { DeleteProjectButton } from "@/components/DeleteButtons";

/**
 * 진행 중인 프로젝트 보드.
 *
 * 기획서 §4.1 ④ 는 카드에 단계·진행률·미완료 개수까지 담으려 했지만,
 * 실제로 써 보니 신경 쓰지 않는 값이었다. 그래서 전부 걷어냈다.
 * 지금 이 영역은 일정에 붙일 갈래(프로젝트)를 만들어 두는 곳이고,
 * 카드는 이름과 가장 가까운 일정까지의 D-day 만 보여준다.
 */
export function ProjectBoard({
  cards,
  today,
}: {
  cards: ProjectCard[];
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
            <Card key={c.id} card={c} today={today} />
          ))}
        </ul>
      )}
      <AddProject />
    </div>
  );
}

/**
 * 프로젝트 카드 한 줄.
 *
 * 단계 칩과 진행률은 뺐다. 실제로 쓰는 사람이 신경 쓰지 않는 값이었고,
 * 안 보는 숫자를 계산하려고 Task 를 두 번 세는 쿼리를 돌릴 이유가 없다.
 * 지금 이 영역은 일정에 붙일 갈래를 만들어 두는 곳이다.
 */
function Card({ card, today }: { card: ProjectCard; today: string }) {
  const left = card.nextDate ? diffDays(today, card.nextDate) : null;
  const urgent = left !== null && left <= 3;

  return (
    <li className="flex items-baseline gap-2 rounded-c border border-c-line px-3 py-2">
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
    </li>
  );
}

function AddProject() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim() || pending) return;
    startTransition(async () => {
      const res = await createProject({ name, category });
      if (!res.ok) return;
      setName("");
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
