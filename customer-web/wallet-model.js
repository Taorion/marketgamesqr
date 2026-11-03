(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.QoriWallet=model;})(globalThis,()=>{
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const historical=card=>['ARCHIVED','EXPIRED'].includes(card.status);
  function groups(cards,{search='',kind='ALL',status='ACTIVE'}={}){
    const term=normalize(search).trim();
    const filtered=cards.filter(card=>(kind==='ALL'||card.kind===kind)&&
      (status==='ALL'||(status==='READY'?card.status==='READY':status==='HISTORY'?historical(card):!historical(card)))&&
      (!term||normalize([card.business_name,card.title,card.reward].join(' ')).includes(term)));
    const byBusiness=new Map();
    for(const card of filtered){
      const key=card.business_id;
      if(!byBusiness.has(key))byBusiness.set(key,{id:key,name:card.business_name,cards:[]});
      byBusiness.get(key).cards.push(card);
    }
    return [...byBusiness.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }
  function counts(cards){return {total:cards.length,active:cards.filter(c=>!historical(c)).length,ready:cards.filter(c=>c.status==='READY').length,businesses:new Set(cards.map(c=>c.business_id)).size};}
  return {groups,counts,historical};
});
