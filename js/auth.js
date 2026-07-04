/* =============================================
   AUTH MODULE — js/auth.js
   회원가입 · 로그인 · 로그아웃 · 세션 관리
   ============================================= */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.auth = {

    /* 회원가입 */
    signUp: async function (email, password, meta) {
      return window.SGH.supabase.auth.signUp({
        email: email,
        password: password,
        options: { data: meta || {} },
      });
    },

    /* 이메일 로그인 */
    signIn: async function (email, password) {
      return window.SGH.supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
    },

    /* 소셜 로그인 (Google, Kakao 등) */
    signInWithOAuth: async function (provider) {
      return window.SGH.supabase.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin },
      });
    },

    /* 로그아웃 */
    signOut: async function () {
      return window.SGH.supabase.auth.signOut();
    },

    /* 현재 세션 */
    getSession: async function () {
      return window.SGH.supabase.auth.getSession();
    },

    /* 현재 사용자 */
    getUser: async function () {
      return window.SGH.supabase.auth.getUser();
    },

    /* 로그인 여부 */
    isLoggedIn: async function () {
      var res = await window.SGH.supabase.auth.getSession();
      return !!(res.data && res.data.session);
    },

    /* 비밀번호 재설정 이메일 발송 */
    resetPassword: async function (email) {
      return window.SGH.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/pages/reset-password.html',
      });
    },

    /* 비밀번호 변경 (재설정 링크 진입 후) */
    updatePassword: async function (newPassword) {
      return window.SGH.supabase.auth.updateUser({ password: newPassword });
    },

    /* 인증 상태 변경 리스너 */
    onAuthStateChange: function (callback) {
      return window.SGH.supabase.auth.onAuthStateChange(callback);
    },
  };

})();
