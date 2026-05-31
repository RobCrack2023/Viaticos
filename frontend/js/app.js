// -- Almacenamiento seguro (sessionStorage por defecto) ----------------------
const Store = {
  set(key, value, remember = false) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(key, value);
    (remember ? sessionStorage : localStorage).removeItem(key);
  },
  get: (key) => sessionStorage.getItem(key) || localStorage.getItem(key),
  remove(key) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
  isRemembered: () => !!localStorage.getItem("token"),
};

// -- PWA Install --------------------------------------------------------------
let _installPrompt = null;
const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const _isStandalone = window.matchMedia('(display-mode: standalone)').matches
                   || window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _installPrompt = e;
});

// -- Utilidades globales ------------------------------------------------------
function CLP(v) {
  if (v == null) return '--';
  return '$' + Math.round(v).toLocaleString('es-CL');
}

function fmtDate(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function today() {
  return new Date().toISOString().substring(0, 10);
}

// -- App principal ------------------------------------------------------------
const App = (() => {
  const pages = {
    login:          { module: () => LoginPage,        nav: false },
    dashboard:      { module: () => DashboardPage,    nav: true  },
    account:        { module: () => AccountPage,      nav: true  },
    viatico:        { module: () => ViaticoPage,      nav: true  },
    admin:          { module: () => AdminPage,        nav: true, adminOnly: true },
    admin_stats:    { module: () => AdminStatsPage,   nav: true, adminOnly: true },
    admin_viaticos: { module: () => AdminViaticoPage, nav: true, adminOnly: true },
  };

  let _currentPage = null;

  async function navigate(pageName) {
    const def = pages[pageName];
    if (!def) return;

    const user = JSON.parse(Store.get("user") || "{}");
    if (def.adminOnly && !user.is_admin) return;

    // Usuario normal sin viatico: "Inicio" y "Cuenta" redirigen a crear viatico
    if ((pageName === 'dashboard' || pageName === 'account') && !user.is_admin) {
      try {
        const v = await API.getActiveViatico();
        if (!v) { _doNavigate('viatico', user); return; }
      } catch (_) {
        _doNavigate('viatico', user); return;
      }
    }

    _doNavigate(pageName, user);
  }

  function _doNavigate(pageName, user) {
    const def = pages[pageName];
    if (!def) return;

    const shell = document.getElementById("app-shell");
    const mod = def.module();

    shell.innerHTML = `
      <div id="offline-banner">Sin conexion -- los datos se sincronizaran al volver</div>
      ${mod.render()}
      ${def.nav ? renderBottomNav(pageName, user) : ''}
      <div id="toast"></div>`;

    mod.bind();
    _currentPage = pageName;

    if (!navigator.onLine) {
      document.getElementById("offline-banner").classList.add("show");
    }
  }

  const NAV_ICONS = {
    dashboard:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    account:        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    viatico:        `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    admin:          `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>`,
    admin_viaticos: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    admin_stats:    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  };

  function renderBottomNav(active, user) {
    if (user.is_admin) {
      const adminTabs = [
        { id: 'admin',          label: 'Gestion'  },
        { id: 'admin_stats',    label: 'Informes' },
        { id: 'admin_viaticos', label: 'Viaticos' },
      ];
      return `<nav class="bottom-nav">
        ${adminTabs.map(t => `
          <button class="${active === t.id ? 'active' : ''}" onclick="App.navigate('${t.id}')">
            <span class="nav-icon">${NAV_ICONS[t.id] || NAV_ICONS['admin']}</span>${t.label}
          </button>`).join('')}
      </nav>`;
    }

    const tabs = [
      { id: 'dashboard', label: 'Inicio'  },
      { id: 'account',   label: 'Cuenta'  },
      { id: 'viatico',   label: 'Viatico' },
    ];
    return `<nav class="bottom-nav">
      ${tabs.map(t => `
        <button class="${active === t.id ? 'active' : ''}" onclick="App.navigate('${t.id}')">
          <span class="nav-icon">${NAV_ICONS[t.id]}</span>${t.label}
        </button>`).join('')}
    </nav>`;
  }

  function toast(msg, duration = 2500) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), duration);
  }

  async function afterLogin(user) {
    if (user.is_admin) {
      navigate('admin');
      return;
    }
    try {
      const v = await API.getActiveViatico();
      if (!v) { navigate('viatico'); return; }
    } catch (_) {
      navigate('viatico'); return;
    }
    navigate('dashboard');
  }

  // -- Inactividad ------------------------------------------------------------
  const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos
  let _inactivityTimer = null;

  function _resetInactivity() {
    if (!Store.get("token")) return;
    clearTimeout(_inactivityTimer);
    _inactivityTimer = setTimeout(() => {
      logout();
      setTimeout(() => toast("Sesion cerrada por inactividad (30 min)"), 300);
    }, INACTIVITY_MS);
  }

  function _initInactivityWatcher() {
    ["click", "touchstart", "keydown", "scroll", "mousemove"].forEach(ev =>
      document.addEventListener(ev, _resetInactivity, { passive: true })
    );
    _resetInactivity();
  }

  function logout() {
    clearTimeout(_inactivityTimer);
    Store.remove("token");
    Store.remove("user");
    _doNavigate('login', {});
  }

  function refreshCurrentPage() {
    if (_currentPage) {
      const user = JSON.parse(Store.get("user") || "{}");
      _doNavigate(_currentPage, user);
    }
  }

  // -- Descarga autenticada ---------------------------------------------------
  async function downloadFile(url, filename) {
    try {
      const token = Store.get("token");
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al descargar");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast("Error: " + err.message);
    }
  }

  // -- PWA Install ------------------------------------------------------------
  function _shouldShowInstall() {
    if (_isStandalone) return false;
    const dismissed = localStorage.getItem("pwa_dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 86400000) return false;
    return _installPrompt || _isIOS;
  }

  function showInstallBanner() {
    if (!_shouldShowInstall()) return;
    if (document.getElementById("install-banner")) return;

    const banner = document.createElement("div");
    banner.id = "install-banner";

    if (_isIOS) {
      banner.innerHTML = `
        <div class="install-banner">
          <div class="ib-icon">📲</div>
          <div class="ib-body">
            <div class="ib-title">Instalar Viaticos App</div>
            <div class="ib-sub">Toca <strong>Compartir</strong> y luego <strong>"Agregar a inicio"</strong></div>
          </div>
          <button class="ib-close" onclick="App.dismissInstall()">✕</button>
        </div>`;
    } else {
      banner.innerHTML = `
        <div class="install-banner">
          <div class="ib-icon">📲</div>
          <div class="ib-body">
            <div class="ib-title">Instalar Viaticos App</div>
            <div class="ib-sub">Instala la app para usarla sin internet</div>
          </div>
          <div class="ib-actions">
            <button class="ib-btn-yes" onclick="App.triggerInstall()">Instalar</button>
            <button class="ib-btn-no"  onclick="App.dismissInstall()">Ahora no</button>
          </div>
        </div>`;
    }

    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add("show"));
    setTimeout(() => dismissInstall(), 30000);
  }

  async function triggerInstall() {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    const { outcome } = await _installPrompt.userChoice;
    _installPrompt = null;
    dismissInstall();
    if (outcome === 'accepted') toast("App instalada correctamente!");
  }

  function dismissInstall() {
    localStorage.setItem("pwa_dismissed", Date.now().toString());
    const banner = document.getElementById("install-banner");
    if (banner) {
      banner.classList.remove("show");
      setTimeout(() => banner.remove(), 400);
    }
  }

  // -- Init -------------------------------------------------------------------
  function init() {
    const token = Store.get("token");
    if (token) {
      const user = JSON.parse(Store.get("user") || "{}");
      navigate(user.is_admin ? 'admin' : 'dashboard');
    } else {
      navigate('login');
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    Sync.init();
    _initInactivityWatcher();
    setTimeout(() => showInstallBanner(), 3000);
  }

  return { navigate, toast, afterLogin, logout, refreshCurrentPage, downloadFile, triggerInstall, dismissInstall, init };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
