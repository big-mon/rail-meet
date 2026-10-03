import {validate,recommend} from './engine.mjs';
import {checkOrigins,shareUrl} from './share.mjs';
const BASE='https://app.damonge.com/rail-meet/';
const PREFIX='/rail-meet/api/v1/';
const HEADERS={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'Retry-After','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Link':`<${BASE}openapi.json>; rel="service-desc"`};
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{...HEADERS,...headers}});}
function error(status,code,message,headers={}){return json({error:{code,message}},status,headers);}
async function bodyJson(request){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||!['identity',null].includes(request.headers.get('content-encoding')))throw {status:415,code:'unsupported_media_type',message:'application/json（非圧縮）を送信してください。'};
 const length=request.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>1024))throw {status:413,code:'body_too_large',message:'本文は1024バイト以内にしてください。'};
 if(!request.body)throw {status:400,code:'invalid_json',message:'JSON本文が必要です。'};
 const reader=request.body.getReader();let size=0,text='',timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject({status:408,code:'body_timeout',message:'本文の受信がタイムアウトしました。'}),3000);});
 const decoder=new TextDecoder('utf-8',{fatal:true});
 try{
  while(true){const {done,value}=await Promise.race([reader.read(),timeout]);if(done)break;size+=value.byteLength;if(size>1024)throw {status:413,code:'body_too_large',message:'本文は1024バイト以内にしてください。'};text+=decoder.decode(value,{stream:true});}
  return JSON.parse(text+decoder.decode());
 }catch(e){if(e.status)throw e;throw {status:400,code:'invalid_json',message:'有効なUTF-8 JSONを送信してください。'};}
 finally{clearTimeout(timer);reader.cancel().catch(()=>{});}
}
export function createApi(data,{now=Date.now}={}){
 validate(data);
 if(data.stations.length>100||data.edges.length>200||data.edges.reduce((n,e)=>n+e.coords.length,0)>10000)throw Error('API dataset exceeds the small-network budget');
 const stations=data.stations.map(s=>({id:s.id,name:s.id,coordinates:s.coords}));
 let windowStart=now(),total=0;const clients=new Map(),cache=new Map();
 // ponytail: isolate-local burst protection, NOT a global quota or billing cap.
 // A global guarantee needs an approved platform limiter/budget configuration before release.
 function limited(request){
  const time=now();if(time-windowStart>=60000||time<windowStart){windowStart=time;total=0;clients.clear();}
  const raw=request.headers.get('CF-Connecting-IP'),ip=raw&&raw.length<=128?raw:'anonymous';
  const count=clients.get(ip)||0;
  if(total>=300||count>=30)return true;
  clients.set(ip,count+1);total++;return false;
 }
 return async function handle(request){
  const url=new URL(request.url),path=url.pathname;
  if(url.href.length>2048)return error(414,'url_too_long','URLが長すぎます。');
  if(![PREFIX+'stations',PREFIX+'recommendations'].includes(path))return error(404,'not_found','APIエンドポイントが見つかりません。');
  const method=path.endsWith('/stations')?'GET':'POST';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...HEADERS,'Access-Control-Allow-Methods':method+', OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'3600'}});
  if(request.method!==method)return error(405,'method_not_allowed',method+'を使用してください。',{Allow:method+', OPTIONS'});
  if(limited(request))return error(429,'rate_limited','しばらく待って再試行してください。',{'Retry-After':'60'});
  if(method==='GET'){
   const q=url.searchParams.get('q')||'';
   if(q.length>40||url.searchParams.getAll('q').length>1||[...url.searchParams.keys()].some(k=>k!=='q'))return error(400,'invalid_query','qは40文字以内で1件だけ指定できます。');
   const matches=stations.filter(s=>s.name.includes(q));
   return json({stations:matches,count:matches.length},200,{'Cache-Control':'public, max-age=3600'});
  }
  if(url.search)return error(400,'invalid_query','計算条件はJSON本文だけに指定してください。');
  let input;
  try{input=await bodyJson(request);}catch(e){return error(e.status,e.code,e.message);}
  if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).some(k=>!['origins','share'].includes(k))||(Object.hasOwn(input,'share')&&typeof input.share!=='boolean'))return error(400,'invalid_input','origins配列と任意のshare真偽値だけを指定してください。');
  try{checkOrigins(input.origins,data);}catch(e){return error(400,'invalid_origins',e.message);}
  try{
   const key=JSON.stringify(input.origins);let candidates=cache.get(key);
   if(!candidates){candidates=recommend(data,input.origins);if(cache.size>=16)cache.delete(cache.keys().next().value);cache.set(key,candidates);}
   if(!candidates.length)return error(422,'unreachable','全員が到達できる集合駅がありません。');
   return json({origins:input.origins,unit:'km',distanceBasis:'rail_geometry_not_fare_or_time',ranking:['max','spread','total','station'],source:{dataset:data.source?.dataset||'N02-24',license:'CC BY 4.0',attribution:'国土交通省 国土数値情報をみんなの中間駅が加工',url:BASE+'sources'},candidates:candidates.map(c=>({...c,...(input.share?{shareUrl:shareUrl(input.origins,c.station)}:{})}))});
  }catch{return error(503,'temporarily_unavailable','計算を完了できませんでした。');}
 };
}
