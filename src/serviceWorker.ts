/// <reference lib="webworker" />
/// <reference lib="dom" />
/// <reference no-default-lib="true"/>
/// <reference lib="es2015" />

// Make this a module
export {};

declare const self: ServiceWorkerGlobalScope;

// Extend the ServiceWorkerGlobalScope interface
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: any;
    skipWaiting(): Promise<void>;
    readonly clients: Clients;
  }

  // Event interfaces with proper type declarations
  interface ExtendableEvent extends Event {
    waitUntil(fn: Promise<any>): void;
  }

  interface FetchEvent extends ExtendableEvent {
    readonly request: Request;
    readonly clientId: string;
    readonly resultingClientId: string;
    readonly preloadResponse: Promise<any>;
    respondWith(response: Promise<Response> | Response): void;
  }

  interface SyncEvent extends ExtendableEvent {
    readonly tag: string;
  }

  interface PushEvent extends ExtendableEvent {
    readonly data: PushMessageData | null;
  }

  interface NotificationEvent extends ExtendableEvent {
    readonly notification: Notification;
    readonly action: string;
  }
}

const CACHE_NAME = 'ai-accounting-dashboard-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache
const ASSETS_TO_CACHE = [
  '/',
  OFFLINE_URL,
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
];

// Install service worker and cache critical assets
self.addEventListener('install', ((event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache critical assets
      await cache.addAll(ASSETS_TO_CACHE);
      // Skip waiting to activate immediately
      await self.skipWaiting();
    })()
  );
}) as EventListener);

// Clean up old caches on activation
self.addEventListener('activate', ((event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map(async (key) => {
          if (key !== CACHE_NAME) {
            await caches.delete(key);
          }
        })
      );
      // Take control of all pages immediately
      await self.clients.claim();
    })()
  );
}) as EventListener);

// Handle fetch requests
self.addEventListener('fetch', ((event: FetchEvent) => {
  const { request } = event;

  // Handle API requests
  if (request.url.includes('/api/')) {
    event.respondWith(
      (async () => {
        try {
          // Try network first for API requests
          const response = await fetch(request);
          return response;
        } catch (error) {
          // If offline, return cached response if available
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If no cached response, return offline error
          return new Response(JSON.stringify({ error: 'You are offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  // Handle static assets and navigation requests
  event.respondWith(
    (async () => {
      try {
        // Try cache first for static assets
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, try network
        const response = await fetch(request);

        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        // If offline and requesting a page, show offline page
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }

        // Return error response
        return new Response('Network error', { status: 503 });
      }
    })()
  );
}) as EventListener);

// Handle background sync for offline actions
self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
}) as EventListener);

// Handle push notifications
self.addEventListener('push', ((event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json();
  const options: NotificationOptions = {
    body: data.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: data.data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
}) as EventListener);

// Handle notification clicks
self.addEventListener('notificationclick', ((event: NotificationEvent) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url === event.notification.data?.url && 'focus' in client) {
          return client.focus();
        }
      }

      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data?.url || '/');
      }
    })()
  );
}) as EventListener);

// Sync transactions when online
async function syncTransactions() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const transactionRequests = requests.filter(request =>
      request.url.includes('/api/transactions')
    );

    await Promise.all(
      transactionRequests.map(async (request) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.delete(request);
          }
        } catch (error) {
          console.error('Failed to sync transaction:', error);
        }
      })
    );
  } catch (error) {
    console.error('Failed to sync transactions:', error);
  }
}