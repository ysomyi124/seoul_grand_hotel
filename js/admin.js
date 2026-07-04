/* =============================================
   ADMIN MODULE — js/admin.js
   예약 관리 · 객실 관리 · 통계 (관리자 전용)
   ============================================= */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.admin = {

    /* ── 대시보드 통계 ── */
    getStats: async function () {
      var today = new Date().toISOString().slice(0, 10);

      var [totalRsv, todayCI, revenue, activeRooms, totalUsers] = await Promise.all([
        /* 전체 예약 수 */
        window.SGH.supabase.from('reservations').select('id', { count:'exact', head:true }).neq('status','cancelled'),
        /* 오늘 체크인 */
        window.SGH.supabase.from('reservations').select('id', { count:'exact', head:true }).eq('checkin_date', today).neq('status','cancelled'),
        /* 이달 매출 */
        window.SGH.supabase.from('reservations').select('price_total').neq('status','cancelled')
          .gte('created_at', new Date().toISOString().slice(0,7) + '-01'),
        /* 활성 객실 */
        window.SGH.supabase.from('rooms').select('id', { count:'exact', head:true }).eq('is_active', true),
        /* 전체 회원 */
        window.SGH.supabase.from('profiles').select('id', { count:'exact', head:true }),
      ]);

      var monthRevenue = (revenue.data || []).reduce(function (acc, r) { return acc + Number(r.price_total); }, 0);

      return {
        totalReservations: totalRsv.count  || 0,
        todayCheckins:     todayCI.count   || 0,
        monthRevenue:      monthRevenue,
        activeRooms:       activeRooms.count || 0,
        totalUsers:        totalUsers.count  || 0,
      };
    },

    /* ── 예약 목록 (필터 지원) ── */
    getReservations: async function (opts) {
      var q = window.SGH.supabase
        .from('reservations')
        .select('*, rooms(name_ko, name_en, category), profiles(name_ko, name_en)')
        .order('created_at', { ascending: false });

      if (opts && opts.status) q = q.eq('status', opts.status);
      if (opts && opts.date)   q = q.eq('checkin_date', opts.date);
      if (opts && opts.limit)  q = q.limit(opts.limit);
      else                     q = q.limit(100);

      return q;
    },

    /* ── 예약 상태 변경 ── */
    updateStatus: async function (reservationId, newStatus) {
      return window.SGH.supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', reservationId)
        .select()
        .single();
    },

    /* ── 예약 메모 저장 ── */
    saveNotes: async function (reservationId, notes) {
      return window.SGH.supabase
        .from('reservations')
        .update({ admin_notes: notes })
        .eq('id', reservationId)
        .select()
        .single();
    },

    /* ── 전체 객실 목록 (비활성 포함) ── */
    getAllRooms: async function () {
      return window.SGH.supabase
        .from('rooms')
        .select('*')
        .order('sort_order', { ascending: true });
    },

    /* ── 객실 활성/비활성 토글 ── */
    toggleRoomActive: async function (roomId, isActive) {
      return window.SGH.supabase
        .from('rooms')
        .update({ is_active: isActive })
        .eq('id', roomId)
        .select()
        .single();
    },

    /* ── 회원 목록 ── */
    getUsers: async function (limit) {
      return window.SGH.supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit || 50);
    },

    /* ── 회원 역할 변경 ── */
    updateUserRole: async function (userId, role) {
      return window.SGH.supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', userId)
        .select()
        .single();
    },

    /* ── 쿠폰 목록 ── */
    getCoupons: async function () {
      return window.SGH.supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
    },
  };

})();
