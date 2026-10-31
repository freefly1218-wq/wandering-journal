const VERSION='journal-sites-shell-v1';
const SHELL=['/trip.html','/cloud.js','/sync-core.js','/manifest.webmanifest','/icon-192.png','/icon-512.png','/vendor/leaflet.js','/vendor/html2canvas.min.js','/vendor/jspdf.umd.min.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>Promise.all(SHELL.map(p=>c.add(p))))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('journal-sites-shell-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!SHELL.includes(u.pathname))return;
e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(VERSION).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request).then(r=>r||Response.error())));});
