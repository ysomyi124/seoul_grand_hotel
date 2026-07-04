/* ================================================================
   ADMIN MODULE — js/admin.js
   예약 관리 · 객실 관리 · 회원 관리 · 통계 (관리자 전용)
   ================================================================ */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.admin = {

    /* ──────────────────────────────────────────
       대시보드 통계
    ────────────────────────────────────────── */
    getStats: async function () {
      var sb    = window.SGH.supabase;
      var today = new Date().toISOString().slice(0, 10);
      var monthStart = new Date().toISOString().slice(0, 7) + '-01';

      var results = await Promise.all([
        sb.from('reservations').select('id', { count: 'exact', head: true }).neq('status', 'cancelled'),
        sb.from('reservations').select('id', { count: 'exact', head: true }).eq('check_in', today).neq('status', 'cancelled'),
        sb.from('payments').select('amount').eq('status', 'paid').gte('paid_at', monthStart),
        sb.from('rooms').select('id', { count: 'exact', head: true }).eq('is_active', true),
        sb.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      var monthRevenue = (results[2].data || []).reduce(function (acc, r) {
        return acc + Number(r.amount);
      }, 0);

      return {
        totalReservations: results[0].count || 0,
        todayCheckins:     results[1].count || 0,
        monthRevenue:      monthRevenue,
        activeRooms:       results[3].count || 0,
        totalUsers:        results[4].count || 0,
      };
    },

    /* ──────────────────────────────────────────
       예약 목록 (필터 지원)
    ────────────────────────────────────────── */
    getReservations: async function (opts) {
      var q = window.SGH.supabase
        .from('reservations')
        .select([
          'id', 'reservation_no', 'user_id', 'check_in', 'check_out',
          'nights', 'num_adults', 'num_children', 'num_rooms',
          'status', 'price_total', 'created_at', 'special_request', 'admin_notes',
          'reservation_guests(name_ko, name_en, email, phone)',
          'reservation_rooms(rooms(name_ko))',
          'profiles(name_ko, email)',
        ].join(', '))
        .order('created_at', { ascending: false });

      if (opts && opts.status) q = q.eq('status', opts.status);
      if (opts && opts.date)   q = q.eq('check_in', opts.date);
      if (opts && opts.search) q = q.ilike('reservation_no', '%' + opts.search + '%');

      q = q.limit((opts && opts.limit) || 100);
      return q;
    },

    /* 예약 상태 변경 */
    updateStatus: async function (reservationId, newStatus) {
      return window.SGH.supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', reservationId)
        .select('id, reservation_no, status')
        .single();
    },

    /* 예약 메모 저장 */
    saveNotes: async function (reservationId, notes) {
      return window.SGH.supabase
        .from('reservations')
        .update({ admin_notes: notes })
        .eq('id', reservationId)
        .select('id')
        .single();
    },

    /* ──────────────────────────────────────────
       객실 관리
    ────────────────────────────────────────── */
    getAllRooms: async function () {
      return window.SGH.supabase
        .from('rooms')
        .select([
          'id', 'name_ko', 'name_en', 'bed_type', 'floor',
          'size_sqm', 'max_adults', 'max_children',
          'price_per_night', 'discount_percent',
          'status', 'is_active', 'sort_order',
          'room_types(name_ko)',
          'room_images(url, is_main)',
        ].join(', '))
        .order('sort_order', { ascending: true });
    },

    /* 객실 활성/비활성 토글 */
    toggleRoomActive: async function (roomId, isActive) {
      return window.SGH.supabase
        .from('rooms')
        .update({ is_active: isActive })
        .eq('id', roomId)
        .select('id, name_ko, is_active')
        .single();
    },

    /* 객실 상태 변경 */
    updateRoomStatus: async function (roomId, status) {
      return window.SGH.supabase
        .from('rooms')
        .update({ status: status })
        .eq('id', roomId)
        .select('id, name_ko, status')
        .single();
    },

    /* 객실 가격 변경 */
    updateRoomPrice: async function (roomId, pricePerNight, discountPercent) {
      var payload = { price_per_night: pricePerNight };
      if (discountPercent !== undefined) payload.discount_percent = discountPercent;
      return window.SGH.supabase
        .from('rooms')
        .update(payload)
        .eq('id', roomId)
        .select('id, name_ko, price_per_night, discount_percent')
        .single();
    },

    /* ──────────────────────────────────────────
       회원 관리
    ────────────────────────────────────────── */
    getUsers: async function (opts) {
      var q = window.SGH.supabase
        .from('profiles')
        .select([
          'id', 'email', 'username', 'name_ko', 'name_en',
          'phone', 'role', 'points', 'created_at', 'last_login_at',
          'membership_grades(name)',
        ].join(', '))
        .order('created_at', { ascending: false });

      if (opts && opts.search) q = q.or('name_ko.ilike.%' + opts.search + '%,email.ilike.%' + opts.search + '%');
      if (opts && opts.role)   q = q.eq('role', opts.role);

      q = q.limit((opts && opts.limit) || 50);
      return q;
    },

    /* 회원 역할 변경 */
    updateUserRole: async function (userId, role) {
      return window.SGH.supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', userId)
        .select('id, name_ko, role')
        .single();
    },

    /* ──────────────────────────────────────────
       쿠폰 관리
    ────────────────────────────────────────── */
    getCoupons: async function () {
      return window.SGH.supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
    },

    createCoupon: async function (data) {
      return window.SGH.supabase
        .from('coupons')
        .insert([data])
        .select()
        .single();
    },

    toggleCoupon: async function (couponId, isActive) {
      return window.SGH.supabase
        .from('coupons')
        .update({ is_active: isActive })
        .eq('id', couponId)
        .select('id, code, is_active')
        .single();
    },

    /* ──────────────────────────────────────────
       공지 관리
    ────────────────────────────────────────── */
    getNotices: async function () {
      return window.SGH.supabase
        .from('notices')
        .select('*')
        .order('sort_order', { ascending: true });
    },

    /* ──────────────────────────────────────────
       최근 예약 (대시보드용)
    ────────────────────────────────────────── */
    getRecentReservations: async function (limit) {
      return window.SGH.admin.getReservations({ limit: limit || 10 });
    },
  };

})();
