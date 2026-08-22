const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  CUSTOMER_CSV_HEADERS,
  customerTemplateCsv,
  parseCustomerCsv,
  parseMoney,
} = require("../backend/src/services/customerCsvImportService");

function payload(csvText, fileName = "clientes.csv") {
  return {
    file_name: fileName,
    file_size: Buffer.byteLength(csvText, "utf8"),
    mime_type: "text/csv",
    csv_text: csvText,
  };
}

const header = CUSTOMER_CSV_HEADERS.join(",");

test("la plantilla UTF-8 se puede volver a procesar y trae evidencia comercial", () => {
  const csv = customerTemplateCsv();
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  const parsed = parseCustomerCsv(payload(csv));
  assert.equal(parsed.rows.length, 1);
  assert.deepEqual(parsed.rows[0].errors, []);
  assert.equal(parsed.rows[0].name, "Ana Gómez");
  assert.equal(parsed.rows[0].purchase_count, 3);
  assert.equal(parsed.rows[0].total_spent, 1250000);
});

test("interpreta comas, comillas, saltos y caracteres especiales", () => {
  const csv = `${header}\r\n"María, José",Niño,CC,10.203.040,"maria@example.com","+57 300 123 4567","Diseño, Café",WhatsApp,2026-08-15,2,"1.250.000,50","Prefiere \"\"línea premium\"\"\nLlamar mañana"\r\n`;
  const row = parseCustomerCsv(payload(csv)).rows[0];
  assert.equal(row.first_name, "María, José");
  assert.equal(row.company, "Diseño, Café");
  assert.equal(row.notes, 'Prefiere "línea premium"\nLlamar mañana');
  assert.equal(row.document_id, "10203040");
  assert.equal(row.phone, "573001234567");
  assert.equal(row.total_spent, 1250000.5);
  assert.deepEqual(row.errors, []);
});

test("rechaza CSV vacío y encabezados incorrectos", () => {
  assert.throws(() => parseCustomerCsv(payload(" ")), /vacío/i);
  assert.throws(() => parseCustomerCsv(payload("nombre,correo\nAna,ana@example.com")), /encabezados/i);
  assert.throws(() => parseCustomerCsv({ ...payload(`${header}\nAna,Gómez,CC,1,a@b.co,3001112233,Qori,Email,2026-08-15,1,1000,Ok\n`), mime_type: "application/pdf" }), /tipo de archivo/i);
});

test("detecta duplicados internos por prioridad documento, correo y teléfono", () => {
  const first = "Ana,Gómez,CC,123,ana@example.com,3001112233,Qori,WhatsApp,2026-08-15,1,100000,Uno";
  const second = "Ana,Otra,CC,123,otra@example.com,3009998877,Qori,Email,2026-08-16,1,200000,Dos";
  const rows = parseCustomerCsv(payload(`${header}\n${first}\n${second}\n`)).rows;
  assert.deepEqual(rows[0].errors, []);
  assert.match(rows[1].errors.join(" "), /Documento duplicado dentro del archivo/i);
});

test("no clasifica como válida una fila sin evidencia comercial", () => {
  const csv = `${header}\nPedro,Pérez,CC,456,pedro@example.com,3001112233,Qori,Email,,0,0,Sin compra\n`;
  const row = parseCustomerCsv(payload(csv)).rows[0];
  assert.match(row.errors.join(" "), /Fecha incorrecta/i);
  assert.match(row.errors.join(" "), /Evidencia comercial insuficiente/i);
  assert.match(row.errors.join(" "), /Valor monetario inválido/i);
});

test("reporta filas con una cantidad de columnas distinta a la plantilla", () => {
  const row = parseCustomerCsv(payload(`${header}\nAna,Gómez,CC,123,ana@example.com,3001112233,Qori,WhatsApp,2026-08-15,1,100000,Nota,extra\n`)).rows[0];
  assert.match(row.errors.join(" "), /Cantidad de columnas incorrecta/i);
});

test("valida fechas reales, correo, teléfono y dinero local", () => {
  const csv = `${header}\nSol,Rojas,CC,789,correo-invalido,12,Qori,WhatsApp,2026-02-30,1,no-es-dinero,Error\n`;
  const row = parseCustomerCsv(payload(csv)).rows[0];
  assert.match(row.errors.join(" "), /Correo inválido/i);
  assert.match(row.errors.join(" "), /Teléfono inválido/i);
  assert.match(row.errors.join(" "), /Fecha incorrecta/i);
  assert.match(row.errors.join(" "), /Valor monetario inválido/i);
  assert.equal(parseMoney("1.234.567,89"), 1234567.89);
  assert.equal(parseMoney("1,234,567.89"), 1234567.89);
});

test("el contrato de importación conserva tenant, venta canónica, lotes e idempotencia", () => {
  const source = fs.readFileSync(path.join(__dirname, "../backend/src/services/customerCsvImportService.js"), "utf8");
  assert.match(source, /business_id = \$1/);
  assert.match(source, /insert into business_sales/);
  assert.match(source, /source_module: "customer_csv_import"/);
  assert.match(source, /imported_purchase_count/);
  assert.match(source, /business_customer_import_batches/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /savepoint customer_csv_row/);
});
