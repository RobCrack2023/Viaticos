const AdminViaticoPage = (() => {
  let _filter   = "cerrado";
  let _viaticos = [];   // guardamos para acceder en confirmDelete

  function render() {
    return `
      <div class="topbar">
        <h1>Viáticos</h1>
        <button class="menu-btn" id="av-logout-btn" style="font-size:14px;font-weight:700">Salir</button>
      </div>
      <div style="padding:12px 16px 0">
        <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
        <button class="btn btn-outline btn-sm"
          onclick="App.downloadFile('/api/admin/export/excel','viaticos_completo.xlsx')">
          📊 Exportar todo
        </button>
      </div>
      <div class="tabs">
          <button class="tab-btn ${_filter==='cerrado'?'active':''}" onclick="AdminViaticoPage.setFilter('cerrado',this)">Cerrados</button>
          <button class="tab-btn ${_filter==='activo'?'active':''}"  onclick="AdminViaticoPage.setFilter('activo',this)">Activos</button>
          <button class="tab-btn ${_filter===''?'active':''}"        onclick="AdminViaticoPage.setFilter('',this)">Todos</button>
        </div>
      </div>
      <div class="content" id="av-content" style="padding-top:0">
        <div style="text-align:center;padding:40px;color:var(--muted)">Cargando...</div>
      </div>`;
  }

  async function load() {
    try {
      _viaticos = await API.listAllViaticos(_filter || null);
      renderList();
    } catch (err) {
      document.getElementById("av-content").innerHTML =
        `<div class="empty-state"><div class="icon">⚠️</div><p>${err.message}</p></div>`;
    }
  }

  function renderList() {
    const el = document.getElementById("av-content");
    if (!_viaticos.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>No hay viáticos ${_filter ? `(${_filter}s)` : ''}</p></div>`;
      return;
    }

    let html = "";
    for (const v of _viaticos) {
      const isClosed = v.status === "cerrado";
      const devuelve = v.saldo_actual >= 0;
      html += `
        <div class="card" style="padding:16px;margin-bottom:10px">
          <!-- Cabecera -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div>
              <div style="font-weight:800;font-size:15px">${v.project_nombre || 'Sin proyecto'}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">
                👤 ${v.user_nombre} · 🏢 ${v.client_nombre}
              </div>
              <div style="font-size:12px;color:var(--muted)">
                ⚙️ ${v.action_type_nombre} · 📅 ${fmtDate(v.fecha_inicio)}
                ${v.fecha_cierre ? ` → ${fmtDate(v.fecha_cierre)}` : ''}
              </div>
            </div>
            <span class="badge ${isClosed ? 'badge-closed' : 'badge-active'}">${v.status}</span>
          </div>

          <!-- Montos -->
          <div class="stat-row" style="margin-bottom:${isClosed ? '10px' : '0'}">
            <div class="stat-box">
              <div class="sb-label">Asignado</div>
              <div class="sb-value">${CLP(v.monto_asignado)}</div>
            </div>
            <div class="stat-box">
              <div class="sb-label">Gastado</div>
              <div class="sb-value" style="color:var(--danger)">${CLP(v.total_gastos)}</div>
            </div>
          </div>

          <!-- Resultado (solo cerrados) -->
          ${isClosed ? `
          <div class="resultado-box ${devuelve ? 'devuelve' : 'cobra'}" style="margin-top:0;padding:12px">
            <div class="resultado-label">${devuelve ? 'Debe devolver' : 'A reembolsar'}</div>
            <div class="resultado-monto" style="font-size:24px">${CLP(Math.abs(v.saldo_actual))}</div>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn btn-outline btn-sm" style="flex:1"
              onclick="App.downloadFile('/api/reports/${v.id}/pdf','rendicion_viatico_${v.id}.pdf')">
              📄 PDF
            </button>
            <button class="btn btn-outline btn-sm" style="flex:1"
              onclick="App.downloadFile('/api/reports/${v.id}/excel','rendicion_viatico_${v.id}.xlsx')">
              📊 Excel
            </button>
            <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger);border:1.5px solid #FECACA"
              onclick="AdminViaticoPage.confirmDelete(${v.id},'${(v.user_nombre + ' - ' + v.project_nombre).replace(/'/g,'')}')">
              🗑️
            </button>
          </div>` : `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
            <div style="font-size:13px;color:var(--muted)">
              Saldo restante: <strong style="color:${v.saldo_actual>=0?'var(--success)':'var(--danger)'}">${CLP(v.saldo_actual)}</strong>
            </div>
            <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger);border:1.5px solid #FECACA"
              onclick="AdminViaticoPage.confirmDelete(${v.id},'${(v.user_nombre + ' - ' + v.project_nombre).replace(/'/g,'')}')">
              🗑️ Eliminar
            </button>
          </div>`}

          <!-- Detalle gastos colapsable -->
          ${v.movements?.length ? `
          <details style="margin-top:10px">
            <summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--primary)">
              Ver ${v.movements.length} movimiento(s)
            </summary>
            <ul class="mv-list" style="margin-top:8px">
              ${v.movements.map(m => `
                <li class="mv-item" style="padding:8px 0">
                  <div class="mv-icon ${m.tipo}" style="width:32px;height:32px;font-size:14px">
                    ${m.tipo==='giro'?'💵':'📝'}
                  </div>
                  <div class="mv-info">
                    <div class="mv-concepto">${m.concepto}</div>
                    <div class="mv-fecha">${fmtDate(m.fecha)}</div>
                  </div>
                  <div class="mv-monto neg">-${CLP(m.monto)}</div>
                </li>`).join('')}
            </ul>
          </details>` : ''}
        </div>`;
    }
    el.innerHTML = html;
  }

  async function confirmDelete(id, nombre) {
    if (!confirm(`¿Eliminar el viático de "${nombre}"?\n\nEsta acción eliminará todos los movimientos y fotos del viático.\nNo se puede deshacer.`)) return;
    if (!confirm(`CONFIRMACIÓN FINAL\n\n¿Seguro que deseas eliminar permanentemente el viático de "${nombre}"?`)) return;

    // Preguntar si también limpiar movimientos de CC del mismo período
    const cleanCC = confirm(
      `¿Deseas también eliminar los movimientos de Cuenta Corriente de ese período?\n\n` +
      `Responde SÍ solo si esos movimientos correspondían únicamente a este viático.\n` +
      `Si había otros gastos del banco en ese período, responde NO.`
    );

    try {
      await API.deleteViatico(id);

      if (cleanCC) {
        // Buscar el viático para saber las fechas (ya fue eliminado del server)
        // Usar los datos que ya tenemos en _viaticos
        const v = _viaticos.find(x => x.id === id);
        if (v) {
          await API.deleteAccountMovementsByPeriod(v.user_id, v.fecha_inicio, v.fecha_cierre || new Date().toISOString());
        }
      }

      App.toast("Viático eliminado correctamente");
      await load();
    } catch (err) {
      App.toast("Error: " + err.message);
    }
  }

  async function setFilter(filter, el) {
    _filter = filter;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
    document.getElementById("av-content").innerHTML =
      `<div style="text-align:center;padding:30px;color:var(--muted)">Cargando...</div>`;
    await load();
  }

  function bind() {
    document.getElementById("av-logout-btn")?.addEventListener("click", () => App.logout());
    load();
  }

  return { render, bind, setFilter, confirmDelete };
})();
