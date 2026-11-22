const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.QORI_INVOICE_IDENTITY_KEY=crypto.randomBytes(32).toString('hex');
process.env.QORI_INVOICE_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');
const {normalize}=require('../backend/src/invoice/normalize'),{fixture}=require('./fixtures/qoriInvoice');
const config=require('../backend/src/invoice/config');
test('explicit SKU taxonomy mapping precedes name rules; declared credit never becomes a payment',()=>{
 const xml=fixture().replace('<cac:Item>','<cac:Item><cac:SellersItemIdentification><cbc:ID>SKU-DEMO</cbc:ID></cac:SellersItemIdentification>').replace('<cac:PaymentMeans>','<cac:PaymentMeans><cbc:ID>2</cbc:ID>');
 process.env.QORI_INVOICE_CATEGORY_MAPPINGS=JSON.stringify({'900000000|SKU-DEMO':'hogar'});
 try{const d=normalize(xml);assert.equal(d.lines[0].category,'hogar');assert.equal(d.lines[0].category_source,'EXPLICIT_SKU_MAPPING');assert.equal(d.credit_declared,true);assert.equal(d.payment_state,'NOT_EVIDENCED');}
 finally{delete process.env.QORI_INVOICE_CATEGORY_MAPPINGS;}
});
test('AttachedDocument preserves container and distinguishes reported evidence from verification',()=>{
 const xml=fixture(),wrapped='<AttachedDocument xmlns="urn:oasis:names:specification:ubl:schema:xsd:AttachedDocument-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"><cac:Attachment><cac:ExternalReference><cbc:Description><![CDATA['+xml+']]></cbc:Description></cac:ExternalReference></cac:Attachment><cac:ParentDocumentLineReference><cac:DocumentReference><cac:Attachment><cac:ExternalReference><cbc:Description><![CDATA[<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"/>]]></cbc:Description></cac:ExternalReference></cac:Attachment></cac:DocumentReference></cac:ParentDocumentLineReference></AttachedDocument>';
 const n=normalize(wrapped);assert.equal(n.container,true);assert.equal(n.fiscal_sha256,config.hash(xml));assert.equal(n.original_sha256,config.hash(wrapped));assert.equal(n.validation_evidence.state,'REPORTED');assert.equal(n.validation_evidence.official_query,false);assert.equal(n.validation_evidence.signature,'UNVERIFIED');
 assert.throws(()=>normalize(wrapped.replace('<ApplicationResponse','<!DOCTYPE x><ApplicationResponse')));
});
test('multiple rates, zero tax, line discount and global adjustments reconcile without double tax',()=>{
 const amount=(name,n)=>'<cbc:'+name+' currencyID="COP">'+n+'</cbc:'+name+'>';
 const subtotal=(base,tax,rate)=>'<cac:TaxSubtotal>'+amount('TaxableAmount',base)+amount('TaxAmount',tax)+'<cac:TaxCategory><cbc:Percent>'+rate+'</cbc:Percent><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>';
 const change=(charge,n)=>'<cac:AllowanceCharge><cbc:ChargeIndicator>'+charge+'</cbc:ChargeIndicator>'+amount('Amount',n)+'</cac:AllowanceCharge>';
 const line=(id,base,price,tax,rate,discount='')=>'<cac:InvoiceLine><cbc:ID>'+id+'</cbc:ID><cbc:InvoicedQuantity unitCode="94">1</cbc:InvoicedQuantity>'+amount('LineExtensionAmount',base)+discount+'<cac:TaxTotal>'+amount('TaxAmount',tax)+subtotal(base,tax,rate)+'</cac:TaxTotal><cac:Item><cbc:Name>Artículo sintético '+id+'</cbc:Name><cac:SellersItemIdentification><cbc:ID>SKU'+id+'</cbc:ID></cac:SellersItemIdentification></cac:Item><cac:Price>'+amount('PriceAmount',price)+'</cac:Price></cac:InvoiceLine>';
 let xml=fixture().replace(/<cac:TaxTotal>[\s\S]*?<\/cac:TaxTotal>/,change(false,'1000.00')+change(true,'500.00')+'<cac:TaxTotal>'+amount('TaxAmount','2210.00')+subtotal('9000.00','1710.00','19')+subtotal('10000.00','500.00','5')+subtotal('4500.00','0.00','0')+'</cac:TaxTotal>');
 xml=xml.replace(/<cac:LegalMonetaryTotal>[\s\S]*?<\/cac:LegalMonetaryTotal>/,'<cac:LegalMonetaryTotal>'+amount('LineExtensionAmount','24000.00')+amount('TaxExclusiveAmount','23500.00')+amount('TaxInclusiveAmount','25710.00')+amount('AllowanceTotalAmount','1000.00')+amount('ChargeTotalAmount','500.00')+amount('PayableAmount','25710.00')+'</cac:LegalMonetaryTotal>');
 xml=xml.replace(/<cac:InvoiceLine>[\s\S]*?<\/cac:InvoiceLine>/,line(1,'9000.00','10000.00','1710.00',19,change(false,'1000.00'))+line(2,'10000.00','10000.00','500.00',5)+line(3,'5000.00','5000.00','0.00',0));
 const n=normalize(xml);assert.equal(n.lines.length,3);assert.equal(n.totals.payable_minor,2571000);assert.equal(n.totals.tax_minor,221000);assert.equal(n.lines[0].adjustments[0].amount_minor,100000);assert.equal(n.lines[2].taxes[0].amount_minor,0);assert.equal(n.lines[0].category,null);assert.equal(n.lines[0].sku,'SKU1');
 assert.throws(()=>normalize(xml.replace('25710.00','25711.00')),{code:'ARITHMETIC_REVIEW'});
});
test('encryption and identifier key rotation retain old data without conflating country or type',()=>{
 const previous=process.env.QORI_INVOICE_IDENTITY_KEY,old=process.env.QORI_INVOICE_ENCRYPTION_KEY,box=config.seal({test:true},'context'),fingerprint=config.identity('13','SANDBOXBUYER001');
 try{process.env.QORI_INVOICE_IDENTITY_KEY=crypto.randomBytes(32).toString('hex');process.env.QORI_INVOICE_IDENTITY_PREVIOUS_KEYS=JSON.stringify([previous]);
 assert.ok(config.identityCandidates('13','SANDBOXBUYER001').includes(fingerprint));assert.ok(!config.identityCandidates('22','SANDBOXBUYER001').includes(fingerprint));
 process.env.QORI_INVOICE_ENCRYPTION_KEYS=JSON.stringify({1:old,2:crypto.randomBytes(32).toString('hex')});process.env.QORI_INVOICE_ENCRYPTION_KEY_VERSION='2';
 assert.deepEqual(config.unseal(box,'context'),{test:true});assert.equal(JSON.parse(config.seal({},'new')).v,2);
 }finally{process.env.QORI_INVOICE_IDENTITY_KEY=previous;delete process.env.QORI_INVOICE_IDENTITY_PREVIOUS_KEYS;delete process.env.QORI_INVOICE_ENCRYPTION_KEYS;delete process.env.QORI_INVOICE_ENCRYPTION_KEY_VERSION;}
});
test('UBL exact arithmetic, traceability, tax and category; never asserts DIAN or payment',()=>{
 const xml=fixture(),n=normalize(xml);assert.equal(n.totals.payable_minor,2380000);assert.equal(n.totals.tax_minor,380000);
 assert.equal(n.lines[0].quantity,'2');assert.equal(n.lines[0].category,'alimentacion');
 assert.equal(n.original_sha256,config.hash(xml));assert.equal(n.payment_state,'NOT_EVIDENCED');assert.equal(n.dian_state,'DIAN_NOT_VERIFIED');
 assert.match(n.lines[0].source_path,/InvoiceLine\[1\]/);
});
test('namespace prefixes are aliases, namespace URIs and unique direct children are enforced',()=>{
 assert.equal(normalize(fixture().replaceAll('cbc:','b:').replace('xmlns:cbc=','xmlns:b=')).type,'Invoice');
 for(const xml of [fixture().replace('CommonBasicComponents-2','Impostor'),fixture().replace('<cbc:ID>SANDBOX-001</cbc:ID>','<cbc:ID>x</cbc:ID><cbc:ID>y</cbc:ID>'),fixture().replace('</Invoice>','')])assert.throws(()=>normalize(xml),{code:'UNSUPPORTED_OR_INVALID_XML'});
});
test('XXE, entities, remote instructions, oversized and deeply nested XML fail closed',()=>{
 for(const xml of ['<!DOCTYPE Invoice [<!ENTITY x SYSTEM "file:///secret">]>'+fixture(),fixture().replace('Café de prueba','&unknown;'),fixture().replace('?>','?><?xml-stylesheet href="https://example.invalid/x"?>'),'x'.repeat(524289),'<a>'.repeat(60)+'</a>'.repeat(60)])assert.throws(()=>normalize(xml));
});
test('currency, dates, totals, identity and unsafe money rejected',()=>{
 for(const xml of [fixture().replace('23800.00','23801.00'),fixture().replace('2026-11-22','2026-02-30'),fixture().replace('currencyID="COP"','currencyID="USD"'),fixture().replace('20000.00','20000.001'),fixture().replace('10000.00','999999999999999'),fixture().replace('schemeName="13"','schemeName="UNKNOWN"')])assert.throws(()=>normalize(xml));
});
test('credit and debit reference original; unsigned and unresolved remains explicit',()=>{
 for(const type of ['CreditNote','DebitNote']){const n=normalize(fixture({type}));assert.equal(n.type,type);assert.equal(n.related.id,'SANDBOX-ORIGINAL');assert.equal(n.payment_state,'NOT_EVIDENCED');}
 assert.throws(()=>normalize(fixture({type:'CreditNote'}).replace(/<cac:BillingReference>.*?<\/cac:BillingReference>/s,'')));
});
test('document level allowances and charges are reconciled',()=>{
 const xml=fixture().replace('<cac:TaxTotal>','<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:Amount currencyID="COP">1000.00</cbc:Amount></cac:AllowanceCharge><cac:TaxTotal>')
 .replaceAll('>3800.00','>3610.00').replace('<cbc:TaxableAmount currencyID="COP">20000.00','<cbc:TaxableAmount currencyID="COP">19000.00')
 .replace('<cbc:TaxExclusiveAmount currencyID="COP">20000.00','<cbc:TaxExclusiveAmount currencyID="COP">19000.00')
 .replaceAll('23800.00','22610.00').replace('<cbc:PayableAmount','<cbc:AllowanceTotalAmount currencyID="COP">1000.00</cbc:AllowanceTotalAmount><cbc:PayableAmount');
 assert.equal(normalize(xml).totals.discount_minor,100000);
});
test('authenticated encryption rejects tampering and cross-document substitution',()=>{
 const box=config.seal({private:'synthetic'},'a');assert.deepEqual(config.unseal(box,'a'),{private:'synthetic'});
 assert.throws(()=>config.unseal(box,'b'));const parsed=JSON.parse(box);parsed.tag=Buffer.alloc(16).toString('base64');assert.throws(()=>config.unseal(JSON.stringify(parsed),'a'));
 assert.notEqual(config.identity('13','SANDBOXBUYER001'),config.identity('31','SANDBOXBUYER001'));
});
test('disabled by default and production cannot be enabled by a feature flag',()=>{
 const old=process.env.NODE_ENV;process.env.QORI_INVOICE_SANDBOX_ENABLED='false';assert.equal(config.enabled(),false);
 process.env.QORI_INVOICE_SANDBOX_ENABLED='true';process.env.NODE_ENV='production';assert.equal(config.enabled(),false);
 process.env.NODE_ENV=old||'test';process.env.QORI_INVOICE_SANDBOX_ENABLED='false';
});

