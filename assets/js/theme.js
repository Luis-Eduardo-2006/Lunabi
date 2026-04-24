/* ===== LÜNABI — Theme Toggle (día / noche) ===== */

(function() {
  const STORAGE_KEY = 'lunabi-theme';

  // Apply stored theme IMMEDIATELY on script load to minimise FOUC.
  const saved = localStorage.getItem(STORAGE_KEY) || 'day';
  if (saved === 'night') document.body.classList.add('dark');
  document.documentElement.setAttribute('data-theme', saved);

  function applyTheme(theme) {
    const toggle = document.getElementById('themeToggle');
    if (theme === 'night') {
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'night');
      if (toggle) {
        toggle.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
        toggle.setAttribute('aria-label', 'Cambiar a modo día');
      }
    } else {
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'day');
      if (toggle) {
        toggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
        toggle.setAttribute('aria-label', 'Cambiar a modo noche');
      }
    }
  }

  function wireThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    // Make sure the icon matches the current stored state now that the button exists.
    applyTheme(localStorage.getItem(STORAGE_KEY) || 'day');
    toggle.addEventListener('click', () => {
      const next = document.body.classList.contains('dark') ? 'day' : 'night';
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }

  window.applyTheme = applyTheme;
  window.wireThemeToggle = wireThemeToggle;
})();
