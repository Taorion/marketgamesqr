'use strict';
const frame=document.getElementById('player'),origin=location.origin;frame.src='/play/screen/?parent_origin='+encodeURIComponent(origin);
document.getElementById('pause').onclick=()=>frame.contentWindow.postMessage({type:'qori-play:pause'},origin);
document.getElementById('resume').onclick=()=>frame.contentWindow.postMessage({type:'qori-play:resume'},origin);
window.addEventListener('message',e=>{if(e.origin===origin&&e.source===frame.contentWindow&&e.data?.type==='qori-play:state')document.getElementById('status').textContent=e.data.status;});
