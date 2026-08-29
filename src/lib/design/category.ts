import type { Category } from "@/types/domain";

/**
 * 2단 색 체계 (브리프 §5)
 *   색상(hue)  = 카테고리
 *   명도·채도  = 개별 프로젝트 (shade 1~4, 1이 가장 진함)
 *
 * 프로젝트가 10개로 늘어도 화면은 6색으로 읽힌다.
 * 색을 쓰는 곳은 카테고리 점 / 프로젝트 색 / D-day 임박 경고 딱 세 군데다.
 * UI 나머지 전부는 무채색이므로 여기 있는 값 외의 색을 화면에 쓰지 말 것.
 */

export interface CategoryDef {
  key: Category;
  label: string;
  hue: string;
  /** shade 1~4. 채도를 낮춰 사탕 봉지가 되지 않게 조정한 값. */
  shades: [string, string, string, string];
}

export const CATEGORY: Record<Category, CategoryDef> = {
  school: {
    key: "school",
    label: "학교 · 수업",
    hue: "Green",
    shades: ["#2b8055", "#3d9a6a", "#6bb691", "#a0d0b6"],
  },
  personal: {
    key: "personal",
    label: "개인 프로젝트",
    hue: "Violet",
    shades: ["#6742c8", "#7f5ad6", "#a184e3", "#c3b0ee"],
  },
  contest: {
    key: "contest",
    label: "공모전 · 외부",
    hue: "Red",
    shades: ["#c8392f", "#d75b4f", "#e4867c", "#eeb2ab"],
  },
  club: {
    key: "club",
    label: "동아리 · 모임",
    hue: "Amber",
    shades: ["#b8791a", "#cb9127", "#dbaf5e", "#e9cb96"],
  },
  // 표시 이름만 KDM 으로 바꾼다. DB 에 저장되는 키는 'work' 그대로다 —
  // 키를 바꾸려면 CHECK 제약과 기존 행을 함께 옮기는 마이그레이션이 필요한데,
  // 이름과 색은 화면의 문제라 거기까지 갈 이유가 없다.
  work: {
    key: "work",
    label: "KDM",
    hue: "Blue",
    shades: ["#2f5fd0", "#4b7bdd", "#7fa3e8", "#aec5f0"],
  },
  routine: {
    key: "routine",
    label: "루틴 · 개인생활",
    hue: "Gray",
    shades: ["#6b7280", "#838a94", "#a3a9b1", "#c4c8ce"],
  },
};

export const CATEGORY_LIST = Object.values(CATEGORY);

/** 프로젝트 하나가 실제로 화면에서 갖는 색. */
export function projectColor(category: Category, shade: number): string {
  const idx = Math.min(Math.max(shade, 1), 4) - 1;
  return CATEGORY[category].shades[idx];
}
