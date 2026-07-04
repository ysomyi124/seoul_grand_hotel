/* =============================================
   ROOM MODULE — js/room.js
   객실 조회 · 예약 가능 여부 확인
   ============================================= */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.room = {

    /* 전체 활성 객실 조회 */
    getAll: async function () {
      return window.SGH.supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('price_per_night', { ascending: true });
    },

    /* ID로 객실 단건 조회 */
    getById: async function (roomId) {
      return window.SGH.supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
    },

    /* 날짜·인원 조건에 맞는 예약 가능 객실 조회 */
    getAvailable: async function (checkin, checkout, adults) {
      /* 해당 기간에 예약된 room_id 목록 수집 */
      var booked = await window.SGH.supabase
        .from('reservations')
        .select('room_id')
        .neq('status', 'cancelled')
        .lt('checkin_date', checkout)
        .gt('checkout_date', checkin);

      var bookedIds = (booked.data || []).map(function (r) { return r.room_id; });

      var query = window.SGH.supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .gte('max_adults', adults || 1);

      if (bookedIds.length > 0) {
        query = query.not('id', 'in', '(' + bookedIds.join(',') + ')');
      }

      return query.order('price_per_night', { ascending: true });
    },

    /* 특정 객실·기간의 예약 가능 여부 확인 */
    checkAvailability: async function (roomId, checkin, checkout) {
      var res = await window.SGH.supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .neq('status', 'cancelled')
        .lt('checkin_date', checkout)
        .gt('checkout_date', checkin);

      if (res.error) return { available: false, error: res.error };
      return { available: res.count === 0, error: null };
    },
  };

})();
