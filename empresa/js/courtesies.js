(()=>{window.QoriBusinessCourtesies={open(){
 const host=document.getElementById('courtesiesContent'),scope=JSON.stringify(authHeaders());
 window.QoriCourtesies.render(host,{business:true,current:()=>scope===JSON.stringify(authHeaders())&&state.currentView==='courtesies',request:(path,body)=>api('/api/business/customer/courtesies'+path,{headers:authHeaders(),method:body?'POST':'GET',noClientCache:true,...(body?{body:JSON.stringify(body)}:{})})});
}};})();
