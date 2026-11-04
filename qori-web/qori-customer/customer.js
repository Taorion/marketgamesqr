/* Public copy, initial illustrations and portal links remain usable without JavaScript. */
(()=>{'use strict';
 for(const explorer of document.querySelectorAll('[data-explorer]')){
  const tabs=[...explorer.querySelectorAll('[role=tab]')],panel=explorer.querySelector('[role=tabpanel]'),image=panel.querySelector('img'),title=panel.querySelector('[data-preview-title]'),description=panel.querySelector('[data-preview-description]');
  description.setAttribute('aria-live','polite');
  function select(tab,focus=false){
   for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;}
   image.srcset=tab.dataset.srcset;image.src=tab.dataset.image;image.width=Number(tab.dataset.width);image.height=Number(tab.dataset.height);image.alt='Ilustración de '+tab.dataset.title;
   title.textContent=tab.dataset.title;description.textContent=tab.dataset.description;panel.setAttribute('aria-labelledby',tab.id);
   if(focus)tab.focus();
  }
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',e=>{
   let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;
   e.preventDefault();select(tabs[next],true);
  });});
 }
 for(const menu of document.querySelectorAll('.qc-mobile-menu')){
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.open=false;}));
  menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
 }
})();
