/* =============================================
   PROFILE MODULE — js/profile.js
   사용자 프로필 조회 · 생성 · 수정
   ============================================= */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.profile = {

    /* 현재 로그인 사용자의 프로필 조회 */
    getCurrent: async function () {
      var userRes = await window.SGH.supabase.auth.getUser();
      if (userRes.error || !userRes.data.user) {
        return { data: null, error: userRes.error || new Error('로그인이 필요합니다.') };
      }
      return window.SGH.profile.get(userRes.data.user.id);
    },

    /* ID로 프로필 조회 */
    get: async function (userId) {
      return window.SGH.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    },

    /* 프로필 생성 (회원가입 후 호출) */
    create: async function (userId, profileData) {
      return window.SGH.supabase
        .from('profiles')
        .insert([Object.assign({ id: userId }, profileData)])
        .select()
        .single();
    },

    /* 프로필 수정 */
    update: async function (userId, profileData) {
      return window.SGH.supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();
    },

    /* 현재 사용자 프로필 upsert (없으면 생성, 있으면 수정) */
    upsertCurrent: async function (profileData) {
      var userRes = await window.SGH.supabase.auth.getUser();
      if (userRes.error || !userRes.data.user) {
        return { data: null, error: userRes.error || new Error('로그인이 필요합니다.') };
      }
      var userId = userRes.data.user.id;
      return window.SGH.supabase
        .from('profiles')
        .upsert([Object.assign({ id: userId }, profileData)])
        .select()
        .single();
    },
  };

})();
