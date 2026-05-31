// Sincronización offline → online
const Sync = (() => {
  async function flushPending() {
    const ops = await DB.getPendingOps();
    if (!ops.length) return;
    let synced = 0;
    for (const op of ops) {
      try {
        const res = await fetch("/api" + op.path, {
          method: op.method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
          body: op.body ? JSON.stringify(op.body) : undefined,
        });
        if (res.ok || res.status === 204) {
          await DB.clearOp(op.id);
          synced++;
        }
      } catch (_) {
        break; // Si falla uno, aún offline — detener
      }
    }
    if (synced > 0) {
      // Limpiar caché para forzar datos frescos del servidor
      await DB.saveCache("account", null);
      await DB.saveCache("viatico_active", null);
      App.toast(`Sincronizado: ${synced} operación(es) enviada(s)`);
      App.refreshCurrentPage();
    }
  }

  function init() {
    window.addEventListener("online", () => {
      document.getElementById("offline-banner").classList.remove("show");
      flushPending();
    });
    window.addEventListener("offline", () => {
      document.getElementById("offline-banner").classList.add("show");
    });
    if (!navigator.onLine) {
      document.getElementById("offline-banner").classList.add("show");
    }
    navigator.serviceWorker?.addEventListener("message", (e) => {
      if (e.data?.type === "SYNC_NOW") flushPending();
    });
  }

  return { init, flushPending };
})();
