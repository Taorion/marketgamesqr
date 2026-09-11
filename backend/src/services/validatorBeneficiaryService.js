const { badRequest, forbidden } = require("../utils/http");

function cleanName(value) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, 180) || null; }
function normalizeEmail(value) { return String(value || "").trim().toLowerCase().slice(0, 240) || null; }
function normalizeDocument(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80) || null; }
function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  const national = digits.replace(/^57(?=\d{10}$)/, "");
  return national.length === 10 ? `+57${national}` : `+${digits}`;
}

function normalizeBeneficiary(input = {}) {
  return {
    player_id: input.player_id || null,
    name: cleanName(input.name),
    phone: normalizePhone(input.phone),
    email: normalizeEmail(input.email),
    document_id: normalizeDocument(input.document_id),
    capture_source: input.capture_source === "TICKET" ? "TICKET" : "VALIDATOR_IN_PERSON",
    data_use_confirmed: input.data_use_confirmed === true,
    marketing_consent: input.marketing_consent === true,
  };
}

function beneficiaryState(person = {}, documentRequired = false) {
  const normalized = normalizeBeneficiary(person);
  const missing = [!normalized.name && "name", !(normalized.phone || normalized.email || normalized.document_id) && "identifier", documentRequired && !normalized.document_id && "document_id"].filter(Boolean);
  const present = [normalized.name, normalized.phone, normalized.email, normalized.document_id].filter(Boolean).length;
  return { status: present === 0 ? "ANONYMOUS" : missing.length ? "PARTIAL" : "IDENTIFIED", missing_fields: missing, document_required: documentRequired, data: normalized };
}

async function resolveBeneficiary(client, { businessId, campaignId, gameId, branchId, sellerUserId, currentPlayerId, input, documentRequired = false, operationKey, qrCodeId }) {
  const beneficiary = normalizeBeneficiary(input);
  const state = beneficiaryState(beneficiary, documentRequired);
  if (state.missing_fields.includes("name")) throw badRequest("Ingresa el nombre completo del beneficiario.");
  if (state.missing_fields.includes("identifier")) throw badRequest("Ingresa al menos un teléfono, correo o documento confiable.");
  if (state.missing_fields.includes("document_id")) throw badRequest("Este beneficio exige verificar el documento del beneficiario.");
  if (!beneficiary.data_use_confirmed) throw badRequest("Confirma que el beneficiario suministró sus datos para gestionar esta redención.");

  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`validator-beneficiary:${businessId}:${beneficiary.document_id || beneficiary.email || beneficiary.phone}`]);
  if (beneficiary.player_id) {
    const supplied = await client.query("select * from players where id=$1 and business_id=$2 for update", [beneficiary.player_id, businessId]);
    if (!supplied.rowCount) throw forbidden("El contacto seleccionado no pertenece a este negocio.");
  }
  const matches = await client.query(
    `select p.*,
       ($2::text is not null and regexp_replace(lower(coalesce(p.document_id,'')), '[^a-z0-9]', '', 'g')=$2) document_match,
       ($3::text is not null and lower(nullif(p.email,''))=$3) email_match,
       ($4::text is not null and regexp_replace(regexp_replace(coalesce(p.phone,''), '\\D', '', 'g'), '^57([0-9]{10})$', '\\1')=regexp_replace(regexp_replace($4,'\\D','','g'), '^57([0-9]{10})$', '\\1')) phone_match
     from players p where p.business_id=$1 and (
       ($2::text is not null and regexp_replace(lower(coalesce(p.document_id,'')), '[^a-z0-9]', '', 'g')=$2)
       or ($3::text is not null and lower(nullif(p.email,''))=$3)
       or ($4::text is not null and regexp_replace(regexp_replace(coalesce(p.phone,''), '\\D', '', 'g'), '^57([0-9]{10})$', '\\1')=regexp_replace(regexp_replace($4,'\\D','','g'), '^57([0-9]{10})$', '\\1'))
     ) order by p.created_at, p.id for update`,
    [businessId, beneficiary.document_id, beneficiary.email, beneficiary.phone]
  );
  const ids = new Set(matches.rows.map((row) => row.id));
  if (ids.size > 1) throw badRequest("Conflicto de identidad: los datos ingresados pertenecen a contactos diferentes. Corrígelos o selecciona el contacto correcto desde el Directorio.");
  let player = matches.rows[0] || null;
  if (beneficiary.player_id && player && player.id !== beneficiary.player_id) throw badRequest("Conflicto de identidad: el contacto seleccionado no coincide con los datos ingresados.");
  if (!player && currentPlayerId) {
    const current = await client.query("select * from players where id=$1 and business_id=$2 for update", [currentPlayerId, businessId]);
    player = current.rows[0] || null;
  }
  const audit = { source: "validator_in_person", capture_source: beneficiary.capture_source, captured_by_user_id: sellerUserId, captured_at: new Date().toISOString(), operation_key: operationKey, qr_code_id: qrCodeId, marketing_consent: beneficiary.marketing_consent };
  if (player) {
    const contradictions = [["name", beneficiary.name], ["phone", beneficiary.phone], ["email", beneficiary.email], ["document_id", beneficiary.document_id]].filter(([key, value]) => value && player[key] && normalizeBeneficiary({ [key]: player[key] })[key] !== value);
    if (contradictions.length) throw badRequest(`Conflicto de identidad: ${contradictions.map(([key]) => ({name:"el nombre",phone:"el teléfono",email:"el correo",document_id:"el documento"}[key])).join(", ")} no coincide con el contacto existente.`);
    const updated = await client.query(
      `update players set name=coalesce(name,$3), phone=coalesce(phone,$4), email=coalesce(email,$5), document_id=coalesce(document_id,$6), branch_id=coalesce(branch_id,$7), seller_user_id=coalesce(seller_user_id,$8), metadata=coalesce(metadata,'{}'::jsonb)||$9::jsonb where id=$1 and business_id=$2 returning *`,
      [player.id, businessId, beneficiary.name, beneficiary.phone, beneficiary.email, beneficiary.document_id, branchId || null, sellerUserId || null, JSON.stringify({ validator_identity: audit })]
    );
    return { player: updated.rows[0], created: false, match: matches.rows[0] ? "EXISTING_CONTACT" : "TICKET_CONTACT", audit };
  }
  const created = await client.query(
    `insert into players (business_id,campaign_id,game_id,branch_id,seller_user_id,name,phone,email,document_id,metadata) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) returning *`,
    [businessId, campaignId || null, gameId || null, branchId || null, sellerUserId || null, beneficiary.name, beneficiary.phone, beneficiary.email, beneficiary.document_id, JSON.stringify({ source: "validator_in_person", validator_identity: audit, marketing_consent: false })]
  );
  return { player: created.rows[0], created: true, match: "CONTACT_CREATED", audit };
}

module.exports = { beneficiaryState, normalizeBeneficiary, resolveBeneficiary };
