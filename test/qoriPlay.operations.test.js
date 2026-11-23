const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hook=require('../backend/src/play/webhooks'),{verify}=require('../play/examples/verify-webhook.cjs');
test('callback destinations reject SSRF, credentials, redirects and private/reserved address families',()=>{
 process.env.QORI_PLAY_WEBHOOK_HOSTS='hooks.example.invalid';assert.equal(hook.destination('https://hooks.example.invalid/events').pathname,'/events');
 for(const u of ['http://hooks.example.invalid/','https://127.0.0.1/','https://hooks.example.invalid:444/','https://user:pass@hooks.example.invalid/','https://hooks.example.invalid/?token=abc','https://evil.invalid/','https://hooks.example.invalid/#a'])assert.throws(()=>hook.destination(u));
 for(const ip of ['0.0.0.0','127.0.0.1','10.0.0.2','172.31.1.1','192.168.1.1','169.254.169.254','100.64.0.1','198.19.0.1','192.0.2.1','198.51.100.1','203.0.113.1','224.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(hook.publicIPv4(ip),false,ip);
 assert.equal(hook.publicIPv4('8.8.8.8'),true);
});
test('callback receiver verifies exact bytes, timestamp and delivery ID without timing leaks',()=>{
 const key=crypto.randomBytes(32).toString('hex'),id=crypto.randomUUID(),t=String(Math.floor(Date.now()/1000)),body='{"type":"game_finished"}',sig=hook.signature(key,id,t,body);
 assert.equal(verify(key,id,t,body,sig),true);assert.equal(verify(key,id,t,body+' ',sig),false);assert.equal(verify(key,crypto.randomUUID(),t,body,sig),false);assert.equal(verify(key,id,t,body,sig,Date.now()+301000),false);assert.equal(verify(key,id,t,body,'x'),false);
});
test('updated Nodemailer builds bounded MIME messages offline without SMTP or file/network reads',async()=>{
 const mail=require('nodemailer').createTransport({streamTransport:true,buffer:true,newline:'unix',disableFileAccess:true,disableUrlAccess:true});
 const result=await mail.sendMail({from:'qori@example.invalid',to:'synthetic@example.invalid',subject:'Código de prueba',text:'123456',html:'<p>123456</p>'});
 assert.match(result.message.toString(),/multipart\/alternative/);assert.match(result.message.toString(),/123456/);
 await assert.rejects(mail.sendMail({from:'qori@example.invalid',to:'synthetic@example.invalid',subject:'Denied',attachments:[{path:'https://example.invalid/secret'}]}),/access rejected/i);mail.close();
});
test('callback transport pins validated DNS and never follows HTTP redirects',async t=>{
 const {EventEmitter}=require('node:events'),dns=require('node:dns').promises,https=require('node:https');process.env.QORI_PLAY_WEBHOOK_HOSTS='hooks.example.invalid';let requests=0;
 t.mock.method(dns,'lookup',async()=>[{address:'8.8.8.8',family:4}]);
 t.mock.method(https,'request',(url,options,callback)=>{requests++;assert.equal(url.hostname,'hooks.example.invalid');assert.equal(options.agent,false);assert.equal(options.servername,url.hostname);options.lookup(url.hostname,{all:false},(err,address,family)=>{assert.equal(err,null);assert.equal(address,'8.8.8.8');assert.equal(family,4);});const req=new EventEmitter();req.end=()=>{callback({statusCode:302,destroy(){}});req.emit('close');};req.destroy=e=>req.emit('error',e);return req;});
 assert.equal(await hook.deliver('https://hooks.example.invalid/events','{}',{}),302);assert.equal(requests,1);
 dns.lookup.mock.mockImplementation(async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]);await assert.rejects(hook.deliver('https://hooks.example.invalid/events','{}',{}),/DESTINATION_DENIED/);assert.equal(requests,1);
});
