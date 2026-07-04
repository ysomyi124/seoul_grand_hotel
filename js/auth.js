/* ================================================================
   AUTH MODULE — js/auth.js
   회원가입 · 로그인(이메일/아이디) · 로그아웃 · 세션 관리 · 가드
   ================================================================ */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.auth = {

    /* ──────────────────────────────────────────
       회원가입
       params: email, password, meta{username,name_ko,name_en,gender,birth_date,phone,address}
       flow: Supabase Auth signUp → profiles 자동생성(trigger) → user_agreements 삽입
    ────────────────────────────────────────── */
    signUp: async function (email, password, meta, agreements) {
      var sb = window.SGH.supabase;
      if (!sb) return { data: null, error: new Error('Supabase not initialized') };

      /* 1. Auth 회원가입 */
      var res = await sb.auth.signUp({
        email:    email,
        password: password,
        options: {
          data: {
            username: meta.username || '',
            name_ko:  meta.name_ko  || '',
            name_en:  meta.name_en  || '',
            phone:    meta.phone    || '',
          },
          emailRedirectTo: window.location.origin + '/pages/login.html',
        },
      });

      if (res.error) return res;

      var userId = res.data.user ? res.data.user.id : null;
      if (!userId) return { data: res.data, error: null };

      /* 2. profiles 추가 정보 업데이트 (trigger로 기본 생성 후 보완) */
      await sb.from('profiles').upsert({
        id:         userId,
        email:      email,
        username:   meta.username  || null,
        name_ko:    meta.name_ko   || null,
        name_en:    meta.name_en   || null,
        gender:     meta.gender    || null,
        birth_date: meta.birth_date || null,
        phone:      meta.phone     || null,
        address:    meta.address   || null,
      }, { onConflict: 'id' });

      /* 3. 약관 동의 저장 */
      var now = new Date().toISOString();
      await sb.from('user_agreements').upsert({
        user_id:             userId,
        terms_agreed:        !!(agreements && agreements.terms),
        privacy_agreed:      !!(agreements && agreements.privacy),
        marketing_agreed:    !!(agreements && agreements.marketing),
        terms_agreed_at:     agreements && agreements.terms    ? now : null,
        privacy_agreed_at:   agreements && agreements.privacy  ? now : null,
        marketing_agreed_at: agreements && agreements.marketing ? now : null,
      }, { onConflict: 'user_id' });

      return { data: res.data, error: null };
    },

    /* ──────────────────────────────────────────
       로그인 — 이메일 또는 아이디(username) 지원
    ────────────────────────────────────────── */
    signIn: async function (emailOrUsername, password) {
      var sb = window.SGH.supabase;
      if (!sb) return { data: null, error: new Error('Supabase not initialized') };

      var email = emailOrUsername.trim();

      /* 아이디(username)로 이메일 조회 */
      if (!email.includes('@')) {
        var rpc = await sb.rpc('get_email_by_username', { p_username: email });
        if (!rpc.data) {
          return { data: null, error: { message: '존재하지 않는 아이디입니다.' } };
        }
        email = rpc.data;
      }

      var res = await sb.auth.signInWithPassword({ email: email, password: password });

      if (!res.error && res.data && res.data.user) {
        /* last_login_at 갱신 */
        sb.from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', res.data.user.id)
          .then(function () {});
      }

      return res;
    },

    /* 소셜 로그인 */
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

    /* 비밀번호 재설정 메일 */
    resetPassword: async function (email) {
      return window.SGH.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/pages/reset-password.html',
      });
    },

    /* 비밀번호 변경 */
    updatePassword: async function (newPassword) {
      return window.SGH.supabase.auth.updateUser({ password: newPassword });
    },

    /* 인증 상태 변경 리스너 */
    onAuthStateChange: function (callback) {
      return window.SGH.supabase.auth.onAuthStateChange(callback);
    },

    /* ──────────────────────────────────────────
       관리자 여부 확인
    ────────────────────────────────────────── */
    checkAdmin: async function () {
      var sb = window.SGH.supabase;
      var userRes = await sb.auth.getUser();
      if (!userRes.data || !userRes.data.user) return false;
      var uid = userRes.data.user.id;
      var res = await sb.from('admin_users').select('id').eq('user_id', uid).single();
      if (res.data) return true;
      /* fallback: profiles.role */
      var pRes = await sb.from('profiles').select('role').eq('id', uid).single();
      return !!(pRes.data && pRes.data.role === 'admin');
    },

    /* ──────────────────────────────────────────
       헤더 Auth UI 갱신
    ────────────────────────────────────────── */
    initAuthUI: async function () {
      var sb = window.SGH.supabase;
      if (!sb) return null;

      var sessionRes = await sb.auth.getSession();
      var session    = sessionRes.data && sessionRes.data.session ? sessionRes.data.session : null;

      /* index.html의 authLink */
      var authLink = document.getElementById('authLink');
      if (authLink) {
        if (session) {
          var meta = session.user.user_metadata || {};
          var name = meta.name_ko || meta.username || session.user.email.split('@')[0];
          authLink.textContent = name + ' 님';
          authLink.href        = 'pages/mypage.html';
        } else {
          authLink.textContent = '로그인';
          authLink.href        = 'pages/login.html';
        }
      }

      /* 관리자 링크 */
      var adminLink = document.getElementById('adminLink');
      if (adminLink && session) {
        var isAdm = await window.SGH.auth.checkAdmin();
        if (isAdm) adminLink.style.display = '';
      }

      return session;
    },

    /* ──────────────────────────────────────────
       보호 페이지 가드 — 비로그인 시 로그인으로 이동
    ────────────────────────────────────────── */
    requireLogin: async function (redirectTo) {
      var sb  = window.SGH.supabase;
      var res = await sb.auth.getSession();
      if (!res.data || !res.data.session) {
        var redirect = redirectTo || window.location.href;
        sessionStorage.setItem('loginRedirect', redirect);
        var loginPath = window.location.pathname.includes('/pages/')
          ? 'login.html'
          : 'pages/login.html';
        window.location.replace(loginPath);
        return false;
      }
      return true;
    },

    /* ──────────────────────────────────────────
       관리자 가드
    ────────────────────────────────────────── */
    requireAdmin: async function () {
      var ok = await window.SGH.auth.requireLogin();
      if (!ok) return false;
      var isAdm = await window.SGH.auth.checkAdmin();
      if (!isAdm) {
        alert('관리자만 접근할 수 있습니다.');
        window.location.replace('../index.html');
        return false;
      }
      return true;
    },
  };

})();
