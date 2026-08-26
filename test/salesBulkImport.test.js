const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const JSZip = require("jszip");
const { salesTemplateCsv, salesTemplateForBusiness, fileRows, resolveRows, parseMoney, parseDate } = require("../backend/src/services/salesBulkImportService");

function csvPayload(csv, name = "ventas.csv") { return { file_name:name, file_size:Buffer.byteLength(csv), mime_type:"text/csv", csv_text:csv }; }

test("la plantilla de ventas es UTF-8, Excel-compatible y procesable", async () => {
  const csv=salesTemplateCsv({responsibleEmail:"vendedor@empresa.com"}); assert.equal(csv.charCodeAt(0),0xFEFF);
  const parsed=await fileRows(csvPayload(csv)); assert.equal(parsed.rows.length,1); assert.deepEqual(parsed.rows[0].errors,[]); assert.equal(parsed.rows[0].external_id,"FAC-1042"); assert.equal(parsed.rows[0].amount,185000); assert.equal(parsed.rows[0].products.length,2); assert.deepEqual(parsed.rows[0].source_rows,[2,3]); assert.equal(parsed.rows[0].seller_reference,"vendedor@empresa.com");
});

test("la plantilla descargada usa un responsable activo del mismo negocio", async () => {
  let params;
  const csv=await salesTemplateForBusiness("business-1",{id:"manager-1",email:"manager@qori.co"},async (sql,values)=>{ assert.match(sql,/where business_id = \$1/); params=values; return {rows:[{email:"VENTAS@QORI.CO"}]}; });
  assert.deepEqual(params,["business-1","manager-1"]); assert.match(csv,/ventas@qori\.co/); assert.doesNotMatch(csv,/vendedor@empresa\.com/);
});

test("acepta separadores locales y normaliza dinero, identidad y fecha", async () => {
  const csv="fecha;total;nombre_cliente;documento;email;celular;vendedor;cantidad;moneda\r\n2026-08-25;1.250.000,50;María Gómez;10.203.040;MARIA@EXAMPLE.COM;+57 300 111 2233;vendedor@qori.co;2;cop\r\n";
  const row=(await fileRows(csvPayload(csv))).rows[0]; assert.equal(row.amount,1250000.5); assert.equal(row.document_id,"10203040"); assert.equal(row.email,"maria@example.com"); assert.equal(row.phone,"573001112233"); assert.equal(row.currency,"COP"); assert.deepEqual(row.errors,[]);
});

test("rechaza archivos incompletos y agrupa productos por ID de venta", async () => {
  await assert.rejects(()=>fileRows(csvPayload("cliente,valor\nAna,1000\n")),/Faltan columnas/i);
  const csv="id_venta,fecha_venta,valor,cliente,producto,cantidad,precio_unitario,moneda,responsable_comercial\nA-1,2026-08-25,3000,Ana,Cafe,1,1000,USD,vendedor@qori.co\nA-1,2026-08-25,3000,Ana,Postre,2,1000,,vendedor@qori.co\n";
  const parsed=await fileRows(csvPayload(csv)); assert.equal(parsed.rows.length,1); assert.deepEqual(parsed.rows[0].errors,[]); assert.equal(parsed.rows[0].products.length,2); assert.equal(parsed.rows[0].products[1].line_total,2000); assert.equal(parsed.rows[0].quantity,3); assert.equal(parsed.rows[0].currency,"USD");
  assert.equal(parseDate("2026-02-30"),null);
});

test("bloquea una venta agrupada si cambia el cliente o el responsable comercial", async () => {
  const csv="id_venta,fecha_venta,valor,cliente,producto,cantidad,subtotal_producto,responsable_comercial\nA-2,2026-08-25,3000,Ana,Cafe,1,1000,uno@qori.co\nA-2,2026-08-25,3000,Beto,Postre,1,2000,dos@qori.co\n";
  const row=(await fileRows(csvPayload(csv))).rows[0]; assert.match(row.errors.join(" "),/distinto cliente/i); assert.match(row.errors.join(" "),/distinto responsable comercial/i);
});

test("exige precio por linea cuando una venta contiene varios productos", async () => {
  const csv="id_venta,fecha_venta,valor,cliente,producto,cantidad,precio_unitario,responsable_comercial\nA-3,2026-08-25,3000,Ana,Cafe,1,1000,vendedor@qori.co\nA-3,2026-08-25,3000,Ana,Postre,1,,vendedor@qori.co\n";
  const row=(await fileRows(csvPayload(csv))).rows[0]; assert.match(row.errors.join(" "),/Falta precio_unitario o subtotal_producto/i);
});

test("concilia un responsable comercial unico y limita al vendedor a sus propias ventas", async () => {
  const csv="id_venta,fecha_venta,valor,cliente,producto,precio_unitario,responsable_comercial\nA-4,2026-08-25,1000,Ana,Cafe,1000,Comercial Uno\n";
  const db=async (sql) => {
    if (sql.includes("from app_users")) return {rows:[{id:"seller-1",full_name:"Comercial Uno",email:"uno@qori.co"},{id:"seller-2",full_name:"Comercial Dos",email:"dos@qori.co"}]};
    return {rows:[]};
  };
  const ownerParsed=await resolveRows("business-1",{id:"owner-1",role:"BUSINESS_OWNER"},await fileRows(csvPayload(csv)),db);
  assert.equal(ownerParsed.rows[0].seller.id,"seller-1"); assert.deepEqual(ownerParsed.rows[0].errors,[]);
  const sellerParsed=await resolveRows("business-1",{id:"seller-2",role:"VALIDATOR"},await fileRows(csvPayload(csv)),db);
  assert.match(sellerParsed.rows[0].errors.join(" "),/solo puede importar ventas propias/i);
});

test("lee la primera hoja de un XLSX real sin una dependencia de hoja de cálculo insegura", async () => {
  const zip=new JSZip();
  zip.file("xl/sharedStrings.xml",`<sst><si><t>fecha_venta</t></si><si><t>valor</t></si><si><t>cliente</t></si><si><t>responsable_comercial</t></si><si><t>2026-08-25</t></si><si><t>Ana</t></si><si><t>vendedor@qori.co</t></si></sst>`);
  zip.file("xl/worksheets/sheet1.xml",`<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row><row r="2"><c r="A2" t="s"><v>4</v></c><c r="B2"><v>45000</v></c><c r="C2" t="s"><v>5</v></c><c r="D2" t="s"><v>6</v></c></row></sheetData></worksheet>`);
  const buffer=await zip.generateAsync({type:"nodebuffer"}); const parsed=await fileRows({file_name:"ventas.xlsx",file_size:buffer.length,mime_type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",file_base64:buffer.toString("base64")});
  assert.equal(parsed.rows[0].customer_name,"Ana"); assert.equal(parsed.rows[0].amount,45000); assert.deepEqual(parsed.rows[0].errors,[]);
});

test("expone contratos premium, tenant-scoped e idempotentes", () => {
  const routes=fs.readFileSync("backend/src/routes/businessPortalRoutes.js","utf8"); const controller=fs.readFileSync("backend/src/controllers/salesBulkImportController.js","utf8"); const service=fs.readFileSync("backend/src/services/salesBulkImportService.js","utf8"); const portal=fs.readFileSync("empresa/index.html","utf8"); const client=fs.readFileSync("empresa/js/sales-bulk-import.js","utf8");
  assert.match(routes,/sales\/import\/preview/); assert.match(routes,/sales\/import-template\.csv/); assert.match(controller,/salesTemplateForBusiness\(businessId, req\.user\)/); assert.match(service,/where business_id = \$1/); assert.match(service,/on conflict \(business_id, idempotency_key\)/); assert.match(service,/Tu rol solo puede importar ventas propias/); assert.match(service,/syncSaleProductsWithCatalog/); assert.match(service,/responsible_commercial/); assert.match(portal,/id="salesBulkImportModal"/); assert.match(portal,/Agrupa productos por ID de venta/); assert.match(portal,/sales-bulk-import-v373/); assert.match(portal,/accept="\.csv,\.xlsx/); assert.match(client,/Descargar incidencias|downloadIncidents/); assert.match(client,/product_count/); assert.match(client,/No hay ventas válidas para importar/);
  assert.equal(parseMoney("1.234.567,89"),1234567.89); assert.match(parseDate("2026-08-25"),/^2026-08-25/);
});
