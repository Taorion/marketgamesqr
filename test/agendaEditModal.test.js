const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("empresa/js/app.js", "utf8");
const update = source.slice(source.indexOf("async function updateAgendaItem("), source.indexOf("async function updateAgendaStatus("));
const submit = source.slice(source.indexOf("async function updateAgendaItemFromForm("), source.indexOf("async function updateAgendaChecklistItem("));
function harness(fail = false) {
  const calls = [];
  const fields = { next_action: "Reunión", note: "Revisar propuesta", reminder_at: "2026-10-01T10:30", agenda_scope: "GENERAL", agenda_status: "OPEN", agenda_priority: "HIGH", progress_percent: "50", checklist: "Confirmar", note_type: "follow_up", meeting_url: "https://meet.google.com/example" };
  const ctx = {
    FormData: class { constructor(form) { this.form = form; } get(key) { return this.form[key]; } },
    api: async (url, options) => { calls.push({url, payload:JSON.parse(options.body)}); if(fail) throw Error("No se pudo guardar"); return {ok:true}; },
    authHeaders: () => ({}),
    closeLeadAgendaEditModal: () => calls.push("close"),
    refreshLeadAgendaAfterMutation: async () => calls.push("refresh"),
    showFeedback: (message) => calls.push(message),
    agendaEditFeedback: (message) => calls.push({error:message}),
    parseAgendaLeadValue: () => ({}),
    selectedAgendaCampaignFromData: () => null,
    agendaSourceTypeForScope: () => "GENERAL",
    agendaScheduledDateIso: v => v,
    agendaChecklistItems: v => [{text:v}],
    agendaOperationalPayloadFromFields: d => ({meeting_url:d.get("meeting_url")})
  };
  vm.createContext(ctx); vm.runInContext(update + submit,ctx);
  return {calls, fields, run:()=>ctx.updateAgendaItemFromForm({preventDefault(){},currentTarget:fields},"activity-1")};
}
test("guardar mantiene los campos y cierra solo después del PATCH", async () => {
  const h=harness(); await h.run();
  assert.equal(h.calls[0].url,"/api/business/leads/agenda/activity-1");
  assert.equal(h.calls[0].payload.next_action,"Reunión");
  assert.equal(h.calls[0].payload.metadata.meeting_url,"https://meet.google.com/example");
  assert.equal(h.calls[0].payload.progress_percent,50);
  assert.equal(h.calls[0].payload.agenda_priority,"HIGH");
  assert.equal(h.calls[1],"close");
  assert.equal(h.calls[2],"refresh");
});
test("un error conserva el editor y muestra el mensaje", async () => {
  const h=harness(true); await h.run();
  assert.equal(h.calls.includes("close"),false);
  assert.equal(h.calls.includes("refresh"),false);
  assert.equal(h.calls[1].error,"No se pudo guardar");
});
test("campos incompletos no envían cambios ni cierran el editor", async () => {
  const h=harness(); h.fields.next_action=""; await h.run();
  assert.equal(h.calls.length,1);
  assert.match(h.calls[0].error,/Completa/);
});
