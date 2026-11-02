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
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const W=1920,H=1160,colors=['#e87bc1','#65c9f5','#b18aff','#ffbd72','#6ce6be','#ef98a8','#79a6ff','#d8d17a'];
const names=['Mèo Mun','Bông Xù','Panda Love','Vivi','Bảo Bối','Nấm Lùn','Kẹo Ngọt','Nana','Kem Dâu','Bắp Rang','Kiki','Mây Trắng','Bé Thỏ','Chíp Chíp','Cherry','Cún Con','BoBo','Mochi','Mít Ướt','Zin Zin','Sunny','Luna','Mimi','Gấu Bông'];
const menuFoods=[['🍕','Pizza phô mai','Cả quán thơm lừng!'],['🍔','Hamburger','Suất ăn vui vẻ'],['🍣','Sushi','Đúng gu Nhật Bản'],['🍗','Gà giòn','Tiệc giòn rụm'],['🍰','Bánh kem','Vị ngọt đêm nay'],['🍟','Khoai chiên','Gọi món cùng bạn'],['🍝','Mì Ý','Ngon mê ly'],['🍱','Combo Party','Bữa ăn đầy màu sắc']];
const menuDrinks=[['🍹','Party Mocktail','Ly trái cây neon'],['🥤','Soda cầu vồng','Tươi mát, lung linh'],['🧃','Nước ép dâu','Ngọt ngào tươi mới'],['🍋','Lemon Fizz','Chanh tươi sảng khoái'],['🧋','Trà sữa','Ngọt ngào dễ thương'],['🍇','Nước nho','Ly tím lung linh'],['🍊','Cam ép','Nắng trong một ly'],['🥥','Dừa mát lạnh','Chill hết nấc']];
let chars=[],effects=[],messages=[],waiters=[],last=0,clock=0,heartCount=0,shareCount=0,activePartyUntil=0,selectedId=null,muted=false,volume=.58,interactionCount=0,streamSource=null,audioContext=null,audioGain=null,analyser=null,freqData=null,soundActivated=false,isPlaying=false,quality='auto',drag=null,cam={x:795,y:560,zoom:1},cw=0,ch=0,dpr=1,serverLive=false,overlay=/(?:\?|&)overlay=1(?:&|$)/.test(location.search),demoLocked=false;
let ticker=0,scale=1,viewX=0,viewY=0,adminToken='',eventScope='demo',djVotes={hong:0,xanh:0},djVoters=new Set(),djRoundEnds=Date.now()+90000,lastPartner=null,lastDancerRequest=0;
const bots=['✨ Neon Party đã mở cửa!','🎧 DJ đang lên nhạc, chuẩn bị nhảy nào!','🍹 Gọi đồ uống ảo tại quầy bằng một cú chạm.'];
const self={id:'you',name:'Bạn Neon',color:'#db78ef',skin:'#f3c4a7',hair:'#3c214b',x:710,y:610,tx:710,ty:610,action:'dance',until:0,score:0,likes:0,shares:0,prop:'',avatar:'',img:null};
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
 wide:{x:775,y:490,zoom:1.04},overview:{x:965,y:565,zoom:.54},
 dj:{x:680,y:200,zoom:1.82},dance:{x:680,y:520,zoom:1.83},
 bar:{x:275,y:386,zoom:1.82},food:{x:250,y:664,zoom:1.8},
 vip:{x:1170,y:320,zoom:1.84},photo:{x:1164,y:655,zoom:1.86},
 lounge:{x:1620,y:294,zoom:1.44},garden:{x:1625,y:681,zoom:1.38},
 entrance:{x:880,y:1002,zoom:1.47},rooftop:{x:1540,y:1000,zoom:1.40},
 chill:{x:300,y:998,zoom:1.55}};
let cameraMode='wide',cameraAim={x:775,y:490,zoom:1.04},giftShot=null,giftShotQueue=[],giftShotSerial=0;
const autoCameraCycle=['wide','dj','dance','lounge','dance','bar','garden','vip','entrance','rooftop','dance'];let autoCameraIndex=0,nextAutoCut=performance.now()+9000;
const heroDuration=3000;
function updateCameraButtons(){document.querySelectorAll('[data-camera]').forEach(b=>{b.classList.toggle('is-active',b.dataset.camera===cameraMode);b.setAttribute('aria-pressed',String(b.dataset.camera===cameraMode))})}
function setCameraMode(mode){if(mode!=='follow'&&mode!=='auto'&&mode!=='cinema'&&!cameraPresets[mode])return;giftShot=null;giftShotQueue=[];$('heroOverlay').hidden=true;cameraMode=mode;if(mode==='auto'){autoCameraIndex=0;nextAutoCut=performance.now()+9000}const preset=cameraPresets[(mode==='auto'||mode==='cinema')?'wide':mode];if(preset)cameraAim={...preset};else cameraAim={x:getOwner().x,y:getOwner().y-55,zoom:2.1};updateCameraButtons();toast('🎥 Góc quay: '+({auto:'Tự động chuyển cảnh',wide:'Toàn cảnh',dj:'Sân khấu DJ',dance:'Sàn EDM',bar:'Quầy bar',food:'Khu ăn uống',vip:'Khu VIP',photo:'Góc ảnh',follow:'Theo nhân vật',overview:'Flycam toàn quán',cinema:'Camera điện ảnh chuyển động',lounge:'Lounge kính',garden:'Vườn đêm',entrance:'Sảnh ánh sáng',rooftop:'Rooftop',chill:'Góc thư giãn'}[mode]||'Tự do'))}
function startGiftShot(item){giftShot={...item,started:performance.now(),serial:++giftShotSerial};const c=item.character;const avatar=$('heroAvatar');avatar.replaceChildren();avatar.textContent=(c.name||'?').slice(0,1).toUpperCase();if(c.avatar){const im=document.createElement('img');im.alt='Avatar '+c.name;im.src=c.avatar;im.onerror=()=>im.remove();avatar.appendChild(im)}$('heroName').textContent=c.name;$('heroGiftName').textContent=item.giftName;$('heroOverlay').hidden=false;$('heroSeconds').textContent='3';$('heroProgress').style.width='100%'}
function requestGiftCloseup(character,giftName='Quà Neon',tier=2){if(!character)return;const item={character,giftName:String(giftName).slice(0,65),tier};if(giftShot){if(giftShotQueue.length<6)giftShotQueue.push(item);else toast('🎬 Hàng đợi cận cảnh đã đầy');return}startGiftShot(item)}
function updateCameraRig(dt,t){if(!giftShot&&cameraMode==='auto'&&t>=nextAutoCut){autoCameraIndex=(autoCameraIndex+1)%autoCameraCycle.length;cameraAim={...cameraPresets[autoCameraCycle[autoCameraIndex]]};nextAutoCut=t+9000}if(giftShot&&t-giftShot.started>=heroDuration){giftShot=null;$('heroOverlay').hidden=true;if(giftShotQueue.length)startGiftShot(giftShotQueue.shift())}
 let goal;
 if(giftShot){const c=giftShot.character;goal={x:c.x,y:c.y-49,zoom:cw<700?2.75:2.55};const remain=Math.max(0,heroDuration-(t-giftShot.started));$('heroSeconds').textContent=String(Math.ceil(remain/1000));$('heroProgress').style.width=(remain/heroDuration*100).toFixed(2)+'%'}
 else if(cameraMode==='follow'){const c=getOwner();goal={x:c.x,y:c.y-45,zoom:cw<700?2.08:1.9}}
 else if(cameraMode==='cinema'){goal={x:850+290*Math.sin(t/5300),y:515+145*Math.sin(t/7400),zoom:1.1+.14*Math.sin(t/4300)}}
 else goal=cameraAim;
 if(!giftShot && cameraMode==='wide' && cw<700)goal={...goal,zoom:1.23};
 const lerp=1-Math.exp(-Math.min(.065,dt)*7.6);cam.x+=(goal.x-cam.x)*lerp;cam.y+=(goal.y-cam.y)*lerp;cam.zoom+=(goal.zoom-cam.zoom)*lerp;
}
function openPlayPanel(){const x=$('playPanelBackdrop');x.hidden=false;document.body.classList.add('play-panel-open')}
function closePlayPanel(){const x=$('playPanelBackdrop');x.hidden=true;document.body.classList.remove('play-panel-open')}
function cameraModal(){const v=[['auto','🎬 Đạo diễn tự động'],['wide','🌐 Toàn cảnh'],['dj','🎧 Sân khấu DJ'],['dance','💃 Sàn EDM'],['bar','🍹 Quầy bar'],['food','🍕 Khu ăn'],['vip','👑 VIP'],['photo','📷 Góc chụp ảnh'],['follow','👤 Theo nhân vật đang chọn'],['overview','🗺️ Flycam toàn khu'],['cinema','🎞️ Tracking điện ảnh'],['lounge','🪟 Sky Lounge'],['garden','🌿 Sân vườn'],['entrance','🚪 Đại sảnh'],['rooftop','🌆 Rooftop'],['chill','🌙 Chill Zone']];showModal('Chọn góc quay','🎥 CAMERA STUDIO','<p class="modal-note">Chọn góc quan sát bất kỳ. Khi có quà tặng, camera sẽ tự zoom vào người tặng đúng 3 giây rồi quay lại góc này.</p><div class="menu-grid">'+v.map(([k,n])=>'<button class="menu-option" data-camera-modal="'+k+'">🎥 <b>'+n+'</b></button>').join('')+'</div>',()=>document.querySelectorAll('[data-camera-modal]').forEach(b=>b.addEventListener('click',()=>{closeModal();setCameraMode(b.dataset.cameraModal)})))}
const playActions={heart:()=>actionHeart(100),share:()=>actionShare(5),gift:giftModal,dance:()=>triggerDancerShow('duo'),cheers:()=>actionCheers(),food:()=>foodModal(false),drink:()=>foodModal(true),votePink:()=>actionVote('hong'),voteBlue:()=>actionVote('xanh'),join:()=>joinModal(),live:adminModal,camera:cameraModal};

const savedName=(()=>{try{return localStorage.getItem('neon_name')}catch{return null}})();
if(savedName)self.name=savedName.slice(0,24);
function newCharacter(name,i){const a=Math.random()*Math.PI*2,rad=rand(80,280);return {id:'npc'+i,name, color:colors[i%colors.length],skin:['#f6caaa','#e7b08c','#c98c70','#ffe0b9'][i%4],hair:['#30192e','#744268','#3d2d6b','#443029','#e1a14b'][i%5],x:680+Math.cos(a)*rad,y:470+Math.sin(a)*rad*.72,tx:680+Math.cos(a)*rad,ty:470+Math.sin(a)*rad*.72,action:i%4===0?'dance':'idle',until:0,score:rand(30,500)|0,likes:0,shares:0,prop:'',avatar:'',img:null,seed:rand(0,10)}}
function resetCharacters(){djVotes={hong:0,xanh:0};djVoters.clear();djRoundEnds=Date.now()+90000;updateDJVote();proShowUntil=0;proShowFocus='duo';chars=names.map(newCharacter);
 const districtGuests=[
 ['Sao Băng','lounge',1570,344],['Miso Night','lounge',1780,360],['Kẹo Bạc Hà','garden',1575,741],
 ['Kiwi Moon','garden',1740,707],['Gia Hân','entrance',845,1030],['HipHop Bear','entrance',1030,1020],
 ['Tia Chớp','rooftop',1490,1050],['Mây Tím','rooftop',1755,1058],['Bé Cacao','chill',233,1019],['Nắng Khuya','chill',400,1032]
 ];
 for(let j=0;j<districtGuests.length;j++){const [name,zone,x,y]=districtGuests[j];const c=newCharacter(name,100+j);c.x=x;c.y=y;c.tx=x;c.ty=y;c.zone=zone;c.action=j%3===0?'dance':'idle';chars.push(c)}
 chars.push(self);heartCount=0;shareCount=0;effects=[];waiters=[];interactionCount=0;activePartyUntil=0;selectedId='you';updateStats();renderRank()}
function serve(c,emoji){const w={id:'staff'+Date.now()+Math.random(),name:'Phục vụ',color:'#a85bdb',skin:'#f3c09f',hair:'#44254b',x:205,y:315,tx:205,ty:315,action:'cheers',until:performance.now()+7000,score:0,likes:0,shares:0,prop:emoji,seed:Math.random()*5,removeAt:performance.now()+5300};target(w,c.x,c.y-20);waiters.push(w);}
function target(c,x,y){c.tx=clamp(x,95,W-95);c.ty=clamp(y,290,H-70)}
function selectCharacter(){return chars.find(c=>c.id===selectedId)||self}
function goTo(c,location){const spots={bar:[290,350],dance:[680,525],food:[350,660],vip:[1120,400],photo:[1130,655],lounge:[1610,330],garden:[1560,700],entrance:[900,940],rooftop:[1530,970],chill:[300,930]};const pos=spots[location]||spots.dance;target(c,pos[0]+rand(-80,80),pos[1]+rand(-45,45))}
function setAction(c,action,time=4000,prop=''){c.action=action;c.until=performance.now()+time;c.prop=prop;}
function puff(x,y,kind='spark',count=16){for(let i=0;i<count;i++){effects.push({kind,x:x+rand(-9,9),y:y+rand(-8,8),vx:rand(-110,110),vy:rand(-220,-40),life:rand(.7,1.6),max:1.6,size:rand(3,7),col:colors[(Math.random()*colors.length)|0],spin:rand(0,5)})}}
function displayText(x,y,text,col='#f7e6ff'){effects.push({kind:'text',x,y,vx:0,vy:-36,life:2.3,max:2.3,text,col})}
function beam(x,y,col='#fc5cd0',size=90){effects.push({kind:'ring',x,y,life:1.15,max:1.15,size,col})}
function shakeWorld(){canvas.classList.add('shake');setTimeout(()=>canvas.classList.remove('shake'),220)}
function safeText(s){return String(s||'').slice(0,100)}
function feed(name,body,emoji='✦'){const row=document.createElement('div');row.className='feed-item';const av=document.createElement('div');av.className='feed-avatar';av.textContent=emoji;const det=document.createElement('div');det.className='feed-detail';const b=document.createElement('b');b.textContent=safeText(name);det.appendChild(b);det.appendChild(document.createTextNode(' '+safeText(body)));const t=document.createElement('small');t.textContent='Vừa xong · '+(eventScope==='tiktok'?'TIKTOK LIVE':'DEMO');det.appendChild(t);row.append(av,det);$('eventFeed').prepend(row);while($('eventFeed').children.length>7)$('eventFeed').lastChild.remove();}
function toast(text){const el=document.createElement('div');el.className='toast';el.textContent=text;$('toastArea').prepend(el);setTimeout(()=>{el.style.opacity=0;setTimeout(()=>el.remove(),250)},4300)}
function soundEffect(type='spark'){if(!soundActivated||muted||!audioContext)return;try{if(audioContext.state==='suspended')audioContext.resume();const t=audioContext.currentTime;let notes=type==='gift'?[659,880,1174,1318]:type==='cheers'?[880,1174]:type==='dance'?[110,147,175,220]:type==='share'?[440,554,659]:[660,784];notes.forEach((f,i)=>{let osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type==='dance'?'triangle':'sine';osc.frequency.setValueAtTime(f,t+i*.09);gain.gain.setValueAtTime(.0001,t+i*.09);gain.gain.exponentialRampToValueAtTime((type==='dance'?.055:.04)*volume,t+i*.09+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+i*.09+.2);osc.connect(gain);gain.connect(audioGain||audioContext.destination);osc.start(t+i*.09);osc.stop(t+i*.09+.22)})}catch(e){console.debug('SFX:',e.message)}}
function startAudio(){soundActivated=true;try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();audioGain=audioGain||audioContext.createGain();audioGain.gain.value=1;if(!analyser){analyser=audioContext.createAnalyser();analyser.fftSize=256;freqData=new Uint8Array(analyser.frequencyBinCount);const src=audioContext.createMediaElementSource(audio);src.connect(analyser);analyser.connect(audioGain);audioGain.connect(audioContext.destination)}audioContext.resume();}catch(e){console.info('No Web Audio:',e.message)}audio.volume=muted?0:volume;return audio.play().then(()=>{isPlaying=true;syncAudioUI()}).catch(()=>{isPlaying=false;syncAudioUI();toast('Trình duyệt chưa cho phát nhạc. Hãy nhấn nút ♫ để bật.')})}
function syncAudioUI(){$('muteBtn').textContent=muted||!isPlaying?'🔇':'♫';$('musicText').textContent=isPlaying?'♪ Đang phát · DJ Mix 2025':'♫ Chạm ♫ để phát nhạc';$('volLabel').textContent=Math.round(volume*100)+'%';$('volSlider').value=Math.round(volume*100);$('entryVol').value=Math.round(volume*100);$('entryVolText').textContent=Math.round(volume*100)+'%'}
function setVolume(n){volume=clamp(Number(n)/100,0,1);audio.volume=muted?0:volume;try{localStorage.setItem('neon_volume',volume)}catch{}syncAudioUI()}
try{const v=Number(localStorage.getItem('neon_volume'));if(v>0&&v<=1)volume=v}catch{}
function updateStats(){$('peopleCount').textContent=chars.length+residentDancers.length;$('roomCount').textContent=chars.length+' khách + 2 vũ công';$('totalHearts').textContent=heartCount.toLocaleString('vi-VN');$('shareCount').textContent=shareCount;$('heartProgress').style.width=(heartCount%1000/10)+'%';$('progressText').textContent=(heartCount%1000).toLocaleString('vi-VN')+' / 1.000 TIM';$('shareProgress').style.width=(shareCount%5/5*100)+'%';$('shareText').textContent=(shareCount%5)+' / 5 LƯỢT'}
function renderRank(){const ranked=[...chars].sort((a,b)=>b.score-a.score).slice(0,4);$('rankList').replaceChildren(...ranked.map((c,i)=>{let r=document.createElement('div');r.className='rank-item';const n=document.createElement('span');n.className='rank-num';n.textContent=['🥇','🥈','🥉','4'][i];const p=document.createElement('span');p.className='rank-pic';p.style.background=c.color+'44';p.textContent=[...c.name][0].toUpperCase();const l=document.createElement('span');l.textContent=c.name;const score=document.createElement('b');score.className='rank-score';score.textContent=Math.floor(c.score)+' ✦';r.append(n,p,l,score);return r}))}
function spotlight(c){beam(c.x,c.y-40,'#fd6fe1',80);puff(c.x,c.y-70,'spark',28);displayText(c.x,c.y-115,'✦ '+c.name.toUpperCase()+' ✦','#ffdb7f');soundEffect('gift')}
function getOwner(){return selectCharacter()}
function actionHeart(num=100,c=getOwner()){num=clamp(Number(num)||100,1,10000);let old=Math.floor(heartCount/1000),oldPersonal=Math.floor((c.likes||0)/100);heartCount+=num;c.likes+=num;c.score+=Math.floor(num/4);if(c===self || c.id==='you') selectedId='you';if(Math.floor(c.likes/100)>oldPersonal){goTo(c,'bar');setAction(c,'cheers',7500,'🍹');serve(c,'🍹');spotlight(c);feed(c.name,'thả '+num+' tim và nhận Party Mocktail!','💗');toast('💗 '+c.name+' mở khóa ly Party Mocktail ở mốc 100 tim!')}else{puff(c.x,c.y-50,'heart',num>10?10:4);feed(c.name,'thả '+num+' tim','💗')}if(Math.floor(heartCount/1000)>old){party('ĐẠT 1.000 TIM — PHÁO HOA NEON!')}updateStats();renderRank()}
function actionShare(num=5,c=getOwner()){num=clamp(Number(num)||5,1,100);const oldPersonal=Math.floor((c.shares||0)/5);shareCount+=num;c.shares+=num;c.score+=num*12;if(Math.floor(c.shares/5)>oldPersonal){goTo(c,'dance');setAction(c,'giftbox',4800,'🎁');spotlight(c);feed(c.name,'mở hộp quà bí mật từ 5 chia sẻ!','🎁');toast('🎁 '+c.name+' đã mở hộp quà Party!');soundEffect('share')}else{feed(c.name,'chia sẻ buổi tiệc','↗');puff(c.x,c.y-60)}updateStats();renderRank()}
function actionGift(tier=2,c=getOwner(),giftName='Quà Neon'){requestGiftCloseup(c,giftName,tier);tier=clamp(Number(tier)||2,1,6);c.score+=tier*180;goTo(c,'dance');setAction(c,tier>3?'dance':'giftbox',6500,tier>2?'🌟':'🎁');spotlight(c);if(tier>=4)party(tier>=6?'ULTIMATE PARTY — ĐẠI TIỆC NEON!':'DJ PARTY — BÙNG NỔ SÀN NHẢY!');else puff(c.x,c.y-70,'spark',15+tier*7);feed(c.name,'gửi '+giftName+' · hiệu ứng cấp '+tier,'💎');toast('🎁 '+giftName+' · '+c.name+' · hiệu ứng cấp '+tier);soundEffect('gift');renderRank()}
function actionFood(item,c=getOwner(),drink=false){goTo(c,drink?'bar':'food');setAction(c,drink?'cheers':'eat',8000,item[0]);serve(c,item[0]);c.score+=5;feed(c.name,(drink?'gọi đồ uống ':'gọi món ')+item[1],drink?'🍹':'🍕');toast(item[0]+' '+item[1]+' đang được mang tới '+c.name);puff(c.x,c.y-48,'spark',11);soundEffect('cheers');renderRank()}
function actionDance(c=getOwner()){goTo(c,'dance');setAction(c,'dance',9000);puff(c.x,c.y-50,'spark',10);soundEffect('dance');feed(c.name,'đang quẩy hết mình trên sàn nhảy!','🎵')}
function updateDJVote(){const total=djVotes.hong+djVotes.xanh;const h=$('djPinkCount'),b=$('djBlueCount'),p=$('djPinkBar'),q=$('djBlueBar');if(h)h.textContent=djVotes.hong+' phiếu';if(b)b.textContent=djVotes.xanh+' phiếu';if(p)p.style.width=(total?100*djVotes.hong/total:50)+'%';if(q)q.style.width=(total?100*djVotes.xanh/total:50)+'%'}
function actionVote(team,c=getOwner()){
 if(Date.now()>djRoundEnds){const win=djVotes.hong>=djVotes.xanh?'HỒNG NEON':'XANH CYAN';party('DJ BATTLE: '+win+' CHIẾN THẮNG!');djVotes={hong:0,xanh:0};djVoters.clear();djRoundEnds=Date.now()+90000}
 if(djVoters.has(c.name.toLowerCase())){if(c===self)toast('Mỗi nhân vật chỉ được bình chọn 1 lần mỗi vòng DJ.');return}
 djVoters.add(c.name.toLowerCase());djVotes[team]++;c.score+=3;const col=team==='hong'?'#ff6bd4':'#55e4ff';beam(c.x,c.y-45,col,100);displayText(c.x,c.y-117,'DJ '+(team==='hong'?'HỒNG':'XANH'),col);feed(c.name,'bình chọn DJ '+(team==='hong'?'Hồng Neon':'Xanh Cyan'),'🎧');soundEffect('dance');updateDJVote();renderRank();
}
function actionCheers(c=getOwner()){goTo(c,'bar');setAction(c,'cheers',6000,'🍹');puff(c.x,c.y-58,'spark',12);displayText(c.x,c.y-122,'CHEERS!','#ffdf99');feed(c.name,'nâng ly chúc mừng cùng bạn bè!','🥂');soundEffect('cheers')}
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
function party(label='PARTY TIME — CẢ QUÁN BÙNG NỔ!'){activePartyUntil=performance.now()+11500;for(const c of chars){if(Math.random()<.88){goTo(c,'dance');setAction(c,'dance',11000)}}for(let i=0;i<7;i++)setTimeout(()=>puff(rand(330,1010),rand(200,600),'spark',28),i*380);$('partyStatus').innerHTML='<span class="pulse-spot">✦</span><span>ĐẠI TIỆC NEON <b>PARTY MODE ON</b></span>';feed('DJ NEON',label,'🎧');toast('🔥 '+label);soundEffect('dance')}
function updateAvatar(c,url){if(!url||!/^https:\/\//i.test(url)||url.length>2048||c.avatar===url)return;c.avatar=url;let img=new Image();img.crossOrigin='anonymous';img.onload=()=>{c.img=img};img.onerror=()=>{c.img=null};img.src=url}
function addPerson(name,avatarUrl){name=safeText(name).trim().slice(0,24);if(!name){toast('Nhập tên trước khi vào quán nhé!');return}if(chars.some(c=>c.name.toLowerCase()===name.toLowerCase())){toast('Tên này đã có mặt trong quán!');return}let c=newCharacter(name,chars.length);c.x=670;c.y=795;c.tx=675+rand(-180,180);c.ty=485+rand(-80,80);chars.push(c);if(avatarUrl)updateAvatar(c,avatarUrl);selectedId=c.id;puff(c.x,c.y-30,'spark',25);displayText(c.x,c.y-95,'CHÀO MỪNG!','#fbe2a3');feed(c.name,'vừa bước vào quán Neon Party!','👋');toast('✨ Chào mừng '+name+' đến Neon Party!');updateStats();renderRank();return c}
function showModal(title,eyebrow,html,setup){$('modalTitle').textContent=title;$('modalEyebrow').textContent=eyebrow;$('modalContent').innerHTML=html;$('modalBackdrop').hidden=false;if(setup)setup()}
function closeModal(){$('modalBackdrop').hidden=true}
const option=(icon,title,small,key,i)=>`<button class="menu-option" data-item="${i}" data-kind="${key}"><span class="menu-emoji">${icon}</span><span><b>${title}</b><small>${small}</small></span></button>`;
function foodModal(drink){const menu=drink?menuDrinks:menuFoods;showModal(drink?'Quầy nước Neon':'Menu đồ ăn hấp dẫn',drink?'🍹 BARTENDER STATION':'🍕 PARTY FOOD CORNER','<p class="modal-note">Hãy chọn món ảo! Nhân vật sẽ di chuyển tới quầy và nhận món với hoạt ảnh riêng. Đây là trải nghiệm miễn phí trong DEMO.</p><div class="menu-grid">'+menu.map((m,i)=>option(...m,drink?'drink':'food',i)).join('')+'</div>',()=>{document.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>{actionFood(menu[Number(b.dataset.item)],getOwner(),drink);closeModal()}))})}
function giftModal(){const items=[['💗','Trái tim Neon','Cấp 1 · Nhấp nháy dễ thương'],['🎁','Hộp quà lung linh','Cấp 2 · Mở quà'],['🍹','Bartender Show','Cấp 3 · Ánh sáng và phục vụ'],['✨','Personal Spotlight','Cấp 4 · Sân khấu rực rỡ'],['🎧','DJ Party','Cấp 5 · Vũ điệu cộng đồng'],['🎆','Ultimate Party','Cấp 6 · Bùng nổ toàn quán']];showModal('Thử hiệu ứng quà tặng','🎁 GIFT REACTION ENGINE','<p class="modal-note">Sự kiện dưới đây là <b>DEMO</b> để trải nghiệm hiệu ứng. Đây không phải giao dịch TikTok hay hệ thống mua hàng bằng Coin.</p><div class="menu-grid">'+items.map((m,i)=>option(...m,'gift',i)).join('')+'</div>',()=>{document.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>{let i=Number(b.dataset.item);actionGift(i+1,getOwner(),items[i][1]);closeModal()}))})}
function joinModal(isEdit=false){const title=isEdit?'Đổi tên nhân vật':'Mời thêm một người bạn';showModal(title,'👋 CHÀO MỪNG BẠN ĐẾN QUÁN',`<p class="modal-note">${isEdit?'Thay tên nhân vật của bạn trong phiên DEMO.':'Tạo thêm một nhân vật hoạt hình với tên riêng, tự động bước vào quán và hòa vào buổi tiệc.'}</p><label class="form-label" for="newName">Tên hiển thị</label><input id="newName" class="form-input" maxlength="24" placeholder="Ví dụ: Bé Mèo, Kiki, Panda..." autocomplete="off"><button id="submitName" class="primary-btn">${isEdit?'LƯU TÊN':'✦ THÊM NHÂN VẬT'}</button>`,()=>{$('newName').value=isEdit?self.name:'';const submit=()=>{const name=$('newName').value.trim();if(!name)return;if(isEdit){self.name=name;selectedId='you';$('selfName').textContent=name;$('selfAvatar').textContent=[...name][0].toUpperCase();try{localStorage.setItem('neon_name',name)}catch{}toast('Đã đổi tên thành '+name);renderRank()}else addPerson(name);closeModal()};$('submitName').addEventListener('click',submit);$('newName').addEventListener('keydown',e=>{if(e.key==='Enter')submit()});$('newName').focus()})}
function settingsModal(){showModal('Cài đặt không gian','⚙ YOUR PARTY SETTINGS',`<div class="settings-line"><span>♫ Âm lượng nhạc nền</span><input type="range" id="settingVol" min="0" max="100" value="${Math.round(volume*100)}"></div><div class="settings-line"><span>🎚 Hiệu ứng đồ họa</span><select id="qualitySelect" class="form-input" style="width:160px;margin:0"><option value="auto">Tự động</option><option value="low">Tiết kiệm</option><option value="high">Cao</option></select></div><div class="settings-line"><span>⚡ Quản trị & Kết nối LIVE</span><button class="secondary-btn" id="adminButton">Mở bảng quản trị</button></div><div class="settings-line"><span>🎥 Chế độ phát OBS</span><button class="secondary-btn" id="overlayLink">Mở Overlay 9:16</button></div><div class="settings-line"><span>♬ Điều khiển nhạc</span><button class="secondary-btn" id="musicControl">${isPlaying?'Tạm dừng nhạc':'Bật nhạc'}</button></div><p class="modal-note">Nhạc đi kèm đã được nén để giảm dung lượng. Chế độ LIVE thật yêu cầu máy chủ và nguồn sự kiện TikTok hợp lệ. Khi mở HTML độc lập, các chức năng tương tác hoạt động ở chế độ DEMO.</p>`,()=>{$('adminButton').addEventListener('click',adminModal);$('settingVol').addEventListener('input',e=>setVolume(e.target.value));$('qualitySelect').value=quality;$('qualitySelect').addEventListener('change',e=>quality=e.target.value);$('overlayLink').addEventListener('click',()=>{const url=location.href.split('?')[0]+'?overlay=1';try{window.open(url,'_blank')}catch{}toast('Đã mở liên kết OBS Overlay')});$('musicControl').addEventListener('click',()=>{toggleAudio();$('musicControl').textContent=isPlaying?'Tạm dừng nhạc':'Bật nhạc'})})}
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
function drawStage(t,energy){ctx.save();const djAccent=djVotes.xanh>djVotes.hong?'#46dcff':djVotes.hong>djVotes.xanh?'#ff64cb':'#b54cff';const stage=ctx.createLinearGradient(0,150,0,315);stage.addColorStop(0,'#352052');stage.addColorStop(1,'#25163f');rr(418,55,525,238,22);ctx.fillStyle=stage;ctx.fill();ctx.strokeStyle=djAccent;ctx.lineWidth=6;ctx.shadowBlur=24;ctx.shadowColor=djAccent;ctx.stroke();ctx.shadowBlur=0;for(let i=0;i<24;i++){let x=438+i*20;let h=24+75*(.38+.55*Math.abs(Math.sin(t*(2+energy*2)+i*.8)));rect(x,196-h,9,h,i%3===0?'#f052d6':i%3===1?'#5bdaff':'#ae6dff')};rr(510,62,340,64,14);ctx.fillStyle='#120e30';ctx.fill();ctx.strokeStyle='#ea7dff';ctx.lineWidth=2;ctx.stroke();label('✦  NEON  PARTY  ✦',680,94,30,'#ff95e1');rr(510,228,340,68,13);ctx.fillStyle='#171528';ctx.fill();ctx.strokeStyle='#57defc';ctx.stroke();label('★  DJ  NIGHT  ★',680,256,15,'#70e8ff');for(let i=0;i<12;i++){let val=freqData?freqData[(i*8)%freqData.length]/255:Math.abs(Math.sin(t*3+i*1.3));rect(571+i*18,280-val*14,9,val*14,'#e75ed6')}
for(let k of [-1,1]){let x=k===-1?458:902;ctx.save();ctx.translate(x,191);ctx.fillStyle='#0d0d24';rr(-22,-45,44,120,9);ctx.fill();ctx.strokeStyle='#7454bc';ctx.stroke();for(let i=0;i<3;i++){ellipse(0,-26+i*42,16,16,'#0a0c1c');ellipse(0,-26+i*42,10,10,i%2?'#c65cff':'#52d6ff')}ctx.restore()}
// DJ with headphones
ellipse(680,202,24,7,'#06091666');ellipse(680,163,20,22,'#ebae8d');ellipse(680,135,26,19,'#2c183e');rect(659,180,42,53,'#8334ab');rr(652,215,57,15,5);ctx.fillStyle='#24203d';ctx.fill();for(let i of [-1,1]){ellipse(680+i*18,221,12,7,'#58b5ec');ellipse(680+i*18,221,7,4,'#21102c')};ctx.strokeStyle='#7bf6ff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(680,160,25,Math.PI*1.08,Math.PI*1.92);ctx.stroke();
let ballY=34+Math.sin(t)*4;ctx.save();ctx.shadowBlur=22;ctx.shadowColor='#e9ddff';ellipse(680,ballY,18,18,'#d1e8ff');ctx.shadowBlur=0;for(let i=-12;i<=12;i+=9){line(662,ballY+i,698,ballY+i,'#7479cd',2)}ctx.restore();
if(quality!=='low'){const glows=[['#be4ded',455,155,-.56],['#38d8fc',905,155,.6],['#ed5998',580,70,.4],['#c0a3ff',790,70,-.4]];for(const [col,x,y,angle] of glows){ctx.save();ctx.translate(x,y);ctx.rotate(angle+.18*Math.sin(t*1.1+x));const g=ctx.createLinearGradient(0,0,0,540);g.addColorStop(0,col+'55');g.addColorStop(1,col+'00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(-115,540);ctx.lineTo(115,540);ctx.closePath();ctx.fill();ctx.restore()}}ctx.restore()}
function drawDanceFloor(t,energy){ctx.save();const djAccent=djVotes.xanh>djVotes.hong?'#46dcff':djVotes.hong>djVotes.xanh?'#ff64cb':'#a656fb';let x=398,y=305,w=567,h=398;ctx.shadowColor=djAccent;ctx.shadowBlur=28;rr(x-7,y-7,w+14,h+14,20);ctx.fillStyle='#30205a';ctx.fill();ctx.strokeStyle=djAccent;ctx.lineWidth=5;ctx.stroke();ctx.shadowBlur=0;rr(x,y,w,h,15);ctx.clip();rect(x,y,w,h,'#241c4d');let cols=9,rows=7,tw=w/cols,th=h/rows;for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){let q=Math.sin(t*2.6+i*.9+j*.65),a=(q+1)*.5;ctx.fillStyle=(i+j)%3===0?`rgba(228,64,189,${.10+a*.14})`:(i+j)%3===1?`rgba(52,207,247,${.09+a*.15})`:`rgba(141,94,244,${.1+a*.18})`;rect(x+i*tw+2,y+j*th+2,tw-4,th-4,ctx.fillStyle)}for(let j=0;j<=rows;j++)line(x,y+j*th,x+w,y+j*th,'#e2c4ff28',2);for(let i=0;i<=cols;i++)line(x+i*tw,y,x+i*tw,y+h,'#e2c4ff20',2);ctx.save();ctx.globalAlpha=.1+.11*energy;ctx.fillStyle=createGradient(678,509,220,'#ffd4ff','#ffffff00');ctx.fillRect(x,y,w,h);ctx.restore();label('DANCE FLOOR',680,683,14,'#ffffff55');ctx.restore()}
function drawBar(t){ctx.save();neonPanel(40,105,328,195,'🍸  NEON BAR','#fa75bc');rect(53,144,304,30,'#2f2545');for(let i=0;i<12;i++){const x=68+i*24,h=15+(i*7%17);rect(x,151-h,10,h,colors[i%colors.length]);rect(x+2,149-h,6,4,'#c9e6ef')};rr(32,262,349,77,18);ctx.fillStyle='#9a4c82';ctx.fill();ctx.strokeStyle='#ff91c7';ctx.lineWidth=4;ctx.stroke();rect(52,299,310,34,'#542955');for(let i=0;i<9;i++){ellipse(71+i*35,300,5,3,'#f3b5c8')};label('BARTENDER  ✦  MOCKTAIL',205,292,13,'#ffe2ec');for(let i=0;i<4;i++){const x=70+i*89;ellipse(x,371,26,9,'#100e1d99');rect(x-4,343,8,25,'#522a66');ellipse(x,341,24,11,'#8d5b9c')};ctx.restore()}
function drawFood(t){ctx.save();neonPanel(48,563,317,206,'🍕  FOOD CORNER','#ffbd6a');rr(67,618,275,62,12);ctx.fillStyle='#543f5a';ctx.fill();ctx.strokeStyle='#d989b7';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<6;i++)label(['🍕','🍔','🍣','🍟','🍰','🍗'][i],95+i*43,643,25);rr(83,709,255,42,11);ctx.fillStyle='#4d2d49';ctx.fill();label('FRESH FOOD  •  PARTY BITES',210,730,11,'#f8d9a4');ctx.restore()}
function drawVIP(t){ctx.save();neonPanel(1040,106,286,206,'♛  VIP LOUNGE','#8aa4ff');rr(1065,171,229,69,17);ctx.fillStyle='#62427e';ctx.fill();rr(1086,189,187,38,12);ctx.fillStyle='#9f649f';ctx.fill();ellipse(1179,266,56,19,'#110f2599');ellipse(1179,258,54,18,'#4a4271');ellipse(1179,253,45,11,'#a48abd');for(let i=0;i<3;i++)label('✦',1121+i*58,246,14,colors[i]);label('GOLDEN HOUR',1179,291,12,'#b1a9f6');neonPanel(1050,580,267,156,'📷  PHOTO BOOTH','#6edbfa');rr(1077,617,211,88,12);ctx.fillStyle='#32204d';ctx.fill();ctx.strokeStyle='#da91f6';ctx.stroke();label('✦   SAY PARTY!   ✦',1182,663,19,'#fbb3ef');ctx.restore()}
function drawTable(x,y,w=1){ctx.save();ellipse(x,y+14,47*w,16*w,'#0000005c');ellipse(x,y,44*w,18*w,'#a664aa');ellipse(x,y-5,37*w,13*w,'#e3a0db');ellipse(x+7*w,y-7*w,6*w,6*w,'#f8a7cf');ellipse(x-11*w,y-6*w,7*w,4*w,'#f4c277');ctx.restore()}
function drawDecor(t){drawTable(320,478,.9);drawTable(1081,467,.9);drawTable(1010,764,.68);drawTable(195,487,.8);for(const [x,y,c] of [[393,301,'#e3a1fc'],[985,302,'#6bd8f6'],[410,710,'#d285f9'],[976,710,'#71e0ee']]){ctx.save();ctx.shadowColor=c;ctx.shadowBlur=18;ellipse(x,y,5,5,c);ctx.restore()}label('🍹',1230,380,27);label('🍕',350,745,19)}
function drawPerson(c,t,energy){if(c.y<210)return;const dt=c.seed||0,bob=c.action==='dance'?Math.sin(t*12+dt)*6:Math.sin(t*2.4+dt)*2;ctx.save();ctx.translate(c.x,c.y+bob);const z=c.id==='you'?1.08:1;ctx.scale(z,z);ellipse(0,3,22,7,'#0507166e');let walk=Math.hypot(c.tx-c.x,c.ty-c.y)>7?Math.sin(t*13+dt)*5:0;ctx.lineWidth=5;ctx.lineCap='round';ctx.strokeStyle='#261c33';line(-9,-5,-9+walk,8,'#362547',6);line(9,-5,9-walk,8,'#342643',6);ellipse(-9+walk,8,7,3,'#f5dfeb');ellipse(9-walk,8,7,3,'#f5dfeb');rr(-16,-34,32,31,9);ctx.fillStyle=c.color;ctx.fill();rr(-10,-30,20,10,5);ctx.fillStyle='#ffffff30';ctx.fill();ctx.strokeStyle=c.skin;ctx.lineWidth=6;const arm=c.action==='dance'?Math.sin(t*8+dt)*13:0;line(-14,-27,-22,-11-arm,c.skin,6);line(14,-27,22,-11+arm,c.skin,6);ellipse(0,-53,23,22,c.skin);ellipse(-22,-49,4,6,c.skin);ellipse(22,-49,4,6,c.skin);
ctx.fillStyle=c.hair;ctx.beginPath();ctx.arc(0,-57,24,Math.PI,Math.PI*1.94);ctx.lineTo(22,-53);ctx.quadraticCurveTo(10,-64,5,-69);ctx.quadraticCurveTo(-10,-57,-24,-53);ctx.closePath();ctx.fill();ellipse(-7,-51,2.2,2.8,'#2a1f37');ellipse(8,-51,2.2,2.8,'#2a1f37');ellipse(-15,-45,4,2,'#ef8f91aa');ellipse(14,-45,4,2,'#ef8f91aa');ctx.strokeStyle='#762e5f';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-47,4,.08,3.02);ctx.stroke();
if(c.action==='cheers'){label(c.prop||'🍹',24,-39,23)}else if(c.action==='eat'){label(c.prop||'🍕',24,-41,24)}else if(c.action==='giftbox'){label(c.prop||'🎁',0,-104+Math.sin(t*4)*5,26)}else if(c.action==='wave'){label('👋',26,-54,20)}else if(c.action==='dance'){label('♪',28,-77-Math.sin(t*6+dt)*9,14,c.color)}
ctx.save();ctx.shadowColor=c.id===selectedId?'#fc96ff':'#0000';ctx.shadowBlur=c.id===selectedId?16:0;rr(-40,-111,80,26,10);ctx.fillStyle='#15122de8';ctx.fill();ctx.strokeStyle=c.id===selectedId?'#ff8edc':'#ffffff44';ctx.lineWidth=c.id===selectedId?2:1;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(-28,-98,9,0,Math.PI*2);ctx.fillStyle=c.color;ctx.fill();if(c.img){ctx.save();ctx.beginPath();ctx.arc(-28,-98,8.5,0,Math.PI*2);ctx.clip();ctx.drawImage(c.img,-36.5,-106.5,17,17);ctx.restore()}else label([...(c.name||'?')][0].toUpperCase(),-28,-98,10,'#fff');label(c.name.length>10?c.name.slice(0,9)+'…':c.name,4,-98,10,'#fff');ctx.restore();ctx.restore()}
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
function update(dt,t){if(!demoLocked){for(let i=waiters.length-1;i>=0;i--){const w=waiters[i];if(t>w.removeAt){waiters.splice(i,1);continue}const dist=Math.hypot(w.tx-w.x,w.ty-w.y);if(dist>4){const step=Math.min(dist,220*dt);w.x+=(w.tx-w.x)/dist*step;w.y+=(w.ty-w.y)/dist*step}}for(const c of chars){if(!c.seed)c.seed=Math.random()*10;const dx=c.tx-c.x,dy=c.ty-c.y,dist=Math.hypot(dx,dy);if(dist>4){let sp=Math.min(dist,(c.action==='dance'?95:68)*dt);c.x+=dx/dist*sp;c.y+=dy/dist*sp}else if(Math.random()<dt*.25){if(c.action==='idle'||c.action==='dance'){if(Math.random()<.75)goTo(c,c.zone?(Math.random()<.76?c.zone:'dance'):(Math.random()<.5?'dance':Math.random()<.6?'bar':'food'))}}if(c.until&&t>c.until){c.action='idle';c.until=0;c.prop=''}}}if(activePartyUntil&&t>activePartyUntil){activePartyUntil=0;$('partyStatus').innerHTML='<span class="pulse-spot">✦</span><span>ĐÊM HỘI NEON <b>PARTY TIME</b></span>'}}
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
 label('★ NHÂN VẬT CHÍNH ★',c.x,c.y-186,18,'#fff2b9');
 label(c.name.slice(0,18),c.x,c.y-166,18,'#fff');
 ctx.restore();
}
function render(t){let dt=last?Math.min((t-last)/1000,.06):0;last=t;clock+=dt;update(dt,t);updateCameraRig(dt,t);let bgEnergy=beat();const mobile=cw<700;const fit=mobile?Math.min(cw/850,ch/1000):Math.min(cw/1940,ch/1180);scale=fit*cam.zoom;viewX=cw*.5-cam.x*scale;viewY=ch*.5-cam.y*scale;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cw,ch);const ambient=ctx.createLinearGradient(0,0,0,ch);ambient.addColorStop(0,'#201538');ambient.addColorStop(.6,'#16152d');ambient.addColorStop(1,'#101a2c');ctx.fillStyle=ambient;ctx.fillRect(0,0,cw,ch);ctx.save();ctx.translate(viewX,viewY);ctx.scale(scale,scale);drawBackground(clock);drawVenueExpansion(clock,bgEnergy);drawRealisticFinishes(clock,bgEnergy);drawStage(clock,bgEnergy);drawDanceFloor(clock,bgEnergy);drawBar(clock);drawFood(clock);drawVIP(clock);drawDecor(clock);for(const c of [...chars,...waiters].sort((a,b)=>a.y-b.y)){
 ctx.save();if(giftShot&&c!==giftShot.character)ctx.globalAlpha=.32;
 if(giftShot&&c===giftShot.character){ctx.translate(c.x,c.y);ctx.scale(1.32,1.32);ctx.translate(-c.x,-c.y)}
 drawPerson(c,clock,bgEnergy);ctx.restore();
 }
 ctx.save();if(giftShot)ctx.globalAlpha=.35;drawResidentDancers(clock,bgEnergy);ctx.restore();
 if(giftShot)drawGiftHeroScene(giftShot.character,clock);
 drawEffects(dt,clock);ctx.restore();if((ticker++%22)===0)paintMiniMap();requestAnimationFrame(render)}
function photo(){const a=document.createElement('a');a.download='Neon_Party_Ky_Niem.png';a.href=canvas.toDataURL('image/png');a.click();toast('📷 Đã tạo ảnh kỷ niệm từ khung hình hiện tại!')}
function connectServer(){if(!backendBase || !/^https?:$/.test(new URL(backendBase).protocol))return;fetch(apiEndpoint('/api/status'),{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(st=>{if(st.server){serverLive=!!st.live;updateMode(st.live);streamSource=new EventSource(apiEndpoint('/api/events'));streamSource.onerror=()=>{serverLive=false;updateMode(false)};streamSource.onmessage=e=>{try{let msg=JSON.parse(e.data);eventScope=msg.source==='tiktok'?'tiktok':'demo';if(msg.type==='status'){serverLive=!!msg.live;updateMode(serverLive)}else if(msg.type==='viewer'){addPerson(msg.name,msg.avatar)}else if(msg.type==='like')actionHeart(msg.count||1,findOrCreate(msg.name,msg.avatar));else if(msg.type==='share')actionShare(msg.count||1,findOrCreate(msg.name,msg.avatar));else if(msg.type==='gift')actionGift(msg.tier||2,findOrCreate(msg.name,msg.avatar),msg.giftName||'TikTok Gift');else if(msg.type==='comment')processComment(msg.name,msg.comment,msg.avatar);else if(msg.type==='follow')feed(msg.name,'đã theo dõi chủ phòng!','⭐');else if(msg.type==='party')party(msg.name||'PARTY LIVE');eventScope='demo'}catch(err){console.warn('SSE message error:',err)}}}}).catch(()=>{})}
function updateMode(live){$('modeLabel').innerHTML='<span class="mode-dot"></span> '+(live?'LIVE CONNECTED':'CHẾ ĐỘ DEMO');document.querySelectorAll('.hint-mode').forEach(x=>x.textContent=live?'SỰ KIỆN PHIÊN LIVE':'CHẠY THỬ TRỰC TIẾP');}
function findOrCreate(name,avatar){if(!name)return self;let c=chars.find(c=>c.name===name);if(c){if(avatar)updateAvatar(c,avatar);return c}return addPerson(name,avatar)||self}
function processComment(name,comment,avatar=''){
 const c=findOrCreate(name,avatar);const text=String(comment||'').trim().toLowerCase();
 const food={'!pizza':menuFoods[0],'!burger':menuFoods[1],'!sushi':menuFoods[2],'!soda':menuDrinks[1],'!mocktail':menuDrinks[0]};
 if(text==='!dance')actionDancePair(c);
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
 else if(text==='!join'){feed(c.name,'đã vào quán bằng lệnh !join','👋')}
 else {feed(c.name,comment,'💬');displayText(c.x,c.y-128,String(comment).slice(0,25),'#f3d0fc')}
}

function bind(){
$('enterBtn').addEventListener('click',()=>{$('entryScreen').style.display='none';startAudio();toast('🎉 Chào mừng tới NEON PARTY LIVE!');puff(self.x,self.y-90,'spark',25)});
$('enterSilent').addEventListener('click',()=>{$('entryScreen').style.display='none';soundActivated=false;toast('Bạn đã vào quán. Bấm ♫ nếu muốn bật nhạc.')});
$('entryVol').addEventListener('input',e=>setVolume(e.target.value));$('volSlider').addEventListener('input',e=>setVolume(e.target.value));$('muteBtn').addEventListener('click',()=>{if(!isPlaying){muted=false;startAudio()}else{muted=!muted;audio.volume=muted?0:volume;syncAudioUI()}});
$('settingsTop').addEventListener('click',settingsModal);$('closeModal').addEventListener('click',closeModal);$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closePlayPanel()}});
$('actHeart').addEventListener('click',()=>actionHeart(100));$('actShare').addEventListener('click',()=>actionShare(5));$('actGift').addEventListener('click',giftModal);$('actDance').addEventListener('click',()=>party());$('actJoin').addEventListener('click',()=>joinModal());$('actFood').addEventListener('click',()=>foodModal(false));$('actDrink').addEventListener('click',()=>foodModal(true));$('actPhoto').addEventListener('click',photo);$('editSelf').addEventListener('click',()=>joinModal(true));
document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>setCameraMode(b.dataset.camera)));$('stageCamera').addEventListener('click',()=>setCameraMode(['auto','wide','overview','cinema','dj','dance','bar','food','vip','photo','lounge','garden','entrance','rooftop','chill','follow'][(Math.max(0,['auto','wide','overview','cinema','dj','dance','bar','food','vip','photo','lounge','garden','entrance','rooftop','chill','follow'].indexOf(cameraMode))+1)%16]));$('stageActions').addEventListener('click',openPlayPanel);$('stageGift').addEventListener('click',giftModal);$('closePlayPanel').addEventListener('click',closePlayPanel);$('playPanelBackdrop').addEventListener('click',e=>{if(e.target===$('playPanelBackdrop'))closePlayPanel()});document.querySelectorAll('[data-play]').forEach(b=>b.addEventListener('click',()=>{const fn=playActions[b.dataset.play];closePlayPanel();if(fn)fn()}));$('actDancers').addEventListener('click',()=>triggerDancerShow('duo'));$('actVotePink').addEventListener('click',()=>actionVote('hong'));$('actVoteBlue').addEventListener('click',()=>actionVote('xanh'));$('actCheers').addEventListener('click',()=>actionCheers());$('actAdmin').addEventListener('click',adminModal);$('actReset').addEventListener('click',()=>{resetCharacters();feed('Hệ thống','đã khởi tạo lại buổi tiệc DEMO.','✦');toast('Đã làm mới phiên DEMO.')});
$('miniMapToggle').addEventListener('click',()=>{const a=$('miniMapPanel');a.hidden=!a.hidden;$('miniMapToggle').setAttribute('aria-expanded',String(!a.hidden));paintMiniMap()});
 $('miniMapClose').addEventListener('click',()=>{$('miniMapPanel').hidden=true;$('miniMapToggle').setAttribute('aria-expanded','false')});
 $('miniMap').addEventListener('click',e=>{const r=$('miniMap').getBoundingClientRect();const x=clamp((e.clientX-r.left)/r.width*W,120,W-120),y=clamp((e.clientY-r.top)/r.height*H,180,H-100);cameraMode='free';cameraAim={x,y,zoom:1.05};updateCameraButtons();toast('🧭 Đã di chuyển camera tới khu vực đã chọn')});
 $('zoomIn').addEventListener('click',()=>{if(giftShot)setCameraMode('wide');cameraMode='free';cameraAim={x:cam.x,y:cam.y,zoom:clamp(cam.zoom*1.18,.38,3.4)};updateCameraButtons()});$('zoomOut').addEventListener('click',()=>{if(giftShot)setCameraMode('wide');cameraMode='free';cameraAim={x:cam.x,y:cam.y,zoom:clamp(cam.zoom/1.18,.38,3.4)};updateCameraButtons()});$('btnFull').addEventListener('click',()=>{const el=$('canvasWrap');if(!document.fullscreenElement&&el.requestFullscreen)el.requestFullscreen().catch(()=>{});else if(document.exitFullscreen)document.exitFullscreen()});
const track=(e)=>{const box=canvas.getBoundingClientRect();return {x:e.clientX-box.left,y:e.clientY-box.top}};
canvas.addEventListener('pointerdown',e=>{let p=track(e);drag={startX:p.x,startY:p.y,camX:cam.x,camY:cam.y,moved:false};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=track(e),dx=p.x-drag.startX,dy=p.y-drag.startY;if(Math.abs(dx)+Math.abs(dy)>8)drag.moved=true;if(drag.moved){if(giftShot){giftShot=null;giftShotQueue=[];$('heroOverlay').hidden=true}cameraMode='free';cameraAim={x:clamp(drag.camX-dx/scale,90,W-90),y:clamp(drag.camY-dy/scale,125,H-85),zoom:cam.zoom};cam.x=cameraAim.x;cam.y=cameraAim.y;updateCameraButtons()}});canvas.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved)return;let p=track(e),pt=coords(p.x,p.y);let nearest=null,dist=60;for(const c of chars){let d=Math.hypot(pt.x-c.x,pt.y-(c.y-45));if(d<dist){dist=d;nearest=c}}let pro=null,proDist=76;for(const d of residentDancers){const dd=Math.hypot(pt.x-d.x,pt.y-(d.y-65));if(dd<proDist){proDist=dd;pro=d}}if(pro)openResidentDancer(pro);else if(nearest)openCharacter(nearest)});canvas.addEventListener('wheel',e=>{e.preventDefault();cameraMode='free';cameraAim={x:cam.x,y:cam.y,zoom:clamp(cam.zoom*(e.deltaY<0?1.09:.91),.38,3.4)};updateCameraButtons()},{passive:false});
audio.addEventListener('timeupdate',()=>$('timeDisplay').textContent=musicTime());audio.addEventListener('ended',()=>{isPlaying=false;syncAudioUI()});audio.addEventListener('error',()=>{toast('Không tải được bản nhạc. Kiểm tra file âm thanh đi kèm.');isPlaying=false;syncAudioUI()});
window.addEventListener('resize',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);resize();
if(overlay){setCameraMode('auto');document.body.classList.add('overlay-mode');$('entryScreen').style.display='none';document.title='NEON PARTY · OBS OVERLAY';setTimeout(()=>toast('Overlay: nhấn màn hình để bật âm thanh nếu cần.'),1800)}
}
resetCharacters();$('selfName').textContent=self.name;$('selfAvatar').textContent=[...self.name][0].toUpperCase();bind();syncAudioUI();bots.forEach((m,i)=>setTimeout(()=>feed(['Neon Party','DJ Neon','Bartender'][i],m,['✨','🎧','🍹'][i]),200+i*350));requestAnimationFrame(render);connectServer();if(sameOriginBackend && new URLSearchParams(location.search).has('admin'))setTimeout(adminModal,450);
})();
