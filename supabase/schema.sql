-- ================================================================
-- Seoul Grand Hotel — Supabase 완전 DB 스키마
-- 실행 방법: Supabase Dashboard → SQL Editor → 전체 복사 후 Run
-- ================================================================

-- ─── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 기존 테이블 정리 (재실행 대비, 의존성 역순) ──────────────
DROP TABLE IF EXISTS chatbot_messages    CASCADE;
DROP TABLE IF EXISTS admin_users         CASCADE;
DROP TABLE IF EXISTS notices             CASCADE;
DROP TABLE IF EXISTS faq                 CASCADE;
DROP TABLE IF EXISTS coupon_uses         CASCADE;
DROP TABLE IF EXISTS coupons             CASCADE;
DROP TABLE IF EXISTS promotions          CASCADE;
DROP TABLE IF EXISTS payments            CASCADE;
DROP TABLE IF EXISTS reservation_rooms   CASCADE;
DROP TABLE IF EXISTS reservation_guests  CASCADE;
DROP TABLE IF EXISTS reservations        CASCADE;
DROP TABLE IF EXISTS room_amenity_map    CASCADE;
DROP TABLE IF EXISTS room_amenity_types  CASCADE;
DROP TABLE IF EXISTS room_images         CASCADE;
DROP TABLE IF EXISTS rooms               CASCADE;
DROP TABLE IF EXISTS room_types          CASCADE;
DROP TABLE IF EXISTS membership_grades   CASCADE;
DROP TABLE IF EXISTS user_agreements     CASCADE;
DROP TABLE IF EXISTS profiles            CASCADE;

-- 기존 시퀀스/함수 정리
DROP SEQUENCE  IF EXISTS reservation_seq CASCADE;
DROP FUNCTION  IF EXISTS generate_reservation_no();
DROP FUNCTION  IF EXISTS handle_new_user()          CASCADE;
DROP FUNCTION  IF EXISTS update_updated_at()        CASCADE;
DROP FUNCTION  IF EXISTS is_admin()                 CASCADE;
DROP FUNCTION  IF EXISTS get_email_by_username(TEXT) CASCADE;


-- ================================================================
-- 1. MEMBERSHIP_GRADES — 멤버십 등급 (참조 테이블)
-- ================================================================
CREATE TABLE membership_grades (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(30)   NOT NULL,          -- Bronze / Silver / Gold / Diamond
  min_points    INTEGER       NOT NULL DEFAULT 0,
  max_points    INTEGER,                          -- NULL = 상한 없음
  discount_rate DECIMAL(5,2)  DEFAULT 0,          -- % 할인율
  benefits      JSONB         DEFAULT '[]',
  badge_color   VARCHAR(20)   DEFAULT '#866552',
  sort_order    SMALLINT      DEFAULT 0,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);
COMMENT ON TABLE membership_grades IS '멤버십 등급 정의 (Bronze→Diamond)';


-- ================================================================
-- 2. PROFILES — 회원 프로필 (auth.users 1:1 확장)
-- ================================================================
CREATE TABLE profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        VARCHAR(30) UNIQUE,             -- 아이디 (로그인에 사용 가능)
  email           VARCHAR(200),                   -- auth.users.email 미러
  name_ko         VARCHAR(50),
  name_en         VARCHAR(100),
  gender          VARCHAR(10) CHECK (gender IN ('male','female','other')),
  birth_date      DATE,
  phone           VARCHAR(20),
  address         TEXT,
  membership_id   UUID        REFERENCES membership_grades(id),
  points          INTEGER     DEFAULT 0,
  role            VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_active       BOOLEAN     DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE profiles IS '회원 프로필 — auth.users와 1:1';


-- ================================================================
-- 3. USER_AGREEMENTS — 약관 동의 이력
-- ================================================================
CREATE TABLE user_agreements (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_agreed        BOOLEAN     DEFAULT FALSE,
  privacy_agreed      BOOLEAN     DEFAULT FALSE,
  marketing_agreed    BOOLEAN     DEFAULT FALSE,
  terms_agreed_at     TIMESTAMPTZ,
  privacy_agreed_at   TIMESTAMPTZ,
  marketing_agreed_at TIMESTAMPTZ,
  ip_address          VARCHAR(45),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE user_agreements IS '약관 동의 기록';


-- ================================================================
-- 4. ROOM_TYPES — 객실 타입 분류
-- ================================================================
CREATE TABLE room_types (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ko     VARCHAR(50)  NOT NULL,
  name_en     VARCHAR(50)  NOT NULL,
  description TEXT,
  sort_order  SMALLINT     DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
COMMENT ON TABLE room_types IS '객실 타입 (스탠다드/디럭스/스위트/프레지덴셜)';


-- ================================================================
-- 5. ROOMS — 객실 정보
-- ================================================================
CREATE TABLE rooms (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id     UUID          REFERENCES room_types(id),
  room_number      VARCHAR(10)   UNIQUE NOT NULL,
  name_ko          VARCHAR(100)  NOT NULL,
  name_en          VARCHAR(100)  NOT NULL,
  description_ko   TEXT,
  description_en   TEXT,
  size_sqm         DECIMAL(6,1),
  floor            SMALLINT,
  max_adults       SMALLINT      DEFAULT 2,
  max_children     SMALLINT      DEFAULT 1,
  max_occupancy    SMALLINT      DEFAULT 3,
  bed_type         VARCHAR(60),
  view_type        VARCHAR(60),
  price_weekday    DECIMAL(12,0) NOT NULL,
  price_weekend    DECIMAL(12,0),
  status           VARCHAR(20)   DEFAULT 'available'
                   CHECK (status IN ('available','unavailable','maintenance')),
  is_active        BOOLEAN       DEFAULT TRUE,
  sort_order       SMALLINT      DEFAULT 0,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);
COMMENT ON TABLE rooms IS '객실 정보';


-- ================================================================
-- 6. ROOM_IMAGES — 객실 이미지
-- ================================================================
CREATE TABLE room_images (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID         NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url         TEXT         NOT NULL,
  alt_text    VARCHAR(200),
  is_main     BOOLEAN      DEFAULT FALSE,
  sort_order  SMALLINT     DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
COMMENT ON TABLE room_images IS '객실 이미지';


-- ================================================================
-- 7. ROOM_AMENITY_TYPES — 편의시설 마스터
-- ================================================================
CREATE TABLE room_amenity_types (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ko     VARCHAR(50) NOT NULL,
  name_en     VARCHAR(50),
  icon        VARCHAR(10),
  category    VARCHAR(30),
  sort_order  SMALLINT    DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE room_amenity_types IS '편의시설 마스터 데이터';


-- ================================================================
-- 8. ROOM_AMENITY_MAP — 객실↔편의시설 매핑
-- ================================================================
CREATE TABLE room_amenity_map (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  amenity_id  UUID NOT NULL REFERENCES room_amenity_types(id) ON DELETE CASCADE,
  UNIQUE (room_id, amenity_id)
);
COMMENT ON TABLE room_amenity_map IS '객실-편의시설 M:N 매핑';


-- ================================================================
-- 9. PROMOTIONS — 프로모션/패키지
-- ================================================================
CREATE TABLE promotions (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ko         VARCHAR(200)  NOT NULL,
  title_en         VARCHAR(200),
  description_ko   TEXT,
  description_en   TEXT,
  icon             VARCHAR(10)   DEFAULT '—',
  discount_type    VARCHAR(10)   CHECK (discount_type IN ('percent','amount','add')),
  discount_value   DECIMAL(10,0) DEFAULT 0,
  add_price        DECIMAL(10,0) DEFAULT 0,
  includes         JSONB         DEFAULT '[]',
  applicable_rooms JSONB         DEFAULT '[]',   -- 빈 배열 = 전체 객실
  valid_from       DATE,
  valid_until      DATE,
  is_active        BOOLEAN       DEFAULT TRUE,
  sort_order       SMALLINT      DEFAULT 0,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);
COMMENT ON TABLE promotions IS '프로모션 및 패키지';


-- ================================================================
-- 10. COUPONS — 할인 쿠폰
-- ================================================================
CREATE TABLE coupons (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(30)   UNIQUE NOT NULL,
  name_ko         VARCHAR(100)  NOT NULL,
  discount_type   VARCHAR(10)   CHECK (discount_type IN ('percent','amount')),
  discount_value  DECIMAL(10,0) NOT NULL,
  min_amount      DECIMAL(10,0) DEFAULT 0,
  max_discount    DECIMAL(10,0),
  max_uses        INTEGER,
  used_count      INTEGER       DEFAULT 0,
  valid_from      DATE,
  valid_until     DATE,
  is_active       BOOLEAN       DEFAULT TRUE,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);
COMMENT ON TABLE coupons IS '할인 쿠폰';


-- ================================================================
-- 11. RESERVATIONS — 예약 메인
-- ================================================================
CREATE SEQUENCE reservation_seq START WITH 100001;

CREATE OR REPLACE FUNCTION generate_reservation_no()
RETURNS TEXT AS $$
  SELECT 'SGH-' || LPAD(nextval('reservation_seq')::TEXT, 6, '0');
$$ LANGUAGE sql;

CREATE TABLE reservations (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_no   VARCHAR(20)   UNIQUE DEFAULT generate_reservation_no(),
  user_id          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  checkin_date     DATE          NOT NULL,
  checkout_date    DATE          NOT NULL,
  nights           SMALLINT      NOT NULL,
  rooms_count      SMALLINT      DEFAULT 1,
  adults           SMALLINT      DEFAULT 2,
  children         SMALLINT      DEFAULT 0,
  status           VARCHAR(20)   DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','cancelled','completed')),
  payment_status   VARCHAR(20)   DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid','paid','failed','refunded')),
  promotion_id     UUID          REFERENCES promotions(id),
  coupon_id        UUID          REFERENCES coupons(id),
  coupon_code      VARCHAR(30),
  base_amount      DECIMAL(12,0) DEFAULT 0,
  promo_discount   DECIMAL(12,0) DEFAULT 0,
  coupon_discount  DECIMAL(12,0) DEFAULT 0,
  service_amount   DECIMAL(12,0) DEFAULT 0,
  tax_amount       DECIMAL(12,0) DEFAULT 0,
  total_amount     DECIMAL(12,0) DEFAULT 0,
  -- 특별 요청
  late_checkin     BOOLEAN       DEFAULT FALSE,
  high_floor       BOOLEAN       DEFAULT FALSE,
  non_smoking      BOOLEAN       DEFAULT FALSE,
  baby_crib        BOOLEAN       DEFAULT FALSE,
  airport_pickup   BOOLEAN       DEFAULT FALSE,
  special_requests TEXT,
  -- 관리
  admin_notes      TEXT,
  cancelled_at     TIMESTAMPTZ,
  cancel_reason    TEXT,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);
COMMENT ON TABLE reservations IS '예약 메인 (status: pending→confirmed→completed / cancelled)';


-- ================================================================
-- 12. RESERVATION_GUESTS — 예약자 정보
-- ================================================================
CREATE TABLE reservation_guests (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id  UUID        NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  name_ko         VARCHAR(50),
  name_en         VARCHAR(100),
  email           VARCHAR(200),
  phone           VARCHAR(20),
  country         VARCHAR(50) DEFAULT 'KR',
  is_primary      BOOLEAN     DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE reservation_guests IS '예약자 정보 (대표 게스트 + 추가 게스트)';


-- ================================================================
-- 13. RESERVATION_ROOMS — 예약별 객실 상세
-- ================================================================
CREATE TABLE reservation_rooms (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id   UUID          NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id          UUID          NOT NULL REFERENCES rooms(id),
  price_per_night  DECIMAL(12,0) NOT NULL,
  promotion_id     UUID          REFERENCES promotions(id),
  promo_label      VARCHAR(100),
  promo_discount   DECIMAL(12,0) DEFAULT 0,
  add_price        DECIMAL(12,0) DEFAULT 0,
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);
COMMENT ON TABLE reservation_rooms IS '예약-객실 상세 (객실별 요금 스냅샷)';


-- ================================================================
-- 14. PAYMENTS — 결제
-- ================================================================
CREATE TABLE payments (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id  UUID          NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  user_id         UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  method          VARCHAR(20)   CHECK (method IN ('credit','kakao','naver','transfer','onsite')),
  status          VARCHAR(20)   DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid','paid','failed','refunded')),
  amount          DECIMAL(12,0) NOT NULL,
  currency        CHAR(3)       DEFAULT 'KRW',
  transaction_id  VARCHAR(200),
  pg_response     JSONB,
  paid_at         TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  refund_amount   DECIMAL(12,0) DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);
COMMENT ON TABLE payments IS '결제 내역 (status: unpaid→paid / failed / refunded)';


-- ================================================================
-- 15. FAQ
-- ================================================================
CREATE TABLE faq (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  category     VARCHAR(50),
  question_ko  TEXT        NOT NULL,
  answer_ko    TEXT        NOT NULL,
  view_count   INTEGER     DEFAULT 0,
  sort_order   SMALLINT    DEFAULT 0,
  is_active    BOOLEAN     DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE faq IS 'FAQ';


-- ================================================================
-- 16. NOTICES — 공지사항
-- ================================================================
CREATE TABLE notices (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ko    VARCHAR(200) NOT NULL,
  content_ko  TEXT,
  is_pinned   BOOLEAN     DEFAULT FALSE,
  is_active   BOOLEAN     DEFAULT TRUE,
  view_count  INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE notices IS '공지사항';


-- ================================================================
-- 17. CHATBOT_MESSAGES — 챗봇 대화 이력
-- ================================================================
CREATE TABLE chatbot_messages (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  VARCHAR(100),
  role        VARCHAR(15) CHECK (role IN ('user','assistant','system')),
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE chatbot_messages IS '챗봇 대화 이력';


-- ================================================================
-- 18. ADMIN_USERS — 관리자 등록
-- ================================================================
CREATE TABLE admin_users (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  permissions  JSONB       DEFAULT '{
    "reservations": true,
    "rooms":        true,
    "users":        true,
    "promotions":   true,
    "faq":          true,
    "notices":      true,
    "chatbot":      true
  }',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE admin_users IS '관리자 계정 — 이 테이블에 등록된 user_id만 관리자 권한 보유';


-- ================================================================
-- INDEXES — 성능 최적화
-- ================================================================
CREATE INDEX idx_profiles_username       ON profiles(username);
CREATE INDEX idx_profiles_email          ON profiles(email);
CREATE INDEX idx_user_agreements_user_id ON user_agreements(user_id);
CREATE INDEX idx_rooms_status            ON rooms(status);
CREATE INDEX idx_rooms_type_id           ON rooms(room_type_id);
CREATE INDEX idx_room_images_room_id     ON room_images(room_id);
CREATE INDEX idx_room_amenity_room_id    ON room_amenity_map(room_id);
CREATE INDEX idx_reservations_user_id    ON reservations(user_id);
CREATE INDEX idx_reservations_status     ON reservations(status);
CREATE INDEX idx_reservations_checkin    ON reservations(checkin_date);
CREATE INDEX idx_reservations_checkout   ON reservations(checkout_date);
CREATE INDEX idx_rsv_guests_rsv_id       ON reservation_guests(reservation_id);
CREATE INDEX idx_rsv_rooms_rsv_id        ON reservation_rooms(reservation_id);
CREATE INDEX idx_rsv_rooms_room_id       ON reservation_rooms(room_id);
CREATE INDEX idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX idx_payments_user_id        ON payments(user_id);
CREATE INDEX idx_chatbot_session_id      ON chatbot_messages(session_id);


-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_upd     BEFORE UPDATE ON profiles     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_rooms_upd        BEFORE UPDATE ON rooms        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reservations_upd BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_upd     BEFORE UPDATE ON payments     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_promotions_upd   BEFORE UPDATE ON promotions   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 회원가입 시 profiles 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, name_ko, name_en, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name_ko',
    NEW.raw_user_meta_data->>'name_en',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 관리자 여부 확인 (RLS에서 사용, SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 아이디(username)로 이메일 조회 (로그인 시 사용, 비인증 상태에서도 가능)
CREATE OR REPLACE FUNCTION get_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
  SELECT email FROM public.profiles WHERE username = p_username LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- ================================================================
-- SEED DATA — 기본 데이터
-- ================================================================

-- 멤버십 등급
INSERT INTO membership_grades (name, min_points, max_points, discount_rate, badge_color, sort_order) VALUES
('Bronze',   0,      9999,   0,  '#cd7f32', 1),
('Silver',   10000,  49999,  3,  '#c0c0c0', 2),
('Gold',     50000,  149999, 7,  '#ffd700', 3),
('Diamond',  150000, NULL,   12, '#b9f2ff', 4);

-- 객실 타입
INSERT INTO room_types (name_ko, name_en, sort_order) VALUES
('스탠다드', 'Standard', 1),
('디럭스',   'Deluxe',   2),
('스위트',   'Suite',    3),
('프레지덴셜','Presidential', 4);

-- 편의시설 마스터
INSERT INTO room_amenity_types (name_ko, name_en, icon, category, sort_order) VALUES
('무료 Wi-Fi',    'Free Wi-Fi',        '📶', 'tech',     1),
('에어컨',        'Air Conditioning',  '❄️', 'comfort',  2),
('미니바',        'Mini Bar',          '🍾', 'food',     3),
('금고',          'Safe',              '🔒', 'security', 4),
('평면 TV',       'Flat TV',           '📺', 'tech',     5),
('에스프레소 머신','Espresso Machine',  '☕', 'food',     6),
('대리석 욕실',   'Marble Bathroom',   '🛁', 'bathroom', 7),
('욕조',          'Bathtub',           '🛁', 'bathroom', 8),
('테라스',        'Terrace',           '🌅', 'view',     9),
('거실',          'Living Room',       '🛋', 'space',    10),
('컨시어지',      'Concierge',         '🎩', 'service',  11),
('버틀러 서비스', 'Butler Service',    '🤵', 'service',  12);

-- FAQ 기본 데이터
INSERT INTO faq (category, question_ko, answer_ko, sort_order) VALUES
('체크인/아웃', '체크인과 체크아웃 시간은 언제인가요?', '체크인은 오후 3시, 체크아웃은 오전 11시입니다. 레이트 체크아웃은 별도 요금으로 오후 4시까지 가능합니다.', 1),
('체크인/아웃', '얼리 체크인이 가능한가요?', '얼리 체크인은 객실 상황에 따라 가능하며, 오전 9시부터 가능합니다. 사전 문의를 권장드립니다.', 2),
('예약',        '예약 취소 정책은 어떻게 되나요?', '체크인 7일 전 취소 시 전액 환불, 3일 전 취소 시 50% 환불, 이후 취소 시 환불이 불가합니다.', 3),
('예약',        '예약 변경이 가능한가요?', '체크인 3일 전까지 예약 변경이 가능합니다. 마이페이지 또는 고객센터를 통해 변경하실 수 있습니다.', 4),
('시설',        '주차 시설이 있나요?', '지하 주차장을 운영하고 있으며, 발렛파킹 서비스도 제공합니다. 1박당 주차 요금은 30,000원입니다.', 5),
('시설',        '수영장과 스파는 언제 이용 가능한가요?', '수영장은 오전 7시~오후 10시, 스파는 오전 9시~오후 9시 운영합니다.', 6);

-- 공지사항 기본 데이터
INSERT INTO notices (title_ko, content_ko, is_pinned) VALUES
('서울 그랜드 호텔 그랜드 오픈 안내', '서울 그랜드 호텔이 새롭게 문을 열었습니다. 오픈 기념 특별 할인 혜택을 제공합니다.', true),
('여름 시즌 운영 안내', '2026년 여름 시즌 특별 패키지 및 운영 안내입니다.', false);

-- 쿠폰 기본 데이터
INSERT INTO coupons (code, name_ko, discount_type, discount_value, min_amount, max_discount, valid_from, valid_until) VALUES
('WELCOME10', '신규 회원 10% 할인', 'percent', 10, 200000, 50000, '2025-01-01', '2026-12-31'),
('SUMMER50K',  '여름 특가 5만원 할인', 'amount',  50000, 300000, NULL, '2026-06-01', '2026-08-31'),
('SEOUL10',    '서울 그랜드 10% 할인', 'percent', 10, 100000, 30000, '2025-01-01', '2027-12-31');

-- 프로모션 기본 데이터
INSERT INTO promotions (title_ko, title_en, description_ko, icon, discount_type, discount_value, add_price, sort_order) VALUES
('패키지 없음', 'No Package', '기본 요금으로 예약합니다.', '—', 'amount', 0, 0, 1),
('조식 포함', 'Breakfast Included', '2인 조식 뷔페가 매일 제공됩니다.', '🍳', 'add', 0, 50000, 2),
('얼리버드 15%', 'Early Bird 15%', '30일 전 예약 시 15% 할인.', '⏰', 'percent', 15, 0, 3),
('허니문 스페셜', 'Honeymoon Special', '샴페인, 꽃장식, 레이트 체크아웃 포함.', '💍', 'add', 0, 100000, 4),
('패밀리 플랜', 'Family Plan', '어린이 조식 무료, 패밀리 어메니티 제공.', '👨‍👩‍👧', 'percent', 10, 0, 5),
('스파 패키지', 'Spa Package', '커플 시그니처 스파 60분 이용권.', '🧖', 'add', 0, 120000, 6);


-- ================================================================
-- (직접 실행) 객실 데이터 — 배포 후 실제 이미지 URL로 교체
-- ================================================================
DO $$
DECLARE
  v_standard UUID;
  v_deluxe   UUID;
  v_suite    UUID;
  v_presid   UUID;
  r1 UUID; r2 UUID; r3 UUID; r4 UUID;
  a1 UUID; a2 UUID; a3 UUID; a4 UUID; a5 UUID; a6 UUID; a7 UUID; a8 UUID; a9 UUID; a10 UUID;
BEGIN
  SELECT id INTO v_standard FROM room_types WHERE name_en = 'Standard'     LIMIT 1;
  SELECT id INTO v_deluxe   FROM room_types WHERE name_en = 'Deluxe'       LIMIT 1;
  SELECT id INTO v_suite    FROM room_types WHERE name_en = 'Suite'         LIMIT 1;
  SELECT id INTO v_presid   FROM room_types WHERE name_en = 'Presidential'  LIMIT 1;

  -- 객실 삽입
  INSERT INTO rooms (room_type_id, room_number, name_ko, name_en, description_ko, size_sqm, floor, max_adults, max_children, max_occupancy, bed_type, view_type, price_weekday, price_weekend, sort_order)
  VALUES
    (v_standard, '1001', '스탠다드 더블', 'Standard Double', '도심 전망의 아늑한 스탠다드 더블 룸입니다.', 35.0, 10, 2, 1, 3, 'King Bed', 'City View', 280000, 320000, 1),
    (v_deluxe,   '2001', '디럭스 킹',     'Deluxe King',     '한강 전망의 럭셔리 디럭스 킹 룸입니다.',     48.0, 20, 2, 2, 4, 'King Bed', 'River View', 420000, 480000, 2),
    (v_suite,    '3001', '그랜드 스위트', 'Grand Suite',     '독립 거실과 파노라마 뷰의 프리미엄 스위트.',  78.0, 30, 3, 2, 5, 'King Bed', 'Panoramic View', 680000, 780000, 3),
    (v_presid,   '4001', '프레지덴셜 스위트', 'Presidential Suite', '360도 뷰의 최상급 스위트룸.',       150.0, 40, 4, 2, 6, 'King Bed + Sofa Bed', 'Panoramic City & River', 1500000, 1700000, 4)
  RETURNING id INTO r1;

  SELECT id INTO r1 FROM rooms WHERE room_number = '1001';
  SELECT id INTO r2 FROM rooms WHERE room_number = '2001';
  SELECT id INTO r3 FROM rooms WHERE room_number = '3001';
  SELECT id INTO r4 FROM rooms WHERE room_number = '4001';

  -- 이미지 삽입
  INSERT INTO room_images (room_id, url, is_main, sort_order) VALUES
    (r1, '/images/room01.jpg', true, 1),
    (r2, '/images/room02.jpg', true, 1),
    (r3, '/images/room03.jpg', true, 1),
    (r4, '/images/hotel_inside.png', true, 1);

  -- 편의시설 매핑 (객실마다)
  SELECT id INTO a1 FROM room_amenity_types WHERE name_en = 'Free Wi-Fi' LIMIT 1;
  SELECT id INTO a2 FROM room_amenity_types WHERE name_en = 'Air Conditioning' LIMIT 1;
  SELECT id INTO a3 FROM room_amenity_types WHERE name_en = 'Mini Bar' LIMIT 1;
  SELECT id INTO a4 FROM room_amenity_types WHERE name_en = 'Safe' LIMIT 1;
  SELECT id INTO a5 FROM room_amenity_types WHERE name_en = 'Flat TV' LIMIT 1;
  SELECT id INTO a6 FROM room_amenity_types WHERE name_en = 'Espresso Machine' LIMIT 1;
  SELECT id INTO a7 FROM room_amenity_types WHERE name_en = 'Marble Bathroom' LIMIT 1;
  SELECT id INTO a8 FROM room_amenity_types WHERE name_en = 'Bathtub' LIMIT 1;
  SELECT id INTO a9 FROM room_amenity_types WHERE name_en = 'Terrace' LIMIT 1;
  SELECT id INTO a10 FROM room_amenity_types WHERE name_en = 'Living Room' LIMIT 1;

  -- 스탠다드: Wi-Fi, AC, MiniBar, Safe, TV, Espresso
  INSERT INTO room_amenity_map (room_id, amenity_id) VALUES (r1,a1),(r1,a2),(r1,a3),(r1,a4),(r1,a5),(r1,a6) ON CONFLICT DO NOTHING;
  -- 디럭스: + MarbleBath, Bathtub, Terrace
  INSERT INTO room_amenity_map (room_id, amenity_id) VALUES (r2,a1),(r2,a2),(r2,a3),(r2,a4),(r2,a5),(r2,a6),(r2,a7),(r2,a8),(r2,a9) ON CONFLICT DO NOTHING;
  -- 스위트: + Living
  INSERT INTO room_amenity_map (room_id, amenity_id) VALUES (r3,a1),(r3,a2),(r3,a3),(r3,a4),(r3,a5),(r3,a6),(r3,a7),(r3,a8),(r3,a9),(r3,a10) ON CONFLICT DO NOTHING;
  -- 프레지덴셜: 전부
  INSERT INTO room_amenity_map (room_id, amenity_id) VALUES (r4,a1),(r4,a2),(r4,a3),(r4,a4),(r4,a5),(r4,a6),(r4,a7),(r4,a8),(r4,a9),(r4,a10) ON CONFLICT DO NOTHING;
END $$;


-- ================================================================
-- (운영 시) 관리자 계정 등록 방법
-- 1. 회원가입을 먼저 진행합니다.
-- 2. 아래 쿼리에서 이메일을 교체하고 실행합니다.
-- ================================================================
-- INSERT INTO admin_users (user_id, display_name)
-- SELECT id, '관리자' FROM auth.users WHERE email = 'admin@seoulgh.com';
