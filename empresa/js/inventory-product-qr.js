function ensureInventoryProductQrModal() {
  let modal = document.getElementById("inventoryProductQrModal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "inventoryProductQrModal";
  modal.className = "modal-shell hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "inventoryProductQrTitle");
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-close-inventory-qr]")) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
  });
  return modal;
}

function inventoryProductQrPrint(data = {}) {
  const product = data.product || {};
  const printWindow = window.open("", "_blank", "width=720,height=820");
  if (!printWindow) {
    showFeedback("El navegador bloqueó la ventana de impresión. Habilita ventanas emergentes e intenta otra vez.", "error", { title: "Imprimir QR" });
    return;
  }
  printWindow.opener = null;
  printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>QR ${escapeHtml(product.name || "Producto")}</title><style>@page{size:auto;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#111}.label{width:92mm;min-height:118mm;margin:auto;border:2px solid #111;border-radius:18px;padding:10mm;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}.brand{font-size:14px;font-weight:800;letter-spacing:.18em}.label img{width:64mm;height:64mm;image-rendering:crisp-edges}.label h1{font-size:22px;margin:8px 0 4px}.label p{margin:3px 0;font-size:14px}.reference{font-weight:800}.hint{margin-top:8px!important;font-size:12px!important;color:#444}</style></head><body><article class="label"><div class="brand">QORI</div><img src="${data.qr_image_data_url}" alt="QR del producto"><h1>${escapeHtml(product.name || "Producto")}</h1><p class="reference">${escapeHtml(product.internal_id || product.sku || product.barcode || String(product.id || "").slice(0, 8))}</p><p>${escapeHtml(money(product.unit_price || 0))} · ${escapeHtml(product.currency || "COP")}</p><p class="hint">Escanea en el Validador Qori para registrar la venta.</p></article><script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
  printWindow.document.close();
}

async function openInventoryProductQr(productId) {
  const modal = ensureInventoryProductQrModal();
  modal.innerHTML = '<article class="surface-card modal-card" style="width:min(520px,calc(100vw - 24px));text-align:center"><p>Cargando QR seguro del producto...</p></article>';
  modal.classList.remove("hidden");
  modal.removeAttribute("aria-hidden");
  try {
    const data = await api(`/api/business/inventory/product-qr/${encodeURIComponent(productId)}`, { headers: authHeaders() });
    const product = data.product || {};
    const reference = product.internal_id || product.sku || product.barcode || String(product.id || "").slice(0, 8);
    modal.innerHTML = `<article class="surface-card modal-card" style="width:min(520px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;text-align:center"><div class="modal-head"><div><span class="mono-label">QR DE PRODUCTO</span><h3 id="inventoryProductQrTitle">${escapeHtml(product.name || "Producto")}</h3><p>Imprime esta etiqueta y escanéala en el Validador Qori.</p></div><button class="icon-button" type="button" data-close-inventory-qr aria-label="Cerrar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></div><div style="margin:18px auto;padding:16px;background:#fff;border:1px solid #ddd;border-radius:18px;max-width:340px"><img src="${data.qr_image_data_url}" alt="QR de ${escapeHtml(product.name || "producto")}" style="display:block;width:100%;height:auto"><strong style="display:block;font-size:1.1rem">${escapeHtml(reference)}</strong><small>${escapeHtml(money(product.unit_price || 0))} · ${escapeHtml(product.currency || "COP")}</small></div><p class="form-message">El QR conserva la referencia canónica; el Validador comprueba que pertenezca a tu empresa y que siga activo.</p><div class="modal-button-row" style="justify-content:center;flex-wrap:wrap"><button class="ghost-button" type="button" data-download-inventory-qr><span class="material-symbols-outlined" aria-hidden="true">download</span> Descargar PNG</button><button class="solid-button" type="button" data-print-inventory-qr><span class="material-symbols-outlined" aria-hidden="true">print</span> Imprimir etiqueta</button></div></article>`;
    modal.querySelector("[data-download-inventory-qr]")?.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = data.qr_image_data_url;
      link.download = `qori-producto-${String(reference).replace(/[^a-z0-9_-]+/gi, "-")}.png`;
      link.click();
    });
    modal.querySelector("[data-print-inventory-qr]")?.addEventListener("click", () => inventoryProductQrPrint(data));
  } catch (error) {
    modal.classList.add("hidden");
    showFeedback(error.message || "No se pudo generar el QR del producto.", "error", { title: "QR de producto" });
  }
}

function inventoryProductHistoryMarkup(data = {}) {
  const product = data.product || {};
  const history = Array.isArray(data.history) ? data.history : [];
  const sourceLabel = (value) => ({
    MANUAL_FORM: "Carga manual",
    CSV_IMPORT: "Importación CSV",
    SALE_AUTO_CREATE: "Creación automática desde una venta",
    HISTORICAL_BACKFILL: "Registro histórico de Qori",
  }[String(value || "").toUpperCase()] || "Inventario Qori");
  const rows = history.length ? history.map((event) => {
    const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata : {};
    const created = event.action === "CREATED";
    const title = created ? "Producto cargado al inventario" : event.action === "ARCHIVED" ? "Producto archivado" : event.action === "DELETED" ? "Producto eliminado" : "Producto actualizado";
    const stock = metadata.initial_stock_quantity === null || metadata.initial_stock_quantity === undefined
      ? "Cantidad inicial no disponible"
      : `${Number(metadata.initial_stock_quantity || 0).toLocaleString("es-CO")} ${metadata.unit_label || product.unit_label || "unidad(es)"}`;
    const detail = created ? `${sourceLabel(metadata.source)} · ${stock}` : (event.reason || `${event.previous_status || "-"} → ${event.next_status || "-"}`);
    const date = event.created_at ? new Date(event.created_at) : null;
    const timestamp = date && !Number.isNaN(date.getTime()) ? date.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "Fecha no disponible";
    return `<div class="inventory-detail-customer"><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div><span><strong>${escapeHtml(timestamp)}</strong><small>${escapeHtml(event.actor_name || event.actor_email || "Sistema Qori")}</small></span></div>`;
  }).join("") : '<p class="empty-state compact">Aún no hay eventos registrados para este producto.</p>';
  return `<section class="inventory-detail-section" data-inventory-product-history aria-label="Historial del inventario"><span>Trazabilidad</span><h4>Historial del inventario</h4><p>Registro de cuándo se cargó el producto, quién lo hizo, su cantidad inicial y el origen de la carga.</p><div class="inventory-detail-customers">${rows}</div></section>`;
}

const renderInventoryProductDetailBeforeHistory = window.renderInventoryProductDetail;
if (typeof renderInventoryProductDetailBeforeHistory === "function") {
  window.renderInventoryProductDetail = function renderInventoryProductDetailWithHistory(data = {}) {
    const modal = renderInventoryProductDetailBeforeHistory(data);
    if (!modal?.querySelector("[data-inventory-product-history]")) {
      modal.querySelector(".inventory-detail-grid")?.insertAdjacentHTML("beforebegin", inventoryProductHistoryMarkup(data));
    }
    return modal;
  };
}
