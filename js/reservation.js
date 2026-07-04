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
