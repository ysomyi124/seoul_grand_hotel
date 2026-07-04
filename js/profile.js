/* ================================================================
   PROFILE MODULE — js/profile.js
   사용자 프로필 조회 · 생성 · 수정 (멤버십 등급 조인 포함)
   ================================================================ */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  var SELECT_FIELDS = [
    'id', 'email', 'username', 'name_ko', 'name_en',
    'gender', 'birth_date', 'phone', 'address',
    'role', 'membership_grade_id', 'points',
    'last_login_at', 'created_at',
    'membership_grades(name, min_points, discount_percent, benefits)',
  ].join(', ');

  window.SGH.profile = {

    /* 현재 로그인 사용자의 프로필 조회 */
    getCurrent: async function () {
      var userRes = await window.SGH.supabase.auth.getUser();
      if (userRes.error || !userRes.data.user) {
        return { data: null, error: userRes.error || new Error('로그인이 필요합니다.') };
      }
      return window.SGH.profile.get(userRes.data.user.id);
    },

    /* ID로 프로필 조회 (멤버십 등급 포함) */
    get: async function (userId) {
      return window.SGH.supabase
        .from('profiles')
        .select(SELECT_FIELDS)
        .eq('id', userId)
        .single();
    },

    /* 프로필 수정 */
    update: async function (userId, profileData) {
      /* 허용 필드만 필터 */
      var allowed = ['name_ko', 'name_en', 'gender', 'birth_date', 'phone', 'address', 'username'];
      var safe = {};
      allowed.forEach(function (key) {
        if (key in profileData) safe[key] = profileData[key];
      });

      return window.SGH.supabase
        .from('profiles')
        .update(safe)
        .eq('id', userId)
        .select(SELECT_FIELDS)
        .single();
    },

    /* 현재 사용자 프로필 upsert */
    upsertCurrent: async function (profileData) {
      var userRes = await window.SGH.supabase.auth.getUser();
      if (userRes.error || !userRes.data.user) {
        return { data: null, error: userRes.error || new Error('로그인이 필요합니다.') };
      }
      var userId = userRes.data.user.id;
      return window.SGH.supabase
        .from('profiles')
        .upsert([Object.assign({ id: userId }, profileData)])
        .select(SELECT_FIELDS)
        .single();
    },

    /* 약관 동의 조회 */
    getAgreements: async function () {
      var userRes = await window.SGH.supabase.auth.getUser();
      if (!userRes.data || !userRes.data.user) return { data: null, error: new Error('로그인 필요') };
      return window.SGH.supabase
        .from('user_agreements')
        .select('*')
        .eq('user_id', userRes.data.user.id)
        .single();
    },
  };

})();
