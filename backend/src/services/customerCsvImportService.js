const { query, withTransaction } = require("../config/db");
const { badRequest, notFound } = require("../utils/http");

const CUSTOMER_CSV_HEADERS = [
  "nombre", "apellido", "tipo_documento", "numero_documento", "correo", "telefono",
  "empresa", "canal_preferido", "fecha_ultima_compra", "total_compras", "valor_acumulado", "notas", "responsable_comercial",
];
const CUSTOMER_CSV_REQUIRED_HEADERS = ["nombre"];
const CUSTOMER_CSV_HEADER_ALIASES = Object.freeze({
  nombres: "nombre", nombre_completo: "nombre", cliente: "nombre",
  apellidos: "apellido",
  tipo_de_documento: "tipo_documento", tipo_doc: "tipo_documento",
  documento: "numero_documento", numero_de_documento: "numero_documento", nro_documento: "numero_documento",
  email: "correo", correo_electronico: "correo", e_mail: "correo",
  celular: "telefono", movil: "telefono", numero_telefono: "telefono",
  compania: "empresa", organizacion: "empresa",
  canal: "canal_preferido", medio_preferido: "canal_preferido",
  responsable: "responsable_comercial", asesor: "responsable_comercial", asesor_comercial: "responsable_comercial",
  comercial: "responsable_comercial", vendedor: "responsable_comercial", ejecutivo_comercial: "responsable_comercial",
  responsable_email: "responsable_comercial", correo_responsable: "responsable_comercial",
  ultima_compra: "fecha_ultima_compra", fecha_compra: "fecha_ultima_compra",
  compras: "total_compras", numero_compras: "total_compras", cantidad_compras: "total_compras",
  valor_total: "valor_acumulado", total_gastado: "valor_acumulado", revenue: "valor_acumulado",
  observaciones: "notas", nota: "notas",
});
const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_CSV_ROWS = 2000;
const IMPORT_CHUNK_SIZE = 50;

function normalizeHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function canonicalHeader(value) {
  const normalized = normalizeHeader(value);
  return CUSTOMER_CSV_HEADER_ALIASES[normalized] || normalized;
}

function normalizeDocument(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function detectCsvDelimiter(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const counts = new Map([[",", 0], [";", 0], ["\t", 0]]);
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') { index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (!quoted && (character === "\n" || character === "\r")) break;
    if (!quoted && counts.has(character)) counts.set(character, counts.get(character) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ",";
}

function parseCsv(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const delimiter = detectCsvDelimiter(source);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw badRequest("El CSV contiene una comilla sin cerrar.");
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => String(value).trim())) rows.push(row);
  return { delimiter, rows };
}

function parseMoney(value) {
  const raw = String(value ?? "").trim().replace(/\s/g, "").replace(/\$/g, "");
  if (!raw) return null;
  let normalized = raw;
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  if (comma < 0 && (raw.match(/\./g) || []).length > 1) normalized = raw.replace(/\./g, "");
  else if (dot < 0 && (raw.match(/,/g) || []).length > 1) normalized = raw.replace(/,/g, "");
  else if (comma > dot) normalized = raw.replace(/\./g, "").replace(",", ".");
  else if (dot > comma && comma >= 0) normalized = raw.replace(/,/g, "");
  else if (comma >= 0) normalized = raw.replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

function parsePurchaseDate(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : date.toISOString();
}

function csvEscape(value) {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function customerTemplateCsv() {
  const example = ["Ana", "Gómez", "CC", "1020304050", "ana.gomez@ejemplo.com", "+57 300 123 4567", "Empresa Ejemplo", "WhatsApp", "2026-08-15", "3", "1250000.00", "Cliente histórico de ejemplo", "vendedor@empresa.com"];
  return `\uFEFF${CUSTOMER_CSV_HEADERS.join(",")}\r\n${example.map(csvEscape).join(",")}\r\n`;
}

function validateCsvEnvelope(payload = {}) {
  const fileName = String(payload.file_name || "").trim();
  const csvText = String(payload.csv_text || "");
  const declaredSize = Number(payload.file_size || 0);
  const actualSize = Buffer.byteLength(csvText, "utf8");
  if (!/\.csv$/i.test(fileName)) throw badRequest("El archivo debe tener extensión .csv.");
  const mimeType = String(payload.mime_type || "").trim().toLowerCase();
  const allowedMimeTypes = new Set(["", "text/csv", "application/csv", "text/plain", "text/tab-separated-values", "application/vnd.ms-excel", "application/octet-stream"]);
  if (!allowedMimeTypes.has(mimeType)) throw badRequest("El tipo de archivo no corresponde a un CSV.");
  if (!csvText.trim()) throw badRequest("El archivo CSV está vacío.");
  if (declaredSize > MAX_CSV_BYTES || actualSize > MAX_CSV_BYTES) throw badRequest("El CSV supera el máximo permitido de 2 MB.");
  return { fileName: fileName.slice(0, 240), csvText };
}

function parseCustomerCsv(payload = {}) {
  const envelope = validateCsvEnvelope(payload);
  const csv = parseCsv(envelope.csvText);
  const parsed = csv.rows;
  if (parsed.length < 2) throw badRequest("El CSV no contiene filas de clientes.");
  const headers = parsed[0].map(canonicalHeader);
  const recognizedHeaders = headers.filter((header) => CUSTOMER_CSV_HEADERS.includes(header));
  const duplicateHeaders = recognizedHeaders.filter((header, index) => recognizedHeaders.indexOf(header) !== index);
  if (duplicateHeaders.length) throw badRequest("El CSV contiene encabezados repetidos.", { duplicate_headers: [...new Set(duplicateHeaders)] });
  const missingRequired = CUSTOMER_CSV_REQUIRED_HEADERS.filter((header) => !recognizedHeaders.includes(header));
  if (missingRequired.length || !recognizedHeaders.length) {
    throw badRequest("No pudimos reconocer la columna de nombre. Conserva al menos 'nombre' y usa coma, punto y coma o tabulación como separador.", { missing_headers: missingRequired, received_headers: parsed[0] });
  }
  if (parsed.length - 1 > MAX_CSV_ROWS) throw badRequest(`El CSV supera el máximo de ${MAX_CSV_ROWS} filas.`);
  const headerIndex = new Map(headers.map((header, index) => [header, index]).filter(([header]) => CUSTOMER_CSV_HEADERS.includes(header)));
  const ignoredHeaders = headers.filter((header) => header && !CUSTOMER_CSV_HEADERS.includes(header));
  const rows = parsed.slice(1).map((values, index) => {
    const original = Object.fromEntries(CUSTOMER_CSV_HEADERS.map((header) => {
      const columnIndex = headerIndex.get(header);
      return [header, columnIndex === undefined ? "" : String(values[columnIndex] || "").trim()];
    }));
    const normalizedEmail = normalizeEmail(original.correo);
    const normalizedPhone = normalizePhone(original.telefono);
    const emailIsValid = !normalizedEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    const phoneIsValid = !normalizedPhone || (normalizedPhone.length >= 7 && normalizedPhone.length <= 15);
    const row = {
      row_number: index + 2,
      original,
      first_name: original.nombre,
      last_name: original.apellido,
      name: [original.nombre, original.apellido].filter(Boolean).join(" ").trim(),
      document_type: String(original.tipo_documento || "").trim().toUpperCase(),
      document_id: normalizeDocument(original.numero_documento),
      email: emailIsValid ? normalizedEmail : "",
      phone: phoneIsValid ? normalizedPhone : "",
      company: original.empresa,
      preferred_channel: original.canal_preferido,
      commercial_owner_reference: String(original.responsable_comercial || "").trim(),
      commercial_owner: null,
      purchase_date: parsePurchaseDate(original.fecha_ultima_compra),
      purchase_count: /^\d+$/.test(original.total_compras) ? Number(original.total_compras) : null,
      total_spent: parseMoney(original.valor_acumulado),
      notes: original.notas,
      errors: [],
      warnings: [],
    };
    if (values.length > headers.length) row.warnings.push(`Se ignoraron ${values.length - headers.length} valor(es) sin encabezado.`);
    if (!row.name) row.errors.push("Campo obligatorio vacío: nombre.");
    if (!row.document_id && !row.email && !row.phone) row.warnings.push("Contacto sin identificador; completa documento, correo o teléfono cuando esté disponible.");
    if (normalizedEmail && !emailIsValid) row.warnings.push("Correo omitido porque su formato no es válido.");
    if (normalizedPhone && !phoneIsValid) row.warnings.push("Teléfono omitido porque su formato no es válido.");
    if (row.document_id && !row.document_type) row.warnings.push("Tipo de documento pendiente.");
    if (original.fecha_ultima_compra && !row.purchase_date) row.warnings.push("Fecha de compra pendiente o incorrecta; usa AAAA-MM-DD.");
    if (original.total_compras && (!Number.isInteger(row.purchase_count) || row.purchase_count < 1)) row.warnings.push("Cantidad de compras pendiente o inválida.");
    if (original.valor_acumulado && !row.total_spent) row.warnings.push("Valor acumulado pendiente o inválido.");
    row.has_commercial_evidence = Boolean(row.purchase_date && Number.isInteger(row.purchase_count) && row.purchase_count > 0 && row.total_spent > 0);
    if (!row.has_commercial_evidence) row.warnings.push("Historial comercial pendiente: se importará como Cliente con cero compras y cero revenue hasta completar datos reales.");
    return row;
  });

  const seen = { document: new Map(), email: new Map(), phone: new Map() };
  rows.forEach((row) => {
    const candidates = [["document", row.document_id], ["email", row.email], ["phone", row.phone]];
    for (const [kind, value] of candidates) {
      if (!value) continue;
      if (seen[kind].has(value)) {
        row.errors.push(`${kind === "document" ? "Documento" : kind === "email" ? "Correo" : "Teléfono"} duplicado dentro del archivo (fila ${seen[kind].get(value)}).`);
        break;
      }
    }
    candidates.forEach(([kind, value]) => { if (value && !seen[kind].has(value)) seen[kind].set(value, row.row_number); });
  });
  return { fileName: envelope.fileName, delimiter: csv.delimiter, ignoredHeaders, rows };
}

function normalizeOwnerReference(value) {
  return String(value || "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ");
}

function matchCommercialOwner(reference, owners = []) {
  const raw = String(reference || "").trim();
  if (!raw) return { owner: null, warning: null };
  const normalized = normalizeOwnerReference(raw);
  const idMatch = owners.find((owner) => String(owner.id) === raw);
  const emailMatch = owners.find((owner) => normalizeEmail(owner.email) === normalizeEmail(raw));
  const nameMatches = owners.filter((owner) => normalizeOwnerReference(owner.full_name) === normalized);
  const owner = idMatch || emailMatch || (nameMatches.length === 1 ? nameMatches[0] : null);
  if (owner) return { owner, warning: null };
  if (nameMatches.length > 1) {
    return { owner: null, warning: `Responsable comercial ambiguo: ${raw}. Usa su correo corporativo.` };
  }
  return { owner: null, warning: `Responsable comercial no encontrado en este negocio: ${raw}. El contacto quedará sin asignar.` };
}

async function resolveCommercialOwners(businessId, rows, db = query) {
  if (!rows.some((row) => row.commercial_owner_reference)) return rows;
  const result = await db(
    `select id, full_name, email, role
       from app_users
      where business_id = $1
        and is_active = true
        and role in ('BUSINESS_OWNER', 'BUSINESS_MANAGER', 'BUSINESS_SELLER', 'VALIDATOR')
      order by full_name asc, email asc`,
    [businessId]
  );
  rows.forEach((row) => {
    const resolved = matchCommercialOwner(row.commercial_owner_reference, result.rows);
    row.commercial_owner = resolved.owner;
    if (resolved.warning) row.warnings.push(resolved.warning);
  });
  return rows;
}

function applyDefaultCommercialOwner(rows, sellerUserId) {
  const fallback = String(sellerUserId || "").trim();
  if (!fallback) return rows;
  rows.forEach((row) => {
    if (!row.commercial_owner_reference) row.commercial_owner_reference = fallback;
  });
  return rows;
}

function identityKey(row) {
  if (row.document_id) return `document:${row.document_id}`;
  if (row.email) return `email:${row.email}`;
  if (row.phone) return `phone:${row.phone}`;
  return `pending:${normalizeHeader(row.name)}:${row.row_number}`;
}

async function existingContactsForRows(businessId, rows, db = query) {
  const documents = [...new Set(rows.map((row) => row.document_id).filter(Boolean))];
  const emails = [...new Set(rows.map((row) => row.email).filter(Boolean))];
  const phones = [...new Set(rows.map((row) => row.phone).filter(Boolean))];
  if (!documents.length && !emails.length && !phones.length) return [];
  const result = await db(
    `with contacts as (
       select p.id, 'PLAYER'::text as source_type, p.name, regexp_replace(upper(coalesce(p.document_id, '')), '[^A-Z0-9]', '', 'g') as document_id,
              lower(nullif(p.email, '')) as email, regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') as phone,
              coalesce(p.metadata->>'customer_import_declared', 'false') = 'true' as declared_customer
         from players p where p.business_id = $1 and coalesce(p.metadata->>'lifecycle_status', 'ACTIVE') <> 'ARCHIVED'
       union all
       select ml.id, 'MANUAL'::text, ml.name, regexp_replace(upper(coalesce(ml.document_id, '')), '[^A-Z0-9]', '', 'g'),
              lower(nullif(ml.email, '')), regexp_replace(coalesce(ml.phone, ''), '\\D', '', 'g'),
              coalesce(ml.metadata->>'customer_import_declared', 'false') = 'true'
         from business_manual_leads ml where ml.business_id = $1 and ml.status <> 'ARCHIVED'
       union all
       select a.id, 'AFFILIATE'::text, a.full_name, regexp_replace(upper(coalesce(a.document_id, '')), '[^A-Z0-9]', '', 'g'),
              lower(nullif(a.email, '')), regexp_replace(coalesce(a.phone, ''), '\\D', '', 'g'),
              coalesce(a.card_metadata->>'customer_import_declared', 'false') = 'true'
         from affiliates a where a.business_id = $1 and a.status <> 'DELETED'
     )
     select c.*,
            (c.declared_customer or exists (
              select 1 from business_sales bs where bs.business_id = $1 and (
                (nullif(c.document_id, '') is not null and regexp_replace(upper(coalesce(bs.customer_document_id, '')), '[^A-Z0-9]', '', 'g') = c.document_id)
                or (nullif(c.email, '') is not null and lower(bs.customer_email) = c.email)
                or (nullif(c.phone, '') is not null and regexp_replace(coalesce(bs.customer_phone, ''), '\\D', '', 'g') = c.phone)
                or (bs.metadata->>'crm_source_type' = c.source_type and bs.metadata->>'crm_source_id' = c.id::text)
              )
            )) as is_customer
       from contacts c
      where (cardinality($2::text[]) > 0 and c.document_id = any($2::text[]))
         or (cardinality($3::text[]) > 0 and c.email = any($3::text[]))
         or (cardinality($4::text[]) > 0 and c.phone = any($4::text[]))`,
    [businessId, documents, emails, phones]
  );
  return result.rows;
}

function matchExisting(row, contacts) {
  return contacts.find((contact) => row.document_id && contact.document_id === row.document_id)
    || contacts.find((contact) => row.email && contact.email === row.email)
    || contacts.find((contact) => row.phone && contact.phone === row.phone)
    || null;
}

async function previewCustomerCsv(businessId, payload) {
  const parsed = parseCustomerCsv(payload);
  applyDefaultCommercialOwner(parsed.rows, payload.default_seller_user_id);
  await resolveCommercialOwners(businessId, parsed.rows);
  const contacts = await existingContactsForRows(businessId, parsed.rows.filter((row) => !row.errors.length));
  const previewRows = parsed.rows.map((row) => {
    const existing = row.errors.length ? null : matchExisting(row, contacts);
    const errors = [...row.errors];
    if (existing?.is_customer) errors.push("Cliente existente.");
    const validStatus = "VALID_CUSTOMER";
    return {
      row_number: row.row_number,
      data: row.original,
      normalized: { name: row.name, document_id: row.document_id, email: row.email, phone: row.phone, purchase_count: row.purchase_count, total_spent: row.total_spent, purchase_date: row.purchase_date, has_commercial_evidence: row.has_commercial_evidence, commercial_owner: row.commercial_owner ? { id: row.commercial_owner.id, name: row.commercial_owner.full_name, email: row.commercial_owner.email } : null },
      status: errors.length ? (errors.some((item) => /duplicad|existente/i.test(item)) ? "DUPLICATE" : "ERROR") : validStatus,
      reasons: errors,
      warnings: row.warnings,
      existing_contact: existing ? { id: existing.id, source_type: existing.source_type, name: existing.name, is_customer: existing.is_customer } : null,
    };
  });
  return {
    file_name: parsed.fileName,
    separator: parsed.delimiter === "\t" ? "tabulación" : parsed.delimiter,
    ignored_headers: parsed.ignoredHeaders,
    total_rows: previewRows.length,
    valid_rows: previewRows.filter((row) => row.status.startsWith("VALID_")).length,
    customer_rows: previewRows.filter((row) => row.status === "VALID_CUSTOMER").length,
    pending_contact_rows: 0,
    customer_history_pending_rows: previewRows.filter((row) => row.status === "VALID_CUSTOMER" && !row.normalized.has_commercial_evidence).length,
    duplicate_rows: previewRows.filter((row) => row.status === "DUPLICATE").length,
    invalid_rows: previewRows.filter((row) => row.status === "ERROR").length,
    rows: previewRows,
  };
}

async function createCustomerFromRow(client, businessId, user, row, batchId, idempotencyKey) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`customer-csv:${businessId}:${identityKey(row)}`]);
  const contacts = await existingContactsForRows(businessId, [row], (...args) => client.query(...args));
  let contact = matchExisting(row, contacts);
  if (contact?.is_customer) return { outcome: "DUPLICATE", reason: "Cliente existente.", contact };
  if (contact?.document_id && row.document_id && contact.document_id !== row.document_id) {
    return { outcome: "ERROR", reason: "El correo o teléfono pertenece a un contacto con otro documento.", contact: null };
  }
  if (!contact) {
    const created = await client.query(
      `insert into business_manual_leads
        (business_id, created_by_user_id, name, email, phone, document_type, document_id, company, source,
         preferred_channel, status, priority, notes, seller_user_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'Importación CSV', $9, $10, 'MEDIUM', $11, $12, $13::jsonb)
       returning id, name, email, phone, document_id, seller_user_id`,
      [businessId, user?.id || null, row.name, row.email || null, row.phone || null, row.document_type || null,
        row.document_id || null, row.company || null, row.preferred_channel || null,
        "CONVERTED", row.notes || null, row.commercial_owner?.id || null,
        JSON.stringify({
          source: "customer_csv_import", import_batch_id: batchId, csv_row: row.row_number,
          created_by_email: user?.email || null,
          import_classification: "CUSTOMER",
          customer_import_declared: true,
          customer_import_evidence: "CSV_DECLARATION",
          customer_imported_at: new Date().toISOString(),
          commercial_data_pending: !row.has_commercial_evidence,
          commercial_owner_user_id: row.commercial_owner?.id || null,
          commercial_owner_name: row.commercial_owner?.full_name || null,
          commercial_owner_email: row.commercial_owner?.email || null,
          import_warnings: row.warnings,
        })]
    );
    contact = { ...created.rows[0], source_type: "MANUAL", is_customer: false };
  }
  if (contact) {
    const target = {
      PLAYER: { table: "players", metadata: "metadata", supportsSeller: true },
      MANUAL: { table: "business_manual_leads", metadata: "metadata", supportsSeller: true },
      AFFILIATE: { table: "affiliates", metadata: "card_metadata", supportsSeller: true },
    }[contact.source_type];
    if (!target) return { outcome: "ERROR", reason: "Tipo de contacto no compatible con la importación.", contact: null };
    await client.query(
      `update ${target.table}
          set ${target.supportsSeller ? "seller_user_id = coalesce($4::uuid, seller_user_id)," : ""}
              ${target.metadata} = coalesce(${target.metadata}, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
                'customer_import_declared', true,
                'customer_import_evidence', 'CSV_DECLARATION',
                'customer_import_batch_id', $3::text,
                'customer_imported_at', now(),
                'commercial_owner_user_id', $4::text,
                'commercial_owner_name', $5::text,
                'commercial_owner_email', $6::text
              ))
        where id = $1 and business_id = $2`,
      [contact.id, businessId, batchId, row.commercial_owner?.id || null, row.commercial_owner?.full_name || null, row.commercial_owner?.email || null]
    );
  }
  if (!row.has_commercial_evidence) {
    return { outcome: "CREATED", reason: "Cliente importado; historial comercial pendiente.", contact, sale_id: null };
  }
  const sale = await client.query(
    `insert into business_sales
      (business_id, customer_name, customer_phone, customer_email, customer_document_id, product_name, sale_amount,
       currency, seller_user_id, acquisition_source, acquisition_channel, notes, created_at, idempotency_key, metadata)
     values ($1, $2, $3, $4, $5, 'Historial comercial importado', $6, 'COP', $7,
             'CUSTOMER_CSV_IMPORT', $8, $9, $10::timestamptz, $11, $12::jsonb)
     returning id`,
    [businessId, row.name, row.phone || null, row.email || null, row.document_id || null, row.total_spent,
      row.commercial_owner?.id || user?.id || null, row.preferred_channel || "Importación CSV", row.notes || null, row.purchase_date,
      `${idempotencyKey}:${row.row_number}`, JSON.stringify({
        source_module: "customer_csv_import", source_label: "Importación CSV", import_batch_id: batchId,
        csv_row: row.row_number, imported_purchase_count: row.purchase_count, aggregate_evidence: true,
        crm_source_type: contact.source_type, crm_source_id: contact.id,
        commercial_owner_user_id: row.commercial_owner?.id || null,
        commercial_owner_name: row.commercial_owner?.full_name || null,
      })]
  );
  if (contact.source_type === "MANUAL") {
    await client.query("update business_manual_leads set status = 'CONVERTED', updated_at = now() where id = $1 and business_id = $2", [contact.id, businessId]);
  }
  await client.query(
    `insert into lead_events
      (business_id, lead_id, source_type, source_id, event_type, event_title, event_description, metadata, created_by)
     values ($1, $2, $3, $4, 'purchase_registered', 'Historial comercial importado', $5, $6::jsonb, $7)`,
    [businessId, contact.source_type === "PLAYER" ? contact.id : null, contact.source_type, contact.id,
      `${row.purchase_count} compra(s) históricas por ${row.total_spent.toLocaleString("es-CO")} COP.`,
      JSON.stringify({ sale_id: sale.rows[0].id, import_batch_id: batchId, csv_row: row.row_number, source: "customer_csv_import", commercial_owner_user_id: row.commercial_owner?.id || null, commercial_owner_name: row.commercial_owner?.full_name || null }), user?.id || null]
  );
  return { outcome: "CREATED", contact, sale_id: sale.rows[0].id };
}

async function importCustomerCsv(businessId, user, payload) {
  const idempotencyKey = String(payload.idempotency_key || "").trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 160) throw badRequest("La importación necesita una clave de idempotencia válida.");
  const preview = await previewCustomerCsv(businessId, payload);
  const batchStart = await withTransaction(async (client) => {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`customer-csv-batch:${businessId}:${idempotencyKey}`]);
    const prior = await client.query("select * from business_customer_import_batches where business_id = $1 and idempotency_key = $2", [businessId, idempotencyKey]);
    if (prior.rowCount) return { batch: prior.rows[0], reused: true };
    const batch = await client.query(
      `insert into business_customer_import_batches
        (business_id, created_by_user_id, idempotency_key, original_filename, total_rows, metadata)
       values ($1, $2, $3, $4, $5, $6::jsonb) returning *`,
      [businessId, user?.id || null, idempotencyKey, preview.file_name, preview.total_rows, JSON.stringify({ source: "customer_csv_import", encoding: "UTF-8", separator: preview.separator, flexible_headers: true, default_seller_user_id: payload.default_seller_user_id || null })]
    );
    return { batch: batch.rows[0], reused: false };
  });
  if (batchStart.reused) return importBatchResult(businessId, batchStart.batch.id, true);
  const batchId = batchStart.batch.id;
  const parsed = parseCustomerCsv(payload);
  applyDefaultCommercialOwner(parsed.rows, payload.default_seller_user_id);
  await resolveCommercialOwners(businessId, parsed.rows);
  for (let start = 0; start < parsed.rows.length; start += IMPORT_CHUNK_SIZE) {
    const chunk = parsed.rows.slice(start, start + IMPORT_CHUNK_SIZE);
    await withTransaction(async (client) => {
      for (const row of chunk) {
        let outcome = "ERROR";
        let reason = row.errors.join(" ") || null;
        let contact = null;
        let saleId = null;
        if (!reason) {
          await client.query("savepoint customer_csv_row");
          try {
            const created = await createCustomerFromRow(client, businessId, user, row, batchId, idempotencyKey);
            outcome = created.outcome;
            reason = created.reason || null;
            contact = created.contact || null;
            saleId = created.sale_id || null;
          } catch (error) {
            await client.query("rollback to savepoint customer_csv_row");
            if (error.code === "23505") {
              outcome = "DUPLICATE";
              reason = "Cliente existente o envío duplicado.";
            } else {
              outcome = "ERROR";
              reason = "No se pudo persistir la fila.";
            }
          }
          await client.query("release savepoint customer_csv_row");
        }
        await client.query(
          `insert into business_customer_import_rows
            (batch_id, business_id, row_number, outcome, reason, original_data, contact_source_type, contact_source_id, sale_id)
           values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
          [batchId, businessId, row.row_number, outcome, reason, JSON.stringify(row.original), contact?.source_type || null, contact?.id || null, saleId]
        );
      }
    });
  }
  const counts = await query(
    `select count(*) filter (where outcome = 'CREATED')::int as created_count,
            count(*) filter (where outcome = 'DUPLICATE')::int as duplicate_count,
            count(*) filter (where outcome = 'ERROR')::int as error_count
       from business_customer_import_rows where business_id = $1 and batch_id = $2`, [businessId, batchId]
  );
  const totals = counts.rows[0];
  const status = totals.error_count || totals.duplicate_count ? (totals.created_count ? "PARTIAL" : "FAILED") : "COMPLETED";
  await query(
    `update business_customer_import_batches set status = $3, created_count = $4, duplicate_count = $5,
            error_count = $6, completed_at = now() where id = $1 and business_id = $2`,
    [batchId, businessId, status, totals.created_count, totals.duplicate_count, totals.error_count]
  );
  return importBatchResult(businessId, batchId, false);
}

async function importBatchResult(businessId, batchId, reused = false) {
  const [batch, rows] = await Promise.all([
    query("select * from business_customer_import_batches where id = $1 and business_id = $2", [batchId, businessId]),
    query(`select row_number, outcome, reason, original_data, contact_source_type, contact_source_id, sale_id
             from business_customer_import_rows where batch_id = $1 and business_id = $2 order by row_number`, [batchId, businessId]),
  ]);
  if (!batch.rowCount) throw notFound("El lote de importación no existe.");
  const createdCustomerCount = rows.rows.filter((row) => row.outcome === "CREATED").length;
  const customerHistoryPendingCount = rows.rows.filter((row) => row.outcome === "CREATED" && !row.sale_id).length;
  return {
    batch: { ...batch.rows[0], created_customer_count: createdCustomerCount, pending_contact_count: 0, customer_history_pending_count: customerHistoryPendingCount },
    rows: rows.rows,
    reused,
  };
}

async function customerImportErrorsCsv(businessId, batchId) {
  const result = await importBatchResult(businessId, batchId);
  const errors = result.rows.filter((row) => row.outcome !== "CREATED");
  const lines = ["fila,motivo,datos_originales", ...errors.map((row) => [row.row_number, row.reason || row.outcome, row.original_data].map(csvEscape).join(","))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

module.exports = {
  CUSTOMER_CSV_HEADERS,
  MAX_CSV_BYTES,
  MAX_CSV_ROWS,
  customerTemplateCsv,
  customerImportErrorsCsv,
  importCustomerCsv,
  normalizeDocument,
  normalizeEmail,
  normalizePhone,
  matchCommercialOwner,
  parseCsv,
  parseCustomerCsv,
  parseMoney,
  previewCustomerCsv,
};
