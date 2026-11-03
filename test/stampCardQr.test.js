const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../empresa/js/app.js'),'utf8');
const source=app.slice(app.indexOf('function extractStampCardQrId('),app.indexOf('function extractInventoryProductQrId('));
const context={URL,QORI_PUBLIC_ORIGIN:'https://gosqori.com',window:{location:{origin:'https://gosqori.com'}}};
vm.runInNewContext(source+';this.parse=extractStampCardQrId;',context);
const customerSource=app.slice(app.indexOf('function extractCustomerQrId('),app.indexOf('async function validateValidatorToken('));
vm.runInNewContext(customerSource+';this.parseCustomer=extractCustomerQrId;',context);
const id='5832701d-3ce1-4dc7-a114-9b7f66d4298c';
test('card QR parser recognizes portal URLs and explicit card identifiers',()=>{
  assert.equal(context.parse(`https://gosqori.com/empresa/?view=validator&stamp_card=${id}`),id);
  assert.equal(context.parse(`qori:stamp-card:${id.toUpperCase()}`),id);
  assert.equal(context.parse(`/empresa/?stamp_card=${id}`),id);
});
test('ticket, reward-pass, product and malformed QR values never become a stamp card',()=>{
  for(const input of ['',id,'a'.repeat(64),'rp_example',`qori:inventory-product:${id}`,`https://gosqori.com/empresa/?token=${id}`,`?stamp_card=invalid`,`?stamp_card=${id}extra`])assert.equal(context.parse(input),'');
});
test('scanning a card opens its contact card without resetting or redeeming the current cart',async()=>{
  const start=app.indexOf('async function validateValidatorToken('),end=app.indexOf('async function redeemValidatorToken(',start);
  const calls=[],status={};
  const sandbox={extractCustomerQrId:context.parseCustomer,extractStampCardQrId:context.parse,stopValidatorScanner:()=>calls.push('stop'),validatorDetectedType:{},
    validatorManualStatus:status,setInlineMessage:(_node,text)=>{status.text=text;},window:{StampCards:{openFromValidator:async x=>calls.push(x)}}};
  vm.runInNewContext(app.slice(start,end)+';this.validate=validateValidatorToken;',sandbox);
  await sandbox.validate(`qori:stamp-card:${id}`);
  assert.deepEqual(calls,['stop',id]);assert.match(sandbox.validatorDetectedType.textContent,/sellos/);
});

test('customer QR opens only identification and does not reset a cart or authorize a benefit',async()=>{
  assert.equal(context.parseCustomer(`https://gosqori.com/empresa/?customer=${id}`),id);
  for(const url of [`https://example.org/empresa/?customer=${id}`,`https://gosqori.com/empresa/?customer=bad`,`https://gosqori.com/sellos/?customer=${id}`])assert.equal(context.parseCustomer(url),'');
  const calls=[],sandbox={extractCustomerQrId:context.parseCustomer,stopValidatorScanner:()=>calls.push('stop'),validatorDetectedType:{},window:{QoriCustomerBridge:{open:x=>calls.push(x)}}};
  const start=app.indexOf('async function validateValidatorToken('),end=app.indexOf('async function redeemValidatorToken(',start);
  vm.runInNewContext(app.slice(start,end)+';this.validate=validateValidatorToken;',sandbox);
  await sandbox.validate(`https://gosqori.com/empresa/?customer=${id}`);assert.deepEqual(calls,['stop',id]);
});
