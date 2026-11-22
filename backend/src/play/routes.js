const express=require('express'),{z}=require('zod'),path=require('node:path'),crypto=require('node:crypto');
const cfg=require('./config'),svc=require('./service'),rewards=require('./rewards'),oauth=require('../invoice/oauth');
const {customerRequired}=require('../services/customerAuthService'),{authRequired,requireRoles}=require('../middleware/auth'),{rateLimit}=require('../middleware/rateLimit');
const limit=options=>rateLimit({...options,keyFromRequest:req=>req.socket.remoteAddress||'unknown'});
const id=z.string().uuid(),secret=z.string().regex(/^[A-Za-z0-9_-]{43}$/),name=z.string().trim().min(2).max(100);
const parse=(s,v)=>{const r=s.safeParse(v);if(!r.success)throw cfg.fault(400,'INVALID_REQUEST');return r.data;};
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
const reply=fn=>wrap(async(req,res)=>res.json(await fn(req,res)));
const bearer=req=>/^Bearer (.+)$/.exec(req.get('Authorization')||'')?.[1];
function gate(req,res,next){res.set('Cache-Control','no-store').set('Referrer-Policy','no-referrer');req.playRequestId=crypto.randomUUID();if(!cfg.enabled())return res.status(404).json({error:{code:'NOT_FOUND'}});next();}
function errors(e,req,res,_next){const status=e.type==='entity.too.large'?413:e.status>=400&&e.status<500?e.status:503;res.set('X-Request-ID',req.playRequestId);if(status===429)res.set('Retry-After','60');res.status(status).json({error:{code:status===413?'BODY_TOO_LARGE':status===503?'SERVICE_UNAVAILABLE':/^[A-Z_]+$/.test(e.code||'')?e.code:'REQUEST_REJECTED',request_id:req.playRequestId}});}
const settings=z.object({layout:z.enum(['ad70','balanced','full']),headline:name,description:z.string().max(240),cta_url:z.string().url().max(500).refine(s=>s.startsWith('https://')).nullable(),start_hour_utc:z.number().int().min(0).max(23),end_hour_utc:z.number().int().min(1).max(24)}).strict().refine(d=>d.start_hour_utc<d.end_hour_utc);
function install(app){
 const root=path.join(__dirname,'../../..');
 const manage=express.Router();
 manage.use(limit({keyPrefix:'play-manage-ip',max:120}));
 manage.use(express.json({limit:'12kb',inflate:false}));
 manage.use(async(req,res,next)=>{try{
 if((bearer(req)||'').startsWith('qi_at_')){const p=await oauth.authenticate(bearer(req),req.method==='GET'?'play:analytics':'play:manage');req.playApp=p.app_id;return next();}
 customerRequired(req,res,async e=>{if(e)return next(e);try{req.playApp=parse(id,req.get('X-Qori-App'));await svc.owner(req.customer,req.playApp,req.method!=='GET');next();}catch(error){next(error);}});
 }catch(e){next(e);}});
 manage.use(rateLimit({keyPrefix:'play-manage-app',max:240,keyFromRequest:req=>req.playApp}));
 manage.get('/dashboard',reply(req=>svc.dashboard(req.playApp)));
 manage.post('/enable',reply(req=>{if(!req.customer)throw cfg.fault(403,'OWNER_SESSION_REQUIRED');return svc.enable(req.customer,req.playApp);}));
 manage.post('/locations',reply(req=>svc.location(req.playApp,parse(z.object({name}).strict(),req.body).name)));
 manage.post('/screens',reply(req=>svc.screen(req.playApp,parse(z.object({location_id:id,name,orientation:z.enum(['landscape','portrait'])}).strict(),req.body))));
 manage.post('/screens/:id/pairing',reply(req=>svc.confirmPair(req.playApp,parse(id,req.params.id),parse(z.object({code:z.string().regex(/^[A-F0-9]{12}$/)}).strict(),req.body).code)));
 manage.put('/screens/:id/state',reply(req=>svc.screenState(req.playApp,parse(id,req.params.id),parse(z.object({active:z.boolean().optional(),paused:z.boolean().optional()}).strict(),req.body))));
 manage.put('/screens/:id/campaign',reply(req=>svc.assign(req.playApp,parse(id,req.params.id),parse(z.object({campaign_id:id}).strict(),req.body).campaign_id)));
 manage.post('/campaigns',reply(req=>svc.createCampaign(req.playApp,parse(z.object({sponsor_id:id,game_key:z.enum(['orbita','secuencia']),config:settings,max_sessions:z.number().int().min(1).max(10000)}).strict(),req.body))));
 manage.put('/campaigns/:id/state',reply(req=>svc.campaignState(req.playApp,parse(id,req.params.id),parse(z.object({active:z.boolean()}).strict(),req.body).active)));
 const filters=z.object({from:z.iso.date().optional(),to:z.iso.date().optional(),screen_id:id.optional(),campaign_id:id.optional()}).strict().refine(d=>!d.from||!d.to||d.from<=d.to);
 manage.get('/analytics',reply(req=>svc.analytics(req.playApp,parse(filters,req.query))));
 manage.get('/analytics.csv',wrap(async(req,res)=>{const d=await svc.analytics(req.playApp,parse(filters,req.query));res.attachment('qori-play-usage.csv').type('text/csv').send('event,count\r\n'+d.events.map(e=>e.event_type+','+e.count).join('\r\n')+'\r\nreward_redeemed,'+d.verified_redemptions+'\r\n');}));
 manage.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND'}}));manage.use(errors);app.use('/api/play/v1/manage',gate,manage);
 const overview=express.Router();overview.use(customerRequired);overview.get('/overview',reply(req=>svc.overview(req.customer)));overview.use(errors);app.use('/api/developers/play',gate,overview);
 const advertiser=express.Router();advertiser.use(authRequired,requireRoles('BUSINESS_OWNER','BUSINESS_MANAGER'));advertiser.use(express.json({limit:'8kb',inflate:false}));
 advertiser.get('/campaigns',reply(async req=>({campaigns:(await require('../config/db').query("select p.id,p.game_key,p.config,p.active,p.reward_cap,p.reward_cost_minor,p.budget_minor,p.min_score,c.name from play_campaigns p join play_sponsors g on g.id=p.sponsor_id join campaigns c on c.id=g.campaign_id where c.business_id=$1",[req.user.business_id])).rows})));
 advertiser.post('/authorizations',reply(req=>{const d=parse(z.object({app_id:id,campaign_id:id}).strict(),req.body);return svc.sponsor(req.user,d.app_id,d.campaign_id);}));
 advertiser.post('/campaigns/:id/approve',reply(req=>svc.approve(req.user,parse(id,req.params.id),parse(z.object({reward_cap:z.number().int().min(0).max(10000),reward_cost_minor:z.number().int().min(0).max(100000000),budget_minor:z.number().int().min(0).max(10000000000),min_score:z.number().int().min(0).max(10000)}).strict(),req.body))));
 advertiser.use(errors);app.use('/api/play/v1/sponsor',gate,advertiser);
 const publicApi=express.Router();publicApi.use(limit({keyPrefix:'play-public-ip',max:120}));publicApi.use(express.json({limit:'2kb',strict:true,inflate:false}));
 publicApi.get('/notice',reply(()=>cfg.consent));
 publicApi.post('/device-pairings',limit({keyPrefix:'play-pair',max:10}),reply(()=>svc.pairing()));
 publicApi.post('/device-pairings/claim',reply(req=>svc.claimPair(parse(z.object({challenge:secret}).strict(),req.body).challenge)));
 publicApi.post('/device/state',reply(req=>svc.snapshot(bearer(req))));
 publicApi.post('/device/qr',reply(async req=>{const s=await svc.snapshot(bearer(req));return {url:s.join?.url||null,image:s.join?await require('qrcode').toDataURL(s.join.url,{width:280,margin:3}):null};}));
 publicApi.post('/device/rotate',reply(req=>svc.rotateDevice(bearer(req))));
 publicApi.post('/sessions/join',limit({keyPrefix:'play-join',max:20}),reply(req=>{const d=parse(z.object({ticket:secret,accepted:z.literal(true),adult:z.literal(true),version:z.literal(cfg.consent.version)}).strict(),req.body);return svc.join(d.ticket);}));
 publicApi.get('/sessions/status',reply(req=>svc.personal(bearer(req))));
 publicApi.post('/sessions/event',reply(req=>svc.telemetry(bearer(req),parse(z.object({type:z.literal('cta_opened')}).strict(),req.body).type)));
 publicApi.use((_req,res)=>res.status(404).json({error:{code:'NOT_FOUND'}}));publicApi.use(errors);app.use('/api/play/v1',gate,publicApi);
 const customer=express.Router();customer.use(customerRequired);customer.use(express.json({limit:'2kb',inflate:false}));
 customer.get('/rewards',reply(req=>rewards.list(req.customer)));
 customer.get('/rewards/:id',reply(req=>rewards.detail(req.customer,parse(id,req.params.id))));
 customer.post('/claim',reply(req=>{const d=parse(z.object({controller_token:secret,accepted:z.literal(true),version:z.literal('play-claim-sandbox-1')}).strict(),req.body);return rewards.claim(req.customer,d.controller_token);}));
 customer.use(errors);app.use('/api/customer/play',gate,customer);
 const admin=express.Router();admin.use(authRequired,requireRoles('QORI_SUPERADMIN'));admin.use(express.json({limit:'2kb',inflate:false}));
 admin.get('/organizations',reply(async()=>({organizations:(await require('../config/db').query('select o.partner_id,o.enabled,p.name from play_organizations o join invoice_partners p on p.id=o.partner_id')).rows})));
 admin.put('/organizations/:id',reply(req=>svc.blockOrganization(parse(id,req.params.id),parse(z.object({enabled:z.boolean()}).strict(),req.body).enabled,req.user.id)));
 admin.use(errors);app.use('/api/admin/play',gate,admin);
 app.get('/api/play-capabilities',(_req,res)=>res.set('Cache-Control','no-store').json({sandbox:cfg.enabled(),production:false,embed_origins:[cfg.origin(),...(process.env.QORI_PLAY_EMBED_ORIGINS||'').split(',').filter(Boolean)]}));
 app.get('/developers/play',(_req,res)=>res.redirect('/play/'));
 app.get('/play/openapi.json',(_req,res)=>res.type('application/json').sendFile(path.join(root,'docs/qori-play/openapi.yaml')));
 app.use('/play',(_req,res,next)=>{
 res.set('Referrer-Policy','no-referrer');
 const origins=(process.env.QORI_PLAY_EMBED_ORIGINS||'').split(',').filter(Boolean).filter(s=>{try{return new URL(s).origin===s&&s.startsWith('https://');}catch{return false;}});
 res.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' "+origins.join(' '));res.removeHeader('X-Frame-Options');next();
 },express.static(path.join(root,'play'),{dotfiles:'deny'}));
}
module.exports={install};
