-- ============================================================
-- Seoul Grand Hotel — Supabase Database Schema
-- Supabase SQL Editor에서 전체 실행
-- 실행 순서: Extensions → Tables → Functions → Triggers → RLS → Seed
-- ============================================================

-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. PROFILES (auth.users 확장)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name_ko         VARCHAR(50),
  name_en         VARCHAR(100),
  phone           VARCHAR(20),
  nationality     VARCHAR(50)  DEFAULT 'KR',
  birth_date      DATE,
  gender          VARCHAR(10)  CHECK (gender IN ('male','female','other')),
  membership      VARCHAR(20)  DEFAULT 'guest' CHECK (membership IN ('guest','silver','gold','diamond')),
  points          INTEGER      DEFAULT 0,
  role            VARCHAR(10)  DEFAULT 'user'  CHECK (role IN ('user','admin')),
  marketing_agree BOOLEAN      DEFAULT FALSE,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE profiles IS '회원 프로필 — auth.users와 1:1';


-- ============================================================
-- 2. ROOMS (객실)
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number      VARCHAR(10)   UNIQUE NOT NULL,
  name_ko          VARCHAR(100)  NOT NULL,
  name_en          VARCHAR(100)  NOT NULL,
  category         VARCHAR(20)   NOT NULL CHECK (category IN ('standard','deluxe','suite','presidential')),
  description_ko   TEXT,
  description_en   TEXT,
  size_sqm         DECIMAL(6,1),
  floor            SMALLINT,
  max_adults       SMALLINT      DEFAULT 2,
  max_children     SMALLINT      DEFAULT 1,
  max_occupancy    SMALLINT      DEFAULT 3,
  bed_type         VARCHAR(60),
  view_type        VARCHAR(60),
  price_per_night  DECIMAL(12,0) NOT NULL,
  amenities        JSONB         DEFAULT '[]',
  images           JSONB         DEFAULT '[]',
  is_active        BOOLEAN       DEFAULT TRUE,
  sort_order       SMALLINT      DEFAULT 0,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE rooms IS '호텔 객실 정보';


-- ============================================================
-- 3. PACKAGES (패키지/프로모션)
-- ============================================================
CREATE TABLE IF NOT EXISTS packages (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ko         VARCHAR(100)  NOT NULL,
  name_en         VARCHAR(100)  NOT NULL,
  description_ko  TEXT,
  description_en  TEXT,
  icon            VARCHAR(10)   DEFAULT '—',
  discount_type   VARCHAR(10)   DEFAULT 'amount' CHECK (discount_type IN ('percent','amount')),
  discount_value  DECIMAL(10,0) DEFAULT 0,
  add_price       DECIMAL(10,0) DEFAULT 0,
  includes        JSONB         DEFAULT '[]',
  valid_from      DATE,
  valid_until     DATE,
  is_active       BOOLEAN       DEFAULT TRUE,
  sort_order      SMALLINT      DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE packages IS '예약 패키지 및 프로모션';


-- ============================================================
-- 4. SERVICES (부가 서비스)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ko     VARCHAR(100)  NOT NULL,
  name_en     VARCHAR(100)  NOT NULL,
  description TEXT,
  price       DECIMAL(10,0) NOT NULL DEFAULT 0,
  category    VARCHAR(50),
  is_active   BOOLEAN       DEFAULT TRUE,
  sort_order  SMALLINT      DEFAULT 0,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE services IS '부가 서비스 (공항픽업, 꽃장식 등)';


-- ============================================================
-- 5. COUPONS (할인 쿠폰)
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(30)   UNIQUE NOT NULL,
  name_ko         VARCHAR(100)  NOT NULL,
  discount_type   VARCHAR(10)   DEFAULT 'percent' CHECK (discount_type IN ('percent','amount')),
  discount_value  DECIMAL(10,0) NOT NULL,
  min_amount      DECIMAL(10,0) DEFAULT 0,
  max_discount    DECIMAL(10,0),
  valid_from      DATE,
  valid_until     DATE,
  max_uses        INTEGER,
  used_count      INTEGER       DEFAULT 0,
  is_active       BOOLEAN       DEFAULT TRUE,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE coupons IS '할인 쿠폰';


-- ============================================================
-- 6. RESERVATIONS (예약)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS reservation_seq START WITH 100001;

CREATE OR REPLACE FUNCTION generate_reservation_no()
RETURNS TEXT AS $$
  SELECT 'SGH-' || LPAD(nextval('reservation_seq')::TEXT, 6, '0');
$$ LANGUAGE sql;

CREATE TABLE IF NOT EXISTS reservations (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_no   VARCHAR(20)   UNIQUE DEFAULT generate_reservation_no(),
  user_id          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  room_id          UUID          NOT NULL REFERENCES rooms(id),
  package_id       UUID          REFERENCES packages(id),
  checkin_date     DATE          NOT NULL,
  checkout_date    DATE          NOT NULL,
  nights           SMALLINT      NOT NULL,
  rooms_count      SMALLINT      DEFAULT 1,
  adults           SMALLINT      DEFAULT 2,
  children         SMALLINT      DEFAULT 0,
  services         JSONB         DEFAULT '[]',
  coupon_code      VARCHAR(30),
  guest_name_ko    VARCHAR(50),
  guest_name_en    VARCHAR(100),
  guest_email      VARCHAR(200),
  guest_phone      VARCHAR(20),
  guest_country    VARCHAR(50)   DEFAULT 'KR',
  special_request  TEXT,
  status           VARCHAR(20)   DEFAULT 'confirmed'
                   CHECK (status IN ('pending','confirmed','checked_in','checked_out','cancelled','no_show')),
  payment_method   VARCHAR(20)
                   CHECK (payment_method IN ('credit','kakao','naver','transfer','onsite')),
  price_base       DECIMAL(12,0) DEFAULT 0,
  price_pkg        DECIMAL(12,0) DEFAULT 0,
  price_svc        DECIMAL(12,0) DEFAULT 0,
  price_discount   DECIMAL(12,0) DEFAULT 0,
  price_tax        DECIMAL(12,0) DEFAULT 0,
  price_total      DECIMAL(12,0) DEFAULT 0,
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE reservations IS '호텔 예약';


-- ============================================================
-- 7. PAYMENTS (결제)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id  UUID          NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  user_id         UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  method          VARCHAR(20)   NOT NULL,
  status          VARCHAR(20)   DEFAULT 'completed'
                  CHECK (status IN ('pending','completed','failed','refunded','partial_refund')),
  amount          DECIMAL(12,0) NOT NULL,
  currency        CHAR(3)       DEFAULT 'KRW',
  transaction_id  VARCHAR(200),
  paid_at         TIMESTAMPTZ   DEFAULT NOW(),
  refunded_at     TIMESTAMPTZ,
  refund_amount   DECIMAL(12,0) DEFAULT 0,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE payments IS '결제 내역';


-- ============================================================
-- 8. COUPON_USES (쿠폰 사용 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_uses (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id        UUID          NOT NULL REFERENCES coupons(id),
  reservation_id   UUID          NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  user_id          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  discount_applied DECIMAL(10,0) DEFAULT 0,
  used_at          TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE coupon_uses IS '쿠폰 사용 이력';


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reservations_user_id    ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id    ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin    ON reservations(checkin_date);
CREATE INDEX IF NOT EXISTS idx_reservations_checkout   ON reservations(checkout_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status     ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon_id   ON coupon_uses(coupon_id);


-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 회원가입 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name_ko, name_en, phone)
  VALUES (
    NEW.id,
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

-- 관리자 여부 확인 (RLS 내 사용)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================================
-- RLS — ENABLE
-- ============================================================
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES — PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());


-- ============================================================
-- RLS POLICIES — ROOMS (비회원도 조회 가능)
-- ============================================================
DROP POLICY IF EXISTS "rooms_select"  ON rooms;
DROP POLICY IF EXISTS "rooms_insert"  ON rooms;
DROP POLICY IF EXISTS "rooms_update"  ON rooms;
DROP POLICY IF EXISTS "rooms_delete"  ON rooms;

CREATE POLICY "rooms_select"  ON rooms FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "rooms_insert"  ON rooms FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "rooms_update"  ON rooms FOR UPDATE USING (is_admin());
CREATE POLICY "rooms_delete"  ON rooms FOR DELETE USING (is_admin());


-- ============================================================
-- RLS POLICIES — PACKAGES (비회원도 조회 가능)
-- ============================================================
DROP POLICY IF EXISTS "packages_select" ON packages;
DROP POLICY IF EXISTS "packages_insert" ON packages;
DROP POLICY IF EXISTS "packages_update" ON packages;
DROP POLICY IF EXISTS "packages_delete" ON packages;

CREATE POLICY "packages_select" ON packages FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "packages_insert" ON packages FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "packages_update" ON packages FOR UPDATE USING (is_admin());
CREATE POLICY "packages_delete" ON packages FOR DELETE USING (is_admin());


-- ============================================================
-- RLS POLICIES — SERVICES (비회원도 조회 가능)
-- ============================================================
DROP POLICY IF EXISTS "services_select" ON services;
DROP POLICY IF EXISTS "services_insert" ON services;
DROP POLICY IF EXISTS "services_update" ON services;
DROP POLICY IF EXISTS "services_delete" ON services;

CREATE POLICY "services_select" ON services FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "services_update" ON services FOR UPDATE USING (is_admin());
CREATE POLICY "services_delete" ON services FOR DELETE USING (is_admin());


-- ============================================================
-- RLS POLICIES — COUPONS
-- ============================================================
DROP POLICY IF EXISTS "coupons_select" ON coupons;
DROP POLICY IF EXISTS "coupons_insert" ON coupons;
DROP POLICY IF EXISTS "coupons_update" ON coupons;
DROP POLICY IF EXISTS "coupons_delete" ON coupons;

CREATE POLICY "coupons_select" ON coupons FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "coupons_insert" ON coupons FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "coupons_update" ON coupons FOR UPDATE USING (is_admin());
CREATE POLICY "coupons_delete" ON coupons FOR DELETE USING (is_admin());


-- ============================================================
-- RLS POLICIES — RESERVATIONS
-- ============================================================
DROP POLICY IF EXISTS "reservations_select" ON reservations;
DROP POLICY IF EXISTS "reservations_insert" ON reservations;
DROP POLICY IF EXISTS "reservations_update" ON reservations;
DROP POLICY IF EXISTS "reservations_delete" ON reservations;

-- 본인 예약 또는 관리자
CREATE POLICY "reservations_select" ON reservations
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- 본인 예약 생성 (비로그인 시 user_id NULL 허용)
CREATE POLICY "reservations_insert" ON reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 본인은 취소만, 관리자는 모든 상태 변경
CREATE POLICY "reservations_update" ON reservations
  FOR UPDATE USING (
    (auth.uid() = user_id AND status = 'confirmed')
    OR is_admin()
  );

CREATE POLICY "reservations_delete" ON reservations
  FOR DELETE USING (is_admin());


-- ============================================================
-- RLS POLICIES — PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update" ON payments;

CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "payments_insert" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "payments_update" ON payments
  FOR UPDATE USING (is_admin());


-- ============================================================
-- RLS POLICIES — COUPON_USES
-- ============================================================
DROP POLICY IF EXISTS "coupon_uses_select" ON coupon_uses;
DROP POLICY IF EXISTS "coupon_uses_insert" ON coupon_uses;

CREATE POLICY "coupon_uses_select" ON coupon_uses
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "coupon_uses_insert" ON coupon_uses
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ============================================================
-- SEED DATA — ROOMS
-- ============================================================
INSERT INTO rooms (room_number, name_ko, name_en, category, description_ko, description_en,
  size_sqm, floor, max_adults, max_children, max_occupancy, bed_type, view_type,
  price_per_night, amenities, images, sort_order)
VALUES
(
  '1001', '스탠다드 더블', 'Standard Double', 'standard',
  '도심 전망의 아늑한 스탠다드 더블 룸으로, 세련된 인테리어와 편안한 편의시설을 갖추고 있습니다.',
  'A cozy standard double room with city view, featuring elegant interiors and comfortable amenities.',
  35.0, 10, 2, 1, 3, 'King Bed', 'City View', 280000,
  '["무료 Wi-Fi","에어컨","미니바","금고","55인치 TV","에스프레소 머신"]',
  '["/images/room01.jpg"]', 1
),
(
  '2001', '디럭스 킹', 'Deluxe King', 'deluxe',
  '한강 전망을 갖춘 럭셔리 디럭스 킹 룸입니다. 대리석 욕실과 프리미엄 어메니티를 제공합니다.',
  'Luxury deluxe king room with Han River view, marble bathroom and premium amenities.',
  48.0, 20, 2, 2, 4, 'King Bed', 'River View', 420000,
  '["무료 Wi-Fi","에어컨","미니바","금고","65인치 TV","에스프레소 머신","대리석 욕실","욕조","테라스"]',
  '["/images/room02.jpg"]', 2
),
(
  '3001', '그랜드 스위트', 'Grand Suite', 'suite',
  '독립 거실과 파노라마 뷰를 갖춘 프리미엄 스위트룸입니다. 비즈니스와 휴가 모두에 최적화되어 있습니다.',
  'Premium suite with separate living area and panoramic view, ideal for business and leisure.',
  78.0, 30, 3, 2, 5, 'King Bed', 'Panoramic View', 680000,
  '["무료 Wi-Fi","에어컨","미니바","금고","75인치 TV","에스프레소 머신","대리석 욕실","욕조","테라스","거실","컨시어지"]',
  '["/images/room03.jpg"]', 3
),
(
  '4001', '프레지덴셜 스위트', 'Presidential Suite', 'presidential',
  '서울 스카이라인을 360도 파노라마로 감상할 수 있는 최상급 스위트룸입니다.',
  'The ultimate luxury suite offering 360-degree panoramic views of the Seoul skyline.',
  150.0, 40, 4, 2, 6, 'King Bed + Sofa Bed', 'Panoramic City & River View', 1500000,
  '["무료 Wi-Fi","에어컨","미니바","금고","85인치 TV","에스프레소 머신","대리석 욕실","욕조","테라스","거실","다이닝룸","전용 주방","컨시어지","버틀러 서비스"]',
  '["/images/hotel_inside.png"]', 4
)
ON CONFLICT (room_number) DO NOTHING;


-- ============================================================
-- SEED DATA — PACKAGES
-- ============================================================
INSERT INTO packages (name_ko, name_en, description_ko, description_en, icon, discount_type, discount_value, add_price, includes, sort_order)
VALUES
('패키지 없음', 'No Package', '패키지 없이 기본 요금으로 예약합니다.', 'Book at the base rate without a package.', '—', 'amount', 0, 0, '[]', 1),
('조식 포함', 'Breakfast Included', '매일 아침 2인 조식 뷔페가 포함됩니다.', 'Daily breakfast buffet for 2 is included.', '🍳', 'amount', 0, 50000, '["2인 조식 뷔페","더 루프 레스토랑 10% 할인"]', 2),
('얼리버드 15%', 'Early Bird 15%', '30일 전 예약 시 객실 요금 15% 할인.', '15% off room rate when booked 30 days in advance.', '⏰', 'percent', 15, 0, '["환불 불가 조건","조기 예약 특가"]', 3),
('허니문 스페셜', 'Honeymoon Special', '신혼부부를 위한 로맨틱 패키지.', 'Romantic package for newlyweds.', '💍', 'amount', 0, 100000, '["스파클링 와인","꽃 장식","레이트 체크아웃 (16:00)","스파 이용권 2인"]', 4),
('패밀리 플랜', 'Family Plan', '가족 여행에 최적화된 패키지.', 'The perfect package for family travel.', '👨‍👩‍👧', 'percent', 10, 0, '["어린이 조식 무료","키즈 어메니티","게임룸 무료 이용","어린이 침대 무료"]', 5),
('스파 패키지', 'Spa Package', '시그니처 커플 스파가 포함된 웰니스 패키지.', 'Wellness package with signature couples spa.', '🧖', 'amount', 0, 120000, '["60분 커플 시그니처 마사지","스파 시설 무제한 이용","아로마 어메니티"]', 6)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEED DATA — SERVICES
-- ============================================================
INSERT INTO services (name_ko, name_en, description, price, category, sort_order)
VALUES
('공항 픽업', 'Airport Transfer', '인천/김포 공항 전용 리무진 픽업', 120000, 'transport', 1),
('발렛파킹', 'Valet Parking', '24시간 발렛파킹 서비스', 30000, 'parking', 2),
('꽃 장식', 'Flower Decoration', '웰컴 꽃 장식 및 풍선 연출', 50000, 'room', 3),
('와인 & 과일', 'Wine & Fruit Basket', '웰컴 와인 1병 및 과일 바스켓', 60000, 'food', 4),
('레이트 체크아웃', 'Late Check-out', '체크아웃 시간 16:00까지 연장', 50000, 'stay', 5),
('스파 예약', 'Spa Reservation', '딥 티슈 마사지 60분 사전 예약', 90000, 'wellness', 6)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEED DATA — COUPONS
-- ============================================================
INSERT INTO coupons (code, name_ko, discount_type, discount_value, min_amount, max_discount, valid_from, valid_until)
VALUES
('WELCOME10', '신규 회원 10% 할인', 'percent', 10, 200000, 50000, '2025-01-01', '2026-12-31'),
('SUMMER50000', '여름 시즌 ₩50,000 할인', 'amount', 50000, 300000, NULL, '2026-06-01', '2026-08-31'),
('VIP20', 'VIP 고객 20% 할인', 'percent', 20, 500000, 100000, '2025-01-01', '2026-12-31'),
('SEOUL10', '서울 그랜드 10% 할인', 'percent', 10, 100000, 30000, '2025-01-01', '2027-12-31')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- (선택) 첫 번째 회원을 관리자로 승격
-- 회원가입 후 아래 쿼리에서 이메일을 교체하여 실행
-- ============================================================
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
