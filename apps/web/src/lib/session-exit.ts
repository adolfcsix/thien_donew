/** Signals contain no account data or credentials. Storage also covers browsers without BroadcastChannel. */
export const LOGOUT_REVISION_KEY='thiendo.logout-revision.v1';
export function logoutRevision(){try{return window.localStorage.getItem(LOGOUT_REVISION_KEY);}catch{return null;}}
export function publishLogout(){try{window.localStorage.setItem(LOGOUT_REVISION_KEY,String(Date.now())+'-'+Math.random().toString(36).slice(2));}catch{/* BroadcastChannel still works when storage is unavailable. */}}
export function concealSession(){document.documentElement.setAttribute('data-session-suspended','true');}
export function replaceWithOpening(){concealSession();window.location.replace('/');}
