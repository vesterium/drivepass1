// DrivePass+ Service Worker v3.0
// Offline QR support via IndexedDB

const CACHE_NAME = 'drivepass-v3.0';
const OFFLINE_URL = '/offline.html';
const DB_NAME = 'drivepass-offline';
const DB_VERSION = 1;
const QR_STORE = 'qr_tokens';
const VALIDATION_STORE = 'offline_validations';

const CRITICAL_ASSETS = [
  '/',
  '/offline.html',
  '/icons/icon.svg',
  '/manifest.json'
];

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QR_STORE)) {
        db.createObjectStore(QR_STORE, { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains(VALIDATION_STORE)) {
        db.createObjectStore(VALIDATION_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('🚀 DrivePass+ SW v3.0: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching critical assets');
      return cache.addAll(CRITICAL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('✅ DrivePass+ SW v3.0: Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For QR generate endpoint — cache the token in IndexedDB for offline use
  if (url.pathname.includes('/qr/generate') && event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request.clone()).then(async (response) => {
        if (response.ok) {
          const data = await response.clone().json();
          if (data.token) {
            // Store QR token offline with userId from Authorization header
            const authHeader = event.request.headers.get('Authorization');
            const userId = authHeader ? authHeader.replace('Bearer ', '').slice(0, 20) : 'unknown';
            await idbPut(QR_STORE, {
              userId,
              token: data.token,
              expiresAt: data.expiresAt,
              carPlate: data.carPlate,
              cachedAt: Date.now(),
            }).catch(e => console.log('IndexedDB save error:', e));
          }
        }
        return response;
      }).catch(async () => {
        // Offline: return cached QR token if available
        const authHeader = event.request.headers.get('Authorization');
        const userId = authHeader ? authHeader.replace('Bearer ', '').slice(0, 20) : 'unknown';
        const cached = await idbGet(QR_STORE, userId).catch(() => null);
        if (cached && cached.expiresAt > Date.now()) {
          console.log('📱 Serving cached QR token offline');
          return new Response(JSON.stringify({
            token: cached.token,
            expiresAt: cached.expiresAt,
            carPlate: cached.carPlate,
            offline: true,
          }), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'Офлайн: QR-токен недоступен или истёк' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For navigation requests — network first, fallback to cache, then offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match(OFFLINE_URL)
        )
      )
    );
    return;
  }

  // For static assets — cache first
  if (event.request.destination === 'script' ||
      event.request.destination === 'style' ||
      event.request.destination === 'font' ||
      event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match(OFFLINE_URL));
      })
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(cached =>
        cached || new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        })
      )
    )
  );
});

// ── Message handler (from client to SW) ──────────────────────────────────────

self.addEventListener('message', async (event) => {
  const { type, data } = event.data || {};

  if (type === 'SAVE_QR_OFFLINE') {
    await idbPut(QR_STORE, data).catch(e => console.log('Save QR error:', e));
    event.ports[0]?.postMessage({ success: true });
  }

  if (type === 'GET_QR_OFFLINE') {
    const cached = await idbGet(QR_STORE, data.userId).catch(() => null);
    event.ports[0]?.postMessage({ cached });
  }

  if (type === 'QUEUE_VALIDATION') {
    await idbPut(VALIDATION_STORE, { ...data, id: Date.now() }).catch(e => console.log('Queue error:', e));
    event.ports[0]?.postMessage({ queued: true });
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚗 DrivePass+ Service Worker v3.0 loaded (IndexedDB offline support)');
