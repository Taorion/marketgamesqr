const { SaxesParser } = require('saxes');
const { minor, CATEGORIES } = require('../services/customerFinance');
const { hash, identity, fault } = require('./config');
const CBC='urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const CAC='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
const VERSION='qori-ubl-sandbox-1';
const invalid=()=>fault(422,'UNSUPPORTED_OR_INVALID_XML');
function tree(xml) {
  if(typeof xml!=='string'||Buffer.byteLength(xml)>524288||!xml.trim()||/<!DOCTYPE|<!ENTITY/i.test(xml))throw invalid();
  const stack=[];let root,count=0;
  const parser=new SaxesParser({xmlns:true});
  parser.on('error',()=>{throw invalid();});
  parser.on('doctype',()=>{throw invalid();});
  parser.on('processinginstruction',()=>{throw invalid();});
  parser.on('opentag',tag=>{
    if(++count>20000||stack.length>=48)throw invalid();
    const node={local:tag.local,uri:tag.uri,attrs:tag.attributes,text:'',children:[]};
    if(stack.length)stack.at(-1).children.push(node);else {if(root)throw invalid();root=node;}
    stack.push(node);
  });
  const text=value=>{if(stack.length)stack.at(-1).text+=value;};
  parser.on('text',text);parser.on('cdata',text);parser.on('closetag',()=>stack.pop());
  try {parser.write(xml).close();}catch{throw invalid();}
  if(!root)throw invalid();return root;
}
const children=(n,name,uri=CAC)=>n.children.filter(c=>c.local===name&&c.uri===uri);
function one(n,name,uri=CAC,required=true) {
  const found=children(n,name,uri);if(found.length>1||required&&!found.length)throw invalid();return found[0];
}
function value(n,name,required=true) {
  const item=one(n,name,CBC,required);
  if(!item)return null;if(item.children.length)throw invalid();
  const s=item.text.trim();if(required&&!s||s.length>2000)throw invalid();return s;
}
function money(n,name,currency,required=true) {
  const item=one(n,name,CBC,required);if(!item)return 0;
  if(item.attrs.currencyID?.value!==currency||item.children.length)throw invalid();
  const s=item.text.trim();if(!/^\d{1,10}(\.\d{1,2})?$/.test(s))throw invalid();
  return minor(s);
}
const sum=(rows,field)=>{const n=rows.reduce((a,r)=>a+r[field],0);if(!Number.isSafeInteger(n))throw invalid();return n;};
const equal=(a,b)=>{if(a!==b)throw invalid();};
function taxes(n,currency,kind='TaxTotal') {
  return children(n,kind).map((total,i)=>({
    amount_minor:money(total,'TaxAmount',currency),
    path:kind+'['+(i+1)+']',
    subtotals:children(total,'TaxSubtotal').map(s=>{
      const cat=one(s,'TaxCategory'),scheme=one(cat,'TaxScheme');
      const percent=value(cat,'Percent',false);
      if(percent!==null&&!/^\d{1,3}(\.\d{1,6})?$/.test(percent))throw invalid();
      return {base_minor:money(s,'TaxableAmount',currency,false),amount_minor:money(s,'TaxAmount',currency),
        percent,code:value(scheme,'ID'),name:value(scheme,'Name',false)};
    })
  })).map(t=>{if(t.subtotals.length)equal(sum(t.subtotals,'amount_minor'),t.amount_minor);return t;});
}
function adjustments(n,currency) {
  return children(n,'AllowanceCharge').map(a=>{
    const flag=value(a,'ChargeIndicator');if(!['true','false'].includes(flag))throw invalid();
    return {charge:flag==='true',amount_minor:money(a,'Amount',currency),reason:value(a,'AllowanceChargeReason',false)};
  });
}
function party(root,name) {
  const p=one(one(root,name),'Party'),tax=one(p,'PartyTaxScheme');
  const id=one(tax,'CompanyID',CBC),code=id.text.trim();
  const nameValue=value(tax,'RegistrationName',false)||value(one(p,'PartyName'),'Name');
  if(!/^[A-Z0-9]{3,30}$/.test(code))throw invalid();
  return {id:code,type:id.attrs.schemeName?.value||'',name:nameValue};
}
function scaled(s) {
  if(!/^\d{1,10}(\.\d{1,6})?$/.test(s))throw invalid();
  const [a,b='']=s.split('.');return BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));
}
function categorize(name) {
  const s=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const category=/\b(arroz|leche|pan|fruta|cafe)\b/.test(s)?'alimentacion':/\b(bus|taxi|gasolina)\b/.test(s)?'transporte':'otros';
  if(!CATEGORIES.includes(category))throw invalid();
  return {category,category_source:'RULE_SUGGESTION',category_confidence:category==='otros'?'LOW':'MEDIUM'};
}
function normalize(xml) {
  const root=tree(xml),type=root.local;
  if(!['Invoice','CreditNote','DebitNote'].includes(type)||root.uri!=='urn:oasis:names:specification:ubl:schema:xsd:'+type+'-2')throw invalid();
  const currency=value(root,'DocumentCurrencyCode');if(!['COP','USD','EUR'].includes(currency))throw invalid();
  const id=value(root,'ID'),uid=value(root,'UUID');
  if(!/^[a-f0-9]{96}$/i.test(uid)||id.length>100)throw invalid();
  const issue=value(root,'IssueDate');if(!/^\d{4}-\d{2}-\d{2}$/.test(issue)||Number.isNaN(Date.parse(issue))||new Date(issue).toISOString().slice(0,10)!==issue)throw invalid();
  const seller=party(root,'AccountingSupplierParty'),buyer=party(root,'AccountingCustomerParty');
  if(seller.type!=='31'||!/^\d{9,10}$/.test(seller.id))throw invalid();
  const buyerHash=identity(buyer.type,buyer.id);
  const lineName={Invoice:'InvoiceLine',CreditNote:'CreditNoteLine',DebitNote:'DebitNoteLine'}[type];
  const quantityName={Invoice:'InvoicedQuantity',CreditNote:'CreditedQuantity',DebitNote:'DebitedQuantity'}[type];
  const rawLines=children(root,lineName);if(!rawLines.length||rawLines.length>500)throw invalid();
  const lines=rawLines.map((l,i)=>{
    const item=one(l,'Item'),quantityNode=one(l,quantityName,CBC),quantity=quantityNode.text.trim();
    if(scaled(quantity)<=0n)throw invalid();
    const priceNode=one(one(l,'Price'),'PriceAmount',CBC),unitPrice=priceNode.text.trim();
    if(priceNode.attrs.currencyID?.value!==currency)throw invalid();
    const baseQuantity=value(one(l,'Price'),'BaseQuantity',false)||'1';
    if(scaled(baseQuantity)<=0n)throw invalid();
    const discounts=adjustments(l,currency),net=money(l,'LineExtensionAmount',currency);
    const expected=(scaled(quantity)*scaled(unitPrice)*100n/scaled(baseQuantity)+500000n)/1000000n;
    const adjusted=Number(expected)+sum(discounts.filter(a=>a.charge),'amount_minor')-sum(discounts.filter(a=>!a.charge),'amount_minor');
    if(Math.abs(adjusted-net)>1)throw invalid();
    const name=value(item,'Name',false)||value(item,'Description');
    return {id:value(l,'ID'),name,quantity,unit:quantityNode.attrs.unitCode?.value||null,unit_price:unitPrice,base_quantity:baseQuantity,
      net_minor:net,taxes:taxes(l,currency),adjustments:discounts,...categorize(name),source_path:'/'+type+'/'+lineName+'['+(i+1)+']'};
  });
  if(new Set(lines.map(l=>l.id)).size!==lines.length)throw invalid();
  const total=one(root,type==='DebitNote'?'RequestedMonetaryTotal':'LegalMonetaryTotal');
  const allTaxes=taxes(root,currency),changes=adjustments(root,currency);
  const net=money(total,'LineExtensionAmount',currency),exclusive=money(total,'TaxExclusiveAmount',currency);
  const inclusive=money(total,'TaxInclusiveAmount',currency),payable=money(total,'PayableAmount',currency);
  const discount=money(total,'AllowanceTotalAmount',currency,false),charge=money(total,'ChargeTotalAmount',currency,false);
  const prepaid=money(total,'PrepaidAmount',currency,false);
  const roundingText=value(total,'PayableRoundingAmount',false)||'0';
  if(!/^-?\d{1,10}(\.\d{1,2})?$/.test(roundingText))throw invalid();
  equal(sum(lines,'net_minor'),net);equal(sum(changes.filter(a=>!a.charge),'amount_minor'),discount);
  equal(sum(changes.filter(a=>a.charge),'amount_minor'),charge);equal(net-discount+charge,exclusive);
  equal(exclusive+sum(allTaxes,'amount_minor'),inclusive);equal(inclusive-prepaid+minor(roundingText),payable);
  let related=null;
  const ref=one(root,'BillingReference',CAC,false);
  if(ref){const doc=one(ref,'InvoiceDocumentReference');related={id:value(doc,'ID'),uuid:value(doc,'UUID')};if(!/^[a-f0-9]{96}$/i.test(related.uuid))throw invalid();}
  if(type!=='Invoice'&&!related)throw invalid();
  const payments=children(root,'PaymentMeans').map(p=>({code:value(p,'PaymentMeansCode'),due_date:value(p,'PaymentDueDate',false)}));
  return {parser_version:VERSION,type,id,uuid:uid.toLowerCase(),currency,issued_on:issue,seller,buyer,buyer_hmac:buyerHash,
    lines,taxes:allTaxes,withholding_taxes:taxes(root,currency,'WithholdingTaxTotal'),adjustments:changes,payment_terms:payments,
    totals:{net_minor:net,tax_minor:sum(allTaxes,'amount_minor'),discount_minor:discount,charge_minor:charge,
      inclusive_minor:inclusive,prepaid_declared_minor:prepaid,payable_minor:payable},
    related,original_sha256:hash(xml),dian_state:'DIAN_NOT_VERIFIED',payment_state:'NOT_EVIDENCED'};
}
module.exports={normalize,VERSION};

