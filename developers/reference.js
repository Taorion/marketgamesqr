'use strict';
fetch('/developers/openapi.yaml',{cache:'no-store'}).then(r=>r.json()).then(spec=>{
 const target=document.getElementById('reference'),items=[];
 for(const [path,methods] of Object.entries(spec.paths))for(const [method,operation]of Object.entries(methods)){
 const details=document.createElement('details'),title=document.createElement('summary'),pre=document.createElement('pre');
 title.textContent=method.toUpperCase()+' '+path+' — '+operation.summary;pre.textContent=JSON.stringify(operation,null,2);details.append(title,pre);target.append(details);items.push(details);
 }
 document.getElementById('operation-search').oninput=e=>items.forEach(d=>d.hidden=!d.textContent.toLowerCase().includes(e.target.value.toLowerCase()));
}).catch(()=>{document.getElementById('reference').textContent='No se pudo cargar la especificación.';});
