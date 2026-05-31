const AdminPage = (() => {
  let _tab = "users";
  let _clients = [];

  function render() {
    return `
      <div class="topbar">
        <button class="back-btn" onclick="App.navigate('dashboard')">‹</button>
        <h1>Administración</h1>
        <button class="menu-btn" id="adm-add-btn" title="Agregar">＋</button>
      </div>
      <div style="padding:12px 16px 0">
        <div class="tabs">
          <button class="tab-btn active" data-tab="users" onclick="AdminPage.setTab('users',this)">Usuarios</button>
          <button class="tab-btn" data-tab="clients" onclick="AdminPage.setTab('clients',this)">Clientes</button>
          <button class="tab-btn" data-tab="projects" onclick="AdminPage.setTab('projects',this)">Proyectos</button>
          <button class="tab-btn" data-tab="actions" onclick="AdminPage.setTab('actions',this)">Acciones</button>
        </div>
      </div>
      <div class="content" id="adm-content" style="padding-top:0">
        <div style="text-align:center;padding:40px;color:var(--muted)">Cargando...</div>
      </div>

      <!-- Modal genérico -->
      <div class="modal-overlay" id="adm-modal">
        <div class="modal">
          <div class="modal-title">
            <span id="adm-modal-title">Nuevo</span>
            <button class="modal-close" onclick="AdminPage.closeModal()">✕</button>
          </div>
          <div id="adm-modal-body"></div>
          <button class="btn btn-primary" style="margin-top:8px" id="adm-save-btn" onclick="AdminPage.save()">Guardar</button>
        </div>
      </div>`;
  }

  async function setTab(tab, el) {
    _tab = tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    el.classList.add("active");
    await loadTab();
  }

  async function loadTab() {
    const el = document.getElementById("adm-content");
    el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted)">Cargando...</div>`;
    if (_tab === "users") await renderUsers();
    else if (_tab === "clients") await renderClients();
    else if (_tab === "projects") await renderProjects();
    else if (_tab === "actions") await renderActions();
  }

  async function renderUsers() {
    const users = await API.listUsers();
    let html = `<div class="card" style="padding:8px 16px">`;
    if (!users.length) html += `<div class="empty-state"><p>Sin usuarios</p></div>`;
    for (const u of users) {
      html += `<div class="admin-item">
        <div class="admin-item-info">
          <div class="admin-item-name">${u.nombre} ${u.is_admin ? '⭐' : ''}</div>
          <div class="admin-item-sub">${u.email} · ${u.is_active ? 'Activo' : '<span style="color:var(--danger)">Inactivo</span>'}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="AdminPage.editUser(${JSON.stringify(u).replace(/"/g,'&quot;')})">✏️</button>
      </div>`;
    }
    html += `</div>`;
    document.getElementById("adm-content").innerHTML = html;
  }

  async function renderClients() {
    _clients = await API.listClients();
    let html = `<div class="card" style="padding:8px 16px">`;
    if (!_clients.length) html += `<div class="empty-state"><p>Sin clientes</p></div>`;
    for (const c of _clients) {
      html += `<div class="admin-item">
        <div class="admin-item-info">
          <div class="admin-item-name">${c.nombre}</div>
          <div class="admin-item-sub">${c.rut || 'Sin RUT'} · ${c.is_active ? 'Activo' : '<span style="color:var(--danger)">Inactivo</span>'}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="AdminPage.editClient(${JSON.stringify(c).replace(/"/g,'&quot;')})">✏️</button>
      </div>`;
    }
    html += `</div>`;
    document.getElementById("adm-content").innerHTML = html;
  }

  async function renderProjects() {
    const projects = await API.listProjects();
    if (!_clients.length) _clients = await API.listClients();
    let html = `<div class="card" style="padding:8px 16px">`;
    if (!projects.length) html += `<div class="empty-state"><p>Sin proyectos</p></div>`;
    for (const p of projects) {
      const client = _clients.find(c => c.id === p.client_id);
      html += `<div class="admin-item">
        <div class="admin-item-info">
          <div class="admin-item-name">${p.nombre}</div>
          <div class="admin-item-sub">${client?.nombre || '?'} · ${p.is_active ? 'Activo' : '<span style="color:var(--danger)">Inactivo</span>'}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="AdminPage.editProject(${JSON.stringify(p).replace(/"/g,'&quot;')})">✏️</button>
      </div>`;
    }
    html += `</div>`;
    document.getElementById("adm-content").innerHTML = html;
  }

  async function renderActions() {
    const actions = await API.listActionTypes();
    let html = `<div class="card" style="padding:8px 16px">`;
    if (!actions.length) html += `<div class="empty-state"><p>Sin tipos de acción</p></div>`;
    for (const a of actions) {
      html += `<div class="admin-item">
        <div class="admin-item-info">
          <div class="admin-item-name">${a.nombre}</div>
          <div class="admin-item-sub">${a.descripcion || '—'} · ${a.is_active ? 'Activo' : '<span style="color:var(--danger)">Inactivo</span>'}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="AdminPage.editAction(${JSON.stringify(a).replace(/"/g,'&quot;')})">✏️</button>
      </div>`;
    }
    html += `</div>`;
    document.getElementById("adm-content").innerHTML = html;
  }

  let _editData = null;

  function openModal(title, bodyHtml, editData = null) {
    _editData = editData;
    document.getElementById("adm-modal-title").textContent = title;
    document.getElementById("adm-modal-body").innerHTML = bodyHtml;
    document.getElementById("adm-modal").classList.add("open");
  }

  function closeModal() {
    document.getElementById("adm-modal").classList.remove("open");
    _editData = null;
  }

  function newItem() {
    if (_tab === "users") openModal("Nuevo usuario", userForm());
    else if (_tab === "clients") openModal("Nuevo cliente", clientForm());
    else if (_tab === "projects") openModal("Nuevo proyecto", projectForm(_clients));
    else if (_tab === "actions") openModal("Nuevo tipo de acción", actionForm());
  }

  function editUser(u) {
    openModal("Editar usuario", userForm(u), { type: "user", id: u.id });
    if (typeof u === "string") u = JSON.parse(u);
  }
  function editClient(c) { openModal("Editar cliente", clientForm(c), { type: "client", id: c.id }); }
  function editProject(p) { openModal("Editar proyecto", projectForm(_clients, p), { type: "project", id: p.id }); }
  function editAction(a) { openModal("Editar tipo de acción", actionForm(a), { type: "action", id: a.id }); }

  function userForm(u = null) {
    return `
      <div class="form-group"><label>Nombre</label><input id="f-nombre" class="form-control" value="${u?.nombre || ''}"></div>
      <div class="form-group"><label>Email</label><input id="f-email" type="email" class="form-control" value="${u?.email || ''}"></div>
      <div class="form-group"><label>Contraseña ${u ? '(dejar vacío para no cambiar)' : ''}</label><input id="f-password" type="password" class="form-control" placeholder="••••••••"></div>
      <div class="form-group"><label style="display:flex;gap:8px;align-items:center"><input id="f-admin" type="checkbox" ${u?.is_admin ? 'checked' : ''}> Administrador</label></div>
      ${u ? `<div class="form-group"><label style="display:flex;gap:8px;align-items:center"><input id="f-active" type="checkbox" ${u.is_active ? 'checked' : ''}> Activo</label></div>` : ''}`;
  }

  function clientForm(c = null) {
    return `
      <div class="form-group"><label>Nombre</label><input id="f-nombre" class="form-control" value="${c?.nombre || ''}"></div>
      <div class="form-group"><label>RUT (opcional)</label><input id="f-rut" class="form-control" value="${c?.rut || ''}"></div>
      <div class="form-group"><label>Contacto (opcional)</label><input id="f-contacto" class="form-control" value="${c?.contacto || ''}"></div>
      ${c ? `<div class="form-group"><label style="display:flex;gap:8px;align-items:center"><input id="f-active" type="checkbox" ${c.is_active ? 'checked' : ''}> Activo</label></div>` : ''}`;
  }

  function projectForm(clients, p = null) {
    const opts = clients.map(c => `<option value="${c.id}" ${p?.client_id === c.id ? 'selected' : ''}>${c.nombre}</option>`).join("");
    return `
      <div class="form-group"><label>Nombre</label><input id="f-nombre" class="form-control" value="${p?.nombre || ''}"></div>
      <div class="form-group"><label>Descripción (opcional)</label><input id="f-desc" class="form-control" value="${p?.descripcion || ''}"></div>
      <div class="form-group"><label>Cliente</label><select id="f-client" class="form-control"><option value="">Selecciona...</option>${opts}</select></div>
      ${p ? `<div class="form-group"><label style="display:flex;gap:8px;align-items:center"><input id="f-active" type="checkbox" ${p.is_active ? 'checked' : ''}> Activo</label></div>` : ''}`;
  }

  function actionForm(a = null) {
    return `
      <div class="form-group"><label>Nombre</label><input id="f-nombre" class="form-control" value="${a?.nombre || ''}"></div>
      <div class="form-group"><label>Descripción (opcional)</label><input id="f-desc" class="form-control" value="${a?.descripcion || ''}"></div>
      ${a ? `<div class="form-group"><label style="display:flex;gap:8px;align-items:center"><input id="f-active" type="checkbox" ${a.is_active ? 'checked' : ''}> Activo</label></div>` : ''}`;
  }

  async function save() {
    const btn = document.getElementById("adm-save-btn");
    btn.disabled = true;
    try {
      const g = (id) => document.getElementById(id);
      const nombre = g("f-nombre")?.value.trim();
      const isEdit = !!_editData;

      if (_tab === "users") {
        const data = { nombre, email: g("f-email").value.trim(), is_admin: g("f-admin").checked };
        const pw = g("f-password").value;
        if (pw) data.password = pw;
        if (isEdit) { data.is_active = g("f-active").checked; await API.updateUser(_editData.id, data); }
        else { data.password = pw || "temporal123"; await API.createUser(data); }
      } else if (_tab === "clients") {
        const data = { nombre, rut: g("f-rut")?.value || null, contacto: g("f-contacto")?.value || null };
        if (isEdit) { data.is_active = g("f-active").checked; await API.updateClient(_editData.id, data); }
        else await API.createClient(data);
      } else if (_tab === "projects") {
        const data = { nombre, descripcion: g("f-desc")?.value || null, client_id: parseInt(g("f-client").value) };
        if (!data.client_id) return App.toast("Selecciona un cliente");
        if (isEdit) { data.is_active = g("f-active").checked; await API.updateProject(_editData.id, data); }
        else await API.createProject(data);
      } else if (_tab === "actions") {
        const data = { nombre, descripcion: g("f-desc")?.value || null };
        if (isEdit) { data.is_active = g("f-active").checked; await API.updateActionType(_editData.id, data); }
        else await API.createActionType(data);
      }

      closeModal();
      await loadTab();
      App.toast("✓ Guardado");
    } catch (err) {
      App.toast("Error: " + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  function bind() {
    document.getElementById("adm-add-btn")?.addEventListener("click", () => newItem());
    document.getElementById("adm-modal")?.addEventListener("click", (e) => {
      if (e.target === document.getElementById("adm-modal")) closeModal();
    });
    loadTab();
  }

  return { render, bind, setTab, closeModal, save, newItem, editUser, editClient, editProject, editAction };
})();
