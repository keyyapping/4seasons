/* ============================================================
   SORA SERVER — MAIN APP JAVASCRIPT
   ============================================================ */

'use strict';

/* ── CONSTANTS ── */
const SERVER_IP = 'play.soraserver.id';
const TOAST_DURATION = 4000;

/* ============================================================
   PAGE LOADER
   ============================================================ */
window.addEventListener('load', () => {
  const loader = document.getElementById('pageLoader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
      setTimeout(() => loader.remove(), 500);
    }, 800);
  }
});

/* ============================================================
   NAVBAR
   ============================================================ */
const initNavbar = () => {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!navbar) return;

  // Scroll behavior
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    navbar.classList.toggle('scrolled', scrollY > 50);
    lastScroll = scrollY;
  }, { passive: true });

  // Hamburger
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Active nav link based on current page
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  navbar.querySelectorAll('a[href]').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

  // Update auth state in navbar
  updateNavbarAuth();
};

/* ============================================================
   AUTH STATE — Navbar update
   ============================================================ */
async function updateNavbarAuth() {
  try {
    const user = await getCurrentUser();
    const navActions = document.getElementById('navAuthBtns') || document.querySelector('.navbar-actions');
    if (!navActions) return;

    if (user) {
      const profile = await getProfile(user.id).catch(() => null);
      const name = profile?.username || 'Player';
      navActions.innerHTML = `
        <div class="dropdown">
          <button class="btn btn-ghost btn-sm dropdown-trigger">
            <i class="fa-solid fa-user-circle"></i> ${name}
            <i class="fa-solid fa-chevron-down" style="font-size:0.7rem;margin-left:0.25rem;"></i>
          </button>
          <div class="dropdown-menu">
            <a href="dashboard.html" class="dropdown-item">
              <i class="fa-solid fa-gauge dropdown-item-icon"></i> Dashboard
            </a>
            <a href="survival.html" class="dropdown-item">
              <i class="fa-solid fa-tree dropdown-item-icon"></i> Survival Rank
            </a>
            <a href="soracitu.html" class="dropdown-item">
              <i class="fa-solid fa-city dropdown-item-icon"></i> Sora City Rank
            </a>
            <a href="report.html" class="dropdown-item">
              <i class="fa-solid fa-flag dropdown-item-icon"></i> Lapor Player
            </a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item danger" onclick="handleSignOut()">
              <i class="fa-solid fa-right-from-bracket dropdown-item-icon"></i> Logout
            </button>
          </div>
        </div>
      `;
    }
  } catch (e) {
    // Not logged in, keep default buttons
  }
}

async function handleSignOut() {
  try {
    await signOut();
  } catch (e) {
    console.error('Signout error:', e);
    window.location.href = 'index.html';
  }
}

/* ============================================================
   ANNOUNCEMENT BAR
   ============================================================ */
const initAnnouncementBar = () => {
  const bar = document.getElementById('announcementBar');
  const closeBtn = document.getElementById('closeAnnouncement');
  if (!bar || !closeBtn) return;

  // Check if was dismissed
  if (sessionStorage.getItem('announcementDismissed')) {
    bar.style.display = 'none';
    return;
  }

  closeBtn.addEventListener('click', () => {
    bar.style.height = bar.offsetHeight + 'px';
    bar.style.overflow = 'hidden';
    bar.style.transition = 'height 0.3s ease, opacity 0.3s ease';
    requestAnimationFrame(() => {
      bar.style.height = '0';
      bar.style.opacity = '0';
    });
    setTimeout(() => bar.remove(), 350);
    sessionStorage.setItem('announcementDismissed', '1');
  });
};

/* ============================================================
   SCROLL REVEAL ANIMATION
   ============================================================ */
const initReveal = () => {
  const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.10,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
};

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
const initCounters = () => {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
};

function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const isDecimal = String(target).includes('.');
  const duration = 2000;
  const steps = 60;
  const stepDuration = duration / steps;
  let current = 0;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    current = target * (step / steps);

    if (step >= steps) {
      current = target;
      clearInterval(timer);
    }

    el.textContent = isDecimal
      ? current.toFixed(1)
      : Math.floor(current).toLocaleString('id-ID');
  }, stepDuration);
}

/* ============================================================
   PARTICLE CANVAS
   ============================================================ */
const initParticles = () => {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });

  const colors = ['rgba(108,99,255,', 'rgba(74,222,128,', 'rgba(96,165,250,'];

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = -Math.random() * 0.6 - 0.2;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.life = 0;
      this.maxLife = Math.random() * 200 + 100;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.life++;
      if (this.life > this.maxLife || this.y < -10) this.reset();
    }
    draw() {
      const alpha = this.opacity * (1 - this.life / this.maxLife);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color + alpha + ')';
      ctx.fill();
    }
  }

  // Create particles
  for (let i = 0; i < 80; i++) {
    const p = new Particle();
    p.life = Math.floor(Math.random() * p.maxLife); // stagger
    particles.push(p);
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    animId = requestAnimationFrame(animate);
  };

  animate();

  // Stop particles when page is hidden (battery saving)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animate();
    }
  });
};

/* ============================================================
   IP COPY
   ============================================================ */
const initIpCopy = () => {
  // Hero IP copy
  const copyBtn = document.getElementById('copyIpBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(SERVER_IP);
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
        copyBtn.classList.add('copied');
        showToast('IP server tersalin ke clipboard!', 'success');
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
          copyBtn.classList.remove('copied');
        }, 2500);
      } catch (e) {
        showToast('Gagal menyalin IP', 'error');
      }
    });
  }

  // Footer IP copy
  const footerCopyBtn = document.getElementById('footerCopyIpBtn');
  if (footerCopyBtn) {
    footerCopyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(SERVER_IP);
        showToast('IP server tersalin!', 'success');
      } catch (e) {
        showToast('Gagal menyalin IP', 'error');
      }
    });
  }
};

/* ============================================================
   BACK TO TOP
   ============================================================ */
const initBackToTop = () => {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
};

/* ============================================================
   SMOOTH SCROLL for anchor links
   ============================================================ */
const initSmoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 72;
        const top = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
};

/* ============================================================
   TOAST NOTIFICATION SYSTEM
   ============================================================ */
function showToast(message, type = 'info', duration = TOAST_DURATION) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error:   '<i class="fa-solid fa-circle-xmark"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
    info:    '<i class="fa-solid fa-circle-info"></i>',
  };

  const titles = {
    success: 'Berhasil',
    error:   'Error',
    warning: 'Peringatan',
    info:    'Info',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-body">
      <div class="toast-title">${titles[type] || 'Info'}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Tutup">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="toast-progress"></div>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  // Auto dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;

  return toast;
}

function dismissToast(toast) {
  if (toast._timer) clearTimeout(toast._timer);
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 350);
}

/* ============================================================
   LOADING STATE for buttons
   ============================================================ */
function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner spinner-sm"></span> Memproses...`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
    btn.disabled = false;
  }
}

/* ============================================================
   FORMAT CURRENCY
   ============================================================ */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ============================================================
   HERO ONLINE PLAYER COUNT (from Supabase)
   ============================================================ */
async function loadHeroOnlinePlayers() {
  const el = document.getElementById('heroOnlineCount');
  if (!el) return;

  try {
    const { data } = await supabaseClient
      .from('server_stats')
      .select('online_players');

    if (data && data.length) {
      const total = data.reduce((sum, s) => sum + (s.online_players || 0), 0);
      el.textContent = total;
    }
  } catch (e) {
    el.textContent = '—';
  }
}

/* ============================================================
   ACTIVE LINK highlight based on section scroll (Index page)
   ============================================================ */
const initScrollSpy = () => {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navbar-links a[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => link.classList.remove('active'));
        const active = document.querySelector(`.navbar-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(s => observer.observe(s));
};

/* ============================================================
   KEYBOARD NAVIGATION
   ============================================================ */
document.addEventListener('keydown', (e) => {
  // Escape closes mobile menu
  if (e.key === 'Escape') {
    const mobileMenu = document.getElementById('mobileMenu');
    const hamburger = document.getElementById('hamburger');
    if (mobileMenu?.classList.contains('open')) {
      mobileMenu.classList.remove('open');
      hamburger?.classList.remove('open');
      document.body.style.overflow = '';
    }
  }
});

/* ============================================================
   INITIALIZE ALL
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initAnnouncementBar();
  initReveal();
  initCounters();
  initParticles();
  initIpCopy();
  initBackToTop();
  initSmoothScroll();
  initScrollSpy();
  loadHeroOnlinePlayers();
});
