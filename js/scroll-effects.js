/* =============================================
   SCROLL EFFECTS
   - Scroll Reveal (Intersection Observer)
   - Parallax (Hero, CTA)
   - Top Button visibility
   ============================================= */

(function () {
  'use strict';

  /* ---- Scroll Reveal ---- */
  const revealEls = document.querySelectorAll(
    '.reveal, .reveal-scale, .reveal-left, .reveal-right'
  );

  if (revealEls.length > 0) {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---- Parallax for Hero background ---- */
  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    window.addEventListener('scroll', function () {
      const scrollY = window.scrollY;
      const heroHeight = heroBg.parentElement.offsetHeight;
      if (scrollY <= heroHeight) {
        heroBg.style.transform = 'translateY(' + scrollY * 0.35 + 'px)';
      }
    }, { passive: true });
  }

  /* ---- Parallax for CTA background ---- */
  const ctaBg = document.getElementById('ctaBg');
  if (ctaBg) {
    const ctaSection = ctaBg.parentElement;

    window.addEventListener('scroll', function () {
      const rect = ctaSection.getBoundingClientRect();
      const viewH = window.innerHeight;
      if (rect.top < viewH && rect.bottom > 0) {
        const progress = (viewH - rect.top) / (viewH + rect.height);
        ctaBg.style.transform = 'translateY(' + (progress * 60 - 30) + 'px)';
      }
    }, { passive: true });
  }

  /* ---- Top Button visibility ---- */
  const topBtn = document.getElementById('topBtn');
  if (topBtn) {
    function handleTopBtn() {
      if (window.scrollY > 400) {
        topBtn.classList.add('is-visible');
      } else {
        topBtn.classList.remove('is-visible');
      }
    }
    window.addEventListener('scroll', handleTopBtn, { passive: true });
    handleTopBtn();

    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

})();
