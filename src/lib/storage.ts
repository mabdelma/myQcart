const DB_NAME = 'qcart-offline';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cart')) {
        db.createObjectStore('cart', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('menu')) {
        const store = db.createObjectStore('menu', { keyPath: 'slug' });
        store.createIndex('slug', 'slug', { unique: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCart(slug: string, tableId: string, cart: unknown) {
  try {
    const db = await openDb();
    const tx = db.transaction('cart', 'readwrite');
    tx.objectStore('cart').put({ key: `${slug}:${tableId}`, data: cart, updatedAt: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently fail — offline storage is best-effort
  }
}

export async function loadCart(slug: string, tableId: string): Promise<unknown | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('cart', 'readonly');
    const result = await new Promise<unknown>((resolve, reject) => {
      const req = tx.objectStore('cart').get(`${slug}:${tableId}`);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => reject(req.error);
    });
    return result;
  } catch {
    return null;
  }
}

export async function clearCart(slug: string, tableId: string) {
  try {
    const db = await openDb();
    const tx = db.transaction('cart', 'readwrite');
    tx.objectStore('cart').delete(`${slug}:${tableId}`);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently fail
  }
}

export async function cacheMenu(slug: string, menuData: unknown) {
  try {
    const db = await openDb();
    const tx = db.transaction('menu', 'readwrite');
    tx.objectStore('menu').put({ slug, data: menuData, cachedAt: Date.now() });
  } catch {
    // Silently fail
  }
}

export async function loadCachedMenu(slug: string): Promise<unknown | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('menu', 'readonly');
    const result = await new Promise<{ data: unknown; cachedAt: number } | null>((resolve, reject) => {
      const req = tx.objectStore('menu').get(slug);
      req.onsuccess = () => {
        const entry = req.result as { data: unknown; cachedAt: number } | undefined;
        if (!entry) return resolve(null);
        if (Date.now() - entry.cachedAt > 600000) return resolve(null); // 10 min TTL
        resolve(entry);
      };
      req.onerror = () => reject(req.error);
    });
    return result?.data ?? null;
  } catch {
    return null;
  }
}
