"use client";

import { useState, useTransition } from "react";
import type { Semester } from "@/lib/db/queries/course";
import { saveSemester } from "@/lib/actions/course";

/**
 * 학기 설정. (브리프 §6 "학기 시작·종료일만 지정하면 그 사이 반복 생성")
 *
 * 시작·종료일이 이 앱에서 유일하게 반복을 만드는 값이다.
 * 여기 날짜를 고치면 캘린더와 홈에 펼쳐지는 수업이 통째로 따라 바뀐다 —
 * 수업 행은 손댈 필요가 없다.
 */
export function SemesterForm({ semester }: { semester: Semester | null }) {
  const [editing, setEditing] = useState(semester === null);
  const [name, setName] = useState(semester?.name ?? "");
  const [startDate, setStartDate] = useState(semester?.startDate ?? "");
  const [endDate, setEndDate] = useState(semester?.endDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await saveSemester({
        id: semester?.id ?? null,
        name,
        startDate,
        endDate,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing && semester) {
    return (
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-semibold text-c-text-strong">
          {semester.name}
        </span>
        <span className="text-xs tabular-nums text-c-text-faint">
          {semester.startDate} – {semester.endDate}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-c-text-faint hover:text-c-text-muted"
          data-anim
        >
          수정
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-wrap items-center gap-2 rounded-c border border-c-line px-3 py-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="2026-2"
        aria-label="학기 이름"
        className="w-24 shrink-0 bg-transparent text-sm outline-none placeholder:text-c-text-faint"
      />
      <label className="flex items-center gap-1.5">
        <span className="text-[11px] text-c-text-faint">시작</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-transparent text-xs text-c-text outline-none"
        />
      </label>
      <label className="flex items-center gap-1.5">
        <span className="text-[11px] text-c-text-faint">종료</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-transparent text-xs text-c-text outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-c border border-c-line px-2 py-1 text-xs text-c-text-muted disabled:opacity-40"
      >
        {semester ? "저장" : "학기 만들기"}
      </button>
      {semester && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="shrink-0 text-xs text-c-text-faint"
        >
          취소
        </button>
      )}
      {error && (
        <span className="w-full text-[11px] text-c-urgent">{error}</span>
      )}
    </form>
  );
}
