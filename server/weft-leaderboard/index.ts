// Deployed by Claude 2026-10-16 from ChatGPT/B-013/supabase/functions/weft-leaderboard/index.ts.
// Changes vs ChatGPT's file (owner-free deployment, no dashboard secrets needed):
//  1. Enabled by default; set Edge secret WEFT_LEADERBOARD_ENABLED=false to switch it off instantly.
//  2. Public key = WEFT_PUBLIC_KEY if set, else the project's own publishable keys (SUPABASE_PUBLISHABLE_KEYS, platform default env).
//  3. Server credential = SUPABASE_SECRET_KEYS.default (new keys), fallback SUPABASE_SERVICE_ROLE_KEY (legacy, ends 2026);
//     an sb_secret_ key is sent on the apikey header only (a Bearer header would be rejected as an invalid JWT).
//  4. CORS also allows authorization and x-client-info headers.
//  5. The replay bundle is imported from a commit-pinned URL instead of being re-typed.
// B044: after the owner wipe, new Classic writes require level-v3; Daily/Warp remain clear-v2.
// v6.17 predecessor: preserves deployed37f003b4 hardenings and old Classic proofs;
// adds exact Warp run/board projection, with retryable verification capacity.
// Claude publishes this byte-exact file under server/ and replaces this local
// import with its new commit-pinned URL before redeploying. No deployment here.
// B044 v6.24.4 (deployed by Claude 2026-10-19 22:3x Lisbon): bundle import pinned to epsylonai/weft-test 387d5a8 (sha256 02b96949…8ecfce, checked after push); handler body = Main MOTE's index.ts b654a7b0 unchanged.
// B048 v6.24.8 (deployed by Claude 2026-10-20 15:2x Lisbon): bundle import pinned to epsylonai/weft-test cfc9ae9 (sha256 05bd763a…bdd05, checked after push): Late Night Violin unlock + room verification; handler body still b654a7b0 unchanged.
import {verifyCurrentSubmission,validateNickname} from 'https://raw.githubusercontent.com/epsylonai/weft-test/cfc9ae960dc9aefd56843a6c394e763e031bdb22/server/weft-leaderboard/canonical-replay.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,x-client-info,content-type,x-region','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
const validDevice=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const jsonValues=(name:string):string[]=>{try{const parsed=JSON.parse(Deno.env.get(name)??'{}');return Object.values(parsed).filter((v):v is string=>typeof v==='string'&&v.length>0);}catch{return [];}};
function publicKeys():string[]{const explicit=Deno.env.get('WEFT_PUBLIC_KEY');return explicit?[explicit]:jsonValues('SUPABASE_PUBLISHABLE_KEYS');}
function serverCredential():string|undefined{
  try{const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}');if(typeof keys.default==='string'&&keys.default)return keys.default;}catch{/* fall through */}
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??undefined;
}
async function rpc(name:string,args:unknown):Promise<unknown>{
  const url=Deno.env.get('SUPABASE_URL'),secret=serverCredential();
  if(!url||!secret)throw Error('Server configuration unavailable');
  const headers:Record<string,string>=secret.startsWith('sb_secret_')?{apikey:secret,'Content-Type':'application/json'}:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
  const result=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args)});
  if(!result.ok)throw Error('Score storage unavailable');return result.status===204?null:result.json();
}
export async function handler(request:Request):Promise<Response>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if((Deno.env.get('WEFT_LEADERBOARD_ENABLED')??'true')!=='true')return response({error:'Leaderboard disabled'},503);
  const presented=request.headers.get('apikey'),keys=publicKeys();if(!presented||!keys.includes(presented))return response({error:'Invalid public key'},401);
  try{
    if(request.method==='GET'){
      const query=new URL(request.url).searchParams,kind=query.get('kind'),date=query.get('date'),device=query.get('deviceId');
      if(!['daily','run','board','chain','warp-run','warp-board'].includes(kind??'')||!validDevice(device)||!/^\d{4}-\d{2}-\d{2}$/.test(date??''))return response({error:'Invalid query'},400);
      return response(await rpc('weft_leaderboard_page',{p_kind:kind,p_day:date,p_device:device}));
    }
    if(request.method!=='POST')return response({error:'Method unavailable'},405);
    const raw=await request.text();if(new TextEncoder().encode(raw).length>1048576)return response({error:'Proof too large; retained locally'},413);
    const body=JSON.parse(raw),name=validateNickname(body.name);if(!validDevice(body.deviceId)||!name.valid)return response({error:'Invalid name or device'},400);
    if(await rpc('weft_take_score_token',{p_device:body.deviceId})!==true)return response({error:'Please wait before submitting again'},429);
    const rows=verifyCurrentSubmission(body.proof); // Throws for illegal moves or any mismatching result.
    await rpc('weft_insert_verified_scores',{p_device:body.deviceId,p_name:name.value,p_rows:rows});
    return response({accepted:true});
  }catch(error){if((error as {code?:string})?.code==='UPDATE_GAME_REQUIRED')return response({error:'Please update Weft to post scores',code:'UPDATE_GAME_REQUIRED'},409);if((error as {code?:string})?.code==='WARP_VERIFICATION_BUDGET')return response({error:'Verification capacity exceeded; retained locally'},503);return response({error:'Proof rejected or score storage unavailable'},400);}
}
Deno.serve(handler);
