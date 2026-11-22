const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.QORI_INVOICE_IDENTITY_KEY=crypto.randomBytes(32).toString('hex');
process.env.QORI_INVOICE_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');
const {normalize}=require('../backend/src/invoice/normalize'),{fixture}=require('./fixtures/qoriInvoice');
const config=require('../backend/src/invoice/config');
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

