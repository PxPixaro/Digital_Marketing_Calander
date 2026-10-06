const CACHE='raj-dmp-v3'; const ASSETS=['./','./index.html','./styles.css','./data.js','./app.js','./assets/raj-group-logo.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
