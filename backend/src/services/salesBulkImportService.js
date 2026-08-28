const { createHash, randomUUID } = require("node:crypto");
const JSZip = require("jszip");
const { query, withTransaction } = require("../config/db");
const { badRequest } = require("../utils/http");
const { syncSaleProductsWithCatalog } = require("./productCatalogService");

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;
const HEADERS = ["id_venta", "fecha_venta", "valor", "cliente", "documento", "telefono", "correo", "producto", "cantidad", "precio_unitario", "subtotal_producto", "moneda", "metodo_pago", "responsable_comercial", "campana_id", "canal_id", "sede_id", "medio_llegada", "notas"];
const REQUIRED = ["fecha_venta", "valor", "cliente", "responsable_comercial"];
const ALIASES = Object.freeze({
  id: "id_venta", venta_id: "id_venta", numero_venta: "id_venta", factura: "id_venta",
  fecha: "fecha_venta", fecha_de_venta: "fecha_venta", fecha_compra: "fecha_venta",
  monto: "valor", total: "valor", valor_venta: "valor", revenue: "valor",
  nombre_cliente: "cliente", customer: "cliente", identificacion: "documento", numero_documento: "documento",
  email: "correo", correo_cliente: "correo", celular: "telefono", telefono_cliente: "telefono",
  producto_servicio: "producto", unidades: "cantidad", qty: "cantidad", precio: "precio_unitario", valor_unitario: "precio_unitario", unit_price: "precio_unitario", subtotal: "subtotal_producto", total_producto: "subtotal_producto", line_total: "subtotal_producto", currency: "moneda",
  forma_pago: "metodo_pago", correo_vendedor: "responsable_comercial", vendedor: "responsable_comercial", asesor: "responsable_comercial", vendedor_email: "responsable_comercial", comercial: "responsable_comercial", responsable: "responsable_comercial",
  campana: "campana_id", campaign_id: "campana_id", canal: "canal_id", channel_id: "canal_id",
  sede: "sede_id", branch_id: "sede_id", origen: "medio_llegada", fuente: "medio_llegada", observaciones: "notas",
});

function normalizeHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function canonicalHeader(value) { const key = normalizeHeader(value); return ALIASES[key] || key; }
function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }
function normalizeDocument(value) { return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function normalizePhone(value) { return String(value || "").replace(/\D/g, ""); }
function csvEscape(value) { const raw = String(value ?? ""); return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw; }

function salesTemplateCsv(options = {}) {
  const responsibleEmail = normalizeEmail(options.responsibleEmail) || "responsable@tuempresa.com";
  const examples = [
    ["FAC-1042", "2026-08-25", "185000", "Ana Gomez", "1020304050", "3001234567", "ana@ejemplo.com", "Plan premium", "1", "125000", "125000", "COP", "TRANSFERENCIA", responsibleEmail, "", "", "", "Instagram", "Una venta con dos productos"],
    ["FAC-1042", "2026-08-25", "185000", "Ana Gomez", "1020304050", "3001234567", "ana@ejemplo.com", "Instalacion", "1", "60000", "60000", "COP", "TRANSFERENCIA", responsibleEmail, "", "", "", "Instagram", "Repite id_venta y responsable para agrupar"],
  ];
  return `\uFEFF${HEADERS.join(",")}\r\n${examples.map((row) => row.map(csvEscape).join(",")).join("\r\n")}\r\n`;
}

async function salesTemplateForBusiness(businessId, user, db = query) {
  const result = await db(
    `select lower(email) as email
       from app_users
      where business_id = $1
        and is_active = true
        and role in ('BUSINESS_OWNER','BUSINESS_MANAGER','BUSINESS_SELLER','VALIDATOR')
      order by case when id = $2 then 0 else 1 end,
               case role when 'BUSINESS_OWNER' then 0 when 'BUSINESS_MANAGER' then 1 else 2 end,
               created_at asc
      limit 1`,
    [businessId, user?.id || null]
  );
  return salesTemplateCsv({ responsibleEmail: result.rows[0]?.email || user?.email });
}

function detectDelimiter(text) {
  const first = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
  return [[",", (first.match(/,/g) || []).length], [";", (first.match(/;/g) || []).length], ["\t", (first.match(/\t/g) || []).length]].sort((a, b) => b[1] - a[1])[0][0];
}
function parseCsv(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(source); const rows = []; let row = []; let field = ""; let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted && char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === delimiter) { row.push(field); field = ""; }
    else if (!quoted && char === "\n") { row.push(field.replace(/\r$/, "")); if (row.some((item) => String(item).trim())) rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw badRequest("El CSV contiene una comilla sin cerrar.");
  row.push(field.replace(/\r$/, "")); if (row.some((item) => String(item).trim())) rows.push(row);
  return rows;
}
function xmlDecode(value) {
  return String(value || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
function columnIndex(reference) {
  const letters = String(reference || "").replace(/[^A-Z]/gi, "").toUpperCase(); let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, index - 1);
}
async function parseXlsx(buffer) {
  let zip; try { zip = await JSZip.loadAsync(buffer); } catch { throw badRequest("No pudimos leer el archivo Excel. Guárdalo nuevamente como .xlsx."); }
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const sharedXml = sharedFile ? await sharedFile.async("string") : "";
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => xmlDecode([...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((item) => item[1]).join("")));
  const sheetFile = zip.file("xl/worksheets/sheet1.xml") || Object.values(zip.files).find((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.name));
  if (!sheetFile) throw badRequest("El Excel no contiene una hoja de cálculo legible.");
  const sheetXml = await sheetFile.async("string");
  if (Buffer.byteLength(sheetXml, "utf8") > 15 * 1024 * 1024) throw badRequest("La primera hoja del Excel es demasiado grande.");
  return [...sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row = [];
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = /\br="([^"]+)"/.exec(cell[1])?.[1]; const type = /\bt="([^"]+)"/.exec(cell[1])?.[1];
      const raw = /<v>([\s\S]*?)<\/v>/.exec(cell[2])?.[1] ?? [...cell[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((item) => item[1]).join("");
      row[columnIndex(ref)] = type === "s" ? (shared[Number(raw)] || "") : xmlDecode(raw);
    }
    return row;
  }).filter((row) => row.some((value) => String(value || "").trim()));
}
function parseMoney(value) {
  const raw = String(value ?? "").trim().replace(/[\s$]/g, ""); if (!raw) return null;
  const comma = raw.lastIndexOf(","); const dot = raw.lastIndexOf("."); let normalized = raw;
  if (comma > dot) normalized = raw.replace(/\./g, "").replace(",", "."); else if (dot > comma && comma >= 0) normalized = raw.replace(/,/g, ""); else if (comma >= 0) normalized = raw.replace(",", ".");
  const amount = Number(normalized); return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}
function parseDate(value) {
  const raw = String(value || "").trim();
  if (/^\d+(\.\d+)?$/.test(raw)) { const date = new Date(Date.UTC(1899, 11, 30) + Number(raw) * 86400000); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = new Date(dateOnly ? `${raw}T12:00:00.000Z` : raw);
  if (!raw || Number.isNaN(date.getTime()) || (dateOnly && date.toISOString().slice(0, 10) !== raw)) return null;
  return date.toISOString();
}
function stableKey(businessId, fileHash, row) {
  const source = row.external_id ? `external:${row.external_id}` : `file:${fileHash}:row:${row.row_number}`;
  return `bulk-sale:${createHash("sha256").update(`${businessId}:${source}`).digest("hex").slice(0, 48)}`;
}
function firstPresent(lines, key) { return lines.map((line) => line[key]).find((value) => value !== null && value !== undefined && String(value).trim() !== "") ?? null; }
function distinctPresent(lines, key, normalize = (value) => String(value).trim().toLowerCase()) {
  return [...new Set(lines.map((line) => line[key]).filter((value) => value !== null && value !== undefined && String(value).trim() !== "").map(normalize))];
}
function groupSaleLines(lines) {
  const groups = new Map();
  lines.forEach((line) => {
    const key = line.external_id ? `external:${line.external_id.toLowerCase()}` : `row:${line.row_number}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(line);
  });
  return [...groups.values()].map((sourceLines) => {
    const first = sourceLines[0]; const errors = sourceLines.flatMap((line) => line.errors); const warnings = [];
    const row = {
      row_number: first.row_number, source_rows: sourceLines.map((line) => line.row_number), original: { ...first.original }, external_id: first.external_id,
      sold_at: firstPresent(sourceLines, "sold_at"), amount: firstPresent(sourceLines, "amount"), customer_name: firstPresent(sourceLines, "customer_name"),
      document_id: firstPresent(sourceLines, "document_id"), phone: firstPresent(sourceLines, "phone"), email: firstPresent(sourceLines, "email"),
      currency: firstPresent(sourceLines, "currency") || "COP", payment_method: firstPresent(sourceLines, "payment_method"), seller_reference: firstPresent(sourceLines, "seller_reference"),
      campaign_reference: firstPresent(sourceLines, "campaign_reference"), channel_reference: firstPresent(sourceLines, "channel_reference"), branch_reference: firstPresent(sourceLines, "branch_reference"),
      arrival_source: firstPresent(sourceLines, "arrival_source"), notes: firstPresent(sourceLines, "notes"), errors, warnings,
    };
    [
      ["sold_at", "fecha"], ["amount", "valor total", (value) => Number(value).toFixed(2)], ["customer_name", "cliente"], ["document_id", "documento"],
      ["email", "correo del cliente"], ["currency", "moneda"], ["payment_method", "metodo de pago"], ["seller_reference", "responsable comercial"],
      ["campaign_reference", "campana"], ["channel_reference", "canal"], ["branch_reference", "sede"],
    ].forEach(([key, label, normalize]) => { if (distinctPresent(sourceLines, key, normalize).length > 1) errors.push(`Las filas de esta venta tienen distinto ${label}.`); });
    if (!row.sold_at) errors.push("Fecha invalida; usa AAAA-MM-DD.");
    if (!row.amount) errors.push("El valor debe ser mayor que cero.");
    if (!row.customer_name) errors.push("Cliente obligatorio.");
    if (!row.seller_reference) errors.push("Responsable comercial obligatorio; usa su correo exacto.");
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("Correo del cliente invalido.");
    if (!/^[A-Z]{3}$/.test(row.currency)) errors.push("Moneda invalida; usa COP, USD u otro codigo de tres letras.");
    row.products = sourceLines.filter((line) => line.product_name).map((line) => ({ name: line.product_name, quantity: line.quantity, unit_price: line.unit_price, line_total: line.line_total, currency: row.currency, source_row: line.row_number }));
    if (sourceLines.length > 1 && sourceLines.some((line) => !line.product_name)) errors.push("Cada fila agrupada debe indicar un producto.");
    if (row.products.length === 1 && !row.products[0].line_total) {
      row.products[0].line_total = row.amount;
      row.products[0].unit_price = row.amount && row.products[0].quantity ? Math.round((row.amount / row.products[0].quantity) * 100) / 100 : null;
    }
    if (row.products.length > 1) row.products.filter((product) => !product.line_total).forEach((product) => errors.push(`Falta precio_unitario o subtotal_producto para ${product.name} (fila ${product.source_row}).`));
    const productsTotal = Math.round(row.products.reduce((sum, product) => sum + Number(product.line_total || 0), 0) * 100) / 100;
    if (productsTotal > 0 && row.amount && Math.abs(productsTotal - row.amount) > 0.01) warnings.push(`La suma de productos (${productsTotal}) difiere del valor total (${row.amount}).`);
    row.product_name = row.products.map((product) => product.name).join(", ").slice(0, 180) || null;
    row.quantity = row.products.reduce((sum, product) => sum + Number(product.quantity || 0), 0) || 1;
    for (const key of ["fecha_venta", "valor", "cliente", "documento", "telefono", "correo", "moneda", "metodo_pago", "responsable_comercial", "campana_id", "canal_id", "sede_id", "medio_llegada", "notas"]) {
      row.original[key] = sourceLines.map((line) => line.original[key]).find((value) => String(value || "").trim()) || "";
    }
    row.original.producto = row.products.map((product) => product.name).join(" | "); row.original.cantidad = String(row.quantity); row.original.responsable_comercial = row.seller_reference || "";
    return row;
  });
}
async function fileRows(payload = {}) {
  const fileName = String(payload.file_name || "").trim().slice(0, 240); const declared = Number(payload.file_size || 0);
  if (!/\.(csv|xlsx)$/i.test(fileName)) throw badRequest("Selecciona un archivo .csv o .xlsx.");
  let bytes; let matrix;
  if (/\.csv$/i.test(fileName)) { bytes = Buffer.from(String(payload.csv_text || ""), "utf8"); matrix = parseCsv(bytes.toString("utf8")); }
  else { try { bytes = Buffer.from(String(payload.file_base64 || ""), "base64"); } catch { throw badRequest("El archivo Excel no es válido."); } matrix = await parseXlsx(bytes); }
  if (!bytes.length) throw badRequest("El archivo está vacío.");
  if (bytes.length > MAX_FILE_BYTES || declared > MAX_FILE_BYTES) throw badRequest("El archivo supera el máximo permitido de 5 MB.");
  if (matrix.length < 2) throw badRequest("El archivo no contiene filas de ventas.");
  if (matrix.length - 1 > MAX_ROWS) throw badRequest(`El archivo supera el máximo de ${MAX_ROWS} filas.`);
  const headers = matrix[0].map(canonicalHeader); const recognized = headers.filter((header) => HEADERS.includes(header));
  const duplicates = recognized.filter((header, index) => recognized.indexOf(header) !== index);
  if (duplicates.length) throw badRequest("Hay encabezados repetidos.", { duplicate_headers: [...new Set(duplicates)] });
  const missing = REQUIRED.filter((header) => !recognized.includes(header));
  if (missing.length) throw badRequest("Faltan columnas obligatorias: fecha_venta, valor, cliente o responsable_comercial.", { missing_headers: missing });
  const positions = new Map(headers.map((header, index) => [header, index]));
  const lines = matrix.slice(1).map((values, index) => {
    const original = Object.fromEntries(HEADERS.map((header) => [header, String(values[positions.get(header)] ?? "").trim()]));
    const email = normalizeEmail(original.correo); const errors = []; const quantity = Number(original.cantidad || 1);
    const unitPrice = parseMoney(original.precio_unitario); const suppliedSubtotal = parseMoney(original.subtotal_producto);
    const parsed = { row_number: index + 2, original, external_id: original.id_venta, sold_at: original.fecha_venta ? parseDate(original.fecha_venta) : null, amount: original.valor ? parseMoney(original.valor) : null, customer_name: original.cliente, document_id: normalizeDocument(original.documento), phone: normalizePhone(original.telefono), email, product_name: original.producto, quantity, unit_price: unitPrice || (suppliedSubtotal && quantity > 0 ? Math.round((suppliedSubtotal / quantity) * 100) / 100 : null), line_total: suppliedSubtotal || (unitPrice && quantity > 0 ? Math.round(unitPrice * quantity * 100) / 100 : null), currency: original.moneda ? String(original.moneda).trim().toUpperCase() : null, payment_method: String(original.metodo_pago || "").trim().toUpperCase(), seller_reference: String(original.responsable_comercial || "").trim(), campaign_reference: original.campana_id, channel_reference: original.canal_id, branch_reference: original.sede_id, arrival_source: original.medio_llegada, notes: original.notas, errors };
    if (original.fecha_venta && !parsed.sold_at) errors.push("Fecha invalida; usa AAAA-MM-DD.");
    if (original.valor && !parsed.amount) errors.push("El valor debe ser mayor que cero.");
    if (!Number.isFinite(parsed.quantity) || parsed.quantity <= 0) errors.push("Cantidad invalida.");
    if (original.precio_unitario && !unitPrice) errors.push("Precio unitario invalido.");
    if (original.subtotal_producto && !suppliedSubtotal) errors.push("Subtotal de producto invalido.");
    if (!parsed.product_name && (unitPrice || suppliedSubtotal)) errors.push("Indica el producto asociado a este precio.");
    if (unitPrice && suppliedSubtotal && quantity > 0 && Math.abs(unitPrice * quantity - suppliedSubtotal) > 0.01) errors.push("El subtotal del producto no coincide con cantidad por precio unitario.");
    return parsed;
  });
  const rows = groupSaleLines(lines);
  return { fileName, fileHash: createHash("sha256").update(bytes).digest("hex"), rows };
}

async function resolveRows(businessId, user, parsed, db = query) {
  const [users, campaigns, channels, branches] = await Promise.all([
    db(`select id, full_name, lower(email) as email from app_users where business_id = $1 and is_active = true and role in ('BUSINESS_OWNER','BUSINESS_MANAGER','BUSINESS_SELLER','VALIDATOR')`, [businessId]),
    db(`select id, name from campaigns where business_id = $1`, [businessId]),
    db(`select id, name, slug from business_acquisition_channels where business_id = $1 and status <> 'ARCHIVED'`, [businessId]),
    db(`select id, name from branches where business_id = $1 and is_active = true`, [businessId]),
  ]);
  const canAssign = ["BUSINESS_OWNER", "BUSINESS_MANAGER", "ADMIN", "ADMIN_MARKET_GAMES"].includes(user.role);
  const exact = (reference, items, fields) => { if (!reference) return null; const value = String(reference).trim().toLowerCase(); const matches = items.filter((item) => String(item.id).toLowerCase() === value || fields.some((field) => String(item[field] || "").trim().toLowerCase() === value)); return matches.length === 1 ? matches[0] : null; };
  parsed.rows.forEach((row) => {
    row.idempotency_key = stableKey(businessId, parsed.fileHash, row);
    row.seller = row.seller_reference ? exact(row.seller_reference, users.rows, ["email", "full_name"]) : null;
    if (!row.seller) row.errors.push("Responsable comercial no encontrado; usa su correo exacto o nombre completo unico."); else if (!canAssign && row.seller.id !== user.id) row.errors.push("Tu rol solo puede importar ventas propias.");
    for (const [reference, items, fields, key, label] of [[row.campaign_reference, campaigns.rows, ["name"], "campaign", "campaña"], [row.channel_reference, channels.rows, ["name", "slug"], "channel", "canal"], [row.branch_reference, branches.rows, ["name"], "branch", "sede"]]) {
      row[key] = exact(reference, items, fields); if (reference && !row[key]) row.errors.push(`No encontramos una ${label} única con esa referencia.`);
    }
  });
  const keys = parsed.rows.map((row) => row.idempotency_key);
  const existing = keys.length ? await db(`select idempotency_key from business_sales where business_id = $1 and idempotency_key = any($2::text[])`, [businessId, keys]) : { rows: [] };
  const existingKeys = new Set(existing.rows.map((row) => row.idempotency_key)); parsed.rows.forEach((row) => { if (existingKeys.has(row.idempotency_key)) row.duplicate = true; });
  return parsed;
}
function publicRow(row) { return { row_number: row.row_number, source_rows: row.source_rows, data: row.original, normalized: { sold_at: row.sold_at, amount: row.amount, customer_name: row.customer_name, products: row.products, product_count: row.products.length, seller: row.seller ? { id: row.seller.id, name: row.seller.full_name, email: row.seller.email } : null }, status: row.errors.length ? "ERROR" : row.duplicate ? "DUPLICATE" : "VALID", reasons: row.errors, warnings: row.warnings }; }
function summary(parsed, rows = parsed.rows.map(publicRow)) { return { file_name: parsed.fileName, total_rows: rows.length, valid_rows: rows.filter((row) => row.status === "VALID").length, duplicate_rows: rows.filter((row) => row.status === "DUPLICATE").length, invalid_rows: rows.filter((row) => row.status === "ERROR").length, rows }; }
async function previewSalesFile(businessId, user, payload) { return summary(await resolveRows(businessId, user, await fileRows(payload))); }

async function importSalesFile(businessId, user, payload) {
  const parsed = await resolveRows(businessId, user, await fileRows(payload)); const batchId = randomUUID(); const results = [];
  for (let offset = 0; offset < parsed.rows.length; offset += 50) {
    const chunk = parsed.rows.slice(offset, offset + 50);
    await withTransaction(async (client) => {
      for (const row of chunk) {
        if (row.errors.length) { results.push({ ...publicRow(row), outcome: "ERROR" }); continue; }
        if (row.duplicate) { results.push({ ...publicRow(row), outcome: "DUPLICATE" }); continue; }
        await client.query("SAVEPOINT sales_bulk_row");
        try {
          const baseMetadata = { source_module: "sales_bulk_import", import_batch_id: batchId, source_file: parsed.fileName, source_file_hash: parsed.fileHash, source_row: row.row_number, source_rows: row.source_rows, external_sale_id: row.external_id || null, imported_by_user_id: user.id, responsible_commercial: { user_id: row.seller.id, name_snapshot: row.seller.full_name, email_snapshot: row.seller.email }, products: row.products };
          const inserted = await client.query(
            `insert into business_sales (business_id, campaign_id, customer_name, customer_phone, customer_email, customer_document_id, product_name, sale_amount, currency, seller_user_id, branch_id, acquisition_source, acquisition_channel, acquisition_channel_id, acquisition_channel_name_snapshot, acquisition_channel_slug_snapshot, acquisition_channel_source, notes, created_at, paid_at, payment_method, quantity, sale_status, idempotency_key, metadata)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19,$20,$21,'PAID',$22,$23::jsonb)
             on conflict (business_id, idempotency_key) where idempotency_key is not null do nothing returning id`,
            [businessId, row.campaign?.id || null, row.customer_name, row.phone || null, row.email || null, row.document_id || null, row.product_name || null, row.amount, row.currency, row.seller.id, row.branch?.id || null, row.arrival_source || "IMPORTACION_EXCEL", row.channel?.name || row.arrival_source || null, row.channel?.id || null, row.channel?.name || null, row.channel?.slug || null, row.channel ? "CONFIGURED" : (row.arrival_source ? "MANUAL_UNCONFIGURED" : null), row.notes || null, row.sold_at, row.payment_method || null, row.quantity, row.idempotency_key, JSON.stringify(baseMetadata)]
          );
          if (!inserted.rowCount) {
            await client.query("RELEASE SAVEPOINT sales_bulk_row");
            results.push({ ...publicRow(row), status: "DUPLICATE", outcome: "DUPLICATE", sale_id: null });
            continue;
          }
          const catalogSync = await syncSaleProductsWithCatalog(client, businessId, user.id, row.products, { currency: row.currency, sourceModule: "sales_bulk_import" });
          const savedMetadata = { ...baseMetadata, products: catalogSync.products, auto_created_products: catalogSync.autoCreatedProducts, matched_products: catalogSync.matchedProducts, product_catalog_sync: true };
          await client.query(`update business_sales set metadata = $3::jsonb where id = $1 and business_id = $2`, [inserted.rows[0].id, businessId, JSON.stringify(savedMetadata)]);
          await client.query("RELEASE SAVEPOINT sales_bulk_row");
          results.push({ ...publicRow(row), status: "IMPORTED", outcome: "IMPORTED", sale_id: inserted.rows[0].id });
        } catch (error) {
          await client.query("ROLLBACK TO SAVEPOINT sales_bulk_row"); await client.query("RELEASE SAVEPOINT sales_bulk_row"); results.push({ ...publicRow(row), status: "ERROR", outcome: "ERROR", reasons: ["No fue posible guardar esta fila."] });
        }
      }
    });
  }
  return { batch_id: batchId, file_name: parsed.fileName, total_rows: results.length, imported_rows: results.filter((row) => row.outcome === "IMPORTED").length, duplicate_rows: results.filter((row) => row.outcome === "DUPLICATE").length, invalid_rows: results.filter((row) => row.outcome === "ERROR").length, rows: results };
}

module.exports = { MAX_FILE_BYTES, MAX_ROWS, salesTemplateCsv, salesTemplateForBusiness, previewSalesFile, importSalesFile, fileRows, resolveRows, parseCsv, parseMoney, parseDate };
