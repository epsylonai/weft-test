/** Private capability transfer only. This never interprets a saved value as a
 * score proof, changes identity ownership, or writes a leaderboard row. */
export const PLAYER_SNAPSHOT_BYTES=8*1024*1024;
export const PLAYER_REQUEST_BYTES=PLAYER_SNAPSHOT_BYTES+64*1024;
const encoder=new TextEncoder();
const own=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const safe=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export const validPlayerDevice=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const allowedKeys=(value:Record<string,unknown>,keys:readonly string[])=>Object.keys(value).every(k=>keys.includes(k));
function stringMap(v:unknown,max:number):boolean {
 if(!own(v)||Object.keys(v).length>max)return false;
 return Object.entries(v).every(([key,value])=>key.length>0&&key.length<=256&&!['__proto__','constructor','prototype'].includes(key)&&typeof value==='string'&&value.length<=PLAYER_SNAPSHOT_BYTES);
}
export interface PlayerSnapshot {schemaVersion:1;deviceId:string;savedAt:number;values:Record<string,string>;mirrors?:Record<string,string>}
export function validPlayerSnapshot(v:unknown,deviceId:string):v is PlayerSnapshot {
 if(!own(v)||!allowedKeys(v,['schemaVersion','deviceId','savedAt','values','mirrors'])||v.schemaVersion!==1||!validPlayerDevice(v.deviceId)||v.deviceId.toLowerCase()!==deviceId.toLowerCase()||!safe(v.savedAt)||!stringMap(v.values,128)||v.mirrors!==undefined&&!stringMap(v.mirrors,32))return false;
 return encoder.encode(JSON.stringify(v)).byteLength<=PLAYER_SNAPSHOT_BYTES;
}
/** Read incrementally: Content-Length is only a hint, never the memory bound. */
export async function boundedRequestText(request:Request,limit=PLAYER_REQUEST_BYTES):Promise<{raw:string;bytes:number}|null>{
 const size=request.headers.get('content-length');if(size!==null&&/^\d+$/.test(size)&&Number(size)>limit)return null;
 const reader=request.body?.getReader();if(!reader)return{raw:'',bytes:0};const decoder=new TextDecoder('utf-8',{fatal:true});let raw='',bytes=0;
 try{for(;;){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>limit){await reader.cancel().catch(()=>{});return null;}raw+=decoder.decode(next.value,{stream:true});}raw+=decoder.decode();return{raw,bytes};}
 finally{reader.releaseLock();}
}
type Rpc=(name:string,args:unknown)=>Promise<unknown>;
type Reply=(body:unknown,status?:number)=>Response;
export async function handlePlayerTransfer(body:unknown,rpc:Rpc,reply:Reply):Promise<Response|undefined>{
 if(!own(body)||body.action===undefined)return undefined;
 if(body.action!=='player-read'&&body.action!=='player-write')return reply({error:'Unknown player action'},400);
 const writing=body.action==='player-write',keys=writing?['action','deviceId','expectedRevision','snapshot']:['action','deviceId'];
 if(!allowedKeys(body,keys)||!validPlayerDevice(body.deviceId))return reply({error:'Invalid player request'},400);
 const deviceId=body.deviceId.toLowerCase();
 if(writing&&(!safe(body.expectedRevision)||body.expectedRevision>=Number.MAX_SAFE_INTEGER||!validPlayerSnapshot(body.snapshot,deviceId)))return reply({error:'Invalid player snapshot or revision'},400);
 try{
  if(await rpc('weft_take_player_token',{p_device:deviceId,p_action:writing?'write':'read'})!==true)return reply({error:'Please wait before transferring again',code:'PLAYER_RATE_LIMIT'},429);
  if(!writing){
   const result=await rpc('weft_player_read',{p_device:deviceId});
   if(!own(result)||result.schemaVersion!==1||result.deviceId!==deviceId||!safe(result.revision)||result.snapshot!==null&&!validPlayerSnapshot(result.snapshot,deviceId)||!own(result.legacy)||!Array.isArray(result.legacy.rows)||!Array.isArray(result.legacy.badges))throw Error('Invalid private response');
   if(result.legacy.rows.some(row=>!own(row)||row.deviceId!==undefined&&row.deviceId!==deviceId||row.device_id!==undefined&&row.device_id!==deviceId))throw Error('Cross-profile private response');
   return reply(result);
  }
  const result=await rpc('weft_player_write',{p_device:deviceId,p_expected_revision:body.expectedRevision,p_snapshot:body.snapshot});
  if(!own(result)||!safe(result.revision))throw Error('Invalid private response');
  if(result.conflict===true)return reply({error:'Player backup changed; read it again',code:'PLAYER_REVISION_CONFLICT',revision:result.revision},409);
  if(result.accepted!==true||result.revision!==(body.expectedRevision as number)+1||result.deviceId!==deviceId)throw Error('Invalid private response');
  return reply({accepted:true,schemaVersion:1,deviceId,revision:result.revision,savedAt:(body.snapshot as PlayerSnapshot).savedAt});
 }catch{return reply({error:'Player transfer storage unavailable; please try again',code:'PLAYER_STORAGE_UNAVAILABLE'},503);}
}
