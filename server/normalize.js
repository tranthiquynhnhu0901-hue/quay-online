/** Normalize both recent and older tiktok-live-connector payload layouts.
 * These are third-party Webcast events, never proof of user identity/transactions.
 */
'use strict';
const clean=(v,max=64)=>String(v??'').slice(0,max);
const number=(v, fallback=0, upper=100000)=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(Math.floor(n),upper)):fallback};
function userOf(d){return d?.user||d?.userInfo||d||{}}
function identity(d){const u=userOf(d),name=clean(u.uniqueId||u.unique_id||d?.uniqueId||u.nickname||d?.nickname||'',32);let av=u.profilePictureUrl||u.avatarUrl||d?.profilePictureUrl||d?.avatarUrl||u.avatarThumb?.urlList?.[0]||u.avatarMedium?.urlList?.[0]||u.profilePicture?.urls?.[0]||'';if(Array.isArray(av))av=av[0]||'';return {name:name||'Người xem',viewerKey:clean(u.uniqueId||u.unique_id||u.userId||u.id||d?.uniqueId||'',72),avatar:typeof av==='string'&&/^https:\/\//.test(av)?av.slice(0,2000):''}}
function tierFor(value){return value>=5000?6:value>=1000?5:value>=200?4:value>=50?3:value>=10?2:1}
function normalize(type,d){const u=identity(d),base={...u,source:'tiktok'}, id=clean(d?.msgId||d?.messageId||d?.message?.msgId||'',128);
if(id)base.eventId=id;
if(u.name==='Người xem')return null; // Ignore events without a usable user identifier; do not create a fake shared guest.
if(type==='member'||type==='join')return {...base,type:'viewer'};
if(type==='chat'||type==='comment')return {...base,type:'comment',comment:clean(d?.comment||d?.message?.text||'',180)};
if(type==='like'){const count=number(d?.likeCount??d?.count,0,10000);return count>0?{...base,type:'like',count}:null}
if(type==='share')return {...base,type:'share',count:1};
if(type==='follow')return {...base,type:'follow'};
if(type==='social'){
  // Social may mean FOLLOW OR SHARE. Never count non-share social events as shares.
  const label=clean(d?.label||d?.displayType||d?.eventType||d?.action||'',120).toLowerCase();
  if(d?.isShare===true||(/share|chia s[eẻ]/.test(label)&&!/follow|theo d[oõ]i/.test(label)))return {...base,type:'share',count:1};
  if(d?.isFollow===true||/follow|theo d[oõ]i/.test(label))return {...base,type:'follow'};
  return null;
}
if(type==='gift'){
 const gift=d?.gift||{};
 const giftType=number(d?.giftType??gift.giftType??gift.type,0,10);
 if(giftType===1&&!(d?.repeatEnd===true||d?.repeatEnd===1))return null; // process only final streak
 const count=Math.max(1,number(d?.repeatCount??d?.giftCount??1,1,10000));
 const perGift=number(d?.diamondCount??gift.diamondCount??gift.diamond_count,0,1000000);
 return {...base,type:'gift',giftName:clean(d?.giftName||gift.name||'Quà TikTok',80),giftId:clean(d?.giftId||gift.id||'',64),count,tier:tierFor(perGift*count)};
}
return null;
}
module.exports={normalize,identity,tierFor};
