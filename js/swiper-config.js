/* =============================================
   SWIPER CONFIGURATIONS
   ============================================= */

(function () {
  'use strict';

  /* ---- Section 2: Rooms Slider ---- */
  if (document.getElementById('roomsSwiper')) {

    new Swiper('#roomsSwiper', {
      centeredSlides: true,
      slidesPerView: 'auto',
      loop: true,
      spaceBetween: 30,
      speed: 800,
      grabCursor: true,
      watchSlidesProgress: true,
      observer: true,
      observeParents: true,
      navigation: {
        prevEl: '.rooms-swiper__prev',
        nextEl: '.rooms-swiper__next',
      },
    });

  }

  /* ---- Section 4: Special Offers Slider ---- */
  if (document.getElementById('offersSwiper')) {
    new Swiper('#offersSwiper', {
      slidesPerView: 'auto',
      spaceBetween: 16,
      loop: false,
      speed: 600,
      grabCursor: true,
      pagination: {
        el: '.offers-swiper__pagination',
        type: 'progressbar',
      },
      breakpoints: {
        768: {
          spaceBetween: 20,
        },
        1024: {
          spaceBetween: 24,
        },
      },
    });
  }

})();
