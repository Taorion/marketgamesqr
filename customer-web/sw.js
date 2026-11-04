/* Only the offline screen and icon are cached. Never cache sessions, APIs or private QR. */
const CACHE='qori-customer-public-v2',OFFLINE='/customer/offline.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/customer/icon-192.png'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('qori-customer-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname.startsWith('/customer/'))event.respondWith(fetch(event.request).catch(()=>caches.match(OFFLINE)));});
self.addEventListener('push',event=>event.waitUntil((async()=>{
 try{
  const payload=event.data?.json();if(!payload?.public_id)return;
  const response=await fetch('/api/customer/payment-agenda/notifications',{credentials:'include',cache:'no-store'});
  if(!response.ok)return;const account=await response.json();
  if(account.public_id!==payload.public_id||!account.count)return;
  const names=(account.items||[]).slice(0,2).map(i=>String(i.name).slice(0,100));
  const body=names.length?'Recuerda pagar: '+names.join(', ')+(account.count>names.length?' y '+(account.count-names.length)+' más.':'.'):'Tienes obligaciones próximas o vencidas. Revisa tu agenda.';
  await self.registration.showNotification('Qori · Tu agenda de pagos',{body,tag:'qori-payment-agenda',icon:'/customer/icon-192.png',data:{url:'/customer/#payments'}});
 }catch{}
})()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const url=new URL('/customer/#payments',self.location.origin).href;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=windows.find(c=>new URL(c.url).origin===self.location.origin&&new URL(c.url).pathname.startsWith('/customer/'));
  if(client){await client.navigate(url);await client.focus();}else await self.clients.openWindow(url);
 })());
});
