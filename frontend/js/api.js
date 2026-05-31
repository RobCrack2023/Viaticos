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
            // FastAPI validation errors: array of {msg, loc, type}
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
      if (err.message === "Failed to fetch") throw new Error("Sin conexión al servidor");
      throw err;
    }
  }

  return {
    // Auth
    login: (email, password) => req("POST", "/auth/login", { email, password }),
    me: () => req("GET", "/auth/me"),

    // Account
    initAccount: (saldo_inicial) => req("POST", "/account/init", { saldo_inicial }),
    updateSaldo: (saldo_inicial) => req("PUT", "/account/saldo", { saldo_inicial }),
    getAccount: () => req("GET", "/account"),
    addMovement: (data) => req("POST", "/account/movements", data),
    updateMovement: (id, data) => req("PUT", `/account/movements/${id}`, data),
    deleteMovement: (id) => req("DELETE", `/account/movements/${id}`),
    uploadFotoMovement: (id, file) => {
      const fd = new FormData(); fd.append("foto", file);
      return req("POST", `/account/movements/${id}/foto`, fd, true);
    },

    // Viático selects
    selectClients: () => req("GET", "/viaticos/select/clients"),
    selectProjects: (clientId) => req("GET", `/viaticos/select/projects${clientId ? `?client_id=${clientId}` : ""}`),
    selectActionTypes: () => req("GET", "/viaticos/select/action-types"),

    // Viáticos
    createViatico: (data) => req("POST", "/viaticos", data),
    getActiveViatico: () => req("GET", "/viaticos/active"),
    listViaticos: () => req("GET", "/viaticos"),
    closeViatico: (data) => req("POST", "/viaticos/active/close", data),
    addViaticoMovement: (data) => req("POST", "/viaticos/active/movements", data),
    updateViaticoMovement: (id, data) => req("PUT", `/viaticos/movements/${id}`, data),
    deleteViaticoMovement: (id) => req("DELETE", `/viaticos/movements/${id}`),
    uploadFotoViatico: (id, file) => {
      const fd = new FormData(); fd.append("foto", file);
      return req("POST", `/viaticos/movements/${id}/foto`, fd, true);
    },

    // Reportes
    pdfUrl: (id) => `${BASE}/reports/${id}/pdf?token=${token()}`,
    excelUrl: (id) => `${BASE}/reports/${id}/excel?token=${token()}`,

    // Admin
    listUsers: () => req("GET", "/admin/users"),
    createUser: (data) => req("POST", "/admin/users", data),
    updateUser: (id, data) => req("PUT", `/admin/users/${id}`, data),
    listClients: () => req("GET", "/admin/clients"),
    createClient: (data) => req("POST", "/admin/clients", data),
    updateClient: (id, data) => req("PUT", `/admin/clients/${id}`, data),
    listProjects: (clientId) => req("GET", `/admin/projects${clientId ? `?client_id=${clientId}` : ""}`),
    createProject: (data) => req("POST", "/admin/projects", data),
    updateProject: (id, data) => req("PUT", `/admin/projects/${id}`, data),
    listActionTypes: () => req("GET", "/admin/action-types"),
    createActionType: (data) => req("POST", "/admin/action-types", data),
    updateActionType: (id, data) => req("PUT", `/admin/action-types/${id}`, data),
  };
})();
