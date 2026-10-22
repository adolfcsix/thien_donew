'use strict';
function render() { renderNav(); const views = { home, chart, ai, calendar, academy, library, community, services, collection }; document.getElementById('view').innerHTML = (views[page] || genericTool)(); document.title = `${labels[page] || 'THIÊN ĐỒ'} — THIÊN ĐỒ V7`; }
render();
initAccount();
const _origRender=render; render=function(){_origRender();if(page==='collection')refreshSaved();};
