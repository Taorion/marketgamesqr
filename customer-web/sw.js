/* Only the offline screen and icon are cached. Never cache sessions, APIs or private QR. */
const CACHE='qori-customer-public-v2',OFFLINE='/customer/offline.html';
let sessionEpoch=0;
self.addEventListener('message',event=>{
 if(event.data?.type!=='QORI_SESSION_CHANGED')return;
 sessionEpoch++;
 event.waitUntil(self.registration.getNotifications().then(items=>items.forEach(n=>n.close())));
});
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([OFFLINE,'/customer/icon-192.png'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('qori-customer-public-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.mode==='navigate'&&url.origin===self.location.origin&&url.pathname.startsWith('/customer/'))event.respondWith(fetch(event.request).catch(()=>caches.match(OFFLINE)));});
self.addEventListener('push',event=>event.waitUntil((async()=>{
 const epoch=sessionEpoch;
 try{
  const payload=event.data?.json();if(!payload?.public_id)return;
  if(payload.type==='BENEFIT'){
   const r=await fetch('/api/customer/notifications',{credentials:'include',cache:'no-store'});if(!r.ok)return;
   const inbox=await r.json();if(inbox.public_id!==payload.public_id)return;
   const n=inbox.items.find(n=>n.id===payload.notification_id&&!n.read_at);if(!n||epoch!==sessionEpoch)return;
   await self.registration.showNotification('Qori · '+n.title,{body:n.business_name+': '+n.body,tag:'qori-benefit-'+n.id,icon:'/customer/icon-192.png',data:{url:'/customer/#notifications'}});return;
  }
  const response=await fetch('/api/customer/payment-agenda/notifications',{credentials:'include',cache:'no-store'});
  if(!response.ok)return;const account=await response.json();
  if(account.public_id!==payload.public_id||!account.count||epoch!==sessionEpoch)return;
  const names=(account.items||[]).slice(0,2).map(i=>String(i.book_name?i.book_name+': '+i.name:i.name).slice(0,100));
  const body=names.length?'Revisa tu agenda: '+names.join(', ')+(account.count>names.length?' y '+(account.count-names.length)+' más.':'.'):'Tienes obligaciones próximas o vencidas. Revisa tu agenda.';
  await self.registration.showNotification('Qori · Tu agenda de pagos',{body,tag:'qori-payment-agenda',icon:'/customer/icon-192.png',data:{url:'/customer/'+(account.items?.[0]?.book_id?'?book='+encodeURIComponent(account.items[0].book_id):'')+'#payments'}});
 }catch{}
})()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const target=new URL(event.notification.data?.url||'/customer/#payments',self.location.origin);if(target.origin!==self.location.origin||target.pathname!=='/customer/')return;const url=target.href;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const client=windows.find(c=>new URL(c.url).origin===self.location.origin&&new URL(c.url).pathname.startsWith('/customer/'));
  if(client){await client.navigate(url);await client.focus();}else await self.clients.openWindow(url);
 })());
});
