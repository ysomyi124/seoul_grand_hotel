/* =============================================
   SUPABASE CLIENT — js/supabase.js
   전 페이지 공통 클라이언트
   ============================================= */

(function () {
  'use strict';

  /* ---- 프로젝트 설정 ---- */
  var SUPABASE_URL = 'https://icpadkshsayuzpgiaojh.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_lHBcwC0q-llN1M2eao_MAQ_5KykMv8P';

  /* ---- 전역 네임스페이스 ---- */
  window.SGH = window.SGH || {};

  /* ---- 클라이언트 생성 ---- */
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[SGH] Supabase SDK가 로드되지 않았습니다. CDN 스크립트를 먼저 추가해주세요.');
  } else {
    window.SGH.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession:   true,
        detectSessionInUrl: true,
      },
    });
    console.log('[SGH] Supabase 클라이언트 초기화 완료');
  }

  /* ---- 공통 에러 핸들러 ---- */
  window.SGH.handleError = function (err, context) {
    console.error('[SGH ' + (context || 'Error') + ']', err && err.message ? err.message : err);
    return { data: null, error: err };
  };

  /* ---- 연결 테스트 ---- */
  window.SGH.testConnection = async function () {
    var client = window.SGH.supabase;
    if (!client) return { ok: false, error: 'Client not initialized' };
    try {
      /* auth.getSession은 테이블 없이도 항상 응답 — 순수 연결 확인용 */
      var res = await client.auth.getSession();
      if (res.error) throw res.error;
      console.log('[SGH] ✓ Supabase 연결 성공');
      return { ok: true };
    } catch (err) {
      console.warn('[SGH] ✗ Supabase 연결 실패:', err.message);
      return { ok: false, error: err.message };
    }
  };

  /* ---- 페이지 로드 시 자동 연결 테스트 ---- */
  document.addEventListener('DOMContentLoaded', function () {
    window.SGH.testConnection();
  });

})();
