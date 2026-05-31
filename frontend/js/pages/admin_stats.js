const AdminStatsPage = (() => {
  let _stats = null;
  let _section = "usuario"; // usuario | proyecto | tipo

  function render() {
    return `
      <div class="topbar">
        <h1>Estadísticas</h1>
        <button class="menu-btn" id="as-logout-btn" style="font-size:14px;font-weight:700">Salir</button>
      </div>
      <div class="content" id="as-content">
        <div style="text-align:center;padding:40px;color:var(--muted)">Cargando...</div>
      </div>`;
  }

  async function load() {
    try {
      _stats = await API.getStats();
      renderContent();
    } catch (err) {
      document.getElementById("as-content").innerHTML =
        `<div class="empty-state"><div class="icon">⚠️</div><p>${err.message}</p></div>`;
    }
  }

  function renderContent() {
    const r = _stats.resumen;
    const efi = r.total_asignado > 0 ? ((r.total_gastado / r.total_asignado) * 100).toFixed(1) : 0;

    let html = `
      <!-- Tarjetas resumen -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div class="hero-card" style="grid-column:1/-1;padding:18px 20px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
            <div>
              <div class="hc-label">Total asignado en viáticos</div>
              <div class="hc-value">${CLP(r.total_asignado)}</div>
            </div>
            <div style="text-align:right">
              <div class="hc-label">Utilización</div>
              <div style="font-size:28px;font-weight:800;color:white">${efi}%</div>
            </div>
          </div>
          <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
            <span style="font-size:12px;color:rgba(255,255,255,.75)">Gastado: <strong style="color:white">${CLP(r.total_gastado)}</strong></span>
            <span style="font-size:12px;color:rgba(255,255,255,.75)">Diferencia: <strong style="color:${r.total_saldo>=0?'#86efac':'#fca5a5'}">${CLP(r.total_saldo)}</strong></span>
          </div>
          <!-- Barra de progreso -->
          <div style="background:rgba(255,255,255,.2);border-radius:999px;height:6px;margin-top:12px">
            <div style="background:white;height:6px;border-radius:999px;width:${Math.min(100,efi)}%;transition:width .5s"></div>
          </div>
        </div>

        <div class="stat-box">
          <div class="sb-label">Viáticos activos</div>
          <div class="sb-value" style="color:var(--success)">${r.activos}</div>
        </div>
        <div class="stat-box">
          <div class="sb-label">Viáticos cerrados</div>
          <div class="sb-value" style="color:var(--muted)">${r.cerrados}</div>
        </div>
      </div>

      <!-- Tabs de sección -->
      <div class="tabs">
        <button class="tab-btn ${_section==='usuario'?'active':''}" onclick="AdminStatsPage.setSection('usuario',this)">Por Usuario</button>
        <button class="tab-btn ${_section==='proyecto'?'active':''}" onclick="AdminStatsPage.setSection('proyecto',this)">Por Proyecto</button>
        <button class="tab-btn ${_section==='tipo'?'active':''}" onclick="AdminStatsPage.setSection('tipo',this)">Por Tipo</button>
      </div>

      <div id="as-section-content">
        ${renderSection()}
      </div>`;

    document.getElementById("as-content").innerHTML = html;
  }

  function renderSection() {
    if (_section === "usuario")   return renderTable(_stats.por_usuario,    ["Usuario","Viáticos","Asignado","Gastado","Diferencia"], row => [
      `<strong>${row.nombre}</strong><br><small style="color:var(--muted)">${row.activos} activo(s) · ${row.cerrados} cerrado(s)</small>`,
      row.total, CLP(row.asignado), CLP(row.gastado), diffCell(row.asignado - row.gastado)
    ]);
    if (_section === "proyecto")  return renderTable(_stats.por_proyecto,   ["Proyecto","Cliente","Viáticos","Asignado","Gastado","Diferencia"], row => [
      `<strong>${row.nombre}</strong>`, row.cliente, row.total, CLP(row.asignado), CLP(row.gastado), diffCell(row.asignado - row.gastado)
    ]);
    if (_section === "tipo")      return renderTable(_stats.por_tipo_accion,["Tipo de Acción","Viáticos","Asignado","Gastado","Diferencia"], row => [
      `<strong>${row.nombre}</strong>`, row.total, CLP(row.asignado), CLP(row.gastado), diffCell(row.asignado - row.gastado)
    ]);
    return "";
  }

  function diffCell(val) {
    const color = val >= 0 ? "var(--success)" : "var(--danger)";
    const sign  = val >= 0 ? "▼" : "▲";
    return `<span style="color:${color};font-weight:700">${sign} ${CLP(Math.abs(val))}</span>`;
  }

  function renderTable(rows, headers, rowFn) {
    if (!rows || !rows.length) return `<div class="empty-state"><div class="icon">📊</div><p>Sin datos</p></div>`;

    let html = `<div class="card" style="padding:0;overflow:hidden">
      <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:var(--primary)">
            ${headers.map(h => `<th style="padding:10px 12px;text-align:left;color:white;font-size:11px;font-weight:700;letter-spacing:.4px;white-space:nowrap">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>`;

    rows.forEach((row, i) => {
      const cells = rowFn(row);
      html += `<tr style="background:${i%2===0?'white':'var(--bg)'}">
        ${cells.map((c, ci) => `<td style="padding:10px 12px;border-bottom:1px solid var(--border);${ci===cells.length-1?'text-align:right':''}">${c}</td>`).join('')}
      </tr>`;
    });

    // Totales
    const totalAsig = rows.reduce((s,r) => s + r.asignado, 0);
    const totalGast = rows.reduce((s,r) => s + r.gastado, 0);
    html += `<tr style="background:var(--primary-light);font-weight:700">
        <td colspan="${headers.length-2}" style="padding:10px 12px;font-size:12px">TOTALES</td>
        <td style="padding:10px 12px">${CLP(totalAsig)}</td>
        <td style="padding:10px 12px">${CLP(totalGast)}</td>
        ${headers.length > 4 ? `<td style="padding:10px 12px;text-align:right">${diffCell(totalAsig-totalGast)}</td>` : ''}
      </tr>`;

    html += `</tbody></table></div></div>

      <!-- Leyenda -->
      <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:var(--muted);padding:0 2px">
        <span><span style="color:var(--success)">▼</span> Devuelve saldo</span>
        <span><span style="color:var(--danger)">▲</span> Se debe reembolsar</span>
      </div>`;

    return html;
  }

  function setSection(section, el) {
    _section = section;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
    const el2 = document.getElementById("as-section-content");
    if (el2) el2.innerHTML = renderSection();
  }

  function bind() {
    document.getElementById("as-logout-btn")?.addEventListener("click", () => App.logout());
    load();
  }

  return { render, bind, setSection };
})();
