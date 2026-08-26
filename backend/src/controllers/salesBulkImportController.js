const { z } = require("zod");
const { forbidden } = require("../utils/http");
const { validate } = require("../utils/validators");
const { assertFeatureForRequest } = require("../services/subscriptionService");
const { salesTemplateForBusiness, previewSalesFile, importSalesFile } = require("../services/salesBulkImportService");

const fileSchema = z.object({
  file_name: z.string().trim().min(5).max(240).regex(/\.(csv|xlsx)$/i),
  file_size: z.number().int().positive().max(5 * 1024 * 1024),
  mime_type: z.string().trim().max(160).optional().nullable(),
  csv_text: z.string().max(5 * 1024 * 1024).optional(),
  file_base64: z.string().max(8 * 1024 * 1024).optional(),
}).superRefine((value, context) => {
  if (/\.csv$/i.test(value.file_name) && !value.csv_text) context.addIssue({ code: z.ZodIssueCode.custom, path: ["csv_text"], message: "CSV requerido." });
  if (/\.xlsx$/i.test(value.file_name) && !value.file_base64) context.addIssue({ code: z.ZodIssueCode.custom, path: ["file_base64"], message: "Excel requerido." });
});

function businessIdFor(req) {
  if (!req.user?.business_id) throw forbidden("Este usuario no está asignado a un negocio.");
  return req.user.business_id;
}
async function ensureAccess(req) { const businessId = businessIdFor(req); await assertFeatureForRequest(req, businessId, "sales_tracker"); return businessId; }

async function downloadSalesImportTemplate(req, res, next) {
  try {
    const businessId = await ensureAccess(req);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="plantilla-ventas-qori.csv"');
    res.send(await salesTemplateForBusiness(businessId, req.user));
  } catch (error) { next(error); }
}
async function previewSalesImport(req, res, next) {
  try { const businessId = await ensureAccess(req); res.json(await previewSalesFile(businessId, req.user, validate(fileSchema, req.body))); } catch (error) { next(error); }
}
async function importSales(req, res, next) {
  try { const businessId = await ensureAccess(req); res.status(201).json(await importSalesFile(businessId, req.user, validate(fileSchema, req.body))); } catch (error) { next(error); }
}

module.exports = { downloadSalesImportTemplate, previewSalesImport, importSales };
