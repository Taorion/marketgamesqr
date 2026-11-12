// Inactive users remain blocked, except the original owner of an unpaid signup.
// Password recovery never activates a user, changes a seller or creates a payment.
async function eligibility(db, userId) {
  const row = (await db.query(`select u.is_active, u.deactivated_at, u.password_setup_required,
    (u.role='BUSINESS_OWNER' and not u.is_active and not b.is_active
      and b.subscription_status='PENDING_PAYMENT'
      and coalesce(b.portal_status,'') <> 'SUSPENDED'
      and b.settings->>'signup_type'='portal_subscription'
      and exists(select 1 from qr_credit_purchase_orders o where o.business_id=b.id
        and o.created_by_user_id=u.id and o.metadata->>'source'='public_portal_signup'
        and o.metadata->'signup'->>'user_id'=u.id::text
        and o.credited_at is null and o.status in ('PENDING','REJECTED'))
    ) pending_signup
    from app_users u left join businesses b on b.id=u.business_id where u.id=$1`, [userId])).rows[0];
  if (!row || row.deactivated_at || row.password_setup_required) return null;
  return row.is_active ? {pending:false} : row.pending_signup ? {pending:true} : null;
}
module.exports = {eligibility};
