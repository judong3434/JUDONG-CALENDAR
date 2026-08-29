"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CornerDownLeft, Inbox } from "lucide-react";
import { parseCapture } from "@/lib/parse";
import { formatDateKo, formatTimeRange } from "@/lib/format";
import { saveCapture } from "@/lib/actions/capture";

/**
 * 이 앱의 심장. (브리프 「첫 버전에 꼭 필요한 기능 1」)
 *
 * 이겨야 할 상대는 구글 캘린더가 아니라 카톡 나에게 보내기의 속도다.
 * 그래서 이 컴포넌트가 지켜야 할 것:
 *   - 열자마자 커서가 여기 있다. 어느 화면에서든 Space / Cmd+K 로 돌아온다.
 *   - 폼을 먼저 보여주지 않는다. 미리보기는 타이핑 결과로만 나타난다.
 *   - Enter 하나로 끝난다. 고칠 때만 Tab 으로 필드에 들어간다.
 */

/** 파싱 결과 위에 사용자가 손으로 덮어쓴 값. 문장이 바뀌면 비워진다. */
interface Overrides {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export function QuickCapture() {
  const [raw, setRaw] = useState("");
  const [overrides, setOverrides] = useState<Overrides>({});
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 어느 화면에서든 Space 또는 Cmd/Ctrl+K 로 입력창에 돌아온다.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);

      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === " " && !typing) {
        // 입력 중일 때는 가로채지 않는다. 아니면 띄어쓰기를 못 한다.
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const parsed = useMemo(() => parseCapture(raw), [raw]);

  // 파싱 결과 위에 사용자 수정을 얹은 값. 이게 저장된다.
  const draft = {
    title: overrides.title ?? parsed.title,
    date: overrides.date ?? parsed.date ?? "",
    startTime: overrides.startTime ?? parsed.startTime ?? "",
    endTime: overrides.endTime ?? parsed.endTime ?? "",
  };

  const goesToInbox = !draft.date;

  function onRawChange(v: string) {
    setRaw(v);
    setOverrides({}); // 문장을 고쳤으면 파싱을 다시 믿는다
    setFlash(null);
  }

  function submit() {
    if (!raw.trim() || pending) return;
    const payload = {
      raw: raw.trim(),
      title: draft.title,
      date: draft.date || null,
      startTime: draft.startTime || null,
      endTime: draft.endTime || null,
    };
    startTransition(async () => {
      const res = await saveCapture(payload);
      if (!res.ok) return;
      setFlash(res.kind === "event" ? "일정으로 저장됨" : "Inbox 에 저장됨");
      setRaw("");
      setOverrides({});
      inputRef.current?.focus();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="sticky top-0 z-10 border-b border-c-line bg-c-bg/95 backdrop-blur"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          <input
            ref={inputRef}
            value={raw}
            onChange={(e) => onRawChange(e.target.value)}
            placeholder="9/12 3시 공모전 1차 시안 제출"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-c-text-strong outline-none placeholder:text-c-text-faint"
          />
          {raw ? (
            <button
              type="submit"
              disabled={pending}
              className="flex shrink-0 items-center gap-1.5 rounded-c border border-c-line px-2.5 py-1 text-xs text-c-text-muted disabled:opacity-50"
            >
              <CornerDownLeft size={13} strokeWidth={1.75} />
              저장
            </button>
          ) : (
            <kbd className="shrink-0 rounded-c border border-c-line px-1.5 py-0.5 text-[11px] text-c-text-faint">
              Space
            </kbd>
          )}
        </div>

        {/* 미리보기는 타이핑 결과로만 나타난다. 빈 입력에 폼을 먼저 보여주지 않는다. */}
        {raw.trim() && (
          <div className="pb-3">
            <div className="rounded-c border border-c-line bg-c-surface px-3 py-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Field label="제목" className="min-w-0 flex-1">
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setOverrides((o) => ({ ...o, title: e.target.value }))
                    }
                    className="w-full min-w-0 bg-transparent text-sm text-c-text-strong outline-none"
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Field label="날짜">
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(e) =>
                        setOverrides((o) => ({ ...o, date: e.target.value }))
                      }
                      className="bg-transparent text-sm text-c-text-strong outline-none"
                    />
                  </Field>

                  {/* 시작–종료. "10시부터 18시까지" 같은 일정은 끝나는 시각이 있어야 한다.
                      input 두 개라 label 로 감싸지 않고 aria-label 을 각각 준다. */}
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 text-[11px] text-c-text-faint">
                      시간
                    </span>
                    <input
                      type="time"
                      aria-label="시작 시각"
                      value={draft.startTime}
                      onChange={(e) =>
                        setOverrides((o) => ({
                          ...o,
                          startTime: e.target.value,
                        }))
                      }
                      className="bg-transparent text-sm text-c-text-strong outline-none"
                    />
                    <span className="text-c-text-faint">–</span>
                    <input
                      type="time"
                      aria-label="종료 시각"
                      value={draft.endTime}
                      onChange={(e) =>
                        setOverrides((o) => ({ ...o, endTime: e.target.value }))
                      }
                      className="bg-transparent text-sm text-c-text-strong outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 px-1 text-xs text-c-text-faint">
              {goesToInbox ? (
                <>
                  <Inbox size={12} strokeWidth={1.75} />
                  날짜를 못 읽었습니다 — Inbox 에 남습니다
                </>
              ) : (
                <>
                  <span className="text-c-text-muted">
                    {formatDateKo(draft.date)}{" "}
                    {formatTimeRange(draft.startTime || null, draft.endTime || null)}
                  </span>
                  <span className="text-c-line-strong">·</span>
                  Enter 로 저장, Tab 으로 수정
                </>
              )}
            </p>
          </div>
        )}

        {flash && !raw && (
          <p className="px-1 pb-3 text-xs text-c-text-faint">{flash}</p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex items-baseline gap-2 ${className}`}>
      <span className="shrink-0 text-[11px] text-c-text-faint">{label}</span>
      {children}
    </label>
  );
}
