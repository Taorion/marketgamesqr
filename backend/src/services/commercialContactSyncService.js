const { badRequest } = require('../utils/http');

// Admin's CRM belongs to Orbital Innovation. The legacy sales directory uses a
// different internal account; do not reuse its tenant resolver here.
async function commercialContactBusiness(client) {
  return (await client.query(`select id,name,slug from businesses
    where slug='orbital-innovation-sas' and is_active=true
      and settings->>'internal_account'='true' limit 1`)).rows[0] || null;
}

// All callers pass their transaction: an enrollment and its CRM contact commit together.
async function syncCommercialContact(client, { prospect = null, business = null, sellerId = null, actorId = null }) {
  const internal = await commercialContactBusiness(client);
  if (!internal || business?.id === internal.id) return null;
  const settings = business?.settings || {};
  const email = String(prospect?.email || settings.contact_email || '').trim().toLowerCase();
  const phone = prospect?.phone || settings.phone || null;
  const phoneKey = String(phone || '').replace(/\D/g, '');
  const company = prospect?.business_name || business?.name;
  const name = prospect?.contact_name || settings.contact_name || company;
  if (!name) return null;
  // Serialize admin syncs in this tenant, including different prospects with the same email.
  await client.query('select pg_advisory_xact_lock(hashtext($1))', [`qori-admin-contacts:${internal.id}`]);
  const seller = sellerId ? (await client.query('select id,full_name,business_id from app_users where id=$1', [sellerId])).rows[0] : null;
  const portalSellerId = seller?.business_id === internal.id ? seller.id : null;
  const sources = [
    { table: 'players', metadata: 'metadata', type: 'PLAYER' },
    { table: 'affiliates', metadata: 'card_metadata', type: 'AFFILIATE' },
    { table: 'business_manual_leads', metadata: 'metadata', type: 'MANUAL' },
  ];
  const candidates = [];
  for (const source of sources) {
    const rows = await client.query(`select id,${source.metadata} as metadata,
      (${source.metadata}->'qori_admin'->>'prospect_id'=$2 or ${source.metadata}->'qori_admin'->>'business_id'=$3) as linked
      from ${source.table} where business_id=$1 and
      ((${source.metadata}->'qori_admin'->>'prospect_id'=$2 or ${source.metadata}->'qori_admin'->>'business_id'=$3)
        or ($4<>'' and lower(btrim(email))=$4)
        or (length($5)>=7 and regexp_replace(phone,'[^0-9]','','g')=$5 and nullif(btrim(email),'') is null)) order by created_at,id for update`,
    [internal.id, prospect?.id || null, business?.id || prospect?.business_id || null, email, phoneKey]);
    candidates.push(...rows.rows.map(row => ({ ...row, ...source })));
  }
  const linked = candidates.filter(row => row.linked);
  const existing = linked[0] || candidates[0];
  const businessId = business?.id || prospect?.business_id || null;
  if (existing?.metadata?.qori_admin?.business_id && businessId && existing.metadata.qori_admin.business_id !== businessId) {
    throw badRequest('El contacto ya está vinculado a otra empresa inscrita. Revisa el correo del prospecto.');
  }
  const metadata = {
    ...(existing?.metadata || {}),
    company: existing?.metadata?.company || company,
    city: existing?.metadata?.city || settings.city || null,
    qori_admin: {
      ...(existing?.metadata?.qori_admin || {}),
      created_by_sync: existing ? existing.metadata?.qori_admin?.created_by_sync === true : true,
      prospect_id: prospect?.id || existing?.metadata?.qori_admin?.prospect_id || null,
      business_id: businessId || existing?.metadata?.qori_admin?.business_id || null,
      seller_id: sellerId,
      seller_name: seller?.full_name || null,
      stage: prospect?.stage || (business ? 'WON' : 'NEW'),
      plan_code: business?.plan_code || existing?.metadata?.qori_admin?.plan_code || null,
    },
  };
  if (existing) {
    if (existing.type === 'MANUAL') {
      await client.query(`update business_manual_leads set metadata=$3::jsonb,seller_user_id=$4,
        company=case when $8 then $5 else coalesce(nullif(company,''),$5) end,
        email=case when $8 then $6 else coalesce(nullif(email,''),$6) end,
        phone=case when $8 then $7 else coalesce(nullif(phone,''),$7) end,
        name=case when $8 then $9 else name end,updated_at=now()
        where business_id=$1 and id=$2`, [internal.id,existing.id,JSON.stringify(metadata),portalSellerId,company,email || null,phone,metadata.qori_admin.created_by_sync,name]);
    } else {
      await client.query(`update ${existing.table} set ${existing.metadata}=$3::jsonb,seller_user_id=$4
        where business_id=$1 and id=$2`, [internal.id,existing.id,JSON.stringify(metadata),portalSellerId]);
    }
    return { id: existing.id, source_type: existing.type, business_id: internal.id, created: false };
  }
  const result = await client.query(`insert into business_manual_leads
    (business_id,created_by_user_id,name,email,phone,company,source,source_detail,notes,metadata,seller_user_id,created_at)
    values($1,$2,$3,$4,$5,$6,'Admin Qori','Inscripción o prospecto comercial de Qori',$7,$8::jsonb,$9,coalesce($10::timestamptz,now())) returning id`,
  [internal.id,actorId,name,email || null,phone,company,prospect?.notes || null,JSON.stringify(metadata),portalSellerId,prospect?.created_at || business?.created_at || null]);
  return { id: result.rows[0].id, source_type: 'MANUAL', business_id: internal.id, created: true };
}

async function syncCommercialBusiness(client, businessId, actorId = null) {
  const business = (await client.query('select * from businesses where id=$1', [businessId])).rows[0];
  if (!business) return null;
  if (!business.settings?.contact_email) {
    const owner = (await client.query("select email,full_name from app_users where business_id=$1 and role='BUSINESS_OWNER' order by created_at,id limit 1", [businessId])).rows[0];
    business.settings = { ...business.settings, contact_email: owner?.email, contact_name: business.settings?.contact_name || owner?.full_name };
  }
  const prospect = (await client.query('select * from qori_sales_prospects where business_id=$1 order by created_at,id limit 1', [businessId])).rows[0];
  const account = (await client.query('select seller_id from qori_sales_accounts where business_id=$1', [businessId])).rows[0];
  return syncCommercialContact(client, { business, prospect, sellerId: account ? account.seller_id : prospect?.seller_id || null, actorId });
}

module.exports = { commercialContactBusiness, syncCommercialContact, syncCommercialBusiness };
