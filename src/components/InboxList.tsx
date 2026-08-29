"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, X } from "lucide-react";
import type { Capture } from "@/types/domain";
import { formatRelative } from "@/lib/format";
import { discardCapture, scheduleInboxItem } from "@/lib/actions/capture";

/**
 * Inbox — 날짜가 없거나 파싱이 안 된 캡처가 쌓이는 곳.
 * (브리프 「첫 버전에 꼭 필요한 기능 8」)
 *
 * 일정이 아닌 것도 일단 받아주는 곳이 있어야 입력 마찰이 진짜로 0이 된다.
 * 여기 쌓인 건 실패가 아니다. 날짜를 정해주면 일정이 된다.
 *
 * 브리프는 "드래그해서 캘린더로 던지면 일정이 된다"고 했지만
 * 캘린더는 3단계라서, 지금은 날짜를 직접 넣어 확정하는 방식으로 둔다.
 */
export function InboxList({ items }: { items: Capture[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-c border border-dashed border-c-line px-4 py-6 text-center text-sm text-c-text-faint">
        비어 있습니다
      </p>
    );
  }

  return (
    <ul className="divide-y divide-c-line rounded-c border border-c-line">
      {items.map((item) => (
        <InboxRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function InboxRow({ item }: { item: Capture }) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [pending, startTransition] = useTransition();

  function schedule() {
    if (!date || pending) return;
    startTransition(async () => {
      await scheduleInboxItem(
        item.id,
        date,
        startTime || null,
        endTime || null,
      );
    });
  }

  function discard() {
    if (pending) return;
    startTransition(async () => {
      await discardCapture(item.id);
    });
  }

  return (
    <li
      className={`px-3 py-2.5 ${pending ? "opacity-50" : ""}`}
      data-anim
    >
      <div className="flex items-start justify-between gap-3">
        {/* 원문 그대로. 정제된 제목보다 당시 자기가 쓴 문장이 기억을 되살린다. */}
        <p className="min-w-0 flex-1 break-words text-sm text-c-text-strong">
          {item.rawText}
        </p>
        <RelativeTime value={item.createdAt} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && schedule()}
          className="rounded-c border border-c-line bg-c-bg px-2 py-1 text-xs text-c-text outline-none focus:border-c-line-strong"
        />
        <input
          type="time"
          aria-label="시작 시각"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && schedule()}
          className="rounded-c border border-c-line bg-c-bg px-2 py-1 text-xs text-c-text outline-none focus:border-c-line-strong"
        />
        <span className="text-xs text-c-text-faint">–</span>
        <input
          type="time"
          aria-label="종료 시각"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && schedule()}
          className="rounded-c border border-c-line bg-c-bg px-2 py-1 text-xs text-c-text outline-none focus:border-c-line-strong"
        />
        <button
          type="button"
          onClick={schedule}
          disabled={!date || pending}
          className="flex items-center gap-1 rounded-c border border-c-line px-2 py-1 text-xs text-c-text-muted disabled:opacity-40"
          data-anim
        >
          <Check size={12} strokeWidth={2} />
          일정으로
        </button>
        <button
          type="button"
          onClick={discard}
          disabled={pending}
          title="버리기"
          aria-label="버리기"
          className="ml-auto rounded-c p-1 text-c-text-faint hover:text-c-text disabled:opacity-40"
          data-anim
        >
          <X size={13} strokeWidth={1.75} />
        </button>
      </div>
    </li>
  );
}

/**
 * "3분 전"은 서버가 렌더한 순간과 브라우저가 붙는 순간의 값이 다를 수 있다.
 * 마운트 후에만 그린다 — 하이드레이션 불일치를 만드느니 한 프레임 늦게 나오는 게 낫다.
 */
const NO_OP = () => () => {};

function RelativeTime({ value }: { value: string }) {
  // 서버 스냅샷은 false, 클라이언트 스냅샷은 true. 값이 바뀌지 않으므로 구독은 비어 있다.
  const mounted = useSyncExternalStore(
    NO_OP,
    () => true,
    () => false,
  );
  return (
    <span className="shrink-0 text-[11px] tabular-nums text-c-text-faint">
      {mounted ? formatRelative(value) : ""}
    </span>
  );
}
