const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../empresa/js/app.js'),'utf8');
const source=app.slice(app.indexOf('function extractStampCardQrId('),app.indexOf('function extractInventoryProductQrId('));
const context={URL,window:{location:{origin:'https://gosqori.com'}}};
vm.runInNewContext(source+';this.parse=extractStampCardQrId;',context);
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
  const sandbox={extractStampCardQrId:context.parse,stopValidatorScanner:()=>calls.push('stop'),validatorDetectedType:{},
    validatorManualStatus:status,setInlineMessage:(_node,text)=>{status.text=text;},window:{StampCards:{openFromValidator:async x=>calls.push(x)}}};
  vm.runInNewContext(app.slice(start,end)+';this.validate=validateValidatorToken;',sandbox);
  await sandbox.validate(`qori:stamp-card:${id}`);
  assert.deepEqual(calls,['stop',id]);assert.match(sandbox.validatorDetectedType.textContent,/sellos/);
});
