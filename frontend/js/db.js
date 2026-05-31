// IndexedDB para almacenamiento offline
const DB = (() => {
  const DB_NAME = "viaticos_offline";
  const DB_VERSION = 1;
  let db;

  function open() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains("pending_ops"))
          d.createObjectStore("pending_ops", { keyPath: "id", autoIncrement: true });
        if (!d.objectStoreNames.contains("cache"))
          d.createObjectStore("cache", { keyPath: "key" });
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = () => reject(req.error);
    });
  }

  async function set(store, value) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, "readwrite");
      const req = tx.objectStore(store).put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(store, key) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(store) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function del(store, key) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, "readwrite");
      const req = tx.objectStore(store).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  return {
    // Cache de datos del servidor
    saveCache: (key, data) => set("cache", { key, data, ts: Date.now() }),
    getCache: async (key) => { const r = await get("cache", key); return r?.data; },

    // Cola de operaciones offline pendientes
    queueOp: (op) => set("pending_ops", op),
    getPendingOps: () => getAll("pending_ops"),
    clearOp: (id) => del("pending_ops", id),
  };
})();
