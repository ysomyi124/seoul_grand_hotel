/* ================================================================
   PAYMENT MODULE — js/payment.js
   결제 정보 저장 · 조회 · 상태 변경 (실제 PG 미연동, DB 기록 전용)
   ================================================================ */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.payment = {

    /* ──────────────────────────────────────────
       결제 기록 생성
       payload: { reservationId, method, amount, cardLast4, bankName, ... }
    ────────────────────────────────────────── */
    create: async function (payload) {
      var sb = window.SGH.supabase;
      var userRes = await sb.auth.getUser();
      var userId = userRes.data && userRes.data.user ? userRes.data.user.id : null;

      return sb.from('payments').insert([{
        reservation_id: payload.reservationId,
        user_id:        userId,
        method:         payload.method        || 'card',
        amount:         payload.amount        || 0,
        currency:       payload.currency      || 'KRW',
        status:         payload.status        || 'paid',
        pg_name:        payload.pgName        || null,
        pg_tid:         payload.pgTid         || null,
        card_last4:     payload.cardLast4     || null,
        bank_name:      payload.bankName      || null,
        receipt_url:    payload.receiptUrl    || null,
        paid_at:        payload.paidAt        || new Date().toISOString(),
        memo:           payload.memo          || null,
      }]).select().single();
    },

    /* 예약 ID로 결제 내역 조회 */
    getByReservation: async function (reservationId) {
      return window.SGH.supabase
        .from('payments')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: false });
    },

    /* 현재 사용자의 결제 내역 */
    getByUser: async function () {
      var userRes = await window.SGH.supabase.auth.getUser();
      if (!userRes.data || !userRes.data.user) {
        return { data: null, error: new Error('로그인이 필요합니다.') };
      }
      return window.SGH.supabase
        .from('payments')
        .select('*, reservations(reservation_no, check_in, check_out)')
        .eq('user_id', userRes.data.user.id)
        .order('created_at', { ascending: false });
    },

    /* 결제 상태 변경 (관리자 전용) */
    updateStatus: async function (paymentId, status) {
      return window.SGH.supabase
        .from('payments')
        .update({ status: status })
        .eq('id', paymentId)
        .select()
        .single();
    },

    /* 환불 처리 (상태를 refunded로, 금액 기록) */
    refund: async function (paymentId, refundAmount, memo) {
      return window.SGH.supabase
        .from('payments')
        .update({
          status:        'refunded',
          refund_amount: refundAmount,
          refunded_at:   new Date().toISOString(),
          memo:          memo || '환불 처리',
        })
        .eq('id', paymentId)
        .select()
        .single();
    },
  };

})();
