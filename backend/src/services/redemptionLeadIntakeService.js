function normalizedIdentity(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizedPhone(value) {
  return String(value || "").replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
}

async function findContact(client, businessId, contact = {}) {
  const documentId = normalizedIdentity(contact.document_id || contact.document);
  const email = String(contact.email || "").trim().toLowerCase() || null;
  const phone = normalizedPhone(contact.phone) || null;
  if (!documentId && !email && !phone) return null;
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`redemption-contact:${businessId}:${documentId || email || phone}`]);
  const result = await client.query(
    `select * from (
       select p.id, 'PLAYER'::text source_type, p.created_at, 1 source_rank
       from players p where p.business_id=$1 and (
         ($2::text <> '' and regexp_replace(lower(coalesce(p.document_id,'')), '[^a-z0-9]', '', 'g')=$2)
         or ($3::text is not null and lower(nullif(p.email,''))=$3)
         or ($4::text is not null and regexp_replace(regexp_replace(coalesce(p.phone,''), '\\D', '', 'g'), '^57([0-9]{10})$', '\\1')=$4)
       )
       union all
       select m.id, 'MANUAL'::text, m.created_at, 2 from business_manual_leads m where m.business_id=$1 and (
         ($2::text <> '' and regexp_replace(lower(coalesce(m.document_id,'')), '[^a-z0-9]', '', 'g')=$2)
         or ($3::text is not null and lower(nullif(m.email,''))=$3)
         or ($4::text is not null and regexp_replace(regexp_replace(coalesce(m.phone,''), '\\D', '', 'g'), '^57([0-9]{10})$', '\\1')=$4)
       )
       union all
       select a.id, 'AFFILIATE'::text, a.created_at, 3 from affiliates a where a.business_id=$1 and a.status <> 'DELETED' and (
         ($2::text <> '' and regexp_replace(lower(coalesce(a.document_id,'')), '[^a-z0-9]', '', 'g')=$2)
         or ($3::text is not null and lower(nullif(a.email,''))=$3)
         or ($4::text is not null and regexp_replace(regexp_replace(coalesce(a.phone,''), '\\D', '', 'g'), '^57([0-9]{10})$', '\\1')=$4)
       )
     ) contacts order by source_rank, created_at limit 1`,
    [businessId, documentId, email, phone]
  );
  return result.rows[0] || null;
}

async function ensureRewardPassContact(client, pass) {
  let contact = await findContact(client, pass.company_id, {
    document_id: pass.beneficiary_document,
    email: pass.beneficiary_email,
    phone: pass.beneficiary_phone,
  });
  if (contact) return contact;
  const created = await client.query(
    `insert into players (business_id, campaign_id, game_id, name, email, phone, document_id, metadata)
     values ($1,$2,null,$3,$4,$5,$6,$7::jsonb) returning id, created_at`,
    [pass.company_id, pass.campaign_id || null, pass.beneficiary_name || "Beneficiario Reward Pass",
      pass.beneficiary_email || null, pass.beneficiary_phone || null, pass.beneficiary_document || null,
      JSON.stringify({ source: "reward_pass", lead_source: "Reward Pass", reward_pass_id: pass.id, public_code: pass.public_code })]
  );
  contact = created.rows[0];
  return { ...contact, source_type: "PLAYER" };
}

async function resolveQrContact(client, qr) {
  if (qr.player_id) return { id: qr.player_id, source_type: "PLAYER" };
  const participant = await client.query(
    `select p.source_type, p.source_id
       from interactive_activation_rewards r
       join interactive_activation_participants p on p.id=r.participant_id
      where r.qr_code_id=$1 and p.company_id=$2 and p.source_type in ('PLAYER','MANUAL','AFFILIATE')
      order by r.created_at desc limit 1`,
    [qr.id, qr.business_id]
  );
  if (participant.rowCount && participant.rows[0].source_id) return { id: participant.rows[0].source_id, source_type: participant.rows[0].source_type };
  if (qr.affiliate_id) return { id: qr.affiliate_id, source_type: "AFFILIATE" };
  return null;
}

async function registerRedemptionIntake(client, options) {
  const { businessId, contact, userId, campaignId = null, origin, dedupeKey, description, metadata = {} } = options;
  if (!contact?.id || !contact?.source_type) return null;
  const leadId = contact.source_type === "PLAYER" ? contact.id : null;
  await client.query(
    `insert into rms_lead_state
       (business_id, source_type, source_id, lead_id, rms_phase, priority, recommended_action, last_operation, last_material_sent, revenue_potential, metadata, created_by, updated_by)
     values ($1,$2,$3,$4,'recoleccion','HIGH','Contactar al lead y continuar su proceso comercial',$5,$6,0,$7::jsonb,$8,$8)
     on conflict (business_id, source_type, source_id) do update set
       lead_id=coalesce(rms_lead_state.lead_id, excluded.lead_id),
       rms_phase=coalesce(rms_lead_state.rms_phase, excluded.rms_phase),
       priority=case when rms_lead_state.priority='CRITICAL' then rms_lead_state.priority else excluded.priority end,
       last_operation=excluded.last_operation,
       last_material_sent=excluded.last_material_sent,
       metadata=coalesce(rms_lead_state.metadata,'{}'::jsonb) || excluded.metadata,
       updated_by=excluded.updated_by, updated_at=now()`,
    [businessId, contact.source_type, contact.id, leadId, description, origin, JSON.stringify({ source_flow: "qr_redemption_intake", campaign_id: campaignId, ...metadata }), userId]
  );
  const existing = await client.query(
    `select id from lead_notes where business_id=$1 and source_type=$2 and source_id=$3 and metadata->>'dedupe_key'=$4 limit 1`,
    [businessId, contact.source_type, contact.id, dedupeKey]
  );
  if (!existing.rowCount) {
    await client.query(
      `insert into lead_notes
        (business_id, lead_id, source_type, source_id, note, note_type, next_action, agenda_priority, progress_percent, checklist, metadata, created_by)
       values ($1,$2,$3,$4,$5,'follow_up','Contactar y calificar en Recolector','HIGH',0,'[]'::jsonb,$6::jsonb,$7)`,
      [businessId, leadId, contact.source_type, contact.id, description, JSON.stringify({ dedupe_key: dedupeKey, agenda_scope: "CONTACT", origin, campaign_id: campaignId, ...metadata }), userId]
    );
    await client.query(
      `insert into lead_events (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, created_by, metadata)
       values ($1,$2,$3,$4,'qr_redemption_intake','Redención recibida en Recolector',$5,$6,$7::jsonb)`,
      [businessId, leadId, contact.source_type, contact.id, description, userId, JSON.stringify({ dedupe_key: dedupeKey, origin, ...metadata })]
    );
  }
  return contact;
}

module.exports = { ensureRewardPassContact, resolveQrContact, registerRedemptionIntake };
