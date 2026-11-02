/** NEON PARTY LIVE minimal SSE backend — Node.js 20+, no mandatory npm dependencies. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const {normalize}=require('./normalize.js');
const PORT=Number(process.env.PORT||4173);
const HOST=process.env.HOST||'127.0.0.1';
const ADMIN_TOKEN=process.env.NEON_ADMIN_TOKEN||'';
const clients=new Set();
const recentIds=new Map();
let eventCounts={viewer:0,comment:0,like:0,share:0,gift:0,follow:0};
let connected=false,connection=null,username='',statusError='';
// Explicit CORS allowlist for public read-only status and SSE. Admin mutations never accept cross-origin requests.
const CORS_ORIGINS = new Set((process.env.NEON_CORS_ORIGINS || 'https://tranthiquynhnhu0901-hue.github.io').split(',').map(x=>x.trim().replace(/\/+$/,'')).filter(Boolean));
const maxBody=8192;
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mp3':'audio/mpeg','.m4a':'audio/mp4','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const allowedFiles=new Set(['/','/index.html','/styles.css','/app.js','/config.js','/assets/neon_live_mix.m4a','/assets/party_123_zo.mp3','/assets/beer_open.mp3','/assets/beer_pour.mp3','/assets/fx_gift.mp3','/assets/fx_glass.mp3','/assets/fx_service.mp3','/assets/fx_fireworks.mp3','/assets/fx_crowd.mp3','/assets/fx_ui.mp3']);
function respond(res,status,obj){const body=JSON.stringify(obj);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'});res.end(body)}
function event(payload){if(payload?.type&&payload.type in eventCounts)eventCounts[payload.type]++;let msg='data: '+JSON.stringify({id:crypto.randomUUID(),at:Date.now(),...payload})+'\n\n';for(const s of clients){try{s.write(msg)}catch{clients.delete(s)}}}
function emitNormalized(type,data){const payload=normalize(type,data);if(!payload)return;
 // Message IDs may appear multiple times (e.g. from both social/share events).
 if(payload.eventId){const now=Date.now();const dedupeKey=payload.type+':'+payload.eventId;if(recentIds.has(dedupeKey))return;recentIds.set(dedupeKey,now);if(recentIds.size>1500){for(const [key,t] of recentIds){if(now-t>180000)recentIds.delete(key)}while(recentIds.size>1500)recentIds.delete(recentIds.keys().next().value)}}
 event(payload);
}
async function connectTikTok(user){
 if(connection){try{await connection.disconnect()}catch{}connection=null}
 connected=false;username='';statusError='';
 if(!/^[A-Za-z0-9._]{2,32}$/.test(user))throw Error('Tên tài khoản TikTok không hợp lệ.');
 let plugin;try{plugin=await import('tiktok-live-connector')}catch{throw Error('Chưa cài tiktok-live-connector. Chạy npm install trong thư mục dự án. Xem README.')}
 const Con=plugin.TikTokLiveConnection||plugin.default?.TikTokLiveConnection;
 if(!Con)throw Error('Không tìm thấy TikTokLiveConnection trong phiên bản thư viện đã cài.');
 const c=new Con(user,{enableExtendedGiftInfo:false,processInitialData:false});connection=c;
 for(const name of ['chat','member','like','share','social','follow','gift'])c.on(name,d=>emitNormalized(name,d));
 c.on('disconnected',()=>{if(connection!==c)return;connected=false;statusError='Mất kết nối tới phiên LIVE';event({type:'status',live:false,error:statusError})});
 c.on('streamEnd',()=>{if(connection!==c)return;connected=false;statusError='Phiên LIVE đã kết thúc';event({type:'status',live:false,error:statusError})});
 c.on('error',e=>{if(connection!==c)return;statusError=String(e?.message||e).slice(0,250);console.warn('TikTok connector:',statusError)});
 try{const room=await c.connect();connected=true;username=user;event({type:'status',live:true,username:user});return {live:true,username:user,roomId:room?.roomId||null}}
 catch(e){connected=false;connection=null;statusError=String(e?.message||e);throw e}
}
async function readJson(req){const chunks=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>maxBody)throw Error('Payload vượt giới hạn');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}
function authorized(req){if(!ADMIN_TOKEN)return false;const bearer=req.headers.authorization||'';const token=String(bearer).startsWith('Bearer ')?bearer.slice(7):'';if(!token)return false;const a=Buffer.from(token),b=Buffer.from(ADMIN_TOKEN);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');const p=u.pathname;
 // Protect all privileged endpoints from cross-origin browser requests.
 const reqOrigin=String(req.headers.origin||'');
 if(reqOrigin&&CORS_ORIGINS.has(reqOrigin)&&req.method==='GET'&&['/api/status','/api/events','/healthz'].includes(p)){
   res.setHeader('Access-Control-Allow-Origin',reqOrigin);
   res.setHeader('Vary','Origin');
 }
 if(req.method==='OPTIONS')return respond(res,403,{ok:false,error:'Cross-origin administrative access is disabled'});
 if(req.method==='POST'&&reqOrigin){
   const forwardedProto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim();
   const selfOrigin=(req.socket.encrypted||forwardedProto==='https'?'https':'http')+'://'+req.headers.host;
   if(reqOrigin!==selfOrigin)return respond(res,403,{ok:false,error:'Administration requires same-origin access'});
 }
 if(req.method==='GET'&&p==='/healthz')return respond(res,200,{ok:true,server:true});
 if(req.method==='GET'&&p==='/api/status')return respond(res,200,{server:true,live:connected,username,connector:'optional-unofficial',error:statusError,clients:clients.size,eventCounts});
 if(req.method==='GET'&&p==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 3500\n\n');clients.add(res);res.write('data: '+JSON.stringify({type:'status',live:connected})+'\n\n');req.on('close',()=>clients.delete(res));return}
 if(req.method==='POST'&&['/api/event','/api/live/connect','/api/live/disconnect'].includes(p)){if(!authorized(req))return respond(res,401,{ok:false,error:ADMIN_TOKEN?'Sai mã quản trị':'Chưa cấu hình NEON_ADMIN_TOKEN trên server'});const body=await readJson(req);
 if(p==='/api/event'){let type=String(body.type||'');if(!['viewer','like','share','gift','comment','party','follow'].includes(type))return respond(res,400,{ok:false,error:'Loại sự kiện không được hỗ trợ'});let payload={type,name:String(body.name||'Người xem').slice(0,32),source:'demo'};if(type==='like'||type==='share')payload.count=Math.min(1000,Math.max(1,Number(body.count)||1));if(type==='gift'){payload.tier=Math.min(6,Math.max(1,Number(body.tier)||1));payload.giftName=String(body.giftName||'Quà Neon').slice(0,80)}if(type==='comment')payload.comment=String(body.comment||'').slice(0,180);event(payload);return respond(res,200,{ok:true,sent:payload})}
 if(p==='/api/live/connect'){try{return respond(res,200,{ok:true,...await connectTikTok(String(body.username||'').replace(/^@/,''))})}catch(e){return respond(res,503,{ok:false,error:String(e.message||e)})}}
 if(p==='/api/live/disconnect'){if(connection){try{await connection.disconnect()}catch{}connection=null}connected=false;event({type:'status',live:false});return respond(res,200,{ok:true,live:false})}
 }
 if((req.method==='GET'||req.method==='HEAD')&&allowedFiles.has(p)){const rel=p==='/'?'/index.html':p;const f=path.join(root,rel);if(!fs.existsSync(f))return respond(res,404,{error:'Asset not found'});const st=fs.statSync(f);const type=mime[path.extname(f)]||'application/octet-stream';if((type==='audio/mpeg'||type==='audio/mp4')&&req.headers.range){const m=/bytes=(\d*)-(\d*)/.exec(req.headers.range);if(m){let start=m[1]?Number(m[1]):0,end=m[2]?Number(m[2]):st.size-1;start=Math.max(0,Math.min(start,st.size-1));end=Math.max(start,Math.min(end,st.size-1));res.writeHead(206,{'Content-Type':type,'Content-Range':`bytes ${start}-${end}/${st.size}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes'});if(req.method==='HEAD')return res.end();return fs.createReadStream(f,{start,end}).pipe(res)}}res.writeHead(200,{'Content-Type':type,'Content-Length':st.size,'Cache-Control':(type==='audio/mpeg'||type==='audio/mp4')?'public, max-age=3600':'no-store','Accept-Ranges':'bytes'});if(req.method==='HEAD')return res.end();return fs.createReadStream(f).pipe(res)}
 respond(res,404,{error:'Not found'});
 }catch(e){console.error('server:',e);if(!res.headersSent)respond(res,500,{ok:false,error:'Internal server error'});else res.end()}});
setInterval(()=>{for(const res of clients){try{res.write(': heartbeat\n\n')}catch{clients.delete(res)}}},20000).unref();
server.listen(PORT,HOST,()=>{console.log(`NEON PARTY running at http://${HOST}:${PORT}`);console.log('ADMIN_TOKEN configured:',Boolean(ADMIN_TOKEN));console.log('Real TikTok integration is optional and unsupported without explicit setup.')});
