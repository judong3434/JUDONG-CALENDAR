import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysISO,
  ddayLabel,
  diffDays,
  dayOfMonth,
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
