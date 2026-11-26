const { badRequest } = require('../utils/http');

const NOTICE_VERSION = 'monthly-card-20261126';
const NOTICE = 'Al confirmar la inscripción de tu tarjeta en Mercado Pago, autorizas el cobro del plan cada mes. La renovación automática queda activada por defecto. Puedes desactivarla desde Mi cuenta → Renovación mensual automática y conservarás el periodo ya pagado.';

function paymentMode(plan, body = {}) {
  if (plan.billing_period === 'prepaid') return 'one_time';
  const mode = body.payment_mode || 'recurring_card';
  if (!['recurring_card', 'one_time'].includes(mode)) throw badRequest('Selecciona una forma de pago válida.');
  if (mode === 'recurring_card' && body.auto_renewal_consent !== true) {
    throw badRequest('Confirma el aviso de renovación automática antes de inscribir tu tarjeta. Actualiza la página si no ves el aviso.');
  }
  return mode;
}

function consentRecord(user, plan, amount) {
  return { version: NOTICE_VERSION, text: NOTICE, accepted_at: new Date().toISOString(), user_id: user.id || user.user_id,
    amount_cop: Number(amount), currency: 'COP', frequency: 1, frequency_type: 'months', plan_code: plan.code };
}

function manualMethods(base, plan) {
  if (plan.billing_period === 'prepaid') return base;
  return { ...base, excluded_payment_types: [...base.excluded_payment_types,
    { id: 'credit_card' }, { id: 'debit_card' }, { id: 'prepaid_card' }] };
}

module.exports = { paymentMode, consentRecord, manualMethods, NOTICE_VERSION, NOTICE };
