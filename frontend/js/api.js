const API = (() => {
  const BASE = "/api";

  function token() { return localStorage.getItem("token"); }

  async function req(method, path, body, isForm = false) {
    const headers = {};
    if (token()) headers["Authorization"] = `Bearer ${token()}`;
    if (!isForm) headers["Content-Type"] = "application/json";

    const opts = { method, headers };
    if (body) opts.body = isForm ? body : JSON.stringify(body);

    try {
      const res = await fetch(BASE + path, opts);
      if (res.status === 204) return null;
      const data = await res.json();
      if (!res.ok) {
        let msg = "Error en servidor";
        if (data.detail) {
          if (typeof data.detail === "string") {
            msg = data.detail;
          } else if (Array.isArray(data.detail) && data.detail.length > 0) {
            msg = data.detail.map(e => {
              const field = e.loc?.slice(1).join(" → ") || "";
              return field ? `${field}: ${e.msg}` : e.msg;
            }).join(" | ");
          }
        }
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      if (err.message === "Failed to fetch") throw new Error("__OFFLINE__");
      throw err;
    }
  }

  // GET con cache automático en IndexedDB
  async function cachedGet(cacheKey, path) {
    try {
      const data = await req("GET", path);
      await DB.saveCache(cacheKey, data);
      return data;
    } catch (err) {
      if (err.message === "__OFFLINE__") {
        const cached = await DB.getCache(cacheKey);
        if (cached !== undefined) return cached;
        throw new Error("Sin conexión y sin datos en caché");
      }
      throw err;
    }
  }

  // POST/PUT/DELETE: encola en IndexedDB si offline. Retorna __opId para adjuntar foto.
  async function queuedWrite(method, path, body) {
    if (!navigator.onLine) {
      const opId = await DB.queueOp({ method, path, body, ts: Date.now() });
      return { __queued: true, __opId: opId };
    }
    try {
      return await req(method, path, body);
    } catch (err) {
      if (err.message === "__OFFLINE__") {
        const opId = await DB.queueOp({ method, path, body, ts: Date.now() });
        return { __queued: true, __opId: opId };
      }
      throw err;
    }
  }

  // Lee un File como base64 para guardar en IndexedDB
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return {
    _fileToBase64: fileToBase64,

    // Auth
    login: (email, password) => req("POST", "/auth/login", { email, password }),
    me:    () => req("GET", "/auth/me"),

    // Account — con cache offline
    initAccount:    (saldo_inicial) => req("POST", "/account/init", { saldo_inicial }),
    updateSaldo:    (saldo_inicial) => req("PUT",  "/account/saldo", { saldo_inicial }),
    getAccount:     () => cachedGet("account", "/account"),
    addMovement:    (data) => queuedWrite("POST", "/account/movements", data),
    updateMovement: (id, data) => queuedWrite("PUT", `/account/movements/${id}`, data),
    deleteMovement: (id) => queuedWrite("DELETE", `/account/movements/${id}`, null),
    uploadFotoMovement: (id, file) => {
      const fd = new FormData(); fd.append("foto", file);
      return req("POST", `/account/movements/${id}/foto`, fd, true);
    },

    // Viático selects — con cache
    selectClients:     () => cachedGet("select_clients", "/viaticos/select/clients"),
    selectProjects:    (clientId) => cachedGet(`select_projects_${clientId||0}`, `/viaticos/select/projects${clientId ? `?client_id=${clientId}` : ""}`),
    selectActionTypes: () => cachedGet("select_actions", "/viaticos/select/action-types"),

    // Viáticos — con cache offline
    createViatico:         (data) => req("POST", "/viaticos", data),
    getActiveViatico:      () => cachedGet("viatico_active", "/viaticos/active"),
    listViaticos:          () => cachedGet("viaticos_list", "/viaticos"),
    closeViatico:          (data) => req("POST", "/viaticos/active/close", data),
    addViaticoMovement:    (data) => queuedWrite("POST", "/viaticos/active/movements", data),
    updateViaticoMovement: (id, data) => queuedWrite("PUT", `/viaticos/movements/${id}`, data),
    deleteViaticoMovement: (id) => queuedWrite("DELETE", `/viaticos/movements/${id}`, null),
    uploadFotoViatico: (id, file) => {
      const fd = new FormData(); fd.append("foto", file);
      return req("POST", `/viaticos/movements/${id}/foto`, fd, true);
    },

    // Reportes
    pdfUrl:   (id) => `${BASE}/reports/${id}/pdf`,
    excelUrl: (id) => `${BASE}/reports/${id}/excel`,

    // Admin
    listUsers:        () => req("GET",  "/admin/users"),
    createUser:       (data) => req("POST", "/admin/users", data),
    updateUser:       (id, data) => req("PUT", `/admin/users/${id}`, data),
    listClients:      () => req("GET",  "/admin/clients"),
    createClient:     (data) => req("POST", "/admin/clients", data),
    updateClient:     (id, data) => req("PUT", `/admin/clients/${id}`, data),
    listProjects:     (clientId) => req("GET", `/admin/projects${clientId ? `?client_id=${clientId}` : ""}`),
    createProject:    (data) => req("POST", "/admin/projects", data),
    updateProject:    (id, data) => req("PUT", `/admin/projects/${id}`, data),
    listActionTypes:  () => req("GET",  "/admin/action-types"),
    createActionType: (data) => req("POST", "/admin/action-types", data),
    updateActionType: (id, data) => req("PUT", `/admin/action-types/${id}`, data),
  };
})();
