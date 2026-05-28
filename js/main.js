/**
 * ==========================================================================
 * MAIN GLOBAL JAVASCRIPT (Theme Management & Navigation)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
  initHeaderScroll();
  initPageTransitions();
});

/**
 * انتقال ناعم بين صفحات الموقع:
 * عند النقر على رابط داخلي ينتهي بـ .html نُظهر تأثير الاختفاء ثم ننتقل.
 */
function initPageTransitions() {
  document.querySelectorAll('a[href$=".html"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const url = link.getAttribute('href');

      // تجاهل فتح تبويب جديد أو النقر مع مفاتيح التحكم
      if (link.target === '_blank' || e.ctrlKey || e.metaKey) return;

      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(() => { window.location.href = url; }, 250);
    });
  });
}

/**
 * Initialize Light/Dark Theme
 */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggle');
  if (!themeToggleBtn) return;

  // Retrieve saved theme or check system preference safely
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem('theme');
  } catch (e) {
    console.warn('LocalStorage is blocked or unavailable:', e);
  }
  
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  // Apply theme to document
  document.documentElement.setAttribute('data-theme', initialTheme);
  updateThemeIcon(themeToggleBtn, initialTheme);

  // Toggle theme on button click
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {
      console.warn('LocalStorage write blocked:', e);
    }
    
    updateThemeIcon(themeToggleBtn, newTheme);
  });
}

/**
 * Update the Theme Toggle Button Icon
 */
function updateThemeIcon(btn, theme) {
  const icon = btn.querySelector('i');
  if (!icon) return;

  if (theme === 'dark') {
    icon.className = 'fas fa-sun'; // Sun icon for light mode option
    btn.setAttribute('aria-label', 'التبديل إلى الوضع المضيء');
  } else {
    icon.className = 'fas fa-moon'; // Moon icon for dark mode option
    btn.setAttribute('aria-label', 'التبديل إلى الوضع الداكن');
  }
}

/**
 * Initialize Mobile Navigation Menu
 */
function initMobileMenu() {
  const mobileToggle = document.getElementById('mobileToggle');
  const mainNav = document.getElementById('mainNav');

  if (!mobileToggle || !mainNav) return;

  mobileToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('header__nav--open');
    mobileToggle.classList.toggle('header__mobile-toggle--active');
    mobileToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!mainNav.contains(e.target) && !mobileToggle.contains(e.target)) {
      mainNav.classList.remove('header__nav--open');
      mobileToggle.classList.remove('header__mobile-toggle--active');
      mobileToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Header shadow on scroll
 */
function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  });
}
