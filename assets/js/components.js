/* ===== LÜNABI — Components (navbar + footer + modal + cart drawer injection) =====
 *
 * Runs at script-load time (end of body, DOM is already parsed) and fills four
 * container divs that every page provides:
 *   #navbar-container   → the fixed top navbar
 *   #footer-container   → the site footer
 *   #modal-container    → the product modal (Bootstrap)
 *   #carrito-drawer     → the cart overlay + drawer
 *
 * Each page HTML just drops those empty containers where it wants them and
 * includes this script — no manual copy-paste of navbar/footer per page.
 */

(function() {
  const WA_NUMBER_FALLBACK = '51XXXXXXXXX';

  const NAVBAR_HTML = `
    <nav class="navbar navbar-expand-lg fixed-top navbar-glass" id="navbar">
      <div class="container">
        <a href="index.html" class="navbar-brand" aria-label="Ir al inicio">
          <span class="marca-nombre">Lünabi</span>
          <img src="img/logo/logo.webp" alt="Lünabi" height="42">
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent" aria-controls="navContent" aria-expanded="false" aria-label="Menú">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="navbar-utils">
          <div class="nav-search">
            <i class="bi bi-search search-icon"></i>
            <input type="text" id="searchInput" placeholder="Buscar producto o marca..." autocomplete="off">
            <div class="search-results" id="searchResults"></div>
          </div>
          <button class="nav-theme" id="themeToggle" type="button" aria-label="Cambiar a modo noche">
            <i class="bi bi-sun-fill"></i>
          </button>
          <div class="nav-user-wrap">
            <button class="nav-user" id="userToggle" type="button" aria-label="Iniciar sesión o crear cuenta">
              <i class="bi bi-person"></i>
            </button>
            <div class="user-menu" id="userMenu">
              <div class="user-menu-header">
                <span class="user-avatar-large" id="userMenuAvatar">?</span>
                <div>
                  <div class="user-menu-name" id="userMenuName">Usuario</div>
                  <div class="user-menu-email" id="userMenuEmail">email@ejemplo.com</div>
                </div>
              </div>
              <hr>
              <button class="user-menu-item" id="userMenuLogout" type="button">
                <i class="bi bi-box-arrow-right"></i> Cerrar sesión
              </button>
            </div>
          </div>
          <button class="nav-cart" id="cartToggle" type="button" aria-label="Carrito">
            <i class="bi bi-cart3"></i>
            <span class="badge" id="cartBadge">0</span>
          </button>
        </div>

        <div class="collapse navbar-collapse" id="navContent">
          <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <a class="nav-link" href="index.html" data-nav="index">Inicio</a>
            </li>

            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="skincare.html" data-nav="skincare" role="button">Skincare</a>
              <ul class="dropdown-menu lu-dropdown-menu mega-dropdown-menu mega-has-flyouts">
                <li class="mega-item">
                  <a href="skincare.html?categoria=limpieza" class="mega-header has-subs">Limpieza</a>
                  <div class="mega-sub-panel">
                    <a href="skincare.html?categoria=limpieza&tipo=aceite" class="mega-sub-link">Aceite</a>
                    <a href="skincare.html?categoria=limpieza&tipo=foam" class="mega-sub-link">Foam</a>
                    <a href="skincare.html?categoria=limpieza&tipo=desmaquillante" class="mega-sub-link">Desmaquillante</a>
                  </div>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=exfoliante" class="mega-header">Exfoliante</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=tonico" class="mega-header">Tónico</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=serum" class="mega-header">Serum</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=mascarillas" class="mega-header has-subs">Mascarillas</a>
                  <div class="mega-sub-panel">
                    <a href="skincare.html?categoria=mascarillas&tipo=algodon" class="mega-sub-link">Algodón</a>
                    <a href="skincare.html?categoria=mascarillas&tipo=lavable" class="mega-sub-link">Lavable</a>
                    <a href="skincare.html?categoria=mascarillas&tipo=spot-patch" class="mega-sub-link">Spot Patch</a>
                  </div>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=esencia" class="mega-header">Esencia</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=locion" class="mega-header">Loción</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=crema-facial" class="mega-header">Crema Facial</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=contorno-ojos" class="mega-header has-subs">Contorno de Ojos</a>
                  <div class="mega-sub-panel">
                    <a href="skincare.html?categoria=contorno-ojos&tipo=crema" class="mega-sub-link">Crema</a>
                    <a href="skincare.html?categoria=contorno-ojos&tipo=parches" class="mega-sub-link">Parches</a>
                  </div>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=mist" class="mega-header">Mist</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=sleeping-mask" class="mega-header">Sleeping Mask</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=tone-up" class="mega-header">Tone Up</a>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=bloqueador" class="mega-header has-subs">Bloqueador</a>
                  <div class="mega-sub-panel">
                    <a href="skincare.html?categoria=bloqueador&tipo=barra" class="mega-sub-link">Barra</a>
                    <a href="skincare.html?categoria=bloqueador&tipo=liquido" class="mega-sub-link">Líquido</a>
                  </div>
                </li>
                <li class="mega-item">
                  <a href="skincare.html?categoria=pads" class="mega-header has-subs">Pads</a>
                  <div class="mega-sub-panel">
                    <a href="skincare.html?categoria=pads&tipo=tonico" class="mega-sub-link">Tónico</a>
                    <a href="skincare.html?categoria=pads&tipo=exfoliante" class="mega-sub-link">Exfoliante</a>
                  </div>
                </li>
              </ul>
            </li>

            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="maquillaje.html" data-nav="maquillaje" role="button">Maquillaje</a>
              <ul class="dropdown-menu lu-dropdown-menu mega-dropdown-menu mega-has-flyouts">
                <li class="mega-item">
                  <a href="maquillaje.html?categoria=rostro" class="mega-header has-subs">Rostro</a>
                  <div class="mega-sub-panel">
                    <a href="maquillaje.html?categoria=rostro&tipo=rubor" class="mega-sub-link">Rubor</a>
                    <a href="maquillaje.html?categoria=rostro&tipo=polvos" class="mega-sub-link">Polvos</a>
                    <a href="maquillaje.html?categoria=rostro&tipo=cc-cream" class="mega-sub-link">CC Cream</a>
                    <a href="maquillaje.html?categoria=rostro&tipo=bb-cream" class="mega-sub-link">BB Cream</a>
                    <a href="maquillaje.html?categoria=rostro&tipo=cushion" class="mega-sub-link">Cushion</a>
                  </div>
                </li>
                <li class="mega-item">
                  <a href="maquillaje.html?categoria=ojos" class="mega-header has-subs">Ojos</a>
                  <div class="mega-sub-panel">
                    <a href="maquillaje.html?categoria=ojos&tipo=delineador" class="mega-sub-link">Delineador</a>
                    <a href="maquillaje.html?categoria=ojos&tipo=cejas" class="mega-sub-link">Cejas</a>
                    <a href="maquillaje.html?categoria=ojos&tipo=sombras" class="mega-sub-link">Sombras</a>
                    <a href="maquillaje.html?categoria=ojos&tipo=rimel" class="mega-sub-link">Rímel</a>
                  </div>
                </li>
                <li class="mega-item">
                  <a href="maquillaje.html?categoria=labios" class="mega-header has-subs">Labios</a>
                  <div class="mega-sub-panel">
                    <a href="maquillaje.html?categoria=labios&tipo=mate" class="mega-sub-link">Mate</a>
                    <a href="maquillaje.html?categoria=labios&tipo=gloss" class="mega-sub-link">Gloss</a>
                    <a href="maquillaje.html?categoria=labios&tipo=tinta-liquida" class="mega-sub-link">Tinta Líquida</a>
                    <a href="maquillaje.html?categoria=labios&tipo=balsamo" class="mega-sub-link">Bálsamo</a>
                  </div>
                </li>
              </ul>
            </li>

            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="corporal.html" data-nav="corporal" role="button">Corporal</a>
              <ul class="dropdown-menu lu-dropdown-menu mega-dropdown-menu mega-2col">
                <li class="mega-item">
                  <a href="corporal.html?categoria=cuerpo" class="mega-header">Cuerpo</a>
                </li>
                <li class="mega-item">
                  <a href="corporal.html?categoria=cabello" class="mega-header">Cabello</a>
                </li>
                <li class="mega-item">
                  <a href="corporal.html?categoria=manos" class="mega-header">Manos</a>
                </li>
                <li class="mega-item">
                  <a href="corporal.html?categoria=pies" class="mega-header">Pies</a>
                </li>
              </ul>
            </li>
            <li class="nav-item"><a class="nav-link" href="accesorios.html" data-nav="accesorios">Accesorios</a></li>

            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="marcas.html" data-nav="marcas" role="button">Marcas</a>
              <ul class="dropdown-menu lu-dropdown-menu mega-dropdown-menu" id="marcasDropMenu"></ul>
            </li>

            <li class="nav-item">
              <a class="nav-link nav-link-sale" href="sale.html" data-nav="sale">
                <span class="sale-badge">SALE</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `;

  const FOOTER_HTML = `
    <footer class="lu-footer">
      <div class="container">
        <div class="row g-4 mb-4">
          <div class="col-lg-2 col-md-4">
            <h5 class="footer-title">Conecta con nosotros</h5>
            <div class="footer-social">
              <a href="https://wa.me/${WA_NUMBER_FALLBACK}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>
              <a href="#" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
              <a href="#" aria-label="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.27 8.27 0 005.58 2.17v-3.44a4.85 4.85 0 01-2.84-1.04v-4z"/></svg>
              </a>
            </div>
            <div class="footer-contact">
              <a href="mailto:lunabi@gmail.com">lunabi@gmail.com</a><br>
              +51 XXX XXX XXX
            </div>
          </div>

          <div class="col-lg-2 col-md-4 col-6">
            <div class="footer-sede">
              <h6>Lima — Miraflores</h6>
              <p>Av. Larco 101, tda 206 (2do piso)<br>Lun–Sáb 10am–9pm</p>
            </div>
            <div class="footer-sede">
              <h6>Lima — San Miguel</h6>
              <p>CC Plaza San Miguel, tda 213<br>Lun–Dom 10am–10pm</p>
            </div>
          </div>

          <div class="col-lg-2 col-md-4 col-6">
            <div class="footer-sede">
              <h6>Lima — Independencia</h6>
              <p>CC Plaza Norte, tda 1108<br>Lun–Dom 10am–10pm</p>
            </div>
            <div class="footer-sede">
              <h6>Chiclayo</h6>
              <p>Mall Aventura, Local A-2012 (2do piso)<br>Lun–Dom 10am–10pm</p>
            </div>
          </div>

          <div class="col-lg-2 col-md-4 col-6">
            <div class="footer-sede">
              <h6>Santa Anita</h6>
              <p>Mall Aventura, Local C-1003<br>Lun–Dom 10am–10pm</p>
            </div>
            <div class="text-center mt-3">
              <a href="#" class="btn-maps"><i class="bi bi-geo-alt"></i> Ver mapas</a>
            </div>
          </div>

          <div class="col-lg-2 col-md-4 col-6 footer-links">
            <h6>Nuestra Empresa</h6>
            <ul>
              <li><a href="nosotros.html">Acerca de nosotros</a></li>
              <li><a href="#">Tienda física</a></li>
              <li><a href="terminos.html">Términos y condiciones</a></li>
              <li><a href="faq.html">Preguntas frecuentes</a></li>
            </ul>
          </div>

          <div class="col-lg-2 col-md-4 col-6 footer-links">
            <h6>Te Ayudamos</h6>
            <ul>
              <li><a href="contacto.html"><i class="bi bi-envelope me-1"></i>Contacto</a></li>
              <li><a href="libro-reclamaciones.html"><i class="bi bi-journal-text me-1"></i>Libro de Reclamaciones</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="subfooter">
        &copy; 2025 Lünabi — Desarrollado con amor
      </div>
    </footer>
  `;

  const MODAL_HTML = `
    <div class="modal fade modal-product" id="productModal" tabindex="-1">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <a class="modal-brand" id="modalBrand" href="#"></a>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <div class="row g-4">
              <div class="col-md-5">
                <div class="modal-img-carousel" id="modalMainImg">
                  <img src="" alt="" loading="lazy">
                </div>
                <div class="modal-thumbnails" id="modalThumbs"></div>
              </div>
              <div class="col-md-7">
                <h2 class="modal-name" id="modalName"></h2>
                <div class="modal-price" id="modalPrice"></div>
                <hr class="modal-sep">
                <ul class="nav nav-tabs" role="tablist">
                  <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tabInfo" type="button" role="tab">Información General</button></li>
                  <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabUso" type="button" role="tab">Modo de Uso</button></li>
                  <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabBeneficios" type="button" role="tab">Beneficios</button></li>
                </ul>
                <div class="tab-content">
                  <div class="tab-pane fade show active" id="tabInfo" role="tabpanel"></div>
                  <div class="tab-pane fade" id="tabUso" role="tabpanel"></div>
                  <div class="tab-pane fade" id="tabBeneficios" role="tabpanel"></div>
                </div>
                <div class="d-flex align-items-center gap-3 mt-3 flex-wrap">
                  <div class="qty-control">
                    <button id="modalQtyMinus" type="button">−</button>
                    <input type="text" id="modalQty" value="1" readonly>
                    <button id="modalQtyPlus" type="button">+</button>
                  </div>
                  <button class="btn-add-modal ripple-wrap" id="modalAddCart" type="button">
                    <i class="bi bi-cart-plus"></i> Agregar al carrito
                  </button>
                </div>
                <div class="mt-3">
                  <a href="#" class="btn-whatsapp-modal" id="modalWhatsapp" target="_blank" rel="noopener">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Consultar por WhatsApp
                  </a>
                </div>
                <div class="producto-fav-row">
                  <button class="btn-fav-detail" id="modalFav" type="button" aria-label="Añadir a favoritos">
                    <i class="bi bi-heart"></i>
                    <span class="fav-label">Añadir a favoritos</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const AUTH_MODAL_HTML = `
    <div class="modal fade auth-modal" id="authModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <div class="auth-tabs">
              <button class="auth-tab active" id="authTabLogin" type="button">Iniciar sesión</button>
              <button class="auth-tab" id="authTabSignup" type="button">Registrarse</button>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <!-- Cuando llegue el backend, cambiar action a /api/login.
                 El resto del JS (auth.js) llamara fetch() en vez de localStorage. -->
            <form class="auth-form active" id="loginForm" method="post" action="#" novalidate>
              <div class="auth-intro">
                <h3>Bienvenida de vuelta</h3>
                <p>Ingresa a tu cuenta Lünabi</p>
              </div>
              <label class="auth-field">
                <span>Correo electrónico</span>
                <input type="email" name="email" placeholder="tu@email.com" required autocomplete="email">
              </label>
              <label class="auth-field">
                <span>Contraseña</span>
                <input type="password" name="password" placeholder="••••••••" required autocomplete="current-password">
              </label>
              <div class="auth-error"></div>
              <button type="submit" class="btn-auth">
                <i class="bi bi-box-arrow-in-right"></i> Iniciar sesión
              </button>
              <p class="auth-footer">
                ¿No tienes cuenta? <a href="#" data-auth-switch="signup">Regístrate aquí</a>
              </p>
            </form>

            <form class="auth-form" id="signupForm" method="post" action="#" novalidate>
              <div class="auth-intro">
                <h3>Crea tu cuenta</h3>
                <p>Únete a la comunidad Lünabi</p>
              </div>
              <label class="auth-field">
                <span>Nombre</span>
                <input type="text" name="nombre" placeholder="Tu nombre" required autocomplete="name">
              </label>
              <label class="auth-field">
                <span>Correo electrónico</span>
                <input type="email" name="email" placeholder="tu@email.com" required autocomplete="email">
              </label>
              <label class="auth-field">
                <span>Contraseña</span>
                <input type="password" name="password" placeholder="Mínimo 6 caracteres" required minlength="6" autocomplete="new-password">
              </label>
              <label class="auth-field">
                <span>Confirmar contraseña</span>
                <input type="password" name="password_confirm" placeholder="Repite la contraseña" required minlength="6" autocomplete="new-password">
              </label>
              <div class="auth-error"></div>
              <button type="submit" class="btn-auth">
                <i class="bi bi-heart"></i> Crear mi cuenta
              </button>
              <p class="auth-footer">
                ¿Ya tienes cuenta? <a href="#" data-auth-switch="login">Inicia sesión</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  const CART_HTML = `
    <div class="cart-overlay" id="cartOverlay"></div>
    <aside class="cart-drawer" id="cartDrawer">
      <div class="cart-header">
        <h3>Mi Carrito <span class="cart-count-badge" id="cartCountBadge">0</span></h3>
        <button class="cart-close" id="cartClose" type="button"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="cart-body" id="cartBody">
        <div class="cart-empty" id="cartEmpty">
          <i class="bi bi-bag-x"></i>
          <p>Tu carrito está vacío</p>
        </div>
        <div id="cartItems"></div>
      </div>
      <div class="cart-footer" id="cartFooter" style="display:none">
        <div class="cart-total">
          <span>Total:</span>
          <span id="cartTotal">S/ 0.00</span>
        </div>
        <button class="btn-clear-cart" id="btnClearCart" type="button">Vaciar carrito</button>
        <button class="btn-whatsapp-cart" id="btnWhatsappCart" type="button">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Enviar pedido por WhatsApp
        </button>
      </div>
    </aside>
  `;

  function injectComponents() {
    const nav = document.getElementById('navbar-container');
    const foot = document.getElementById('footer-container');
    const modal = document.getElementById('modal-container');
    const cart = document.getElementById('carrito-drawer');

    if (nav) nav.innerHTML = NAVBAR_HTML;
    if (foot) foot.innerHTML = FOOTER_HTML;
    if (modal) {
      /* En login.html y registro.html los forms viven en la propia página,
       * así que evitamos inyectar AUTH_MODAL_HTML (mismo #loginForm/#signupForm)
       * para no crear IDs duplicados. En el resto de páginas sí se inyecta. */
      const here = (window.location.pathname.split('/').pop() || '').toLowerCase();
      const isAuthPage = here === 'login.html' || here === 'registro.html';
      modal.innerHTML = isAuthPage ? MODAL_HTML : MODAL_HTML + AUTH_MODAL_HTML;
    }
    if (cart) cart.innerHTML = CART_HTML;

    // Populate the Marcas dropdown with one link per brand
    const marcasDrop = document.getElementById('marcasDropMenu');
    if (marcasDrop && typeof brands !== 'undefined' && Array.isArray(brands)) {
      marcasDrop.innerHTML = brands.map(b =>
        `<li><a class="dropdown-item" href="marca-detalle.html?marca=${b.slug}">${b.nombre}</a></li>`
      ).join('');
    }
  }

  // Auto-run at script load so main.js can wire handlers to injected elements.
  injectComponents();

  /* Carga diferida del módulo SkinTest (botón flotante con logo + modal de
   * test dermatológico). Se inyecta CSS y JS dinámicamente para que esté
   * disponible en todas las páginas sin tener que editar cada HTML. */
  (function loadSkinTest() {
    if (document.getElementById('luSkinTestCss')) return;
    const link = document.createElement('link');
    link.id = 'luSkinTestCss';
    link.rel = 'stylesheet';
    link.href = 'assets/css/skintest.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'assets/js/skintest.js';
    script.defer = true;
    document.head.appendChild(script);
  })();

  window.injectComponents = injectComponents;
})();
