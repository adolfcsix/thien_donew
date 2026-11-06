'use strict';
/** Visual viewport accounts for the iOS keyboard without UA sniffing or disabling zoom. */
function observeDialogViewport(dialog,host){
 const backdrop=dialog?.closest('.account-backdrop'),viewport=host.visualViewport;
 if(!backdrop||!viewport)return ()=>{};
 let frame=null;
 const clear=()=>{backdrop.style.removeProperty('--account-viewport-height');backdrop.style.removeProperty('--account-viewport-top');};
 const sync=()=>{frame=null;if(viewport.scale!==1){clear();return;}const height=viewport.height,top=viewport.offsetTop;if(Number.isFinite(height)&&height>0&&Number.isFinite(top)){backdrop.style.setProperty('--account-viewport-height',height+'px');backdrop.style.setProperty('--account-viewport-top',Math.max(0,top)+'px');}};
 const schedule=()=>{if(frame===null)frame=host.requestAnimationFrame(sync);};
 sync();viewport.addEventListener('resize',schedule);viewport.addEventListener('scroll',schedule);host.addEventListener('resize',schedule);
 return ()=>{if(frame!==null)host.cancelAnimationFrame(frame);viewport.removeEventListener('resize',schedule);viewport.removeEventListener('scroll',schedule);host.removeEventListener('resize',schedule);clear();};
}
module.exports={observeDialogViewport};
