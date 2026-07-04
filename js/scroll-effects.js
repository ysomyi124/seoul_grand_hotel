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

  /* ---- Timeless Image Scroll Zoom ---- */
  const timelessSection = document.querySelector('.sec-timeless');
  const timelessImg = document.querySelector('.sec-timeless__image img');

  if (timelessSection && timelessImg) {
    let zoomRafId = null;

    function updateTimelessZoom() {
      const rect = timelessSection.getBoundingClientRect();
      const viewH = window.innerHeight;
      const sectionH = timelessSection.offsetHeight;

      // 0: section 상단이 viewport 하단에 진입 / 1: section 중앙이 viewport 중앙에 도달
      const linear = Math.max(0, Math.min(1,
        (viewH - rect.top) / (viewH / 2 + sectionH / 2)
      ));

      // easeOutQuart: 처음에 확 커지고 끝으로 갈수록 천천히 수렴
      const eased = 1 - Math.pow(1 - linear, 4);
      timelessImg.style.transform = 'scale(' + (0.3 + 0.7 * eased) + ')';
      zoomRafId = null;
    }

    window.addEventListener('scroll', function () {
      if (zoomRafId === null) {
        zoomRafId = requestAnimationFrame(updateTimelessZoom);
      }
    }, { passive: true });

    updateTimelessZoom();
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
