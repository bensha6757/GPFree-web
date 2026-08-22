/* Pelora - simulated demo.
 *
 * SAFETY: this file makes no network requests and reaches no generation
 * endpoint. Every value below is a constant taken from approved materials
 * and replayed client side. Do not add fetch/XHR/WebSocket calls here.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================ the race */

  var race = document.getElementById('race');
  if (race) {
    var LANES = {
      pelora:       { seconds: 13,    cost: 0.003, dp: 3, el: {} },
      conventional: { seconds: 10800, cost: 98,    dp: 2, el: {} }
    };

    Object.keys(LANES).forEach(function (key) {
      var root = race.querySelector('[data-lane="' + key + '"]');
      if (!root) return;
      LANES[key].root = root;
      LANES[key].el.fill   = root.querySelector('.track-fill');
      LANES[key].el.time   = root.querySelector('[data-out="time"]');
      LANES[key].el.cost   = root.querySelector('[data-out="cost"]');
      LANES[key].el.pct    = root.querySelector('[data-out="pct"]');
      LANES[key].el.status = root.querySelector('.lane-status');
      LANES[key].el.label  = root.querySelector('.lane-status .label');
    });

    var startBtn  = document.getElementById('raceStart');
    var resetBtn  = document.getElementById('raceReset');
    var lapseBadge = document.getElementById('raceLapse');

    var running = false;
    var simSeconds = 0;
    var rate = 2;              // simulated seconds per real second
    var last = 0;
    var frame = null;
    var lapsed = false;

    function fmtClock(s) {
      if (s < 60) return s.toFixed(1) + 's';
      var h = Math.floor(s / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = Math.floor(s % 60);
      return h + 'h ' + String(m).padStart(2, '0') + 'm ' + String(sec).padStart(2, '0') + 's';
    }

    function fmtCost(c, dp) {
      return '$' + c.toFixed(dp);
    }

    function paint() {
      Object.keys(LANES).forEach(function (key) {
        var lane = LANES[key];
        if (!lane.root) return;
        var done = simSeconds >= lane.seconds;
        var t = done ? lane.seconds : simSeconds;
        var pct = (t / lane.seconds) * 100;

        lane.el.fill.style.width = pct.toFixed(2) + '%';
        lane.el.time.textContent = fmtClock(t);
        lane.el.cost.textContent = fmtCost((t / lane.seconds) * lane.cost, lane.dp);
        lane.el.pct.textContent  = pct.toFixed(pct < 1 ? 2 : 0) + '%';

        lane.el.status.classList.toggle('is-done', done);
        lane.el.status.classList.toggle('is-running', !done);
        lane.el.label.textContent = done
          ? (key === 'pelora' ? 'Expert generated and verified' : 'Fine-tuning run complete')
          : (key === 'pelora' ? 'Generating expert' : 'Fine-tuning');
      });
    }

    function step(now) {
      if (!running) return;
      if (!last) last = now;
      // Clamp the step so a backgrounded tab does not resume with a huge
      // delta and skip the whole animation.
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      simSeconds += dt * rate;

      // Once Pelora is done, time-lapse the conventional lane so the
      // comparison actually resolves on screen.
      if (!lapsed && simSeconds >= LANES.pelora.seconds + 4) {
        lapsed = true;
        rate = 900;
        if (lapseBadge) lapseBadge.hidden = false;
      }

      if (simSeconds >= LANES.conventional.seconds) {
        simSeconds = LANES.conventional.seconds;
        running = false;
        startBtn.disabled = true;
        startBtn.textContent = 'Run complete';
      }

      paint();
      if (running) frame = requestAnimationFrame(step);
    }

    function start() {
      if (running) return;
      running = true;
      last = 0;
      startBtn.textContent = 'Running';
      startBtn.disabled = true;
      resetBtn.hidden = false;
      frame = requestAnimationFrame(step);
    }

    function reset() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      simSeconds = 0;
      rate = 2;
      lapsed = false;
      last = 0;
      if (lapseBadge) lapseBadge.hidden = true;
      startBtn.disabled = false;
      startBtn.textContent = 'Start the run';
      resetBtn.hidden = true;
      paint();
    }

    if (startBtn) startBtn.addEventListener('click', start);
    if (resetBtn) resetBtn.addEventListener('click', reset);

    // With reduced motion, show the finished state instead of animating.
    if (reduceMotion) {
      simSeconds = LANES.conventional.seconds;
      paint();
      if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'Result shown'; }
    } else {
      paint();

      // Run it the moment the reader reaches the section, so the comparison
      // has played out by the time they have finished reading the heading.
      // Observer first, with a scroll fallback for browsers that throttle it.
      var armed = true;
      var observer = null;

      var maybeStart = function () {
        if (!armed) return;
        var box = race.getBoundingClientRect();
        if (box.top > window.innerHeight * 0.7 || box.bottom < 0) return;
        armed = false;
        window.removeEventListener('scroll', maybeStart);
        if (observer) observer.disconnect();
        start();
      };

      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) maybeStart();
          });
        }, { threshold: 0.3 });
        observer.observe(race);
      }
      window.addEventListener('scroll', maybeStart, { passive: true });
      maybeStart();
    }
  }

  /* ========================================================== the drift */

  var drift = document.getElementById('drift');
  if (drift) {
    var newChip  = drift.querySelector('[data-chip="new"]');
    var tile     = drift.querySelector('.expert-tile');
    var version  = drift.querySelector('[data-out="version"]');
    var built    = drift.querySelector('[data-out="built"]');
    var state    = drift.querySelector('[data-out="state"]');
    var driftBtn = document.getElementById('driftStart');

    var v = 4;
    var busy = false;

    function setStage(stage) {
      tile.classList.toggle('is-stale', stage === 'stale');
      tile.classList.toggle('is-fresh', stage === 'fresh');
      if (newChip) newChip.classList.toggle('is-new', stage !== 'idle');
    }

    function regenerate() {
      if (busy) return;
      busy = true;
      driftBtn.disabled = true;

      // 1. new data lands, the expert goes stale
      setStage('stale');
      state.textContent = 'Data drifted';
      built.textContent = 'built on last month data';

      // 2. regeneration, then verification
      setTimeout(function () {
        state.textContent = 'Regenerating';
        built.textContent = 'one forward pass';
      }, 900);

      setTimeout(function () {
        state.textContent = 'Validating';
      }, 2100);

      // 3. fresh expert
      setTimeout(function () {
        v++;
        version.textContent = 'v' + v;
        state.textContent = 'Verified and live';
        built.textContent = 'rebuilt in about 13 seconds';
        setStage('fresh');
        busy = false;
        driftBtn.disabled = false;
        driftBtn.textContent = 'Drift the data again';
      }, 3100);
    }

    if (driftBtn) driftBtn.addEventListener('click', regenerate);

    if (reduceMotion) {
      setStage('fresh');
      version.textContent = 'v5';
      state.textContent = 'Verified and live';
      built.textContent = 'rebuilt in about 13 seconds';
      if (driftBtn) { driftBtn.disabled = true; driftBtn.textContent = 'Result shown'; }
    }
  }
})();
