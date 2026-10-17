self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{
 let p={};try{p=e.data.json()}catch{p={body:e.data?.text()||'新しい連絡があります'}}
 e.waitUntil(self.registration.showNotification(p.title||'HOMEWARD',{body:p.body||'新しい連絡があります',icon:'/icon-192.png',badge:'/icon-192.png',tag:p.tag,data:{url:p.url||'/'}}));
});
self.addEventListener('notificationclick',e=>{e.notification.close();const target=new URL(e.notification.data?.url||'/',self.location.origin);if(target.origin!==self.location.origin)return;e.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(new URL(client.url).origin===target.origin){await client.navigate(target.href);return client.focus()}}return self.clients.openWindow(target.href)})())});
