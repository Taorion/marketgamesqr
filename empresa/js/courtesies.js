(()=>{window.QoriBusinessCourtesies={open(){
 const host=document.getElementById('courtesiesContent'),scope=JSON.stringify(authHeaders());
 // This is one workspace, not one cell in the portal's multi-column card grid.
 for(const [property,value] of Object.entries({display:'block',width:'100%','min-width':'0','max-width':'100%','grid-column':'1 / -1'}))host.style.setProperty(property,value,'important');
 window.QoriCourtesies.render(host,{business:true,current:()=>scope===JSON.stringify(authHeaders())&&state.currentView==='courtesies',
  actions:{createSale:()=>window.QoriBusinessGiftCreate.open(),orders:()=>window.QoriBusinessGifts.open(),publish:()=>window.QoriCustomerPublishing.open({kind:'PRODUCT'}),validate:()=>setView('validator'),inventory:()=>setView('inventory')},
  request:(path,body)=>api('/api/business/customer/courtesies'+path,{headers:authHeaders(),method:body?'POST':'GET',noClientCache:true,...(body?{body:JSON.stringify(body)}:{})})});
}};})();
