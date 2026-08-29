import Link from "next/link";
import { CATEGORY_LIST } from "@/lib/design/category";

/**
 * 카테고리 필터 칩. (기획서 §4.2)
 * 껐다 켰다 하며 특정 갈래만 볼 수 있다.
 *
 * 상태를 URL 에 둔다 — 뒤로가기가 그대로 동작하고, 링크로 그 화면을 다시 열 수 있고,
 * 무엇보다 클라이언트 상태가 하나도 늘지 않는다.
 * 아무것도 선택하지 않은 상태가 "전부 보기"다.
 */

/** 프로젝트가 없는 일정도 꺼야 할 때가 있어서 한 칸을 준다. */
export const UNCATEGORIZED = "none";

export function CategoryFilter({
  selected,
  hrefFor,
}: {
  selected: Set<string>;
  /** 그 칩을 토글했을 때 가야 할 주소 */
  hrefFor: (next: Set<string>) => string;
}) {
  const chips = [
    ...CATEGORY_LIST.map((c) => ({
      key: c.key,
      label: c.label,
      color: c.shades[0],
    })),
    { key: UNCATEGORIZED, label: "미분류", color: null },
  ];

  function toggled(key: string): Set<string> {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-1.5">
        {selected.size > 0 && (
          <Link
            href={hrefFor(new Set())}
            className="shrink-0 rounded-c border border-c-line px-2 py-1 text-[11px] text-c-text-muted"
            data-anim
          >
            전체
          </Link>
        )}
        {chips.map((c) => {
          const on = selected.has(c.key);
          return (
            <Link
              key={c.key}
              href={hrefFor(toggled(c.key))}
              className={`flex shrink-0 items-center gap-1.5 rounded-c border px-2 py-1 text-[11px] ${
                on
                  ? "border-c-line-strong text-c-text-strong"
                  : "border-c-line text-c-text-faint"
              }`}
              data-anim
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  c.color ? "" : "border border-c-line-strong"
                }`}
                style={c.color ? { background: c.color } : undefined}
                aria-hidden
              />
              {c.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
