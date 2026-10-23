const CACHE='weft-v6.24.27-run-ae3b32028fd5',pending=new Map();
const BUILD_VERSION='6.24.27',BUILD_ID='bbe8aa8d9b653fc55967e6c129b0bd44ca1c4b5bac2a488732403dbb68e44d9f';
const buildInfo=(activated=false)=>({type:'weft-build-info',version:BUILD_VERSION,buildId:BUILD_ID,activated});
self.addEventListener('install',event=>{
  // A frozen older page cannot approve an update. Promote this worker without
  // waiting for game code or a large precache download; do not navigate a run.
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  // Keep old hashed resources for open builds. No claim, forced navigation,
  // cache deletion, checkpoint mutation or game-state storage access occurs.
  try{for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage(buildInfo(true));}catch{/* Update notices are best effort. */}
})()));
async function currentCache(key){
  try{const hit=await(await caches.open(CACHE)).match(key);return hit?.ok?hit:undefined;}catch{return undefined;}
}
function immutableAsset(url){
  // Esbuild names and media digests identify content, unlike index.html,
  // manifests, tutorial.html and other mutable same-name resources.
  return /(?:[-.][a-f0-9]{8,64}|[-.][A-Z0-9]{8})\.[^/]+$/.test(url.pathname)||/^[a-f0-9]{16,64}$/i.test(url.searchParams.get('v')||'');
}
async function matchingCache(key){
  try{const cache=await caches.open(CACHE),hit=await cache.match(key);if(hit)return hit;}catch{/* Try an older complete copy before the network. */}
  let keys=[];try{keys=await caches.keys();}catch{return undefined;}
  for(const name of keys.reverse()){
    if(name===CACHE||!name.startsWith('weft-v'))continue;
    try{const hit=await(await caches.open(name)).match(key);if(hit&&hit.ok)return hit;}catch{/* One damaged/full cache cannot hide another build's chunk. */}
  }
  return undefined;
}
function pageKey(request){
  const url=new URL(request.url);if(url.pathname.endsWith('/'))url.pathname+='index.html';url.search='';url.hash='';return new Request(url.href);
}
async function cachedPage(request){
  // Only this build's exact page is an offline answer. In particular, a new
  // explicit version URL must never receive an older cached index.html.
  return currentCache(pageKey(request));
}
function unavailablePage(){
  const latest=new URL('index-v'+BUILD_VERSION+'.html',self.registration.scope).href;
  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111b25"><title>Weft · Reconnect</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;box-sizing:border-box;padding:28px;background:#111b25;color:#f6e9c5;font:18px/1.6 Georgia,serif;text-align:center}h1{font-size:32px;font-weight:normal}a{display:inline-block;padding:12px 24px;color:inherit;border:1px solid #bc9758;border-radius:8px;text-decoration:none}small{display:block;margin-top:18px;color:#cbbd9f}</style><main><h1>Weft</h1><p>This version is not available offline yet.<br>Reconnect, then try again.</p><a href="'+latest+'?fresh=1">Try again</a><small>Your saved game is kept. · v'+BUILD_VERSION+'</small></main></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Weft-Recovery':'offline'}});
}
async function networkFirstPage(request,event){
  const key=pageKey(request);
  // A slow online request is still online. Never substitute an old page after
  // a timeout, or disguise an HTTP error as a successful cached navigation.
  try{
    const response=await fetch(new Request(request.url),{cache:'no-store'});
    if(response.ok&&response.status===200)try{const cache=await caches.open(CACHE);await cache.put(key,response.clone());}catch{/* A full cache must not lose the online page. */}
    return response;
  }catch{return(await cachedPage(key))||unavailablePage();}
}
async function cachedAsset(request){
  const url=new URL(request.url);if(url.pathname.endsWith('/'))url.pathname+='index.html';const key=new Request(url.href),immutable=immutableAsset(url);
  let response=immutable?await matchingCache(key):undefined;
  if(!response){
    if(!pending.has(url.href)){
      const work=(async()=>{
        try{const value=await fetch(key,{cache:immutable?'default':'no-store'});
          if(value.ok&&value.status===200)try{const cache=await caches.open(CACHE);await cache.put(key,value.clone());}catch{/* A full cache must not lose a successful response. */}
          return value;
        }catch(error){const offline=await currentCache(key);if(offline)return offline;throw error;}
      })().finally(()=>pending.delete(url.href));pending.set(url.href,work);
    }
    response=(await pending.get(url.href)).clone();
  }
  const range=request.headers.get('range');
  if(!range||!response.ok)return response;
  const match=/^bytes=(\d+)-(\d*)$/.exec(range);if(!match)return response;
  const bytes=await response.arrayBuffer(),start=Number(match[1]),end=Math.min(bytes.byteLength-1,match[2]?Number(match[2]):bytes.byteLength-1);
  if(start>=bytes.byteLength||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
  return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':response.headers.get('Content-Type')||'audio/mp4','Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;const page=event.request.mode==='navigate'||/\/index(?:-v[\d.]+)?\.html$/.test(url.pathname)||url.pathname.endsWith('/');event.respondWith(page?networkFirstPage(event.request,event):cachedAsset(event.request));});
self.addEventListener('message',event=>{
 if(event.data?.type==='weft-build-query'){event.source?.postMessage(buildInfo());return;}
 if(event.data?.type==='weft-activate-update'&&event.data.buildId===BUILD_ID){
  try{const url=new URL(event.source?.url);if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;}catch{return;}
  event.waitUntil(self.skipWaiting());return;
 }
 if(event.data?.type==='cache-visited'&&Array.isArray(event.data.urls))event.waitUntil(Promise.allSettled(event.data.urls.filter(value=>typeof value==='string').map(value=>{try{const url=new URL(value,self.registration.scope);return url.href.startsWith(self.registration.scope)?(/\/index(?:-v[\d.]+)?\.html$/.test(url.pathname)||url.pathname.endsWith('/')?networkFirstPage(new Request(url.href)):cachedAsset(new Request(url.href))):undefined;}catch{return undefined;}})));
});
