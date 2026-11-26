// Billing timestamps can be set by Admin at UTC midnight. The prior paid
// commission already owns its calendar month in Colombia. A contiguous renewal
// must begin at that month's boundary, even when midnight falls a day earlier.
// Never infer a renewal from an unpaid order or advance across a coverage gap.
async function commissionStartsAt(db, businessId, orderId, billingStart) {
  const prior = await db.query(`
    select c.coverage_ends_on::text commission_day
    from qori_seller_commissions c
    join qr_credit_purchase_orders o on o.id=c.order_id
    where c.business_id=$1 and o.business_id=$1 and o.id<>$2
      and c.kind='SUBSCRIPTION' and c.policy_version='QORI_2026_VF1'
      and c.status<>'VOID' and c.reversed_at is null
      and o.status='APPROVED' and o.credited_at is not null
      and (o.metadata->'commission_period'->>'ends_at')::timestamptz=$3::timestamptz
      and abs(c.coverage_ends_on-($3::timestamptz at time zone 'America/Bogota')::date)<=1
    order by c.coverage_ends_on desc limit 1`, [businessId, orderId, billingStart.toISOString()]);
  return prior.rows[0]
    ? new Date(prior.rows[0].commission_day + 'T12:00:00.000Z')
    : billingStart;
}
module.exports = { commissionStartsAt };
