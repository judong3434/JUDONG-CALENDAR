import { projectColor } from "@/lib/design/category";
import type { Category } from "@/types/domain";

/**
 * 프로젝트 색 점. 화면에서 색이 허용된 세 군데 중 하나다.
 * 소속이 없으면 색 대신 빈 테두리 — 없는 걸 회색으로 칠하면 루틴 카테고리와 헷갈린다.
 */
export function ProjectDot({
  category,
  shade,
  size = 8,
}: {
  category: Category | null;
  shade: number | null;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (!category) {
    return (
      <span
        className="shrink-0 rounded-full border border-c-line-strong"
        style={style}
        aria-hidden
      />
    );
  }
  return (
    <span
      className="shrink-0 rounded-full"
      style={{ ...style, background: projectColor(category, shade ?? 1) }}
      aria-hidden
    />
  );
}
