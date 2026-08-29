"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";

/**
 * 두 번 눌러야 지워지는 삭제 버튼.
 *
 * 삭제는 되돌릴 수 없는데 모달을 띄우고 싶지는 않다(브리프의 "피하고 싶은 것").
 * 그래서 첫 클릭은 "삭제?"로 바뀌기만 하고, 두 번째 클릭에서 실제로 지운다.
 * 3초 안에 다시 누르지 않으면 알아서 원래대로 돌아간다 —
 * 잘못 눌렀을 때 사용자가 취소를 따로 찾지 않아도 되게.
 */
export function ConfirmDelete({
  onConfirm,
  label = "삭제",
  size = 13,
}: {
  onConfirm: () => Promise<unknown>;
  label?: string;
  size?: number;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!armed) return;
    timer.current = setTimeout(() => setArmed(false), 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [armed]);

  if (armed) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void (await onConfirm()))}
        className="shrink-0 rounded-c px-1.5 py-0.5 text-[11px] font-medium text-c-urgent disabled:opacity-40"
        data-anim
      >
        {label}?
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      aria-label={label}
      title={label}
      className="shrink-0 rounded-c p-0.5 text-c-text-faint hover:text-c-text"
      data-anim
    >
      <X size={size} strokeWidth={1.75} />
    </button>
  );
}
