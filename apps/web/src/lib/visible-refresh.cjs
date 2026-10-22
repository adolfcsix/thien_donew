'use strict';
/** Refresh immediately on tab return; coalesce the paired visibility/focus events.
 * Hidden transitions reset the window so a quick genuine return is never skipped. */
function subscribeVisibleRefresh(windowTarget,documentTarget,refresh,cooldownMs=250,now=Date.now){
 if(!Number.isFinite(cooldownMs)||cooldownMs<0)throw new RangeError('Invalid refresh cooldown');
 let previous=null;
 const check=(event)=>{
  if(documentTarget.visibilityState!=='visible'){previous=null;return;}
  const current=now();
  const paired=previous!==null&&previous.type!==event.type&&current>=previous.time&&current-previous.time<cooldownMs;
  previous={time:current,type:event.type};
  if(!paired)refresh();
 };
 windowTarget.addEventListener('focus',check);
 documentTarget.addEventListener('visibilitychange',check);
 return()=>{windowTarget.removeEventListener('focus',check);documentTarget.removeEventListener('visibilitychange',check);};
}
module.exports={subscribeVisibleRefresh};
