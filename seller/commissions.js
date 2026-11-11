(()=>{'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(v||0));
 function render(host,policy){
  if(!host||!policy?.plans)return;
  host.innerHTML='<h2>Tu comisión, mes a mes</h2><p>Clientes nuevos desde la activación del esquema VF1. Cada negocio tiene sus propios seis meses de cobertura paga; requiere suscripción activa.</p><div class="table-wrap" tabindex="0" role="region" aria-label="Comisiones de los seis meses por plan"><table><thead><tr><th scope="col">Plan / base mensual fija</th>'+Array.from({length:6},(_,i)=>'<th scope="col">Mes '+(i+1)+'</th>').join('')+'<th scope="col">Total de seis meses activos</th></tr></thead><tbody>'+policy.plans.map(p=>'<tr><th scope="row">'+esc(p.name)+'<br>'+money(p.monthly_price_cop)+'</th>'+p.months.map(m=>'<td>'+money(m.reference_commission_cop)+'<br><small>'+Math.round(Number(m.rate)*100)+'%</small></td>').join('')+'<td><strong>'+money(p.reference_total_cop)+'</strong></td></tr>').join('')+'</tbody></table></div><p class="small">Base fija incluso con descuentos o pago anual. El pago anual causa comisiones mes a mes; desde el mes 7 no hay comisión de suscripción. Cambiar de plan o vendedor no reinicia el plazo. Los clientes anteriores conservan el 10% de cada pago de plan. Tickets: 10% del valor cobrado en todos los casos. Importes brutos; no son ingresos garantizados.</p>';
 }
 window.QoriSellerCommissions={render};
})();
