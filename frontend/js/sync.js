// Sincronización offline → online
const Sync = (() => {
  async function flushPending() {
    const ops = await DB.getPendingOps();
    if (!ops.length) return;
    let synced = 0;
    for (const op of ops) {
      try {
        await fetch("/api" + op.path, {
          method: op.method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
          body: op.body ? JSON.stringify(op.body) : undefined,
        });
        await DB.clearOp(op.id);
        synced++;
      } catch (_) {
        break; // Si falla uno, detenemos (aún offline)
      }
    }
    if (synced > 0) {
      App.toast(`✓ ${synced} operación(es) sincronizada(s)`);
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
