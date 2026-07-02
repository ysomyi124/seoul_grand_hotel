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

  /* ---- Login state in header ---- */
  function updateAuthLink() {
    if (!authLink) return;
    const isLoggedIn = localStorage.getItem('sgh_logged_in') === 'true';
    const loggedInName = localStorage.getItem('sgh_user_name') || '';

    if (isLoggedIn) {
      authLink.textContent = loggedInName ? loggedInName + ' 님' : '마이페이지';
      authLink.href = 'pages/mypage.html';
    } else {
      authLink.textContent = '로그인';
      authLink.href = 'pages/login.html';
    }
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
