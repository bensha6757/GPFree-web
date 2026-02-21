(() => {
  'use strict';

  // ========================================
  // Scroll Reveal (IntersectionObserver)
  // ========================================

  const revealElements = document.querySelectorAll('[data-reveal]');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.revealDelay || '0', 10);
          setTimeout(() => el.classList.add('revealed'), delay);
          revealObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // ========================================
  // Navbar scroll state & active section
  // ========================================

  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  function updateNavbar() {
    // Scrolled state
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active section
    const scrollPos = window.scrollY + window.innerHeight / 3;
    let currentId = '';

    sections.forEach((section) => {
      if (section.offsetTop <= scrollPos) {
        currentId = section.id;
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute('href').substring(1);
      if (href === currentId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ========================================
  // Hero parallax fade
  // ========================================

  const heroContent = document.getElementById('heroContent');

  function updateHeroParallax() {
    if (!heroContent) return;
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    if (scrollY < heroHeight) {
      const progress = scrollY / heroHeight;
      heroContent.style.opacity = 1 - progress * 1.3;
      heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
    }
  }

  // ========================================
  // Founder image parallax
  // ========================================

  const parallaxImages = document.querySelectorAll('[data-parallax]');

  function updateFounderParallax() {
    parallaxImages.forEach((img) => {
      const rect = img.getBoundingClientRect();
      const viewH = window.innerHeight;
      if (rect.top < viewH && rect.bottom > 0) {
        const center = rect.top + rect.height / 2;
        const offset = ((center - viewH / 2) / viewH) * -20;
        img.style.transform = `translateY(${offset}px)`;
      }
    });
  }

  // ========================================
  // Stat counter animation
  // ========================================

  const counters = document.querySelectorAll('[data-count]');
  const countedSet = new Set();

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !countedSet.has(entry.target)) {
          countedSet.add(entry.target);
          animateCounter(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => counterObserver.observe(el));

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  // ========================================
  // Smooth scroll for nav links
  // ========================================

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }

      // Close mobile menu
      const navLinksEl = document.getElementById('navLinks');
      const navToggle = document.getElementById('navToggle');
      navLinksEl.classList.remove('open');
      navToggle.classList.remove('open');
    });
  });

  // ========================================
  // Mobile nav toggle
  // ========================================

  const navToggle = document.getElementById('navToggle');
  const navLinksEl = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navLinksEl.classList.toggle('open');
  });

  // ========================================
  // Scroll handler (rAF throttled)
  // ========================================

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateNavbar();
        updateHeroParallax();
        updateFounderParallax();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Initial call
  updateNavbar();
})();
