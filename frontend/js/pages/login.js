const LoginPage = (() => {
  function render() {
    return `
      <div class="login-wrapper">
        <div class="login-logo">💼</div>
        <h1 class="login-title">Viáticos App</h1>
        <p class="login-sub">Administración de gastos y viáticos</p>
        <div class="login-card">
          <div class="form-group">
            <label>Correo electrónico</label>
            <input id="login-email" type="email" class="form-control" placeholder="correo@empresa.cl" autocomplete="email">
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input id="login-password" type="password" class="form-control" placeholder="••••••••" autocomplete="current-password">
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
            <input type="checkbox" id="login-remember" style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary)">
            <label for="login-remember" style="font-size:13px;color:var(--muted);cursor:pointer;margin:0">
              Recordar sesión en este dispositivo
            </label>
          </div>
          <button class="btn btn-primary" id="login-btn">Ingresar</button>
          <p style="font-size:11px;color:#94A3B8;text-align:center;margin-top:12px">
            Sin "Recordar sesión" la sesión se cerrará al cerrar el navegador
          </p>
          <p id="login-error" style="color:var(--danger);font-size:13px;margin-top:8px;text-align:center;display:none"></p>
        </div>
      </div>`;
  }

  function bind() {
    document.getElementById("login-btn").addEventListener("click", doLogin);
    document.getElementById("login-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
  }

  async function doLogin() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");
    const btn = document.getElementById("login-btn");
    errEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Ingresando...";
    try {
      const remember = document.getElementById("login-remember")?.checked || false;
      const res = await API.login(email, password);
      Store.set("token", res.access_token, remember);
      Store.set("user", JSON.stringify(res.user), remember);
      App.afterLogin(res.user);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
    } finally {
      btn.disabled = false;
      btn.textContent = "Ingresar";
    }
  }

  return { render, bind };
})();
