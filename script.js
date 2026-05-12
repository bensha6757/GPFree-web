(() => {
  'use strict';

  // =====================================================================
  // Scroll reveal — IntersectionObserver
  // =====================================================================
  const revealEls = document.querySelectorAll('[data-reveal]');

  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseInt(el.dataset.revealDelay || '0', 10);
        setTimeout(() => el.classList.add('revealed'), delay);
        revealObs.unobserve(el);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  revealEls.forEach((el) => revealObs.observe(el));

  // =====================================================================
  // Navbar — scroll state + active-section highlight
  // =====================================================================
  const navbar   = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link:not(.nav-cta)');
  const sections = document.querySelectorAll('section[id]');

  function updateNavbar() {
    navbar.classList.toggle('scrolled', window.scrollY > 40);

    const scrollMid = window.scrollY + window.innerHeight * 0.35;
    let activeId = '';

    sections.forEach((sec) => {
      if (sec.offsetTop <= scrollMid) activeId = sec.id;
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      link.classList.toggle('active', href.substring(1) === activeId);
    });
  }

  // =====================================================================
  // Hero content — parallax fade on scroll
  // =====================================================================
  const heroContent = document.getElementById('heroContent');

  function updateHeroParallax() {
    if (!heroContent) return;
    const scrollY = window.scrollY;
    const vp = window.innerHeight;
    if (scrollY >= vp) return;
    const t = scrollY / vp;
    heroContent.style.opacity   = String(1 - t * 1.4);
    heroContent.style.transform = `translateY(${scrollY * 0.22}px)`;
  }

  // =====================================================================
  // Stat counter animation
  // =====================================================================
  const counters = document.querySelectorAll('[data-count]');
  const counted  = new Set();

  const counterObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !counted.has(entry.target)) {
          counted.add(entry.target);
          animateCounter(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => counterObs.observe(el));

  function animateCounter(el) {
    const target   = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const startTs  = performance.now();

    function tick(now) {
      const elapsed  = now - startTs;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // =====================================================================
  // Spotlight — mouse-follow radial glow on .spotlight-card
  // =====================================================================
  document.querySelectorAll('.spotlight-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    });
  });

  // =====================================================================
  // Smooth scroll for every anchor that points to an id on this page
  // =====================================================================
  const navToggle  = document.getElementById('navToggle');
  const navLinksEl = document.getElementById('navLinks');

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id     = link.getAttribute('href').substring(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });

      // close mobile menu if open
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navLinksEl.classList.remove('open');
    });
  });

  // =====================================================================
  // Mobile nav toggle
  // =====================================================================
  navToggle.addEventListener('click', () => {
    const isOpen = navLinksEl.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // =====================================================================
  // RAF-throttled scroll handler
  // =====================================================================
  let rafPending = false;

  window.addEventListener('scroll', () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      updateNavbar();
      updateHeroParallax();
      rafPending = false;
    });
  }, { passive: true });

  // initial state
  updateNavbar();
})();
