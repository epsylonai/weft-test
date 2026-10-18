const CACHE='weft-v6.21.0-showcase-8272bdefa3eb',pending=new Map();
const BUILD_VERSION='6.21.0',BUILD_ID='b60eed10f2c1dea05fd6de7b1df13e3a84831a80e5ef311caf7477ec1a1cc6dd';
const buildInfo=(activated=false)=>({type:'weft-build-info',version:BUILD_VERSION,buildId:BUILD_ID,activated});
self.addEventListener('install',event=>event.waitUntil((async()=>{
  try{const cache=await caches.open(CACHE);await cache.addAll(['./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png',"./game-e35435ea0d87045f.css","./game-bootstrap-ZEAHHQGN.js","./game-chunks/records-BGOQKNMP.js","./game-chunks/worker-client-KW4UKMO3.js","./game-chunks/warp-app-QWFXIZNT.js","./game-chunks/app-CO2GDB2T.js","./game-chunks/chunk-XMNM2BL7.js","./game-chunks/chunk-7VWLASLT.js","./game-chunks/chunk-AWYGWWWM.js","./icon-32-d.png","./icon-180-d.png","./icon-192-d.png","./icon-512-d.png","./icon-d.svg","./icon-LICENSE.txt",'./fonts/cinzel-roman-latin.woff2','./fonts/eb-garamond-roman-latin.woff2','./fonts/eb-garamond-italic-latin.woff2','./frame/gold-atlas-v1.webp','./frame/emblem-1-v1.svg','./frame/emblem-2-v1.svg','./frame/emblem-3-v1.svg','./frame/emblem-4-v1.svg','./frame/emblem-5-v1.svg','./frame/emblem-6-v1.svg','./frame/emblem-7-v1.svg','./frame/emblem-8-v1.svg','./frame/emblem-9-v1.svg','./frame/emblem-10-v1.svg']);}catch{/* Offline storage is optional. */}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('weft-v6.21.0-showcase-')&&key!==CACHE).map(key=>caches.delete(key)));}catch{/* Storage failure must not prevent activation. */}
  await self.clients.claim();
  try{for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage(buildInfo(true));}catch{/* Update notices are best effort. */}
})()));
async function cachedPage(key){
  try{const cache=await caches.open(CACHE),direct=await cache.match(key);if(direct)return direct;
    const url=new URL(key.url);url.search='';const clean=await cache.match(new Request(url.href));
    const scopePath=new URL('.',self.registration.scope).pathname;
    const entry=url.pathname.startsWith(scopePath)&&/^(?:index(?:-v[\d.]+)?\.html)?$/.test(url.pathname.slice(scopePath.length));
    return clean||(entry?await cache.match(new Request(new URL('index.html',self.registration.scope).href)):undefined);
  }catch{return undefined;}
}
async function networkFirstPage(request,event){
  const url=new URL(request.url);if(url.pathname.endsWith('/'))url.pathname+='index.html';url.hash='';
  const key=new Request(url.href);let timeout;
  const network=fetch(key,{cache:'no-store'}).then(async response=>{
    if(response.ok&&response.status===200)try{const cache=await caches.open(CACHE);await cache.put(key,response.clone());}catch{/* A full cache must not lose the online page. */}
    return response;
  });
  // A late response may refresh the offline copy after the3s fallback has won.
  event?.waitUntil(network.then(()=>undefined,()=>undefined));
  try{
    const response=await Promise.race([network,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Page network timeout')),3000);})]);
    return response.ok?response:(await cachedPage(key))||response;
  }catch(error){const cached=await cachedPage(key);if(cached)return cached;throw error;}
  finally{clearTimeout(timeout);}
}
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
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;const page=event.request.mode==='navigate'||/\/index(?:-v[\d.]+)?\.html$/.test(url.pathname)||url.pathname.endsWith('/');event.respondWith(page?networkFirstPage(event.request,event):cachedAsset(event.request));});
self.addEventListener('message',event=>{if(event.data?.type==='weft-build-query'){event.source?.postMessage(buildInfo());return;}if(event.data?.type==='cache-visited'&&Array.isArray(event.data.urls))event.waitUntil(Promise.all(event.data.urls.filter(value=>typeof value==='string').map(value=>{const url=new URL(value,self.registration.scope);return url.href.startsWith(self.registration.scope)?cachedAsset(new Request(url.href)):undefined;})));});
