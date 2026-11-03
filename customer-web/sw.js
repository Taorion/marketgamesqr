/* Only the offline screen and icon are cached. Never cache sessions, APIs or private QR. */
const CACHE='qori-customer-public-v2',OFFLINE='/customer/offline.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/customer/icon-192.png'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('qori-customer-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname.startsWith('/customer/'))event.respondWith(fetch(event.request).catch(()=>caches.match(OFFLINE)));});
