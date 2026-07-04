/* ================================================================
   ROOM MODULE — js/room.js
   객실 조회 · 가용 객실 필터 · 이미지/어메니티 조인
   ================================================================ */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  var SELECT_FIELDS = [
    'id', 'name_ko', 'name_en', 'description_ko', 'description_en',
    'room_type_id', 'bed_type', 'floor', 'size_sqm',
    'max_adults', 'max_children', 'price_per_night', 'discount_percent',
    'status', 'is_active', 'sort_order',
    'room_types(name_ko, name_en)',
    'room_images(url, alt_text, is_main, sort_order)',
    'room_amenity_map(room_amenity_types(name_ko, icon_class))',
  ].join(', ');

  window.SGH.room = {

    /* 모든 활성 객실 (이미지 + 어메니티 조인) */
    getAll: async function () {
      var sb = window.SGH.supabase;
      if (!sb) return { data: null, error: new Error('Supabase not initialized') };

      var res = await sb.from('rooms')
        .select(SELECT_FIELDS)
        .eq('is_active', true)
        .eq('status', 'available')
        .order('sort_order', { ascending: true });

      if (res.data) res.data = res.data.map(normalizeRoom);
      return res;
    },

    /* 단일 객실 상세 */
    getById: async function (id) {
      var sb = window.SGH.supabase;
      if (!sb) return { data: null, error: new Error('Supabase not initialized') };

      var res = await sb.from('rooms')
        .select(SELECT_FIELDS)
        .eq('id', id)
        .single();

      if (res.data) res.data = normalizeRoom(res.data);
      return res;
    },

    /* 기간에 예약 가능한 객실 */
    getAvailable: async function (checkIn, checkOut, adults) {
      var sb = window.SGH.supabase;
      if (!sb) return { data: null, error: new Error('Supabase not initialized') };

      /* 해당 기간 예약된 room_id 목록 */
      var rsvRes = await sb.from('reservation_rooms')
        .select('room_id, reservations!inner(check_in, check_out, status)')
        .not('reservations.status', 'in', '("cancelled","completed")');

      var bookedIds = [];
      if (rsvRes.data && checkIn && checkOut) {
        bookedIds = rsvRes.data
          .filter(function (r) {
            var rsv = r.reservations;
            return rsv.check_in < checkOut && rsv.check_out > checkIn;
          })
          .map(function (r) { return r.room_id; });
      }

      var query = sb.from('rooms')
        .select(SELECT_FIELDS)
        .eq('is_active', true)
        .eq('status', 'available');

      if (adults) query = query.gte('max_adults', adults);
      if (bookedIds.length > 0) {
        query = query.not('id', 'in', '(' + bookedIds.join(',') + ')');
      }

      query = query.order('sort_order', { ascending: true });

      var res = await query;
      if (res.data) res.data = res.data.map(normalizeRoom);
      return res;
    },

    /* 가용 여부 확인 */
    checkAvailability: async function (roomId, checkIn, checkOut) {
      var sb = window.SGH.supabase;
      if (!sb) return { available: false, error: 'Supabase not initialized' };

      var res = await sb.from('reservation_rooms')
        .select('id, reservations!inner(check_in, check_out, status)')
        .eq('room_id', roomId)
        .not('reservations.status', 'in', '("cancelled")');

      if (res.error) return { available: false, error: res.error };

      var conflict = (res.data || []).some(function (r) {
        var rsv = r.reservations;
        return rsv.check_in < checkOut && rsv.check_out > checkIn;
      });

      return { available: !conflict, error: null };
    },
  };

  /* 응답 객실 데이터 정규화 */
  function normalizeRoom(r) {
    var images = (r.room_images || []).slice().sort(function (a, b) {
      if (a.is_main && !b.is_main) return -1;
      if (!a.is_main && b.is_main) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    var amenities = (r.room_amenity_map || []).map(function (m) {
      return m.room_amenity_types || {};
    });

    return Object.assign({}, r, {
      images:    images,
      mainImage: images.length > 0 ? images[0].url : null,
      amenities: amenities,
    });
  }

})();
