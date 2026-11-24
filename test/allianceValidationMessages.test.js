const {test}=require('node:test'),assert=require('node:assert/strict'),{z}=require('zod');
const R=require('../backend/src/services/allianceRules');
const rules={name:'Pan compartido',purpose:'Recomendar el negocio',benefit_type:'FREE_GIFT',benefit_label:'Pan adicional con tu compra',terms:'Solo con compra pagada',destination:'Calle 12',starts_at:'2026-11-01T12:00:00Z',ends_at:'2027-01-01T12:00:00Z',commission_type:'FIXED',commission_value:1000,settlement_terms:'Cada viernes'};
const person={request_key:'f76cbe54-8747-43df-bb9a-4818c77e0070',name:'Ana Cliente',document_id:'12345678',data_use_confirmed:true};
function message(schema,value,context){try{R.parse(schema,value,context);assert.fail('Expected validation failure');}catch(e){assert.equal(e.status,400);assert.doesNotMatch(e.message,/Too small|Too big|expected|Invalid|undefined|NaN|UUID/);return e.message;}}
test('empty, short and whitespace partner identifiers explain the field and minimum',()=>{
 for(const value of ['', 'a', '   '])assert.equal(message(R.partnerSchema,value,'ally_slug'),'Escribe el identificador del negocio aliado con al menos 2 caracteres.');
 assert.match(message(R.partnerSchema,undefined,'ally_slug'),/Completa.*identificador/);
 assert.equal(R.parse(R.partnerSchema,' naturista ','ally_slug'),'naturista');
});
test('agreement text limits name the affected field in Spanish',()=>{
 for(const [key,label] of [['name','nombre de la alianza'],['purpose','propósito'],['benefit_label','beneficio'],['terms','condiciones'],['destination','dirección'],['settlement_terms','liquidación']])assert.match(message(R.rulesSchema,{...rules,[key]:'x'}),new RegExp(label+'.*3 caracteres'));
 assert.match(message(R.rulesSchema,{...rules,name:'a'.repeat(121)}),/nombre de la alianza.*120 caracteres/);
});
test('numbers, choices, dates, branches and product selection have actionable messages',()=>{
 for(const [key,value,pattern] of [['ticket_valid_days',0,/mínimo es 1/],['ticket_valid_days',1.5,/número entero.*días/],['commission_value','texto',/número.*comisión/],['per_customer_limit',21,/máximo es 20/],['benefit_type','BAD',/opción válida.*beneficio/],['starts_at','ayer',/fecha de inicio.*fecha y hora/],['purchase_product_id','no',/opción válida.*producto/],['branch_ids',['bad'],/opción válida.*sucursales/]])assert.match(message(R.rulesSchema,{...rules,[key]:value}),pattern);
 assert.match(message(R.rulesSchema,{...rules,ends_at:'2020-01-01T00:00:00Z'}),/posterior al inicio/);
 assert.match(message(R.rulesSchema,{...rules,commission_type:'PERCENT',commission_value:101}),/no puede superar 100%/);
});
test('branding validation identifies the name, invitation and logo',()=>{
 const branding={display_name:'Vida',presentation:'',message:'Visita la panadería',invitation:'Recibe tu beneficio',logo_url:'',collect_phone:true,collect_email:false};
 assert.match(message(R.brandingSchema,{...branding,display_name:'a'}),/nombre comercial.*2 caracteres/);
 assert.match(message(R.brandingSchema,{...branding,invitation:''}),/invitación.*3 caracteres/);
 assert.match(message(R.brandingSchema,{...branding,logo_url:'http://logo.test'}),/HTTPS/);
});
test('public enrollment explains name, document, email and required consent without private fields',()=>{
 for(const [key,value,pattern] of [['name','a',/tu nombre completo.*3 caracteres/],['document_id','1',/documento de identidad.*4 caracteres/],['document_id','<script>',/documento usando letras/],['email','invalid',/correo válido/],['data_use_confirmed',false,/ambos negocios.*opcionales/]]){
 const text=message(R.enrollmentSchema,{...person,[key]:value});assert.match(text,pattern);assert.doesNotMatch(text,/comisión|liquidación|marketing_issuer|request_key/);
 }
 assert.match(message(R.enrollmentSchema,{...person,request_key:'bad'}),/Actualiza la página/);
});
test('bad links and unknown fields never echo internal identifiers or submitted values',()=>{
 assert.match(message(z.string().regex(/^[a-f0-9]{64}$/),'secret-invalid-token','public_token'),/Vuelve a escanear el QR/);
 assert.match(message(R.uuid,'bad','payment'),/registro seleccionado/);
 const text=message(R.enrollmentSchema,{...person,secret_private_field:'private-value'});assert.match(text,/Actualiza la página/);assert.doesNotMatch(text,/secret_private_field|private-value/);
});
test('valid data, defaults and public allowlists are preserved',()=>{
 const result=R.parse(R.rulesSchema,rules);assert.equal(result.ticket_valid_days,30);assert.equal(result.commission_value,1000);
 assert.equal(R.parse(R.enrollmentSchema,person).marketing_ally,false);
 assert.doesNotMatch(JSON.stringify(R.publicRules(result)),/commission|settlement/);
});
