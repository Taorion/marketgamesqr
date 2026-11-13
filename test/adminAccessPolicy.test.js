const {test}=require('node:test'),assert=require('node:assert/strict');
const policy=require('../backend/src/services/adminAccessPolicy');
test('Admin requires exact allowlisted email, an administrative role and active non-demo account',()=>{
 for(const email of ['cbotero@gosqori.com','scasallas@gosqori.com',' CBOTERO@GOSQORI.COM ']){
  assert.equal(policy.canAccessAdmin({email,role:'QORI_SUPERADMIN',is_active:true}),true);
  assert.equal(policy.canAccessAdmin({email,role:'BUSINESS_OWNER',platform_role:'QORI_SUPERADMIN',is_active:true}),true);
  assert.equal(policy.canAccessAdmin({email,role:'QORI_SELLER',is_active:true}),false);
  assert.equal(policy.canAccessAdmin({email,role:'QORI_SUPERADMIN',is_active:false}),false);
  assert.equal(policy.canAccessAdmin({email,role:'QORI_SUPERADMIN',demo_mode:true}),false);
 }
 for(const email of ['other@gosqori.com','cbotero+qa@gosqori.com','cbotero@gosqori.com.example.test','scasallas@example.test',null])assert.equal(policy.canAccessAdmin({email,role:'QORI_SUPERADMIN'}),false);
 assert.throws(()=>policy.enforceAdministrativeIdentity({email:'other@gosqori.com',role:'BUSINESS_OWNER',platform_role:'QORI_SUPERADMIN'}),e=>e.status===403);
 assert.doesNotThrow(()=>policy.enforceAdministrativeIdentity({email:'seller@gosqori.com',role:'QORI_SELLER'}));
});
