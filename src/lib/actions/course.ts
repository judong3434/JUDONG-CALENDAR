"use server";

import { revalidatePath } from "next/cache";
import {
  insertSemester,
  updateSemester,
  deleteSemester as removeSemester,
  getSemester,
  insertCourse,
  deleteCourse as removeCourse,
} from "@/lib/db/queries/course";

function invalid(date: string): boolean {
  return !/^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function saveSemester(input: {
  id: string | null;
  name: string;
  startDate: string;
  endDate: string;
}) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "학기 이름 없음" };
  if (invalid(input.startDate) || invalid(input.endDate)) {
    return { ok: false as const, error: "날짜를 채워주세요" };
  }
  // 끝이 시작보다 앞서면 전개 결과가 통째로 비어 버린다. 조용히 넘기지 않는다.
  if (input.endDate < input.startDate) {
    return { ok: false as const, error: "종료일이 시작일보다 빠릅니다" };
  }

  if (input.id) {
    if (!getSemester(input.id)) {
      return { ok: false as const, error: "없는 학기" };
    }
    updateSemester({
      id: input.id,
      name,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  } else {
    insertSemester({
      name,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** 학기를 지우면 그 학기 수업도 CASCADE 로 같이 사라진다. */
export async function deleteSemester(id: string) {
  removeSemester(id);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function createCourse(input: {
  name: string;
  semesterId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
}) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "과목명 없음" };
  if (!getSemester(input.semesterId)) {
    return { ok: false as const, error: "없는 학기" };
  }
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return { ok: false as const, error: "요일 범위 밖" };
  }
  if (input.endTime <= input.startTime) {
    return { ok: false as const, error: "끝나는 시각이 앞섭니다" };
  }

  insertCourse({
    name,
    semesterId: input.semesterId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    room: input.room?.trim() || null,
  });

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteCourse(id: string) {
  removeCourse(id);
  revalidatePath("/", "layout");
  return { ok: true as const };
}
