(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.QoriWallet=model;})(globalThis,()=>{
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const historical=card=>['ARCHIVED','EXPIRED'].includes(card.status);
  const categories=[['TICKET','Tickets de activación'],['GIFT','Giftcards'],['STAMP','Tarjetas de sellos'],['POINTS','Afiliaciones y puntos'],['USER_GIFT','Invitaciones y regalos de personas']];
  const category=card=>card.benefit_category==='USER_GIFT'||card.kind==='TICKET'&&card.sender_name?'USER_GIFT':card.kind;
  function sections(cards){return categories.map(([kind,title])=>({kind,title,cards:cards.filter(c=>category(c)===kind)}));}
  function groups(cards,{search='',kind='ALL',status='ACTIVE',business_id=''}={}){
    const term=normalize(search).trim();
    const filtered=cards.filter(card=>(!business_id||card.business_id===business_id)&&(kind==='ALL'||category(card)===kind)&&
      (status==='ALL'||(status==='READY'?card.status==='READY':status==='HISTORY'?historical(card):!historical(card)))&&
      (!term||normalize([card.business_name,card.title,card.reward].join(' ')).includes(term)));
    const byBusiness=new Map();
    for(const card of filtered){
      const key=card.business_id;
      if(!byBusiness.has(key))byBusiness.set(key,{id:key,name:card.business_name,cards:[]});
      byBusiness.get(key).cards.push(card);
    }
    return [...byBusiness.values()].map(g=>({...g,sections:sections(g.cards)})).sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
  }
  function counts(cards){return {total:cards.length,active:cards.filter(c=>!historical(c)).length,ready:cards.filter(c=>c.status==='READY').length,businesses:new Set(cards.map(c=>c.business_id)).size};}
  return {groups,counts,historical,categories,category,sections};
});
