/* =============================================
   MAIN — Init & Miscellaneous
   ============================================= */

(function () {
  'use strict';

  /* ---- Page transition (fade in on load) ---- */
  const transition = document.getElementById('pageTransition');
  if (transition) {
    window.addEventListener('load', function () {
      transition.style.transition = 'opacity 0.6s ease';
      transition.style.opacity = '0';
      setTimeout(function () {
        transition.style.display = 'none';
      }, 650);
    });

    /* Fade out on internal link clicks */
    document.querySelectorAll('a:not([href^="#"]):not([target="_blank"])').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('mailto') || href.startsWith('tel')) return;

      link.addEventListener('click', function (e) {
        e.preventDefault();
        transition.style.display = 'block';
        transition.style.opacity = '0';
        requestAnimationFrame(function () {
          transition.style.opacity = '1';
          setTimeout(function () {
            window.location.href = href;
          }, 420);
        });
      });
    });
  }

  /* ---- Reservation form — default dates ---- */
  const checkin  = document.getElementById('checkin');
  const checkout = document.getElementById('checkout');

  if (checkin && checkout) {
    const today    = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    function toLocalDateString(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }

    checkin.value  = toLocalDateString(today);
    checkout.value = toLocalDateString(tomorrow);
    checkin.min    = toLocalDateString(today);
    checkout.min   = toLocalDateString(tomorrow);

    checkin.addEventListener('change', function () {
      const selectedDate = new Date(this.value);
      selectedDate.setDate(selectedDate.getDate() + 1);
      checkout.min   = toLocalDateString(selectedDate);
      if (new Date(checkout.value) <= new Date(this.value)) {
        checkout.value = toLocalDateString(selectedDate);
      }
    });
  }

  /* ---- Reservation form submit ---- */
  const reservationForm = document.getElementById('reservationForm');
  if (reservationForm) {
    reservationForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('예약 페이지로 이동합니다.');
    });
  }

})();
