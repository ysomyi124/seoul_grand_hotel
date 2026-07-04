-- ================================================================
-- Seoul Grand Hotel — RLS (Row Level Security) 정책
-- 실행 방법: schema.sql 실행 후 이 파일 실행
-- ================================================================

-- ─── RLS 활성화 ──────────────────────────────────────────────
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agreements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_grades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_amenity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_amenity_map   ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_rooms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users        ENABLE ROW LEVEL SECURITY;

-- ─── 기존 정책 초기화 (재실행 대비) ─────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
      'profiles','user_agreements','membership_grades','room_types',
      'rooms','room_images','room_amenity_types','room_amenity_map',
      'promotions','coupons','reservations','reservation_guests',
      'reservation_rooms','payments','faq','notices',
      'chatbot_messages','admin_users'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;


-- ================================================================
-- PROFILES
-- 규칙: 본인 데이터만 조회·수정 / 관리자는 전체 조회 가능
-- ================================================================
CREATE POLICY "profiles: 본인 조회"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles: 본인 삽입"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: 본인 수정"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());


-- ================================================================
-- USER_AGREEMENTS
-- 규칙: 본인 약관만 조회·삽입 / 관리자 전체 조회
-- ================================================================
CREATE POLICY "agreements: 본인 조회"
  ON user_agreements FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "agreements: 본인 삽입"
  ON user_agreements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agreements: 본인 수정"
  ON user_agreements FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());


-- ================================================================
-- MEMBERSHIP_GRADES
-- 규칙: 모든 사용자(비로그인 포함) 조회 가능 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "membership: 공개 조회"   ON membership_grades FOR SELECT USING (true);
CREATE POLICY "membership: 관리자 삽입" ON membership_grades FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "membership: 관리자 수정" ON membership_grades FOR UPDATE USING (is_admin());
CREATE POLICY "membership: 관리자 삭제" ON membership_grades FOR DELETE USING (is_admin());


-- ================================================================
-- ROOM_TYPES
-- 규칙: 공개 조회 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "room_types: 공개 조회"   ON room_types FOR SELECT USING (true);
CREATE POLICY "room_types: 관리자 삽입" ON room_types FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "room_types: 관리자 수정" ON room_types FOR UPDATE USING (is_admin());
CREATE POLICY "room_types: 관리자 삭제" ON room_types FOR DELETE USING (is_admin());


-- ================================================================
-- ROOMS
-- 규칙: available 상태는 공개 조회 / 관리자는 전체 조회 및 쓰기
-- ================================================================
CREATE POLICY "rooms: 공개 조회"
  ON rooms FOR SELECT
  USING (status = 'available' AND is_active = TRUE OR is_admin());

CREATE POLICY "rooms: 관리자 삽입" ON rooms FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "rooms: 관리자 수정" ON rooms FOR UPDATE USING (is_admin());
CREATE POLICY "rooms: 관리자 삭제" ON rooms FOR DELETE USING (is_admin());


-- ================================================================
-- ROOM_IMAGES
-- 규칙: 공개 조회 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "room_images: 공개 조회"   ON room_images FOR SELECT USING (true);
CREATE POLICY "room_images: 관리자 삽입" ON room_images FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "room_images: 관리자 수정" ON room_images FOR UPDATE USING (is_admin());
CREATE POLICY "room_images: 관리자 삭제" ON room_images FOR DELETE USING (is_admin());


-- ================================================================
-- ROOM_AMENITY_TYPES
-- 규칙: 공개 조회 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "amenity_types: 공개 조회"   ON room_amenity_types FOR SELECT USING (true);
CREATE POLICY "amenity_types: 관리자 삽입" ON room_amenity_types FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "amenity_types: 관리자 수정" ON room_amenity_types FOR UPDATE USING (is_admin());
CREATE POLICY "amenity_types: 관리자 삭제" ON room_amenity_types FOR DELETE USING (is_admin());


-- ================================================================
-- ROOM_AMENITY_MAP
-- 규칙: 공개 조회 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "amenity_map: 공개 조회"   ON room_amenity_map FOR SELECT USING (true);
CREATE POLICY "amenity_map: 관리자 삽입" ON room_amenity_map FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "amenity_map: 관리자 삭제" ON room_amenity_map FOR DELETE USING (is_admin());


-- ================================================================
-- PROMOTIONS
-- 규칙: 활성 프로모션 공개 조회 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "promotions: 공개 조회"
  ON promotions FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "promotions: 관리자 삽입" ON promotions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "promotions: 관리자 수정" ON promotions FOR UPDATE USING (is_admin());
CREATE POLICY "promotions: 관리자 삭제" ON promotions FOR DELETE USING (is_admin());


-- ================================================================
-- COUPONS
-- 규칙: 활성 쿠폰 코드 검증용 조회 가능 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "coupons: 공개 조회"
  ON coupons FOR SELECT
  USING (is_active = TRUE OR is_admin());

CREATE POLICY "coupons: 관리자 삽입" ON coupons FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "coupons: 관리자 수정" ON coupons FOR UPDATE USING (is_admin());
CREATE POLICY "coupons: 관리자 삭제" ON coupons FOR DELETE USING (is_admin());


-- ================================================================
-- RESERVATIONS
-- 규칙: 본인 예약만 조회·생성 / 취소는 pending·confirmed만 / 관리자 전체
-- ================================================================
CREATE POLICY "reservations: 본인 조회"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "reservations: 본인 생성"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "reservations: 본인 취소 또는 관리자 수정"
  ON reservations FOR UPDATE
  USING (
    (auth.uid() = user_id AND status IN ('pending','confirmed'))
    OR is_admin()
  );

CREATE POLICY "reservations: 관리자 삭제"
  ON reservations FOR DELETE
  USING (is_admin());


-- ================================================================
-- RESERVATION_GUESTS
-- 규칙: 본인 예약에 연결된 게스트 정보만 조회 / 관리자 전체
-- ================================================================
CREATE POLICY "rsv_guests: 본인 조회"
  ON reservation_guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE id = reservation_guests.reservation_id
        AND (user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "rsv_guests: 본인 생성"
  ON reservation_guests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE id = reservation_guests.reservation_id
        AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

CREATE POLICY "rsv_guests: 관리자 수정" ON reservation_guests FOR UPDATE USING (is_admin());
CREATE POLICY "rsv_guests: 관리자 삭제" ON reservation_guests FOR DELETE USING (is_admin());


-- ================================================================
-- RESERVATION_ROOMS
-- 규칙: 본인 예약의 객실만 조회 / 관리자 전체
-- ================================================================
CREATE POLICY "rsv_rooms: 본인 조회"
  ON reservation_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE id = reservation_rooms.reservation_id
        AND (user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "rsv_rooms: 본인 생성"
  ON reservation_rooms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations
      WHERE id = reservation_rooms.reservation_id
        AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

CREATE POLICY "rsv_rooms: 관리자 수정" ON reservation_rooms FOR UPDATE USING (is_admin());
CREATE POLICY "rsv_rooms: 관리자 삭제" ON reservation_rooms FOR DELETE USING (is_admin());


-- ================================================================
-- PAYMENTS
-- 규칙: 본인 결제 정보만 조회 / 관리자 전체 / 수정은 관리자만
-- ================================================================
CREATE POLICY "payments: 본인 조회"
  ON payments FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "payments: 본인 생성"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "payments: 관리자 수정" ON payments FOR UPDATE USING (is_admin());
CREATE POLICY "payments: 관리자 삭제" ON payments FOR DELETE USING (is_admin());


-- ================================================================
-- FAQ
-- 규칙: 활성 항목 공개 조회 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "faq: 공개 조회"   ON faq FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "faq: 관리자 삽입" ON faq FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "faq: 관리자 수정" ON faq FOR UPDATE USING (is_admin());
CREATE POLICY "faq: 관리자 삭제" ON faq FOR DELETE USING (is_admin());


-- ================================================================
-- NOTICES
-- 규칙: 활성 공지 공개 조회 / 관리자만 쓰기
-- ================================================================
CREATE POLICY "notices: 공개 조회"   ON notices FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "notices: 관리자 삽입" ON notices FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "notices: 관리자 수정" ON notices FOR UPDATE USING (is_admin());
CREATE POLICY "notices: 관리자 삭제" ON notices FOR DELETE USING (is_admin());


-- ================================================================
-- CHATBOT_MESSAGES
-- 규칙: 본인 메시지만 조회·생성 / 관리자 전체
-- ================================================================
CREATE POLICY "chatbot: 본인 조회"
  ON chatbot_messages FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "chatbot: 생성 (비로그인 포함)"
  ON chatbot_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "chatbot: 관리자 삭제" ON chatbot_messages FOR DELETE USING (is_admin());


-- ================================================================
-- ADMIN_USERS
-- 규칙: 관리자만 조회/쓰기 / 본인은 자신의 레코드 조회 가능
-- ================================================================
CREATE POLICY "admin_users: 본인 또는 관리자 조회"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "admin_users: 관리자 삽입" ON admin_users FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_users: 관리자 수정" ON admin_users FOR UPDATE USING (is_admin());
CREATE POLICY "admin_users: 관리자 삭제" ON admin_users FOR DELETE USING (is_admin());
