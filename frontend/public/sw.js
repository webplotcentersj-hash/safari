// Service Worker mínimo para PWA (sin cache offline)
self.addEventListener('install', (event) => {
  // Instalación inmediata sin cache
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Activar inmediatamente
  event.waitUntil(self.clients.claim());
});

