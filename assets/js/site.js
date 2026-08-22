/* Pelora - site behaviour. No network calls anywhere in this file. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- nav --- */

  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');

  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.querySelectorAll('.nav-links a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* --------------------------------------------------------- reveals --- */

  var revealables = document.querySelectorAll('[data-reveal]');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach(function (el) {
      var delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
      io.observe(el);
    });
  }

  /* --------------------------------------------------------- cycler --- */

  var slot = document.querySelector('[data-cycler]');
  if (slot) {
    var words = Array.prototype.slice.call(slot.querySelectorAll('.cycler-word'));
    if (words.length) {
      words[0].classList.add('is-in');
      // Reserve width so the line never reflows as words swap. On narrow
      // screens the line wraps anyway, so reserving would just add a gap.
      var reserve = function () {
        var widest = words.reduce(function (max, w) {
          return Math.max(max, w.scrollWidth);
        }, 0);
        slot.style.minWidth = (window.innerWidth >= 720 && widest)
          ? Math.ceil(widest) + 'px'
          : '';
      };
      reserve();
      window.addEventListener('resize', reserve);

      if (!reduceMotion && words.length > 1) {
        var i = 0;
        setInterval(function () {
          var current = words[i];
          i = (i + 1) % words.length;
          var next = words[i];
          current.classList.remove('is-in');
          current.classList.add('is-out');
          next.classList.remove('is-out');
          // next frame so the transition runs from its start state
          requestAnimationFrame(function () { next.classList.add('is-in'); });
        }, 2600);
      }
    }
  }

  /* ----------------------------------------------------- hero canvas --- */
  /* A field of weights. Regions periodically resolve into a coherent
     expert, hold, and dissolve back. Purely decorative. */

  var canvas = document.getElementById('heroCanvas');
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cells = [];
    var blooms = [];
    var GAP = 26;
    var cols = 0, rows = 0;
    var raf = null;

    function build() {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      cells = [];
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          cells.push({
            x: x, y: y,
            px: x * GAP, py: y * GAP,
            // idle jitter so the field feels alive, not printed
            phase: Math.random() * Math.PI * 2,
            base: 0.10 + Math.random() * 0.14
          });
        }
      }
      blooms = [];
    }

    function spawnBloom() {
      var bw = 3 + Math.floor(Math.random() * 4);
      var bh = 2 + Math.floor(Math.random() * 3);
      blooms.push({
        x0: Math.floor(Math.random() * Math.max(1, cols - bw)),
        y0: Math.floor(Math.random() * Math.max(1, rows - bh)),
        w: bw, h: bh,
        t: 0,
        life: 260 + Math.random() * 120
      });
      if (blooms.length > 5) blooms.shift();
    }

    var tick = 0;
    function frame() {
      tick++;
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (tick % 55 === 0) spawnBloom();

      blooms.forEach(function (b) { b.t++; });
      blooms = blooms.filter(function (b) { return b.t < b.life; });

      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var a = c.base + Math.sin(tick * 0.012 + c.phase) * 0.05;
        var size = 1.6;
        var lav = 0;

        for (var j = 0; j < blooms.length; j++) {
          var b = blooms[j];
          if (c.x < b.x0 || c.x >= b.x0 + b.w || c.y < b.y0 || c.y >= b.y0 + b.h) continue;
          // ramp up, hold, ramp down
          var p = b.t / b.life;
          var strength = p < 0.22 ? p / 0.22 : (p > 0.72 ? (1 - p) / 0.28 : 1);
          strength = Math.max(0, Math.min(1, strength));
          a += strength * 0.72;
          size += strength * 1.5;
          lav = Math.max(lav, strength);
        }

        if (a <= 0.02) continue;
        ctx.fillStyle = lav > 0.02
          ? 'rgba(213, 211, 227, ' + Math.min(a, 0.95) + ')'
          : 'rgba(234, 228, 218, ' + Math.min(a, 0.95) + ')';
        ctx.fillRect(c.px, c.py, size, size);
      }

      raf = requestAnimationFrame(frame);
    }

    build();
    frame();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    });

    // Stop drawing when the hero is off screen or the tab is hidden.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      } else if (!raf) {
        frame();
      }
    });
  }

  /* ----------------------------------------------------- current year --- */
  var yearEl = document.querySelectorAll('[data-year]');
  yearEl.forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
