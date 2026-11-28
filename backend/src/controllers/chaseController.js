const {z}=require('zod');
const {validate}=require('../utils/validators');
const service=require('../services/chaseService');
const {ticket}=require('../services/chaseLiveService');
const schema=z.object({action:z.enum(['create','join','resume','state','ready','start','restart','input','leave','claim','scenario']),
  scenario_id:z.enum(require('../../../activacion/policias-core').WORLDS.map(w=>w.id)).optional(),
  participant_id:z.string().uuid(),game_session_token:z.string().min(8).max(180),
  code:z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/).optional(),alias:z.string().trim().min(1).max(16).optional(),
  ready:z.boolean().optional(),room_id:z.string().uuid().optional(),round_id:z.string().uuid().optional(),seq:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  x:z.number().min(-1).max(1).optional(),y:z.number().min(-1).max(1).optional()});
async function action(req,res,next){try{
  const body=validate(schema,req.body);
  const result=body.action==='claim'?await service.claim(req.params.slug,body,{customerId:req.customer?.id}):await service.act(req.params.slug,body,{customerId:req.customer?.id});
  if(result.room){const {query}=require('../config/db');const row=(await query('select activation_id from qori_chase_rooms where id=$1',[result.room.id])).rows[0];result.live=ticket(result.room,row.activation_id);}
  res.setHeader('Cache-Control','no-store');res.json(result);
}catch(error){next(error);}}
module.exports={action};
