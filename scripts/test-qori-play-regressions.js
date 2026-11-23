// Runs existing suites unchanged, redirecting only hard-coded test databases to Play's isolated local database.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),baseline=process.argv.includes('--baseline');fs.mkdirSync(path.join(root,'.qa-play'),{recursive:true});
const results=[];
function run(name,args){const r=spawnSync(process.execPath,args,{cwd:baseline?path.resolve(root,'../qori-invoice-20261122'):root,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});const log=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(root,'.qa-play',(baseline?'baseline-':'')+name+'.log'),log);const result={name,exit:r.status,tests:log.match(/# tests (\d+)/)?.[1],pass:log.match(/# pass (\d+)/)?.[1],fail:log.match(/# fail (\d+)/)?.[1],error:r.error?.code};results.push(result);console.log(JSON.stringify(result));}
if(!baseline)run('finance-validator',['--test','test/customerFinance.test.js','test/customerFinanceDetails.test.js','test/customerFinanceUI.test.js','test/customerFinanceBooksUI.test.js','test/validatorInventorySaleMovement.test.js']);
const redirect="const fs=require('fs'),path=require('path'),Module=require('module');const file=path.resolve(process.argv[1]);const source=fs.readFileSync(file,'utf8').replaceAll('qori_invoice_qa','qori_play_qa').replaceAll('postgresql://postgres@127.0.0.1:55441/qori_customer_qa','postgresql://postgres@127.0.0.1:55489/qori_play_qa').replaceAll('53002817','53003817');const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));m._compile(source,file);";
if(!baseline)run('invoice-existing',['-e',redirect,'test/qoriInvoice.integration.test.js']);
run('customer-books-existing',['-e',redirect,'test/customerFinanceBooks.integration.test.js']);
if(!baseline)run('seller-existing',['--test','test/qoriSellerUI.test.js']);
fs.writeFileSync(path.join(root,'.qa-play',(baseline?'baseline-':'')+'regression-results.json'),JSON.stringify(results,null,2));
if(results.some(r=>r.exit!==0))process.exitCode=1;
