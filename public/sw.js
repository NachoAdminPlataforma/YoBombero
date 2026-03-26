// sw.js - Service Worker básico para evitar errores en la consola
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalado');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activado');
});

self.addEventListener('fetch', (event) => {
  // Por ahora no cacheamos nada, solo dejamos que pase la petición
  event.respondWith(fetch(event.request));
});
