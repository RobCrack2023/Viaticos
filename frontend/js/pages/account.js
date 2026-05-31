const AccountPage = (() => {
  let _account = null;
  let _editId = null;

  function render() {
    return `
      <div class="topbar">
        <button class="back-btn" onclick="App.navigate('dashboard')">‹</button>
        <h1>Cuenta Corriente</h1>
        <button class="menu-btn" id="acc-add-btn" title="Agregar">＋</button>
      </div>
      <div class="content" id="acc-content">
        <div style="text-align:center;padding:40px;color:var(--muted)">Cargando...</div>
      </div>

      <!-- Modal movimiento -->
      <div class="modal-overlay" id="mv-modal">
        <div class="modal">
          <div class="modal-title">
            <span id="mv-modal-title">Nuevo movimiento</span>
            <button class="modal-close" onclick="AccountPage.closeModal()">✕</button>
          </div>
          <div class="form-group">
            <label>Tipo</label>
            <select id="mv-tipo" class="form-control">
              <option value="ingreso">📥 Ingreso / Depósito</option>
              <option value="giro">💵 Giro efectivo</option>
              <option value="compra">🛒 Compra / Pago</option>
            </select>
          </div>
          <div class="form-group">
            <label>Concepto</label>
            <input id="mv-concepto" type="text" class="form-control" placeholder="Descripción del movimiento">
          </div>
          <div class="form-group">
            <label>Monto ($)</label>
            <input id="mv-monto" type="number" class="form-control" placeholder="0" min="0" step="1">
          </div>
          <div class="form-group">
            <label>Fecha</label>
            <input id="mv-fecha" type="date" class="form-control">
          </div>
          <div class="form-group">
            <label class="foto-btn" for="mv-foto-input">📷 Adjuntar foto boleta/factura</label>
            <input id="mv-foto-input" type="file" accept="image/*" capture="environment" style="display:none">
            <img id="mv-foto-preview" class="foto-preview" style="display:none">
          </div>
          <button class="btn btn-primary" id="mv-save-btn" onclick="AccountPage.saveMovement()">Guardar</button>
        </div>
      </div>

      <!-- Modal ajuste saldo -->
      <div class="modal-overlay" id="ajuste-modal">
        <div class="modal">
          <div class="modal-title">
            <span>Ajustar saldo base</span>
            <button class="modal-close" onclick="AccountPage.closeAjusteModal()">✕</button>
          </div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:16px">
            Usa esto para reflejar cargos automáticos, comisiones bancarias u otras diferencias con el extracto del banco.
          </p>
          <div class="form-group">
            <label>Nuevo saldo base ($)</label>
            <input id="ajuste-saldo" type="number" class="form-control" placeholder="0" min="0" step="1">
          </div>
          <div id="ajuste-preview" style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:14px;display:none">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span style="color:var(--muted)">Saldo actual:</span>
              <span id="ajuste-prev-actual" style="font-weight:700"></span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span style="color:var(--muted)">Diferencia:</span>
              <span id="ajuste-prev-diff" style="font-weight:700"></span>
            </div>
          </div>
          <button class="btn btn-primary" id="ajuste-save-btn" onclick="AccountPage.saveAjuste()">Guardar nuevo saldo</button>
        </div>
      </div>`;
  }

  async function load() {
    try {
      _account = await API.getAccount();
      if (!_account) {
        renderInit();
        return;
      }
      renderContent();
    } catch (err) {
      document.getElementById("acc-content").innerHTML =
        `<div class="empty-state"><div class="icon">⚠️</div><p>${err.message}</p></div>`;
    }
  }

  function renderInit() {
    document.getElementById("acc-content").innerHTML = `
      <div class="card">
        <div class="card-title">Inicializar Cuenta Corriente</div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Ingresa el saldo actual de tu cuenta corriente.</p>
        <div class="form-group">
          <label>Saldo inicial ($)</label>
          <input id="init-saldo" type="number" class="form-control" placeholder="0" min="0">
        </div>
        <button class="btn btn-primary" onclick="AccountPage.initAccount()">Inicializar</button>
      </div>`;
    document.getElementById("acc-add-btn").style.display = "none";
  }

  function renderContent() {
    const saldo = _account.saldo_actual;
    const movs = _account.movements || [];
    let html = `
      <div class="hero-card" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="hc-label">Saldo Cuenta Corriente</div>
            <div class="hc-value">${CLP(saldo)}</div>
            <div class="hc-sub">Saldo base: ${CLP(_account.saldo_inicial)}</div>
          </div>
          <button onclick="AccountPage.openAjusteSaldo()"
            style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);color:white;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;backdrop-filter:blur(4px)">
            Ajustar saldo
          </button>
        </div>
      </div>

      <!-- Resumen -->
      <div class="saldo-grid" style="grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        ${['ingreso','giro','compra'].map(t => {
          const total = movs.filter(m => m.tipo === t).reduce((s, m) => s + m.monto, 0);
          const labels = {ingreso:'Ingresos',giro:'Giros',compra:'Compras'};
          const colors = {ingreso:'var(--success)',giro:'var(--warning)',compra:'var(--danger)'};
          return `<div class="card" style="padding:10px;margin:0">
            <div class="sc-label" style="font-size:10px">${labels[t]}</div>
            <div style="font-weight:700;font-size:13px;color:${colors[t]}">${CLP(total)}</div>
          </div>`;
        }).join('')}
      </div>

      <div class="section-header">
        <span class="section-title">Movimientos</span>
      </div>`;

    if (!movs.length) {
      html += `<div class="empty-state"><div class="icon">📭</div><p>Sin movimientos aún</p></div>`;
    } else {
      html += `<div class="card" style="padding:8px 16px"><ul class="mv-list">`;
      for (const m of [...movs].reverse()) {
        const icons = { giro: '💵', compra: '🛒', ingreso: '📥' };
        const isPos = m.tipo === 'ingreso';
        html += `<li class="mv-item">
          <div class="mv-icon ${m.tipo}">${icons[m.tipo]}</div>
          <div class="mv-info">
            <div class="mv-concepto">${m.concepto}</div>
            <div class="mv-fecha">${fmtDate(m.fecha)}</div>
            ${m.foto_path ? `<div style="font-size:11px;color:var(--primary);margin-top:2px">📎 foto adjunta</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <div class="mv-monto ${isPos ? 'pos' : 'neg'}">${isPos ? '+' : '-'}${CLP(m.monto)}</div>
            <div class="mv-actions">
              <button class="btn btn-ghost btn-sm" style="padding:4px" onclick="AccountPage.editMovement(${m.id})">✏️</button>
              <button class="btn btn-ghost btn-sm" style="padding:4px" onclick="AccountPage.deleteMovement(${m.id})">🗑️</button>
            </div>
          </div>
        </li>`;
      }
      html += `</ul></div>`;
    }
    document.getElementById("acc-content").innerHTML = html;
    document.getElementById("acc-add-btn").style.display = "";
  }

  function openModal(mv = null) {
    _editId = mv ? mv.id : null;
    document.getElementById("mv-modal-title").textContent = mv ? "Editar movimiento" : "Nuevo movimiento";
    document.getElementById("mv-tipo").value = mv?.tipo || "ingreso";
    document.getElementById("mv-concepto").value = mv?.concepto || "";
    document.getElementById("mv-monto").value = mv?.monto || "";
    document.getElementById("mv-fecha").value = mv ? mv.fecha.substring(0, 10) : today();
    document.getElementById("mv-foto-preview").style.display = "none";
    document.getElementById("mv-modal").classList.add("open");
  }

  function closeModal() {
    document.getElementById("mv-modal").classList.remove("open");
    _editId = null;
  }

  async function saveMovement() {
    const tipo = document.getElementById("mv-tipo").value;
    const concepto = document.getElementById("mv-concepto").value.trim();
    const monto = parseFloat(document.getElementById("mv-monto").value);
    const fecha = document.getElementById("mv-fecha").value;
    if (!concepto || !monto) return App.toast("Completa todos los campos");

    const btn = document.getElementById("mv-save-btn");
    btn.disabled = true;
    try {
      const data = { tipo, concepto, monto, fecha: fecha ? fecha + "T12:00:00" : undefined };
      let mv;
      if (_editId) {
        mv = await API.updateMovement(_editId, data);
      } else {
        mv = await API.addMovement(data);
      }

      // Si quedó en cola offline — actualizar caché local y UI optimistamente
      if (mv?.__queued) {
        const cached = await DB.getCache("account") || _account;
        if (cached) {
          const fakeMv = { id: Date.now(), ...data, fecha: data.fecha || new Date().toISOString(), created_at: new Date().toISOString(), foto_path: null, __pending: true };
          cached.movements = [...(cached.movements || []), fakeMv];
          cached.saldo_actual = cached.saldo_inicial + cached.movements.reduce((s, m) => m.tipo === "ingreso" ? s + m.monto : s - m.monto, 0);
          await DB.saveCache("account", cached);
          _account = cached;
        }
        // Guardar foto en IndexedDB si la hay
        const fotoOffline = document.getElementById("mv-foto-input")?.files[0];
        if (fotoOffline && mv.__opId) {
          const b64 = await API._fileToBase64(fotoOffline);
          await DB.updateOp(mv.__opId, {
            photoData: b64,
            photoName: fotoOffline.name,
            photoPath: "/account/movements/{id}/foto",
          });
        }
        closeModal();
        renderContent();
        App.toast("⏳ Sin conexión — guardado localmente, se sincronizará");
        return;
      }

      // Subir foto si hay (solo con conexión)
      const fotoInput = document.getElementById("mv-foto-input");
      if (fotoInput.files[0] && mv?.id) {
        await API.uploadFotoMovement(mv.id, fotoInput.files[0]);
      }
      closeModal();
      await load();
      App.toast("Movimiento guardado");
    } catch (err) {
      App.toast("Error: " + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  function openAjusteSaldo() {
    const input = document.getElementById("ajuste-saldo");
    input.value = _account.saldo_inicial;
    document.getElementById("ajuste-preview").style.display = "none";
    input.addEventListener("input", () => {
      const nuevo = parseFloat(input.value);
      if (isNaN(nuevo)) { document.getElementById("ajuste-preview").style.display = "none"; return; }
      const diff = nuevo - _account.saldo_inicial;
      document.getElementById("ajuste-prev-actual").textContent = CLP(_account.saldo_inicial);
      document.getElementById("ajuste-prev-diff").textContent = (diff >= 0 ? "+" : "") + CLP(diff);
      document.getElementById("ajuste-prev-diff").style.color = diff >= 0 ? "var(--success)" : "var(--danger)";
      document.getElementById("ajuste-preview").style.display = "block";
    }, { once: false });
    document.getElementById("ajuste-modal").classList.add("open");
  }

  function closeAjusteModal() {
    document.getElementById("ajuste-modal").classList.remove("open");
  }

  async function saveAjuste() {
    const nuevo = parseFloat(document.getElementById("ajuste-saldo").value);
    if (isNaN(nuevo) || nuevo < 0) return App.toast("Ingresa un monto válido");
    const btn = document.getElementById("ajuste-save-btn");
    btn.disabled = true;
    try {
      await API.updateSaldo(nuevo);
      closeAjusteModal();
      await load();
      App.toast("Saldo actualizado");
    } catch (err) {
      App.toast("Error: " + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function initAccount() {
    const saldo = parseFloat(document.getElementById("init-saldo").value);
    if (isNaN(saldo)) return App.toast("Ingresa un saldo válido");
    try {
      await API.initAccount(saldo);
      await load();
      App.toast("✓ Cuenta inicializada");
    } catch (err) {
      App.toast("Error: " + err.message);
    }
  }

  async function editMovement(id) {
    const mv = _account.movements.find(m => m.id === id);
    if (mv) openModal(mv);
  }

  async function deleteMovement(id) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      await API.deleteMovement(id);
      await load();
      App.toast("✓ Eliminado");
    } catch (err) {
      App.toast("Error: " + err.message);
    }
  }

  function bind() {
    document.getElementById("acc-add-btn")?.addEventListener("click", () => openModal());
    document.getElementById("mv-foto-input")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (r) => {
        const img = document.getElementById("mv-foto-preview");
        img.src = r.target.result;
        img.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
    document.getElementById("mv-modal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("mv-modal")) closeModal();
    });
    document.getElementById("ajuste-modal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("ajuste-modal")) closeAjusteModal();
    });
    load();
  }

  return { render, bind, load, closeModal, saveMovement, editMovement, deleteMovement, initAccount, openModal, openAjusteSaldo, closeAjusteModal, saveAjuste };
})();
