const ViaticoPage = (() => {
  let _viatico = null;
  let _editId = null;
  let _tab = "movimientos";

  function render() {
    return `
      <div class="topbar">
        <button class="back-btn" onclick="App.navigate('dashboard')">‹</button>
        <h1>Viático</h1>
        <button class="menu-btn" id="viat-add-btn" style="display:none" title="Agregar">＋</button>
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
            <label>Concepto</label>
            <input id="vmv-concepto" type="text" class="form-control" placeholder="Ej: Hotel, Comida, Taxi...">
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

    if (!isClosed) {
      html += `<button class="btn btn-outline" style="margin-bottom:12px" onclick="ViaticoPage.previewClose()">
        👁️ Vista previa / Cerrar viático
      </button>`;
    } else {
      const devuelve = saldo >= 0;
      html += `<div class="resultado-box ${devuelve ? 'devuelve' : 'cobra'}">
        <div class="resultado-label">${devuelve ? '⬆ Debe devolver' : '⬇ A reembolsar'}</div>
        <div class="resultado-monto">${CLP(Math.abs(saldo))}</div>
      </div>`;
      html += `<div style="display:flex;gap:8px;margin-top:12px">
        <a class="btn btn-outline" href="/api/reports/${v.id}/pdf" target="_blank">📄 PDF</a>
        <a class="btn btn-outline" href="/api/reports/${v.id}/excel" target="_blank">📊 Excel</a>
      </div>`;
    }

    html += `<div class="section-header" style="margin-top:8px">
      <span class="section-title">Movimientos del viático</span>
    </div>`;

    const movs = v.movements || [];
    if (!movs.length) {
      html += `<div class="empty-state"><div class="icon">📭</div><p>Sin movimientos aún</p></div>`;
    } else {
      html += `<div class="card" style="padding:8px 16px"><ul class="mv-list">`;
      for (const m of [...movs].reverse()) {
        const icons = { giro: '💵', gasto: '📝' };
        html += `<li class="mv-item">
          <div class="mv-icon ${m.tipo}">${icons[m.tipo] || '📄'}</div>
          <div class="mv-info">
            <div class="mv-concepto">${m.concepto}</div>
            <div class="mv-fecha">${fmtDate(m.fecha)}</div>
            ${m.foto_path ? `<div style="font-size:11px;color:var(--primary)">📎 foto adjunta</div>` : ''}
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
    document.getElementById("vmv-concepto").value = mv?.concepto || "";
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
    if (!concepto || !monto) return App.toast("Completa todos los campos");

    const btn = document.getElementById("vmv-save-btn");
    btn.disabled = true;
    try {
      const data = { tipo, concepto, monto, fecha: fecha ? fecha + "T12:00:00" : undefined };
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
      if (fotoInput.files[0] && mv?.id) {
        await API.uploadFotoViatico(mv.id, fotoInput.files[0]);
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
    if (!client_id || !project_id || !action_type_id || !monto_asignado)
      return App.toast("Completa todos los campos");
    try {
      await API.createViatico({ client_id, project_id, action_type_id, monto_asignado, fecha_inicio: fecha + "T12:00:00" });
      await load();
      App.toast("✓ Viático iniciado");
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
    document.getElementById("viat-add-btn")?.addEventListener("click", () => openModal());
    document.getElementById("vmv-foto-input")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (r) => {
        const img = document.getElementById("vmv-foto-preview");
        img.src = r.target.result;
        img.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
    document.getElementById("vmv-modal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("vmv-modal")) closeModal();
    });
    load();
  }

  return { render, bind, load, closeModal, saveMovement, editMovement, deleteMovement, createViatico, previewClose, confirmClose, openModal };
})();
