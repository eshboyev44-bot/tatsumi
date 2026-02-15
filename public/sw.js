// Cache version - increment to force cache refresh
const VERSION = "v2";
const CACHE_SHELL = `tatsumi-shell-${VERSION}`;
const CACHE_STATIC = `tatsumi-static-${VERSION}`;
const CACHE_RUNTIME = `tatsumi-runtime-${VERSION}`;
const CACHE_OFFLINE = `tatsumi-offline-${VERSION}`;

// App shell - critical resources needed for offline functionality
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/offline.html",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

// Maximum cache sizes to prevent storage bloat
const MAX_RUNTIME_CACHE_SIZE = 50;
const MAX_STATIC_CACHE_SIZE = 100;

// Install event - cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      const currentCaches = [CACHE_SHELL, CACHE_STATIC, CACHE_RUNTIME, CACHE_OFFLINE];

      // Delete old caches
      await Promise.all(
        cacheKeys
          .filter((cacheKey) => !currentCaches.includes(cacheKey))
          .map((cacheKey) => caches.delete(cacheKey))
      );

      await self.clients.claim();
    })()
  );
});

// Fetch event - handle different request types with appropriate strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from same origin
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests - Network first, fallback to cache, then offline page
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Static assets - Stale-while-revalidate strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }

  // API requests - Network first with cache fallback
  if (isApiRequest(url.pathname)) {
    event.respondWith(handleApiRequest(request));
    return;
  }
});

// Check if request is for a static asset
function isStaticAsset(pathname) {
  return /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/i.test(pathname);
}

// Check if request is for an API endpoint
function isApiRequest(pathname) {
  return pathname.startsWith("/api/") || pathname.includes("/supabase/");
}

// Handle navigation requests - Network first, cache fallback, offline page
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_RUNTIME);
      cache.put(request, networkResponse.clone());
      await trimCache(CACHE_RUNTIME, MAX_RUNTIME_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try app shell root
    const rootResponse = await caches.match("/");
    if (rootResponse) {
      return rootResponse;
    }

    // Fallback to offline page
    const offlineResponse = await caches.match("/offline.html");
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({ "Content-Type": "text/plain" }),
    });
  }
}

// Handle static asset requests - Stale-while-revalidate
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(CACHE_STATIC);
  const cachedResponse = await cache.match(request);

  // Return cached version immediately if available
  if (cachedResponse) {
    // Update cache in background
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
          trimCache(CACHE_STATIC, MAX_STATIC_CACHE_SIZE);
        }
      })
      .catch(() => {
        // Ignore network errors for background updates
      });

    return cachedResponse;
  }

  // No cache - fetch from network
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      await trimCache(CACHE_STATIC, MAX_STATIC_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    return new Response("Asset not available offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Handle API requests - Network first with cache fallback
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful GET responses
    if (networkResponse.ok && request.method === "GET") {
      const cache = await caches.open(CACHE_RUNTIME);
      cache.put(request, networkResponse.clone());
      await trimCache(CACHE_RUNTIME, MAX_RUNTIME_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      JSON.stringify({ error: "Network request failed and no cache available" }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers({ "Content-Type": "application/json" }),
      }
    );
  }
}

// Trim cache to maximum size (FIFO)
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    const itemsToDelete = keys.length - maxItems;
    for (let i = 0; i < itemsToDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
