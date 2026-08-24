const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  CUSTOMER_CSV_HEADERS,
  customerTemplateCsv,
  matchCommercialOwner,
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
  assert.equal(parsed.rows[0].commercial_owner_reference, "vendedor@empresa.com");
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
  assert.throws(() => parseCustomerCsv(payload("dato,otro\nAna,ana@example.com")), /columna de nombre/i);
  assert.throws(() => parseCustomerCsv({ ...payload(`${header}\nAna,Gómez,CC,1,a@b.co,3001112233,Qori,Email,2026-08-15,1,1000,Ok\n`), mime_type: "application/pdf" }), /tipo de archivo/i);
});

test("acepta el CSV de Excel separado por punto y coma", () => {
  const csv = "nombre;apellido;documento;email;celular;fecha_compra;compras;valor_total\r\nAna;Gómez;102030;ana@example.com;3001112233;2026-08-15;2;1.250.000,50\r\n";
  const parsed = parseCustomerCsv(payload(csv));
  assert.equal(parsed.delimiter, ";");
  assert.equal(parsed.rows[0].document_id, "102030");
  assert.equal(parsed.rows[0].total_spent, 1250000.5);
  assert.equal(parsed.rows[0].has_commercial_evidence, true);
  assert.deepEqual(parsed.rows[0].errors, []);
});

test("acepta encabezados parciales y columnas adicionales", () => {
  const csv = "nombre completo,email,empresa,campo_interno\nLaura,laura@example.com,Qori,no se importa\n";
  const parsed = parseCustomerCsv(payload(csv));
  assert.deepEqual(parsed.ignoredHeaders, ["campo_interno"]);
  assert.equal(parsed.rows[0].name, "Laura");
  assert.equal(parsed.rows[0].has_commercial_evidence, false);
  assert.deepEqual(parsed.rows[0].errors, []);
  assert.match(parsed.rows[0].warnings.join(" "), /Cliente/i);
});

test("solo exige nombre y permite completar el identificador después", () => {
  const rows = parseCustomerCsv(payload("nombre,correo\n,ana@example.com\nAna,correo-invalido\n")).rows;
  assert.match(rows[0].errors.join(" "), /nombre/i);
  assert.deepEqual(rows[1].errors, []);
  assert.match(rows[1].warnings.join(" "), /sin identificador/i);
});

test("el responsable comercial es opcional y se resuelve por correo o nombre único", () => {
  const owners = [
    { id: "11111111-1111-4111-8111-111111111111", full_name: "María Gómez", email: "maria@qori.co" },
    { id: "22222222-2222-4222-8222-222222222222", full_name: "Carlos Ruiz", email: "carlos@qori.co" },
  ];
  assert.equal(matchCommercialOwner("MARIA@QORI.CO", owners).owner.id, owners[0].id);
  assert.equal(matchCommercialOwner("Maria Gomez", owners).owner.id, owners[0].id);
  assert.equal(matchCommercialOwner("", owners).owner, null);
  assert.match(matchCommercialOwner("No existe", owners).warning, /sin asignar/i);
});

test("un nombre de responsable repetido exige correo y no bloquea la fila", () => {
  const owners = [
    { id: "1", full_name: "Ana Torres", email: "ana1@qori.co" },
    { id: "2", full_name: "Ana Torres", email: "ana2@qori.co" },
  ];
  const resolved = matchCommercialOwner("Ana Torres", owners);
  assert.equal(resolved.owner, null);
  assert.match(resolved.warning, /ambiguo/i);
});

test("detecta duplicados internos por prioridad documento, correo y teléfono", () => {
  const first = "Ana,Gómez,CC,123,ana@example.com,3001112233,Qori,WhatsApp,2026-08-15,1,100000,Uno";
  const second = "Ana,Otra,CC,123,otra@example.com,3009998877,Qori,Email,2026-08-16,1,200000,Dos";
  const rows = parseCustomerCsv(payload(`${header}\n${first}\n${second}\n`)).rows;
  assert.deepEqual(rows[0].errors, []);
  assert.match(rows[1].errors.join(" "), /Documento duplicado dentro del archivo/i);
});

test("una fila sin evidencia comercial queda válida como cliente con historial pendiente", () => {
  const csv = `${header}\nPedro,Pérez,CC,456,pedro@example.com,3001112233,Qori,Email,,0,0,Sin compra\n`;
  const row = parseCustomerCsv(payload(csv)).rows[0];
  assert.deepEqual(row.errors, []);
  assert.equal(row.has_commercial_evidence, false);
  assert.match(row.warnings.join(" "), /Cliente/i);
});

test("tolera filas cortas y avisa si sobran valores sin encabezado", () => {
  const shortRow = parseCustomerCsv(payload(`${header}\nAna,Gómez,CC,123\n`)).rows[0];
  assert.deepEqual(shortRow.errors, []);
  assert.equal(shortRow.has_commercial_evidence, false);
  const row = parseCustomerCsv(payload(`${header}\nAna,Gómez,CC,123,ana@example.com,3001112233,Qori,WhatsApp,2026-08-15,1,100000,Nota,responsable@qori.co,extra\n`)).rows[0];
  assert.deepEqual(row.errors, []);
  assert.match(row.warnings.join(" "), /valor\(es\) sin encabezado/i);
});

test("valida fechas reales, correo, teléfono y dinero local", () => {
  const csv = `${header}\nSol,Rojas,CC,789,correo-invalido,12,Qori,WhatsApp,2026-02-30,1,no-es-dinero,Error\n`;
  const row = parseCustomerCsv(payload(csv)).rows[0];
  assert.deepEqual(row.errors, []);
  assert.equal(row.email, "");
  assert.equal(row.phone, "");
  assert.match(row.warnings.join(" "), /Correo omitido/i);
  assert.match(row.warnings.join(" "), /Teléfono omitido/i);
  assert.match(row.warnings.join(" "), /Fecha de compra pendiente/i);
  assert.match(row.warnings.join(" "), /Valor acumulado pendiente/i);
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
  assert.match(source, /commercial_data_pending/);
  assert.match(source, /commercial_owner_user_id/);
  assert.match(source, /where business_id = \$1[\s\S]*and is_active = true/);
  assert.match(source, /"CONVERTED", row\.notes/);
  assert.match(source, /customer_import_declared: true/);
  assert.match(source, /customer_import_evidence: "CSV_DECLARATION"/);
  assert.match(source, /customer_history_pending_count/);
  assert.match(source, /if \(!row\.has_commercial_evidence\)/);
});
