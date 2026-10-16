const CACHE='weft-v6.9.2-decks-preview-25f8addc3e99',pending=new Map();
self.addEventListener('install',event=>event.waitUntil((async()=>{
  try{const cache=await caches.open(CACHE);await cache.addAll(['./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png']);}catch{/* Offline storage is optional. */}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('weft-v6.9.2-decks-preview-')&&key!==CACHE).map(key=>caches.delete(key)));}catch{/* Storage failure must not prevent activation. */}
  await self.clients.claim();
})()));
async function cachedAsset(request){
  const url=new URL(request.url);if(url.pathname.endsWith('/'))url.pathname+='index.html';const key=new Request(url.href);
  let cache,response;
  try{cache=await caches.open(CACHE);response=await cache.match(key);}catch{/* Fetch online when cache access is unavailable. */}
  if(!response){if(!pending.has(url.href)){const work=fetch(key).then(async value=>{if(cache&&value.ok&&value.status===200)try{await cache.put(key,value.clone());}catch{/* A full cache must not lose a successful response. */}return value;}).finally(()=>pending.delete(url.href));pending.set(url.href,work);}response=(await pending.get(url.href)).clone();}
  const range=request.headers.get('range');
  if(!range||!response.ok)return response;
  const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match)return response;
  const bytes=await response.arrayBuffer(),start=Number(match[1]),end=Math.min(bytes.byteLength-1,match[2]?Number(match[2]):bytes.byteLength-1);
  if(start>=bytes.byteLength||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
  return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':response.headers.get('Content-Type')||'audio/mp4','Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith(cachedAsset(event.request));});
self.addEventListener('message',event=>{if(event.data?.type==='cache-visited'&&Array.isArray(event.data.urls))event.waitUntil(Promise.all(event.data.urls.filter(value=>typeof value==='string').map(value=>{const url=new URL(value,self.registration.scope);return url.href.startsWith(self.registration.scope)?cachedAsset(new Request(url.href)):undefined;})));});
