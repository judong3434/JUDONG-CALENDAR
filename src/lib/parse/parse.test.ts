import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCapture } from "./index.ts";

// 기준 시각을 고정한다. "내일"·"다음주 화"가 실행 날짜에 따라 흔들리면
// 테스트가 아니라 점괘가 된다.
const NOW = new Date(2026, 7, 29); // 2026-08-29 (토)

function p(input: string) {
  return parseCapture(input, NOW);
}

test("브리프의 파싱 예시", async (t) => {
  await t.test("9/12 3시 공모전 1차 시안 제출 디데이", () => {
    const r = p("9/12 3시 공모전 1차 시안 제출 디데이");
    assert.equal(r.date, "2026-09-12");
    // 오전/오후 표기가 없는 3시는 오후로 읽는다
    assert.equal(r.startTime, "15:00");
    assert.equal(r.title, "공모전 1차 시안 제출 디데이");
    assert.equal(r.kind, "event");
  });

  await t.test("내일 10시 타이포 과제 발표", () => {
    const r = p("내일 10시 타이포 과제 발표");
    assert.equal(r.date, "2026-08-30");
    // 10시는 오전으로 읽는다
    assert.equal(r.startTime, "10:00");
    assert.equal(r.title, "타이포 과제 발표");
  });

  await t.test("다음주 화 저녁 7시 스터디", () => {
    const r = p("다음주 화 저녁 7시 스터디");
    assert.equal(r.date, "2026-09-01");
    assert.equal(r.startTime, "19:00");
    assert.equal(r.title, "스터디");
  });

  await t.test("날짜가 없으면 Inbox — 실패가 아니다", () => {
    const r = p("포트폴리오 사이트 만들기");
    assert.equal(r.kind, "inbox");
    assert.equal(r.date, null);
    assert.equal(r.title, "포트폴리오 사이트 만들기");
  });
});

test("날짜 표기", async (t) => {
  await t.test("9월 12일", () => assert.equal(p("9월 12일 발표").date, "2026-09-12"));
  await t.test("10월 15일", () =>
    assert.equal(p("졸전 마감 10월 15일").date, "2026-10-15"));
  await t.test("2026-09-12", () =>
    assert.equal(p("2026-09-12 최종 제출").date, "2026-09-12"));
  await t.test("오늘", () => assert.equal(p("오늘 병원").date, "2026-08-29"));
  await t.test("모레", () => assert.equal(p("모레 회의").date, "2026-08-31"));
  await t.test("이번주 목요일", () =>
    assert.equal(p("이번주 목요일 제출").date, "2026-08-27"));
  await t.test("요일 단독 — 다가오는 그 요일", () =>
    assert.equal(p("월요일 수업").date, "2026-08-31"));
  await t.test("3일 뒤", () => assert.equal(p("3일 뒤 마감").date, "2026-09-01"));
  await t.test("2주 후", () => assert.equal(p("2주 후 발표").date, "2026-09-12"));
  await t.test("D-30", () => assert.equal(p("D-30 공모전").date, "2026-09-28"));

  await t.test("지난 달로 읽힐 날짜는 내년으로", () => {
    // 8월 말에 "1/5"는 지난 1월이 아니라 내년 1월이다
    assert.equal(p("1/5 신년 미팅").date, "2027-01-05");
  });

  await t.test("말이 안 되는 날짜는 읽지 않는다", () => {
    assert.equal(p("13/40 뭔가").date, null);
  });
});

test("시간 표기", async (t) => {
  await t.test("15:00", () => assert.equal(p("내일 15:00 미팅").startTime, "15:00"));
  await t.test("오후 3시 30분", () =>
    assert.equal(p("내일 오후 3시 30분 미팅").startTime, "15:30"));
  await t.test("3시반", () => assert.equal(p("내일 3시반 미팅").startTime, "15:30"));
  await t.test("새벽 2시", () =>
    assert.equal(p("내일 새벽 2시 마감").startTime, "02:00"));
  await t.test("오전 9시", () =>
    assert.equal(p("내일 오전 9시 수업").startTime, "09:00"));

  await t.test("범위 — 3-5시", () => {
    const r = p("내일 3-5시 회의");
    assert.equal(r.startTime, "15:00");
    assert.equal(r.endTime, "17:00");
  });

  await t.test("범위 — 15:00-16:00", () => {
    const r = p("내일 15:00-16:00 회의");
    assert.equal(r.startTime, "15:00");
    assert.equal(r.endTime, "16:00");
  });

  await t.test("범위 — 저녁 7시부터 9시까지", () => {
    const r = p("내일 저녁 7시부터 9시까지 스터디");
    assert.equal(r.startTime, "19:00");
    assert.equal(r.endTime, "21:00");
  });

  await t.test("시간이 없으면 종일 일정", () => {
    const r = p("9/12 시안 제출");
    assert.equal(r.allDay, true);
    assert.equal(r.startTime, null);
  });
});

test("날짜를 시간으로 다시 읽지 않는다", () => {
  // "9/12"가 시간 매처에 걸려 09:12 가 되면 안 된다
  const r = p("9/12 시안 제출");
  assert.equal(r.date, "2026-09-12");
  assert.equal(r.startTime, null);
});

test("원문은 항상 그대로 보존한다", () => {
  const raw = "9/12 3시 공모전 1차 시안 제출 디데이";
  assert.equal(p(raw).raw, raw);
});

test("제목이 비면 원문을 제목으로 쓴다", () => {
  const r = p("내일");
  assert.equal(r.title, "내일");
  assert.equal(r.date, "2026-08-30");
});
