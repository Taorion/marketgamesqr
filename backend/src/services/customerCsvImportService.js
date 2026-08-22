const { query, withTransaction } = require("../config/db");
const { badRequest, notFound } = require("../utils/http");

const CUSTOMER_CSV_HEADERS = [
  "nombre", "apellido", "tipo_documento", "numero_documento", "correo", "telefono",
  "empresa", "canal_preferido", "fecha_ultima_compra", "total_compras", "valor_acumulado", "notas",
];
const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_CSV_ROWS = 2000;
const IMPORT_CHUNK_SIZE = 50;

function normalizeHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
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

function parseCsv(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
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
    } else if (character === ",") {
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
  return rows;
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
  const example = ["Ana", "Gómez", "CC", "1020304050", "ana.gomez@ejemplo.com", "+57 300 123 4567", "Empresa Ejemplo", "WhatsApp", "2026-08-15", "3", "1250000.00", "Cliente histórico de ejemplo"];
  return `\uFEFF${CUSTOMER_CSV_HEADERS.join(",")}\r\n${example.map(csvEscape).join(",")}\r\n`;
}

function validateCsvEnvelope(payload = {}) {
  const fileName = String(payload.file_name || "").trim();
  const csvText = String(payload.csv_text || "");
  const declaredSize = Number(payload.file_size || 0);
  const actualSize = Buffer.byteLength(csvText, "utf8");
  if (!/\.csv$/i.test(fileName)) throw badRequest("El archivo debe tener extensión .csv.");
  const mimeType = String(payload.mime_type || "").trim().toLowerCase();
  const allowedMimeTypes = new Set(["", "text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"]);
  if (!allowedMimeTypes.has(mimeType)) throw badRequest("El tipo de archivo no corresponde a un CSV.");
  if (!csvText.trim()) throw badRequest("El archivo CSV está vacío.");
  if (declaredSize > MAX_CSV_BYTES || actualSize > MAX_CSV_BYTES) throw badRequest("El CSV supera el máximo permitido de 2 MB.");
  return { fileName: fileName.slice(0, 240), csvText };
}

function parseCustomerCsv(payload = {}) {
  const envelope = validateCsvEnvelope(payload);
  const parsed = parseCsv(envelope.csvText);
  if (parsed.length < 2) throw badRequest("El CSV no contiene filas de clientes.");
  const headers = parsed[0].map(normalizeHeader);
  if (new Set(headers).size !== headers.length || headers.some((header) => !header)) {
    throw badRequest("El CSV contiene encabezados vacíos o repetidos.");
  }
  const missing = CUSTOMER_CSV_HEADERS.filter((header) => !headers.includes(header));
  const extra = headers.filter((header) => header && !CUSTOMER_CSV_HEADERS.includes(header));
  if (missing.length || extra.length) {
    throw badRequest("Los encabezados del CSV no corresponden a la plantilla.", { missing_headers: missing, unexpected_headers: extra });
  }
  if (parsed.length - 1 > MAX_CSV_ROWS) throw badRequest(`El CSV supera el máximo de ${MAX_CSV_ROWS} filas.`);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const rows = parsed.slice(1).map((values, index) => {
    const original = Object.fromEntries(CUSTOMER_CSV_HEADERS.map((header) => [header, String(values[headerIndex.get(header)] || "").trim()]));
    const row = {
      row_number: index + 2,
      original,
      first_name: original.nombre,
      last_name: original.apellido,
      name: [original.nombre, original.apellido].filter(Boolean).join(" ").trim(),
      document_type: String(original.tipo_documento || "").trim().toUpperCase(),
      document_id: normalizeDocument(original.numero_documento),
      email: normalizeEmail(original.correo),
      phone: normalizePhone(original.telefono),
      company: original.empresa,
      preferred_channel: original.canal_preferido,
      purchase_date: parsePurchaseDate(original.fecha_ultima_compra),
      purchase_count: /^\d+$/.test(original.total_compras) ? Number(original.total_compras) : null,
      total_spent: parseMoney(original.valor_acumulado),
      notes: original.notas,
      errors: [],
    };
    if (values.length !== headers.length) row.errors.push(`Cantidad de columnas incorrecta: se esperaban ${headers.length} y llegaron ${values.length}.`);
    if (!row.name) row.errors.push("Campo obligatorio vacío: nombre.");
    if (!row.document_id && !row.email && !row.phone) row.errors.push("Se requiere documento, correo o teléfono válido.");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) row.errors.push("Correo inválido.");
    if (row.phone && (row.phone.length < 7 || row.phone.length > 15)) row.errors.push("Teléfono inválido.");
    if (row.document_id && !row.document_type) row.errors.push("Campo obligatorio vacío: tipo_documento.");
    if (!row.purchase_date) row.errors.push("Fecha incorrecta; usa AAAA-MM-DD.");
    if (!Number.isInteger(row.purchase_count) || row.purchase_count < 1) row.errors.push("Evidencia comercial insuficiente: total_compras debe ser un entero mayor a cero.");
    if (!row.total_spent) row.errors.push("Valor monetario inválido o sin revenue positivo.");
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
  return { fileName: envelope.fileName, rows };
}

function identityKey(row) {
  return row.document_id ? `document:${row.document_id}` : row.email ? `email:${row.email}` : `phone:${row.phone}`;
}

async function existingContactsForRows(businessId, rows, db = query) {
  const documents = [...new Set(rows.map((row) => row.document_id).filter(Boolean))];
  const emails = [...new Set(rows.map((row) => row.email).filter(Boolean))];
  const phones = [...new Set(rows.map((row) => row.phone).filter(Boolean))];
  if (!documents.length && !emails.length && !phones.length) return [];
  const result = await db(
    `with contacts as (
       select p.id, 'PLAYER'::text as source_type, p.name, regexp_replace(upper(coalesce(p.document_id, '')), '[^A-Z0-9]', '', 'g') as document_id,
              lower(nullif(p.email, '')) as email, regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') as phone
         from players p where p.business_id = $1 and coalesce(p.metadata->>'lifecycle_status', 'ACTIVE') <> 'ARCHIVED'
       union all
       select ml.id, 'MANUAL'::text, ml.name, regexp_replace(upper(coalesce(ml.document_id, '')), '[^A-Z0-9]', '', 'g'),
              lower(nullif(ml.email, '')), regexp_replace(coalesce(ml.phone, ''), '\\D', '', 'g')
         from business_manual_leads ml where ml.business_id = $1 and ml.status <> 'ARCHIVED'
       union all
       select a.id, 'AFFILIATE'::text, a.full_name, regexp_replace(upper(coalesce(a.document_id, '')), '[^A-Z0-9]', '', 'g'),
              lower(nullif(a.email, '')), regexp_replace(coalesce(a.phone, ''), '\\D', '', 'g')
         from affiliates a where a.business_id = $1 and a.status <> 'DELETED'
     )
     select c.*,
            exists (
              select 1 from business_sales bs where bs.business_id = $1 and (
                (nullif(c.document_id, '') is not null and regexp_replace(upper(coalesce(bs.customer_document_id, '')), '[^A-Z0-9]', '', 'g') = c.document_id)
                or (nullif(c.email, '') is not null and lower(bs.customer_email) = c.email)
                or (nullif(c.phone, '') is not null and regexp_replace(coalesce(bs.customer_phone, ''), '\\D', '', 'g') = c.phone)
                or (bs.metadata->>'crm_source_type' = c.source_type and bs.metadata->>'crm_source_id' = c.id::text)
              )
            ) as is_customer
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
  const contacts = await existingContactsForRows(businessId, parsed.rows.filter((row) => !row.errors.length));
  const previewRows = parsed.rows.map((row) => {
    const existing = row.errors.length ? null : matchExisting(row, contacts);
    const errors = [...row.errors];
    if (existing?.is_customer) errors.push("Cliente existente.");
    return {
      row_number: row.row_number,
      data: row.original,
      normalized: { name: row.name, document_id: row.document_id, email: row.email, phone: row.phone, purchase_count: row.purchase_count, total_spent: row.total_spent, purchase_date: row.purchase_date },
      status: errors.length ? (errors.some((item) => /duplicad|existente/i.test(item)) ? "DUPLICATE" : "ERROR") : "VALID",
      reasons: errors,
      existing_contact: existing ? { id: existing.id, source_type: existing.source_type, name: existing.name, is_customer: existing.is_customer } : null,
    };
  });
  return {
    file_name: parsed.fileName,
    total_rows: previewRows.length,
    valid_rows: previewRows.filter((row) => row.status === "VALID").length,
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
         preferred_channel, status, priority, notes, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'Importación CSV', $9, 'CONVERTED', 'MEDIUM', $10, $11::jsonb)
       returning id, name, email, phone, document_id`,
      [businessId, user?.id || null, row.name, row.email || null, row.phone || null, row.document_type || null,
        row.document_id || null, row.company || null, row.preferred_channel || null, row.notes || null,
        JSON.stringify({ source: "customer_csv_import", import_batch_id: batchId, csv_row: row.row_number, created_by_email: user?.email || null })]
    );
    contact = { ...created.rows[0], source_type: "MANUAL", is_customer: false };
  }
  const sale = await client.query(
    `insert into business_sales
      (business_id, customer_name, customer_phone, customer_email, customer_document_id, product_name, sale_amount,
       currency, seller_user_id, acquisition_source, acquisition_channel, notes, created_at, idempotency_key, metadata)
     values ($1, $2, $3, $4, $5, 'Historial comercial importado', $6, 'COP', $7,
             'CUSTOMER_CSV_IMPORT', $8, $9, $10::timestamptz, $11, $12::jsonb)
     returning id`,
    [businessId, row.name, row.phone || null, row.email || null, row.document_id || null, row.total_spent,
      user?.id || null, row.preferred_channel || "Importación CSV", row.notes || null, row.purchase_date,
      `${idempotencyKey}:${row.row_number}`, JSON.stringify({
        source_module: "customer_csv_import", source_label: "Importación CSV", import_batch_id: batchId,
        csv_row: row.row_number, imported_purchase_count: row.purchase_count, aggregate_evidence: true,
        crm_source_type: contact.source_type, crm_source_id: contact.id,
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
      JSON.stringify({ sale_id: sale.rows[0].id, import_batch_id: batchId, csv_row: row.row_number, source: "customer_csv_import" }), user?.id || null]
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
      [businessId, user?.id || null, idempotencyKey, preview.file_name, preview.total_rows, JSON.stringify({ source: "customer_csv_import", encoding: "UTF-8", separator: "," })]
    );
    return { batch: batch.rows[0], reused: false };
  });
  if (batchStart.reused) return importBatchResult(businessId, batchStart.batch.id, true);
  const batchId = batchStart.batch.id;
  const parsed = parseCustomerCsv(payload);
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
  return { batch: batch.rows[0], rows: rows.rows, reused };
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
  parseCsv,
  parseCustomerCsv,
  parseMoney,
  previewCustomerCsv,
};
