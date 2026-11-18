const { z } = require('zod');
const { validate } = require('../utils/validators');
const { act } = require('../services/summitRaceService');
const { ticket, notify } = require('../services/summitLiveService');
const schema = z.object({
  action: z.enum(['create','join','resume','state','ready','start','input','leave']),
  participant_id: z.string().uuid(), game_session_token: z.string().min(8).max(180),
  code: z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/).optional(),
  alias: z.string().trim().min(1).max(24).optional(), ready: z.boolean().optional(),
  from: z.number().int().min(0).max(10800).optional(),
  runs: z.array(z.tuple([z.number().int().min(0).max(15),z.number().int().min(1).max(600)])).max(600).optional(),
});
async function action(req,res,next) {
  try {
    const result = await act(req.params.slug, validate(schema, req.body), { customerId: req.customer?.id });
    // act resolves after COMMIT: rolled-back impacts must never be broadcast.
    if (result.room && result.impacts?.length) notify(result.room.seed, result.impacts);
    if (result.room) result.live = ticket(result.room);
    res.setHeader('Cache-Control','no-store'); res.json(result);
  } catch(error) { next(error); }
}
module.exports = { action };
