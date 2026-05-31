const DashboardPage = (() => {
  let _account = null;
  let _viatico = null;

  function render() {
    return `
      <div class="topbar">
        <h1>Viáticos App</h1>
        <button class="menu-btn" id="dash-logout-btn" title="Cerrar sesión" style="font-size:14px;font-weight:700">Salir</button>
      </div>
      <div class="content" id="dash-content">
        <div style="text-align:center;padding:40px;color:var(--muted)">Cargando...</div>
      </div>`;
  }

  async function load() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    try {
      _account = await API.getAccount().catch(() => null);
      _viatico = await API.getActiveViatico().catch(() => null);
    } catch (_) {}
    renderContent(user);
  }

  function renderContent(user) {
    const saldoCC    = _account ? _account.saldo_actual    : null;
    const viatMonto  = _viatico ? _viatico.monto_asignado  : 0;
    const viatGastos = _viatico ? _viatico.total_gastos    : 0;
    const saldoViat  = _viatico ? _viatico.saldo_actual    : null;

    // El viático ya está DENTRO de la CC — no se suma, se descuenta
    const saldoReal  = saldoCC !== null ? saldoCC - viatGastos : null;
    const ccLibre    = saldoCC !== null ? saldoCC - viatMonto  : null;
    const isAdmin = user.is_admin;

    let html = `
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;font-weight:500">
        Bienvenido, <strong style="color:var(--text)">${user.nombre}</strong>
        ${isAdmin ? '<span class="badge badge-active" style="margin-left:6px;font-size:10px">Admin</span>' : ''}
      </p>

      <!-- Saldo total hero -->
      <div class="hero-card">
        <div class="hc-label">Saldo Total en Cuenta</div>
        <div class="hc-value">${saldoReal !== null ? CLP(saldoReal) : '—'}</div>
        <div class="hc-sub" style="display:flex;gap:16px;margin-top:10px">
          <span>CC libre: <strong style="color:white">${ccLibre !== null ? CLP(ccLibre) : '—'}</strong></span>
          <span>Viático: <strong style="color:white">${saldoViat !== null ? CLP(saldoViat) : '—'}</strong></span>
        </div>
      </div>`;

    /* Accesos rápidos */
    html += `<div class="section-header"><span class="section-title">Acceso rápido</span></div>
    <div class="quick-actions" style="grid-template-columns:${isAdmin ? 'repeat(3,1fr)' : '1fr 1fr'};margin-bottom:16px">
      <button class="qa-btn" onclick="App.navigate('account')">
        <span class="qa-icon">💳</span><span class="qa-label">Cuenta CC</span>
      </button>
      <button class="qa-btn" onclick="App.navigate('viatico')">
        <span class="qa-icon">📋</span><span class="qa-label">Viático</span>
      </button>
      ${isAdmin ? `<button class="qa-btn" onclick="App.navigate('admin')">
        <span class="qa-icon">⚙️</span><span class="qa-label">Admin</span>
      </button>` : ''}
    </div>`;

    /* Estado viático activo */
    if (_viatico) {
      html += `<div class="section-header"><span class="section-title">Viático activo</span></div>
      <div class="card" style="padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div>
            <div style="font-weight:800;font-size:15px;color:var(--text)">${_viatico.project_nombre || 'Proyecto'}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">${_viatico.client_nombre || 'Cliente'} · ${_viatico.action_type_nombre || 'Acción'}</div>
          </div>
          <span class="badge badge-active">Activo</span>
        </div>
        <div class="stat-row" style="margin-bottom:12px">
          <div class="stat-box">
            <div class="sb-label">Asignado</div>
            <div class="sb-value">${CLP(_viatico.monto_asignado)}</div>
          </div>
          <div class="stat-box">
            <div class="sb-label">Saldo</div>
            <div class="sb-value" style="color:${_viatico.saldo_actual >= 0 ? 'var(--success)' : 'var(--danger)'}">${CLP(_viatico.saldo_actual)}</div>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" style="width:100%" onclick="App.navigate('viatico')">Ver detalle del viático →</button>
      </div>`;
    } else {
      html += `<div class="card" style="text-align:center;padding:24px;border:2px dashed var(--border)">
        <div style="font-size:36px;margin-bottom:8px">📋</div>
        <div style="font-weight:700;margin-bottom:4px;color:var(--text)">Sin viático activo</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:14px">Inicia un viático para registrar gastos</div>
        <button class="btn btn-primary" onclick="App.navigate('viatico')">Iniciar viático</button>
      </div>`;
    }

    if (!_account) {
      html += `<div class="card" style="margin-top:10px;border:2px dashed var(--primary-mid);text-align:center;padding:20px">
        <div style="font-size:32px;margin-bottom:8px">💳</div>
        <div style="font-weight:700;margin-bottom:4px">Cuenta corriente no inicializada</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:14px">Carga el saldo actual de tu cuenta</div>
        <button class="btn btn-primary" onclick="App.navigate('account')">Inicializar cuenta</button>
      </div>`;
    }

    /* Últimos movimientos */
    const allMovs = [
      ...(_account?.movements || []).slice(-3).map(m => ({...m, _src:'cc'})),
      ...(_viatico?.movements || []).slice(-3).map(m => ({...m, _src:'viat'})),
    ].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).slice(0,5);

    if (allMovs.length) {
      html += `<div class="section-header" style="margin-top:8px"><span class="section-title">Últimos movimientos</span></div>
      <div class="card" style="padding:6px 16px">
        <ul class="mv-list">`;
      for (const m of allMovs) html += renderMvItem(m);
      html += `</ul></div>`;
    }

    document.getElementById("dash-content").innerHTML = html;
  }

  function renderMvItem(m) {
    const icons = { giro:'💵', compra:'🛒', ingreso:'📥', gasto:'📝' };
    const isPos = m.tipo === 'ingreso';
    return `<li class="mv-item">
      <div class="mv-icon ${m.tipo}">${icons[m.tipo] || '📄'}</div>
      <div class="mv-info">
        <div class="mv-concepto">${m.concepto}</div>
        <div class="mv-fecha">${fmtDate(m.fecha)}</div>
      </div>
      <div class="mv-monto ${isPos ? 'pos' : 'neg'}">${isPos ? '+' : '-'}${CLP(m.monto)}</div>
    </li>`;
  }

  function bind() {
    document.getElementById("dash-logout-btn")?.addEventListener("click", () => App.logout());
    load();
  }

  return { render, bind, load };
})();
