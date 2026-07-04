/* =============================================
   GUEST & ROOMS PICKER
   ============================================= */

(function () {
  'use strict';

  class GuestPicker {
    constructor() {
      this.qrContainer = document.getElementById('quickReservation');
      this.trigger     = document.getElementById('guestPickerTrigger');
      this.popup       = document.getElementById('guestPickerPopup');
      this.summary     = document.getElementById('guestPickerSummary');
      this.applyBtn    = document.getElementById('guestPickerApply');

      this.inputs = {
        rooms:    document.getElementById('hiddenRooms'),
        adults:   document.getElementById('hiddenAdults'),
        children: document.getElementById('hiddenChildren'),
      };

      if (!this.trigger || !this.popup) return;

      this.isOpen    = false;
      this.state     = { rooms: 1, adults: 2, children: 0 };
      this.committed = { ...this.state };

      this._pressTimer    = null;
      this._pressInterval = null;

      this._init();
    }

    _init() {
      this._syncCounters();
      this._updateButtonStates();
      this._updateSummary();
      this._updateHiddenInputs();
      this._bindEvents();
    }

    /* ---- Events ---- */

    _bindEvents() {
      this.trigger.addEventListener('click', () => this.toggle());

      // Counter buttons — event delegation
      this.popup.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.guest-picker__button');
        if (!btn || btn.disabled) return;
        e.preventDefault();
        const type  = btn.dataset.type;
        const delta = btn.classList.contains('guest-picker__button--inc') ? 1 : -1;
        this._step(type, delta);
        this._startLongPress(type, delta, btn);
      });

      document.addEventListener('pointerup',     () => this._stopLongPress());
      document.addEventListener('pointercancel', () => this._stopLongPress());

      this.applyBtn.addEventListener('click', () => this.apply());

      // Outside click
      document.addEventListener('pointerdown', (e) => {
        if (!this.isOpen) return;
        if (!this.popup.contains(e.target) && !this.trigger.contains(e.target)) {
          this.close();
        }
      });

      // Keyboard
      document.addEventListener('keydown', (e) => {
        if (!this.isOpen) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
          this.trigger.focus();
        }
      });

      // Focus trap
      this.popup.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') this._trapFocus(e);
      });

      // Reposition on resize
      window.addEventListener('resize', () => {
        if (this.isOpen) this._positionPopup();
      }, { passive: true });
    }

    /* ---- Counter logic ---- */

    _step(type, delta) {
      const min  = type === 'children' ? 0 : 1;
      const max  = type === 'rooms'    ? 10 : Infinity;
      const next = Math.max(min, Math.min(max, this.state[type] + delta));
      if (next === this.state[type]) return;
      this.state[type] = next;
      this._updateCounterEl(type);
      this._updateButtonStates();
    }

    _startLongPress(type, delta, btn) {
      this._pressTimer = setTimeout(() => {
        this._pressInterval = setInterval(() => {
          if (btn.disabled) { this._stopLongPress(); return; }
          this._step(type, delta);
        }, 80);
      }, 500);
    }

    _stopLongPress() {
      clearTimeout(this._pressTimer);
      clearInterval(this._pressInterval);
      this._pressTimer    = null;
      this._pressInterval = null;
    }

    _updateCounterEl(type) {
      const el = this.popup.querySelector('[data-counter="' + type + '"]');
      if (el) el.textContent = this.state[type];
    }

    _syncCounters() {
      ['rooms', 'adults', 'children'].forEach((t) => this._updateCounterEl(t));
    }

    _updateButtonStates() {
      var cfg = {
        rooms:    { min: 1, max: 10 },
        adults:   { min: 1, max: Infinity },
        children: { min: 0, max: Infinity },
      };
      Object.keys(cfg).forEach((type) => {
        var min = cfg[type].min;
        var max = cfg[type].max;
        var dec = this.popup.querySelector('.guest-picker__button--dec[data-type="' + type + '"]');
        var inc = this.popup.querySelector('.guest-picker__button--inc[data-type="' + type + '"]');
        if (dec) dec.disabled = this.state[type] <= min;
        if (inc && max !== Infinity) inc.disabled = this.state[type] >= max;
      });
    }

    /* ---- Summary & hidden inputs ---- */

    _updateSummary() {
      var s = this.committed;
      var roomWord = s.rooms === 1 ? 'Room' : 'Rooms';
      this.summary.textContent =
        'Adult ' + s.adults + ' · Children ' + s.children + ' · ' + roomWord + ' ' + s.rooms;
    }

    _updateHiddenInputs() {
      Object.keys(this.inputs).forEach((key) => {
        if (this.inputs[key]) this.inputs[key].value = this.committed[key];
      });
    }

    /* ---- Positioning ---- */

    _positionPopup() {
      var triggerRect = this.trigger.getBoundingClientRect();
      var qrRect      = this.qrContainer.getBoundingClientRect();
      var popupWidth  = this.popup.offsetWidth || 280;

      // Appear above the Quick Reservation bar
      var bottom = window.innerHeight - qrRect.top + 12;

      // Left-align to trigger, clamped inside viewport
      var left = Math.max(8, Math.min(
        triggerRect.left,
        window.innerWidth - popupWidth - 8
      ));

      this.popup.style.bottom = bottom + 'px';
      this.popup.style.left   = left + 'px';
    }

    /* ---- Open / Close ---- */

    toggle() { this.isOpen ? this.close() : this.open(); }

    open() {
      if (this.isOpen) return;

      // Reset working state to last committed values
      this.state = { ...this.committed };
      this._syncCounters();
      this._updateButtonStates();

      this.isOpen = true;
      this.popup.removeAttribute('hidden');
      this._positionPopup();

      // Double RAF ensures display kicks in before CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.popup.classList.add('is-open');
        });
      });

      this.trigger.setAttribute('aria-expanded', 'true');

      // Move focus into popup
      setTimeout(() => {
        var first = this.popup.querySelector('button:not(:disabled)');
        if (first) first.focus();
      }, 50);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.popup.classList.remove('is-open');
      this.trigger.setAttribute('aria-expanded', 'false');

      var self = this;
      var onEnd = function () {
        if (!self.isOpen) self.popup.setAttribute('hidden', '');
      };
      this.popup.addEventListener('transitionend', onEnd, { once: true });
      setTimeout(onEnd, 350); // fallback if transitionend doesn't fire
    }

    apply() {
      this.committed = { ...this.state };
      this._updateSummary();
      this._updateHiddenInputs();
      this.close();
      this.trigger.focus();
    }

    /* ---- Accessibility ---- */

    _trapFocus(e) {
      var focusables = Array.from(this.popup.querySelectorAll('button:not(:disabled)'));
      if (!focusables.length) return;
      var first = focusables[0];
      var last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ---- Initialize ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { new GuestPicker(); });
  } else {
    new GuestPicker();
  }

})();

/* =============================================
   RESERVATION MODULE — window.SGH.reservation
   예약 생성 · 조회 · 취소 (Supabase 연동)
   ============================================= */

(function () {
  'use strict';

  window.SGH = window.SGH || {};

  window.SGH.reservation = {

    /* ──────────────────────────────────────────
       예약 생성 — reservations → reservation_guests → reservation_rooms 순서로 INSERT
    ────────────────────────────────────────── */
    create: async function (payload) {
      var sb = window.SGH.supabase;
      var userRes = await sb.auth.getUser();
      var userId = userRes.data && userRes.data.user ? userRes.data.user.id : null;
      var price = payload.price || {};

      /* 1. reservations 메인 레코드 */
      var rsvRes = await sb.from('reservations').insert([{
        user_id:         userId,
        check_in:        payload.checkin,
        check_out:       payload.checkout,
        nights:          payload.nights,
        num_rooms:       payload.rooms    || 1,
        num_adults:      payload.adults   || 2,
        num_children:    payload.children || 0,
        coupon_code:     payload.couponCode || null,
        promotion_id:    payload.promotionId || null,
        special_request: payload.specialRequest || null,
        price_base:      price.baseRoom   || 0,
        price_discount:  (price.pkgDiscount || 0) + (price.coupon || 0),
        price_extra:     (price.pkgAdd || 0) + (price.svcTotal || 0),
        price_tax:       price.tax        || 0,
        price_total:     price.total      || 0,
        status:          'confirmed',
      }]).select('id, reservation_no').single();

      if (rsvRes.error) return rsvRes;
      var rsvId = rsvRes.data.id;

      /* 2. reservation_guests */
      if (payload.guestInfo) {
        var g = payload.guestInfo;
        await sb.from('reservation_guests').insert([{
          reservation_id: rsvId,
          name_ko:        g.nameKo   || null,
          name_en:        g.nameEn   || null,
          email:          g.email    || null,
          phone:          g.phone    || null,
          nationality:    g.country  || null,
          is_primary:     true,
        }]);
      }

      /* 3. reservation_rooms */
      var roomIds = Array.isArray(payload.roomIds) ? payload.roomIds : (payload.roomId ? [payload.roomId] : []);
      if (roomIds.length > 0) {
        var roomRows = roomIds.map(function (rid) {
          return {
            reservation_id: rsvId,
            room_id:        rid,
            price_per_night: payload.pricePerNight || price.baseRoom || 0,
          };
        });
        await sb.from('reservation_rooms').insert(roomRows);
      }

      return { data: rsvRes.data, error: null };
    },

    /* 현재 사용자의 예약 목록 조회 */
    getByUser: async function () {
      var userRes = await window.SGH.supabase.auth.getUser();
      if (userRes.error || !userRes.data.user) {
        return { data: null, error: new Error('로그인이 필요합니다.') };
      }
      return window.SGH.supabase
        .from('reservations')
        .select('*, reservation_guests(*), reservation_rooms(*, rooms(name_ko, name_en, bed_type, room_images(url, is_main)))')
        .eq('user_id', userRes.data.user.id)
        .order('created_at', { ascending: false });
    },

    /* 예약 단건 조회 */
    getById: async function (reservationId) {
      return window.SGH.supabase
        .from('reservations')
        .select('*, reservation_guests(*), reservation_rooms(*, rooms(*))')
        .eq('id', reservationId)
        .single();
    },

    /* 예약 취소 (pending/confirmed 상태만) */
    cancel: async function (reservationId) {
      return window.SGH.supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId)
        .in('status', ['pending', 'confirmed'])
        .select()
        .single();
    },
  };

})();

