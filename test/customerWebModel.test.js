const {test}=require('node:test');
const assert=require('node:assert/strict');
const {groups,counts}=require('../customer-web/wallet-model');
const cards=[
  {id:'a',business_id:'one',business_name:'Café Qori',title:'Desayunos',kind:'STAMP',status:'ACTIVE'},
  {id:'b',business_id:'one',business_name:'Café Qori',title:'Mi tarjeta Qori',kind:'POINTS',status:'READY'},
  {id:'c',business_id:'two',business_name:'Café Qori',title:'Regalo',kind:'GIFT',status:'READY'},
  {id:'d',business_id:'one',business_name:'Café Qori',title:'Promoción anterior',kind:'STAMP',status:'EXPIRED'}
];
test('programs are grouped by business identity rather than shared display names',()=>{
  const result=groups(cards);assert.equal(result.length,2);assert.deepEqual(result[0].cards.map(c=>c.id),['a','b']);
  assert.deepEqual(counts(cards),{total:4,active:3,ready:2,businesses:2});
});
test('search, loyalty type, ready benefits and history combine without mixing businesses',()=>{
  assert.equal(groups(cards,{search:'cafe',status:'READY'}).length,2);
  assert.equal(groups(cards,{kind:'STAMP',status:'HISTORY'})[0].cards[0].id,'d');
  assert.equal(groups(cards,{search:'desayunos',kind:'GIFT'}).length,0);
  assert.equal(groups(cards,{search:'promocion',status:'ALL'})[0].cards[0].id,'d');
});
