'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const required=['index.html','app.js','styles.css','config.js','assets/neon_live_mix.m4a','assets/beer_open.mp3','assets/beer_pour.mp3','assets/party_123_zo.mp3','assets/fx_gift.mp3','assets/fx_glass.mp3','assets/fx_service.mp3','assets/fx_fireworks.mp3','assets/fx_crowd.mp3','assets/fx_ui.mp3','.github/workflows/pages.yml'];
for (const r of required){if(!fs.existsSync(path.join(root,r)))throw Error('THIEU FILE: '+r);}
let count=0;let max=0;let largest='';
function check(d){for(const name of fs.readdirSync(d)){if(name==='.git'||name==='node_modules'||name==='public')continue;const p=path.join(d,name),s=fs.statSync(p);if(s.isDirectory())check(p);else {count++;if(s.size>max){max=s.size;largest=path.relative(root,p);}if(s.size>24_000_000)throw Error('File qua 24MB: '+p+' ('+s.size+' bytes)');}}}
check(root);
console.log('OK: '+count+' files; largest '+largest+' = '+(max/1e6).toFixed(2)+' MB (<25 MB GitHub web upload limit).');
