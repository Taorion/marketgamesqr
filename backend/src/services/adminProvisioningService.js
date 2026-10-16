function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function ensureBaseBusinessRecords(client, businessId, businessName) {
  const baseSlug = slugify(businessName) || "cliente";
  const branch = await client.query(
    `insert into branches (business_id, name, slug, address, is_active)
     values ($1, 'Sede principal', 'sede-principal', $2, true)
     on conflict (business_id, slug) do update
     set name = excluded.name,
         address = excluded.address,
         is_active = true,
         updated_at = now()
     returning id, name`,
    [businessId, businessName]
  );

  const game = await client.query(
    `insert into games (business_id, name, slug, metadata, is_active)
     values ($1, $2, $3, $4::jsonb, true)
     on conflict (business_id, slug) do update
     set name = excluded.name,
         metadata = excluded.metadata,
         is_active = true,
         updated_at = now()
     returning id, name`,
    [
      businessId,
      `Motor Comercial ${businessName}`,
      `${baseSlug}-rms`,
      JSON.stringify({ type: "agreement_client", source: "admin_agreement_provisioning" }),
    ]
  );

  const reward = await client.query(
    `insert into rewards (business_id, name, description, display_in_validator, metadata, is_active)
     values ($1, $2, $3, $4, $5::jsonb, true)
     on conflict (business_id, name) do update
     set description = excluded.description,
         display_in_validator = excluded.display_in_validator,
         metadata = excluded.metadata,
         is_active = true,
         updated_at = now()
     returning id, name`,
    [
      businessId,
      `Beneficio ${businessName}`,
      `Beneficio configurable para operaciones RMS de ${businessName}.`,
      `Validar beneficio ${businessName}.`,
      JSON.stringify({ agreement_default: true }),
    ]
  );

  return {
    branch: branch.rows[0],
    game: game.rows[0],
    reward: reward.rows[0],
  };
}

async function assignInitialAgreementTickets(client, businessId, quantity, userId, notes) {
  const amount = Number(quantity || 0);
  if (!amount) {
    const existing = await client.query(
      "select * from business_qr_credit_accounts where business_id = $1",
      [businessId]
    );
    return existing.rows[0] || null;
  }

  const existing = await client.query(
    "select * from business_qr_credit_accounts where business_id = $1 for update",
    [businessId]
  );
  const currentBalance = Number(existing.rows[0]?.qr_balance || 0);
  const currentUsed = Number(existing.rows[0]?.qr_used_total || 0);
  const nextBalance = currentBalance + amount;
  const nextPurchased = Number(existing.rows[0]?.qr_purchased_total || 0) + amount;
  const label = `${amount.toLocaleString("es-CO")} tickets iniciales por convenio`;

  const account = await client.query(
    `insert into business_qr_credit_accounts
      (business_id, current_package_size, qr_balance, qr_purchased_total,
       public_label, internal_unit_price_cop, last_purchase_at)
     values ($1, $2, $3, $4, $5, 0, now())
     on conflict (business_id) do update
     set current_package_size = $2,
         qr_balance = $3,
         qr_purchased_total = $4,
         public_label = $5,
         internal_unit_price_cop = 0,
         last_purchase_at = now(),
         updated_at = now()
     returning *`,
    [businessId, amount, nextBalance, Math.max(nextPurchased, currentUsed + nextBalance), label]
  );

  await client.query(
    `insert into business_qr_credit_ledger
      (business_id, account_id, entry_type, package_size, delta_qr, balance_after,
       internal_unit_price_cop, internal_total_cop, public_label, notes, created_by_user_id)
     values ($1, $2, 'MANUAL_ADJUSTMENT', $3, $4, $5, 0, 0, $6, $7, $8)`,
    [
      businessId,
      account.rows[0].id,
      amount,
      amount,
      account.rows[0].qr_balance,
      label,
      notes || "Tickets iniciales asignados por convenio comercial.",
      userId,
    ]
  );

  return account.rows[0];
}


module.exports = { ensureBaseBusinessRecords, assignInitialAgreementTickets };
