// Sincronización offline → online
const Sync = (() => {
  async function flushPending() {
    const ops = await DB.getPendingOps();
    if (!ops.length) return;
    const token = Store.get("token");
    let synced = 0;

    for (const op of ops) {
      try {
        const res = await fetch("/api" + op.path, {
          method: op.method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: op.body ? JSON.stringify(op.body) : undefined,
        });

        if (res.ok || res.status === 204) {
          // Si el movimiento creado tiene foto adjunta → subirla ahora
          if (op.photoData && op.method === "POST" && op.photoPath) {
            try {
              const created = await res.clone().json().catch(() => null);
              const mvId = created?.id;
              if (mvId) {
                const photoEndpoint = op.photoPath.replace("{id}", mvId);
                // Convertir base64 de vuelta a Blob
                const fetchBlob = await fetch(op.photoData);
                const blob = await fetchBlob.blob();
                const fd = new FormData();
                fd.append("foto", blob, op.photoName || "foto.jpg");
                await fetch("/api" + photoEndpoint, {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${token}` },
                  body: fd,
                });
              }
            } catch (_) {
              // No bloquear la sync si falla solo la foto
            }
          }
          await DB.clearOp(op.id);
          synced++;
        }
      } catch (_) {
        break; // Aún sin conexión — detener
      }
    }

    if (synced > 0) {
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
