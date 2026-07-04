/* =============================================
   RESERVATION PAGE LOGIC
   ============================================= */
(function () {
  'use strict';

  /* ---- Fallback data (DB 연결 실패 시 사용) ---- */
  var FALLBACK_ROOMS = [
    { id: 'deluxe', name_ko: 'Deluxe King', description_ko: '세련된 인테리어와 도심 전망을 갖춘 프리미엄 럭셔리 객실입니다.', bed_type: 'King Bed', size_sqm: 38, max_adults: 2, max_occupancy: 3, images: ['../images/room01.jpg'], amenities: ['무료 Wi-Fi','미니바','에스프레소 머신','대리석 욕실'], price_per_night: 320000 },
    { id: 'superior', name_ko: 'Superior Room', description_ko: '탁 트인 서울 시티뷰와 프리미엄 어메니티를 제공하는 우아한 객실입니다.', bed_type: 'King Bed', size_sqm: 45, max_adults: 2, max_occupancy: 4, images: ['../images/room02.jpg'], amenities: ['무료 Wi-Fi','미니바','에스프레소 머신','욕조'], price_per_night: 420000 },
    { id: 'junior-suite', name_ko: 'Junior Suite', description_ko: '독립적인 거실 공간과 파노라마 뷰를 갖춘 스위트룸입니다.', bed_type: 'King Bed', size_sqm: 62, max_adults: 3, max_occupancy: 5, images: ['../images/room03.jpg'], amenities: ['무료 Wi-Fi','미니바','대리석 욕실','욕조','거실'], price_per_night: 680000 },
    { id: 'grand-suite', name_ko: 'Grand Suite', description_ko: '서울의 스카이라인을 파노라마로 감상할 수 있는 최상급 스위트룸입니다.', bed_type: 'King Bed + Sofa Bed', size_sqm: 85, max_adults: 4, max_occupancy: 6, images: ['../images/hotel_inside.png'], amenities: ['무료 Wi-Fi','미니바','욕조','거실','다이닝룸'], price_per_night: 980000 },
  ];

  var FALLBACK_PACKAGES = [
    { id: 'none',      name_ko: 'No Package',    icon: '—',  description_ko: '패키지 없이 기본 요금으로 예약합니다.', discount_type:'amount', discount_value:0, add_price:0 },
    { id: 'breakfast', name_ko: 'Breakfast',     icon: '🍳', description_ko: '매일 아침 조식 2인 포함', discount_type:'amount', discount_value:0, add_price:50000 },
    { id: 'earlybird', name_ko: 'Early Bird 15%',icon: '⏰', description_ko: '30일 전 예약 시 15% 할인', discount_type:'percent', discount_value:15, add_price:0 },
    { id: 'honeymoon', name_ko: 'Honeymoon',     icon: '💍', description_ko: '샴페인, 꽃 장식, 레이트 체크아웃', discount_type:'amount', discount_value:0, add_price:100000 },
    { id: 'family',    name_ko: 'Family Plan',   icon: '👨‍👩‍👧', description_ko: '어린이 조식 무료, 패밀리 어메니티', discount_type:'percent', discount_value:10, add_price:0 },
    { id: 'spa',       name_ko: 'Spa Package',   icon: '🧖', description_ko: '커플 스파 90분 이용권 포함', discount_type:'amount', discount_value:0, add_price:120000 },
  ];

  var FALLBACK_SERVICES = [
    { id: 'airport', name_ko: '공항 픽업',      description: '인천/김포 공항 전용 리무진', price: 120000 },
    { id: 'valet',   name_ko: '발렛파킹',        description: '24시간 발렛 서비스',         price: 30000  },
    { id: 'spa-rsv', name_ko: '스파 예약',       description: '딥 티슈 마사지 60분',        price: 90000  },
    { id: 'late-co', name_ko: '레이트 체크아웃', description: '오후 4시까지 연장',          price: 50000  },
    { id: 'early-ci',name_ko: '얼리 체크인',     description: '오전 9시부터 체크인',        price: 50000  },
    { id: 'bfst-s',  name_ko: '조식 추가',       description: '1인 추가 (기본 2인 포함)',   price: 45000  },
  ];

  /* ---- Live data (DB에서 로드 후 교체) ---- */
  var ROOMS    = [];
  var PACKAGES = [];
  var SERVICES = [];

  /* ---- 쿠폰은 DB에서 실시간 검증 ---- */
  var VALID_COUPONS = {}; /* fallback용 */

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
      var avail = (room.max_adults || 2) >= state.adults;
      var imgSrc = (room.images && room.images.length > 0) ? room.images[0] : '../images/room01.jpg';
      var amenities = Array.isArray(room.amenities) ? room.amenities : [];
      var card = document.createElement('div');
      card.className = 'room-card' + (avail ? '' : ' room-card--unavailable') + (state.selectedRoom === room.id ? ' is-selected' : '');
      card.dataset.roomId = room.id;
      card.innerHTML =
        '<div class="room-card__img-wrap">' +
          '<img class="room-card__img" src="' + imgSrc + '" alt="' + room.name_ko + '" loading="lazy">' +
          '<span class="room-card__selected-badge">Selected</span>' +
          (avail ? '' : '<div class="room-card__unavail-badge">정원 초과</div>') +
        '</div>' +
        '<div class="room-card__info">' +
          '<div class="room-card__name">' + room.name_ko + '</div>' +
          '<div class="room-card__desc">' + (room.description_ko || '') + '</div>' +
          '<div class="room-card__specs">' +
            '<span class="room-card__spec">🛏 ' + (room.bed_type || 'King Bed') + '</span>' +
            '<span class="room-card__spec">📐 ' + (room.size_sqm || '—') + 'm²</span>' +
            '<span class="room-card__spec">👤 최대 ' + (room.max_occupancy || room.max_adults || 2) + '인</span>' +
          '</div>' +
          '<div class="room-card__amenities">' +
            amenities.map(function(a) { return '<span class="room-card__amenity">' + a + '</span>'; }).join('') +
          '</div>' +
          '<div class="room-card__footer">' +
            '<div>' +
              '<div class="room-card__price-label">Per Night</div>' +
              '<div class="room-card__price">' + fmt(Number(room.price_per_night)) + '<span class="room-card__price-unit"> /박</span></div>' +
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
      var priceStr;
      if (pkg.id === 'none') {
        priceStr = '기본 요금';
      } else if (pkg.discount_type === 'percent' && Number(pkg.discount_value) > 0) {
        priceStr = Number(pkg.discount_value) + '% 할인';
      } else if (Number(pkg.add_price) > 0) {
        priceStr = '+' + fmt(Number(pkg.add_price)) + '/박';
      } else {
        priceStr = '기본 요금';
      }
      div.innerHTML =
        '<div class="package-card__check"></div>' +
        '<span class="package-card__icon">' + (pkg.icon || '—') + '</span>' +
        '<div class="package-card__name">' + pkg.name_ko + '</div>' +
        '<div class="package-card__desc">' + (pkg.description_ko || '') + '</div>' +
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
          '<div class="service-item__name">' + svc.name_ko + '</div>' +
          '<div class="service-item__desc">' + (svc.description || '') + '</div>' +
        '</div>' +
        '<div class="service-item__price">' + fmt(Number(svc.price)) + '</div>';
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
    var baseRoom = Number(room.price_per_night) * nights * rooms;

    var pkg = PACKAGES.find(function(p) { return p.id === state.selectedPackage; });
    var pkgDiscount = 0, pkgAdd = 0;
    if (pkg && pkg.id !== 'none') {
      if (pkg.discount_type === 'percent') pkgDiscount = Math.round(baseRoom * Number(pkg.discount_value) / 100);
      if (Number(pkg.add_price) > 0)      pkgAdd = Number(pkg.add_price) * nights * rooms;
    }

    var svcTotal = 0;
    SERVICES.forEach(function(s) { if (state.services[s.id]) svcTotal += Number(s.price); });

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
    if (el('priceRoom')) el('priceRoom').textContent = room ? room.name_ko : '';
    if (el('priceDates')) el('priceDates').textContent = fmtDate(state.checkin) + ' → ' + fmtDate(state.checkout);

    var baseLabel = (room ? room.name_ko : '') + ' × ' + p.nights + '박' + (p.rooms > 1 ? ' × ' + p.rooms + '실' : '');
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

  // Coupon apply (Supabase DB 검증)
  var couponApplyBtn = document.getElementById('couponApply');
  if (couponApplyBtn) {
    couponApplyBtn.addEventListener('click', async function() {
      var input  = document.getElementById('couponInput');
      var result = document.getElementById('couponResult');
      if (!input || !result) return;
      var code = input.value.trim().toUpperCase();
      result.className = 'coupon-result';

      if (!code) { result.textContent = '쿠폰 코드를 입력해주세요.'; result.classList.add('is-invalid'); return; }

      /* Supabase에서 쿠폰 검증 */
      if (window.SGH && window.SGH.supabase) {
        result.textContent = '확인 중...';
        var today = new Date().toISOString().slice(0, 10);
        var res = await window.SGH.supabase.from('coupons').select('*')
          .eq('code', code).eq('is_active', true).single();
        var cp = res.data;
        if (!cp) {
          state.couponCode = ''; state.couponDiscount = 0;
          result.textContent = '유효하지 않은 쿠폰 코드입니다.'; result.classList.add('is-invalid');
        } else if (cp.valid_until && cp.valid_until < today) {
          state.couponCode = ''; state.couponDiscount = 0;
          result.textContent = '만료된 쿠폰입니다.'; result.classList.add('is-invalid');
        } else if (cp.max_uses && cp.used_count >= cp.max_uses) {
          state.couponCode = ''; state.couponDiscount = 0;
          result.textContent = '사용 가능 횟수를 초과한 쿠폰입니다.'; result.classList.add('is-invalid');
        } else {
          /* 쿠폰 캐싱 및 적용 */
          state.couponCode = code;
          var p = calcPrice();
          var sub = p ? (p.baseRoom - p.pkgDiscount + p.pkgAdd + p.svcTotal) : 0;
          var minAmt = Number(cp.min_amount) || 0;
          if (sub < minAmt) {
            state.couponCode = ''; state.couponDiscount = 0;
            result.textContent = '최소 주문 금액(' + fmt(minAmt) + ') 미충족입니다.'; result.classList.add('is-invalid');
          } else {
            var disc = cp.discount_type === 'percent'
              ? Math.round(sub * Number(cp.discount_value) / 100)
              : Number(cp.discount_value);
            if (cp.max_discount) disc = Math.min(disc, Number(cp.max_discount));
            state.couponDiscount = disc;
            VALID_COUPONS[code] = { type: cp.discount_type === 'percent' ? 'pct' : 'amt', value: Number(cp.discount_value), label: cp.name_ko };
            result.textContent = '✓ ' + cp.name_ko + ' 적용 (−' + fmt(disc) + ')'; result.classList.add('is-valid');
          }
        }
      } else {
        /* Fallback: 하드코딩 쿠폰 */
        var cpFb = VALID_COUPONS[code];
        if (cpFb) {
          state.couponCode = code;
          result.textContent = '✓ ' + cpFb.label + ' 적용되었습니다.'; result.classList.add('is-valid');
        } else {
          state.couponCode = ''; state.couponDiscount = 0;
          result.textContent = '유효하지 않은 쿠폰 코드입니다.'; result.classList.add('is-invalid');
        }
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
        room:         room ? { id: room.id, name: room.name_ko, price: room.price_per_night } : null,
        package:      state.selectedPackage,
        services:     Object.keys(state.services).filter(function(k) { return state.services[k]; }),
        requests:     state.requests,
        couponCode:   state.couponCode,
        guestInfo:    state.guestInfo,
        paymentMethod: state.paymentMethod,
        price:        p,
      };
      sessionStorage.setItem('rsvComplete', JSON.stringify(reservation));

      /* Supabase 저장 (fire-and-forget — 실패해도 리다이렉트 진행) */
      if (window.SGH && window.SGH.reservation) {
        var payload = {
          roomId:         state.selectedRoom,
          checkin:        state.checkin,
          checkout:       state.checkout,
          nights:         state.nights,
          rooms:          state.rooms,
          adults:         state.adults,
          children:       state.children,
          packageId:      state.selectedPackage,
          services:       Object.keys(state.services).filter(function(k) { return state.services[k]; }),
          couponCode:     state.couponCode,
          guestInfo:      state.guestInfo,
          specialRequest: state.guestInfo.specialRequest,
          paymentMethod:  state.paymentMethod,
          price:          p,
        };
        window.SGH.reservation.create(payload).catch(function(err) {
          console.warn('[SGH] 예약 저장 실패 (로컬 완료 처리됨):', err);
        });
      }

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

  /* ---- DB 데이터 로드 ---- */
  async function loadDataFromDB() {
    if (!window.SGH || !window.SGH.supabase) {
      ROOMS    = FALLBACK_ROOMS;
      PACKAGES = FALLBACK_PACKAGES;
      SERVICES = FALLBACK_SERVICES;
      return;
    }
    try {
      var roomRes = await window.SGH.supabase.from('rooms').select('*').eq('is_active', true).order('sort_order');
      ROOMS = (roomRes.data && roomRes.data.length > 0) ? roomRes.data : FALLBACK_ROOMS;

      var pkgRes = await window.SGH.supabase.from('packages').select('*').eq('is_active', true).order('sort_order');
      PACKAGES = (pkgRes.data && pkgRes.data.length > 0) ? pkgRes.data : FALLBACK_PACKAGES;

      var svcRes = await window.SGH.supabase.from('services').select('*').eq('is_active', true).order('sort_order');
      SERVICES = (svcRes.data && svcRes.data.length > 0) ? svcRes.data : FALLBACK_SERVICES;
    } catch (e) {
      console.warn('[SGH] DB 로드 실패, fallback 사용:', e.message);
      ROOMS    = FALLBACK_ROOMS;
      PACKAGES = FALLBACK_PACKAGES;
      SERVICES = FALLBACK_SERVICES;
    }
  }

  /* ---- Init ---- */
  (async function init() {
    loadSession();
    renderSummary();
    await loadDataFromDB();
    renderRooms();
    renderPackages();
    renderServices();
    renderChips();
    updatePriceSidebar();

    /* 기본 패키지 선택 (DB의 첫 번째 — 보통 'No Package') */
    if (PACKAGES.length > 0 && !state.selectedPackage) {
      state.selectedPackage = PACKAGES[0].id;
    }

    /* 기본 결제 수단 */
    var defaultPay = document.querySelector('[data-pay="credit"]');
    if (defaultPay) defaultPay.classList.add('is-selected');
  })();

})();
