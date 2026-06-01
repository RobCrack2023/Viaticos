const ViaticoPage = (() => {
  let _viatico = null;
  let _editId = null;
  let _tab = "movimientos";

  function render() {
    return `
      <div class="topbar">
        <button class="back-btn" onclick="App.navigate('dashboard')">‹</button>
        <h1>Viático</h1>
        <div style="display:flex;gap:6px">
          <button class="menu-btn" id="viat-add-btn" style="display:none" title="Agregar">＋</button>
          <button class="menu-btn" id="viat-hist-btn" title="Historial" style="font-size:16px">📋</button>
          <button class="menu-btn" id="viat-pwd-btn"  title="Cambiar clave" style="font-size:16px">🔑</button>
          <button class="menu-btn" id="viat-logout-btn" style="font-size:13px;font-weight:700">Salir</button>
        </div>
      </div>
      <div class="content" id="viat-content">
        <div style="text-align:center;padding:40px;color:var(--muted)">Cargando...</div>
      </div>

      <!-- Modal movimiento viático -->
      <div class="modal-overlay" id="vmv-modal">
        <div class="modal">
          <div class="modal-title">
            <span id="vmv-modal-title">Nuevo movimiento</span>
            <button class="modal-close" onclick="ViaticoPage.closeModal()">✕</button>
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <select id="vmv-tipo" class="form-control">
              <option value="gasto">📝 Gasto</option>
              <option value="giro">💵 Giro efectivo</option>
            </select>
          </div>
          <div class="form-group">
            <label>Categoria</label>
            <select id="vmv-categoria" class="form-control">
              <option>Hotel/Alojamiento</option>
              <option>Alimentacion</option>
              <option>Transporte</option>
              <option>Combustible</option>
              <option>Peajes</option>
              <option>Materiales</option>
              <option>Comunicaciones</option>
              <option selected>Otros</option>
            </select>
          </div>
          <div class="form-group">
            <label>Concepto</label>
            <input id="vmv-concepto" type="text" class="form-control" placeholder="Ej: Hotel, Comida, Taxi...">
          </div>
          <div class="form-group">
            <label>N° Boleta / Factura (opcional)</label>
            <input id="vmv-numero-doc" type="text" class="form-control" placeholder="Ej: 001234">
          </div>
          <div class="form-group">
            <label>Monto ($)</label>
            <input id="vmv-monto" type="number" class="form-control" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>Fecha</label>
            <input id="vmv-fecha" type="date" class="form-control">
          </div>
          <div class="form-group">
            <label class="foto-btn" for="vmv-foto-input">📷 Adjuntar foto boleta/factura</label>
            <input id="vmv-foto-input" type="file" accept="image/*" capture="environment" style="display:none">
            <img id="vmv-foto-preview" class="foto-preview" style="display:none">
          </div>
          <button class="btn btn-primary" id="vmv-save-btn" onclick="ViaticoPage.saveMovement()">Guardar</button>
        </div>
      </div>

      <!-- Modal editar viático (una vez) -->
      <div class="modal-overlay" id="edit-modal">
        <div class="modal">
          <div class="modal-title">
            <span>Editar viático <small style="font-size:12px;color:var(--warning)">(solo una vez)</small></span>
            <button class="modal-close" onclick="document.getElementById('edit-modal').classList.remove('open')">✕</button>
          </div>
          <div id="edit-modal-body"></div>
          <button class="btn btn-primary" id="edit-save-btn" onclick="ViaticoPage.saveEdit()">Guardar cambios</button>
        </div>
      </div>

      <!-- Modal monto adicional -->
      <div class="modal-overlay" id="adicional-modal">
        <div class="modal">
          <div class="modal-title">
            <span>Agregar monto adicional</span>
            <button class="modal-close" onclick="document.getElementById('adicional-modal').classList.remove('open')">✕</button>
          </div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Agrega fondos extra al viático cuando el monto original no es suficiente.</p>
          <div class="form-group">
            <label>Monto adicional ($)</label>
            <input id="adic-monto" type="number" class="form-control" placeholder="0" min="1">
          </div>
          <div class="form-group">
            <label>Motivo (opcional)</label>
            <input id="adic-motivo" type="text" class="form-control" placeholder="Ej: Extensión del proyecto">
          </div>
          <button class="btn btn-primary" id="adic-save-btn" onclick="ViaticoPage.saveAdicional()">Agregar fondos</button>
        </div>
      </div>

      <!-- Modal cambio de contraseña -->
      <div class="modal-overlay" id="pwd-modal">
        <div class="modal">
          <div class="modal-title">
            <span>Cambiar contraseña</span>
            <button class="modal-close" onclick="document.getElementById('pwd-modal').classList.remove('open')">✕</button>
          </div>
          <div class="form-group">
            <label>Contraseña actual</label>
            <input id="pwd-current" type="password" class="form-control" placeholder="••••••••">
          </div>
          <div class="form-group">
            <label>Nueva contraseña</label>
            <input id="pwd-new" type="password" class="form-control" placeholder="Minimo 6 caracteres">
          </div>
          <div class="form-group">
            <label>Repetir nueva contraseña</label>
            <input id="pwd-repeat" type="password" class="form-control" placeholder="••••••••">
          </div>
          <button class="btn btn-primary" id="pwd-save-btn" onclick="ViaticoPage.savePassword()">Cambiar contraseña</button>
        </div>
      </div>

      <!-- Modal historial de viaticos -->
      <div class="modal-overlay" id="hist-modal">
        <div class="modal">
          <div class="modal-title">
            <span>Mis viáticos anteriores</span>
            <button class="modal-close" onclick="document.getElementById('hist-modal').classList.remove('open')">✕</button>
          </div>
          <div id="hist-content" style="text-align:center;padding:20px;color:var(--muted)">Cargando...</div>
        </div>
      </div>

      <!-- Modal cerrar viático -->
      <div class="modal-overlay" id="close-modal">
        <div class="modal">
          <div class="modal-title">
            <span>Cerrar viático</span>
            <button class="modal-close" onclick="document.getElementById('close-modal').classList.remove('open')">✕</button>
          </div>
          <div id="close-preview"></div>
          <div class="form-group" style="margin-top:16px">
            <label>Observaciones finales (opcional)</label>
            <textarea id="close-obs" class="form-control" rows="3" placeholder="Notas adicionales..."></textarea>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-outline" onclick="document.getElementById('close-modal').classList.remove('open')">Volver a editar</button>
            <button class="btn btn-danger" id="close-confirm-btn" onclick="ViaticoPage.confirmClose()">Cerrar definitivo</button>
          </div>
        </div>
      </div>`;
  }

  async function load() {
    try {
      _viatico = await API.getActiveViatico();
      renderActive();
    } catch (_) {
      renderNoViatico();
    }
  }

  function renderNoViatico() {
    document.getElementById("viat-add-btn").style.display = "none";
    document.getElementById("viat-content").innerHTML = `
      <div class="card">
        <div class="card-title">Iniciar nuevo viático</div>
        <div class="form-group">
          <label>Cliente</label>
          <select id="viat-client" class="form-control"><option>Cargando...</option></select>
        </div>
        <div class="form-group">
          <label>Proyecto</label>
          <select id="viat-project" class="form-control"><option>Selecciona cliente primero</option></select>
        </div>
        <div class="form-group">
          <label>Tipo de acción</label>
          <select id="viat-action" class="form-control"><option>Cargando...</option></select>
        </div>
        <div class="form-group">
          <label>Monto asignado ($)</label>
          <input id="viat-monto" type="number" class="form-control" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label>Fecha inicio</label>
          <input id="viat-fecha" type="date" class="form-control" value="${today()}">
        </div>
        <button class="btn btn-primary" onclick="ViaticoPage.createViatico()">Iniciar viático</button>
      </div>`;
    loadSelects();
  }

  async function loadSelects() {
    const [clients, actionTypes] = await Promise.all([API.selectClients(), API.selectActionTypes()]);
    const cSel = document.getElementById("viat-client");
    cSel.innerHTML = `<option value="">Selecciona cliente</option>` +
      clients.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("");
    cSel.addEventListener("change", async () => {
      const pSel = document.getElementById("viat-project");
      if (!cSel.value) { pSel.innerHTML = `<option>Selecciona cliente primero</option>`; return; }
      const projects = await API.selectProjects(cSel.value);
      pSel.innerHTML = `<option value="">Selecciona proyecto</option>` +
        projects.map(p => `<option value="${p.id}">${p.nombre}</option>`).join("");
    });
    document.getElementById("viat-action").innerHTML =
      `<option value="">Selecciona tipo</option>` +
      actionTypes.map(a => `<option value="${a.id}">${a.nombre}</option>`).join("");
  }

  function renderActive() {
    const v = _viatico;
    const saldo = v.saldo_actual;
    const total = v.total_gastos;
    document.getElementById("viat-add-btn").style.display = "";
    const isClosed = v.status === "cerrado";

    let html = `
      <div class="card" style="background:var(--primary);color:white">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="sc-label" style="color:rgba(255,255,255,.7)">Saldo Viático</div>
            <div class="sc-value" style="color:white;font-size:32px">${CLP(saldo)}</div>
            <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px">Asignado: ${CLP(v.monto_asignado)}</div>
          </div>
          <span class="badge ${isClosed ? 'badge-closed' : 'badge-active'}" style="margin-top:4px">${v.status}</span>
        </div>
      </div>

      <!-- Info viático -->
      <div class="card" style="padding:14px 16px">
        ${infoRow('📁 Proyecto', v.project_id)}
        ${infoRow('🏢 Cliente', v.client_id)}
        ${infoRow('⚙️ Acción', v.action_type_id)}
        ${infoRow('📅 Inicio', fmtDate(v.fecha_inicio))}
        ${v.fecha_cierre ? infoRow('📅 Cierre', fmtDate(v.fecha_cierre)) : ''}
      </div>

      <div class="saldo-grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="card" style="margin:0;padding:12px">
          <div class="sc-label">Total gastos</div>
          <div style="font-weight:700;color:var(--danger)">${CLP(total)}</div>
        </div>
        <div class="card" style="margin:0;padding:12px">
          <div class="sc-label">Saldo restante</div>
          <div style="font-weight:700;color:${saldo >= 0 ? 'var(--success)' : 'var(--danger)'}">${CLP(saldo)}</div>
        </div>
      </div>`;

    // Alerta de saldo bajo (≤ 20% del asignado o negativo)
    if (!isClosed && v.monto_asignado > 0) {
      const pctRestante = (v.saldo_actual / v.monto_asignado) * 100;
      if (v.saldo_actual < 0) {
        html += `<div style="background:#FEE2E2;border:1.5px solid #FECACA;border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:10px;display:flex;gap:8px;align-items:center">
          <span style="font-size:20px">🚨</span>
          <div>
            <div style="font-weight:700;color:var(--danger);font-size:13px">Saldo del viático en negativo</div>
            <div style="font-size:12px;color:var(--danger)">Has gastado ${CLP(Math.abs(v.saldo_actual))} más del monto asignado</div>
          </div>
        </div>`;
      } else if (pctRestante <= 20) {
        html += `<div style="background:var(--warning-light);border:1.5px solid #FDE68A;border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:10px;display:flex;gap:8px;align-items:center">
          <span style="font-size:20px">⚠️</span>
          <div>
            <div style="font-weight:700;color:var(--warning);font-size:13px">Saldo bajo — queda el ${pctRestante.toFixed(0)}%</div>
            <div style="font-size:12px;color:var(--warning)">Solo ${CLP(v.saldo_actual)} disponibles del viático</div>
          </div>
        </div>`;
      }
    }

    if (!isClosed) {
      const yaEditado = v.editado === 1;
      const montoOriginal = v.monto_asignado - (v.monto_adicional || 0);

      // Botones editar y agregar fondos
      html += `<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" style="flex:1" onclick="ViaticoPage.openEdit()"
          ${yaEditado ? 'disabled style="flex:1;opacity:.5;cursor:not-allowed" title="Ya fue editado"' : ''}>
          ✏️ ${yaEditado ? 'Ya editado' : 'Editar viático'}
        </button>
        <button class="btn btn-outline btn-sm" style="flex:1" onclick="ViaticoPage.openAdicional()">
          💰 Agregar fondos
        </button>
      </div>`;

      // Detalle de monto si hay adicionales
      if (v.monto_adicional > 0) {
        html += `<div class="card" style="padding:12px 14px;margin-bottom:10px;background:var(--primary-light);border:1px solid var(--primary-mid)">
          <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Detalle monto asignado</div>
          <div style="font-size:13px;display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:var(--muted)">Original:</span><span>${CLP(montoOriginal)}</span></div>
          <div style="font-size:13px;display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:var(--muted)">Adicional:</span><span style="color:var(--success);font-weight:700">+${CLP(v.monto_adicional)}</span></div>
          <div style="font-size:14px;font-weight:800;display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid var(--primary-mid)"><span>Total:</span><span>${CLP(v.monto_asignado)}</span></div>
        </div>`;
      }

      html += `<button class="btn btn-outline" style="margin-bottom:12px;width:100%" onclick="ViaticoPage.previewClose()">
        👁️ Vista previa / Cerrar viático
      </button>`;
    } else {
      const devuelve = saldo >= 0;
      html += `<div class="resultado-box ${devuelve ? 'devuelve' : 'cobra'}">
        <div class="resultado-label">${devuelve ? '⬆ Debe devolver' : '⬇ A reembolsar'}</div>
        <div class="resultado-monto">${CLP(Math.abs(saldo))}</div>
      </div>`;
      html += `<div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-outline" style="flex:1"
          onclick="App.downloadFile('/api/reports/${v.id}/pdf','rendicion_viatico_${v.id}.pdf')">
          📄 PDF
        </button>
        <button class="btn btn-outline" style="flex:1"
          onclick="App.downloadFile('/api/reports/${v.id}/excel','rendicion_viatico_${v.id}.xlsx')">
          📊 Excel
        </button>
      </div>`;
    }

    html += `<div class="section-header" style="margin-top:8px">
      <span class="section-title">Movimientos del viático</span>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <input id="vmv-search" type="search" class="form-control" placeholder="🔍 Buscar..."
        oninput="ViaticoPage.filterMovements()" style="flex:1">
      <select id="vmv-filter" class="form-control" style="width:130px" onchange="ViaticoPage.filterMovements()">
        <option value="">Todos</option>
        <option value="gasto">Gastos</option>
        <option value="giro">Giros</option>
      </select>
    </div>`;

    const movs = v.movements || [];
    if (!movs.length) {
      html += `<div class="empty-state"><div class="icon">📭</div><p>Sin movimientos aún</p></div>`;
    } else {
      html += `<div class="card" style="padding:8px 16px"><ul class="mv-list">`;
      for (const m of [...movs].reverse()) {
        const icons = { giro: '💵', gasto: '📝' };
        html += `<li class="mv-item" data-id="${m.id}" data-tipo="${m.tipo}" data-text="${(m.concepto+' '+(m.numero_doc||'')+' '+(m.categoria||'')).toLowerCase()}">
          <div class="mv-icon ${m.tipo}">${icons[m.tipo] || '📄'}</div>
          <div class="mv-info">
            <div class="mv-concepto">${m.concepto}</div>
            <div class="mv-fecha">${fmtDate(m.fecha)} ${m.categoria && m.categoria!=='Otros' ? `· ${m.categoria}` : ''}</div>
            ${m.numero_doc ? `<div style="font-size:11px;color:var(--muted)">N° ${m.numero_doc}</div>` : ''}
            <div style="display:flex;gap:6px;align-items:center;margin-top:2px">
              ${m.foto_path ? `<span style="font-size:11px;color:var(--primary)">📎</span>` : ''}
              ${!isClosed ? `<label style="font-size:11px;color:var(--primary);cursor:pointer" title="Agregar foto">
                📎+ <input type="file" accept="image/*" capture="environment" style="display:none"
                  onchange="ViaticoPage.addFoto(${m.id},this)">
              </label>` : ''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <div class="mv-monto neg">-${CLP(m.monto)}</div>
            ${!isClosed ? `<div class="mv-actions">
              <button class="btn btn-ghost btn-sm" style="padding:4px" onclick="ViaticoPage.editMovement(${m.id})">✏️</button>
              <button class="btn btn-ghost btn-sm" style="padding:4px" onclick="ViaticoPage.deleteMovement(${m.id})">🗑️</button>
            </div>` : ''}
          </div>
        </li>`;
      }
      html += `</ul></div>`;
    }

    document.getElementById("viat-content").innerHTML = html;
    document.getElementById("viat-add-btn").style.display = isClosed ? "none" : "";
  }

  function infoRow(label, val) {
    return `<div style="display:flex;gap:8px;margin-bottom:6px;font-size:13px">
      <span style="color:var(--muted);min-width:100px">${label}</span>
      <span style="font-weight:600">${val}</span>
    </div>`;
  }

  function openModal(mv = null) {
    _editId = mv ? mv.id : null;
    document.getElementById("vmv-modal-title").textContent = mv ? "Editar movimiento" : "Nuevo movimiento";
    document.getElementById("vmv-tipo").value = mv?.tipo || "gasto";
    document.getElementById("vmv-categoria").value = mv?.categoria || "Otros";
    document.getElementById("vmv-concepto").value = mv?.concepto || "";
    document.getElementById("vmv-numero-doc").value = mv?.numero_doc || "";
    document.getElementById("vmv-monto").value = mv?.monto || "";
    document.getElementById("vmv-fecha").value = mv ? mv.fecha.substring(0, 10) : today();
    document.getElementById("vmv-foto-preview").style.display = "none";
    document.getElementById("vmv-modal").classList.add("open");
  }

  function closeModal() {
    document.getElementById("vmv-modal").classList.remove("open");
    _editId = null;
  }

  async function saveMovement() {
    const tipo = document.getElementById("vmv-tipo").value;
    const concepto = document.getElementById("vmv-concepto").value.trim();
    const monto = parseFloat(document.getElementById("vmv-monto").value);
    const fecha = document.getElementById("vmv-fecha").value;
    if (!concepto || concepto.length < 2) return App.toast("Ingresa un concepto válido (mínimo 2 caracteres)");
    if (!monto || monto <= 0) return App.toast("Ingresa un monto válido mayor a 0");

    const btn = document.getElementById("vmv-save-btn");
    btn.disabled = true;
    try {
      const categoria  = document.getElementById("vmv-categoria").value;
      const numero_doc = document.getElementById("vmv-numero-doc").value.trim() || null;
      const data = { tipo, concepto, monto, categoria, numero_doc, fecha: fecha ? fecha + "T12:00:00" : undefined };
      let mv;
      if (_editId) {
        mv = await API.updateViaticoMovement(_editId, data);
      } else {
        mv = await API.addViaticoMovement(data);
      }

      // Actualización optimista si quedó en cola offline
      if (mv?.__queued) {
        const cached = await DB.getCache("viatico_active") || _viatico;
        if (cached) {
          const fakeMv = { id: Date.now(), ...data, fecha: data.fecha || new Date().toISOString(), created_at: new Date().toISOString(), foto_path: null, __pending: true };
          cached.movements = [...(cached.movements || []), fakeMv];
          cached.total_gastos = (cached.total_gastos || 0) + monto;
          cached.saldo_actual = cached.monto_asignado - cached.total_gastos;
          await DB.saveCache("viatico_active", cached);
          _viatico = cached;
        }
        // Guardar foto en IndexedDB si la hay
        const fotoOffline = document.getElementById("vmv-foto-input")?.files[0];
        if (fotoOffline && mv.__opId) {
          const b64 = await API._fileToBase64(fotoOffline);
          await DB.updateOp(mv.__opId, {
            photoData: b64,
            photoName: fotoOffline.name,
            photoPath: "/viaticos/movements/{id}/foto",
          });
        }
        closeModal();
        renderActive();
        App.toast("⏳ Sin conexión — guardado localmente, se sincronizará");
        return;
      }

      const fotoInput = document.getElementById("vmv-foto-input");
      const fotoFile = fotoInput._scannedFile || fotoInput.files[0];
      if (fotoFile && mv?.id) {
        await API.uploadFotoViatico(mv.id, fotoFile);
      }
      closeModal();
      await load();
      App.toast("Guardado");
    } catch (err) {
      App.toast("Error: " + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  // ── Cambio de contraseña ─────────────────────────────────────────────────
  function openPassword() {
    document.getElementById("pwd-current").value = "";
    document.getElementById("pwd-new").value = "";
    document.getElementById("pwd-repeat").value = "";
    document.getElementById("pwd-modal").classList.add("open");
  }

  async function savePassword() {
    const current   = document.getElementById("pwd-current").value;
    const newPwd    = document.getElementById("pwd-new").value;
    const repeat    = document.getElementById("pwd-repeat").value;
    if (!current || !newPwd) return App.toast("Completa todos los campos");
    if (newPwd.length < 6)   return App.toast("Minimo 6 caracteres");
    if (newPwd !== repeat)   return App.toast("Las contraseñas no coinciden");
    const btn = document.getElementById("pwd-save-btn");
    btn.disabled = true;
    try {
      await API.changePassword(current, newPwd);
      document.getElementById("pwd-modal").classList.remove("open");
      App.toast("Contraseña cambiada correctamente");
    } catch (err) {
      App.toast("Error: " + err.message);
    } finally { btn.disabled = false; }
  }

  // ── Historial de viáticos ─────────────────────────────────────────────────
  async function openHistorial() {
    document.getElementById("hist-modal").classList.add("open");
    document.getElementById("hist-content").innerHTML = `<div style="color:var(--muted)">Cargando...</div>`;
    try {
      const todos = await API.listViaticos();
      const cerrados = todos.filter(v => v.status === "cerrado");
      if (!cerrados.length) {
        document.getElementById("hist-content").innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>Sin viáticos anteriores</p></div>`;
        return;
      }
      let html = "";
      for (const v of cerrados) {
        const devuelve = v.saldo_actual >= 0;
        html += `<div class="card" style="padding:14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <div>
              <div style="font-weight:700;font-size:14px">${v.project_nombre || 'Proyecto'}</div>
              <div style="font-size:11px;color:var(--muted)">${v.client_nombre} · ${fmtDate(v.fecha_inicio)} → ${fmtDate(v.fecha_cierre)}</div>
            </div>
            <span class="badge badge-closed">Cerrado</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
            <span>Asignado: <strong>${CLP(v.monto_asignado)}</strong></span>
            <span>Gastado: <strong style="color:var(--danger)">${CLP(v.total_gastos)}</strong></span>
          </div>
          <div class="resultado-box ${devuelve?'devuelve':'cobra'}" style="padding:8px;margin:0 0 8px">
            <div class="resultado-label">${devuelve ? 'Devolvio' : 'Cobro'}</div>
            <div class="resultado-monto" style="font-size:20px">${CLP(Math.abs(v.saldo_actual))}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" style="flex:1"
              onclick="App.downloadFile('/api/reports/${v.id}/pdf','rendicion_${v.id}.pdf')">📄 PDF</button>
            <button class="btn btn-outline btn-sm" style="flex:1"
              onclick="App.downloadFile('/api/reports/${v.id}/excel','rendicion_${v.id}.xlsx')">📊 Excel</button>
          </div>
        </div>`;
      }
      document.getElementById("hist-content").innerHTML = html;
    } catch (err) {
      document.getElementById("hist-content").innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
    }
  }

  async function addFoto(mvId, input) {
    const file = input.files[0];
    if (!file) return;
    Scanner.showUI(file, async (enhanced) => {
      try {
        await API.addFotoViatico(mvId, enhanced);
        await load();
        App.toast("Foto agregada");
      } catch (err) { App.toast("Error: " + err.message); }
    });
  }

  function filterMovements() {
    const q    = (document.getElementById("vmv-search")?.value || "").toLowerCase();
    const tipo = document.getElementById("vmv-filter")?.value || "";
    const items = document.querySelectorAll(".mv-item[data-id]");
    let visible = 0;
    items.forEach(el => {
      const show = (!q || (el.dataset.text||"").includes(q)) && (!tipo || el.dataset.tipo === tipo);
      el.style.display = show ? "" : "none";
      if (show) visible++;
    });
  }

  async function openEdit() {
    const v = _viatico;
    const [clients, projects, actionTypes] = await Promise.all([
      API.selectClients(), API.selectProjects(v.client_id), API.selectActionTypes()
    ]);
    const allProjects = await API.selectProjects();

    document.getElementById("edit-modal-body").innerHTML = `
      <div class="form-group">
        <label>Cliente</label>
        <select id="edit-client" class="form-control">
          ${clients.map(c => `<option value="${c.id}" ${c.id===v.client_id?'selected':''}>${c.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Proyecto</label>
        <select id="edit-project" class="form-control">
          ${allProjects.map(p => `<option value="${p.id}" ${p.id===v.project_id?'selected':''}>${p.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tipo de acción</label>
        <select id="edit-action" class="form-control">
          ${actionTypes.map(a => `<option value="${a.id}" ${a.id===v.action_type_id?'selected':''}>${a.nombre}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Monto asignado ($)</label>
        <input id="edit-monto" type="number" class="form-control" value="${v.monto_asignado}" min="0">
      </div>
      <div class="form-group">
        <label>Fecha inicio</label>
        <input id="edit-fecha" type="date" class="form-control" value="${v.fecha_inicio?.substring(0,10)||today()}">
      </div>
      <div class="form-group">
        <label>Observaciones</label>
        <textarea id="edit-obs" class="form-control" rows="2">${v.observaciones||''}</textarea>
      </div>
      <div style="background:var(--warning-light);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--warning)">
        ⚠️ Esta edición solo puede realizarse <strong>una vez</strong>. Verifica bien los datos antes de guardar.
      </div>`;
    document.getElementById("edit-modal").classList.add("open");
  }

  async function saveEdit() {
    const data = {
      client_id:      parseInt(document.getElementById("edit-client")?.value),
      project_id:     parseInt(document.getElementById("edit-project")?.value),
      action_type_id: parseInt(document.getElementById("edit-action")?.value),
      monto_asignado: parseFloat(document.getElementById("edit-monto")?.value),
      fecha_inicio:   document.getElementById("edit-fecha")?.value + "T12:00:00",
      observaciones:  document.getElementById("edit-obs")?.value?.trim() || null,
    };
    if (!data.monto_asignado || data.monto_asignado <= 0) return App.toast("Ingresa un monto válido");

    const btn = document.getElementById("edit-save-btn");
    btn.disabled = true;
    try {
      await API.editViatico(data);
      document.getElementById("edit-modal").classList.remove("open");
      await load();
      App.toast("Viático actualizado");
    } catch (err) {
      App.toast("Error: " + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  function openAdicional() {
    document.getElementById("adic-monto").value = "";
    document.getElementById("adic-motivo").value = "";
    document.getElementById("adicional-modal").classList.add("open");
  }

  async function saveAdicional() {
    const monto = parseFloat(document.getElementById("adic-monto").value);
    const motivo = document.getElementById("adic-motivo").value.trim();
    if (!monto || monto <= 0) return App.toast("Ingresa un monto mayor a 0");
    const btn = document.getElementById("adic-save-btn");
    btn.disabled = true;
    try {
      await API.addAdicional({ monto, motivo: motivo || null });
      document.getElementById("adicional-modal").classList.remove("open");
      await load();
      App.toast(`Fondos agregados: +${CLP(monto)}`);
    } catch (err) {
      App.toast("Error: " + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function previewClose() {
    const v = _viatico;
    const saldo = v.saldo_actual;
    const devuelve = saldo >= 0;
    document.getElementById("close-preview").innerHTML = `
      <div style="background:var(--bg);border-radius:8px;padding:14px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px">
          <span>Monto asignado:</span><strong>${CLP(v.monto_asignado)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px">
          <span>Total gastos:</span><strong style="color:var(--danger)">${CLP(v.total_gastos)}</strong>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
        <div class="resultado-box ${devuelve ? 'devuelve' : 'cobra'}" style="margin:0">
          <div class="resultado-label">${devuelve ? '⬆ Debe devolver' : '⬇ A reembolsar'}</div>
          <div class="resultado-monto">${CLP(Math.abs(saldo))}</div>
        </div>
      </div>`;
    document.getElementById("close-obs").value = v.observaciones || "";
    document.getElementById("close-modal").classList.add("open");
  }

  async function confirmClose() {
    const obs = document.getElementById("close-obs").value.trim();
    const btn = document.getElementById("close-confirm-btn");
    btn.disabled = true;
    try {
      await API.closeViatico({ observaciones: obs });
      document.getElementById("close-modal").classList.remove("open");
      await load();
      App.toast("✓ Viático cerrado");
    } catch (err) {
      App.toast("Error: " + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function createViatico() {
    const client_id = parseInt(document.getElementById("viat-client").value);
    const project_id = parseInt(document.getElementById("viat-project").value);
    const action_type_id = parseInt(document.getElementById("viat-action").value);
    const monto_asignado = parseFloat(document.getElementById("viat-monto").value);
    const fecha = document.getElementById("viat-fecha").value;

    if (!client_id)       return App.toast("Selecciona un cliente");
    if (!project_id)      return App.toast("Selecciona un proyecto");
    if (!action_type_id)  return App.toast("Selecciona un tipo de acción");
    if (!monto_asignado || monto_asignado <= 0) return App.toast("Ingresa un monto válido");
    if (!fecha)           return App.toast("Ingresa la fecha de inicio");

    try {
      await API.createViatico({ client_id, project_id, action_type_id, monto_asignado, fecha_inicio: fecha + "T12:00:00" });
      await load();
      App.toast("Viático iniciado");
    } catch (err) {
      App.toast("Error: " + err.message);
    }
  }

  async function editMovement(id) {
    const mv = _viatico.movements.find(m => m.id === id);
    if (mv) openModal(mv);
  }

  async function deleteMovement(id) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      await API.deleteViaticoMovement(id);
      await load();
      App.toast("✓ Eliminado");
    } catch (err) {
      App.toast("Error: " + err.message);
    }
  }

  function bind() {
    document.getElementById("viat-logout-btn")?.addEventListener("click", () => App.logout());
    document.getElementById("viat-hist-btn")?.addEventListener("click", () => openHistorial());
    document.getElementById("viat-pwd-btn")?.addEventListener("click",  () => openPassword());
    document.getElementById("viat-add-btn")?.addEventListener("click",  () => openModal());
    document.getElementById("vmv-foto-input")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      Scanner.showUI(file, (enhancedFile, previewUrl) => {
        document.getElementById("vmv-foto-input")._scannedFile = enhancedFile;
        const img = document.getElementById("vmv-foto-preview");
        img.src = previewUrl;
        img.style.display = "block";
      });
    });
    document.getElementById("vmv-modal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("vmv-modal")) closeModal();
    });
    load();
  }

  return { render, bind, load, closeModal, saveMovement, editMovement, deleteMovement, createViatico, previewClose, confirmClose, openModal, openEdit, saveEdit, openAdicional, saveAdicional, openPassword, savePassword, openHistorial, filterMovements, addFoto };
})();
