const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('empresa/js/app.js','utf8');
function setup(api){
 const c={state:{salesCustomerSearchSeq:0,salesCustomerSearchRows:[],leadCrmRows:[]},customerAcquisitionCustomerLookupInput:{value:'51618289'},customerAcquisitionMessage:{},businessScopeKey:()=> 'business',isCurrentBusinessScope:s=>s==='business',authHeaders:()=>({}),api,renderSalesCustomerOptions(){},renderSalesCustomerMatchesHint(){},setSalesCustomerStatus(){},setInlineMessage(){},clearTimeout,window:{setTimeout},encodeURIComponent};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('let salesCustomerSearchTimer;'),source.indexOf('function handleSalesCustomerSelectChange()')),c);return c;
}
test('sales searches the server with an empty or filtered directory and selects the returned customer',async()=>{
 const customer={id:'canonical',name:'Clienta',document_id:'51618289'};
 const c=setup(async(path,options)=>{assert.match(path,/sales\/customers\/search\?q=51618289/);assert.equal(options.noClientCache,true);return {customers:[customer]};});
 c.findSalesCustomer=()=>c.state.salesCustomerSearchRows[0];c.findUniquePartialSalesCustomer=()=>null;
 let selected;c.applySalesCustomer=row=>selected=row;
 await c.handleSalesCustomerSearchCommit();assert.equal(selected.id,'canonical');assert.equal(selected.is_customer,true);assert.equal(c.state.leadCrmRows.length,0);
});
test('late search results and failures never become a new customer or replace the latest query',async()=>{
 let resolve;const c=setup(()=>new Promise(r=>resolve=r));const pending=c.searchSalesCustomers();
 c.customerAcquisitionCustomerLookupInput.value='different';resolve({customers:[{id:'old'}]});assert.equal(await pending,false);assert.equal(c.state.salesCustomerSearchRows.length,0);
 c.api=async()=>{throw Error('offline');};assert.equal(await c.searchSalesCustomers(),false);
});
