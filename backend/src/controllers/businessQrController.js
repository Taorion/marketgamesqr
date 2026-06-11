const { forbidden } = require("../utils/http");
const { validate, postSaleQrSchema, qrBatchSchema } = require("../utils/validators");
const {
  createPostSaleQr,
  createQrBatch,
  listQrBatches,
  getQrBatch,
  getQrHistory,
  getQrMetrics,
  getIndividualQrDownload,
  getBatchCsvDownload,
  getBatchJsonDownload,
  getBatchPrintableHtml,
  getBatchZipDownload,
  getBatchPdfDownload,
} = require("../services/strategicQrService");
const {
  assertFeatureForRequest,
  assertMonthlyUsageLimit,
  getBusinessSubscription,
  recordUsage,
} = require("../services/subscriptionService");

function businessIdFor(req) {
  if (!req.user.business_id) {
    throw forbidden("This user is not assigned to a business.");
  }
  return req.user.business_id;
}

async function createPostSale(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const subscription = await assertFeatureForRequest(req, businessId, "qr_simple_generator");
    if (subscription.plan.category === "subscription") {
      await assertMonthlyUsageLimit(
        businessId,
        "qr_generated",
        subscription.plan.limits.monthly_qr_included,
        1,
        "QR incluidos del plan"
      );
    }
    const body = validate(postSaleQrSchema, req.body);
    const result = await createPostSaleQr(businessId, req.user, body);
    await recordUsage({
      business_id: businessId,
      user_id: req.user.id,
      event_type: "qr_generated",
      quantity: 1,
      metadata: { source: "post_sale" },
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function createBatch(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const body = validate(qrBatchSchema, req.body);
    const subscription = await assertFeatureForRequest(req, businessId, "qr_batch_generator");
    if (subscription.plan.category === "subscription") {
      await assertMonthlyUsageLimit(
        businessId,
        "qr_generated",
        subscription.plan.limits.monthly_qr_included,
        body.quantity,
        "QR incluidos del plan"
      );
    }
    const result = await createQrBatch(businessId, req.user, body);
    await recordUsage({
      business_id: businessId,
      user_id: req.user.id,
      event_type: "qr_generated",
      quantity: body.quantity,
      metadata: { source: "batch", batch_id: result.batch?.id || null },
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listBatches(req, res, next) {
  try {
    res.json({ batches: await listQrBatches(businessIdFor(req)) });
  } catch (error) {
    next(error);
  }
}

async function batchDetail(req, res, next) {
  try {
    res.json(await getQrBatch(businessIdFor(req), req.params.id));
  } catch (error) {
    next(error);
  }
}

async function qrHistory(req, res, next) {
  try {
    res.json({ history: await getQrHistory(businessIdFor(req)) });
  } catch (error) {
    next(error);
  }
}

async function qrMetrics(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const [metrics, subscription] = await Promise.all([
      getQrMetrics(businessId),
      getBusinessSubscription(businessId),
    ]);
    res.json({ ...metrics, subscription });
  } catch (error) {
    next(error);
  }
}

async function downloadQr(req, res, next) {
  try {
    res.json(await getIndividualQrDownload(businessIdFor(req), req.params.id));
  } catch (error) {
    next(error);
  }
}

async function downloadBatchCsv(req, res, next) {
  try {
    const csv = await getBatchCsvDownload(businessIdFor(req), req.params.id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="qr-batch-${req.params.id}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

async function downloadBatch(req, res, next) {
  try {
    const businessId = businessIdFor(req);
    const format = String(req.query.format || "csv").toLowerCase();
    const template = String(req.query.template || "sticker").toLowerCase();
    const paper = String(req.query.paper || "a4").toLowerCase();
    if (format === "csv") {
      const csv = await getBatchCsvDownload(businessId, req.params.id);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="qr-batch-${req.params.id}.csv"`);
      return res.send(csv);
    }
    if (format === "json") {
      const json = await getBatchJsonDownload(businessId, req.params.id);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="qr-batch-${req.params.id}.json"`);
      return res.send(JSON.stringify(json, null, 2));
    }
    if (format === "html") {
      const html = await getBatchPrintableHtml(businessId, req.params.id, template, paper);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `inline; filename="qr-batch-${req.params.id}.html"`);
      return res.send(html);
    }
    if (format === "zip") {
      const zip = await getBatchZipDownload(businessId, req.params.id);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zip.filename}"`);
      return res.send(zip.bytes);
    }
    if (format === "pdf") {
      const pdf = await getBatchPdfDownload(businessId, req.params.id, template, paper);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
      return res.send(pdf.bytes);
    }
    throw forbidden("Unsupported batch download format.");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPostSale,
  createBatch,
  listBatches,
  batchDetail,
  qrHistory,
  qrMetrics,
  downloadQr,
  downloadBatchCsv,
  downloadBatch,
};
