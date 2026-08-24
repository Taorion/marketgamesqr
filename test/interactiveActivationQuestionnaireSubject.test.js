const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("el QR de una activación conserva un sujeto aunque el contacto no sea PLAYER", () => {
  const service = read("backend/src/services/interactiveActivationService.js");
  assert.match(service, /insert into questionnaires[\s\S]*interactive_participant_id, answers/);
  assert.match(service, /participant\.player_id \|\| null,[\s\S]*participant\.id,[\s\S]*jsonParam/);
});

test("questionnaires admite participantes interactivos sin perder integridad referencial", () => {
  const migration = read("database/migrations/202608230001_interactive_questionnaire_participants.sql");
  const schema = read("database/schema.sql");
  assert.match(migration, /alter column player_id drop not null/);
  assert.match(migration, /interactive_participant_id uuid[\s\S]*references interactive_activation_participants\(id\) on delete cascade/);
  assert.match(migration, /check \(player_id is not null or interactive_participant_id is not null\)/);
  assert.match(migration, /idx_questionnaires_interactive_participant/);
  assert.match(schema, /player_id uuid references players\(id\) on delete cascade/);
  assert.match(schema, /constraint questionnaires_subject_check check \(player_id is not null or interactive_participant_id is not null\)/);
});
