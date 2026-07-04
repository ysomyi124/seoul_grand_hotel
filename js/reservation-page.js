/* =============================================
   RESERVATION PAGE LOGIC
   ============================================= */
(function () {
  'use strict';

  /* ---- Data ---- */
  var ROOMS = [
    {
      id: 'deluxe', name: 'Deluxe Room',
      desc: '세련된 인테리어와 도심 전망을 갖춘 프리미엄 럭셔리 객실입니다.',
      bed: 'King Bed', size: 38, maxAdults: 2, maxOccupancy: 3,
      img: '../images/room01.jpg',
      amenities: ['무료 Wi-Fi', '미니바', '에스프레소 머신', '대리석 욕실'],
      price: 320000,
    },
    {
      id: 'superior', name: 'Superior Room',
      desc: '탁 트인 서울 시티뷰와 프리미엄 어메니티를 제공하는 우아한 객실입니다.',
      bed: 'King Bed', size: 45, maxAdults: 2, maxOccupancy: 4,
      img: '../images/room02.jpg',
      amenities: ['무료 Wi-Fi', '미니바', '에스프레소 머신', '대리석 욕실', '욕조'],
      price: 420000,
    },
    {
      id: 'junior-suite', name: 'Junior Suite',
      desc: '독립적인 거실 공간과 파노라마 뷰를 갖춘 스위트룸입니다.',
      bed: 'King Bed', size: 62, maxAdults: 3, maxOccupancy: 5,
      img: '../images/room03.jpg',
      amenities: ['무료 Wi-Fi', '미니바', '에스프레소 머신', '대리석 욕실', '욕조', '거실'],
      price: 680000,
    },
    {
      id: 'grand-suite', name: 'Grand Suite',
      desc: '서울의 스카이라인을 파노라마로 감상할 수 있는 최상급 스위트룸입니다.',
      bed: 'King Bed + Sofa Bed', size: 85, maxAdults: 4, maxOccupancy: 6,
      img: '../images/hotel_inside.png',
      amenities: ['무료 Wi-Fi', '미니바', '에스프레소 머신', '대리석 욕실', '욕조', '거실', '다이닝룸'],
      price: 980000,
    },
  ];

  var PACKAGES = [
    { id: 'none',       name: 'No Package',      icon: '—',  desc: '패키지 없이 기본 요금으로 예약합니다.',  type: 'none',     value: 0 },
    { id: 'breakfast',  name: 'Breakfast',        icon: '🍳', desc: '매일 아침 조식 2인 포함',              type: 'add',      value: 50000 },
    { id: 'earlybird',  name: 'Early Bird',       icon: '⏰', desc: '30일 전 예약 시 15% 할인',             type: 'discount', value: 0.15 },
    { id: 'honeymoon',  name: 'Honeymoon',        icon: '💍', desc: '샴페인, 꽃 장식, 레이트 체크아웃',     type: 'add',      value: 100000 },
    { id: 'family',     name: 'Family Package',   icon: '👨‍👩‍👧', desc: '어린이 조식 무료, 패밀리 어메니티',  type: 'add',      value: 80000 },
    { id: 'spa',        name: 'Spa Package',      icon: '🧖', desc: '커플 스파 90분 이용권 포함',           type: 'add',      value: 120000 },
  ];

  var SERVICES = [
    { id: 'airport',     name: '공항 픽업',         desc: '인천/김포 공항 전용 리무진',   price: 120000 },
    { id: 'valet',       name: '발렛파킹',           desc: '24시간 발렛 서비스',           price: 30000 },
    { id: 'spa-rsv',     name: '스파 예약',          desc: '딥 티슈 마사지 60분',          price: 90000 },
    { id: 'late-co',     name: '레이트 체크아웃',    desc: '오후 4시까지 연장',            price: 50000 },
    { id: 'early-ci',    name: '얼리 체크인',        desc: '오전 9시부터 체크인',          price: 50000 },
    { id: 'breakfast-s', name: '조식 추가',          desc: '1인 추가 (기본 2인 포함)',     price: 45000 },
  ];

  var VALID_COUPONS = { 'SEOUL10': { type: 'pct', value: 10, label: '10% 할인 쿠폰' }, 'WELCOME20000': { type: 'amt', value: 20000, label: '₩20,000 즉시 할인' } };

  var REQUESTS = ['Late Check-in', 'High Floor', 'Non-Smoking', 'Baby Crib', 'Airport Pickup', 'Quiet Room', 'Twin Bed', 'Extra Pillow'];

  /* ---- State ---- */
  var state = {
    checkin: '', checkout: '', nights: 0, rooms: 1, adults: 2, children: 0,
    selectedRoom: null, selectedPackage: 'none',
    services: {}, requests: [], specialRequest: '',
    couponCode: '', couponDiscount: 0,
    paymentMethod: 'credit',
    guestInfo: { nameKo: '', nameEn: '', email: '', phone: '', country: '' },
    agreements: { privacy: false, cancellation: false, terms: false },
  };

  /* ---- Helpers ---- */
  function fmt(n) { return '₩' + n.toLocaleString(); }
  function parseDate(s) { return s ? new Date(s + 'T00:00:00') : null; }
  function calcNights(ci, co) {
    var a = parseDate(ci), b = parseDate(co);
    if (!a || !b) return 0;
    return Math.max(0, Math.round((b - a) / 86400000));
  }
  function fmtDate(s) {
    if (!s) return '—';
    var d = parseDate(s);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');
  }

  /* ---- Load session data ---- */
  function loadSession() {
    try {
      var raw = sessionStorage.getItem('rsvData');
      if (raw) {
        var d = JSON.parse(raw);
        state.checkin  = d.checkin  || '';
        state.checkout = d.checkout || '';
        state.rooms    = parseInt(d.rooms,    10) || 1;
        state.adults   = parseInt(d.adults,   10) || 2;
        state.children = parseInt(d.children, 10) || 0;
        state.nights   = calcNights(state.checkin, state.checkout);
      }
    } catch (e) {}
  }

  /* ---- Render Summary (Step 1) ---- */
  function renderSummary() {
    var el = function(id) { return document.getElementById(id); };
    if (el('sumCheckin'))  el('sumCheckin').textContent  = fmtDate(state.checkin);
    if (el('sumCheckout')) el('sumCheckout').textContent = fmtDate(state.checkout);
    if (el('sumAdults'))   el('sumAdults').textContent   = state.adults;
    if (el('sumChildren')) el('sumChildren').textContent = state.children;
    if (el('sumRooms'))    el('sumRooms').textContent    = state.rooms;
    if (el('sumNights'))   el('sumNights').textContent   = state.nights + '박';
    if (el('sumStay'))     el('sumStay').textContent     = state.nights + ' Nights';

    // Modify form defaults
    var mci = el('modifyCheckin'), mco = el('modifyCheckout');
    if (mci) mci.value = state.checkin;
    if (mco) mco.value = state.checkout;
  }

  /* ---- Render Rooms (Step 2) ---- */
  function renderRooms() {
    var container = document.getElementById('roomList');
    if (!container) return;
    container.innerHTML = '';
    ROOMS.forEach(function(room) {
      var avail = room.maxAdults >= state.adults;
      var card = document.createElement('div');
      card.className = 'room-card' + (avail ? '' : ' room-card--unavailable') + (state.selectedRoom === room.id ? ' is-selected' : '');
      card.dataset.roomId = room.id;
      card.innerHTML =
        '<div class="room-card__img-wrap">' +
          '<img class="room-card__img" src="' + room.img + '" alt="' + room.name + '" loading="lazy">' +
          '<span class="room-card__selected-badge">Selected</span>' +
          (avail ? '' : '<div class="room-card__unavail-badge">정원 초과</div>') +
        '</div>' +
        '<div class="room-card__info">' +
          '<div class="room-card__name">' + room.name + '</div>' +
          '<div class="room-card__desc">' + room.desc + '</div>' +
          '<div class="room-card__specs">' +
            '<span class="room-card__spec">🛏 ' + room.bed + '</span>' +
            '<span class="room-card__spec">📐 ' + room.size + 'm²</span>' +
            '<span class="room-card__spec">👤 최대 ' + room.maxOccupancy + '인</span>' +
          '</div>' +
          '<div class="room-card__amenities">' +
            room.amenities.map(function(a) { return '<span class="room-card__amenity">' + a + '</span>'; }).join('') +
          '</div>' +
          '<div class="room-card__footer">' +
            '<div>' +
              '<div class="room-card__price-label">Per Night</div>' +
              '<div class="room-card__price">' + fmt(room.price) + '<span class="room-card__price-unit"> /박</span></div>' +
            '</div>' +
            (avail ? '<button type="button" class="room-card__select-btn" data-room-id="' + room.id + '">' + (state.selectedRoom === room.id ? '선택됨' : '선택하기') + '</button>' : '') +
          '</div>' +
        '</div>';
      container.appendChild(card);
    });
  }

  /* ---- Render Packages (Step 3) ---- */
  function renderPackages() {
    var container = document.getElementById('packageGrid');
    if (!container) return;
    container.innerHTML = '';
    PACKAGES.forEach(function(pkg) {
      var sel = state.selectedPackage === pkg.id;
      var div = document.createElement('div');
      div.className = 'package-card' + (sel ? ' is-selected' : '');
      div.dataset.pkgId = pkg.id;
      var priceStr = pkg.id === 'none' ? '기본 요금' : pkg.type === 'discount' ? (pkg.value * 100) + '% 할인' : '+' + fmt(pkg.value) + '/박';
      div.innerHTML =
        '<div class="package-card__check"></div>' +
        '<span class="package-card__icon">' + pkg.icon + '</span>' +
        '<div class="package-card__name">' + pkg.name + '</div>' +
        '<div class="package-card__desc">' + pkg.desc + '</div>' +
        '<div class="package-card__price">' + priceStr + '</div>';
      container.appendChild(div);
    });
  }

  /* ---- Render Services (Step 5) ---- */
  function renderServices() {
    var container = document.getElementById('serviceList');
    if (!container) return;
    container.innerHTML = '';
    SERVICES.forEach(function(svc) {
      var checked = !!state.services[svc.id];
      var div = document.createElement('div');
      div.className = 'service-item' + (checked ? ' is-checked' : '');
      div.dataset.svcId = svc.id;
      div.innerHTML =
        '<div class="service-item__checkbox"></div>' +
        '<div class="service-item__info">' +
          '<div class="service-item__name">' + svc.name + '</div>' +
          '<div class="service-item__desc">' + svc.desc + '</div>' +
        '</div>' +
        '<div class="service-item__price">' + fmt(svc.price) + '</div>';
      container.appendChild(div);
    });
  }

  /* ---- Render Request Chips ---- */
  function renderChips() {
    var container = document.getElementById('requestChips');
    if (!container) return;
    container.innerHTML = '';
    REQUESTS.forEach(function(req) {
      var sel = state.requests.indexOf(req) !== -1;
      var span = document.createElement('span');
      span.className = 'request-chip' + (sel ? ' is-selected' : '');
      span.dataset.req = req;
      span.textContent = req;
      container.appendChild(span);
    });
  }

  /* ---- Price Calculation ---- */
  function calcPrice() {
    if (!state.selectedRoom) return null;
    var room = ROOMS.find(function(r) { return r.id === state.selectedRoom; });
    if (!room) return null;
    var nights = state.nights || 1;
    var rooms  = state.rooms  || 1;
    var baseRoom = room.price * nights * rooms;

    var pkg = PACKAGES.find(function(p) { return p.id === state.selectedPackage; });
    var pkgDiscount = 0, pkgAdd = 0;
    if (pkg && pkg.id !== 'none') {
      if (pkg.type === 'discount') pkgDiscount = baseRoom * pkg.value;
      if (pkg.type === 'add')     pkgAdd = pkg.value * nights * rooms;
    }

    var svcTotal = 0;
    SERVICES.forEach(function(s) { if (state.services[s.id]) svcTotal += s.price; });

    var sub = baseRoom - pkgDiscount + pkgAdd + svcTotal;
    var coupon = state.couponDiscount || 0;
    if (VALID_COUPONS[state.couponCode]) {
      var cp = VALID_COUPONS[state.couponCode];
      coupon = cp.type === 'pct' ? Math.round(sub * cp.value / 100) : cp.value;
    }
    var afterCoupon = Math.max(0, sub - coupon);
    var tax = Math.round(afterCoupon * 0.1);
    var total = afterCoupon + tax;

    return { baseRoom: baseRoom, pkgDiscount: pkgDiscount, pkgAdd: pkgAdd, svcTotal: svcTotal, coupon: coupon, tax: tax, total: total, nights: nights, rooms: rooms };
  }

  /* ---- Update Price Sidebar ---- */
  function updatePriceSidebar() {
    var noRoom = document.getElementById('priceNoRoom');
    var priceBody = document.getElementById('priceBody');
    var cta = document.getElementById('sidebarCta');

    if (!state.selectedRoom) {
      if (noRoom)    noRoom.style.display = 'block';
      if (priceBody) priceBody.style.display = 'none';
      if (cta)       cta.disabled = true;
      return;
    }
    if (noRoom)    noRoom.style.display = 'none';
    if (priceBody) priceBody.style.display = 'block';
    if (cta)       cta.disabled = false;

    var room = ROOMS.find(function(r) { return r.id === state.selectedRoom; });
    var p = calcPrice();
    if (!p) return;

    var el = function(id) { return document.getElementById(id); };
    if (el('priceRoom')) el('priceRoom').textContent = room ? room.name : '';
    if (el('priceDates')) el('priceDates').textContent = fmtDate(state.checkin) + ' → ' + fmtDate(state.checkout);

    var baseLabel = room.name + ' × ' + p.nights + '박' + (p.rooms > 1 ? ' × ' + p.rooms + '실' : '');
    if (el('priceBaseLabel'))  el('priceBaseLabel').textContent  = baseLabel;
    if (el('priceBaseAmt'))    el('priceBaseAmt').textContent    = fmt(p.baseRoom);
    if (el('pricePkgRow'))     el('pricePkgRow').style.display  = (p.pkgDiscount > 0 || p.pkgAdd > 0) ? 'flex' : 'none';
    if (el('pricePkgAmt')) {
      if (p.pkgDiscount > 0) { el('pricePkgAmt').textContent = '−' + fmt(p.pkgDiscount); el('pricePkgRow').classList.add('price-row--discount'); }
      else                   { el('pricePkgAmt').textContent = '+' + fmt(p.pkgAdd);       el('pricePkgRow').classList.remove('price-row--discount'); }
    }
    if (el('priceSvcRow'))     el('priceSvcRow').style.display  = p.svcTotal > 0 ? 'flex' : 'none';
    if (el('priceSvcAmt'))     el('priceSvcAmt').textContent    = fmt(p.svcTotal);
    if (el('priceCouponRow'))  el('priceCouponRow').style.display = p.coupon > 0 ? 'flex' : 'none';
    if (el('priceCouponAmt'))  el('priceCouponAmt').textContent = '−' + fmt(p.coupon);
    if (el('priceTaxAmt'))     el('priceTaxAmt').textContent    = fmt(p.tax);
    if (el('priceTotalAmt'))   el('priceTotalAmt').textContent  = fmt(p.total);
  }

  /* ---- Update Progress Bar ---- */
  function updateProgress() {
    if (!state.selectedRoom) return;
    var items = document.querySelectorAll('.rsv-progress__item');
    items.forEach(function(item) {
      var s = parseInt(item.dataset.step);
      item.classList.remove('is-active', 'is-done');
      // Mark done if section is passed (simplified heuristic)
      if (s === 2 && state.selectedRoom) item.classList.add('is-done');
    });
  }

  /* ---- Events ---- */

  // Room selection
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-room-id]');
    if (btn) {
      var id = btn.dataset.roomId;
      state.selectedRoom = (state.selectedRoom === id) ? null : id;
      renderRooms();
      updatePriceSidebar();
      updateProgress();
    }
  });

  // Package selection
  document.addEventListener('click', function(e) {
    var card = e.target.closest('[data-pkg-id]');
    if (card) {
      state.selectedPackage = card.dataset.pkgId;
      renderPackages();
      updatePriceSidebar();
    }
  });

  // Service toggle
  document.addEventListener('click', function(e) {
    var item = e.target.closest('[data-svc-id]');
    if (item) {
      var id = item.dataset.svcId;
      state.services[id] = !state.services[id];
      renderServices();
      updatePriceSidebar();
    }
  });

  // Request chip toggle
  document.addEventListener('click', function(e) {
    var chip = e.target.closest('[data-req]');
    if (chip) {
      var req = chip.dataset.req;
      var idx = state.requests.indexOf(req);
      if (idx === -1) state.requests.push(req);
      else state.requests.splice(idx, 1);
      renderChips();
    }
  });

  // Payment method
  document.addEventListener('click', function(e) {
    var opt = e.target.closest('[data-pay]');
    if (opt) {
      state.paymentMethod = opt.dataset.pay;
      document.querySelectorAll('[data-pay]').forEach(function(o) {
        o.classList.toggle('is-selected', o.dataset.pay === state.paymentMethod);
      });
    }
  });

  // Agreements
  document.addEventListener('click', function(e) {
    var item = e.target.closest('[data-agree]');
    if (item && !e.target.closest('.agree-item__link')) {
      var key = item.dataset.agree;
      if (key === 'all') {
        var allChecked = state.agreements.privacy && state.agreements.cancellation && state.agreements.terms;
        ['privacy','cancellation','terms'].forEach(function(k) { state.agreements[k] = !allChecked; });
      } else {
        state.agreements[key] = !state.agreements[key];
      }
      syncAgreeUI();
    }
  });

  function syncAgreeUI() {
    ['privacy','cancellation','terms'].forEach(function(k) {
      var el = document.querySelector('[data-agree="' + k + '"] .agree-checkbox');
      if (el) el.classList.toggle('is-checked', !!state.agreements[k]);
    });
    var allEl = document.querySelector('[data-agree="all"] .agree-checkbox');
    if (allEl) {
      var allChecked = state.agreements.privacy && state.agreements.cancellation && state.agreements.terms;
      allEl.classList.toggle('is-checked', allChecked);
    }
  }

  // Modify toggle
  var modifyBtn = document.getElementById('modifyBtn');
  var modifyForm = document.getElementById('modifyForm');
  if (modifyBtn && modifyForm) {
    modifyBtn.addEventListener('click', function() {
      modifyForm.classList.toggle('is-open');
      modifyBtn.textContent = modifyForm.classList.contains('is-open') ? 'Cancel' : 'Modify';
    });
  }

  // Modify apply
  var modifyApply = document.getElementById('modifyApply');
  if (modifyApply) {
    modifyApply.addEventListener('click', function() {
      var ci = document.getElementById('modifyCheckin');
      var co = document.getElementById('modifyCheckout');
      if (ci && ci.value) state.checkin  = ci.value;
      if (co && co.value) state.checkout = co.value;
      state.nights = calcNights(state.checkin, state.checkout);
      renderSummary();
      renderRooms();
      updatePriceSidebar();
      if (modifyForm) modifyForm.classList.remove('is-open');
      if (modifyBtn)  modifyBtn.textContent = 'Modify';
    });
  }

  // Coupon apply
  var couponApplyBtn = document.getElementById('couponApply');
  if (couponApplyBtn) {
    couponApplyBtn.addEventListener('click', function() {
      var input = document.getElementById('couponInput');
      var result = document.getElementById('couponResult');
      if (!input || !result) return;
      var code = input.value.trim().toUpperCase();
      var cp = VALID_COUPONS[code];
      result.className = 'coupon-result';
      if (cp) {
        state.couponCode = code;
        result.textContent = '✓ ' + cp.label + ' 적용되었습니다.';
        result.classList.add('is-valid');
      } else {
        state.couponCode = '';
        result.textContent = '유효하지 않은 쿠폰 코드입니다.';
        result.classList.add('is-invalid');
      }
      updatePriceSidebar();
    });
  }

  // Guest info real-time validation
  ['guestNameKo','guestNameEn','guestEmail','guestPhone'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', function() { validateField(el); });
    el.addEventListener('input', function() { if (el.classList.contains('is-error')) validateField(el); });
  });

  function validateField(el) {
    var val = el.value.trim();
    var ok = val.length > 0;
    if (el.id === 'guestEmail') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (el.id === 'guestPhone') ok = /^[\d\-\+\s]{8,}$/.test(val);
    el.classList.toggle('is-error', !ok);
    return ok;
  }

  function validateAll() {
    var ids = ['guestNameKo','guestNameEn','guestEmail','guestPhone'];
    return ids.every(function(id) {
      var el = document.getElementById(id);
      return el ? validateField(el) : true;
    });
  }

  // Sidebar CTA → scroll to submit
  var sidebarCta = document.getElementById('sidebarCta');
  if (sidebarCta) {
    sidebarCta.addEventListener('click', function() {
      var el = document.getElementById('step-agree');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Main submit
  var mainSubmit = document.getElementById('mainSubmit');
  if (mainSubmit) {
    mainSubmit.addEventListener('click', function() {
      if (!state.selectedRoom) {
        alert('객실을 선택해주세요.');
        var el = document.getElementById('step-room');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (!validateAll()) {
        alert('예약자 정보를 올바르게 입력해주세요.');
        var el2 = document.getElementById('step-guest');
        if (el2) el2.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (!state.agreements.privacy || !state.agreements.cancellation || !state.agreements.terms) {
        alert('필수 약관에 모두 동의해주세요.');
        return;
      }

      // Collect guest info
      var gi = state.guestInfo;
      gi.nameKo  = (document.getElementById('guestNameKo')  || {}).value || '';
      gi.nameEn  = (document.getElementById('guestNameEn')  || {}).value || '';
      gi.email   = (document.getElementById('guestEmail')   || {}).value || '';
      gi.phone   = (document.getElementById('guestPhone')   || {}).value || '';
      gi.country = (document.getElementById('guestCountry') || {}).value || '';
      state.guestInfo.specialRequest = (document.getElementById('specialRequest') || {}).value || '';

      // Build reservation object
      var room = ROOMS.find(function(r) { return r.id === state.selectedRoom; });
      var p = calcPrice();
      var reservationNo = 'SGH' + Date.now().toString().slice(-8);
      var reservation = {
        no:           reservationNo,
        createdAt:    new Date().toISOString(),
        checkin:      state.checkin,
        checkout:     state.checkout,
        nights:       state.nights,
        rooms:        state.rooms,
        adults:       state.adults,
        children:     state.children,
        room:         room ? { id: room.id, name: room.name, price: room.price } : null,
        package:      state.selectedPackage,
        services:     Object.keys(state.services).filter(function(k) { return state.services[k]; }),
        requests:     state.requests,
        couponCode:   state.couponCode,
        guestInfo:    state.guestInfo,
        paymentMethod: state.paymentMethod,
        price:        p,
      };
      sessionStorage.setItem('rsvComplete', JSON.stringify(reservation));
      window.location.href = 'reservation-complete.html';
    });
  }

  /* ---- Progress scroll spy ---- */
  var stepIds = ['step-info','step-room','step-package','step-guest','step-services','step-coupon','step-payment','step-agree'];
  window.addEventListener('scroll', function() {
    var scrollY = window.scrollY + 160;
    var current = stepIds[0];
    stepIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) current = id;
    });
    document.querySelectorAll('.rsv-progress__item').forEach(function(item) {
      item.classList.toggle('is-active', item.dataset.step === current);
    });
  }, { passive: true });

  /* ---- Init ---- */
  loadSession();
  renderSummary();
  renderRooms();
  renderPackages();
  renderServices();
  renderChips();
  updatePriceSidebar();

  // Set default payment selection
  var defaultPay = document.querySelector('[data-pay="credit"]');
  if (defaultPay) defaultPay.classList.add('is-selected');

})();
