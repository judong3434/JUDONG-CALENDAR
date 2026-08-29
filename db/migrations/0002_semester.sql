-- 학기를 course 에서 떼어낸다.
--
-- 0001 에서는 semester / semester_start / semester_end 를 course 행마다 들고 있었다.
-- 그러면 "학기 시작·종료일만 지정하면 그 사이 반복 생성"(브리프 §6)을 지키려 할 때
-- 날짜 하나 고치는 데 그 학기의 모든 수업 행을 함께 고쳐야 한다.
-- 한 군데에만 있어야 할 값이 여섯 군데에 복사돼 있는 구조였다.
--
-- 이 시점에 course 는 0행이다 — 시간표 UI 가 4단계에서 처음 생기므로
-- 데이터를 옮길 것이 없다. 그래서 테이블을 그냥 다시 만든다.

CREATE TABLE IF NOT EXISTS semester (
  id          TEXT PRIMARY KEY,
  -- '2026-2' 처럼 사람이 부르는 이름
  name        TEXT NOT NULL,
  -- 이 범위 안에서만 수업이 전개된다
  start_date  TEXT NOT NULL,              -- 'YYYY-MM-DD'
  end_date    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_semester_range ON semester(start_date, end_date);

DROP TABLE IF EXISTS course;

CREATE TABLE course (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  semester_id   TEXT NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
  -- 0=일 … 6=토 (JS Date.getDay() 와 동일하게 맞춘다)
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TEXT NOT NULL,            -- 'HH:MM'
  end_time      TEXT NOT NULL,
  room          TEXT,
  -- 수업도 프로젝트(과목)에 연결될 수 있다
  project_id    TEXT REFERENCES project(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 시간표 그리기: 요일 × 시작시각 순
CREATE INDEX IF NOT EXISTS idx_course_semester ON course(semester_id, day_of_week, start_time);
-- 오늘 수업 / 캘린더 전개: 요일로 먼저 좁힌다
CREATE INDEX IF NOT EXISTS idx_course_day      ON course(day_of_week);
