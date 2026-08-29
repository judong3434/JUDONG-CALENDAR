/**
 * 시간표 격자의 좌표계.
 *
 * 세로 한 칸 = 30분. 슬롯 0 이 START_HOUR 시 정각이다.
 * 이 변환을 한 곳에 모아 두면 격자·드래그·저장이 같은 눈금을 쓴다.
 */

export const START_HOUR = 8; // 08:00
export const END_HOUR = 22; // 22:00 (마지막 칸은 21:30–22:00)
export const SLOT_MINUTES = 30;

export const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

/** 화면에 세울 요일. 주말에도 알바·특강이 있어서 7일을 다 둔다. */
export const DAYS = [
  { dow: 1, label: "월" },
  { dow: 2, label: "화" },
  { dow: 3, label: "수" },
  { dow: 4, label: "목" },
  { dow: 5, label: "금" },
  { dow: 6, label: "토" },
  { dow: 0, label: "일" },
] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 슬롯 인덱스 → 그 슬롯이 시작하는 시각 'HH:MM' */
export function slotToTime(slot: number): string {
  const total = START_HOUR * 60 + slot * SLOT_MINUTES;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** 'HH:MM' → 슬롯 인덱스. 격자 밖이면 가장 가까운 칸으로 잘라 낸다. */
export function timeToSlot(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const slot = Math.floor((h * 60 + m - START_HOUR * 60) / SLOT_MINUTES);
  return Math.min(Math.max(slot, 0), SLOT_COUNT);
}

/** 정각마다 눈금을 적는다. 30분마다 적으면 빽빽해서 오히려 안 읽힌다. */
export function isHourMark(slot: number): boolean {
  return (slot * SLOT_MINUTES) % 60 === 0;
}
