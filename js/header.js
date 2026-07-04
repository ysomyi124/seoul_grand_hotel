/* =============================================
   HEADER INTERACTIONS
   ============================================= */

(function () {
  'use strict';

  const header      = document.getElementById('header');
  const mobileBtn   = document.getElementById('mobileMenuBtn');
  const mobileNav   = document.getElementById('mobileNav');
  const authLink    = document.getElementById('authLink');
  const mobileLinks = document.querySelectorAll('.mobile-nav__link');

  /* ---- Create overlay backdrop ---- */
  const overlay = document.createElement('div');
  overlay.className = 'mobile-nav-overlay';
  document.body.appendChild(overlay);

  /* ---- Sticky / scroll state ---- */
  let lastScrollY = 0;

  function onScroll() {
    const scrollY = window.scrollY;

    if (scrollY > 60) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }

    lastScrollY = scrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  /* ---- Mobile menu toggle ---- */
  function openMobileMenu() {
    mobileNav.classList.add('is-open');
    overlay.classList.add('is-visible');
    mobileBtn.classList.add('is-open');
    mobileBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileNav.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    mobileBtn.classList.remove('is-open');
    mobileBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (mobileBtn) {
    mobileBtn.addEventListener('click', function () {
      const isOpen = mobileNav.classList.contains('is-open');
      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  overlay.addEventListener('click', closeMobileMenu);

  mobileLinks.forEach(function (link) {
    link.addEventListener('click', closeMobileMenu);
  });

  /* ---- Login state in header (Supabase 세션 기반) ---- */
  async function updateAuthLink() {
    if (!authLink) return;
    if (window.SGH && window.SGH.supabase) {
      try {
        var res = await window.SGH.supabase.auth.getSession();
        var session = res.data && res.data.session ? res.data.session : null;
        if (session) {
          var meta = session.user.user_metadata || {};
          var name = meta.name_ko || session.user.email.split('@')[0];
          authLink.textContent = name + ' 님';
          authLink.href = 'pages/mypage.html';

          /* 로그아웃 링크 동적 추가 */
          var logoutEl = document.getElementById('headerLogout');
          if (!logoutEl) {
            logoutEl = document.createElement('a');
            logoutEl.id = 'headerLogout';
            logoutEl.href = '#';
            logoutEl.style.cssText = 'font-size:12px;color:#999;margin-left:12px;text-decoration:none;';
            logoutEl.textContent = '로그아웃';
            logoutEl.addEventListener('click', async function (e) {
              e.preventDefault();
              await window.SGH.supabase.auth.signOut();
              window.location.reload();
            });
            authLink.parentNode && authLink.parentNode.appendChild(logoutEl);
          }

          /* 관리자 링크 표시 */
          var adminNavLink = document.getElementById('adminLink');
          if (adminNavLink) {
            var pr = await window.SGH.supabase.from('profiles').select('role').eq('id', session.user.id).single();
            if (pr.data && pr.data.role === 'admin') adminNavLink.style.display = '';
          }
        } else {
          authLink.textContent = '로그인';
          authLink.href = 'pages/login.html';
        }
        return;
      } catch (e) { /* Supabase 불가 시 하단 fallback */ }
    }
    /* Fallback (Supabase 미연결 환경) */
    authLink.textContent = '로그인';
    authLink.href = 'pages/login.html';
  }

  updateAuthLink();

  /* ---- Smooth scroll for nav anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      const headerHeight = header ? header.offsetHeight : 0;
      const targetY = target.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      closeMobileMenu();
    });
  });

})();
