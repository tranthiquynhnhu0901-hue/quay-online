/* NEON PARTY LIVE — self-contained canvas game engine; no remote JS/assets required. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
// Deployment boundary: GitHub Pages serves the game; a separate HTTPS backend streams LIVE events.
// This does not alter the existing game engine or DEMO behavior.
const neonConfig = window.NEON_CONFIG || {};
const backendUrl = String(neonConfig.BACKEND_URL || '').trim().replace(/\/+$/, '');
const githubPages = location.hostname.endsWith('.github.io');
const backendBase = backendUrl || (githubPages || !/^https?:$/.test(location.protocol) ? '' : location.origin);
const apiEndpoint = route => backendBase ? backendBase + route : null;
const sameOriginBackend = Boolean(backendBase && backendBase === location.origin);

const canvas = $('gameCanvas'), ctx=canvas.getContext('2d',{alpha:false});
const audio=$('bgMusic');
// Original, bundled party soundtrack: six layered Vietnamese synthetic voices,
// glass clinks, crowd cheers and fireworks. Plays after the visitor enables audio.
const partyAudio=$('partyChant');
const beerOpenAudio=$('beerOpenAudio'),beerPourAudio=$('beerPourAudio');
let beerSoundEnabled=true;
// v2.6.2: independent AUDIO ENGINE. Effect playback is never tied to DJ music loading.
const fxUrls={gift:'assets/fx_gift.mp3',glass:'assets/fx_glass.mp3',service:'assets/fx_service.mp3',fireworks:'assets/fx_fireworks.mp3',crowd:'assets/fx_crowd.mp3',ui:'assets/fx_ui.mp3'};
const fxNames={gift:'Quà tặng',glass:'Cụng ly',service:'Phục vụ bàn',fireworks:'Pháo hoa',crowd:'Không khí đám đông',ui:'Nút bấm'};
const extraFx={};
for(const [k,src] of Object.entries(fxUrls)){const a=new Audio(new URL(src,document.baseURI).href);a.preload='auto';a.playsInline=true;extraFx[k]=a}
let lastFxAlert=0;
function activateSoundSystem(){
 soundActivated=true;
 try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended'){const r=audioContext.resume();if(r?.catch)r.catch(()=>{})}}catch{}
 updatePartyAudioVolume();
}
function fxLevel(){return !partySoundEnabled?0:partySoundVolume}
function playMediaClip(clip,label='',vol=1){
 if(!clip||!soundActivated||!partySoundEnabled)return false;
 try{
  if(clip.error){clip.load()}
  clip.pause();clip.currentTime=0;
  clip.volume=Math.min(1,Math.max(0,fxLevel()*vol));
  const promise=clip.play();
  if(promise?.catch)promise.catch(e=>{
   console.warn('NEON SFX failed:',label,clip.currentSrc,e?.name,e?.message);
   if(Date.now()-lastFxAlert>9000){lastFxAlert=Date.now();toast('⚠ Âm thanh '+label+' chưa phát. Mở ⚙ → Kiểm tra toàn bộ âm thanh.');}
  });
  return true;
 }catch(err){console.warn('NEON SFX:',label,err);return false;}
}
function playAssetSound(name,vol=1){return playMediaClip(extraFx[name],fxNames[name]||name,vol)}
// Ensure browsers receive a user gesture to unlock all bundled clips (especially mobile).
function unlockSoundClips(){
 activateSoundSystem();
 const clips=[partyAudio,beerOpenAudio,beerPourAudio,...Object.values(extraFx)].filter(Boolean);
 for(const a of clips){
  try{a.muted=true;const result=a.play();if(result?.then)result.then(()=>{a.pause();a.currentTime=0;a.muted=false}).catch(()=>{a.muted=false});else{a.pause();a.currentTime=0;a.muted=false}}catch{a.muted=false}
 }
}
function playBeerFx(clip){
 if(!beerSoundEnabled)return;
 playMediaClip(clip,clip===beerOpenAudio?'Khui bia':'Rót ly',1);
}

let partySoundVolume=.92,partySoundEnabled=true,partyAudioPlaying=false;
try {const v=localStorage.getItem('neon_party_sfx_volume'),en=localStorage.getItem('neon_party_sfx_enabled');if(v!==null&&Number.isFinite(+v))partySoundVolume=Math.max(0,Math.min(1,+v));if(en!==null)partySoundEnabled=en==='true';}catch{}
function updatePartyAudioVolume(){if(partyAudio)partyAudio.volume=fxLevel();for(const a of Object.values(extraFx))a.volume=fxLevel();}
function savePartySfx(){try{localStorage.setItem('neon_party_sfx_volume',String(partySoundVolume));localStorage.setItem('neon_party_sfx_enabled',String(partySoundEnabled))}catch{}updatePartyAudioVolume();}
function playPartyChant(){if(!partyAudio||!soundActivated||!partySoundEnabled)return;
 partyAudioPlaying=true;applyMusicVolume();
 try{
  partyAudio.pause();partyAudio.currentTime=0;updatePartyAudioVolume();
  const result=partyAudio.play();
  if(result?.catch)result.catch(err=>{partyAudioPlaying=false;applyMusicVolume();console.warn('Party sound failed:',err);if(Date.now()-lastFxAlert>9000){lastFxAlert=Date.now();toast('⚠ Tiếng hô tập thể chưa phát. Kiểm tra toàn bộ âm thanh trong ⚙.')}});
 }catch(err){partyAudioPlaying=false;applyMusicVolume();console.warn('Party chant:',err)}
}
if(partyAudio){partyAudio.addEventListener('ended',()=>{partyAudioPlaying=false;applyMusicVolume()});partyAudio.addEventListener('pause',()=>{if(partyAudio.ended||!cheersEvent){partyAudioPlaying=false;applyMusicVolume()}})}
function partySoundSettings(){
 showModal('Trung tâm âm thanh','🔊 KIỂM TRA TOÀN BỘ ÂM THANH',
 `<p class="modal-note">Nhạc DJ, lời MC và hiệu ứng được điều khiển riêng. Khi nhạc DJ bị thiếu, những tiếng khui bia, rót ly, cụng ly, pháo hoa, quà tặng và hô tập thể vẫn có thể hoạt động.</p>
 <div class="settings-line"><span>🎉 Bật toàn bộ hiệu ứng</span><input id="partyFxEnabled" type="checkbox" ${partySoundEnabled?'checked':''}></div>
 <div class="settings-line"><span>🔊 Âm lượng hiệu ứng riêng</span><input id="partyFxVolume" type="range" min="0" max="100" value="${Math.round(partySoundVolume*100)}"></div>
 <div class="audio-check-grid">
 <button class="secondary-btn audio-preview" data-preview="dj">♫ Thử nhạc DJ</button>
 <button class="secondary-btn audio-preview" data-preview="party">📣 Hô 1–2–3 Zô!</button>
 <button class="secondary-btn audio-preview" data-preview="open">🍺 Khui bia</button>
 <button class="secondary-btn audio-preview" data-preview="pour">🍻 Rót ly</button>
 <button class="secondary-btn audio-preview" data-preview="gift">🎁 Quà tặng</button>
 <button class="secondary-btn audio-preview" data-preview="glass">🥂 Cụng ly</button>
 <button class="secondary-btn audio-preview" data-preview="service">🛎️ Phục vụ</button>
 <button class="secondary-btn audio-preview" data-preview="fireworks">🎆 Pháo hoa</button>
 <button class="secondary-btn audio-preview" data-preview="crowd">👏 Đám đông</button>
 <button class="secondary-btn audio-preview" data-preview="mc">🎙 MC đọc tên</button>
 </div>
 <button class="primary-btn" id="audioCheckFiles" type="button">🔎 Kiểm tra đủ 10 nguồn âm thanh</button>
 <div id="allAudioResult" class="audio-results" aria-live="polite">Nhấn từng nút để nghe thử. Nếu không phát, kiểm tra file còn tồn tại trên GitHub Pages.</div>
 <p class="modal-note">Chrome cần bạn bấm “Vào quán & Bật âm thanh” một lần. Khi phát qua OBS: Browser Source → Control audio via OBS và Interact nếu cần. Giọng MC tiếng Việt phụ thuộc giọng cài trên máy.</p>`,()=>{
  $('partyFxEnabled').onchange=e=>{partySoundEnabled=e.target.checked;savePartySfx()};
  $('partyFxVolume').oninput=e=>{partySoundVolume=Number(e.target.value)/100;savePartySfx()};
  const status=$('allAudioResult');
  const say=t=>{status.textContent=t};
  document.querySelectorAll('.audio-preview').forEach(b=>b.addEventListener('click',()=>{
   activateSoundSystem();partySoundEnabled=true;savePartySfx();const k=b.dataset.preview;
   if(k==='dj'){muted=false;startAudio();say('Đang thử phát nhạc nền. Nếu không nghe thấy, chọn 🔎 để xem tệp có thiếu không.');}
   else if(k==='mc'){const person=self||{id:'sample',name:'Minh Anh'};mcReady=true;mcEnabled=true;mcNames.delete('audio-preview');welcomePerson({...person,id:'audio-preview',viewerKey:'audio-preview',name:'Minh Anh'},true);scheduleWelcome();say('Đã gửi câu chào “Xin chào Minh Anh” cho giọng đọc của trình duyệt.');}
   else if(k==='party'){playPartyChant();say('Đang thử đoạn tiếng hô tập thể.');}
   else if(k==='open'){playBeerFx(beerOpenAudio);say('Đang thử tiếng khui bia.');}
   else if(k==='pour'){playBeerFx(beerPourAudio);say('Đang thử tiếng rót ly.');}
   else{playAssetSound(k);say('Đang thử hiệu ứng: '+(fxNames[k]||k));}
  }));
  $('audioCheckFiles').onclick=async()=>{
   status.textContent='Đang kiểm tra đường dẫn file…';
   const items=[['DJ Mix',audio],['Hô 1–2–3 Zô',partyAudio],['Khui bia',beerOpenAudio],['Rót ly',beerPourAudio],...Object.entries(extraFx).map(([k,a])=>[fxNames[k],a])];
   const results=await Promise.all(items.map(async([name,a])=>{
    if(!a)return {name,ok:false,desc:'Thiếu phần tử âm thanh'};
    const url=new URL(a.getAttribute('src')||a.src,document.baseURI).href;
    try{const res=await fetch(url,{method:'HEAD',cache:'no-store'});return {name,ok:res.ok&&!((res.headers.get('content-type')||'').includes('text/html')),desc:res.ok?'HTTP '+res.status:'HTTP '+res.status,href:url}}
    catch(e){return {name,ok:false,desc:location.protocol==='file:'?'Không kiểm tra HEAD trên file:// (hãy thử nghe)':'Lỗi tải '+e.message,href:url}}
   }));
   status.replaceChildren(...results.map(r=>{const el=document.createElement('div');el.className=r.ok?'audio-ok':'audio-missing';el.textContent=(r.ok?'✅ ':'⚠️ ')+r.name+' — '+r.desc;return el}));
  };
 });
}

// Vietnamese browser text-to-speech, opt-in by entering with sound or by pressing Test.
// Uses local voices; may be unavailable on some browsers / OBS installations.
const speechEngine='speechSynthesis' in window ? window.speechSynthesis : null;
const welcomeQueue=[];
let mcEnabled=true,mcVolume=.9,mcRate=.97,mcReady=false,mcSpeaking=false,mcTimer=0,mcLastStarted=0,mcToken=0,mcVoice=null;
const mcNames=new Set();
const welcomeTemplates=[
  'Xin chào {ten} đến với Neon Party! Chúc bạn có một buổi tối thật cháy!',
  'Neon Party xin chào đón {ten}! Mời bạn lên sàn nhảy cùng LUNA và KAI nhé!',
  'Một tràng pháo tay cho {ten} vừa đến quán! Chúc bạn vui hết mình tại Neon Party!'
];
try{const e=localStorage.getItem('neon_mc_enabled'),v=localStorage.getItem('neon_mc_volume'),r=localStorage.getItem('neon_mc_rate');if(e!==null)mcEnabled=e==='true';if(v!==null&&Number.isFinite(+v))mcVolume=Math.max(.05,Math.min(1,+v));if(r!==null&&Number.isFinite(+r))mcRate=Math.max(.75,Math.min(1.25,+r))}catch{}
function mcSave(){try{localStorage.setItem('neon_mc_enabled',String(mcEnabled));localStorage.setItem('neon_mc_volume',String(mcVolume));localStorage.setItem('neon_mc_rate',String(mcRate))}catch{}}
function speechName(s){const name=String(s||'').normalize('NFKC').replace(/[_.@#]/g,' ').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();return name.slice(0,36)||'bạn';}
function selectVoice(){if(!speechEngine)return null;const list=speechEngine.getVoices()||[];return list.find(v=>/^vi(-|$)/i.test(v.lang)&&/female|linh|hoai|huyen/i.test(v.name))||list.find(v=>/^vi(-|$)/i.test(v.lang))||null}
if(speechEngine){try{speechEngine.addEventListener('voiceschanged',()=>{mcVoice=selectVoice()})}catch{}mcVoice=selectVoice()}
function applyMusicVolume(){audio.volume=muted?0:volume*(mcSpeaking?.23:partyAudioPlaying?.17:1);updatePartyAudioVolume()}
function showWelcome(c,text){const card=$('welcomeToast');if(!card)return;const avatar=$('welcomeAvatar');avatar.replaceChildren();avatar.textContent=(c.name||'?').slice(0,1).toUpperCase();if(c.avatar){const im=document.createElement('img');im.alt='';im.src=c.avatar;im.onerror=()=>im.remove();avatar.appendChild(im)}$('welcomeName').textContent=c.name;$('welcomeCaption').textContent=text;card.hidden=false}
function clearWelcome(){const card=$('welcomeToast');if(card)card.hidden=true}
function cancelWelcomeVoice(){mcToken++;clearTimeout(mcTimer);mcSpeaking=false;clearWelcome();applyMusicVolume();try{speechEngine?.cancel()}catch{}}
function scheduleWelcome(){clearTimeout(mcTimer);if(!mcReady||!mcEnabled||!welcomeQueue.length)return;const pause=Math.max(0,6500-(Date.now()-mcLastStarted));mcTimer=setTimeout(playNextWelcome,pause)}
function playNextWelcome(){if(mcSpeaking||!mcReady||!mcEnabled||!welcomeQueue.length)return;
 if(giftShot||cheersEvent){mcTimer=setTimeout(playNextWelcome,700);return}
 const item=welcomeQueue.shift(),t=++mcToken;mcSpeaking=true;mcLastStarted=Date.now();showWelcome(item.person,item.text);applyMusicVolume();
 if(!speechEngine||typeof window.SpeechSynthesisUtterance!=='function'){
   mcTimer=setTimeout(()=>{if(t!==mcToken)return;mcSpeaking=false;clearWelcome();applyMusicVolume();scheduleWelcome()},3900);return;
 }
 try{const phrase=new SpeechSynthesisUtterance(item.text);phrase.lang='vi-VN';phrase.rate=mcRate;phrase.pitch=1.04;phrase.volume=mcVolume;mcVoice=selectVoice();if(mcVoice)phrase.voice=mcVoice;
 let closed=false;const done=()=>{if(closed||t!==mcToken)return;closed=true;clearTimeout(mcTimer);mcSpeaking=false;clearWelcome();applyMusicVolume();scheduleWelcome()};
 phrase.onend=done;phrase.onerror=done;speechEngine.speak(phrase);
 mcTimer=setTimeout(done,9300); // recover if a browser never fires onend
 }catch{mcTimer=setTimeout(()=>{if(t!==mcToken)return;mcSpeaking=false;clearWelcome();applyMusicVolume();scheduleWelcome()},3900)}
}
function welcomePerson(c,force=false){if(!c)return;const key=String(c.viewerKey||c.id||c.name).toLowerCase();if(!force){if(mcNames.has(key))return;mcNames.add(key)}
 const name=speechName(c.name);const idx=Math.max(0,mcNames.size-1)%welcomeTemplates.length;
 const text=welcomeTemplates[idx].replace('{ten}',name);
 if(!mcEnabled)return;
 if(welcomeQueue.length>=6){return} // do not block gift music in large LIVE rooms
 welcomeQueue.push({person:c,text});if(!mcSpeaking)scheduleWelcome();
}
function mcSettingsModal(){showModal('MC chào người xem','🎙 PERSONALIZED WELCOME',`<p class="modal-note">Giọng MC đọc tên khi người xem mới tham gia qua sự kiện TikTok hợp lệ hoặc lệnh !join. Hệ thống xếp hàng và chống chào trùng; ưu tiên quà tặng trên sân khấu. Tùy trình duyệt và giọng tiếng Việt cài trên thiết bị, chất lượng phát âm có thể khác nhau.</p>
<div class="settings-line"><span>🔊 Bật đọc lời chào</span><input id="mcEnabled" type="checkbox" ${mcEnabled?'checked':''} aria-label="Bật MC chào khách"></div>
<div class="settings-line"><span>🎚 Âm lượng MC</span><input id="mcVolume" type="range" min="5" max="100" value="${Math.round(mcVolume*100)}"></div>
<div class="settings-line"><span>🎙 Tốc độ đọc</span><input id="mcRate" type="range" min="75" max="125" value="${Math.round(mcRate*100)}"></div>
<div class="settings-line"><span>🗣 Giọng tiếng Việt</span><b id="mcVoiceLabel">${speechEngine?(selectVoice()?.name||'Giọng hệ thống, chưa xác định vi-VN'):'Thiết bị không hỗ trợ TTS'}</b></div>
<button class="primary-btn" id="mcTest">▶ Thử lời chào theo tên</button>
<p class="modal-note">Nhấn nút thử để cấp quyền âm thanh. Nhạc DJ sẽ được giảm tạm thời khi MC đang đọc. Nếu OBS không có giọng đọc tiếng Việt, cần cài giọng trên hệ điều hành hoặc dùng giải pháp TTS server được cấp phép.</p>`,()=>{
 $('mcEnabled').addEventListener('change',e=>{mcEnabled=e.target.checked;mcSave();if(!mcEnabled){welcomeQueue.length=0;cancelWelcomeVoice()}});
 $('mcVolume').addEventListener('input',e=>{mcVolume=clamp(Number(e.target.value)/100,.05,1);mcSave()});
 $('mcRate').addEventListener('input',e=>{mcRate=clamp(Number(e.target.value)/100,.75,1.25);mcSave()});
 $('mcTest').addEventListener('click',()=>{mcReady=true;mcEnabled=true;$('mcEnabled').checked=true;mcSave();welcomePerson(getOwner(),true);closeModal()})
})}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const W=1920,H=1160,colors=['#e87bc1','#65c9f5','#b18aff','#ffbd72','#6ce6be','#ef98a8','#79a6ff','#d8d17a'];
const names=['Mèo Mun','Bông Xù','Panda Love','Vivi','Bảo Bối','Nấm Lùn','Kẹo Ngọt','Nana','Kem Dâu','Bắp Rang','Kiki','Mây Trắng','Bé Thỏ','Chíp Chíp','Cherry','Cún Con','BoBo','Mochi','Mít Ướt','Zin Zin','Sunny','Luna','Mimi','Gấu Bông'];
const menuFoods=[['🍕','Pizza phô mai','Cả quán thơm lừng!'],['🍔','Hamburger','Suất ăn vui vẻ'],['🍣','Sushi','Đúng gu Nhật Bản'],['🍗','Gà giòn','Tiệc giòn rụm'],['🍰','Bánh kem','Vị ngọt đêm nay'],['🍟','Khoai chiên','Gọi món cùng bạn'],['🍝','Mì Ý','Ngon mê ly'],['🍱','Combo Party','Bữa ăn đầy màu sắc']];
const menuDrinks=[['🍹','Party Mocktail','Ly trái cây neon'],['🥤','Soda cầu vồng','Tươi mát, lung linh'],['🧃','Nước ép dâu','Ngọt ngào tươi mới'],['🍋','Lemon Fizz','Chanh tươi sảng khoái'],['🧋','Trà sữa','Ngọt ngào dễ thương'],['🍇','Nước nho','Ly tím lung linh'],['🍊','Cam ép','Nắng trong một ly'],['🥥','Dừa mát lạnh','Chill hết nấc']];
let chars=[],effects=[],messages=[],waiters=[],serviceQueue=[],beerPopEvent=null,nextBeerPop=performance.now()+28500,cheersEvent=null,nextRoomCheers=performance.now()+95000,nextAmbientService=performance.now()+14500,lastCheersAt=0,pendingCheers=false,last=0,clock=0,heartCount=0,shareCount=0,activePartyUntil=0,selectedId=null,muted=false,volume=.58,interactionCount=0,streamSource=null,audioContext=null,audioGain=null,analyser=null,freqData=null,soundActivated=false,isPlaying=false,quality='auto',drag=null,cam={x:795,y:560,zoom:1},cw=0,ch=0,dpr=1,serverLive=false,overlay=/(?:\?|&)overlay=1(?:&|$)/.test(location.search),demoLocked=false;
let ticker=0,scale=1,viewX=0,viewY=0,adminToken='',eventScope='demo',djVotes={hong:0,xanh:0},djVoters=new Set(),djRoundEnds=Date.now()+90000,lastPartner=null,lastDancerRequest=0;
const bots=['✨ Neon Party đã mở cửa!','🎧 DJ đang lên nhạc, chuẩn bị nhảy nào!','🍹 Gọi đồ uống ảo tại quầy bằng một cú chạm.'];
const self={danceStyle:2,danceChangedAt:0,bubble:'',bubbleUntil:0,poseShift:1.4,id:'you',name:'Bạn Neon',color:'#db78ef',skin:'#f3c4a7',hair:'#3c214b',x:710,y:610,tx:710,ty:610,action:'dance',until:0,score:0,likes:0,shares:0,prop:'',avatar:'',img:null};
// Two resident performers are permanent 2D game characters, independent of LIVE viewers.
// Their body/limb poses are generated frame-by-frame, so the choreography stays animated
// in both the server-backed app and the fully offline standalone HTML.
const residentDancers=[
  {id:'pro-luna',name:'LUNA',subtitle:'NEON SHUFFLE',x:571,y:535,color:'#ff6bd4',hair:'#ff84de',skin:'#f5bd9f',style:'shuffle',seed:.35},
  {id:'pro-kai',name:'KAI',subtitle:'BREAKDANCE KING',x:787,y:535,color:'#53e8fc',hair:'#bfceff',skin:'#dba37e',style:'break',seed:2.2}
];
let proShowUntil=0,proShowFocus='duo';
// Camera rig: camera presets, user pan/zoom, smart follow and a 3-second gifted-hero shot.
const cameraPresets={
 stage:{x:680,y:408,zoom:1.58},wide:{x:775,y:490,zoom:1.04},overview:{x:965,y:565,zoom:.54},
 dj:{x:680,y:200,zoom:1.82},dance:{x:680,y:520,zoom:1.83},
 bar:{x:275,y:386,zoom:1.82},food:{x:250,y:664,zoom:1.8},
 vip:{x:1170,y:320,zoom:1.84},photo:{x:1164,y:655,zoom:1.86},
 lounge:{x:1620,y:294,zoom:1.44},garden:{x:1625,y:681,zoom:1.38},
 entrance:{x:880,y:1002,zoom:1.47},rooftop:{x:1540,y:1000,zoom:1.40},
 chill:{x:300,y:998,zoom:1.55},mermaid:{x:680,y:166,zoom:2.3},orbit:{x:680,y:450,zoom:1.74},pulse:{x:680,y:422,zoom:1.68},frontrow:{x:680,y:580,zoom:1.88},sideleft:{x:520,y:450,zoom:1.70},sideright:{x:820,y:450,zoom:1.70}};
let cameraMode=window.innerWidth<=700?'stage':'wide',cameraAim=window.innerWidth<=700?{x:680,y:408,zoom:2.25}:{x:775,y:490,zoom:1.04},giftShot=null,giftShotQueue=[],giftShotSerial=0;
const autoCameraCycle=['stage','mermaid','dance','bar','lounge','orbit','food','vip','garden','rooftop','frontrow','chill','entrance','stage'];
const roomTourCycle=['bar','food','vip','lounge','garden','rooftop','chill','entrance','photo','stage'];
let autoCameraIndex=0,nextAutoCut=performance.now()+6200,portraitManualZoom=1,portraitCameraView={x:225,y:450,zoom:1};
const autoScene=()=>cameraMode==='roomtour'?roomTourCycle[autoCameraIndex%roomTourCycle.length]:autoCameraCycle[autoCameraIndex%autoCameraCycle.length];
const currentCameraScene=()=>giftShot?'stage':(cameraMode==='auto'||cameraMode==='roomtour')?autoScene():cameraMode;
const portraitModes=new Set(['stage','dj','dance','mermaid','orbit','pulse','frontrow','sideleft','sideright','follow']);

const heroDuration=3000;
function updateCameraButtons(){document.querySelectorAll('[data-camera]').forEach(b=>{b.classList.toggle('is-active',b.dataset.camera===cameraMode);b.setAttribute('aria-pressed',String(b.dataset.camera===cameraMode))})}
function zoomCamera(factor){
 if(portraitEnabled())portraitManualZoom=clamp(portraitManualZoom*factor,.78,2.2);
 else{cameraMode='free';cameraAim={x:cam.x,y:cam.y,zoom:clamp(cam.zoom*factor,.45,3.1)};updateCameraButtons()}
 const label=$('liveZoomValue');if(label)label.textContent=Math.round(portraitManualZoom*100)+'%';
}

function setCameraMode(mode){
 if(mode!=='follow'&&mode!=='auto'&&mode!=='roomtour'&&mode!=='cinema'&&!cameraPresets[mode])return;
 if(giftShot)finishGiftShot();giftShotQueue=[];$('heroOverlay').hidden=true;
 cameraMode=mode;autoCameraIndex=0;
 if(mode==='auto'||mode==='roomtour')nextAutoCut=performance.now()+6200;
 const scene=(mode==='auto'||mode==='roomtour')?autoScene():mode;
 const preset=cameraPresets[(mode==='cinema')?'wide':scene];
 if(preset)cameraAim={...preset};else cameraAim={x:getOwner().x,y:getOwner().y-55,zoom:2.1};
 updateCameraButtons();
 const names={auto:'Đạo diễn tự động 14 cảnh',roomtour:'Tour quán · 10 khu vực',stage:'Sân khấu đứng 9:16',mermaid:'Cận cảnh nàng tiên cá DJ',orbit:'Lia vòng sân khấu',pulse:'Zoom theo nhịp EDM',frontrow:'Hàng ghế đầu',sideleft:'Góc trái sân khấu',sideright:'Góc phải sân khấu',wide:'Toàn cảnh',dj:'DJ nàng tiên cá',dance:'Sàn nhảy EDM',bar:'Quầy bar',food:'Khu ăn uống',vip:'Phòng VIP',photo:'Góc ảnh',follow:'Theo nhân vật',overview:'Flycam toàn quán',cinema:'Camera điện ảnh',lounge:'Sky Lounge',garden:'Vườn đêm',entrance:'Sảnh ánh sáng',rooftop:'Rooftop',chill:'Góc thư giãn'};
 toast('🎥 '+(names[mode]||mode));
}
const giftDanceNames=['','HEART POP','NEON SHUFFLE','PARTY GROOVE','K-POP SPOTLIGHT','EDM FREESTYLE','SUPERSTAR BREAK'];
// Named camera movement patterns. These are visuals, not a payment-for-items mechanism.
const giftCameraStyles=['','CENTER POP','LEFT TRACK','RIGHT TRACK','ORBIT','DOLLY','CINEMA HERO'];
const giftVirtualTreats={1:['🍹','Party Mocktail','cheers'],2:['🥤','Soda Neon','cheers'],3:['🍕','Pizza Party','eat'],4:['🍣','Sushi VIP','eat'],5:['🍰','Bánh sao băng','eat'],6:['🍹','Ly ánh sao','cheers']};

function finishGiftShot(){
 if(!giftShot)return;
 const c=giftShot.character,s=giftShot.original;
 if(s){c.x=s.x;c.y=s.y;c.tx=s.tx;c.ty=s.ty;c.action=s.action;c.until=s.until;c.prop=s.prop;c.giftDanceTier=0;c.giftDanceStarted=0;}
 // Personal post-performance food/drink animation, assigned only to this identified viewer.
 if(giftShot.reward && c){const rw=giftShot.reward;setAction(c,rw[2],6500,rw[0]);serve(c,rw[0]);puff(c.x,c.y-58,'spark',15);displayText(c.x,c.y-118,rw[0]+' '+rw[1],'#ffe9a5');feed(c.name,'nhận '+rw[1]+' ảo sau màn biểu diễn','🍹');}
 giftShot=null;$('heroOverlay').hidden=true;document.body.classList.remove('gift-focus');if(welcomeQueue.length)scheduleWelcome();
}
function startGiftShot(item){
 const c=item.character;
 const original={x:c.x,y:c.y,tx:c.tx,ty:c.ty,action:c.action,until:c.until,prop:c.prop};
 if(mcSpeaking)cancelWelcomeVoice();
 if(cheersEvent){cheersEvent=null;$('cheersCountdown').hidden=true;nextRoomCheers=performance.now()+100000;}
 giftShot={...item,original,reward:giftVirtualTreats[clamp(Number(item.tier)||2,1,6)],started:performance.now(),serial:++giftShotSerial};document.body.classList.add('gift-focus');const dock=$('liveToolsMenu');if(dock){dock.hidden=true;$('liveToolsToggle').setAttribute('aria-expanded','false');}
 // Place the *actual identified viewer* center-stage before filming; no walking delay.
 c.x=680;c.y=542;c.tx=680;c.ty=542;c.action='giftDance';
 c.giftDanceTier=clamp(Number(item.tier)||2,1,6);c.giftDanceStarted=performance.now();
 c.until=performance.now()+heroDuration;c.prop='';selectedId=c.id;
 puff(680,450,'spark',28);beam(680,508,'#ffe88f',145);
 const avatar=$('heroAvatar');avatar.replaceChildren();avatar.textContent=(c.name||'?').slice(0,1).toUpperCase();if(c.avatar){const im=document.createElement('img');im.alt='Avatar '+c.name;im.src=c.avatar;im.onerror=()=>im.remove();avatar.appendChild(im)}$('heroName').textContent=c.name;$('heroGiftName').textContent=item.giftName;$('heroDanceName').textContent='🎵 '+giftDanceNames[c.giftDanceTier];$('heroOverlay').hidden=false;$('heroSeconds').textContent='3';$('heroProgress').style.width='100%'}
function requestGiftCloseup(character,giftName='Quà Neon',tier=2){if(!character)return;const item={character,giftName:String(giftName).slice(0,65),tier};if(giftShot){if(giftShotQueue.length<6)giftShotQueue.push(item);else toast('🎬 Hàng đợi cận cảnh đã đầy');return}startGiftShot(item)}
function updateCameraRig(dt,t){if(!giftShot&&(cameraMode==='auto'||cameraMode==='roomtour')&&t>=nextAutoCut){const route=cameraMode==='auto'?autoCameraCycle:roomTourCycle;autoCameraIndex=(autoCameraIndex+1)%route.length;cameraAim={...cameraPresets[route[autoCameraIndex]]};nextAutoCut=t+6200;}if(giftShot&&t-giftShot.started>=heroDuration){finishGiftShot();if(giftShotQueue.length)startGiftShot(giftShotQueue.shift())}
 let goal;
 if(giftShot){const c=giftShot.character;const progress=clamp((t-giftShot.started)/heroDuration,0,1);
 // One three-second cinematic per sender; travel and framing change with gift tier.
 const kind=clamp(Number(giftShot.tier)||2,1,6);
 const horizontal=kind===2?-46:kind===3?46:kind===4?48*Math.sin(progress*Math.PI*1.6):kind===5?-50+100*progress:kind===6?65*Math.sin(progress*Math.PI*1.1):18*Math.sin(progress*Math.PI);
 const baseZoom=cw<700?3.05:2.75;
 const zoom=baseZoom+(kind>=4?.21:.07)+.2*Math.sin(Math.PI*progress);
 goal={x:c.x+horizontal,y:c.y-(cw<700?92:82)+11*Math.sin(progress*Math.PI),zoom};const remain=Math.max(0,heroDuration-(t-giftShot.started));$('heroSeconds').textContent=String(Math.ceil(remain/1000));$('heroProgress').style.width=(remain/heroDuration*100).toFixed(2)+'%'}
 else if(cameraMode==='follow'){const c=getOwner();goal={x:c.x,y:c.y-45,zoom:cw<700?2.08:1.9}}
 else if(cameraMode==='orbit'){goal={x:680+110*Math.sin(t/2300),y:425+50*Math.cos(t/3200),zoom:1.68+.18*Math.sin(t/3200)}}
 else if(cameraMode==='pulse'){goal={x:680,y:435,zoom:1.63+.28*(.5+.5*Math.sin(t/380))}}
 else if(cameraMode==='cinema'){goal={x:850+290*Math.sin(t/5300),y:515+145*Math.sin(t/7400),zoom:1.1+.14*Math.sin(t/4300)}}
 else if(overlay && cameraMode==='stage'){goal={x:680+42*Math.sin(t/4900),y:408+25*Math.cos(t/6300),zoom:1.58+.06*Math.sin(t/3600)}}
 else goal=cameraAim;
 if(!giftShot && cw<700 && ch/cw>=1.3 && ['bar','vip','lounge','photo'].includes(currentCameraScene()))goal={...goal,y:Math.max(605,goal.y)};
 if(!giftShot && cameraMode==='wide' && cw<700)goal={...goal,zoom:1.23};
 if(!giftShot && cameraMode==='stage' && cw<700)goal={x:680,y:408,zoom:2.25};
 const lerp=1-Math.exp(-Math.min(.065,dt)*7.6);cam.x+=(goal.x-cam.x)*lerp;cam.y+=(goal.y-cam.y)*lerp;cam.zoom+=(goal.zoom-cam.zoom)*lerp;
}
function openPlayPanel(){const x=$('playPanelBackdrop');x.hidden=false;document.body.classList.add('play-panel-open')}
function closePlayPanel(){const x=$('playPanelBackdrop');x.hidden=true;document.body.classList.remove('play-panel-open')}
function cameraModal(){
 const v=[['stage','🔥 Sân khấu 9:16'],['auto','🎬 Đạo diễn tự động · 14 cảnh'],['roomtour','🏙 Tour 10 phòng & khu vực'],['mermaid','🧜‍♀️ Cận cảnh DJ nàng tiên cá'],['orbit','🌀 Lia vòng sân khấu'],['pulse','💓 Zoom theo nhịp EDM'],['frontrow','🎟 Hàng ghế đầu'],['sideleft','◀ Góc trái'],['sideright','▶ Góc phải'],['dj','🎧 Cận DJ'],['dance','💃 Sàn EDM'],['bar','🍹 Quầy bar'],['food','🍕 Khu ăn uống'],['vip','👑 Phòng VIP'],['lounge','🌃 Sky Lounge'],['garden','🌿 Vườn đêm'],['rooftop','🌆 Rooftop'],['chill','🌙 Chill Zone'],['entrance','🚪 Sảnh lớn'],['photo','📷 Góc ảnh'],['overview','🗺 Flycam toàn quán'],['wide','🌐 Toàn cảnh'],['cinema','🎞 Tracking điện ảnh'],['follow','👤 Theo nhân vật']];
 showModal('Chọn góc quay','🎥 CAMERA STUDIO',
 '<p class="modal-note">24 góc và kiểu máy: cận cảnh nàng tiên cá DJ, lia phòng, zoom EDM. Dùng 2 ngón tay để phóng to/thu nhỏ trên điện thoại. Quà tặng vẫn được ưu tiên quay 3 giây, sau đó trở lại góc đang xem.</p><div class="menu-grid">'+v.map(([k,n])=>'<button class="menu-option" data-camera-modal="'+k+'">🎥 <b>'+n+'</b></button>').join('')+'</div>',
 ()=>document.querySelectorAll('[data-camera-modal]').forEach(b=>b.addEventListener('click',()=>{closeModal();setCameraMode(b.dataset.cameraModal)})));
}

const playActions={openbeer:()=>startBeerPop(getOwner(),false),banquet:()=>startBanquetFeast(getOwner()),toastparty:()=>startRoomCheers('DEMO',true),staff:()=>{serve(getOwner(),'🍕','Pizza Party');serve(chars.find(c=>c.id.startsWith('npc')),'🍹','Party Mocktail');toast('🛎️ Nhân viên MIA, BIN và AN đang chạy bàn!')},danceparty:demoDanceParty,chatter:demoChatter,heart:()=>actionHeart(100),share:()=>actionShare(5),gift:giftModal,dance:()=>triggerDancerShow('duo'),cheers:()=>actionCheers(),food:()=>foodModal(false),drink:()=>foodModal(true),votePink:()=>actionVote('hong'),voteBlue:()=>actionVote('xanh'),join:()=>joinModal(),welcome:mcSettingsModal,live:adminModal,camera:cameraModal};

const savedName=(()=>{try{return localStorage.getItem('neon_name')}catch{return null}})();
if(savedName)self.name=savedName.slice(0,24);
function newCharacter(name,i){const a=Math.random()*Math.PI*2,rad=rand(80,280);return {danceStyle:i%8,danceChangedAt:performance.now()+rand(4500,11000),bubble:'',bubbleUntil:0,poseShift:rand(0,Math.PI*2),id:'npc'+i,name, color:colors[i%colors.length],skin:['#f6caaa','#e7b08c','#c98c70','#ffe0b9'][i%4],hair:['#30192e','#744268','#3d2d6b','#443029','#e1a14b'][i%5],x:680+Math.cos(a)*rad,y:470+Math.sin(a)*rad*.72,tx:680+Math.cos(a)*rad,ty:470+Math.sin(a)*rad*.72,action:i%5===0?'idle':'dance',until:0,score:rand(30,500)|0,likes:0,shares:0,prop:'',avatar:'',img:null,seed:rand(0,10)}}
function resetCharacters(){djVotes={hong:0,xanh:0};djVoters.clear();djRoundEnds=Date.now()+90000;updateDJVote();proShowUntil=0;proShowFocus='duo';chars=names.map(newCharacter);
 const districtGuests=[
 ['Sao Băng','lounge',1570,344],['Miso Night','lounge',1780,360],['Kẹo Bạc Hà','garden',1575,741],
 ['Kiwi Moon','garden',1740,707],['Gia Hân','entrance',845,1030],['HipHop Bear','entrance',1030,1020],
 ['Tia Chớp','rooftop',1490,1050],['Mây Tím','rooftop',1755,1058],['Bé Cacao','chill',233,1019],['Nắng Khuya','chill',400,1032]
 ];
 for(let j=0;j<districtGuests.length;j++){const [name,zone,x,y]=districtGuests[j];const c=newCharacter(name,100+j);c.x=x;c.y=y;c.tx=x;c.ty=y;c.zone=zone;c.action=j%5===0?'idle':'dance';chars.push(c)}
 chars.push(self);heartCount=0;shareCount=0;effects=[];waiters=[];serviceQueue=[];beerPopEvent=null;nextBeerPop=performance.now()+28500;cheersEvent=null;nextRoomCheers=performance.now()+95000;nextAmbientService=performance.now()+13000;initWaiters();interactionCount=0;activePartyUntil=0;selectedId='you';updateStats();renderRank()}
// PERMANENT SERVICE TEAM — 3 chibi employees, real queue, pickup, table delivery and return.
// Workers are drawn in both the landscape venue and the 9:16 mobile stage.
const waiterPresets=[
 {name:'MIA · Phục vụ',color:'#ff8ac9',hair:'#4d2862',homeX:198,homeY:354,side:-1},
 {name:'BIN · Phục vụ',color:'#68dcf5',hair:'#342766',homeX:306,homeY:365,side:1},
 {name:'AN · Phục vụ',color:'#ffd07e',hair:'#6e3950',homeX:265,homeY:655,side:-1}
];
function initWaiters(){waiters=waiterPresets.map((p,i)=>({...p,id:'waiter'+i,skin:'#f0c7a3',x:p.homeX,y:p.homeY,tx:p.homeX,ty:p.homeY,seed:i*2.11,action:'wave',until:0,prop:'',state:'idle',job:null,progress:0,arrivedAt:0,score:0,avatar:'',img:null}));}
function serve(c,emoji='🍹',title='Món ảo'){if(!c)return;
 // A bounded queue prevents lag in crowded livestreams. No food/coin payment occurs.
 if(serviceQueue.length>=18){feed('Quầy phục vụ','đang bận, mời bạn chờ một chút','🍹');return}
 serviceQueue.push({customer:c,emoji,title,created:performance.now()});
 feed('Nhân viên phục vụ','đã nhận món '+emoji+' của '+c.name,'🛎️');
}
function updateWaiters(dt,t){
 for(const w of waiters){
  if(w.state==='idle' && serviceQueue.length){w.job=serviceQueue.shift();w.state='going';w.progress=0;w.prop=w.job.emoji;
   w.tx=clamp(w.job.customer.x+(w.side<0?-37:37),95,W-95);w.ty=clamp(w.job.customer.y-9,290,H-70);
   w.action='wave';chatBubble(w,'Có món cho '+w.job.customer.name+'! '+w.prop,2800);
  }
  if(w.state==='going'){
   const c=w.job?.customer;if(c){w.tx=clamp(c.x+(w.side<0?-37:37),95,W-95);w.ty=clamp(c.y-9,290,H-70)}
   const d=Math.hypot(w.tx-w.x,w.ty-w.y);const step=Math.min(d,235*dt);
   if(d>2){w.x+=(w.tx-w.x)/d*step;w.y+=(w.ty-w.y)/d*step}
   w.progress=clamp(w.progress+dt*.37,0,1);
   if(d<14||w.progress>=1){w.state='delivering';w.arrivedAt=t;w.progress=1;
    if(c){setAction(c,w.job.emoji==='🍕'||['🍰','🍣','🍔','🍱','🍟'].includes(w.job.emoji)?'eat':'cheers',5200,w.job.emoji);
     chatBubble(c,'Cảm ơn '+w.name.split(' ')[0]+'! '+w.job.emoji,3500);
     puff(c.x,c.y-55,'spark',9);playAssetSound('service',.58);soundEffect('cheers');
    }
    chatBubble(w,'Mời bạn thưởng thức! '+w.prop,2600);
   }
  }else if(w.state==='delivering'){
   if(t-w.arrivedAt>1900){w.state='return';w.tx=w.homeX;w.ty=w.homeY;w.action='wave';w.prop='';}
  }else if(w.state==='return'){
   const d=Math.hypot(w.tx-w.x,w.ty-w.y),step=Math.min(d,260*dt);
   if(d>2){w.x+=(w.tx-w.x)/d*step;w.y+=(w.ty-w.y)/d*step}
   if(d<13){w.state='idle';w.job=null;w.progress=0;}
  }else if(w.state==='idle'){w.action='wave';w.tx=w.homeX;w.ty=w.homeY;}
 }
}
function drawWaiterSprite(w,x,y,t,size=1){
 ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.translate(-x,-y);
 const sprite={...w,x,y,tx:x,ty:y,action:w.state==='going'?'wave':'cheers',prop:w.state==='idle'?'🍽️':w.prop};
 drawPerson(sprite,t,.22);
 // Apron, tray and chef-service hat establish the role visually.
 ctx.save();ctx.translate(x,y+Math.sin(t*3+w.seed)*2);rr(-11,-28,22,22,4);ctx.fillStyle='#f8f6ff';ctx.fill();
 label('✦',0,-16,10,'#aa55b3');rr(-18,-88,36,12,5);ctx.fillStyle='#fff4fd';ctx.fill();
 rr(-13,-98,26,12,5);ctx.fillStyle='#fff1fc';ctx.fill();
 if(w.state==='going'||w.state==='delivering'){line(14,-29,32,-35,'#f8d6a7',5);ellipse(34,-33,22,6,'#dce9ff');label(w.prop||'🍹',34,-49,21)}
 ctx.restore();ctx.restore();
}
// VIRTUAL TAVERN: animated bottle uncapping, sparkling amber mock-beer and seating.
// Free play only. No real alcohol orders, purchasing or spending-based unlocks.
function beerTableOf(c){return c?.seatedUntil>performance.now()?Math.floor((c.seatedSeat||0)/3)%2:(Math.random()<.5?0:1)}
function startBeerPop(c=self,ambient=false){
 const now=performance.now();
 if(beerPopEvent||cheersEvent||giftShot)return false;
 const table=beerTableOf(c);
 beerPopEvent={start:now,table,guest:c,phase:0,ambient};
 nextBeerPop=now+rand(46000,70000);
 if(c){
  if(!ambient && !(c.seatedUntil>now)){let used=new Set(chars.filter(v=>v!==c&&v.seatedUntil>now).map(v=>v.seatedSeat));c.seatedSeat=[table*3,table*3+1,table*3+2].find(v=>!used.has(v))??table*3;c.seatedUntil=now+25000;}
  setAction(c,'cheers',4600,'🍺');chatBubble(c,'Khui bia ảo, cụng ly nào! 🍻',3900);
 }
 playBeerFx(beerOpenAudio);
 if(!ambient){serve(c,'🍢','Mồi nhắm ảo');feed(c?.name||'NEON PARTY','khui bia mô phỏng tại bàn, cùng hội bạn nâng ly','🍻');}
 return true;
}
function startBanquetFeast(c=self){
 const diners=chars.filter(x=>x.id.startsWith('npc')&&!x.zone).slice(12,18);
 for(const [i,guest] of diners.entries()){
  if(i<3)serve(guest,i%2?'🍢':'🦐','Đồ nướng ảo');
  else if(i<5)serve(guest,'🍺','Ly bia mô phỏng');
 }
 if(c)serve(c,'🍢','Đồ nướng ảo');
 feed('NEON PARTY','bắt đầu đại tiệc bàn nhậu ảo: đồ nướng, bia mô phỏng và cụng ly!','🍢');
 if(!beerPopEvent&&!cheersEvent&&!giftShot)startBeerPop(c,true);
 toast('🍢 Nhân viên đang mang đồ nướng và nước tới bàn!');
}
function updateBeerPop(t){
 if(!beerPopEvent)return;
 const elapsed=t-beerPopEvent.start;
 if(elapsed>700&&beerPopEvent.phase===0){beerPopEvent.phase=1;playBeerFx(beerPourAudio);}
 if(elapsed>3400&&beerPopEvent.phase===1){beerPopEvent.phase=2;playAssetSound('glass');soundEffect('cheers');}
 if(elapsed>5400)beerPopEvent=null;
}
function drawAmberMug(x,y,s=1,raised=false){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);const bob=raised?Math.sin(clock*5)*4:0;ctx.translate(0,bob);
 ctx.lineWidth=3;ctx.strokeStyle='#d6f9ff';ctx.fillStyle='#ffe39a30';rr(-9,-24,19,27,4);ctx.fill();ctx.stroke();
 ctx.fillStyle='#ffbb42';rr(-7,-20,15,22,3);ctx.fill();
 ctx.lineWidth=3;ctx.strokeStyle='#b5f6ff';ctx.beginPath();ctx.arc(11,-11,8,-Math.PI*.43,Math.PI*.50);ctx.stroke();
 ctx.fillStyle='#fff9e8';ellipse(0,-23,11,4,'#fdf9e5');
 for(let k=0;k<4;k++)ellipse(-6+k*4,-25-(k%2)*3,3.6,3.6,'#fff9e5');
 for(let k=0;k<3;k++)ellipse(-4+k*4,-8-(k%2)*5,1.25,1.5,'#ffec97');
 ctx.restore();
}
function drawBottle(x,y,s=1,tilt=0){
 ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(s,s);
 ctx.fillStyle='#174e43';ctx.strokeStyle='#6adbc0';ctx.lineWidth=2;
 rr(-9,-26,18,32,4);ctx.fill();ctx.stroke();
 rr(-4,-38,8,14,2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#f4d3a2';rr(-6,-15,12,9,3);ctx.fill();
 ctx.fillStyle='#ffefb7';rect(-6,-4,12,3,'#ffdb79');
 ctx.restore();
}
function drawBeerPopScene(t,ph){
 if(!beerPopEvent)return;
 const age=(performance.now()-beerPopEvent.start)/1000;
 if(age<0||age>5.4)return;
 const side=beerPopEvent.table===0?-1:1,tx=side<0?79:371,ty=ph*.835;
 ctx.save();const alpha=Math.min(1,age*4,Math.max(0,(5.4-age)*2));ctx.globalAlpha=alpha;
 const x=tx+side*3,y=ty-105;
 // Big golden glass and sparkling liquid show the uncapping even on tiny mobile live video.
 ctx.shadowBlur=16;ctx.shadowColor='#ffd37e';drawAmberMug(x,y,1.75,age>2.7);ctx.shadowBlur=0;
 drawBottle(x+side*40,y-12,1.25,age<2.2?side*.36:0);
 if(age<1.3){
  const f=age/1.3;ctx.save();ctx.translate(x+side*40,y-56);ctx.rotate(-side*f*5);
  ellipse(side*27*f,-31*f,7,3,'#fff1b1');ctx.restore();
 }
 if(age>.75&&age<3.2){
  // Sparkling pouring arc and foam particles.
  ctx.strokeStyle='#ffc14e';ctx.lineWidth=3;ctx.beginPath();
  ctx.moveTo(x+side*40,y-41);ctx.quadraticCurveTo(x+side*10,y-18,x,y-22);ctx.stroke();
  for(let i=0;i<8;i++){const xx=x+Math.sin(i*2.17+t*1.3)*19;const yy=y-40-i*6+((t*26+i*11)%54);ellipse(xx,yy,1.8+i%2,1.8+i%2,i%2?'#fff0bf':'#ffe2a3')}
 }
 ctx.shadowColor='#f7b54a';ctx.shadowBlur=12;
 rr(62,ph*.724,326,44,16);ctx.fillStyle='#21132ded';ctx.fill();ctx.strokeStyle='#ffe29d';ctx.lineWidth=1.5;ctx.stroke();ctx.shadowBlur=0;
 label(age<1.15?'TÁCH! KHUI CHAI ✨':age<3.2?'RÓT LY BỌT SÓNG 🍺':'CỤNG LY CÙNG HỘI BẠN! 🍻',225,ph*.75,17,'#fff5bd');
 ctx.restore();
}

// WHOLE-ROOM CELEBRATION, free game event, no link to buying or consuming alcohol.
function startRoomCheers(from='Cả phòng',force=false){const t=performance.now();
 if(cheersEvent || giftShot || beerPopEvent){if(giftShot||beerPopEvent)pendingCheers=true;if(force)toast('🥂 Đang có màn trình diễn, sẽ nâng ly ngay sau nhé!');return false}
 if(!force && t-lastCheersAt<25000)return false;
 lastCheersAt=t;nextRoomCheers=t+rand(100000,137000);
 if(mcSpeaking)cancelWelcomeVoice();
 playPartyChant();
 cheersEvent={start:t,step:-1,fired:false,source:from};
 for(const c of chars){if(c.id.startsWith('npc')||c===self){setAction(c,'cheers',7800,'🍹');if(c.id.startsWith('npc')&&Math.random()<.45)chatBubble(c,'1, 2, 3, ZÔÔÔ! 🥂',4400)}}
 $('partyStatus').innerHTML='<span class="pulse-spot">🥂</span><span>CẢ PHÒNG CỤNG LY <b>1 · 2 · 3 · ZÔ!</b></span>';
 feed('NEON PARTY','cùng nâng ly mocktail ảo: Một, hai, ba, Zô!','🥂');
 return true;
}
function updateRoomCheers(t){if(!cheersEvent)return;
 const e=cheersEvent,p=t-e.start,step=Math.floor(p/820);
 const box=$('cheersCountdown');
 if(step!==e.step){e.step=step;
  if(step>=0&&step<=2){box.textContent=['1','2','3'][step];box.hidden=false;}
  if(step===3){box.textContent='ZÔÔÔ! 🥂';box.hidden=false;playAssetSound('fireworks',.52);
   for(const c of chars.slice(0,20)){puff(c.x,c.y-68,'spark',quality==='low'?5:11)}
   for(let i=0;i<8;i++)puff(rand(260,1120),rand(220,610),'spark',quality==='low'?7:20);
   activePartyUntil=t+3300;
   // The prerecorded original synthetic crowd mix voices the countdown; no competing TTS.
   // Browser TTS is retained only as a fallback if the bundled sound did not load.
   if((!partyAudio||partyAudio.error)&&mcReady&&soundActivated&&!mcSpeaking&&speechEngine){
    try{const say=new SpeechSynthesisUtterance('Một, hai, ba, zô!');say.lang='vi-VN';say.volume=mcVolume;const v=selectVoice();if(v)say.voice=v;speechEngine.speak(say)}catch{}
   }
  }
 }
 if(p>6100){cheersEvent=null;box.hidden=true;if(!giftShot)$('partyStatus').innerHTML='<span class="pulse-spot">✦</span><span>ĐÊM HỘI NEON <b>PARTY TIME</b></span>'}
}

function target(c,x,y){c.tx=clamp(x,95,W-95);c.ty=clamp(y,290,H-70)}
function selectCharacter(){return chars.find(c=>c.id===selectedId)||self}
function goTo(c,location){const spots={bar:[290,350],dance:[680,525],food:[350,660],vip:[1120,400],photo:[1130,655],lounge:[1610,330],garden:[1560,700],entrance:[900,940],rooftop:[1530,970],chill:[300,930]};const pos=spots[location]||spots.dance;target(c,pos[0]+rand(-80,80),pos[1]+rand(-45,45))}
// CHOREOGRAPHY v2.2: eight distinct motions, real comments as bubbles, NPC-only ambient chat.
const danceLabels=['Shuffle chân nhanh','Disco tay cao','Hip-hop groove','Robot giật nhịp','Salsa xoay','Jump & clap','Moonwalk','K-pop wave'];
const npcPhrases=['Bản nhạc này cuốn quá!','Cùng nhảy nào! 💃','DJ tiên cá đỉnh ghê!','Chào bạn, vui quá!','Lên sàn EDM thôi!','Wow, ánh đèn đẹp quá!','Cùng nâng ly nhé! 🥤','Party hết mình! ✨','Đập tay nào! 🙌'];
let nextNpcChat=performance.now()+4800;
function chatBubble(c,text,ms=3400){
 if(!c)return;
 const clean=String(text||'').normalize('NFKC').replace(/[\x00-\x1f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,54);
 if(!clean)return;
 c.bubble=clean;c.bubbleUntil=performance.now()+ms;
}
function setDanceStyle(c,style,duration=8000){
 if(!c)return;
 setAction(c,'dance',duration);
 c.danceStyle=((Number(style)||0)%8+8)%8;
 c.danceChangedAt=performance.now()+duration;
}
function npcConversation(){
 // Generated lines are assigned to fictional NPCs only. Never fabricate comments for actual LIVE viewers.
 const partyGuests=chars.filter(c=>c.id.startsWith('npc') && !c.zone).slice(0,13);
 if(partyGuests.length<2)return;
 const a=partyGuests[Math.floor(Math.random()*partyGuests.length)];
 let b=partyGuests[Math.floor(Math.random()*partyGuests.length)];
 if(b===a)b=partyGuests[(partyGuests.indexOf(a)+1)%partyGuests.length];
 const line=npcPhrases[Math.floor(Math.random()*npcPhrases.length)];
 chatBubble(a,line,3600);
 if(Math.random()<.62){chatBubble(b,['Đến luôn! 🔥','Tuyệt quá!','Cùng quẩy nhé!','Haha vui quá! 😄'][Math.floor(Math.random()*4)],3900);}
 if(Math.random()<.7){setDanceStyle(a,Math.floor(rand(0,8)),5600);setDanceStyle(b,Math.floor(rand(0,8)),5600)}
 else {setAction(a,'wave',2300);setAction(b,'wave',2800)}
 if(Math.random()<.42){const p=['🍹','🥤','🍕'][Math.floor(rand(0,3))];setAction(b,p==='🍕'?'eat':'cheers',3400,p)}
}
function demoDanceParty(){
 for(const c of chars.filter(v=>v.id.startsWith('npc')).slice(0,17)){
  setDanceStyle(c,Math.floor(rand(0,8)),10000);
 }
 triggerDancerShow('duo');
 toast('🔥 Dance Party: các nhân vật đang trình diễn 8 kiểu nhảy khác nhau!');
}
function demoChatter(){
 npcConversation();nextNpcChat=performance.now()+7700;
 toast('💬 NPC đang trò chuyện và nhảy cùng nhau!');
}
function setAction(c,action,time=4000,prop=''){c.action=action;c.until=performance.now()+time;c.prop=prop;
 if(action==='dance' && (!Number.isInteger(c.danceStyle)||Math.random()<.32)){c.danceStyle=Math.floor(rand(0,8));c.danceChangedAt=performance.now()+time}
}
function puff(x,y,kind='spark',count=16){for(let i=0;i<count;i++){effects.push({kind,x:x+rand(-9,9),y:y+rand(-8,8),vx:rand(-110,110),vy:rand(-220,-40),life:rand(.7,1.6),max:1.6,size:rand(3,7),col:colors[(Math.random()*colors.length)|0],spin:rand(0,5)})}}
function displayText(x,y,text,col='#f7e6ff'){effects.push({kind:'text',x,y,vx:0,vy:-36,life:2.3,max:2.3,text,col})}
function beam(x,y,col='#fc5cd0',size=90){effects.push({kind:'ring',x,y,life:1.15,max:1.15,size,col})}
function shakeWorld(){canvas.classList.add('shake');setTimeout(()=>canvas.classList.remove('shake'),220)}
function safeText(s){return String(s||'').slice(0,100)}
function feed(name,body,emoji='✦'){const row=document.createElement('div');row.className='feed-item';const av=document.createElement('div');av.className='feed-avatar';av.textContent=emoji;const det=document.createElement('div');det.className='feed-detail';const b=document.createElement('b');b.textContent=safeText(name);det.appendChild(b);det.appendChild(document.createTextNode(' '+safeText(body)));const t=document.createElement('small');t.textContent='Vừa xong · '+(eventScope==='tiktok'?'TIKTOK LIVE':'DEMO');det.appendChild(t);row.append(av,det);$('eventFeed').prepend(row);while($('eventFeed').children.length>7)$('eventFeed').lastChild.remove();}
function toast(text){const el=document.createElement('div');el.className='toast';el.textContent=text;$('toastArea').prepend(el);setTimeout(()=>{el.style.opacity=0;setTimeout(()=>el.remove(),250)},4300)}
function soundEffect(type='spark'){if(!soundActivated||!partySoundEnabled)return;if(type==='gift'||type==='share')playAssetSound('gift',.85);if(!audioContext)return;try{if(audioContext.state==='suspended')audioContext.resume();const t=audioContext.currentTime;if(type==='cheers'){for(const [f,amp] of [[1220,.025],[1830,.012],[2535,.006]]){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(Math.max(.0001,amp*partySoundVolume),t);g.gain.exponentialRampToValueAtTime(.0001,t+.45);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.48)}return;}let notes=type==='gift'?[659,880,1174,1318]:type==='cheers'?[880,1174]:type==='dance'?[110,147,175,220]:type==='share'?[440,554,659]:[660,784];notes.forEach((f,i)=>{let osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type==='dance'?'triangle':'sine';osc.frequency.setValueAtTime(f,t+i*.09);gain.gain.setValueAtTime(.0001,t+i*.09);gain.gain.exponentialRampToValueAtTime((type==='dance'?.045:.028)*fxLevel(),t+i*.09+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+i*.09+.2);osc.connect(gain);gain.connect(audioContext.destination);osc.start(t+i*.09);osc.stop(t+i*.09+.22)})}catch(e){console.debug('SFX:',e.message)}}
// Audio diagnostics: never misreport a 404/unsupported source as autoplay permission failure.
let musicPlayPromise=null, musicErrorDetail='', lastMusicWarningAt=0, temporaryMusicUrl=null;
function musicAssetURL(){return new URL(audio.getAttribute('src')||'assets/neon_live_mix.m4a',document.baseURI).href}
function showMusicWarning(message){
 musicErrorDetail=message;
 const warning=$('musicWarning');if(warning){warning.hidden=false;$('musicWarningText').textContent=message}
 const text=$('musicText');if(text)text.textContent='⚠ Nhạc chưa phát · Xem lỗi';
 if(Date.now()-lastMusicWarningAt>7000){toast(message);lastMusicWarningAt=Date.now()}
}
function clearMusicWarning(){musicErrorDetail='';const w=$('musicWarning');if(w)w.hidden=true}
async function checkMusicAsset(){
 const target=musicAssetURL();
 if(temporaryMusicUrl)return {ok:true,message:'Đang dùng nhạc chọn từ máy tính.'};
 try{
  const r=await fetch(target,{method:'HEAD',cache:'no-store'});
  if(r.status===404)return {ok:false,message:'Không tìm thấy nhạc trên GitHub Pages (404). Hãy tải assets/neon_live_mix.m4a lên đúng thư mục.'};
  if(!r.ok)return {ok:false,message:`Không tải được file nhạc (HTTP ${r.status}). Kiểm tra GitHub Pages / GitHub Actions.`};
  const mime=r.headers.get('content-type')||'';
  if(mime.includes('text/html'))return {ok:false,message:'Đường dẫn nhạc đang trả về trang HTML thay vì file M4A. Kiểm tra assets/.'};
  return {ok:true,message:'File nhạc phản hồi HTTP '+r.status+' ('+(mime||'không rõ định dạng')+').'};
 }catch(err){return {ok:false,message:'Không kiểm tra được đường dẫn nhạc: '+(err?.message||'lỗi mạng')+'.'};}
}
async function explainMusicFailure(err){
 const name=err?.name||'MediaError';
 const mediaCode=audio.error?.code;
 let message='Không thể phát nhạc ('+name+').';
 if(name==='NotAllowedError')message='Trình duyệt chặn tự phát. Hãy nhấn Vào quán hoặc nút ▶ để cấp quyền âm thanh.';
 else if(name==='NotSupportedError'||mediaCode===4)message='Không đọc được nguồn nhạc. Có thể file nhạc bị thiếu hoặc không được xuất bản.';
 else if(mediaCode===2)message='Tải nhạc thất bại do mạng hoặc máy chủ.';
 else if(mediaCode===3)message='Trình duyệt không giải mã được file nhạc.';
 const fileCheck=await checkMusicAsset();
 if(!fileCheck.ok)message=fileCheck.message;
 console.warn('NEON audio failure:',{name,mediaCode,src:audio.currentSrc,check:fileCheck.message,error:err?.message});
 showMusicWarning(message);
}
function musicTroubleshoot(){
 const href=musicAssetURL();
 const safeHref=href.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 showModal('Khắc phục nhạc DJ','🎧 KIỂM TRA ÂM THANH',`
 <p class="modal-note">${musicErrorDetail||'Nếu nhấn phát nhưng không nghe được, hãy kiểm tra file nhạc được GitHub Pages phục vụ.'}</p>
 <div class="settings-line"><span>🎵 File nhạc trên website</span><a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="color:#8beaff">Mở trực tiếp ↗</a></div>
 <div class="settings-line"><span>🔍 Kiểm tra đường dẫn</span><button type="button" class="secondary-btn" id="musicTestURL">Kiểm tra ngay</button></div>
 <p id="musicTestResult" class="modal-note">Nếu liên kết báo 404, hãy tải đúng file <code>assets/neon_live_mix.m4a</code> lên repository và xuất bản lại Pages.</p>
 <div class="settings-line"><span>📂 Chọn nhạc trên máy để thử LIVE</span><input type="file" id="musicLocalFile" accept="audio/*" style="max-width:185px;font-size:11px"></div>
 <p class="modal-note">Nhạc chọn từ máy chỉ phát trên trình duyệt hiện tại, KHÔNG thay thế file nhạc của website công khai. Để phát cho người xem bằng OBS, hãy bật nguồn âm thanh tương ứng.</p>
 <button type="button" class="primary-btn" id="musicTryAgain">▶ Thử phát lại</button>
 `,()=>{
 $('musicTestURL').onclick=async()=>{$('musicTestResult').textContent='Đang kiểm tra…';const result=await checkMusicAsset();$('musicTestResult').textContent=result.message};
 $('musicTryAgain').onclick=()=>{closeModal();muted=false;startAudio()};
 $('musicLocalFile').onchange=e=>{const file=e.target.files?.[0];if(!file)return;
  if(temporaryMusicUrl)URL.revokeObjectURL(temporaryMusicUrl);
  temporaryMusicUrl=URL.createObjectURL(file);audio.pause();audio.src=temporaryMusicUrl;audio.load();closeModal();muted=false;startAudio();};
 });
}
function startAudio(){
 if(musicPlayPromise)return musicPlayPromise;
 activateSoundSystem();mcReady=true;
 if(welcomeQueue.length&&!mcSpeaking)scheduleWelcome();
 try{
  audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();
  audioGain=audioGain||audioContext.createGain();audioGain.gain.value=1;
  if(!analyser){analyser=audioContext.createAnalyser();analyser.fftSize=256;freqData=new Uint8Array(analyser.frequencyBinCount);
   const src=audioContext.createMediaElementSource(audio);src.connect(analyser);analyser.connect(audioGain);audioGain.connect(audioContext.destination)}
  const resume=audioContext.resume();if(resume?.catch)resume.catch(e=>console.warn('AudioContext resume:',e.message));
 }catch(e){console.info('Web Audio visualizer unavailable:',e.message)}
 applyMusicVolume();
 if(audio.error)audio.load();
 let attempt;
 try{attempt=audio.play()}catch(err){attempt=Promise.reject(err)}
 musicPlayPromise=Promise.resolve(attempt).then(()=>{isPlaying=true;clearMusicWarning();syncAudioUI();return true}).catch(async err=>{
  isPlaying=false;syncAudioUI();await explainMusicFailure(err);return false;
 }).finally(()=>{musicPlayPromise=null});
 return musicPlayPromise;
}
function syncAudioUI(){$('muteBtn').textContent=muted||!isPlaying?'🔇':'♫';$('mobileMute').textContent=muted||!isPlaying?'🔇':'🔊';$('mobileVolume').value=Math.round(volume*100);$('liveVolSlider').value=Math.round(volume*100);$('liveAudioText').textContent=muted||!isPlaying?'Bật nhạc':'Tắt nhạc';$('musicText').textContent=isPlaying?'♪ Đang phát · DJ Mix 2025':(musicErrorDetail?'⚠ Nhạc chưa phát · Xem lỗi':'▶ Chạm để bật nhạc DJ');$('volLabel').textContent=Math.round(volume*100)+'%';$('volSlider').value=Math.round(volume*100);$('entryVol').value=Math.round(volume*100);$('entryVolText').textContent=Math.round(volume*100)+'%'}
function setVolume(n){volume=clamp(Number(n)/100,0,1);applyMusicVolume();try{localStorage.setItem('neon_volume',volume)}catch{}syncAudioUI()}
try{const v=Number(localStorage.getItem('neon_volume'));if(v>0&&v<=1)volume=v}catch{}
function updateStats(){$('peopleCount').textContent=chars.length+residentDancers.length;$('roomCount').textContent=chars.length+' khách + 2 vũ công';$('totalHearts').textContent=heartCount.toLocaleString('vi-VN');$('shareCount').textContent=shareCount;$('heartProgress').style.width=(heartCount%1000/10)+'%';$('progressText').textContent=(heartCount%1000).toLocaleString('vi-VN')+' / 1.000 TIM';$('shareProgress').style.width=(shareCount%5/5*100)+'%';$('shareText').textContent=(shareCount%5)+' / 5 LƯỢT'}
function renderRank(){const ranked=[...chars].sort((a,b)=>b.score-a.score).slice(0,4);$('rankList').replaceChildren(...ranked.map((c,i)=>{let r=document.createElement('div');r.className='rank-item';const n=document.createElement('span');n.className='rank-num';n.textContent=['🥇','🥈','🥉','4'][i];const p=document.createElement('span');p.className='rank-pic';p.style.background=c.color+'44';p.textContent=[...c.name][0].toUpperCase();const l=document.createElement('span');l.textContent=c.name;const score=document.createElement('b');score.className='rank-score';score.textContent=Math.floor(c.score)+' ✦';r.append(n,p,l,score);return r}))}
function spotlight(c){beam(c.x,c.y-40,'#fd6fe1',80);puff(c.x,c.y-70,'spark',28);displayText(c.x,c.y-115,'✦ '+c.name.toUpperCase()+' ✦','#ffdb7f');soundEffect('gift')}
function getOwner(){return selectCharacter()}
function actionHeart(num=100,c=getOwner()){
 num=clamp(Number(num)||100,1,10000);const prev=c.likes||0,oldRoom=Math.floor(heartCount/1000);
 heartCount+=num;c.likes=prev+num;c.score+=Math.floor(num/4);
 if(c===self || c.id==='you')selectedId='you';
 // Rewards at each personal 100/300/500/1000-like milestone. One reward per event, highest crossed milestone wins.
 const thresholds=[100,300,500,1000];let crossed=thresholds.filter(m=>Math.floor((c.likes-1)/1000)*1000 + m>prev && Math.floor((c.likes-1)/1000)*1000 + m<=c.likes);
 if(!crossed.length && Math.floor(c.likes/1000)>Math.floor(prev/1000))crossed=[1000];
 const reward=Math.max(0,...crossed);
 if(reward===100){goTo(c,'bar');setAction(c,'cheers',7500,'🍹');serve(c,'🍹');spotlight(c);feed(c.name,'đạt 100 tim: nhận Party Mocktail!','💗');toast('🍹 '+c.name+' nhận ly mocktail ảo vì 100 tim!')}
 else if(reward===300){goTo(c,'food');setAction(c,'eat',7500,'🍕');serve(c,'🍕');spotlight(c);feed(c.name,'đạt 300 tim: nhận pizza ảo!','🍕');toast('🍕 '+c.name+' được phục vụ pizza!')}
 else if(reward===500){goTo(c,'dance');setAction(c,'dance',7500);puff(c.x,c.y-60,'spark',26);feed(c.name,'đạt 500 tim: mở khóa điệu nhảy!','💃');toast('💃 '+c.name+' mở khóa vũ điệu neon!')}
 else if(reward>=1000){spotlight(c);setAction(c,'dance',6500);serve(c,'🍰');feed(c.name,'đạt 1.000 tim: bánh sao băng & spotlight!','🎉');toast('🎉 '+c.name+' đạt 1.000 tim!')}
 else{puff(c.x,c.y-50,'heart',num>10?10:4);feed(c.name,'thả '+num+' tim','💗')}
 if(Math.floor(heartCount/1000)>oldRoom)party('ĐẠT 1.000 TIM — PHÁO HOA NEON!');updateStats();renderRank();
}
function actionShare(num=5,c=getOwner()){
 num=clamp(Number(num)||5,1,100);const prev=c.shares||0;shareCount+=num;c.shares=prev+num;c.score+=num*12;
 const old5=Math.floor(prev/5),new5=Math.floor(c.shares/5);
 if(new5>old5){goTo(c,'dance');setAction(c,'giftbox',4800,'🎁');spotlight(c);feed(c.name,'mở hộp quà trang trí sau 5 chia sẻ!','🎁');toast('🎁 '+c.name+' mở hộp quà ảo!');soundEffect('share')}
 else{feed(c.name,'chia sẻ buổi tiệc','↗');puff(c.x,c.y-60)}
 if(Math.floor(c.shares/10)>Math.floor(prev/10)){setAction(c,'dance',6000);puff(c.x,c.y-50,'spark',25);displayText(c.x,c.y-120,'SHARE PARTY','#a7eaff')}
 if(Math.floor(c.shares/20)>Math.floor(prev/20)){spotlight(c);serve(c,'🍰')}
 updateStats();renderRank();
}
function actionGift(tier=2,c=getOwner(),giftName='Quà Neon'){
 tier=clamp(Number(tier)||2,1,6);c.score+=tier*180;
 requestGiftCloseup(c,giftName,tier);
 // Queue one exclusive three-second main-character dance per confirmed gift.
 if(tier>=4)party(tier>=6?'ULTIMATE PARTY — ĐẠI TIỆC NEON!':'DJ PARTY — BÙNG NỔ SÀN NHẢY!');
 else puff(c.x,c.y-70,'spark',15+tier*7);
 feed(c.name,'tặng '+giftName+' · được lên sân khấu nhảy '+giftDanceNames[tier]+' trong 3 giây','💎');
 toast('🎁 '+c.name+' lên sân khấu solo 3 giây với '+giftName+'!');soundEffect('gift');renderRank();
}
function actionFood(item,c=getOwner(),drink=false){goTo(c,drink?'bar':'food');setAction(c,drink?'cheers':'eat',8000,item[0]);serve(c,item[0]);c.score+=5;feed(c.name,(drink?'gọi đồ uống ':'gọi món ')+item[1],drink?'🍹':'🍕');toast(item[0]+' '+item[1]+' đang được mang tới '+c.name);puff(c.x,c.y-48,'spark',11);soundEffect('cheers');renderRank()}
function actionDance(c=getOwner()){goTo(c,'dance');setAction(c,'dance',9000);puff(c.x,c.y-50,'spark',10);soundEffect('dance');feed(c.name,'đang quẩy hết mình trên sàn nhảy!','🎵')}
function updateDJVote(){const total=djVotes.hong+djVotes.xanh;const h=$('djPinkCount'),b=$('djBlueCount'),p=$('djPinkBar'),q=$('djBlueBar');if(h)h.textContent=djVotes.hong+' phiếu';if(b)b.textContent=djVotes.xanh+' phiếu';if(p)p.style.width=(total?100*djVotes.hong/total:50)+'%';if(q)q.style.width=(total?100*djVotes.xanh/total:50)+'%'}
function actionVote(team,c=getOwner()){
 if(Date.now()>djRoundEnds){const win=djVotes.hong>=djVotes.xanh?'HỒNG NEON':'XANH CYAN';party('DJ BATTLE: '+win+' CHIẾN THẮNG!');djVotes={hong:0,xanh:0};djVoters.clear();djRoundEnds=Date.now()+90000}
 if(djVoters.has(c.name.toLowerCase())){if(c===self)toast('Mỗi nhân vật chỉ được bình chọn 1 lần mỗi vòng DJ.');return}
 djVoters.add(c.name.toLowerCase());djVotes[team]++;c.score+=3;const col=team==='hong'?'#ff6bd4':'#55e4ff';beam(c.x,c.y-45,col,100);displayText(c.x,c.y-117,'DJ '+(team==='hong'?'HỒNG':'XANH'),col);feed(c.name,'bình chọn DJ '+(team==='hong'?'Hồng Neon':'Xanh Cyan'),'🎧');soundEffect('dance');updateDJVote();renderRank();
}
function actionCheers(c=getOwner()){goTo(c,'bar');setAction(c,'cheers',6000,'🍹');puff(c.x,c.y-58,'spark',12);displayText(c.x,c.y-122,'CHEERS!','#ffdf99');feed(c.name,'nâng ly chúc mừng cùng bạn bè!','🥂');playAssetSound('glass');soundEffect('cheers')}
function actionDancePair(c){actionDance(c);const now=Date.now();if(lastPartner&&lastPartner.c!==c&&now-lastPartner.at<12000){const friend=lastPartner.c;target(friend,625,530);target(c,735,530);setAction(friend,'dance',10000);setAction(c,'dance',10000);beam(friend.x,friend.y-44,'#ff73ce',95);beam(c.x,c.y-44,'#66e8fa',95);feed('DANCE TOGETHER',friend.name+' & '+c.name+' đang nhảy đôi!','💃');toast('💃 '+friend.name+' × '+c.name+' – DANCE DUO!');lastPartner=null}else lastPartner={c,at:now}}
function triggerDancerShow(focus='duo'){
  proShowFocus=focus;proShowUntil=performance.now()+15000;
  const who=focus==='pro-luna'?'LUNA – NEON SHUFFLE':focus==='pro-kai'?'KAI – BREAKDANCE':'LUNA & KAI – EDM DANCE DUO';
  for(const d of residentDancers){puff(d.x,d.y-80,'spark',24);beam(d.x,d.y-16,d.color,110)}
  displayText(680,340,'★ EDM DANCE SHOW ★','#ffe4ab');
  soundEffect('dance');feed('EDM DANCE CREW',who+' đang biểu diễn trên sàn nhảy!','🔥');
  toast('🔥 '+who+' • 15 giây trình diễn đặc biệt!');
}
function openResidentDancer(d){
  showModal(d.name+' · Vũ công EDM','✦ RESIDENT DANCER',`<div class="character-info"><div class="character-large" style="background:linear-gradient(135deg,${d.color},#33234f)">♫</div><div class="info-text"><b>${d.name}</b><p>${d.style==='shuffle'?'Điệu shuffle, heel-toe, xoay người và vũ đạo tay theo nhịp.':'Breakdance, toprock, footwork và windmill neon.'}</p><span class="badge-mini">🔥 Vũ công thường trú · biểu diễn không ngừng</span></div></div><div class="modal-action-row"><button class="primary-btn" id="startSolo">▶ Xem solo</button><button class="secondary-btn" id="startDuo">✦ Xem song đấu EDM</button></div>`,()=>{
    $('startSolo').onclick=()=>{closeModal();triggerDancerShow(d.id)};
    $('startDuo').onclick=()=>{closeModal();triggerDancerShow('duo')};
  });
}
function party(label='PARTY TIME — CẢ QUÁN BÙNG NỔ!'){activePartyUntil=performance.now()+11500;for(const c of chars){if(c===giftShot?.character)continue;if(Math.random()<.88){goTo(c,'dance');setAction(c,'dance',11000)}}for(let i=0;i<7;i++)setTimeout(()=>puff(rand(330,1010),rand(200,600),'spark',28),i*380);$('partyStatus').innerHTML='<span class="pulse-spot">✦</span><span>ĐẠI TIỆC NEON <b>PARTY MODE ON</b></span>';feed('DJ NEON',label,'🎧');toast('🔥 '+label);playAssetSound('crowd',.65);soundEffect('dance')}
function updateAvatar(c,url){if(!url||!/^https:\/\//i.test(url)||url.length>2048||c.avatar===url)return;c.avatar=url;let img=new Image();img.crossOrigin='anonymous';img.onload=()=>{c.img=img};img.onerror=()=>{c.img=null};img.src=url}
function addPerson(name,avatarUrl){name=safeText(name).trim().slice(0,24);if(!name){toast('Nhập tên trước khi vào quán nhé!');return}if(chars.some(c=>c.name.toLowerCase()===name.toLowerCase())){toast('Tên này đã có mặt trong quán!');return}let c=newCharacter(name,chars.length);c.x=670;c.y=795;c.tx=675+rand(-180,180);c.ty=485+rand(-80,80);c.action='dance';c.danceStyle=Math.floor(rand(0,8));chars.push(c);if(avatarUrl)updateAvatar(c,avatarUrl);selectedId=c.id;puff(c.x,c.y-30,'spark',25);displayText(c.x,c.y-95,'CHÀO MỪNG!','#fbe2a3');feed(c.name,'vừa bước vào quán Neon Party!','👋');toast('✨ Chào mừng '+name+' đến Neon Party!');welcomePerson(c);updateStats();renderRank();return c}
function showModal(title,eyebrow,html,setup){$('modalTitle').textContent=title;$('modalEyebrow').textContent=eyebrow;$('modalContent').innerHTML=html;$('modalBackdrop').hidden=false;if(setup)setup()}
function closeModal(){$('modalBackdrop').hidden=true}
const option=(icon,title,small,key,i)=>`<button class="menu-option" data-item="${i}" data-kind="${key}"><span class="menu-emoji">${icon}</span><span><b>${title}</b><small>${small}</small></span></button>`;
function foodModal(drink){const menu=drink?menuDrinks:menuFoods;showModal(drink?'Quầy nước Neon':'Menu đồ ăn hấp dẫn',drink?'🍹 BARTENDER STATION':'🍕 PARTY FOOD CORNER','<p class="modal-note">Hãy chọn món ảo! Nhân vật sẽ di chuyển tới quầy và nhận món với hoạt ảnh riêng. Đây là trải nghiệm miễn phí trong DEMO.</p><div class="menu-grid">'+menu.map((m,i)=>option(...m,drink?'drink':'food',i)).join('')+'</div>',()=>{document.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>{actionFood(menu[Number(b.dataset.item)],getOwner(),drink);closeModal()}))})}
function giftModal(){const items=[['💗','Trái tim Neon','Cấp 1 · Nhấp nháy dễ thương'],['🎁','Hộp quà lung linh','Cấp 2 · Mở quà'],['🍹','Bartender Show','Cấp 3 · Ánh sáng và phục vụ'],['✨','Personal Spotlight','Cấp 4 · Sân khấu rực rỡ'],['🎧','DJ Party','Cấp 5 · Vũ điệu cộng đồng'],['🎆','Ultimate Party','Cấp 6 · Bùng nổ toàn quán']];showModal('Thử hiệu ứng quà tặng','🎁 GIFT REACTION ENGINE','<p class="modal-note">Sự kiện dưới đây là <b>DEMO</b> để trải nghiệm hiệu ứng. Đây không phải giao dịch TikTok hay hệ thống mua hàng bằng Coin.</p><div class="menu-grid">'+items.map((m,i)=>option(...m,'gift',i)).join('')+'</div>',()=>{document.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>{let i=Number(b.dataset.item);actionGift(i+1,getOwner(),items[i][1]);closeModal()}))})}
function joinModal(isEdit=false){const title=isEdit?'Đổi tên nhân vật':'Mời thêm một người bạn';showModal(title,'👋 CHÀO MỪNG BẠN ĐẾN QUÁN',`<p class="modal-note">${isEdit?'Thay tên nhân vật của bạn trong phiên DEMO.':'Tạo thêm một nhân vật hoạt hình với tên riêng, tự động bước vào quán và hòa vào buổi tiệc.'}</p><label class="form-label" for="newName">Tên hiển thị</label><input id="newName" class="form-input" maxlength="24" placeholder="Ví dụ: Bé Mèo, Kiki, Panda..." autocomplete="off"><button id="submitName" class="primary-btn">${isEdit?'LƯU TÊN':'✦ THÊM NHÂN VẬT'}</button>`,()=>{$('newName').value=isEdit?self.name:'';const submit=()=>{const name=$('newName').value.trim();if(!name)return;if(isEdit){self.name=name;selectedId='you';$('selfName').textContent=name;$('selfAvatar').textContent=[...name][0].toUpperCase();try{localStorage.setItem('neon_name',name)}catch{}toast('Đã đổi tên thành '+name);renderRank()}else addPerson(name);closeModal()};$('submitName').addEventListener('click',submit);$('newName').addEventListener('keydown',e=>{if(e.key==='Enter')submit()});$('newName').focus()})}
function settingsModal(){showModal('Cài đặt không gian','⚙ YOUR PARTY SETTINGS',`<div class="settings-line"><span>♫ Âm lượng nhạc nền</span><input type="range" id="settingVol" min="0" max="100" value="${Math.round(volume*100)}"></div><div class="settings-line"><span>🎙 MC ảo chào khách</span><button class="secondary-btn" id="mcSettingsBtn">Cá nhân hóa lời chào</button></div><div class="settings-line"><span>🔊 Tiếng khui bia, quà tặng, pháo hoa</span><button class="secondary-btn" id="allAudioSettingsBtn">Kiểm tra tất cả âm thanh</button></div><div class="settings-line"><span>🎚 Hiệu ứng đồ họa</span><select id="qualitySelect" class="form-input" style="width:160px;margin:0"><option value="auto">Tự động</option><option value="low">Tiết kiệm</option><option value="high">Cao</option></select></div><div class="settings-line"><span>⚡ Quản trị & Kết nối LIVE</span><button class="secondary-btn" id="adminButton">Mở bảng quản trị</button></div><div class="settings-line"><span>🎥 Chế độ phát OBS</span><button class="secondary-btn" id="overlayLink">Mở Overlay 9:16</button></div><div class="settings-line"><span>♬ Điều khiển nhạc</span><button class="secondary-btn" id="musicControl">${isPlaying?'Tạm dừng nhạc':'Bật nhạc'}</button></div><p class="modal-note">Nhạc đi kèm đã được nén để giảm dung lượng. Chế độ LIVE thật yêu cầu máy chủ và nguồn sự kiện TikTok hợp lệ. Khi mở HTML độc lập, các chức năng tương tác hoạt động ở chế độ DEMO.</p>`,()=>{$('mcSettingsBtn').addEventListener('click',mcSettingsModal);$('allAudioSettingsBtn').addEventListener('click',partySoundSettings);$('adminButton').addEventListener('click',adminModal);$('settingVol').addEventListener('input',e=>setVolume(e.target.value));$('qualitySelect').value=quality;$('qualitySelect').addEventListener('change',e=>quality=e.target.value);$('overlayLink').addEventListener('click',()=>{const url=location.href.split('?')[0]+'?overlay=1';try{window.open(url,'_blank')}catch{}toast('Đã mở liên kết OBS Overlay')});$('musicControl').addEventListener('click',()=>{toggleAudio();$('musicControl').textContent=isPlaying?'Tạm dừng nhạc':'Bật nhạc'})})}
function adminModal(){
 if(!sameOriginBackend){
   const safeLink=backendBase && /^https:\/\//i.test(backendBase) ? backendBase : '';
   showModal('Kết nối TikTok LIVE','📡 GITHUB PAGES + LIVE SERVER',
     `<p class="modal-note">Trang đang chạy trên <b>GitHub Pages / HTML độc lập</b>. Để bảo vệ mã quản trị, hãy mở bảng quản trị trên <b>máy chủ backend</b> thay vì nhập token trên website công khai.</p>`+
     `<div class="preset-line"><span>LIVE server</span><b id="remoteLiveStatus">${safeLink?'Đang kiểm tra...':'Chưa cấu hình BACKEND_URL'}</b></div>`+
     (safeLink?`<div class="modal-action-row"><a class="primary-btn" href="${safeLink}/?admin=1" target="_blank" rel="noopener noreferrer">⚡ Mở bảng quản trị trên backend</a></div>`:'')+
     `<p class="modal-note">Cấu hình URL HTTPS của backend trong <code>config.js</code> rồi tải lại trang. Bản DEMO vẫn chạy khi backend chưa sẵn sàng.</p>`,
     ()=>{if(!safeLink)return;fetch(apiEndpoint('/api/status'),{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(st=>{const x=$('remoteLiveStatus');if(x)x.textContent=st.live?'● TikTok LIVE: @'+st.username:'● Backend đã kết nối / LIVE chưa bật'}).catch(()=>{const x=$('remoteLiveStatus');if(x)x.textContent='Không liên lạc được backend'})});
   return;
 }
showModal('Quản trị & kết nối TikTok LIVE','⚡ REAL-TIME CONTROL CENTER',`<p class="modal-note">Kết nối TikTok chỉ hoạt động nếu ứng dụng đang chạy bằng backend Node.js và nguồn sự kiện được phép truy cập. GitHub Pages hoặc HTML offline sẽ chạy DEMO.</p><div class="preset-line"><span>Tình trạng máy chủ</span><b class="progress-indicator" id="serverStatus">Đang kiểm tra...</b></div><label class="form-label" for="liveUser">TikTok username (không cần @)</label><input class="form-input" id="liveUser" placeholder="ten_tiktok_cua_ban" autocomplete="off"><label class="form-label" for="liveToken">Mã quản trị NEON_ADMIN_TOKEN</label><input class="form-input" id="liveToken" type="password" placeholder="Nhập mã từ cấu hình máy chủ" autocomplete="off"><div class="modal-action-row"><button class="primary-btn" id="liveConnect">Kết nối LIVE</button><button class="secondary-btn" id="liveDisconnect">Ngắt LIVE</button><button class="secondary-btn" id="adminTest">Thử gửi 100 tim đến tất cả màn hình</button></div><p class="modal-note" id="adminMsg">Không dùng mật khẩu TikTok. Mã quản trị không lưu trong trình duyệt.</p>`,()=>{const msg=$('adminMsg');const status=$('serverStatus');fetch('/api/status').then(r=>r.json()).then(s=>{status.textContent=s.live?'● LIVE '+s.username:'● Backend sẵn sàng (DEMO)'}).catch(()=>{status.textContent='◌ HTML độc lập / Không có backend';msg.textContent='Muốn nhận sự kiện LIVE thật, chạy dự án ZIP bằng Node.js.'});const post=async(path,payload)=>{adminToken=$('liveToken').value;try{let res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+adminToken},body:JSON.stringify(payload)});const data=await res.json();msg.textContent=data.error||(data.ok?'Thành công. Trạng thái đã được đồng bộ.':'Không thành công');if(data.ok)status.textContent=path.includes('disconnect')?'● Đã ngắt LIVE':path.includes('connect')?'● LIVE connected':status.textContent}catch(e){msg.textContent='Không truy cập được backend: '+e.message}};$('liveConnect').onclick=()=>post('/api/live/connect',{username:$('liveUser').value.trim()});$('liveDisconnect').onclick=()=>post('/api/live/disconnect',{});$('adminTest').onclick=()=>post('/api/event',{type:'like',name:'Admin Demo',count:100})})}
function openCharacter(c){selectedId=c.id;showModal(c.name,'✦ THÀNH VIÊN PARTY CLUB',`<div class="character-info"><div class="character-large" style="background:linear-gradient(135deg,${c.color},#6652af)">${[...c.name][0].toUpperCase()}</div><div class="info-text"><b>${escapeHtml(c.name)}</b><p>${c.id==='you'?'Đây là nhân vật của bạn.':'Bạn có thể tương tác với nhân vật này.'}</p><span class="badge-mini">✦ ${Math.floor(c.score)} điểm tương tác DEMO</span></div></div><div class="modal-action-row"><button class="primary-btn" id="charDance">♫ Đi nhảy</button><button class="secondary-btn" id="charDrink">🍹 Mời mocktail</button><button class="secondary-btn" id="charFood">🍕 Mời pizza</button><button class="secondary-btn" id="charWave">👋 Chào bạn</button><button class="secondary-btn" id="charFollow">🎥 Theo dõi nhân vật</button></div>`,()=>{$('charDance').onclick=()=>{actionDance(c);closeModal()};$('charDrink').onclick=()=>{actionFood(menuDrinks[0],c,true);closeModal()};$('charFood').onclick=()=>{actionFood(menuFoods[0],c,false);closeModal()};$('charWave').onclick=()=>{setAction(c,'wave',4000);puff(c.x,c.y-70);closeModal()};$('charFollow').onclick=()=>{selectedId=c.id;closeModal();setCameraMode('follow')}})}
function escapeHtml(str){return String(str).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function musicTime(){let t=audio.currentTime||0;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`}
function toggleAudio(){if(!soundActivated){startAudio();return}if(isPlaying){audio.pause();isPlaying=false;syncAudioUI()}else{muted=false;startAudio()}}
function createGradient(x,y,r,inner,outer){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,inner);g.addColorStop(1,outer);return g}
function rr(x,y,w,h,r=10){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function label(s,x,y,size=13,color='#fff',align='center',weight='800'){ctx.save();ctx.font=weight+' '+size+'px "Segoe UI",Arial,sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(s,x,y);ctx.restore()}
function rect(x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(x,y,w,h)}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function line(x,y,x2,y2,col,width=1){ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function neonPanel(x,y,w,h,title,accent){ctx.save();ctx.shadowColor=accent;ctx.shadowBlur=18;rr(x,y,w,h,15);ctx.fillStyle='#16152d';ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;label(title,x+w/2,y+20,14,accent);ctx.restore()}
const staticStars=Array.from({length:105},(_,i)=>({x:(i*239+17)%W,y:(i*397+59)%H,s:i%7===0?2:1}));
function drawBackground(t){rect(0,0,W,H,'#0b0c24');let gg=ctx.createLinearGradient(0,0,0,H);gg.addColorStop(0,'#21143e');gg.addColorStop(.55,'#151630');gg.addColorStop(1,'#17122b');rect(0,0,W,H,gg);for(const s of staticStars){ctx.globalAlpha=.16+.18*Math.sin(t*.6+s.x);ellipse(s.x,s.y,s.s,s.s,s.x%3?'#98acfa':'#ff82d5')}ctx.globalAlpha=1;rect(0,0,W,235,'#22153c');for(let i=0;i<15;i++){let x=20+i*95;rect(x,14,79,157,'#2c1e46');rect(x+4,18,71,3,i%2?'#6f50a7':'#8b397f');ellipse(x+38,96,3,3,'#9c64b2')}line(0,223,W,223,'#bd55ff',5);rect(0,236,W,H-236,'#24213b');for(let y=248;y<H;y+=49)line(0,y,W,y,'#e7c6ff0a',1);for(let x=0;x<W;x+=68)line(x,236,x,H,'#d9b7ff0b',1);ctx.fillStyle=createGradient(680,440,510,'#53257e70','#0b0c2400');ctx.fillRect(110,240,1180,600);ctx.fillStyle=createGradient(130,480,350,'#f34aa522','#00000000');ctx.fillRect(0,245,500,500);ctx.fillStyle=createGradient(1200,440,270,'#4b7cf122','#00000000');ctx.fillRect(1000,200,360,580)}
// v1.4 architectural upgrade. Multi-zone 1920 x 1160 dance-club with layered glass,
// brushed-metal edges, specular floors and atmospheric light, all painted offline.
function architecturalRoom(x,y,w,h,title,accent,base='#22213e'){
 ctx.save();
 ctx.shadowColor='#00000099';ctx.shadowBlur=22;ctx.shadowOffsetY=14;
 rr(x,y,w,h,24);const g=ctx.createLinearGradient(x,y,x+w,y+h);
 g.addColorStop(0,base);g.addColorStop(.63,'#191b38');g.addColorStop(1,'#2e2347');ctx.fillStyle=g;ctx.fill();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle=accent+'a8';ctx.lineWidth=3;ctx.stroke();
 for(let v=y+36;v<y+h-10;v+=45)line(x+13,v,x+w-13,v,'#fce7ff0b',1);
 for(let v=x+27;v<x+w-10;v+=59)line(v,y+14,v,y+h-12,'#b2a8ef0a',1);
 const glass=ctx.createLinearGradient(x,y,x+w*.7,y+h);
 glass.addColorStop(0,'#ffffff21');glass.addColorStop(.35,'#ffffff05');glass.addColorStop(1,'#ffffff00');
 ctx.fillStyle=glass;ctx.beginPath();ctx.moveTo(x+17,y+14);ctx.lineTo(x+w*.6,y+14);ctx.lineTo(x+w*.35,y+h-15);ctx.lineTo(x+17,y+h-15);ctx.closePath();ctx.fill();
 ctx.shadowColor=accent;ctx.shadowBlur=13;line(x+20,y+44,x+w-20,y+44,accent,2);ctx.shadowBlur=0;
 label(title,x+w/2,y+29,17,'#f7e9ff');ctx.restore();
}
function glassWindow(x,y,w,h,t){
 ctx.save();rr(x,y,w,h,9);ctx.fillStyle='#131d38';ctx.fill();ctx.clip();
 const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#2b3560');g.addColorStop(1,'#14132e');rect(x,y,w,h,g);
 // distant skyline parallax, halo and windows
 for(let i=0;i<19;i++){const bx=x+((i*23)%w),bh=19+((i*37)%55);rect(bx,y+h-bh,15,bh,i%3?'#11142e':'#262342');for(let j=0;j<4;j++)ellipse(bx+5+(j%2)*5,y+h-bh+10+(j*11)%bh,1.1,1.1,'#f8d29e9e')}
 const glow=ctx.createRadialGradient(x+w*.74,y+h*.24,3,x+w*.74,y+h*.24,w*.5);glow.addColorStop(0,'#f99bd841');glow.addColorStop(1,'#f99bd800');rect(x,y,w,h,glow);
 for(let i=0;i<=5;i++)line(x+i*w/5,y,x+i*w/5,y+h,'#b6bcec50',3);
 line(x,y+h*.5,x+w,y+h*.5,'#b6bcec50',3);
 ctx.fillStyle='#ffffff14';ctx.beginPath();ctx.moveTo(x+18,y);ctx.lineTo(x+40,y);ctx.lineTo(x+w*.25,y+h);ctx.lineTo(x+w*.17,y+h);ctx.closePath();ctx.fill();ctx.restore();
}
function sofa(x,y,w,c){ctx.save();ellipse(x+w*.5,y+47,w*.57,15,'#0307168c');rr(x,y,w,56,16);let g=ctx.createLinearGradient(x,y,x,y+58);g.addColorStop(0,c);g.addColorStop(1,'#392b59');ctx.fillStyle=g;ctx.fill();rr(x+10,y+4,w-20,27,10);ctx.fillStyle='#ffffff1a';ctx.fill();rr(x+15,y+31,w-30,15,7);ctx.fillStyle='#090d275e';ctx.fill();ctx.restore()}
function plant(x,y,size=1){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ellipse(0,20,27,8,'#0509128a');rr(-13,-3,26,25,5);ctx.fillStyle='#605174';ctx.fill();rect(-8,0,16,3,'#ddbcff');for(let i=0;i<8;i++){const a=i*Math.PI/4;line(0,-10,Math.cos(a)*21,-29+Math.sin(a)*16,'#338b75',5);ellipse(Math.cos(a)*25,-35+Math.sin(a)*16,12,6,i%2?'#379e83':'#71bfa6')}ctx.restore()}
function drawVenueExpansion(t,energy){
 // Long illuminated passage connects the original dance floor to the expanded wings.
 ctx.save();const corridor=ctx.createLinearGradient(1310,350,1910,920);corridor.addColorStop(0,'#30243e');corridor.addColorStop(.5,'#191d39');corridor.addColorStop(1,'#2e2840');
 rr(1282,360,190,510,13);ctx.fillStyle=corridor;ctx.fill();line(1362,365,1362,855,'#a765c57c',4);line(1404,365,1404,855,'#5ed8ef7c',3);for(let k=0;k<11;k++){line(1285,379+k*43,1465,379+k*43,k%2?'#ce87f323':'#67e5ff28',2)}
 label('SKY WALK',1375,448,14,'#a3efff');
 // Sky lounge: glass walls, skyline and velvet seats.
 architecturalRoom(1440,65,445,413,'SKY LOUNGE  ✦  CITY VIEW','#8b8df8','#2e2a55');
 glassWindow(1466,117,393,145,t);
 sofa(1490,302,169,'#7f518d');sofa(1702,302,154,'#665a98');
 drawTable(1591,385,1.23);drawTable(1778,383,.92);
 for(let i=0;i<6;i++){ellipse(1473+i*76,449,7,4,'#6adfff');}
 label('PRIVATE SKY  •  NIGHT CITY',1660,465,12,'#acd5ff');
 // Garden terrace: soft pools of projected light, glass railing and landscaping.
 architecturalRoom(1440,512,445,319,'GARDEN TERRACE  •  CHILL','#55c7b6','#153a43');
 let glass=ctx.createLinearGradient(1480,580,1840,800);glass.addColorStop(0,'#8ce9c317');glass.addColorStop(1,'#66d8f103');rect(1466,567,392,240,glass);
 for(let i=0;i<7;i++){line(1470+i*58,573,1470+i*58,809,'#b5fdef21',2)}
 plant(1493,661,.95);plant(1824,681,1.18);plant(1510,789,.75);
 drawTable(1630,673,1.05);drawTable(1743,747,.93);
 for(let i=0;i<12;i++){const x=1470+i*34;ellipse(x,554+Math.sin(i+t*.6)*2,3.3,3.3,i%2?'#eeb6fb':'#8affdd')}
 label('TROPICAL NIGHT  ✧  FRESH AIR',1663,801,11,'#aefbe8');
 // Vinyl listening lounge in the south-west.
 architecturalRoom(32,859,516,269,'VINYL & CHILL  •  LOUNGE','#b08af6','#222344');
 sofa(61,927,157,'#6d4c95');sofa(312,930,182,'#6b4e83');drawTable(273,1040,1.25);
 for(let i=0;i<6;i++){ellipse(107+i*76,900,11,11,i%2?'#9c65f6':'#6d80c2');ellipse(107+i*76,900,4,4,'#120b24')}
 label('DEEP HOUSE / CHILL MIX',285,1100,13,'#bfb0ff');
 // New main entry corridor / glass lobby.
 architecturalRoom(577,852,608,278,'GRAND ENTRANCE  •  NEON TUNNEL','#f599d8','#302039');
 rr(749,920,256,178,16);ctx.fillStyle='#1d1b39';ctx.fill();ctx.strokeStyle='#f7a4de';ctx.lineWidth=3;ctx.stroke();
 for(let i=0;i<7;i++){const off=i*19;rr(758+off,931+off*.33,237-off*2,161-off*.75,10);ctx.strokeStyle=i%2?'#6fdded6e':'#f17dc26b';ctx.lineWidth=2;ctx.stroke()}
 let door=ctx.createLinearGradient(800,950,940,1090);door.addColorStop(0,'#80d6e632');door.addColorStop(1,'#ff69ca13');rect(809,974,134,100,door);line(874,976,874,1074,'#ffd6f5',2);
 label('WELCOME TO THE NIGHT',880,1111,13,'#ffe6ff');
 // Rooftop: open skyline, bar railings and rooftop sofas.
 architecturalRoom(1219,865,662,266,'ROOFTOP SKY DECK  ✦  360° VIBE','#e8b36e','#322943');
 glassWindow(1245,908,607,89,t);sofa(1268,1035,150,'#ab5c7e');sofa(1673,1034,157,'#8b5f91');
 drawTable(1548,1066,.9);plant(1467,1060,.76);plant(1634,1080,.65);
 // Architectural column bevels and lit pathways reinforce depth.
 for(const [x,y] of [[1352,355],[1420,850],[1200,855],[567,848]]){rect(x-5,y-15,10,67,'#080c1e');rect(x-5,y-15,5,67,'#c9b9ff47');ellipse(x,y+51,11,6,'#000a')}
 ctx.restore();
}
function drawRealisticFinishes(t,energy){
 if(quality==='low')return;
 ctx.save();
 // Brushed metal / reflective mosaic: stable detail, independent of frame randomness.
 for(let i=0;i<125;i++){const x=28+(i*193)%1873,y=261+(i*127)%885;if((x>430&&x<950&&y<705)||(x>1430&&y<850)||(y>854))continue;
   const a=.08+.05*Math.sin(t*.7+i);ctx.strokeStyle=`rgba(219,198,255,${a})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+15+(i%3)*9,y);ctx.stroke()}
 // Subtle god-rays and coloured pools of light across the expanded room.
 for(const [x,y,r,c] of [[1590,277,180,'#a692ff'],[1680,700,220,'#40d9c1'],[895,982,245,'#e96ac2'],[1560,1031,180,'#ffb35c']]){
   const g=ctx.createRadialGradient(x,y,7,x,y,r);g.addColorStop(0,c+'1f');g.addColorStop(1,c+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}
function paintMiniMap(){const map=$('miniMap');if(!map||$('miniMapPanel').hidden)return;let c=map.getContext('2d');let w=map.width,h=map.height;c.clearRect(0,0,w,h);c.fillStyle='#0c132b';c.fillRect(0,0,w,h);
 const sx=x=>x/W*w,sy=y=>y/H*h;
 const regions=[['#c64fc1',405,55,546,650],['#f1a64d',32,100,356,681],['#6471db',1030,93,310,685],['#7967d5',1440,65,445,413],['#4dcba9',1440,512,445,319],['#9d7fce',32,859,516,269],['#f482b8',577,852,608,278],['#ddad66',1219,865,662,266]];
 for(const [color,x,y,ww,hh] of regions){c.fillStyle=color+'aa';c.fillRect(sx(x),sy(y),sx(ww),sy(hh))}
 c.fillStyle='#eaeaff';c.font='bold 10px sans-serif';c.fillText('NEON CITY · BẢN ĐỒ',8,13);
 c.strokeStyle='#fcf0ff';c.lineWidth=2;c.strokeRect(sx(cam.x)-4,sy(cam.y)-4,8,8);
 c.strokeStyle='#ffe990';c.lineWidth=1.2;c.strokeRect(sx(cam.x)-Math.min(w/2,(cw/scale/W)*w)/2,sy(cam.y)-Math.min(h/2,(ch/scale/H)*h)/2,Math.min(w/2,(cw/scale/W)*w),Math.min(h/2,(ch/scale/H)*h));
}
// DJ MERMAID / NANG TIEN CA: original vector art; all curves and fins dance with the music.
function drawMermaidDancer(t,energy){
 ctx.save();
 const sway=Math.sin(t*2.7)*.16, flip=Math.sin(t*4.2)*.30;
 ctx.rotate(sway*.43);
 const bloom=ctx.createRadialGradient(0,-18,2,0,-18,80);
 bloom.addColorStop(0,'#9df8ff56');bloom.addColorStop(.6,'#ab73f51f');bloom.addColorStop(1,'#9efbff00');
 ellipse(0,-14,72,86,bloom);
 // Flowing hair behind the face, individual animated waves.
 ctx.save();ctx.translate(0,-53);
 let hair=ctx.createLinearGradient(-37,-16,27,65);hair.addColorStop(0,'#4f1d85');hair.addColorStop(.42,'#c758e0');hair.addColorStop(1,'#27c5d8');
 ctx.fillStyle=hair;ctx.beginPath();ctx.moveTo(-26,-4);ctx.bezierCurveTo(-41,5,-45,44,-29,63);
 ctx.quadraticCurveTo(-18+7*Math.sin(t*2),46,-10,40);ctx.quadraticCurveTo(14,53,29+5*Math.cos(t*2),64);
 ctx.bezierCurveTo(40,30,41,0,24,-12);ctx.closePath();ctx.fill();ctx.restore();
 // Tail bends freely in rhythm; teal scales, fuchsia outlines and split translucent fins.
 ctx.save();ctx.translate(0,2);ctx.rotate(flip);
 const tail=ctx.createLinearGradient(-15,0,24,67);
 tail.addColorStop(0,'#c65bea');tail.addColorStop(.23,'#6feafa');tail.addColorStop(.62,'#34bcc7');tail.addColorStop(1,'#6ef7d0');
 ctx.shadowColor='#4df5f3';ctx.shadowBlur=11;ctx.fillStyle=tail;ctx.beginPath();
 ctx.moveTo(-13,1);ctx.bezierCurveTo(-23,20,-12,32,-8,48);ctx.quadraticCurveTo(-4,60,5,62);
 ctx.bezierCurveTo(19,42,19,17,12,1);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
 for(let j=0;j<4;j++){
  const y=13+j*10;ctx.strokeStyle='#edffff99';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.arc(0,y,9+j*.5,.1,Math.PI-.1);ctx.stroke();
 }
 ctx.save();ctx.translate(5,60);ctx.rotate(Math.sin(t*5)*.25);
 const fin=ctx.createLinearGradient(-33,0,35,27);fin.addColorStop(0,'#f58bffdd');fin.addColorStop(.55,'#71ffff');fin.addColorStop(1,'#2df6c8');
 ctx.fillStyle=fin;ctx.strokeStyle='#d7fffa';ctx.lineWidth=1.2;
 ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-16,1,-37,6,-40,31);ctx.quadraticCurveTo(-12,35,1,17);
 ctx.bezierCurveTo(15,39,38,35,42,13);ctx.quadraticCurveTo(18,7,0,0);ctx.closePath();ctx.fill();ctx.stroke();
 line(0,6,-29,28,'#ffffff9e',1.3);line(0,6,29,21,'#ffffff9e',1.3);ctx.restore();ctx.restore();
 // Upper body, swirling arms and pearl bracelets.
 const skin='#f6bea9';
 ctx.fillStyle=skin;ctx.beginPath();ctx.moveTo(-14,-47);ctx.quadraticCurveTo(0,-41,14,-47);
 ctx.lineTo(15,-10);ctx.quadraticCurveTo(0,0,-15,-10);ctx.closePath();ctx.fill();
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';const dance=Math.sin(t*4.1);
 ctx.strokeStyle=skin;ctx.lineWidth=7;
 ctx.beginPath();ctx.moveTo(-13,-39);ctx.quadraticCurveTo(-28,-43,-34,-62+dance*12);ctx.stroke();
 ctx.beginPath();ctx.moveTo(13,-39);ctx.quadraticCurveTo(27,-43,37,-58-dance*15);ctx.stroke();
 ellipse(-34,-62+dance*12,5,5,skin);ellipse(37,-58-dance*15,5,5,skin);
 ellipse(-32,-57+dance*12,4,3,'#92fff4');ellipse(35,-53-dance*15,4,3,'#ffd6ff');ctx.restore();
 for(let q of [-1,1]){
  ctx.fillStyle=q===-1?'#fd7ccc':'#77eeeb';ctx.beginPath();ctx.moveTo(0,-35);ctx.quadraticCurveTo(q*8,-46,q*16,-32);
  ctx.quadraticCurveTo(q*12,-23,0,-24);ctx.closePath();ctx.fill();
  ellipse(q*8,-31,3,3,'#fff1bd');
 }
 // Neck + face framed by curls.
 rect(-5,-57,10,12,skin);ellipse(0,-68,22,25,skin);
 for(const side of [-1,1]){ellipse(side*20,-69,4,8,'#b44fba');ellipse(side*24,-73,5,13,'#9d46bb');}
 ellipse(-8,-67,2.1,2.8,'#23213a');ellipse(8,-67,2.1,2.8,'#23213a');
 ellipse(-14,-62,5,2.2,'#e6788c99');ellipse(14,-62,5,2.2,'#e6788c99');
 ctx.strokeStyle='#b63d84';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,-61,5,.13,Math.PI-.13);ctx.stroke();
 // Wavy turquoise fringe + seashell tiara + star jewel.
 ctx.fillStyle='#62218c';ctx.beginPath();ctx.moveTo(-22,-73);ctx.bezierCurveTo(-22,-99,20,-103,23,-73);
 ctx.bezierCurveTo(7,-85,-5,-84,-18,-72);ctx.closePath();ctx.fill();
 ctx.fillStyle='#49d6df';ctx.beginPath();ctx.moveTo(-13,-91);ctx.quadraticCurveTo(10,-98,20,-82);ctx.quadraticCurveTo(1,-89,-13,-91);ctx.fill();
 ellipse(0,-92,11,6,'#fff2c8');ellipse(0,-92,4,4,'#4df5ee');
 for(const [sx,sy] of [[-31,-44],[34,-33],[-44,-9],[42,6]]){
  const py=sy+5*Math.sin(t*2.1+sx);
  ctx.strokeStyle='#a4fbff99';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(sx,py,2+energy*2,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
function drawStage(t,energy){ctx.save();const djAccent=djVotes.xanh>djVotes.hong?'#46dcff':djVotes.hong>djVotes.xanh?'#ff64cb':'#b54cff';const stage=ctx.createLinearGradient(0,150,0,315);stage.addColorStop(0,'#352052');stage.addColorStop(1,'#25163f');rr(418,55,525,238,22);ctx.fillStyle=stage;ctx.fill();ctx.strokeStyle=djAccent;ctx.lineWidth=6;ctx.shadowBlur=24;ctx.shadowColor=djAccent;ctx.stroke();ctx.shadowBlur=0;for(let i=0;i<24;i++){let x=438+i*20;let h=24+75*(.38+.55*Math.abs(Math.sin(t*(2+energy*2)+i*.8)));rect(x,196-h,9,h,i%3===0?'#f052d6':i%3===1?'#5bdaff':'#ae6dff')};rr(510,62,340,64,14);ctx.fillStyle='#120e30';ctx.fill();ctx.strokeStyle='#ea7dff';ctx.lineWidth=2;ctx.stroke();label('✦  NEON  PARTY  ✦',680,94,30,'#ff95e1');rr(510,228,340,68,13);ctx.fillStyle='#171528';ctx.fill();ctx.strokeStyle='#57defc';ctx.stroke();label('★  DJ  NIGHT  ★',680,256,15,'#70e8ff');for(let i=0;i<12;i++){let val=freqData?freqData[(i*8)%freqData.length]/255:Math.abs(Math.sin(t*3+i*1.3));rect(571+i*18,280-val*14,9,val*14,'#e75ed6')}
for(let k of [-1,1]){let x=k===-1?458:902;ctx.save();ctx.translate(x,191);ctx.fillStyle='#0d0d24';rr(-22,-45,44,120,9);ctx.fill();ctx.strokeStyle='#7454bc';ctx.stroke();for(let i=0;i<3;i++){ellipse(0,-26+i*42,16,16,'#0a0c1c');ellipse(0,-26+i*42,10,10,i%2?'#c65cff':'#52d6ff')}ctx.restore()}
// Mermaid DJ floats and dances above the turntables (same character as portrait LIVE).
ctx.save();ctx.translate(680,213);ctx.scale(.9,.9);drawMermaidDancer(t,energy);ctx.restore();
let ballY=34+Math.sin(t)*4;ctx.save();ctx.shadowBlur=22;ctx.shadowColor='#e9ddff';ellipse(680,ballY,18,18,'#d1e8ff');ctx.shadowBlur=0;for(let i=-12;i<=12;i+=9){line(662,ballY+i,698,ballY+i,'#7479cd',2)}ctx.restore();
if(quality!=='low'){const glows=[['#be4ded',455,155,-.56],['#38d8fc',905,155,.6],['#ed5998',580,70,.4],['#c0a3ff',790,70,-.4]];for(const [col,x,y,angle] of glows){ctx.save();ctx.translate(x,y);ctx.rotate(angle+.18*Math.sin(t*1.1+x));const g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,col+'55');g.addColorStop(1,col+'00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-115,540);ctx.lineTo(115,540);ctx.closePath();ctx.fill();ctx.restore()}}ctx.restore()}
function drawEDMMainStage(t,energy){
 ctx.save();
 // Cinematic proscenium. All details are rendered procedurally: no remote images.
 for(let side of [-1,1]){
   const x=side<0?392:960;
   ctx.save();ctx.shadowColor=side<0?'#ec5dff':'#5ee9ff';ctx.shadowBlur=26;
   const metal=ctx.createLinearGradient(x-20,0,x+24,0);metal.addColorStop(0,'#0e0f2f');metal.addColorStop(.5,'#70688f');metal.addColorStop(1,'#17142e');
   rr(x-19,74,38,220,9);ctx.fillStyle=metal;ctx.fill();ctx.strokeStyle=side<0?'#f876e6':'#5feaff';ctx.lineWidth=2;ctx.stroke();
   for(let b=0;b<6;b++){ctx.fillStyle=b%2?'#fa67ea':'#6ef3ff';ctx.globalAlpha=.45+.4*Math.sin(t*4+b);rect(x-11,94+b*27,22,5)}ctx.restore();
 }
 ctx.save();ctx.globalAlpha=.34+.12*Math.sin(t*2);
 for(let k=0;k<5;k++){
  ctx.beginPath();ctx.moveTo(680+(k-2)*78,145);
  ctx.lineTo(680+(k-2)*128+Math.sin(t*1.8+k)*100,610);
  ctx.lineTo(680+(k-2)*128+40+Math.sin(t*1.8+k)*100,610);
  ctx.closePath();ctx.fillStyle=k%2?'#58d8ff':'#ff5cda';ctx.fill();
 }ctx.restore();
 const glow=ctx.createLinearGradient(450,70,900,160);glow.addColorStop(0,'#ff6bd1');glow.addColorStop(.5,'#ecb6ff');glow.addColorStop(1,'#5ae0f6');
 ctx.shadowColor='#e169f8';ctx.shadowBlur=18;ctx.strokeStyle=glow;ctx.lineWidth=7;
 ctx.beginPath();ctx.moveTo(427,147);ctx.lineTo(445,50);ctx.quadraticCurveTo(680,0,916,50);ctx.lineTo(933,147);ctx.stroke();ctx.shadowBlur=0;
 // Giant LED strips and animated skyline, framing the DJ without covering them.
 for(let i=0;i<20;i++){
   const h=6+Math.abs(Math.sin(t*5+i*.65))*21;
   rect(450+i*23,64-h/2,10,h,i%2?'#77dcff':'#ef86f9');
 }
 ctx.restore();
}
function drawDanceFloor(t,energy){ctx.save();const djAccent=djVotes.xanh>djVotes.hong?'#46dcff':djVotes.hong>djVotes.xanh?'#ff64cb':'#a656fb';let x=398,y=305,w=567,h=398;ctx.shadowColor=djAccent;ctx.shadowBlur=28;rr(x-7,y-7,w+14,h+14,20);ctx.fillStyle='#30205a';ctx.fill();ctx.strokeStyle=djAccent;ctx.lineWidth=5;ctx.stroke();ctx.shadowBlur=0;rr(x,y,w,h,15);ctx.clip();rect(x,y,w,h,'#241c4d');let cols=9,rows=7,tw=w/cols,th=h/rows;for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){let q=Math.sin(t*2.6+i*.9+j*.65),a=(q+1)*.5;ctx.fillStyle=(i+j)%3===0?`rgba(228,64,189,${.10+a*.14})`:(i+j)%3===1?`rgba(52,207,247,${.09+a*.15})`:`rgba(141,94,244,${.1+a*.18})`;rect(x+i*tw+2,y+j*th+2,tw-4,th-4,ctx.fillStyle)}for(let j=0;j<=rows;j++)line(x,y+j*th,x+w,y+j*th,'#e2c4ff28',2);for(let i=0;i<=cols;i++)line(x+i*tw,y,x+i*tw,y+h,'#e2c4ff20',2);ctx.save();ctx.globalAlpha=.1+.11*energy;ctx.fillStyle=createGradient(678,509,220,'#ffd4ff','#ffffff00');ctx.fillRect(x,y,w,h);ctx.restore();label('DANCE FLOOR',680,683,14,'#ffffff55');ctx.restore()}
function drawBar(t){ctx.save();neonPanel(40,105,328,195,'🍸  NEON BAR','#fa75bc');rect(53,144,304,30,'#2f2545');for(let i=0;i<12;i++){const x=68+i*24,h=15+(i*7%17);rect(x,151-h,10,h,colors[i%colors.length]);rect(x+2,149-h,6,4,'#c9e6ef')};rr(32,262,349,77,18);ctx.fillStyle='#9a4c82';ctx.fill();ctx.strokeStyle='#ff91c7';ctx.lineWidth=4;ctx.stroke();rect(52,299,310,34,'#542955');for(let i=0;i<9;i++){ellipse(71+i*35,300,5,3,'#f3b5c8')};label('BARTENDER  ✦  MOCKTAIL',205,292,13,'#ffe2ec');for(let i=0;i<4;i++){const x=70+i*89;ellipse(x,371,26,9,'#100e1d99');rect(x-4,343,8,25,'#522a66');ellipse(x,341,24,11,'#8d5b9c')};ctx.restore()}
function drawFood(t){ctx.save();neonPanel(48,563,317,206,'🍕  FOOD CORNER','#ffbd6a');rr(67,618,275,62,12);ctx.fillStyle='#543f5a';ctx.fill();ctx.strokeStyle='#d989b7';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<6;i++)label(['🍕','🍔','🍣','🍟','🍰','🍗'][i],95+i*43,643,25);rr(83,709,255,42,11);ctx.fillStyle='#4d2d49';ctx.fill();label('FRESH FOOD  •  PARTY BITES',210,730,11,'#f8d9a4');ctx.restore()}
function drawVIP(t){ctx.save();neonPanel(1040,106,286,206,'♛  VIP LOUNGE','#8aa4ff');rr(1065,171,229,69,17);ctx.fillStyle='#62427e';ctx.fill();rr(1086,189,187,38,12);ctx.fillStyle='#9f649f';ctx.fill();ellipse(1179,266,56,19,'#110f2599');ellipse(1179,258,54,18,'#4a4271');ellipse(1179,253,45,11,'#a48abd');for(let i=0;i<3;i++)label('✦',1121+i*58,246,14,colors[i]);label('GOLDEN HOUR',1179,291,12,'#b1a9f6');neonPanel(1050,580,267,156,'📷  PHOTO BOOTH','#6edbfa');rr(1077,617,211,88,12);ctx.fillStyle='#32204d';ctx.fill();ctx.strokeStyle='#da91f6';ctx.stroke();label('✦   SAY PARTY!   ✦',1182,663,19,'#fbb3ef');ctx.restore()}
function drawTable(x,y,w=1){ctx.save();ellipse(x,y+14,47*w,16*w,'#0000005c');ellipse(x,y,44*w,18*w,'#a664aa');ellipse(x,y-5,37*w,13*w,'#e3a0db');ellipse(x+7*w,y-7*w,6*w,6*w,'#f8a7cf');ellipse(x-11*w,y-6*w,7*w,4*w,'#f4c277');ctx.restore()}
function drawDecor(t){drawTable(320,478,.9);drawTable(1081,467,.9);drawTable(1010,764,.68);drawTable(195,487,.8);for(const [x,y,c] of [[393,301,'#e3a1fc'],[985,302,'#6bd8f6'],[410,710,'#d285f9'],[976,710,'#71e0ee']]){ctx.save();ctx.shadowColor=c;ctx.shadowBlur=18;ellipse(x,y,5,5,c);ctx.restore()}label('🍹',1230,380,27);label('🍕',350,745,19)}
function drawPerson(c,t,energy){
 if(c.y<210)return;
 const seed=c.seed||c.poseShift||0, solo=c.action==='giftDance',tier=c.giftDanceTier||1;
 const active=c.action==='dance'||solo;
 const style=(Number.isInteger(c.danceStyle)?c.danceStyle:0)%8;
 const tempo=7.2+(style%3)*.95;
 const beatTime=t*tempo+seed;
 const b=Math.sin(beatTime),q=Math.cos(beatTime),fast=Math.sin(beatTime*2);
 let sway=0,tilt=0,bodyBob=0,lf=0,rf=0,la=-17,ra=17,lY=-12,rY=-12;
 if(active){
  switch(style){
   case 0: // SHUFFLE - crossing footwork and alternating elbows
    sway=b*8;tilt=q*.075;bodyBob=Math.abs(fast)*6;lf=fast*18;rf=-fast*18;la=-23+b*9;ra=23-b*9;lY=-34+q*14;rY=-34-q*14;break;
   case 1: // DISCO - alternate raised arms and hip rolls
    sway=b*12;tilt=b*.13;bodyBob=Math.abs(q)*4;lf=b*11;rf=-b*9;la=-29;ra=31;lY=-74+q*10;rY=-17-q*14;break;
   case 2: // HIP HOP - deep bounce, arm pumps and wide feet
    sway=b*7;tilt=q*.11;bodyBob=-7+Math.abs(fast)*8;lf=b*14;rf=-b*15;la=-35+q*9;ra=33-q*9;lY=-42-b*12;rY=-42+b*12;break;
   case 3: // ROBOT - discrete angular holds
    {let st=Math.round(b*3)/3;let sq=Math.round(q*3)/3;sway=st*10;tilt=st*.08;bodyBob=st*3;lf=sq*10;rf=-sq*10;la=-23+st*12;ra=23-st*12;lY=-78+sq*22;rY=-77-sq*19;}break;
   case 4: // SALSA - fast side steps and spinning shoulders
    sway=b*15;tilt=Math.sin(beatTime*.6)*.2;bodyBob=Math.abs(fast)*3;lf=b*12;rf=q*13;la=-29+b*12;ra=31+q*13;lY=-42+q*13;rY=-44-b*13;break;
   case 5: // JUMP & CLAP - emphatic jumps and hands over head
    sway=q*5;bodyBob=Math.abs(b)*16;tilt=q*.07;lf=q*11;rf=-q*11;la=-17+b*8;ra=17-b*8;lY=-83+q*5;rY=-83+q*5;break;
   case 6: // MOONWALK - glide and backwards foot slides
    sway=(Math.sin(beatTime*.5)*13);tilt=b*.065;bodyBob=Math.abs(q)*3;lf=b*24;rf=-q*19;la=-26-q*8;ra=25+b*8;lY=-27+b*10;rY=-28-b*10;break;
   default: // K-POP WAVE - rolling arms and side-to-side poses
    sway=b*12;tilt=q*.17;bodyBob=Math.abs(q)*8;lf=b*14;rf=-q*14;la=-37+q*12;ra=38-b*12;lY=-70+b*18;rY=-71-q*18;
  }
 }else if(c.action==='wave'){sway=Math.sin(t*3+seed)*2;la=-25;ra=27+Math.sin(t*14+seed)*7;lY=-20;rY=-74+Math.sin(t*14+seed)*8;}
 else if(c.action==='cheers'){bodyBob=Math.sin(t*3+seed)*2;la=-22;ra=26;lY=-25;rY=-50+Math.sin(t*5+seed)*6;}
 else if(c.action==='eat'){bodyBob=Math.sin(t*3+seed)*2;la=-23;ra=20;lY=-30;rY=-44+Math.sin(t*7+seed)*6;}
 else {bodyBob=Math.sin(t*2.9+seed)*2.5;tilt=Math.sin(t*1.3+seed)*.035;la=-19;ra=19;}
 if(solo){const pulse=t*(tier>=4?17:12)+seed;bodyBob=Math.abs(Math.sin(pulse*.55))*(12+tier*2);sway=Math.sin(pulse*.32)*17;tilt=Math.sin(pulse*.33)*(tier>=5?.23:.13);lf=Math.sin(pulse*(tier>=4?1.5:1.12))*21;rf=-lf;la=-39+Math.sin(pulse)*17;ra=39-Math.sin(pulse)*17;lY=-66+Math.sin(pulse)*20;rY=-65-Math.sin(pulse)*20;}
 const moving=Math.hypot((c.tx||c.x)-c.x,(c.ty||c.y)-c.y)>7;
 if(moving&&!active){lf=Math.sin(t*13+seed)*8;rf=-lf;bodyBob+=Math.abs(lf)*.3}
 ctx.save();ctx.translate(c.x+sway,c.y-bodyBob);ctx.rotate(tilt);
 const z=(c.id==='you'?1.08:1)*(solo?1.5:1);ctx.scale(z,z);
 ellipse(0,7,23,7,'#06061c87');
 ctx.lineCap='round';ctx.lineJoin='round';
 line(-9,-6,-9+lf,13+Math.abs(lf)*.13,'#352345',6);
 line(9,-6,9+rf,13+Math.abs(rf)*.13,'#352345',6);
 ellipse(-9+lf,13+Math.abs(lf)*.13,7,3,'#fff0fb');ellipse(9+rf,13+Math.abs(rf)*.13,7,3,'#fff0fb');
 rr(-16,-35,32,32,9);ctx.fillStyle=c.color;ctx.fill();
 rr(-10,-30,20,10,5);ctx.fillStyle='#ffffff40';ctx.fill();
 // Two-segment arms with independent elbows, not a rigid arm animation.
 const shoulderL={x:-14,y:-28}, shoulderR={x:14,y:-28};
 const elbowL={x:(-14+la)*.52-3,y:(-28+lY)*.52-4};
 const elbowR={x:(14+ra)*.52+3,y:(-28+rY)*.52-4};
 line(shoulderL.x,shoulderL.y,elbowL.x,elbowL.y,c.skin,6);
 line(elbowL.x,elbowL.y,la,lY,c.skin,6);
 line(shoulderR.x,shoulderR.y,elbowR.x,elbowR.y,c.skin,6);
 line(elbowR.x,elbowR.y,ra,rY,c.skin,6);
 ellipse(la,lY,4.2,4.2,c.skin);ellipse(ra,rY,4.2,4.2,c.skin);
 ellipse(0,-54,23,22,c.skin);ellipse(-22,-49,4,6,c.skin);ellipse(22,-49,4,6,c.skin);
 ctx.fillStyle=c.hair;ctx.beginPath();ctx.arc(0,-58,24,Math.PI,Math.PI*1.94);ctx.lineTo(22,-54);ctx.quadraticCurveTo(10,-65,5,-70);ctx.quadraticCurveTo(-10,-58,-24,-54);ctx.closePath();ctx.fill();
 const blink=Math.sin(t*2.4+seed)> .995 ? .7 : 2.7;
 ellipse(-7,-52,2.2,blink,'#2a1f37');ellipse(8,-52,2.2,blink,'#2a1f37');
 ellipse(-15,-45,4,2,'#ef8f91aa');ellipse(14,-45,4,2,'#ef8f91aa');
 ctx.strokeStyle='#762e5f';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-46,active?5:3.5,.08,3.02);ctx.stroke();
 if(c.action==='cheers')label(c.prop||'🍹',30,-51,24);
 else if(c.action==='eat')label(c.prop||'🍕',28,-46,24);
 else if(c.action==='giftbox')label(c.prop||'🎁',0,-107+Math.sin(t*4)*5,26);
 else if(c.action==='wave')label('👋',ra+5,rY-8,20);
 else if(active){label(style%2?'✦':'♪',33,-86-Math.sin(beatTime)*7,18,c.color);if(style===5)label('★',-33,-89,15,'#ffeeb3')}
 if(!solo){ctx.save();ctx.shadowColor=c.id===selectedId?'#fc96ff':'#0000';ctx.shadowBlur=c.id===selectedId?14:0;
 rr(-40,-112,80,26,10);ctx.fillStyle='#15122de8';ctx.fill();ctx.strokeStyle=c.id===selectedId?'#ff8edc':'#ffffff44';ctx.lineWidth=c.id===selectedId?2:1;ctx.stroke();ctx.shadowBlur=0;
 ctx.beginPath();ctx.arc(-28,-99,9,0,Math.PI*2);ctx.fillStyle=c.color;ctx.fill();
 if(c.img){ctx.save();ctx.beginPath();ctx.arc(-28,-99,8.5,0,Math.PI*2);ctx.clip();ctx.drawImage(c.img,-36.5,-107.5,17,17);ctx.restore()}
 else label([...(c.name||'?')][0].toUpperCase(),-28,-99,10,'#fff');
 label(c.name.length>10?c.name.slice(0,9)+'…':c.name,4,-99,10,'#fff');ctx.restore();}
 ctx.restore();
}
function drawTalkBubble(c,x,y,t,opacity=1){
 if(!c?.bubble||!c.bubbleUntil||performance.now()>c.bubbleUntil)return;
 const msg=String(c.bubble).slice(0,51), lines=[];
 let cur='';for(const word of msg.split(' ')){if((cur+' '+word).trim().length>19&&cur){lines.push(cur);cur=word}else cur=(cur+' '+word).trim()}
 if(cur)lines.push(cur);if(lines.length>2){lines.length=2;lines[1]=lines[1].slice(0,17)+'…'}
 const size=14,w=Math.min(184,Math.max(108,Math.max(...lines.map(v=>v.length))*7.2+23)),h=lines.length*20+14;
 const px=clamp(x-w/2,8,450-w-8),py=y-155-h;
 ctx.save();ctx.globalAlpha*=opacity;ctx.shadowColor='#ff69dc';ctx.shadowBlur=9;
 rr(px,py,w,h,10);ctx.fillStyle='#14162eea';ctx.fill();ctx.strokeStyle='#d99aff';ctx.lineWidth=1.3;ctx.stroke();ctx.shadowBlur=0;
 ctx.font='600 '+size+'px "Be Vietnam Pro",Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff5fd';
 lines.forEach((l,i)=>ctx.fillText(l,px+w/2,py+16+i*20,w-14));
 ctx.beginPath();ctx.moveTo(clamp(x,px+12,px+w-12)-6,py+h);ctx.lineTo(clamp(x,px+12,px+w-12)+6,py+h);ctx.lineTo(clamp(x,px+12,px+w-12),py+h+9);ctx.closePath();ctx.fillStyle='#14162eea';ctx.fill();
 ctx.restore();
}
// Procedural two-character choreography: 8-beat sequences, independent dance styles,
// articulated elbows/knees/feet, spotlights, and high-energy solo/drop moments.
function drawResidentDancers(time,energy){
  const musicT=isPlaying&&Number.isFinite(audio.currentTime)?audio.currentTime:time;
  const focusActive=performance.now()<proShowUntil;
  const pulse=.55+.45*Math.sin(musicT*8.5);
  for(const d of residentDancers){
    ctx.save();
    const focused=focusActive&&(proShowFocus==='duo'||proShowFocus===d.id);
    const floorR=focused?92:73;
    const halo=ctx.createRadialGradient(d.x,d.y,8,d.x,d.y,floorR);
    halo.addColorStop(0,d.color+(focused?'77':'49'));halo.addColorStop(1,d.color+'00');
    ellipse(d.x,d.y,floorR,floorR*.53,halo);
    // A dedicated spotlight cone descends from the DJ stage to each dancer.
    if(quality!=='low'){
      const a=focused?.24:.11+energy*.11;
      ctx.globalAlpha=a;ctx.beginPath();ctx.moveTo(d.style==='shuffle'?555:805,144);
      ctx.lineTo(d.x-52,d.y+7);ctx.quadraticCurveTo(d.x,d.y+30,d.x+52,d.y+7);
      ctx.closePath();ctx.fillStyle=d.color;ctx.fill();ctx.globalAlpha=1;
    }
    ctx.strokeStyle=d.color;ctx.lineWidth=3;ctx.globalAlpha=.52+.26*pulse;
    ctx.beginPath();ctx.ellipse(d.x,d.y+2,35+(focused?13:0)+pulse*4,11+pulse*3,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    ctx.restore();
    drawProDancer(d,musicT,energy,focused);
  }
  if(focusActive){
    ctx.save();ctx.globalAlpha=.8;label('✦ LIVE EDM DANCE SHOW ✦',678,317,16,'#fbe0ff');ctx.restore();
  }
}
function drawProDancer(d,t,energy,spotlightOn){
  // 128-ish BPM base cadence while the audio analyzer drives movement intensity.
  const phase=t*2*Math.PI*128/60+d.seed;
  const beatPulse=Math.pow(Math.max(0,Math.sin(phase)),2);
  const intensity=1+Math.min(.6,energy*.7)+(spotlightOn?.25:0);
  const sequence=Math.floor(t/2.6)%4;
  const isLuna=d.style==='shuffle';
  const sx=isLuna?Math.sin(phase*.5)*17:Math.sin(phase*.55)*14;
  const hop=isLuna?Math.abs(Math.sin(phase))*(7+energy*8):Math.abs(Math.sin(phase*.5))*(5+energy*7);
  const spinMode=!isLuna&&sequence===3;
  const crouch=spinMode?17:!isLuna&&sequence===1?10:0;
  const lean=isLuna?Math.sin(phase*.5)*.17:spinMode?Math.sin(phase)*.35:Math.sin(phase*.6)*.22;
  const liftX=isLuna?Math.sin(phase)*14:Math.sin(phase*1.25)*18;
  const liftY=isLuna?Math.cos(phase*1.05)*8:Math.cos(phase*1.6)*11;
  const x=d.x+sx,y=d.y-hop+crouch;
  ctx.save();ctx.translate(x,y);ctx.scale(1.19,1.19);
  // On the windmill move, KAI rolls across the floor rather than simply bobbing.
  if(spinMode){ctx.translate(0,-24);ctx.rotate(Math.sin(phase*.65)*1.1);ctx.translate(0,24)}
  ctx.rotate(lean);
  ctx.shadowColor=d.color;ctx.shadowBlur=spotlightOn?17:9;
  const stroke=(xa,ya,xb,yb,xc,yc,width,color)=>{
    ctx.beginPath();ctx.lineCap='round';ctx.lineJoin='round';ctx.moveTo(xa,ya);
    ctx.lineTo(xb,yb);ctx.lineTo(xc,yc);ctx.strokeStyle='#1d1830';ctx.lineWidth=width+4;ctx.stroke();
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  };
  // Each dance style has its own footwork and arm choreography.
  let lKnee,lFoot,rKnee,rFoot,lElbow,lHand,rElbow,rHand;
  if(isLuna){
    const side=Math.sin(phase),heel=Math.cos(phase);
    lKnee=[-13+side*7,-12+Math.max(0,side)*5];lFoot=[-18+side*14,8-heel*3];
    rKnee=[12-side*7,-11+Math.max(0,-side)*5];rFoot=[19-side*14,8+heel*3];
    lElbow=[-30,-34+Math.sin(phase+.6)*8];lHand=[-40+Math.cos(phase)*12,-59-Math.sin(phase)*18];
    rElbow=[30,-32-Math.cos(phase+.7)*8];rHand=[42-Math.cos(phase)*13,-67+Math.cos(phase)*16];
    if(sequence===2){lHand=[-8+Math.sin(phase)*9,-91];rHand=[14-Math.sin(phase)*9,-87]}
  }else{
    lKnee=[-11+liftX*.85,-8-liftY*.55];lFoot=[-22+liftX,8-liftY];
    rKnee=[13-liftX*.7,-11+liftY*.5];rFoot=[20-liftX*.8,8+liftY];
    lElbow=[-32,-35-Math.sin(phase)*17];lHand=[-48+Math.sin(phase)*16,-61-Math.cos(phase)*19];
    rElbow=[30,-36+Math.sin(phase)*17];rHand=[49-Math.sin(phase)*15,-61+Math.cos(phase)*20];
    if(spinMode){lHand=[-52,-5];rHand=[52,-5];lFoot=[-28+liftX*.8,5-liftY];rFoot=[30-liftX*.5,3+liftY]}
    if(sequence===2){lElbow=[-25,-58];lHand=[-16,-84];rElbow=[27,-56];rHand=[18,-85]}
  }
  stroke(-10,-21,lKnee[0],lKnee[1],lFoot[0],lFoot[1],8,'#3d285a');
  stroke(10,-21,rKnee[0],rKnee[1],rFoot[0],rFoot[1],8,'#362d61');
  ctx.shadowBlur=3;
  ellipse(lFoot[0],lFoot[1]+1,10,4,d.color);
  ellipse(rFoot[0],rFoot[1]+1,10,4,d.color);
  ctx.shadowBlur=spotlightOn?17:9;
  // Sporty costume with bright trim and a strong silhouette.
  rr(-19,-55,38,37,11);ctx.fillStyle=isLuna?'#7e2b80':'#1c5170';ctx.fill();
  rr(-14,-52,28,21,7);ctx.fillStyle=d.color;ctx.fill();
  rr(-7,-51,14,27,5);ctx.fillStyle='#ffffff38';ctx.fill();
  line(-17,-35,17,-35,'#ede7ff',2);
  stroke(-18,-48,lElbow[0],lElbow[1],lHand[0],lHand[1],7,d.skin);
  stroke(18,-48,rElbow[0],rElbow[1],rHand[0],rHand[1],7,d.skin);
  ellipse(lHand[0],lHand[1],4,4,d.skin);ellipse(rHand[0],rHand[1],4,4,d.skin);
  // Head, hair, neon headphone accents, expression.
  ellipse(0,-73,24,23,d.skin);
  if(isLuna){
    ellipse(-19,-74,15,23,'#9b43a5');
    ellipse(18,-78,13,26,'#b65dc0');
    ellipse(0,-91,25,12,d.hair);
    ellipse(25+Math.sin(phase)*6,-84,9,12,d.hair);
    ellipse(-12,-83,12,10,'#dc7de5');
  }else{
    ellipse(0,-91,25,14,'#294d92');
    for(let i=0;i<5;i++)ellipse(-16+i*8,-96-Math.abs(Math.sin(i*2))*7,8,9,d.hair);
    ellipse(-23,-78,7,10,'#3da6e0');ellipse(23,-78,7,10,'#3da6e0');
  }
  ellipse(-8,-72,2.5,3,'#2a1932');ellipse(8,-72,2.5,3,'#2a1932');
  ellipse(-15,-65,5,2,'#f27cb06d');ellipse(15,-65,5,2,'#f27cb06d');
  ctx.strokeStyle='#7f365f';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,-67,4,0,Math.PI);ctx.stroke();
  // Floating music notes visibly respond to the rhythm of the uploaded mix.
  ctx.shadowBlur=7;ctx.globalAlpha=.6+.4*beatPulse;
  label(isLuna?'♫':'✦',28+Math.sin(phase)*5,-102-8*beatPulse,20,d.color);
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  // Permanent nameplate, independent of the audience leaderboard.
  rr(-48,-132,96,28,10);ctx.fillStyle='#090c2be8';ctx.fill();ctx.strokeStyle=d.color;ctx.lineWidth=2;ctx.stroke();
  label('★ '+d.name+' ★',0,-121,12,'#fff');
  label(d.subtitle,0,-140,9,d.color);
  if(spotlightOn){
    ctx.globalAlpha=.75;label('★ SOLO SHOW ★',0,-157,10,'#ffe19c');ctx.globalAlpha=1;
  }
  ctx.restore();
}
function drawEffects(dt,t){for(let i=effects.length-1;i>=0;i--){const p=effects[i];p.life-=dt;if(p.life<=0){effects.splice(i,1);continue}let a=Math.min(1,p.life/(p.max*.6));ctx.save();ctx.globalAlpha=a;if(p.kind==='ring'){ctx.strokeStyle=p.col;ctx.lineWidth=4;ctx.shadowColor=p.col;ctx.shadowBlur=16;ctx.beginPath();ctx.ellipse(p.x,p.y,(1-p.life/p.max)*p.size+20,((1-p.life/p.max)*p.size+20)*.42,0,0,Math.PI*2);ctx.stroke()}else if(p.kind==='text'){p.y+=p.vy*dt;ctx.shadowBlur=10;ctx.shadowColor=p.col;label(p.text,p.x,p.y,16,p.col)}else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=100*dt;ctx.translate(p.x,p.y);ctx.rotate(t*3+p.spin);ctx.fillStyle=p.col;ctx.shadowBlur=9;ctx.shadowColor=p.col;rect(-p.size/2,-p.size/2,p.size,p.size,ctx.fillStyle)}ctx.restore()}}
function beat(){if(analyser&&freqData&&isPlaying){analyser.getByteFrequencyData(freqData);let s=0;for(let i=0;i<Math.min(25,freqData.length);i++)s+=freqData[i];return s/(25*255)}return .26+.12*Math.sin(clock*2.8)}
function resize(){const b=canvas.getBoundingClientRect();cw=Math.max(200,b.width);ch=Math.max(240,b.height);dpr=Math.min(window.devicePixelRatio||1,cw<700?1.55:2);canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr)}
function coords(screenX,screenY){return{x:(screenX-viewX)/scale,y:(screenY-viewY)/scale}}
function update(dt,t){
 if(pendingCheers&&!giftShot&&!beerPopEvent&&!giftShotQueue.length){pendingCheers=false;startRoomCheers('Sau màn tặng quà',true)}
 if(!demoLocked&&t>=nextNpcChat){npcConversation();nextNpcChat=t+rand(7800,11600)}
 if(!demoLocked){
 for(const c of chars){
   if(c.id.startsWith('npc')&&c.action==='dance'&&t>=(c.danceChangedAt||0)){
     c.danceStyle=(c.danceStyle+1+Math.floor(rand(0,7)))%8;
     c.danceChangedAt=t+rand(5000,9300);
   }
 }
 updateWaiters(dt,t);updateBeerPop(t);if(t>nextBeerPop&&!beerPopEvent&&!giftShot&&!cheersEvent)startBeerPop(chars.find(c=>c.id.startsWith('npc')),true);if(t>nextAmbientService && !giftShot){nextAmbientService=t+rand(17000,30000);const npc=chars.filter(c=>c.id.startsWith('npc')&&!c.zone);if(npc.length){const guest=npc[Math.floor(rand(0,npc.length))];serve(guest,Math.random()<.5?'🍕':'🍹','Món tặng từ quầy')}}if(t>nextRoomCheers&&!cheersEvent&&!giftShot)startRoomCheers('Sự kiện ngẫu nhiên');updateRoomCheers(t);for(const c of chars){if(c===giftShot?.character)continue;if(!c.seed)c.seed=Math.random()*10;const dx=c.tx-c.x,dy=c.ty-c.y,dist=Math.hypot(dx,dy);if(dist>4){let sp=Math.min(dist,(c.action==='dance'?95:68)*dt);c.x+=dx/dist*sp;c.y+=dy/dist*sp}else if(Math.random()<dt*.25){if(c.action==='idle'||c.action==='dance'){if(Math.random()<.75)goTo(c,c.zone?(Math.random()<.76?c.zone:'dance'):(Math.random()<.5?'dance':Math.random()<.6?'bar':'food'))}}if(c.until&&t>c.until){c.action=c.id.startsWith('npc')?'dance':'idle';c.until=0;c.prop='';if(c.action==='dance')c.danceChangedAt=t+rand(4500,8000)}}}if(activePartyUntil&&t>activePartyUntil&&!cheersEvent){activePartyUntil=0;$('partyStatus').innerHTML='<span class="pulse-spot">✦</span><span>ĐÊM HỘI NEON <b>PARTY TIME</b></span>'}}
function drawGiftHeroScene(c,t){
 if(!c)return;
 ctx.save();
 // A luminous camera spotlight is tracked to the exact gifting viewer.
 const g=ctx.createRadialGradient(c.x,c.y-53,5,c.x,c.y-53,178);
 g.addColorStop(0,'#fff3b649');g.addColorStop(.35,'#ff6ad335');g.addColorStop(1,'#fa3bab00');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y-53,178,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#ffe999';ctx.lineWidth=5;ctx.shadowColor='#ffecb1';ctx.shadowBlur=23;
 ctx.beginPath();ctx.ellipse(c.x,c.y-22,48+Math.sin(t*9)*3,57,0,0,Math.PI*2);ctx.stroke();
 ctx.shadowBlur=0;ctx.fillStyle='#f8cd55';ctx.beginPath();ctx.moveTo(c.x,c.y-142);ctx.lineTo(c.x-11,c.y-164);ctx.lineTo(c.x+11,c.y-164);ctx.closePath();ctx.fill();
 // Identity and gift dance are displayed in the responsive HTML card above the stage.
 ctx.restore();
}

// v2.0: A real portrait-composed EDM stage, not a horizontal map cropped to 9:16.
// The original world, characters, actions, camera presets and LIVE event path remain intact.
const portraitTapTargets=[];
let portraitScreen=false,portraitRatio=1,portraitHeight=800;
function portraitEnabled(){return cw>0&&ch/cw>=1.30&&(Boolean(giftShot)||portraitModes.has(currentCameraScene()));}
// Portrait banquet alcoves: six animated seated NPCs around two occupied tables.
// They drink decorative mocktails and dine; no physical alcohol or purchase mechanic.
function drawSeatedDiner(c,x,y,t,raised,scale=.70){
 if(!c)return;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const sway=Math.sin(t*2.1+(c.seed||1))*2.7;
 ellipse(0,13,23,8,'#060817a1');
 rr(-19,-41,38,42,12);ctx.fillStyle='#604684';ctx.fill();
 // Seated legs and shoes around chair.
 line(-10,-4,-16,12,'#3b2966',6);line(11,-4,17,12,'#35275c',6);
 // Shirt, arms, face and hair.
 rr(-17,-43,34,31,9);ctx.fillStyle=c.color||'#e58fd1';ctx.fill();
 const v=raised?-34:-19;
 line(-14,-33,-25+sway,v,'#e5b49b',6);line(14,-33,25-sway,v+3,'#e5b49b',6);
 drawAmberMug(27-sway,v-7,1.12,raised);
 ellipse(sway,-62,20,20,c.skin||'#efc4ad');
 ctx.beginPath();ctx.arc(sway,-66,20,Math.PI*1.08,Math.PI*1.95);ctx.lineTo(sway+19,-76);ctx.fillStyle=c.hair||'#483153';ctx.fill();
 ellipse(sway-7,-61,1.6,1.9,'#25183a');ellipse(sway+7,-61,1.6,1.9,'#25183a');
 ctx.strokeStyle='#743751';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(sway,-56,5,0,Math.PI);ctx.stroke();
 ctx.restore();
}
function drawPartyBanquet(t,ph){
 const guests=chars.filter(c=>c.id.startsWith('npc')&&!c.zone).slice(12,18);
 // LIVE viewers who type !sit take over visible seats, without duplicating their avatar on the floor.
 for(const v of chars.filter(c=>c.seatedUntil>performance.now())){guests[v.seatedSeat%6]=v;}
 const toast=!!cheersEvent;
 const layouts=[{x:77,y:ph*.835,side:-1},{x:373,y:ph*.835,side:1}];
 for(let table=0;table<2;table++){
  const {x,y,side}=layouts[table];ctx.save();
  // Illuminated rounded booth and three physically seated people per table.
  const halo=ctx.createRadialGradient(x,y-30,1,x,y-30,100);
  halo.addColorStop(0,table?'#45dbfb2c':'#f769d72d');halo.addColorStop(1,'#00000000');
  ellipse(x,y-24,110,110,halo);
  rr(x-53,y-49,106,72,18);ctx.fillStyle='#211639';ctx.fill();ctx.strokeStyle=table?'#5edffb':'#d177ff';ctx.lineWidth=2;ctx.stroke();
  const shifts=[[-37,-17],[6,-37],[38,-14]];
  shifts.forEach(([dx,dy],j)=>{
   const guest=guests[table*3+j];if(!guest)return;
   drawSeatedDiner(guest,x+dx,y+dy,t,toast||guest.action==='cheers',.76);
   if(guest.seatedUntil>performance.now())label(String(guest.name).slice(0,11),x+dx,y+dy-70,9,'#fff2cf');
  });
  // Front table appears IN FRONT of legs; bowls and glasses sit on it.
  ellipse(x,y+16,56,20,'#080c21b0');
  ellipse(x,y+7,61,22,table?'#4882a8':'#934f97');
  ellipse(x,y+3,57,18,table?'#9aa3d2':'#cf8fc9');
  ellipse(x,y-3,24,8,'#f1d8b0');
  label(table?'🍣':'🍕',x-6,y+2,24);
  label('🍹',x-38,y-6,19);label('🥤',x+33,y-5,18);
  // Characteristic Vietnamese party-table props: grilled food, ice bucket and unlabeled drinks.
  ellipse(x+side*34,y-4,15,7,'#d0e2ff');
  label('🧊',x+side*34,y-8,14);label(table?'🦐':'🍢',x+15,y+5,20);
  drawBottle(x-side*33,y-5,.54,Math.sin(t*1.2+table)*.03);
  drawAmberMug(x-18,y-12,.53,!!cheersEvent);
  drawAmberMug(x+20,y-12,.53,!!cheersEvent);
  ctx.save();ctx.shadowBlur=9;ctx.shadowColor=table?'#66eaff':'#ff9bca';
  label(table?'BÀN HỘI BẠN 02':'BÀN HỘI BẠN 01',x,y+39,10,'#ffecff');ctx.restore();
  if(toast){
    const lift=Math.max(0,Math.sin(t*5));label('🥂',x,y-112-lift*7,27,'#fff3b8');
    if(Math.sin(t*5+table)>.7)label('ZÔ! ✨',x,y-146,17,'#ffeb9c');
  }else if(Math.sin(t*.64+table*2)> .88){
    label(['Vui quá!','Cụng ly nào!'][table],x,y-125,12,'#e9dfff');
  }
  ctx.restore();
 }
}
function drawPartyFireworks(t,ph){
 if(!cheersEvent)return;
 const elapsed=(performance.now()-cheersEvent.start)/1000;
 if(elapsed<2.45||elapsed>6)return;
 const explosions=[[82,ph*.29,0],[365,ph*.34,.30],[218,ph*.46,.70],[120,ph*.51,1.25],[346,ph*.49,1.75]];
 for(let i=0;i<explosions.length;i++){
  const [cx,cy,start]=explosions[i],age=elapsed-2.45-start;
  if(age<=0||age>1.6)continue;
  const progress=age/1.6,rad=14+100*progress;
  ctx.save();ctx.globalAlpha=Math.pow(1-progress,1.15);
  for(let k=0;k<18;k++){
   const a=(k/18)*Math.PI*2+(i*.31),sx=cx+Math.cos(a)*rad*.24,sy=cy+Math.sin(a)*rad*.24;
   const ex=cx+Math.cos(a)*rad,ey=cy+Math.sin(a)*rad;
   ctx.strokeStyle=(i+k)%3===0?'#ffdc78':(i+k)%3===1?'#fa77df':'#79f2ff';
   ctx.lineWidth=2.6-progress*1.8;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=9;
   ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();
   ellipse(ex,ey,2.8*(1-progress)+.4,2.8*(1-progress)+.4,ctx.strokeStyle);
  }ctx.restore();
 }
}
function portraitStage(t,energy,dt){
  const pw=450,ph=450*ch/cw;portraitRatio=cw/pw;portraitHeight=ph;portraitScreen=true;
  portraitTapTargets.length=0;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.save();ctx.scale(portraitRatio,portraitRatio);
  // Portrait-native camera: composition stays 9:16, with real dolly/zoom/pan on the stage.
  const scene=currentCameraScene();
  let zoom=1,focusX=225,focusY=ph/2;
  if(scene==='mermaid'||scene==='dj'){zoom=1.47;focusY=ph*.355;focusX=225+12*Math.sin(t*.65)}
  else if(scene==='dance'||scene==='frontrow'){zoom=scene==='frontrow'?1.28:1.18;focusY=ph*.67;focusX=225+13*Math.sin(t*.55)}
  else if(scene==='orbit'){zoom=1.12+.11*Math.sin(t*.74);focusY=ph*.52;focusX=225+53*Math.sin(t*.55)}
  else if(scene==='pulse'){zoom=1.06+.28*(.5+.5*Math.sin(t*2.2+energy));focusY=ph*.49}
  else if(scene==='sideleft'||scene==='sideright'){zoom=1.21;focusX=scene==='sideleft'?174:276;focusY=ph*.57}
  else if(scene==='follow'){zoom=1.16;focusY=ph*.67}
  else {zoom=1.008+.022*Math.sin(t*.52);focusY=ph*.50}
  // Cameraperson cuts in on the party table during the opening-and-pouring show.
  if(beerPopEvent&&!giftShot){zoom=1.20;focusX=beerPopEvent.table===0?170:280;focusY=ph*.765}
  if(giftShot){zoom=1.07;focusX=225;focusY=ph*.57}
  zoom=clamp(zoom*portraitManualZoom,.74,2.35);
  const move=.12;
  portraitCameraView.x+=(focusX-portraitCameraView.x)*move;
  portraitCameraView.y+=(focusY-portraitCameraView.y)*move;
  portraitCameraView.zoom+=(zoom-portraitCameraView.zoom)*move;
  ctx.translate(pw/2,ph/2);ctx.scale(portraitCameraView.zoom,portraitCameraView.zoom);
  ctx.translate(-portraitCameraView.x,-portraitCameraView.y);
  const fade=ctx.createLinearGradient(0,0,0,ph);
  fade.addColorStop(0,'#080b24');fade.addColorStop(.32,'#211037');fade.addColorStop(.69,'#181231');fade.addColorStop(1,'#09091c');rect(0,0,pw,ph,fade);
  // Vertical neon architectural lines, uninterrupted from ceiling to the live dance floor.
  for(let i=0;i<12;i++){
   const x=i*46-28;
   ctx.globalAlpha=.12+.13*Math.sin(t*1.7+i);
   line(x,0,x+17,ph,i%3?'#c373ff':'#5be8fa',i%3?3:4);
  }
  ctx.globalAlpha=1;
  const glow=ctx.createRadialGradient(225,ph*.24,14,225,ph*.43,ph*.67);
  glow.addColorStop(0,'#ed47ca4d');glow.addColorStop(.45,'#643ddd23');glow.addColorStop(1,'#08071300');rect(0,0,pw,ph,glow);
  // Concert truss above the towering LED wall.
  rect(0,ph*.035,pw,11,'#342a59');line(0,ph*.035+11,450,ph*.035+11,'#a577f8',2);
  for(let i=0;i<9;i++){const x=15+i*53;
   rect(x,ph*.035-7,25,12,'#302743');ellipse(x+12,ph*.035+2,6,4,i%2?'#5de7fb':'#ff8dde');
  }
  // Vertical LED wall has actual portrait proportions and fills the upper third.
  const wallY=ph*.080,wallH=ph*.285;
  const led=ctx.createLinearGradient(0,wallY,0,wallY+wallH);
  led.addColorStop(0,'#352359');led.addColorStop(.43,'#1f1742');led.addColorStop(1,'#352357');
  ctx.shadowColor='#cf62fc';ctx.shadowBlur=26;rr(22,wallY,406,wallH,18);ctx.fillStyle=led;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#9d6ff8';ctx.stroke();ctx.shadowBlur=0;
  ctx.save();rr(29,wallY+8,392,wallH-16,13);ctx.clip();
  for(let i=0;i<24;i++){
    let x=32+i*16.6,v=Math.abs(Math.sin(t*(2.2+energy*2)+i*.71));
    rect(x,wallY+wallH-28-v*wallH*.34,9,10+v*wallH*.34,i%3===0?'#ff67da':i%3===1?'#6ce5ff':'#9c80ff');
  }
  const waveY=wallY+wallH*.5;for(let i=0;i<14;i++){
    ctx.globalAlpha=.2;line(-12,wallY+i*22,470,wallY+i*22,'#f2c7ff',1)
  }ctx.globalAlpha=1;
  ctx.restore();
  ctx.save();ctx.shadowBlur=22;ctx.shadowColor='#ef6cee';
  label('✦  NEON PARTY  ✦',225,wallY+wallH*.22,30,'#ffe0fa');
  ctx.shadowColor='#4fecff';label('EDM  •  LIVE',225,wallY+wallH*.42,23,'#86f4ff');ctx.restore();
  label('DJ  /  LUNA  /  KAI',225,wallY+wallH*.56,12,'#e9c4ff');
  // Suspended lighting cones sweep the *vertical* stage, not horizontally across it.
  if(quality!=='low'){
   for(let i=0;i<5;i++){
    const anchor=38+i*93,shift=34*Math.sin(t*.55+i*1.2);
    ctx.save();ctx.globalAlpha=.08+energy*.12;ctx.beginPath();ctx.moveTo(anchor,wallY+18);ctx.lineTo(anchor-76+shift,ph*.84);ctx.lineTo(anchor+72+shift,ph*.84);ctx.closePath();ctx.fillStyle=i%2?'#41dcff':'#f36ae7';ctx.fill();ctx.restore();
   }
  }
  // DJ console: real separate set piece under the LED wall, centered for phone portrait.
  const boothY=ph*.322;
  ctx.save();ctx.shadowColor='#ed71f4';ctx.shadowBlur=22;rr(45,boothY,360,75,15);ctx.fillStyle='#21163d';ctx.fill();ctx.strokeStyle='#b965fa';ctx.lineWidth=3;ctx.stroke();ctx.shadowBlur=0;
  const disk=(x)=>{ellipse(x,boothY+41,32,22,'#111324');ellipse(x,boothY+41,23,16,'#8756d1');ellipse(x,boothY+41,15,10,'#1d1534');ellipse(x,boothY+41,4,4,'#b9f5ff')};disk(122);disk(328);
  for(let i=0;i<10;i++)rect(197+i*6,boothY+22,3,10+12*Math.abs(Math.sin(t*3+i*.9)),i%2?'#63eaff':'#ff80d6');
  label('TIÊN CÁ DJ',225,boothY+57,13,'#bffffb');ctx.restore();
  // A dancing MERMAID DJ with flowing hair, glowing fins and arm choreography.
  ctx.save();ctx.translate(225,boothY-13);ctx.scale(1.42,1.42);
  drawMermaidDancer(t,energy);ctx.restore();
  // Two tall PA speaker towers frame the stage without occupying the center.
  for(const x of [5,403]){
   const sy=ph*.30;rr(x,sy,42,ph*.30,9);ctx.fillStyle='#141326';ctx.fill();ctx.strokeStyle='#7655b9';ctx.lineWidth=2;ctx.stroke();
   for(let j=0;j<3;j++){
     const yy=sy+35+j*ph*.077;
     ellipse(x+21,yy,15,15,'#302850');ellipse(x+21,yy,10+energy*4,10+energy*4,'#080b1c');
     ctx.strokeStyle=j===1?'#65ecff':'#ff7bdc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+21,yy,12.5,0,Math.PI*2);ctx.stroke();
   }
  }
  // Actual vertically arranged, perspective LED dancefloor.
  const floorTop=ph*.444,floorBottom=ph*1.03;
  const fl=ctx.createLinearGradient(0,floorTop,0,floorBottom);
  fl.addColorStop(0,'#221344');fl.addColorStop(.52,'#30235d');fl.addColorStop(1,'#130d2f');rect(0,floorTop,450,ph-floorTop,fl);
  ctx.save();ctx.beginPath();ctx.moveTo(56,floorTop);ctx.lineTo(394,floorTop);ctx.lineTo(490,floorBottom);ctx.lineTo(-40,floorBottom);ctx.closePath();ctx.clip();
  for(let i=0;i<12;i++){
   const f=i/12,x=225+(f-.5)*660;
   line(225,floorTop,x,floorBottom,i%2?'#bd76ff47':'#6adcf951',1.5);
  }
  for(let i=0;i<12;i++){
    const f=i/12,y=floorTop+(ph-floorTop)*Math.pow(f,1.6);
    line(0,y,450,y,i%2?'#ff83e84a':'#76dfff44',1+i*.055);
  }
  for(let i=0;i<10;i++)for(let j=0;j<7;j++){
   const x=22+i*45,y=ph*.49+j*ph*.077;
   ctx.globalAlpha=.055+.07*(.5+.5*Math.sin(t*3+i+j));rect(x,y,29,ph*.032,(i+j)%2?'#ee54d8':'#56ceff');
  }
  ctx.globalAlpha=1;ctx.restore();
  ctx.save();ctx.shadowColor='#e85bff';ctx.shadowBlur=12;line(13,floorTop,0,ph,'#ff67e1',3);line(437,floorTop,450,ph,'#6ddfff',3);ctx.restore();
  // Floor reflections and stage-correct ambient lights.
  for(const [x,col] of [[75,'#fa60d8'],[220,'#8b65ff'],[375,'#50dff5']]){
    const g=ctx.createRadialGradient(x,ph*.72,2,x,ph*.72,105);
    g.addColorStop(0,col+'38');g.addColorStop(1,col+'00');rect(x-105,ph*.59,210,ph*.31,g);
  }
  // Low-profile party tables: mocktails, virtual mugs and snacks at both edges.
  // These provide hospitality atmosphere without obscuring the dance floor or gifted hero.
  for(const [tx,ty,side] of [[24,ph*.82,-1],[426,ph*.82,1]]){
    ctx.save();ctx.translate(tx,ty);ctx.globalAlpha=giftShot?.35:.92;
    ellipse(0,18,35,12,'#070a1ab0');line(-24,0,-30,43,'#56377e',6);line(24,0,30,43,'#56377e',6);
    ellipse(0,0,49,16,'#c279ad');ellipse(0,-6,47,14,'#9b70cd');
    label('🍹',side<0?-20:17,-23,21);label('🍻',side<0?17:-20,-23,21);label('🍕',0,-10,17);
    ctx.restore();
  }
  // Golden party signage is diegetic scene decoration, not a blocking website HUD.
  ctx.save();ctx.globalAlpha=.86;ctx.shadowColor='#ffce75';ctx.shadowBlur=11;
  if(!beerPopEvent)label('🍻 HỘI BẠN ZÔ VUI 🍻',225,ph*.78,13,'#ffe4ad');ctx.restore();
  drawPartyBanquet(t,ph);
  const persons=chars.filter(c=>!(c.seatedUntil>performance.now())&&(c.id==='you'||c.id===selectedId||c.until>performance.now()||c.action==='dance'||c.id.startsWith('npc'))).slice();
  // Active users (including gift receivers) are prioritized in limited phone screen slots.
  persons.sort((a,b)=>Number(b.id===selectedId)-Number(a.id===selectedId)||Number((b.until||0)>performance.now())-Number((a.until||0)>performance.now()));
  const selected=persons.slice(0,9);
  const positions=[
    [112,.56,.70],[338,.56,.70],
    [175,.83,.83],[278,.83,.83],
    [225,.95,.77],[22,.68,.66],[428,.68,.66],
    [164,.97,.66],[290,.97,.66]
  ];
  const stageActors=selected.map((c,i)=>{
    const seed=Number.isFinite(c.seed)?c.seed:i*1.73;
    const dancing=c.action==='dance'||c.action==='giftDance';
    // Real individual stage choreography, rather than static anchored avatars.
    const motion=dancing?11:3;
    return {c,x:positions[i][0]+Math.sin(t*(dancing?.82:.34)+seed)*motion,
      y:ph*positions[i][1]+Math.cos(t*(dancing?.69:.28)+seed)*motion*.52,size:positions[i][2]};
  });
  for(const o of stageActors){if(giftShot && o.c===giftShot.character)continue;
    portraitTapTargets.push({x:o.x*portraitRatio,y:o.y*portraitRatio-42*o.size*portraitRatio,r:45*o.size*portraitRatio,c:o.c});
    ctx.save();ctx.translate(o.x,o.y);ctx.scale(o.size,o.size);ctx.translate(-o.x,-o.y);
    if(giftShot)ctx.globalAlpha=.22;
    drawPerson({...o.c,x:o.x,y:o.y,tx:o.x,ty:o.y},t,energy);ctx.restore();
  }
  // Three visible employees walk between the virtual bar and customer tables in 9:16.
  for(const [i,w] of waiters.entries()){
    const baseX=[62,389,48][i],y=ph*(i===2?.92:.78),job=w.job;
    let x=baseX,wy=y;
    if(job && (w.state==='going'||w.state==='delivering')){
      const actor=stageActors.find(o=>o.c===job.customer);
      const destination=actor?{x:actor.x+(w.side<0?-30:30),y:actor.y-3}:{x:225+(i-1)*45,y:ph*.82};
      const f=w.state==='delivering'?1:clamp(w.progress,0,1);
      x=baseX+(destination.x-baseX)*f;wy=y+(destination.y-y)*f;
    }
    drawWaiterSprite(w,x,wy,t,.84);
  }
  if(cheersEvent){
    const elapsed=performance.now()-cheersEvent.start;
    if(elapsed>2100 && elapsed<5600){
      for(let k=0;k<(quality==='low'?7:18);k++){
        const x=(k*97+t*19*(k%2+1))%450,y=(k*139+t*31*(k%3+1))%(ph*.83)+ph*.12;
        ctx.globalAlpha=.30+.23*Math.sin(t*3+k);label(k%3?'✦':'🎆',x,y,12+k%3*4,k%2?'#ffdb89':'#8bf4ff');
      }ctx.globalAlpha=1;
    }
    label('🥂  CẢ PHÒNG CÙNG NÂNG LY  🥂',225,ph*.51,19,'#ffe6a9');
  }
  drawPartyFireworks(t,ph);
  // LUNA and KAI are the visually dominant two resident dancers on the vertical floor.
  for(const [i,d] of residentDancers.entries()){
    const dx=i===0?135:315,dy=ph*.70;
    portraitTapTargets.push({x:dx*portraitRatio,y:(dy-47)*portraitRatio,r:51*portraitRatio,pro:d});
    ctx.save();if(giftShot)ctx.globalAlpha=.20;
    let lamp=ctx.createRadialGradient(dx,dy-20,1,dx,dy-20,84);
    lamp.addColorStop(0,d.color+'69');lamp.addColorStop(1,d.color+'00');ellipse(dx,dy-13,80,97,lamp);
    ctx.save();ctx.translate(dx,dy);ctx.scale(1.36,1.36);ctx.translate(-dx,-dy);
    drawProDancer({...d,x:dx,y:dy},isPlaying?audio.currentTime:t,energy,performance.now()<proShowUntil);ctx.restore();
    ctx.restore();
  }
  drawBeerPopScene(t,ph);
  // Only a couple of chat bubbles on portrait phone view at once, to keep the DJ visible.
  if(!giftShot){
    const talkers=stageActors.filter(o=>o.c.bubbleUntil>performance.now()).slice(0,2);
    for(const o of talkers)drawTalkBubble(o.c,o.x,o.y,t);
  }
  if(giftShot){
    const c=giftShot.character,progress=Math.max(0,Math.min(1,(performance.now()-giftShot.started)/heroDuration));
    const cx=225+20*Math.sin(progress*4.6),cy=ph*.76;
    const g=ctx.createRadialGradient(cx,cy-82,5,cx,cy-82,152);g.addColorStop(0,'#fff4bf8f');g.addColorStop(.45,'#ff72cb49');g.addColorStop(1,'#ff72cb00');ellipse(cx,cy-78,148,175,g);
    ctx.save();ctx.translate(cx,cy);ctx.scale(2.15,2.15);ctx.translate(-cx,-cy);
    drawPerson({...c,x:cx,y:cy,tx:cx,ty:cy},t,energy);ctx.restore();
    ctx.save();ctx.shadowColor='#fff0a9';ctx.shadowBlur=16;ctx.strokeStyle='#ffeca7';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(cx,cy-52,79,108,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    portraitTapTargets.push({x:cx*portraitRatio,y:(cy-100)*portraitRatio,r:110*portraitRatio,c});
  }
  // Short-lived neon particles, optimized to avoid occluding a 9:16 LIVE capture.
  for(let i=0;i<23;i++){
    const xx=(i*97+t*9*(i%3+1))%450,yy=((i*61+t*20*(i%4+1))%(ph*.55))+ph*.41;
    ctx.globalAlpha=.15+.13*Math.sin(t*2+i);ellipse(xx,yy,1.4+i%2,1.4+i%2,i%2?'#fda1f8':'#72eaff');
  }ctx.globalAlpha=1;
  ctx.restore();
  // Map interactive hit areas through the same camera transform as the drawn avatars.
  for(const target of portraitTapTargets){
   target.x=(225+(target.x/portraitRatio-portraitCameraView.x)*portraitCameraView.zoom)*portraitRatio;
   target.y=(ph/2+(target.y/portraitRatio-portraitCameraView.y)*portraitCameraView.zoom)*portraitRatio;
   target.r*=portraitCameraView.zoom;
  }
  viewX=0;viewY=0;scale=portraitRatio;
  // Advance effect lifetimes without drawing old world-position particles in portrait space.
  for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1)}
}
function render(t){let dt=last?Math.min((t-last)/1000,.06):0;last=t;clock+=dt;update(dt,t);updateCameraRig(dt,t);let bgEnergy=beat();const mobile=cw<700;const fit=mobile?Math.min(cw/850,ch/1000):Math.min(cw/1940,ch/1180);scale=fit*cam.zoom;viewX=cw*.5-cam.x*scale;viewY=ch*.5-cam.y*scale;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);const ambient=ctx.createLinearGradient(0,0,0,ch);ambient.addColorStop(0,'#201538');ambient.addColorStop(.6,'#16152d');ambient.addColorStop(1,'#101a2c');ctx.fillStyle=ambient;ctx.fillRect(0,0,cw,ch);if(portraitEnabled()){portraitStage(clock,bgEnergy,dt);requestAnimationFrame(render);return}portraitScreen=false;ctx.save();ctx.translate(viewX,viewY);ctx.scale(scale,scale);drawBackground(clock);drawVenueExpansion(clock,bgEnergy);drawRealisticFinishes(clock,bgEnergy);drawStage(clock,bgEnergy);drawEDMMainStage(clock,bgEnergy);drawDanceFloor(clock,bgEnergy);drawBar(clock);drawFood(clock);drawVIP(clock);drawDecor(clock);for(const c of [...chars,...waiters].sort((a,b)=>a.y-b.y)){
 if(giftShot&&c===giftShot.character)continue;
 ctx.save();if(giftShot)ctx.globalAlpha=.055;
 if(c.id?.startsWith('waiter'))drawWaiterSprite(c,c.x,c.y,clock,.88);else drawPerson(c,clock,bgEnergy);if(c.bubbleUntil>performance.now()){ctx.save();ctx.translate(c.x-225,c.y-70);drawTalkBubble(c,225,0,clock);ctx.restore()}ctx.restore();
 }
 ctx.save();if(giftShot)ctx.globalAlpha=.13;drawResidentDancers(clock,bgEnergy);ctx.restore();
 if(giftShot){
   const hero=giftShot.character;
   // Foreground render LAST so the true gift sender is never obscured by the resident dancers.
   ctx.save();ctx.translate(hero.x,hero.y);ctx.scale(1.43,1.43);ctx.translate(-hero.x,-hero.y);
   drawPerson(hero,clock,bgEnergy);ctx.restore();
   drawGiftHeroScene(hero,clock);
 }
 drawEffects(dt,clock);ctx.restore();if((ticker++%22)===0)paintMiniMap();requestAnimationFrame(render)}
function photo(){const a=document.createElement('a');a.download='Neon_Party_Ky_Niem.png';a.href=canvas.toDataURL('image/png');a.click();toast('📷 Đã tạo ảnh kỷ niệm từ khung hình hiện tại!')}
function connectServer(){if(!backendBase || !/^https?:$/.test(new URL(backendBase).protocol))return;fetch(apiEndpoint('/api/status'),{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(st=>{if(st.server){serverLive=!!st.live;updateMode(st.live);streamSource=new EventSource(apiEndpoint('/api/events'));streamSource.onerror=()=>{serverLive=false;updateMode(false)};streamSource.onmessage=e=>{try{let msg=JSON.parse(e.data);eventScope=msg.source==='tiktok'?'tiktok':'demo';if(msg.type==='status'){serverLive=!!msg.live;updateMode(serverLive)}else if(msg.type==='viewer'){findOrCreate(msg.name,msg.avatar,msg.viewerKey)}else if(msg.type==='like')actionHeart(msg.count||1,findOrCreate(msg.name,msg.avatar,msg.viewerKey));else if(msg.type==='share')actionShare(msg.count||1,findOrCreate(msg.name,msg.avatar,msg.viewerKey));else if(msg.type==='gift')actionGift(msg.tier||2,findOrCreate(msg.name,msg.avatar,msg.viewerKey),msg.giftName||'TikTok Gift');else if(msg.type==='comment')processComment(msg.name,msg.comment,msg.avatar);else if(msg.type==='follow')feed(msg.name,'đã theo dõi chủ phòng!','⭐');else if(msg.type==='party')party(msg.name||'PARTY LIVE');eventScope='demo'}catch(err){console.warn('SSE message error:',err)}}}}).catch(()=>{})}
function updateMode(live){$('modeLabel').innerHTML='<span class="mode-dot"></span> '+(live?'LIVE CONNECTED':'CHẾ ĐỘ DEMO');document.querySelectorAll('.hint-mode').forEach(x=>x.textContent=live?'SỰ KIỆN PHIÊN LIVE':'CHẠY THỬ TRỰC TIẾP');}
function findOrCreate(name,avatar,key){
 if(!name)return self;
 const safeKey=String(key||'').slice(0,80);
 let c=chars.find(x=>safeKey&&x.viewerKey===safeKey)||chars.find(x=>x.name===name);
 if(c){if(safeKey)c.viewerKey=safeKey;if(avatar)updateAvatar(c,avatar);return c}
 c=addPerson(name,avatar)||self;if(safeKey)c.viewerKey=safeKey;return c;
}
function processComment(name,comment,avatar=''){
 const c=findOrCreate(name,avatar);const text=String(comment||'').trim().toLowerCase();
 const food={'!pizza':menuFoods[0],'!burger':menuFoods[1],'!sushi':menuFoods[2],'!soda':menuDrinks[1],'!mocktail':menuDrinks[0]};
 if(text==='!shuffle'||text==='!robot'||text==='!hiphop'||text==='!disco'||text==='!salsa'||text==='!moonwalk'||text==='!kpop'||text==='!jump'){
  const styles={'!shuffle':0,'!disco':1,'!hiphop':2,'!robot':3,'!salsa':4,'!jump':5,'!moonwalk':6,'!kpop':7};
  setDanceStyle(c,styles[text],9500);chatBubble(c,'Đang nhảy '+danceLabels[styles[text]]+'!',3300);
  feed(c.name,'biểu diễn '+danceLabels[styles[text]],'💃');
 }
 else if(text==='!chao'||text==='!hello'||text==='!highfive'){
  setAction(c,'wave',4100);chatBubble(c,text==='!highfive'?'Đập tay nào! 🙌':'Xin chào cả nhà! 👋',3600);
  const friends=chars.filter(v=>v!==c&&v.id.startsWith('npc'));if(friends.length){let b=friends[Math.floor(rand(0,friends.length))];setAction(b,'wave',2900);chatBubble(b,'Chào bạn nhé! 🥳',3000)}
 }
 else if(text==='!dance'||text==='!nhay'){c.seatedUntil=0;actionDancePair(c);chatBubble(c,'Quẩy thôi! 🔥',2800)}
 else if(text==='!sit'||text==='!ban'||text==='!ngoiban'){const used=new Set(chars.filter(v=>v!==c&&v.seatedUntil>performance.now()).map(v=>v.seatedSeat));c.seatedSeat=[0,1,2,3,4,5].find(n=>!used.has(n))??Math.floor(rand(0,6));c.seatedUntil=performance.now()+60000;goTo(c,'food');setAction(c,'cheers',5000,'🍹');chatBubble(c,'Mình ngồi bàn tiệc đây! 🥂',3700);feed(c.name,'đã ngồi vào bàn tiệc ảo','🍹');}
 else if(text==='!khui'||text==='!bia'||text==='!mochai'){
   if(!startBeerPop(c,false))chatBubble(c,'Đang có tiết mục, lát nữa khui nhé! 🍻',3100);
 }
 else if(text==='!nhau'||text==='!dotiec'||text==='!banbe'){startBanquetFeast(c);chatBubble(c,'Mở tiệc với hội bạn! 🍢',3300)}
 else if(text==='!zo'||text==='!zoo'||text==='!123zo'||text==='!cungly'){startRoomCheers(c.name,true);chatBubble(c,'1, 2, 3, ZÔÔÔ! 🥂',4500)}
 else if(text==='!cheers')actionCheers(c);
 else if(text==='!hong')actionVote('hong',c);
 else if(text==='!xanh')actionVote('xanh',c);
 else if(text==='!luna'||text==='!kai'){
   if(Date.now()-lastDancerRequest>15000){lastDancerRequest=Date.now();triggerDancerShow(text==='!luna'?'pro-luna':'pro-kai')}else{feed(c.name,'cổ vũ vũ công '+text.slice(1).toUpperCase(),'🔥');puff(c.x,c.y-65,'spark',12)}
 }
 else if(text==='!drink')actionFood(menuDrinks[0],c,true);
 else if(text==='!food')actionFood(menuFoods[0],c,false);
 else if(food[text])actionFood(food[text],c,text==='!soda'||text==='!mocktail');
 else if(text==='!wave'){setAction(c,'wave',3000);puff(c.x,c.y-70)}
 else if(text==='!bar')goTo(c,'bar');
 else if(text==='!lounge')goTo(c,'lounge');
 else if(text==='!garden'||text==='!sanvuon')goTo(c,'garden');
 else if(text==='!rooftop'||text==='!santhuong')goTo(c,'rooftop');
 else if(text==='!chill')goTo(c,'chill');
 else if(text==='!entrance'||text==='!sanh')goTo(c,'entrance');
 else if(text==='!vip')goTo(c,'vip');
 else if(text==='!photo'){goTo(c,'photo');setAction(c,'wave',4000);spotlight(c);feed(c.name,'đang tạo dáng ở góc chụp ảnh!','📷')}
 else if(text==='!join'){chatBubble(c,'Xin chào Neon Party! 👋',3500);setAction(c,'wave',2800);feed(c.name,'đã vào quán bằng lệnh !join','👋')}
 else {feed(c.name,comment,'💬');chatBubble(c,comment,4600);displayText(c.x,c.y-128,String(comment).slice(0,25),'#f3d0fc')}
}

function bind(){
const dock=$('liveToolsMenu'),dockToggle=$('liveToolsToggle');
function closeLiveTools(){dock.hidden=true;dockToggle.setAttribute('aria-expanded','false');}
function toggleLiveTools(){dock.hidden=!dock.hidden;dockToggle.setAttribute('aria-expanded',String(!dock.hidden));}
dockToggle.addEventListener('click',toggleLiveTools);
$('liveToolsClose').addEventListener('click',closeLiveTools);
$('liveCamAction').addEventListener('click',()=>{closeLiveTools();cameraModal()});
 $('liveTourAction').addEventListener('click',()=>{closeLiveTools();setCameraMode('auto')});
 $('liveMermaidAction').addEventListener('click',()=>{closeLiveTools();setCameraMode('mermaid')});
 $('liveZoomIn').addEventListener('click',()=>zoomCamera(1.17));
 $('liveZoomOut').addEventListener('click',()=>zoomCamera(1/1.17));
 $('liveZoomReset').addEventListener('click',()=>{portraitManualZoom=1; if(!portraitEnabled())setCameraMode('stage');$('liveZoomValue').textContent='100%'});
$('liveInteractionsAction').addEventListener('click',()=>{closeLiveTools();openPlayPanel()});
$('liveGiftAction').addEventListener('click',()=>{closeLiveTools();giftModal()});
$('liveWelcomeAction').addEventListener('click',()=>{closeLiveTools();mcSettingsModal()});$('livePartySoundAction').addEventListener('click',()=>{closeLiveTools();partySoundSettings()});
$('liveAudioAction').addEventListener('click',()=>{if(!isPlaying){muted=false;startAudio()}else{muted=!muted;applyMusicVolume();syncAudioUI()}});
$('musicStartButton')?.addEventListener('click',()=>{if(!isPlaying){muted=false;startAudio()}else{audio.pause();isPlaying=false;syncAudioUI()}});
$('musicWarningButton')?.addEventListener('click',musicTroubleshoot);
$('liveVolSlider').addEventListener('input',e=>setVolume(e.target.value));
$('enterBtn').addEventListener('click',()=>{$('entryScreen').style.display='none';mcReady=true;unlockSoundClips();startAudio();if(welcomeQueue.length)scheduleWelcome();toast('🎉 Chào mừng tới NEON PARTY LIVE!');puff(self.x,self.y-90,'spark',25)});
$('enterSilent').addEventListener('click',()=>{$('entryScreen').style.display='none';soundActivated=false;toast('Bạn đã vào quán. Bấm ♫ nếu muốn bật nhạc.')});
$('entryVol').addEventListener('input',e=>setVolume(e.target.value));$('volSlider').addEventListener('input',e=>setVolume(e.target.value));$('mobileVolume').addEventListener('input',e=>setVolume(e.target.value));$('mobileMute').addEventListener('click',()=>{if(!isPlaying){muted=false;startAudio()}else{muted=!muted;applyMusicVolume();syncAudioUI()}});$('muteBtn').addEventListener('click',()=>{if(!isPlaying){muted=false;startAudio()}else{muted=!muted;applyMusicVolume();syncAudioUI()}});
$('settingsTop').addEventListener('click',settingsModal);$('closeModal').addEventListener('click',closeModal);$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closePlayPanel()}});
$('actHeart').addEventListener('click',()=>actionHeart(100));$('actShare').addEventListener('click',()=>actionShare(5));$('actGift').addEventListener('click',giftModal);$('actDance').addEventListener('click',()=>party());$('actJoin').addEventListener('click',()=>joinModal());$('actFood').addEventListener('click',()=>foodModal(false));$('actDrink').addEventListener('click',()=>foodModal(true));$('actPhoto').addEventListener('click',photo);$('editSelf').addEventListener('click',()=>joinModal(true));
document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>setCameraMode(b.dataset.camera)));$('stageCamera').addEventListener('click',()=>{const all=['stage','auto','mermaid','orbit','pulse','roomtour','bar','food','vip','lounge','garden','rooftop','dance'];setCameraMode(all[(Math.max(0,all.indexOf(cameraMode))+1)%all.length])});$('stageActions').addEventListener('click',openPlayPanel);$('stageGift').addEventListener('click',giftModal);$('closePlayPanel').addEventListener('click',closePlayPanel);$('playPanelBackdrop').addEventListener('click',e=>{if(e.target===$('playPanelBackdrop'))closePlayPanel()});document.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>{const fn=playActions[b.dataset.play];closePlayPanel();if(fn)fn()}));$('actDancers').addEventListener('click',()=>triggerDancerShow('duo'));$('actVotePink').addEventListener('click',()=>actionVote('hong'));$('actVoteBlue').addEventListener('click',()=>actionVote('xanh'));$('actCheers').addEventListener('click',()=>startRoomCheers('DEMO',true));$('actAdmin').addEventListener('click',adminModal);$('actReset').addEventListener('click',()=>{resetCharacters();feed('Hệ thống','đã khởi tạo lại buổi tiệc DEMO.','✦');toast('Đã làm mới phiên DEMO.')});
$('miniMapToggle').addEventListener('click',()=>{const a=$('miniMapPanel');a.hidden=!a.hidden;$('miniMapToggle').setAttribute('aria-expanded',String(!a.hidden));paintMiniMap()});
 $('miniMapClose').addEventListener('click',()=>{$('miniMapPanel').hidden=true;$('miniMapToggle').setAttribute('aria-expanded','false')});
 $('miniMap').addEventListener('click',e=>{const r=$('miniMap').getBoundingClientRect();const x=clamp((e.clientX-r.left)/r.width*W,120,W-120),y=clamp((e.clientY-r.top)/r.height*H,180,H-100);cameraMode='free';cameraAim={x,y,zoom:1.05};updateCameraButtons();toast('🧭 Đã di chuyển camera tới khu vực đã chọn')});
 $('zoomIn').addEventListener('click',()=>zoomCamera(1.16));$('zoomOut').addEventListener('click',()=>zoomCamera(1/1.16));$('btnFull').addEventListener('click',()=>{const el=$('canvasWrap');if(!document.fullscreenElement&&el.requestFullscreen)el.requestFullscreen().catch(()=>{});else if(document.exitFullscreen)document.exitFullscreen()});
const track=(e)=>{const box=canvas.getBoundingClientRect();return {x:e.clientX-box.left,y:e.clientY-box.top}};
const pinchTouches=new Map();let pinchDist=0;
canvas.addEventListener('pointerdown',e=>{pinchTouches.set(e.pointerId,track(e));if(pinchTouches.size===2){const pts=[...pinchTouches.values()];pinchDist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)}},true);
canvas.addEventListener('pointermove',e=>{if(!pinchTouches.has(e.pointerId))return;pinchTouches.set(e.pointerId,track(e));if(pinchTouches.size===2){const pts=[...pinchTouches.values()],dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDist>15&&dist>15){zoomCamera(clamp(dist/pinchDist,.86,1.16));pinchDist=dist;drag=null}}},true);
const endPinch=e=>{pinchTouches.delete(e.pointerId);if(pinchTouches.size<2)pinchDist=0;};
canvas.addEventListener('pointerup',endPinch);canvas.addEventListener('pointercancel',endPinch);
canvas.addEventListener('pointerdown',e=>{let p=track(e);drag={startX:p.x,startY:p.y,camX:cam.x,camY:cam.y,moved:false};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=track(e),dx=p.x-drag.startX,dy=p.y-drag.startY;if(Math.abs(dx)+Math.abs(dy)>8)drag.moved=true;if(drag.moved){if(portraitScreen)return;if(giftShot){finishGiftShot();giftShotQueue=[]}cameraMode='free';cameraAim={x:clamp(drag.camX-dx/scale,90,W-90),y:clamp(drag.camY-dy/scale,125,H-85),zoom:cam.zoom};cam.x=cameraAim.x;cam.y=cameraAim.y;updateCameraButtons()}});canvas.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved)return;let p=track(e);if(portraitScreen){const targets=portraitTapTargets.slice().reverse();const hit=targets.find(o=>Math.hypot(p.x-o.x,p.y-o.y)<o.r);if(hit?.pro)openResidentDancer(hit.pro);else if(hit?.c)openCharacter(hit.c);return;}let pt=coords(p.x,p.y);let nearest=null,dist=60;for(const c of chars){let d=Math.hypot(pt.x-c.x,pt.y-(c.y-45));if(d<dist){dist=d;nearest=c}}let pro=null,proDist=76;for(const d of residentDancers){const dd=Math.hypot(pt.x-d.x,pt.y-(d.y-65));if(dd<proDist){proDist=dd;pro=d}}if(pro)openResidentDancer(pro);else if(nearest)openCharacter(nearest)});canvas.addEventListener('wheel',e=>{e.preventDefault();zoomCamera(e.deltaY<0?1.09:1/1.09)},{passive:false});
audio.addEventListener('timeupdate',()=>$('timeDisplay').textContent=musicTime());audio.addEventListener('ended',()=>{isPlaying=false;syncAudioUI()});audio.addEventListener('error',()=>{isPlaying=false;syncAudioUI();if(!musicPlayPromise){void explainMusicFailure(new DOMException('Media source error','NotSupportedError'))}});
window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);resize();
if(overlay){mcReady=true;setCameraMode(new URLSearchParams(location.search).get('camera')==='auto'?'auto':'stage');document.body.classList.add('overlay-mode');$('entryScreen').style.display='none';document.title='NEON PARTY · OBS OVERLAY';if(new URLSearchParams(location.search).get('sound')!=='off'){setTimeout(()=>startAudio(),750);window.addEventListener('pointerdown',()=>{if(!isPlaying){muted=false;startAudio()}},{once:true})}setTimeout(()=>toast('Overlay: nếu chưa nghe tiếng, tương tác một lần với nguồn trình duyệt trong OBS.'),1800)}
}
resetCharacters();if(window.innerWidth<=700&&!overlay)updateCameraButtons();$('selfName').textContent=self.name;$('selfAvatar').textContent=[...self.name][0].toUpperCase();bind();syncAudioUI();bots.forEach((m,i)=>setTimeout(()=>feed(['Neon Party','DJ Neon','Bartender'][i],m,['✨','🎧','🍹'][i]),200+i*350));requestAnimationFrame(render);connectServer();if(sameOriginBackend && new URLSearchParams(location.search).has('admin'))setTimeout(adminModal,450);
})();
