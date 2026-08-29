import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysISO,
  addMonths,
  ddayLabel,
  diffDays,
  dayOfMonth,
  monthGridDates,
  monthOf,
  weekOf,
} from "./date.ts";

test("diffDays", () => {
  assert.equal(diffDays("2026-08-29", "2026-09-12"), 14);
  assert.equal(diffDays("2026-08-29", "2026-08-29"), 0);
  assert.equal(diffDays("2026-08-29", "2026-08-27"), -2);
  // 월·연 경계
  assert.equal(diffDays("2026-08-31", "2026-09-01"), 1);
  assert.equal(diffDays("2026-12-31", "2027-01-01"), 1);
  // 윤년 (2028-02-29)
  assert.equal(diffDays("2028-02-28", "2028-03-01"), 2);
});

test("addDaysISO", () => {
  assert.equal(addDaysISO("2026-08-29", 3), "2026-09-01");
  assert.equal(addDaysISO("2026-09-01", -1), "2026-08-31");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
});

test("ddayLabel — 지난 것은 D+ 로 남는다", () => {
  assert.equal(ddayLabel("2026-09-12", "2026-08-29"), "D-14");
  assert.equal(ddayLabel("2026-08-29", "2026-08-29"), "D-DAY");
  assert.equal(ddayLabel("2026-08-27", "2026-08-29"), "D+2");
});

test("weekOf — 월요일에 시작해 일요일에 끝난다", () => {
  // 2026-08-29 는 토요일
  const w = weekOf("2026-08-29");
  assert.equal(w.length, 7);
  assert.equal(w[0], "2026-08-24"); // 월
  assert.equal(w[6], "2026-08-30"); // 일

  // 일요일에 물어봐도 같은 주가 나와야 한다 (다음 주로 넘어가면 안 된다)
  assert.deepEqual(weekOf("2026-08-30"), w);
  // 월요일에 물어봐도 마찬가지
  assert.deepEqual(weekOf("2026-08-24"), w);
});

test("dayOfMonth", () => {
  assert.equal(dayOfMonth("2026-09-01"), 1);
  assert.equal(dayOfMonth("2026-09-30"), 30);
});

test("monthOf / addMonths — 연 경계를 넘는다", () => {
  assert.equal(monthOf("2026-09-12"), "2026-09");
  assert.equal(addMonths("2026-09", 1), "2026-10");
  assert.equal(addMonths("2026-12", 1), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(addMonths("2026-09", -9), "2025-12");
});

test("monthGridDates", async (t) => {
  await t.test("항상 월요일에 시작해 일요일에 끝난다", () => {
    for (const m of ["2026-01", "2026-02", "2026-09", "2027-05", "2028-02"]) {
      const g = monthGridDates(m);
      assert.equal(g.length % 7, 0, `${m} 길이가 7의 배수가 아님`);
      assert.deepEqual(weekOf(g[0])[0], g[0], `${m} 시작이 월요일이 아님`);
      assert.deepEqual(weekOf(g[g.length - 1])[6], g[g.length - 1]);
    }
  });

  await t.test("그 달 1일과 말일을 모두 품는다", () => {
    const g = monthGridDates("2026-09");
    assert.ok(g.includes("2026-09-01"));
    assert.ok(g.includes("2026-09-30"));
    // 2026-09-01 은 화요일 → 앞에 8/31(월) 하나가 딸려 온다
    assert.equal(g[0], "2026-08-31");
  });

  await t.test("2월이 정확히 월~일에 맞으면 28칸", () => {
    // 2027-02-01 은 월요일, 2027-02-28 은 일요일
    assert.equal(monthGridDates("2027-02").length, 28);
  });

  await t.test("날짜가 하나도 빠지거나 겹치지 않는다", () => {
    const g = monthGridDates("2026-09");
    assert.equal(new Set(g).size, g.length);
    for (let i = 1; i < g.length; i++) {
      assert.equal(addDaysISO(g[i - 1], 1), g[i]);
    }
  });
});
