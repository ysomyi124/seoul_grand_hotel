/* =============================================
   AUTH MODULE — js/auth.js
   회원가입 · 로그인 · 로그아웃 · 세션 관리 · UI 상태
   ============================================= */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.auth = {

    /* ---- 회원가입 ---- */
    signUp: async function (email, password, meta) {
      return window.SGH.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: meta || {},
          emailRedirectTo: window.location.origin + '/pages/login.html',
        },
      });
    },

    /* ---- 이메일 로그인 ---- */
    signIn: async function (email, password) {
      return window.SGH.supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
    },

    /* ---- 소셜 로그인 ---- */
    signInWithOAuth: async function (provider) {
      return window.SGH.supabase.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin },
      });
    },

    /* ---- 로그아웃 ---- */
    signOut: async function () {
      var res = await window.SGH.supabase.auth.signOut();
      return res;
    },

    /* ---- 현재 세션 ---- */
    getSession: async function () {
      return window.SGH.supabase.auth.getSession();
    },

    /* ---- 현재 사용자 ---- */
    getUser: async function () {
      return window.SGH.supabase.auth.getUser();
    },

    /* ---- 로그인 여부 ---- */
    isLoggedIn: async function () {
      var res = await window.SGH.supabase.auth.getSession();
      return !!(res.data && res.data.session);
    },

    /* ---- 비밀번호 재설정 이메일 ---- */
    resetPassword: async function (email) {
      return window.SGH.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/pages/reset-password.html',
      });
    },

    /* ---- 비밀번호 변경 ---- */
    updatePassword: async function (newPassword) {
      return window.SGH.supabase.auth.updateUser({ password: newPassword });
    },

    /* ---- 인증 상태 변경 리스너 ---- */
    onAuthStateChange: function (callback) {
      return window.SGH.supabase.auth.onAuthStateChange(callback);
    },

    /* ---- 헤더 Auth UI 초기화 ---- */
    initAuthUI: async function () {
      var session = null;
      try {
        var res = await window.SGH.supabase.auth.getSession();
        session = res.data && res.data.session ? res.data.session : null;
      } catch (e) {
        session = null;
      }

      /* index.html의 authLink */
      var authLink = document.getElementById('authLink');
      if (authLink) {
        if (session) {
          var meta = session.user.user_metadata || {};
          var name = meta.name_ko || session.user.email.split('@')[0];
          authLink.textContent = name + ' 님';
          authLink.href = 'pages/mypage.html';
        } else {
          authLink.textContent = '로그인';
          authLink.href = 'pages/login.html';
        }
      }

      /* 페이지별 nav 로그인/로그아웃 버튼 */
      var logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        if (session) {
          logoutBtn.style.display = '';
          logoutBtn.addEventListener('click', async function () {
            await window.SGH.auth.signOut();
            window.location.href = '/index.html';
          });
        } else {
          logoutBtn.style.display = 'none';
        }
      }

      /* 관리자 전용 링크 표시 */
      var adminLink = document.getElementById('adminLink');
      if (adminLink && session) {
        try {
          var profileRes = await window.SGH.supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (profileRes.data && profileRes.data.role === 'admin') {
            adminLink.style.display = '';
          }
        } catch (e) { /* 무시 */ }
      }

      return session;
    },

    /* ---- 로그인 가드 (비로그인 시 login.html로 리다이렉트) ---- */
    requireLogin: async function (redirectPath) {
      var logged = await window.SGH.auth.isLoggedIn();
      if (!logged) {
        var redirect = redirectPath || (window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html');
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    /* ---- 관리자 가드 ---- */
    requireAdmin: async function () {
      var res = await window.SGH.supabase.auth.getUser();
      if (!res.data || !res.data.user) {
        window.location.replace('login.html');
        return false;
      }
      var profileRes = await window.SGH.supabase
        .from('profiles')
        .select('role')
        .eq('id', res.data.user.id)
        .single();
      if (!profileRes.data || profileRes.data.role !== 'admin') {
        alert('관리자만 접근할 수 있습니다.');
        window.location.replace('../index.html');
        return false;
      }
      return true;
    },
  };

})();
