const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('Contactos classifies stamp holders as clients without requiring purchase metrics',()=>{
 const source=fs.readFileSync('empresa/js/app.js','utf8'),start=source.indexOf('function leadDirectoryIsCustomer('),end=source.indexOf('function leadDirectoryHasCommercialPotential(',start);
 const context={leadDirectoryMetadata:item=>item.metadata||{}};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 for(const has_stamp_card of [true,'true'])assert.equal(context.leadDirectoryIsCustomer({has_stamp_card,purchase_count:0,total_spent:0}),true);
 assert.equal(context.leadDirectoryIsCustomer({has_stamp_card:false,purchase_count:0,total_spent:0}),false);
 assert.equal(context.leadDirectoryIsCustomer({purchase_count:1}),true);assert.equal(context.leadDirectoryIsCustomer({is_affiliate:true}),true);
});
