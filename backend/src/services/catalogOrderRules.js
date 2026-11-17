const { z } = require('zod');
const { badRequest } = require('../utils/http');

const text = (min, max) => z.string().trim().min(min).max(max);
const money = z.number().finite().min(0).max(100000000).multipleOf(0.01);
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const settingsSchema = z.object({
  enabled: z.boolean(), paused: z.boolean().default(false),
  timezone: text(1, 80).refine(v => { try { new Intl.DateTimeFormat('es', { timeZone: v }); return true; } catch { return false; } }, 'Zona horaria inválida'),
  hours: z.array(z.object({ day: z.number().int().min(0).max(6), open: clock, close: clock }).refine(v => v.open < v.close, 'La hora de cierre debe ser posterior a la apertura')).min(1).max(7).refine(v => new Set(v.map(h => h.day)).size === v.length, 'Usa un horario por día'),
  zones: z.array(z.object({ id: text(1, 40).regex(/^[a-zA-Z0-9_-]+$/), name: text(2, 100), fee: money.nullable() })).min(1).max(30),
  payment_instructions: text(5, 1000), terms: text(10, 2000),
}).refine(v => new Set(v.zones.map(x => x.id)).size === v.zones.length, 'Las zonas deben ser únicas');
function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) throw badRequest(result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; '));
  return result.data;
}
function receiving(settings, now = new Date()) {
  if (!settings?.enabled || settings.paused) return false;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const time = parts.hour + ':' + parts.minute;
  return settings.hours.some(h => h.day === day && time >= h.open && time < h.close);
}
const transitions = {
  NEW: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'], PREPARING: ['READY', 'CANCELLED'],
  READY: ['ON_THE_WAY', 'DELIVERED', 'CANCELLED'], ON_THE_WAY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], REJECTED: [], CANCELLED: [],
};
const orderSchema = z.object({
  request_id: z.string().uuid(), session_id: z.string().uuid(), quote_token: text(20, 40000),
  name: text(2, 160), phone: text(7, 24).regex(/^\+?[\d ()-]+$/).refine(v => /^\d{7,15}$/.test(v.replace(/\D/g, '')), 'Escribe un teléfono de 7 a 15 dígitos'), address: text(5, 300), references: text(0, 300).default(''), notes: text(0, 1000).default(''),
  terms_accepted: z.literal(true), marketing_consent: z.boolean().default(false),
});
const cartSchema = z.object({
  session_id: z.string().uuid(),
  zone_id: text(1, 40),
  items: z.array(z.object({ product_id: z.string().uuid(), variant_id: text(1, 60).nullable().optional(), quantity: z.number().int().min(1).max(99) })).min(1).max(30),
});
function minor(v) { return Math.round(Number(v) * 100); }
function variants(product) {
  // Additive schema in the existing product metadata; no separate catalog.
  const raw = product.metadata?.order_variants;
  if (!raw) return [];
  const schema = z.array(z.object({ id: text(1, 60), name: text(1, 120), price: money, available: z.boolean() })).max(30);
  return parse(schema, raw);
}
module.exports = { z, parse, text, money, settingsSchema, receiving, transitions, orderSchema, cartSchema, minor, variants };
