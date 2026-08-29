"use client";

import { useRef, useState, useTransition } from "react";
import type { Course, Semester } from "@/lib/db/queries/course";
import { createCourse, deleteCourse } from "@/lib/actions/course";
import { projectColor } from "@/lib/design/category";
import {
  DAYS,
  SLOT_COUNT,
  isHourMark,
  slotToTime,
  timeToSlot,
} from "@/lib/timetable";

/**
 * 요일 × 시간 격자. 드래그해서 수업을 넣는다.
 * (브리프 §6 "요일×시간 그리드에서 드래그로 입력하는 게 폼보다 훨씬 빠르다")
 *
 * 드래그는 세로로만 늘어난다 — 한 수업이 월요일과 화요일에 걸칠 수는 없다.
 * 그래서 시작한 요일을 붙잡고 슬롯만 따라간다.
 *
 * 폰에서는 드래그로 등록하지 않는다고 본다(시간표는 학기 초에 PC 에서 한 번 넣는다).
 * 대신 격자는 가로 스크롤로 그대로 읽힌다.
 */

interface Selection {
  dow: number;
  from: number; // 슬롯 인덱스 (from <= to)
  to: number;
}

// 30분 한 칸의 높이. 11px 글자 한 줄(약 14px)과 안쪽 여백이 들어가야 하므로
// 18px 로는 30분짜리 수업의 이름이 잘린다.
const SLOT_H = 22; // px

export function TimetableGrid({
  semester,
  courses,
}: {
  semester: Semester;
  courses: Course[];
}) {
  const [sel, setSel] = useState<Selection | null>(null);
  const [dragging, setDragging] = useState(false);
  const anchor = useRef<{ dow: number; slot: number } | null>(null);

  function cellFrom(target: EventTarget | null): { dow: number; slot: number } | null {
    if (!(target instanceof Element)) return null;
    const cell = target.closest("[data-dow]");
    if (!(cell instanceof HTMLElement)) return null;
    return { dow: Number(cell.dataset.dow), slot: Number(cell.dataset.slot) };
  }

  function onPointerDown(e: React.PointerEvent) {
    const c = cellFrom(e.target);
    if (!c) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    anchor.current = c;
    setDragging(true);
    // 클릭 한 번이면 1시간(두 칸). 대학 수업의 최소 단위가 대체로 그렇다.
    setSel({ dow: c.dow, from: c.slot, to: Math.min(c.slot + 1, SLOT_COUNT - 1) });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !anchor.current) return;
    const c = cellFrom(document.elementFromPoint(e.clientX, e.clientY));
    if (!c) return;
    const a = anchor.current;
    setSel({
      dow: a.dow, // 요일은 시작한 곳에 고정
      from: Math.min(a.slot, c.slot),
      to: Math.max(a.slot, c.slot),
    });
  }

  function endDrag() {
    setDragging(false);
    anchor.current = null;
  }

  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {/* 요일이 7열이라 좁으면 한글 과목명이 곧바로 접힌다.
            좁은 화면에서는 가로로 스크롤되게 두고 열 너비를 확보한다. */}
        <div className="min-w-[700px]">
          {/* 요일 머리글 */}
          <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-c-line pb-1">
            <div />
            {DAYS.map((d) => (
              <div
                key={d.dow}
                className="text-center text-[11px] text-c-text-faint"
              >
                {d.label}
              </div>
            ))}
          </div>

          <div
            className="relative grid grid-cols-[40px_repeat(7,1fr)] select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* 시각 눈금 */}
            <div>
              {Array.from({ length: SLOT_COUNT }, (_, s) => (
                <div
                  key={s}
                  style={{ height: SLOT_H }}
                  className="pr-1 text-right text-[10px] leading-none tabular-nums text-c-text-faint"
                >
                  {isHourMark(s) ? slotToTime(s) : ""}
                </div>
              ))}
            </div>

            {/* 요일 열 */}
            {DAYS.map((d) => (
              <div key={d.dow} className="relative border-l border-c-line">
                {Array.from({ length: SLOT_COUNT }, (_, s) => (
                  <div
                    key={s}
                    data-dow={d.dow}
                    data-slot={s}
                    style={{ height: SLOT_H }}
                    className={
                      isHourMark(s)
                        ? "border-t border-c-line"
                        : "border-t border-c-line/40"
                    }
                  />
                ))}

                {/* 드래그 중인 범위 */}
                {sel?.dow === d.dow && (
                  <div
                    className="pointer-events-none absolute inset-x-0.5 rounded-c border border-c-text-muted bg-c-surface-2"
                    style={{
                      top: sel.from * SLOT_H,
                      height: (sel.to - sel.from + 1) * SLOT_H,
                    }}
                  />
                )}

                {/* 등록된 수업 */}
                {courses
                  .filter((c) => c.dayOfWeek === d.dow)
                  .map((c) => {
                    const from = timeToSlot(c.startTime);
                    const to = timeToSlot(c.endTime);
                    return (
                      <CourseBlock
                        key={c.id}
                        course={c}
                        top={from * SLOT_H}
                        height={Math.max(to - from, 1) * SLOT_H}
                      />
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {sel && !dragging && (
        <NewCourseForm
          semesterId={semester.id}
          selection={sel}
          onDone={() => setSel(null)}
        />
      )}

      {!sel && (
        <p className="mt-2 px-1 text-xs text-c-text-faint">
          격자를 드래그하면 그 시간에 수업을 넣습니다
        </p>
      )}
    </div>
  );
}

/**
 * 격자 위의 수업 한 칸.
 *
 * 요일 열은 좁다(7열). 그래서 제목을 한 줄로 두면 "제품디…"처럼 곧바로 잘린다.
 * 칸은 세로로는 남으므로 줄바꿈을 허용해 아래로 흐르게 한다.
 * 색 점과 삭제 버튼은 글자와 가로폭을 다투지 않도록 띄워서 얹는다 —
 * 좁은 칸에서 몇 픽셀이 한 글자를 좌우한다.
 */
function CourseBlock({
  course,
  top,
  height,
}: {
  course: Course;
  top: number;
  height: number;
}) {
  const [pending, startTransition] = useTransition();
  const color = course.projectCategory
    ? projectColor(course.projectCategory, course.projectShade ?? 1)
    : null;

  // 한 줄(약 13px)과 안쪽 여백을 빼고 강의실을 적을 자리가 남는지
  const roomFits = height >= SLOT_H * 2;

  return (
    <div
      style={{ top, height }}
      title={course.room ? `${course.name} · ${course.room}` : course.name}
      className={`absolute inset-x-0.5 overflow-hidden rounded-c border border-c-line bg-c-surface ${
        pending ? "opacity-40" : ""
      }`}
      data-anim
    >
      {/* 프로젝트 색 — 왼쪽 세로 막대. 점보다 자리를 덜 먹는다. */}
      {color && (
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: color }}
          aria-hidden
        />
      )}

      {/* 격자 위에는 두 번 누르기 UI 를 넣을 자리가 없다.
          수업은 다시 드래그해 넣으면 그만이라 한 번에 지운다. */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() =>
          startTransition(async () => {
            await deleteCourse(course.id);
          })
        }
        aria-label={`${course.name} 삭제`}
        className="absolute right-0 top-0 z-10 px-1 text-[11px] leading-none text-c-text-faint hover:text-c-urgent"
      >
        ×
      </button>

      <div className={`py-0.5 pr-3.5 ${color ? "pl-1.5" : "pl-1"}`}>
        {/* truncate 를 쓰지 않는다 — white-space:nowrap 이 걸려 한 줄로 잘린다.
            break-words 는 공백 없는 긴 영문 과목명까지 접어 준다. */}
        <p className="break-words text-[11px] leading-[1.25] text-c-text-strong">
          {course.name}
        </p>
        {course.room && roomFits && (
          <p className="break-words text-[10px] leading-[1.25] text-c-text-faint">
            {course.room}
          </p>
        )}
      </div>
    </div>
  );
}

function NewCourseForm({
  semesterId,
  selection,
  onDone,
}: {
  semesterId: string;
  selection: Selection;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startTime = slotToTime(selection.from);
  const endTime = slotToTime(selection.to + 1); // 끝 칸의 끝까지
  const dayLabel = DAYS.find((d) => d.dow === selection.dow)?.label ?? "";

  function submit() {
    if (!name.trim() || pending) return;
    startTransition(async () => {
      const res = await createCourse({
        name,
        semesterId,
        dayOfWeek: selection.dow,
        startTime,
        endTime,
        room: room || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-2 flex flex-wrap items-center gap-2 rounded-c border border-c-line px-3 py-2"
    >
      <span className="shrink-0 text-xs tabular-nums text-c-text-muted">
        {dayLabel} {startTime}–{endTime}
      </span>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="과목명"
        className="min-w-28 flex-1 bg-transparent text-sm outline-none placeholder:text-c-text-faint"
      />
      <input
        value={room}
        onChange={(e) => setRoom(e.target.value)}
        placeholder="강의실"
        className="w-20 shrink-0 bg-transparent text-xs outline-none placeholder:text-c-text-faint"
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
        onClick={onDone}
        className="shrink-0 text-xs text-c-text-faint"
      >
        취소
      </button>
      {error && (
        <span className="w-full text-[11px] text-c-urgent">{error}</span>
      )}
    </form>
  );
}
