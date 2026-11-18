const express = require('express');
const { rateLimit } = require('../middleware/rateLimit');
const svc = require('../services/affiliateCatalogService');
const { badRequest } = require('../utils/http');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function makeRouter(customer = false) {
  const router = express.Router();
  router.use(rateLimit({keyPrefix:customer?'customer-points-catalog':'public-points-catalog',max:80,windowMs:15*60000}));
  const handle = fn => async (req,res,next) => {try {res.set('Cache-Control','private, no-store');res.json(await fn(req));} catch(e){next(e);}};
  if(!customer)router.get('/tickets/:token',handle(req=>svc.receipt(req.params.token)));
  router.get('/:slug',handle(req=>svc.storefront(req.params.slug)));
  for(const action of ['identity','quote','issue']) router.post('/:slug/'+action,handle(req=>svc[action](req.params.slug,req.body,customer?req.customer:null)));
  router.post('/:slug/tickets/:id',handle(req=>{if(!uuid.test(req.params.id))throw badRequest('Ticket no válido.');return svc.ticket(req.params.slug,req.params.id,req.body,customer?req.customer:null);}));
  return router;
}
module.exports={publicRouter:makeRouter(),customerRouter:makeRouter(true)};
