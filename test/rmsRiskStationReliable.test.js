const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "empresa/js/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "empresa/index.html"), "utf8");
const service = fs.readFileSync(path.join(root, "backend/src/services/rmsMachineService.js"), "utf8");
const crmService = fs.readFileSync(path.join(root, "backend/src/services/leadCrmService.js"), "utf8");

test("Riesgos permite registrar una respuesta sin ticket", () => {
  assert.match(app, /requestedPhase === "deliver" && !hasResource/);
  assert.match(app, /Registrar respuesta sin ticket/);
  assert.match(app, /step\("result", "3", "Responder", "Venta o Reciclaje"\)/);
});

test("la concesión se elige una vez y Responder la presenta como dato fijo", () => {
  const activeSync = app.slice(app.indexOf("syncRmsRiskRecoveryPhases = function syncRmsRiskRecoveryPhasesUnified"), app.indexOf("activateRmsRiskTab = function activateRmsRiskTabUnified"));
  const fixedOffer = app.slice(app.indexOf("const rmsRiskValidationStationCardMarkupFixedOfferBase"), app.indexOf("// La imagen ya está visible en el ticket"));
  assert.doesNotMatch(activeSync, /data-rms-risk-outcome-offer|data-rms-risk-outcome-discount-percent|data-rms-risk-outcome-detail/);
  assert.match(activeSync, /data-rms-risk-recovery-offer/);
  assert.match(fixedOffer, /data-rms-risk-selected-offer/);
  assert.match(fixedOffer, /data-rms-risk-fixed-offer-label/);
  assert.match(fixedOffer, /Sin concesión extraordinaria/);
  assert.match(html, /portal-clean-v39\.css\?v=[^"]*risk-fixed-concession-v385/);
});

test("Sin concesión deshabilita ticket y dirige a Responder con Venta lograda", () => {
  const ui = app.slice(app.indexOf("function rmsRiskOutcomeOfferUi"), app.indexOf("function setRmsRiskRecoveryPhase"));
  const phasedMarkup = app.slice(app.indexOf("rmsRiskOperatingFlowMarkup = function rmsRiskOperatingFlowMarkupUnified"), app.indexOf("syncRmsRiskRecoveryPhases = function syncRmsRiskRecoveryPhasesUnified"));
  const activeSync = app.slice(app.indexOf("syncRmsRiskRecoveryPhases = function syncRmsRiskRecoveryPhasesUnified"), app.indexOf("activateRmsRiskTab = function activateRmsRiskTabUnified"));
  const offerContract = app.slice(app.indexOf("function bindRmsRiskOfferContract"), app.indexOf("syncRmsRiskRecoveryPhases = function syncRmsRiskRecoveryPhasesUnified"));
  const initHelperSource = app.slice(app.indexOf("function rmsRiskShouldOpenResultOnInit"), app.indexOf("syncRmsRiskRecoveryPhases = function syncRmsRiskRecoveryPhasesUnified"));
  const shouldOpenResult = Function(`${initHelperSource}; return rmsRiskShouldOpenResultOnInit;`)();
  assert.match(ui, /expiration\.disabled = blocksTicket/);
  assert.match(ui, /detailWrap\.hidden = !needsDetail && !isNone/);
  assert.match(ui, /detailInput\.disabled = !needsDetail/);
  assert.match(ui, /if \(isNone \|\| isBlank\) detailInput\.value = ""/);
  assert.match(ui, /generate\.disabled = blocksTicket/);
  assert.match(ui, /activateRmsRiskTab\(card\.parentElement \|\| document, id, "sale"\)/);
  assert.match(ui, /setRmsRiskRecoveryPhase\(card, id, "result"\)/);
  assert.equal(shouldOpenResult("NONE", false), true);
  assert.equal(shouldOpenResult("", false), false);
  assert.equal(shouldOpenResult("DISCOUNT", false), false);
  assert.equal(shouldOpenResult("NONE", true), false);
  assert.match(offerContract, /rmsRiskShouldOpenResultOnInit\(offer\.value, hasResource\)/);
  assert.match(offerContract, /offer\.addEventListener\("change", apply\)/);
  assert.match(activeSync, /bindRmsRiskOfferContract\(card, item\)/);
  assert.match(app, /if \(item\) bindRmsRiskOfferContract\(card, item\);/);
  assert.match(app, /risk-none-initial-result-v396-20260829/);
  assert.match(html, /risk-none=initial-result-v396-20260829/);
  assert.doesNotMatch(phasedMarkup, /Descuento aplicado|data-rms-risk-discount-percent/);
});

test("Riesgos exige una selección explícita y ofrece una opción inicial en blanco", () => {
  const options = app.slice(app.indexOf("function rmsRiskRecoveryOfferOptions"), app.indexOf("function rmsRiskRecoveryAvailabilityMarkup"));
  const activeSave = app.slice(app.indexOf("saveRmsRiskDecision = async function saveRmsRiskDecisionUnified"), app.indexOf("// El activo se ve dentro de la estación"));
  assert.match(options, /<option value="" selected disabled>Selecciona una opción<\/option>/);
  assert.match(options, /<option value="NONE">Sin concesión extraordinaria<\/option>/);
  assert.match(activeSave, /result === "CLEARED" && !recoveryOfferValue/);
  assert.match(activeSave, /Selecciona una alternativa de recuperación o elige Sin concesión extraordinaria/);
  assert.match(app, /risk-none-explicit-selection-v398-20260829/);
  assert.match(html, /risk-none-select=explicit-v398-20260829/);
});

test("Sin concesión aplica el bloqueo aunque la mejora visual posterior falle", () => {
  const uiSource = app.slice(app.indexOf("function rmsRiskOutcomeOfferUi"), app.indexOf("function setRmsRiskRecoveryPhase"));
  const calls = [];
  const css = { escape: (value) => value };
  const classList = { toggle() {} };
  const nodes = {
    offer: { value: "NONE", selectedOptions: [{ textContent: "Sin concesión extraordinaria" }] },
    detailWrap: { hidden: true, classList },
    detailInput: { disabled: false, required: true, value: "detalle anterior" },
    expirationWrap: { classList },
    expiration: { disabled: false },
    generate: { disabled: false, setAttribute(name, value) { this[name] = value; } },
    selectedOffer: { value: "" },
    fixedLabel: { textContent: "" },
  };
  const card = {
    parentElement: {},
    querySelector(selector) {
      if (selector.includes("recovery-offer")) return nodes.offer;
      if (selector.includes("detail-wrap")) return nodes.detailWrap;
      if (selector.includes("recovery-detail")) return nodes.detailInput;
      if (selector.includes("expiration-wrap")) return nodes.expirationWrap;
      if (selector.includes("expiration-days")) return nodes.expiration;
      if (selector.includes("generate-risk-resource")) return nodes.generate;
      if (selector.includes("selected-offer")) return nodes.selectedOffer;
      if (selector.includes("fixed-offer-label")) return nodes.fixedLabel;
      return null;
    },
  };
  const apply = Function("CSS", "activateRmsRiskTab", "setRmsRiskRecoveryPhase", `${uiSource}; return rmsRiskOutcomeOfferUi;`)(
    css,
    (...args) => calls.push(["tab", ...args]),
    (...args) => calls.push(["phase", ...args]),
  );
  apply(card, "lead", { navigateNone: true });
  assert.equal(nodes.detailInput.disabled, true);
  assert.equal(nodes.detailInput.required, false);
  assert.equal(nodes.detailInput.value, "");
  assert.equal(nodes.expiration.disabled, true);
  assert.equal(nodes.generate.disabled, true);
  assert.equal(nodes.selectedOffer.value, "NONE");
  assert.equal(nodes.fixedLabel.textContent, "Sin concesión extraordinaria");
  assert.deepEqual(calls.map((entry) => entry[0]), ["tab", "phase"]);
});

test("el descuento del beneficio se deriva de la autorización y no de un campo manual", () => {
  const selection = app.slice(app.indexOf("function rmsRiskSelectedOffer"), app.indexOf("async function generateRmsRiskRecoveryResource"));
  const activeSave = app.slice(app.indexOf("saveRmsRiskDecision = async function saveRmsRiskDecisionUnified"), app.indexOf("// El activo se ve dentro de la estación"));
  assert.match(selection, /value === "DISCOUNT" \? permissions\.discount\.max_percent/);
  assert.doesNotMatch(selection, /data-rms-risk-discount-percent/);
  assert.match(activeSave, /selectedBenefit\?\.type === "DISCOUNT" \? selectedBenefit\.value : 0/);
});

test("Ventas y Reciclaje solo se abren después de confirmar el destino del servidor", () => {
  const activeSave = app.slice(app.indexOf("saveRmsRiskDecision = async function saveRmsRiskDecisionUnified"), app.indexOf("// El activo se ve dentro de la estación"));
  assert.doesNotMatch(activeSave, /await loadRmsMachineData/);
  assert.match(activeSave, /openRmsStation\("cierre"/);
  assert.match(activeSave, /const expectedDestination = result === "RECYCLE" \? "reciclaje" : "cierre"/);
  assert.match(activeSave, /confirmedDestination !== expectedDestination/);
  assert.match(activeSave, /item\.stage = confirmedDestination/);
  assert.match(activeSave, /state\.rmsMachineLoaded = false/);
});

test("el backend conserva las dos salidas canónicas y tenant scoping", () => {
  assert.match(service, /findOpportunity\(businessId, sourceType, payload\.source_id\)/);
  assert.match(service, /const toPhase = isCleared \? "cierre" : "reciclaje"/);
  assert.match(service, /from: "control_anti_fuga", decision: "RECYCLE", to: "reciclaje"/);
  assert.match(service, /RMS_TRANSITION_AUTHORITY\.RISK_REVIEW/);
});

test("Sin concesión puede salir a Ventas sin exigir un beneficio ni una nota manual", () => {
  const activeSave = app.slice(app.indexOf("saveRmsRiskDecision = async function saveRmsRiskDecisionUnified"), app.indexOf("// El activo se ve dentro de la estación"));
  assert.match(activeSave, /recoveryOfferValue === "NONE"/);
  assert.match(activeSave, /Venta confirmada sin concesión extraordinaria\./);
  assert.match(app, /risk-destination-handoff-v399-20260829/);
  assert.match(html, /risk-destination=handoff-v399-20260829/);
});

test("los beneficios personalizados se guardan, activan y eliminan de forma persistente", () => {
  const account = app.slice(app.indexOf("function accountRiskRecoveryPayload"), app.indexOf("async function submitAccountProfile"));
  const listeners = app.slice(app.indexOf("accountRiskAddBenefitButton?.addEventListener"), app.indexOf("accountCommunicationConnectButton?.addEventListener"));
  assert.match(html, /id="accountRiskSaveBenefitsButton"/);
  assert.match(account, /rms_risk_recovery_authorizations: accountRiskRecoveryPayload\(\)/);
  assert.match(listeners, /saveAccountRiskRecoveryAuthorizations/);
  assert.match(listeners, /data-risk-benefit-enabled/);
  assert.match(listeners, /row\.remove\(\)/);
  assert.match(listeners, /eliminado y ya no aparecerá en Riesgos de fuga/);
  assert.match(app, /function newAccountRiskBenefitId/);
  assert.match(app, /crypto\?\.randomUUID/);
  assert.match(service, /while \(benefitIds\.has\(id\)\)/);
});

test("el beneficio personalizado conserva snapshot y porcentaje hasta Ventas atribuidas", () => {
  assert.match(service, /custom_benefit: offer\.customBenefit \|\| null/);
  assert.match(service, /discount_percent: offer\.discountPercent/);
  assert.match(service, /preparedRiskRecoveryOffer\(payload, metadata\.risk_recovery_resource\)/);
  assert.match(service, /snapshotBenefitId !== requestedBenefitId/);
  assert.match(service, /riskRecoveryOffer\?\.type === "CUSTOM" && riskCustomBenefit\.type === "DISCOUNT" \? riskCustomBenefit\.value : 0/);
  assert.match(app, /riskContext\.offer\?\.type === "CUSTOM" && customBenefit\.type === "DISCOUNT" \? customBenefit\.value : 0/);
});

test("Ventas prioriza y bloquea el beneficio confirmado en Riesgos", () => {
  const presentation = app.slice(app.indexOf("function rmsRiskRecoveryPresentation"), app.indexOf("function rmsDealProgressMarkup"));
  const saleCardStart = app.indexOf("function rmsAttributedSaleStationCardMarkup");
  const saleCard = app.slice(saleCardStart, app.indexOf("function recyclingStatusLabel", saleCardStart));
  const saleApplyStart = app.indexOf("function applyRmsNegotiationContextToAttributedSales");
  const saleApply = app.slice(saleApplyStart, app.indexOf("function rmsAttributedSaleKey", saleApplyStart));
  assert.match(presentation, /type === "CUSTOM" && custom\.type === "OTHER"/);
  assert.match(presentation, /offer\.label \|\| custom\.label \|\| fallbackLabel/);
  assert.match(saleCard, /hasAppliedRiskBenefit \? riskContext\.benefitType/);
  assert.match(saleCard, /Beneficio aplicado en Riesgos/);
  assert.match(saleCard, /disabled aria-disabled/);
  assert.match(saleApply, /hasAppliedRiskBenefit \? riskContext\.benefitType/);
  assert.doesNotMatch(saleApply, /context\.benefit_type \|\| riskContext\.benefitType/);
  assert.match(app, /risk-benefit-handoff-v400-20260829/);
  assert.match(html, /risk-benefit=handoff-v400-20260829/);
  const present = Function(`${presentation}; return rmsRiskRecoveryPresentation;`)();
  const applied = present({
    result: "CLEARED",
    recovery_offer: {
      type: "CUSTOM",
      benefit_id: "benefit-otro",
      label: "Instalación incluida",
      custom_benefit: { id: "benefit-otro", type: "OTHER", label: "Instalación incluida", value: 1, detail: "Una instalación" },
    },
  });
  assert.equal(applied.benefitType, "OTHER");
  assert.equal(applied.label, "Instalación incluida");
});

test("el backend conserva tipo, id, etiqueta, valor y detalle del beneficio aplicado", () => {
  assert.match(service, /recoveryOffer === "CUSTOM" && customBenefit\?\.type === "OTHER"/);
  assert.match(service, /const effectiveBenefitType = riskBenefitType !== "NONE" \? riskBenefitType : requestedBenefitType/);
  assert.match(service, /const effectiveBenefitDescription = riskBenefitDescription \|\| String\(payload\.benefit_description/);
  assert.match(service, /source: "RISK_RECOVERY"/);
  assert.match(service, /authorization_id: riskRecoveryOffer\?\.benefit_id/);
  assert.match(service, /configured_value: Number\(riskCustomBenefit\.value/);
  assert.match(service, /applied_benefit: appliedRiskBenefit/);
  const validationSource = service.slice(service.indexOf("function normalizeRiskRecoveryAuthorizations"), service.indexOf("function rmsPersistedCaseFallbackRow"));
  const validateOffer = Function("badRequest", `${validationSource}; return validateRiskRecoveryOffer;`)((message) => new Error(message));
  const validated = validateOffer({ recovery_offer: "CUSTOM", recovery_benefit_id: "benefit-otro" }, {
    discount: { enabled: false, max_percent: 0 },
    two_for_one: { enabled: false, label: "" },
    gift: { enabled: false, label: "" },
    benefits: [{ id: "benefit-otro", enabled: true, type: "OTHER", label: "Instalación incluida", value: 1, detail: "Una instalación" }],
  });
  assert.equal(validated.benefitType, "OTHER");
  assert.equal(validated.recoveryBenefitId, "benefit-otro");
  assert.equal(validated.benefitLabel, "Instalación incluida");
  assert.equal(validated.detail, "");
  assert.equal(validated.customBenefit.detail, "Una instalación");
});

test("Riesgos permite agregar productos y elegir en cuáles aplica el beneficio", () => {
  const activeSave = app.slice(app.indexOf("saveRmsRiskDecision = async function saveRmsRiskDecisionUnified"), app.indexOf("// El activo se ve dentro de la estación"));
  assert.match(app, /function rmsRiskProductsBuilderMarkup/);
  assert.match(app, /data-rms-risk-add-product/);
  assert.match(app, /data-rms-risk-line-benefit/);
  assert.match(app, /Aplicar el beneficio a este producto/);
  assert.match(activeSave, /const products = rmsRiskProductsFromDom\(card\)/);
  assert.match(activeSave, /!products\.some\(\(product\) => product\.benefit_applied\)/);
  assert.match(activeSave, /recovery_detail:[^\n]+products,/);
  assert.match(activeSave, /idempotency_key: reviewOperationKey/);
  assert.match(service, /products: review\.products/);
  assert.match(service, /benefit_applied: offer\.recoveryOffer === "NONE" \? false/);
  assert.match(app, /risk-product-benefit-scope-v401-20260829/);
  assert.match(html, /risk-product-scope=v401-20260829/);
});

test("Riesgos abre con consulta exacta y render progresivo ligero", () => {
  assert.match(service, /const stationFastPath = lite && Boolean\(phaseFilter\)/);
  assert.match(service, /recentStateRowsForBusiness\(businessId, limit, phaseFilter\)/);
  assert.match(service, /leads: await leadRowsForStateRefs\(businessId, stationStateRows, crmFilters\)/);
  assert.match(service, /const results = await Promise\.all\(requests\)/);
  assert.match(app, /phase === "control_anti_fuga" \? 2 : RMS_STATION_RENDER_INITIAL_LIMIT/);
  assert.match(app, /display\.matchingRows\.length > display\.pageSize/);
  assert.match(app, /risk-station-fast-v403-20260829/);
  assert.match(html, /risk-speed=fast-v403-20260829/);
});

test("Riesgos poda las fuentes CRM antes de calcular agregados pesados", () => {
  assert.match(crmService, /const exactPlayerSourceSql = exactSourceClause\("PLAYER", "p"\)/);
  assert.match(crmService, /const exactManualSourceSql = exactSourceClause\("MANUAL", "ml"\)/);
  assert.match(crmService, /const exactAffiliateSourceSql = exactSourceClause\("AFFILIATE", "fa"\)/);
  assert.match(crmService, /where p\.business_id = \$1\s+\$\{exactPlayerSourceSql\}/);
  assert.match(crmService, /where ml\.business_id = \$1\s+\$\{exactManualSourceSql\}/);
  assert.match(crmService, /where fa\.business_id = \$1\s+\$\{exactAffiliateSourceSql\}/);
  assert.match(app, /risk-query-source-pruning-v407-20260829/);
  assert.match(html, /risk-query=source-pruning-v407-20260829/);
});

test("Riesgos conserva productos durante sincronizaciones y evita cargar el inventario dos veces", () => {
  assert.match(service, /inventory_products: phaseFilter === "control_anti_fuga" \? inventoryProducts : undefined/);
  assert.match(service, /scope, inventory_products \} = await listRmsOpportunities/);
  assert.match(service, /scope,\s+inventory_products,/);
  assert.match(app, /stationPhase === "control_anti_fuga" && Array\.isArray\(data\?\.inventory_products\)/);
  assert.doesNotMatch(app, /\["curaduria", "clasificacion", "procesamiento", "accion_correctiva", "control_anti_fuga", "cierre"\]/);
  assert.match(app, /function rmsRiskProductDraftStore/);
  assert.match(app, /persistRmsRiskProductDraft\(card, item\)/);
  assert.match(app, /function hydrateRmsRiskProductPicker/);
  assert.match(app, /data-rms-risk-product-options-ready="false"/);
  const bindingBlock = app.slice(app.indexOf("root.querySelectorAll(\".rms-risk-work-item[data-rms-station-lead]\")"), app.indexOf("root.querySelectorAll(\"[data-rms-risk-tab]\")"));
  assert.ok(bindingBlock.indexOf("bindRmsRiskProductLines(card, item)") < bindingBlock.indexOf("mountRmsRiskOperatingFlow(card, item)"));
  assert.match(app, /const safeResource = resource && typeof resource === "object" \? resource : \{\}/);
  assert.match(app, /risk-products-live-v405-20260829/);
  assert.match(html, /risk-products=live-v405-20260829/);
});
