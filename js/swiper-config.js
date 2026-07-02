/* =============================================
   SWIPER CONFIGURATIONS
   ============================================= */

(function () {
  'use strict';

  /* ---- Section 2: Rooms Slider ---- */
  if (document.getElementById('roomsSwiper')) {
    var roomsSwiper = new Swiper('#roomsSwiper', {
      centeredSlides: true,
      centeredSlidesBounds: false,
      slidesPerView: 'auto',
      loop: true,
      loopAdditionalSlides: 3,
      initialSlide: 0,
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

    roomsSwiper.slideToLoop(0, 0);
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
