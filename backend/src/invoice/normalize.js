const { SaxesParser } = require('saxes');
const { minor, CATEGORIES } = require('../services/customerFinance');
const { hash, identity, identityCandidates, fault } = require('./config');
const CBC='urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
const CAC='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
const VERSION='qori-ubl-2.1-sandbox-2';
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
const equal=(a,b)=>{if(a!==b)throw fault(422,'ARITHMETIC_REVIEW');};
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
  const location=one(p,'PhysicalLocation',CAC,false),postal=one(p,'PostalAddress',CAC,false);
  const address=location?one(location,'Address',CAC,false):postal;
  const countryNode=address&&one(address,'Country',CAC,false);
  const country=countryNode?value(countryNode,'IdentificationCode'):'CO';
  if(!/^[A-Z]{2}$/.test(country))throw invalid();
  return {id:code,type:id.attrs.schemeName?.value||'',name:nameValue,country,country_source:countryNode?'XML':'DIAN_PROFILE_DEFAULT'};
}
function scaled(s) {
  if(!/^\d{1,10}(\.\d{1,6})?$/.test(s))throw invalid();
  const [a,b='']=s.split('.');return BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));
}
function categorize(name,sku,issuer) {
  let mapping={};try{mapping=JSON.parse(process.env.QORI_INVOICE_CATEGORY_MAPPINGS||'{}');}catch{throw fault(503,'CONFIGURATION_REQUIRED');}
  const explicit=sku?mapping[issuer+'|'+sku]:null;
  if(explicit){if(!CATEGORIES.includes(explicit))throw fault(503,'CONFIGURATION_REQUIRED');
   return {category:explicit,category_source:'EXPLICIT_SKU_MAPPING',category_confidence:'HIGH'};}
  const s=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const category=/\b(arroz|leche|pan|fruta|cafe)\b/.test(s)?'alimentacion':/\b(bus|taxi|gasolina)\b/.test(s)?'transporte':null;
  if(category&&!CATEGORIES.includes(category))throw invalid();
  return {category,category_source:category?'DETERMINISTIC_RULE':'UNCLASSIFIED',category_confidence:category?'MEDIUM':'NONE'};
}
function normalize(xml) {
  let root=tree(xml),fiscalXml=xml;const associated=[];
  const container=root.local==='AttachedDocument'&&root.uri==='urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2';
  if(container){
    const external=one(one(root,'Attachment'),'ExternalReference');
    // Embedded XML text may exceed scalar limits, but is bounded by the outer 512 KiB envelope.
    const description=one(external,'Description',CBC);fiscalXml=description.text.trim();
    if(!fiscalXml.startsWith('<'))throw invalid();
    for(const parent of children(root,'ParentDocumentLineReference')){
      const reference=one(parent,'DocumentReference'),attachment=one(reference,'Attachment',CAC,false);
      if(attachment){const content=one(one(attachment,'ExternalReference'),'Description',CBC).text.trim();
        const response=tree(content);if(response.local!=='ApplicationResponse'||response.uri!=='urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2')throw invalid();
        associated.push({kind:'ApplicationResponse',state:'REPORTED',sha256:hash(content)});
      }
    }
    if(associated.length>5)throw invalid();root=tree(fiscalXml);
  }
  const type=root.local;
  if(!['Invoice','CreditNote','DebitNote'].includes(type)||root.uri!=='urn:oasis:names:specification:ubl:schema:xsd:'+type+'-2')throw invalid();
  const currency=value(root,'DocumentCurrencyCode');if(!['COP','USD','EUR'].includes(currency))throw invalid();
  const id=value(root,'ID'),uid=value(root,'UUID');
  if(!/^[a-f0-9]{96}$/i.test(uid)||id.length>100)throw invalid();
  const issue=value(root,'IssueDate');if(!/^\d{4}-\d{2}-\d{2}$/.test(issue)||Number.isNaN(Date.parse(issue))||new Date(issue).toISOString().slice(0,10)!==issue)throw invalid();
  const seller=party(root,'AccountingSupplierParty'),buyer=party(root,'AccountingCustomerParty');
  if(seller.type!=='31'||seller.country!=='CO'||seller.id!=='900000000')throw invalid();
  // Sandbox identifiers cannot correlate with an actual national document.
  if(!/^(SBX|SANDBOX)[A-Z0-9]{3,24}$/.test(buyer.id))throw invalid();
  const buyerHash=identity(buyer.type,buyer.id,buyer.country);
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
    if(!Number.isSafeInteger(adjusted))throw invalid();
    if(Math.abs(adjusted-net)>1)throw fault(422,'ARITHMETIC_REVIEW');
    const name=value(item,'Name',false)||value(item,'Description');
    const description=value(item,'Description',false),skuNode=one(item,'SellersItemIdentification',CAC,false)||one(item,'StandardItemIdentification',CAC,false);
    const sku=skuNode?value(skuNode,'ID'):null;
    const category=categorize(name,sku,seller.id),lineTaxes=taxes(l,currency);
    return {id:value(l,'ID'),name,quantity,unit:quantityNode.attrs.unitCode?.value||null,unit_price:unitPrice,base_quantity:baseQuantity,
      sku,description,base_before_adjustments_minor:Number(expected),net_minor:net,final_minor:net+sum(lineTaxes,'amount_minor'),taxes:lineTaxes,adjustments:discounts,...category,
      category_trace:{original_value:null,normalized_value:category.category,user_override:null,extraction_method:category.category_source,confidence:category.category_confidence},
      source_path:'/'+type+'/'+lineName+'['+(i+1)+']'};
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
  const payments=children(root,'PaymentMeans').map(p=>({form_id:value(p,'ID',false),code:value(p,'PaymentMeansCode'),due_date:value(p,'PaymentDueDate',false)}));
  const time=value(root,'IssueTime',false),due=value(root,'DueDate',false),profile=value(root,'ProfileID',false);
  if(time&&!/^\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(time))throw invalid();
  if(time&&Number.isNaN(Date.parse(issue+'T'+time)))throw invalid();
  if(due&&(!/^\d{4}-\d{2}-\d{2}$/.test(due)||Number.isNaN(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due))throw invalid();
  return {parser_version:VERSION,type,id,uuid:uid.toLowerCase(),currency,issued_on:issue,seller,buyer,buyer_hmac:buyerHash,
    buyer_hmacs:identityCandidates(buyer.type,buyer.id,buyer.country),
    issue_time:time,issued_at:time?issue+'T'+time:null,due_date:due,profile_id:profile,container,associated,
    lines,taxes:allTaxes,withholding_taxes:taxes(root,currency,'WithholdingTaxTotal'),adjustments:changes,payment_terms:payments,
    totals:{net_minor:net,tax_minor:sum(allTaxes,'amount_minor'),discount_minor:discount,charge_minor:charge,
      inclusive_minor:inclusive,prepaid_declared_minor:prepaid,payable_minor:payable,rounding_minor:minor(roundingText)},
    related,original_sha256:hash(xml),fiscal_sha256:hash(fiscalXml),dian_state:'DIAN_NOT_VERIFIED',
    validation_evidence:{state:associated.length?'REPORTED':'UNVERIFIED',signature:'UNVERIFIED',official_query:false},credit_declared:payments.some(p=>p.form_id==='2'),payment_state:'NOT_EVIDENCED'};
}
module.exports={normalize,VERSION};
