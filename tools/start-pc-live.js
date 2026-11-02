'use strict';
const path=require('node:path');
const {spawn}=require('node:child_process');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const port=process.env.PORT||'4173';
const token=process.env.NEON_ADMIN_TOKEN||crypto.randomBytes(18).toString('hex');
const base=`http://127.0.0.1:${port}`;
console.log('\nNEON PARTY LIVE v2.6 - LIVE PC');
console.log('Trang quan tri:',base+'/?admin=1');
console.log('Nguon OBS 9:16:',base+'/?overlay=1&camera=auto');
console.log('Ma quan tri phien nay:',token);
console.log('Giu ma nay rieng tu. De ket noi TikTok can npm install va mot phien LIVE thuc.\n');
try {require.resolve('tiktok-live-connector',{paths:[root]});console.log('TikTok connector installed (chua xac minh LIVE that).');}
catch {console.log('Chua cai TikTok connector. Chay npm install de thu ket noi LIVE.');}
const child=spawn(process.execPath,[path.join(root,'server','server.js')],{
 cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),NEON_ADMIN_TOKEN:token},stdio:'inherit'
});
child.on('exit',code=>{console.log('Server da dung:',code);process.exitCode=code||0});
function stop(){if(!child.killed)child.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
