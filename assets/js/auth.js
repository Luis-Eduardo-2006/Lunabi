/* ===== LÜNABI — Auth (login + registro, 100% frontend) =====
 *
 * Demo de autenticación basado en localStorage. Las contraseñas se guardan
 * como hash SHA-256 salado con el email (no en cleartext), usando Web Crypto.
 * Esto NO es seguridad de producción — cualquiera con DevTools puede leer
 * los usuarios locales. Es suficiente para un storefront estático que quiere
 * simular cuentas sin backend.
 *
 * Los formularios viven dentro del modal flotante `#authModal` (inyectado
 * por components.js en todas las páginas). Para conectar un backend real:
 *   - Cambiar `action=""` y `method="post"` en los <form> del modal
 *   - O reemplazar `wireLoginForm`/`wireSignupForm` por llamadas `fetch()`
 *   Todo el resto del UI (botón del navbar, dropdown de usuario, toast,
 *   updateUserButton) sigue funcionando sin tocar nada.
 *
 * Expone en `window`:
 *   initAuth(), updateUserButton(), getCurrentUser(), logoutUser(), openAuthModal()
 */

(function() {
  const USERS_KEY   = 'lunabi_users';
  const SESSION_KEY = 'lunabi_session';

  /* ---------------- HASH ---------------- */
  async function hashPassword(password, email) {
    const salt = email.toLowerCase().trim();
    const data = new TextEncoder().encode(`lunabi:${salt}:${password}`);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /* ---------------- STORAGE ---------------- */
  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ---------------- VALIDATION ---------------- */
  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isRemote() { return !!(window.LuApi && window.LuApi.isRemote && window.LuApi.isRemote()); }

  /* ---------------- API (localStorage demo + Supabase Auth) ---------------- */
  async function registerUser({ nombre, email, password, confirm }) {
    nombre = (nombre || '').trim();
    email  = (email  || '').trim().toLowerCase();

    if (nombre.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.');
    if (!validEmail(email)) throw new Error('El correo no tiene un formato válido.');
    if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) throw new Error('Las contraseñas no coinciden.');

    if (isRemote()) {
      try {
        await window.LuApi.signUp({ nombre, email, password });
      } catch (e) { throw new Error(e.message || 'No se pudo crear la cuenta.'); }
      const session = { nombre, email, createdAt: Date.now() };
      setSession(session);
      return session;
    }

    const users = loadUsers();
    if (users.some(u => u.email === email)) {
      throw new Error('Ya existe una cuenta con ese correo.');
    }
    const passwordHash = await hashPassword(password, email);
    const user = { nombre, email, passwordHash, createdAt: Date.now() };
    users.push(user);
    saveUsers(users);

    const session = { nombre, email, createdAt: user.createdAt };
    setSession(session);
    return session;
  }

  async function loginUser({ email, password }) {
    email = (email || '').trim().toLowerCase();
    if (!validEmail(email)) throw new Error('El correo no tiene un formato válido.');
    if (!password) throw new Error('Ingresa tu contraseña.');

    if (isRemote()) {
      try {
        await window.LuApi.signIn({ email, password });
        const user = await window.LuApi.getUser();
        const session = {
          nombre: (user && user.nombre) || 'Usuaria',
          email,
          createdAt: (user && user.createdAt) || Date.now()
        };
        setSession(session);
        return session;
      } catch (e) { throw new Error(e.message || 'No se pudo iniciar sesión.'); }
    }

    const users = loadUsers();
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('No encontramos una cuenta con ese correo.');
    const hash = await hashPassword(password, email);
    if (hash !== user.passwordHash) throw new Error('Contraseña incorrecta.');

    const session = { nombre: user.nombre, email: user.email, createdAt: user.createdAt };
    setSession(session);
    return session;
  }

  function logoutUser() {
    if (isRemote() && window.LuApi.signOut) { window.LuApi.signOut().catch(()=>{}); }
    clearSession();
    updateUserButton();
    if (typeof showToast === 'function') showToast('Sesión cerrada', 'info');
  }

  /* Cambio de contraseña.
   * - Modo remoto (Supabase): re-autentica con la pass actual para verificar
   *   identidad, y luego actualiza con auth.updateUser.
   * - Modo local: verifica el hash actual contra el guardado y reemplaza. */
  async function changePassword({ currentPassword, newPassword, confirm }) {
    if (!currentPassword) throw new Error('Ingresa tu contraseña actual.');
    if (!newPassword || newPassword.length < 6) throw new Error('La contraseña nueva debe tener al menos 6 caracteres.');
    if (newPassword !== confirm) throw new Error('La nueva contraseña y su confirmación no coinciden.');
    if (newPassword === currentPassword) throw new Error('La contraseña nueva debe ser distinta a la actual.');

    const session = getCurrentUser();
    if (!session || !session.email) throw new Error('Necesitas haber iniciado sesión.');

    if (isRemote()) {
      // Re-autenticación: signIn con la pass actual antes de poder cambiarla.
      // Si la pass es incorrecta, signIn lanza error y abortamos.
      try { await window.LuApi.signIn({ email: session.email, password: currentPassword }); }
      catch (e) { throw new Error('Tu contraseña actual no es correcta.'); }
      try { await window.LuApi.updatePassword(newPassword); }
      catch (e) { throw new Error(e.message || 'No se pudo cambiar la contraseña.'); }
      return true;
    }

    const users = loadUsers();
    const idx = users.findIndex(u => u.email === session.email);
    if (idx === -1) throw new Error('No encontramos tu cuenta local.');
    const currentHash = await hashPassword(currentPassword, session.email);
    if (currentHash !== users[idx].passwordHash) throw new Error('Tu contraseña actual no es correcta.');
    users[idx].passwordHash = await hashPassword(newPassword, session.email);
    saveUsers(users);
    return true;
  }

  /* ---------------- MODAL HELPERS (con fallback a páginas standalone) ---------- */
  /* openAuthModal:
   *   - Si el #authModal está inyectado en la página actual → lo abre (UX modal).
   *   - Si no (p.ej. ya estamos en login.html o si alguien navega directo)
   *     → redirige a login.html / registro.html guardando ?redirect= para volver. */
  function openAuthModal(which = 'login') {
    const modalEl = document.getElementById('authModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      switchTab(which);
      document.querySelectorAll('#authModal .auth-error').forEach(el => { el.textContent = ''; });
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
      return;
    }
    const page = which === 'signup' ? 'registro.html' : 'login.html';
    const here = window.location.pathname.split('/').pop() || 'index.html';
    if (here === page) return;
    const qs = here + window.location.search;
    window.location.href = `${page}?redirect=${encodeURIComponent(qs)}`;
  }

  function closeAuthModal() {
    const modalEl = document.getElementById('authModal');
    if (!modalEl || typeof bootstrap === 'undefined') return;
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }

  /* Decide qué hacer tras un login/registro exitoso:
   *   - En el modal → cierra el modal, el usuario sigue en la página actual.
   *   - En login.html / registro.html → redirige a ?redirect= o a index.html. */
  function afterAuthSuccess() {
    const modalEl = document.getElementById('authModal');
    if (modalEl) {
      closeAuthModal();
      return;
    }
    const target = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
    window.location.href = target;
  }

  function switchTab(which) {
    const loginTab   = document.getElementById('authTabLogin');
    const signupTab  = document.getElementById('authTabSignup');
    const loginForm  = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (!loginTab || !signupTab || !loginForm || !signupForm) return;
    const isLogin = which === 'login';
    loginTab.classList.toggle('active', isLogin);
    signupTab.classList.toggle('active', !isLogin);
    loginForm.classList.toggle('active', isLogin);
    signupForm.classList.toggle('active', !isLogin);
    document.querySelectorAll('#authModal .auth-error').forEach(el => { el.textContent = ''; });
  }

  /* ---------------- UI UPDATERS ---------------- */
  function updateUserButton() {
    const btn  = document.getElementById('userToggle');
    const user = getCurrentUser();

    if (btn) {
      if (user) {
        const initial = (user.nombre || user.email || '?').trim()[0].toUpperCase();
        btn.innerHTML = `<span class="user-avatar">${initial}</span>`;
        btn.setAttribute('aria-label', `Cuenta de ${user.nombre}`);
        btn.classList.add('is-logged');
      } else {
        btn.innerHTML = '<i class="bi bi-person"></i>';
        btn.setAttribute('aria-label', 'Iniciar sesión o crear cuenta');
        btn.classList.remove('is-logged');
      }
    }

    if (user) {
      const avatarEl = document.getElementById('userMenuAvatar');
      const nameEl   = document.getElementById('userMenuName');
      const emailEl  = document.getElementById('userMenuEmail');
      if (avatarEl) avatarEl.textContent = (user.nombre || '?').trim()[0].toUpperCase();
      if (nameEl)   nameEl.textContent   = user.nombre;
      if (emailEl)  emailEl.textContent  = user.email;
    }

    // Mostrar el enlace "Panel de administrador" solo si la sesión es admin
    const adminLink = document.getElementById('userMenuAdmin');
    if (adminLink) adminLink.style.display = (user && user.is_admin) ? '' : 'none';

    // Auto-rehidratación: si estamos en modo remoto y la sesión no tiene el
    // flag is_admin (sesiones viejas), consultamos Supabase y lo completamos.
    if (user && user.is_admin === undefined && isRemote() && window.LuApi && window.LuApi.getUser) {
      window.LuApi.getUser().then(u => {
        if (!u) return;
        const s = getCurrentUser();
        if (s) {
          s.is_admin = !!u.is_admin;
          setSession(s);
          if (adminLink) adminLink.style.display = u.is_admin ? '' : 'none';
        }
      }).catch(() => {});
    }
  }

  function toggleUserMenu(force) {
    const menu = document.getElementById('userMenu');
    if (!menu) return;
    const willOpen = typeof force === 'boolean' ? force : !menu.classList.contains('open');
    menu.classList.toggle('open', willOpen);
  }

  /* ---------------- FORM HANDLERS (modal flotante #authModal) --------------- */
  function wireLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector('.auth-error');
      if (err) err.textContent = '';
      const email    = form.querySelector('[name="email"]').value;
      const password = form.querySelector('[name="password"]').value;
      try {
        const session = await loginUser({ email, password });
        updateUserButton();
        if (typeof showToast === 'function') {
          showToast(`¡Hola de nuevo, ${session.nombre}!`, 'success');
        }
        form.reset();

        // Si la cuenta es admin (solo en modo remoto con Supabase), ofrecemos
        // elegir rol; si no, seguimos con el flujo normal de usuario.
        let isAdmin = false;
        if (isRemote() && window.LuApi && window.LuApi.getUser) {
          try {
            const u = await window.LuApi.getUser();
            isAdmin = !!(u && u.is_admin);
            if (isAdmin) {
              session.is_admin = true;
              setSession(session);
            }
          } catch (e) { /* noop */ }
        }
        if (isAdmin) showRolePicker();
        else afterAuthSuccess();
      } catch (ex) {
        if (err) err.textContent = ex.message;
      }
    });
  }

  function showRolePicker() {
    closeAuthModal();
    const modal = document.getElementById('rolePickerModal');
    if (!modal || typeof bootstrap === 'undefined') {
      // Fallback sin modal: pregunta con confirm()
      const goAdmin = confirm('Tu cuenta es administradora. ¿Entrar al panel de admin?\n\nAceptar = Admin · Cancelar = Usuaria');
      window.location.href = goAdmin ? 'admin.html' : 'cuenta.html';
      return;
    }
    modal.querySelectorAll('[data-role]').forEach(btn => {
      btn.onclick = () => {
        const role = btn.getAttribute('data-role');
        const inst = bootstrap.Modal.getInstance(modal);
        if (inst) inst.hide();
        window.location.href = (role === 'admin') ? 'admin.html' : 'cuenta.html';
      };
    });
    bootstrap.Modal.getOrCreateInstance(modal).show();
  }

  function wireSignupForm() {
    const form = document.getElementById('signupForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector('.auth-error');
      if (err) err.textContent = '';
      const nombre   = form.querySelector('[name="nombre"]').value;
      const email    = form.querySelector('[name="email"]').value;
      const password = form.querySelector('[name="password"]').value;
      const confirmInput = form.querySelector('[name="password_confirm"]') || form.querySelector('[name="confirm"]');
      const confirm  = confirmInput ? confirmInput.value : '';
      try {
        const session = await registerUser({ nombre, email, password, confirm });
        updateUserButton();
        if (typeof showToast === 'function') {
          showToast(`¡Bienvenida a Lünabi, ${session.nombre}!`, 'success');
        }
        form.reset();
        afterAuthSuccess();
      } catch (ex) {
        if (err) err.textContent = ex.message;
      }
    });
  }

  /* ---------------- INIT ---------------- */
  function initAuth() {
    updateUserButton();

    /* Botón del navbar: si no hay sesión, abre el modal de auth.
     * Si hay sesión, despliega el dropdown de usuario. */
    const userBtn = document.getElementById('userToggle');
    if (userBtn) {
      userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (getCurrentUser()) {
          toggleUserMenu();
        } else {
          openAuthModal('login');
        }
      });
    }

    /* Tabs del modal */
    document.getElementById('authTabLogin')?.addEventListener('click', () => switchTab('login'));
    document.getElementById('authTabSignup')?.addEventListener('click', () => switchTab('signup'));
    document.querySelectorAll('[data-auth-switch]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        switchTab(el.getAttribute('data-auth-switch'));
      });
    });

    /* Formularios del modal */
    wireLoginForm();
    wireSignupForm();

    /* Logout desde el dropdown */
    document.getElementById('userMenuLogout')?.addEventListener('click', () => {
      logoutUser();
      toggleUserMenu(false);
    });

    /* Cerrar user-menu al hacer click fuera */
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('userMenu');
      if (!menu || !menu.classList.contains('open')) return;
      if (!e.target.closest('#userMenu') && !e.target.closest('#userToggle')) {
        menu.classList.remove('open');
      }
    });
  }

  /* Expose */
  window.initAuth         = initAuth;
  window.updateUserButton = updateUserButton;
  window.getCurrentUser   = getCurrentUser;
  window.logoutUser       = logoutUser;
  window.openAuthModal    = openAuthModal;
  window.changePassword   = changePassword;
})();
