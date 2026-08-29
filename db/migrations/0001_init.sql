-- Studio · 초기 스키마 (v0.1)
-- 브리프 §2 데이터 구조. 화면보다 이 구조가 먼저다.
--
-- 방언: SQLite (node:sqlite). 나중에 Supabase(Postgres)로 옮길 것을 전제로
--   - id 는 TEXT (uuid) — Postgres 에서 uuid 로 그대로 승격 가능
--   - 날짜는 'YYYY-MM-DD', 시간은 'HH:MM' 문자열 — Postgres date/time 으로 승격 가능
--   - 불리언은 INTEGER 0/1 — Postgres boolean 으로 승격 가능
-- 위 세 가지만 지키면 이관은 타입 치환 수준으로 끝난다.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Project — 최상위 단위. 일정과 할 일이 여기에 매달린다. (기획서 §2 원칙 넷)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  -- 색상(hue)은 카테고리가 가져간다. 2단 색 체계의 윗단.
  category      TEXT NOT NULL CHECK (category IN
                  ('school','personal','contest','club','work','routine')),
  -- 명도·채도(shade)는 프로젝트가 가져간다. 2단 색 체계의 아랫단.
  -- 같은 카테고리 안에서 프로젝트를 구분하는 값. 1이 가장 진하다.
  shade         INTEGER NOT NULL DEFAULT 1 CHECK (shade BETWEEN 1 AND 4),
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','waiting','done')),
  -- 최종 마감일. 없을 수 있다(상시 진행 프로젝트).
  due_date      TEXT,
  -- 현재 단계. 진행률 퍼센트보다 "지금 뭘 하는 중인지"가 더 정확한 정보다.
  stage         TEXT,
  -- 프로젝트 보드에서 드래그로 순서 변경. 작을수록 앞.
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_project_status ON project(status, sort_order);

-- ---------------------------------------------------------------------------
-- Capture — 모든 한 줄 입력의 원본. Inbox 와 "원문 보존"이 여기서 나온다.
--
-- 브리프의 5개 객체에는 없는 테이블이다. 추가한 이유:
--   (1) Inbox = 아직 아무것에도 귀속되지 않은 캡처. 별도 테이블 없이 표현된다.
--   (2) "캡처 원문 보존"을 Event/Task/Log 마다 raw_text 컬럼으로 중복시키지 않고
--       한 곳에서 관리한다.
--   (3) 파싱 실패는 오류가 아니라 정상 상태 — status='inbox' 로 그냥 남는다.
-- 이 테이블이 마음에 안 들면 events.raw_text 방식으로 되돌릴 수 있다.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capture (
  id            TEXT PRIMARY KEY,
  -- 사용자가 실제로 친 문장. 절대 가공하지 않는다.
  raw_text      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'inbox'
                  CHECK (status IN ('inbox','resolved','archived')),
  -- 규칙 파서로 처리했는지, LLM 폴백까지 갔는지. 파서 개선용 통계.
  parsed_by     TEXT CHECK (parsed_by IN ('rule','llm')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_capture_inbox ON capture(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Event — 캘린더에 찍히는 일정
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  date          TEXT NOT NULL,              -- 'YYYY-MM-DD'
  start_time    TEXT,                       -- 'HH:MM', 종일이면 NULL
  end_time      TEXT,
  all_day       INTEGER NOT NULL DEFAULT 0 CHECK (all_day IN (0,1)),
  project_id    TEXT REFERENCES project(id) ON DELETE SET NULL,
  location      TEXT,
  -- D-day 스트립에 올릴지 여부
  is_dday       INTEGER NOT NULL DEFAULT 0 CHECK (is_dday IN (0,1)),
  memo          TEXT,
  -- 이 일정을 만든 원본 한 줄
  capture_id    TEXT REFERENCES capture(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 월간 캘린더: 날짜 범위 조회
CREATE INDEX IF NOT EXISTS idx_event_date    ON event(date);
-- D-day 스트립: 가까운 순
CREATE INDEX IF NOT EXISTS idx_event_dday    ON event(is_dday, date);
-- 프로젝트 상세: 소속 일정 시간순
CREATE INDEX IF NOT EXISTS idx_event_project ON event(project_id, date);

-- ---------------------------------------------------------------------------
-- Task — 할 일. 이 앱의 핵심 장치가 여기 있다.
--
-- Event 에 Task 가 매달리고, Task 는 "실행할 날짜"를 따로 갖는다.
--   일정: 1차 시안 제출 = 9/12
--   할 일: 레퍼런스 리서치 = 9/5 실행
-- 입력 한 번(일정 + 할 일)으로 캘린더 · 오늘의 To-do · D-day 세 곳이 동시에 찬다.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  -- 언제 할 것인가. 오늘의 To-do 는 이 값이 오늘인 Task 전부다.
  do_date       TEXT,                       -- NULL 이면 아직 배치 안 됨
  -- 예상 소요시간(분). 주간 부하 히트맵·실작업 가능일 계산의 재료.
  est_minutes   INTEGER,
  -- 소속. Event 에 달리거나, Event 없이 Project 에만 달릴 수 있다.
  event_id      TEXT REFERENCES event(id)   ON DELETE CASCADE,
  project_id    TEXT REFERENCES project(id) ON DELETE SET NULL,
  done          INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0,1)),
  done_at       TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  capture_id    TEXT REFERENCES capture(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 오늘의 To-do: 실행일 + 미완료
CREATE INDEX IF NOT EXISTS idx_task_do_date ON task(do_date, done);
-- 프로젝트 진행률: 완료 Task ÷ 전체 Task
CREATE INDEX IF NOT EXISTS idx_task_project ON task(project_id, done);
CREATE INDEX IF NOT EXISTS idx_task_event   ON task(event_id);

-- ---------------------------------------------------------------------------
-- Course — 시간표. 학기 단위로 한 번 등록하고 매일 쓴다.
-- 반복 인스턴스를 테이블에 펼치지 않는다. 요일 + 학기 범위로 조회 시점에 전개한다.
-- (한 학기 15주 × 6과목 = 90행을 만들 이유가 없고, 시간 변경 시 전부 고쳐야 한다)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  -- 0=일 … 6=토 (JS Date.getDay() 와 동일하게 맞춘다)
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TEXT NOT NULL,              -- 'HH:MM'
  end_time      TEXT NOT NULL,
  room          TEXT,
  semester      TEXT NOT NULL,              -- '2026-2'
  -- 이 범위 안에서만 전개된다
  semester_start TEXT NOT NULL,             -- 'YYYY-MM-DD'
  semester_end   TEXT NOT NULL,
  -- 수업도 프로젝트(과목)에 연결될 수 있다
  project_id    TEXT REFERENCES project(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_course_semester ON course(semester, day_of_week, start_time);

-- ---------------------------------------------------------------------------
-- Log — 러닝 등 반복 활동 기록
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS log (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL DEFAULT 'run',
  date          TEXT NOT NULL,              -- 'YYYY-MM-DD'
  -- 미터·초 단위 정수로 저장한다. 페이스는 조회 시 계산 — 저장하지 않는다.
  distance_m    INTEGER,
  duration_sec  INTEGER,
  memo          TEXT,
  capture_id    TEXT REFERENCES capture(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_log_date ON log(kind, date);
