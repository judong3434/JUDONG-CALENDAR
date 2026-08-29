import { all } from "@/lib/db/client";
import { CATEGORY_LIST } from "@/lib/design/category";

// 이 화면은 임시다. 브리프의 「만드는 순서」상 지금 단계는 스키마와 구조까지이므로,
// 스키마가 실제로 적용됐는지 눈으로 확인하는 용도로만 둔다.
// 다음 단계(Quick Capture)에서 홈 대시보드로 교체된다.

export const dynamic = "force-dynamic";

function tableSummary() {
  const names = all<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type='table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  ).filter(({ name }) => !name.startsWith("_")); // _migration 은 제외

  // 테이블명은 sqlite_master 에서 나온 값이라 보간해도 안전하다.
  return names.map(({ name }) => ({
    name,
    count: all<{ n: number }>(`SELECT COUNT(*) AS n FROM "${name}"`)[0].n,
  }));
}

export default function Home() {
  const tables = tableSummary();
  const migrations = all<{ name: string; applied_at: string }>(
    "SELECT name, applied_at FROM _migration ORDER BY name",
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-12">
        <h1 className="text-2xl font-semibold tracking-tight text-c-text-strong">
          Studio
        </h1>
        <p className="mt-1 text-sm text-c-text-muted">
          스키마와 프로젝트 구조까지 완료. 화면은 다음 단계부터.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-c-text-faint">
          테이블
        </h2>
        <ul className="divide-y divide-c-line rounded-c border border-c-line">
          {tables.map((t) => (
            <li
              key={t.name}
              className="flex items-baseline justify-between px-4 py-2.5"
            >
              <span className="font-mono text-sm text-c-text-strong">
                {t.name}
              </span>
              <span className="text-xs tabular-nums text-c-text-faint">
                {t.count}행
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-c-text-faint">
          2단 색 체계
        </h2>
        <ul className="divide-y divide-c-line rounded-c border border-c-line">
          {CATEGORY_LIST.map((c) => (
            <li
              key={c.key}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5"
            >
              <span className="min-w-32 text-sm text-c-text-strong">
                {c.label}
              </span>
              <span className="min-w-14 text-xs text-c-text-faint">{c.hue}</span>
              <span className="flex gap-1.5">
                {c.shades.map((s) => (
                  <span
                    key={s}
                    className="h-4 w-4 rounded-full"
                    style={{ background: s }}
                    title={s}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-c-text-faint">
          적용된 마이그레이션
        </h2>
        <ul className="space-y-1">
          {migrations.map((m) => (
            <li key={m.name} className="font-mono text-xs text-c-text-muted">
              {m.name}
              <span className="ml-2 text-c-text-faint">{m.applied_at}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
