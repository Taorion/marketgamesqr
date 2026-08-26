const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const JSZip = require("jszip");
const { salesTemplateCsv, fileRows, parseMoney, parseDate } = require("../backend/src/services/salesBulkImportService");

function csvPayload(csv, name = "ventas.csv") { return { file_name:name, file_size:Buffer.byteLength(csv), mime_type:"text/csv", csv_text:csv }; }

test("la plantilla de ventas es UTF-8, Excel-compatible y procesable", async () => {
  const csv=salesTemplateCsv(); assert.equal(csv.charCodeAt(0),0xFEFF);
  const parsed=await fileRows(csvPayload(csv)); assert.equal(parsed.rows.length,1); assert.deepEqual(parsed.rows[0].errors,[]); assert.equal(parsed.rows[0].external_id,"FAC-1042"); assert.equal(parsed.rows[0].amount,185000);
});

test("acepta separadores locales y normaliza dinero, identidad y fecha", async () => {
  const csv="fecha;total;nombre_cliente;documento;email;celular;vendedor;cantidad;moneda\r\n2026-08-25;1.250.000,50;María Gómez;10.203.040;MARIA@EXAMPLE.COM;+57 300 111 2233;vendedor@qori.co;2;cop\r\n";
  const row=(await fileRows(csvPayload(csv))).rows[0]; assert.equal(row.amount,1250000.5); assert.equal(row.document_id,"10203040"); assert.equal(row.email,"maria@example.com"); assert.equal(row.phone,"573001112233"); assert.equal(row.currency,"COP"); assert.deepEqual(row.errors,[]);
});

test("rechaza archivos incompletos y marca IDs repetidos", async () => {
  await assert.rejects(()=>fileRows(csvPayload("cliente,valor\nAna,1000\n")),/Faltan columnas/i);
  const csv="id_venta,fecha_venta,valor,cliente\nA-1,2026-08-25,1000,Ana\nA-1,2026-08-25,2000,Beto\n";
  const parsed=await fileRows(csvPayload(csv)); assert.deepEqual(parsed.rows[0].errors,[]); assert.match(parsed.rows[1].errors.join(" "),/repetido/i);
  assert.equal(parseDate("2026-02-30"),null);
});

test("lee la primera hoja de un XLSX real sin una dependencia de hoja de cálculo insegura", async () => {
  const zip=new JSZip();
  zip.file("xl/sharedStrings.xml",`<sst><si><t>fecha_venta</t></si><si><t>valor</t></si><si><t>cliente</t></si><si><t>2026-08-25</t></si><si><t>Ana</t></si></sst>`);
  zip.file("xl/worksheets/sheet1.xml",`<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2"><v>45000</v></c><c r="C2" t="s"><v>4</v></c></row></sheetData></worksheet>`);
  const buffer=await zip.generateAsync({type:"nodebuffer"}); const parsed=await fileRows({file_name:"ventas.xlsx",file_size:buffer.length,mime_type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",file_base64:buffer.toString("base64")});
  assert.equal(parsed.rows[0].customer_name,"Ana"); assert.equal(parsed.rows[0].amount,45000); assert.deepEqual(parsed.rows[0].errors,[]);
});

test("expone contratos premium, tenant-scoped e idempotentes", () => {
  const routes=fs.readFileSync("backend/src/routes/businessPortalRoutes.js","utf8"); const service=fs.readFileSync("backend/src/services/salesBulkImportService.js","utf8"); const portal=fs.readFileSync("empresa/index.html","utf8"); const client=fs.readFileSync("empresa/js/sales-bulk-import.js","utf8");
  assert.match(routes,/sales\/import\/preview/); assert.match(routes,/sales\/import-template\.csv/); assert.match(service,/where business_id = \$1/); assert.match(service,/on conflict \(business_id, idempotency_key\)/); assert.match(service,/Tu rol solo puede importar ventas propias/); assert.match(portal,/id="salesBulkImportModal"/); assert.match(portal,/accept="\.csv,\.xlsx/); assert.match(client,/Descargar incidencias|downloadIncidents/);
  assert.equal(parseMoney("1.234.567,89"),1234567.89); assert.match(parseDate("2026-08-25"),/^2026-08-25/);
});
