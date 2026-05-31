// Utilidades globales
function CLP(v) {
  if (v == null) return '—';
  return '$' + Math.round(v).toLocaleString('es-CL');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function today() {
  return new Date().toISOString().substring(0, 10);
}

// App principal
const App = (() => {
  const pages = {
    login:     { module: () => LoginPage,     nav: false },
    dashboard: { module: () => DashboardPage, nav: true  },
    account:   { module: () => AccountPage,   nav: true  },
    viatico:   { module: () => ViaticoPage,   nav: true  },
    admin:     { module: () => AdminPage,     nav: true, adminOnly: true },
  };

  let _currentPage = null;

  function navigate(pageName) {
    const def = pages[pageName];
    if (!def) return;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (def.adminOnly && !user.is_admin) return;

    const shell = document.getElementById("app-shell");
    const mod = def.module();

    shell.innerHTML = `
      <div id="offline-banner">⚡ Sin conexión — los datos se sincronizarán al volver</div>
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
    dashboard: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    account:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
    viatico:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    admin:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>`,
  };

  function renderBottomNav(active, user) {
    const tabs = [
      { id: 'dashboard', label: 'Inicio'   },
      { id: 'account',   label: 'Cuenta'   },
      { id: 'viatico',   label: 'Viático'  },
    ];
    if (user.is_admin) tabs.push({ id: 'admin', label: 'Admin' });

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
    if (!user.is_admin) {
      try {
        const v = await API.getActiveViatico();
        if (!v) { navigate('viatico'); return; }
      } catch (_) {
        navigate('viatico'); return;
      }
    }
    navigate('dashboard');
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate('login');
  }

  function refreshCurrentPage() {
    if (_currentPage) navigate(_currentPage);
  }

  function init() {
    const token = localStorage.getItem("token");
    if (token) {
      navigate('dashboard');
    } else {
      navigate('login');
    }

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('SW registrado');
      }).catch(console.error);
    }

    Sync.init();
  }

  return { navigate, toast, afterLogin, logout, refreshCurrentPage, init };
})();

document.addEventListener("DOMContentLoaded", () => App.init());
