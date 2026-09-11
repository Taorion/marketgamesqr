const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("la landing interactiva solicita nombres y primer apellido obligatorios por separado", () => {
  const html = read("activacion/index.html");
  assert.match(html, /<span>Nombres<\/span><input id="participantName"[^>]+required/);
  assert.match(html, /<span>Primer apellido<\/span><input id="participantFirstSurname"[^>]+required/);
  assert.match(html, /Segundo apellido[^<]*<small>\(opcional\)<\/small>[^<]*<\/span><input id="participantSecondSurname"/);
  assert.doesNotMatch(html, /id="participantSecondSurname"[^>]+required/);
});

test("la landing envia componentes y nombre canonico sin perder el segundo apellido", () => {
  const source = read("activacion/activation.js");
  assert.match(source, /given_names: participantName\.value\.trim\(\)/);
  assert.match(source, /first_surname: participantFirstSurname\.value\.trim\(\)/);
  assert.match(source, /second_surname: participantSecondSurname\.value\.trim\(\) \|\| null/);
  assert.match(source, /filter\(Boolean\)\.join\(" "\)/);
});

test("el backend valida ambos componentes y conserva compatibilidad con clientes anteriores", () => {
  const validators = read("backend/src/utils/validators.js");
  const service = read("backend/src/services/interactiveActivationService.js");
  assert.match(validators, /given_names: z\.string\(\).*optional\(\)\.nullable\(\)/);
  assert.match(validators, /first_surname: z\.string\(\).*optional\(\)\.nullable\(\)/);
  assert.match(service, /Los nombres y el primer apellido son obligatorios/);
  assert.match(service, /body\.name = \[givenNames, firstSurname, secondSurname\]/);
  assert.match(service, /given_names:[\s\S]+first_surname:[\s\S]+second_surname:/);
  assert.match(service, /delete body\.given_names;[\s\S]+delete body\.first_surname;[\s\S]+delete body\.second_surname;/);
});

test("Captura Relampago aplica la misma estructura incluso a configuraciones antiguas", () => {
  const service = read("backend/src/services/leadCaptureService.js");
  const portal = read("empresa/js/app.js");
  assert.match(service, /name: "first_name", label: "Nombres"[^\n]+required: true/);
  assert.match(service, /name: "last_name", label: "Primer apellido"[^\n]+required: true/);
  assert.match(service, /name: "second_last_name", label: "Segundo apellido \(opcional\)"[^\n]+required: false/);
  assert.match(service, /\["first_name", "last_name"\]\.includes\(field\.name\)/);
  assert.match(portal, /\["second_last_name", "Segundo apellido \(opcional\)", true, false\]/);
});

test("el nombre persistido y la exportacion incluyen los dos apellidos", () => {
  const service = read("backend/src/services/leadCaptureService.js");
  assert.match(service, /\[formData\.first_name, formData\.last_name, formData\.second_last_name\]/);
  assert.match(service, /"nombres", "primer_apellido", "segundo_apellido"/);
  assert.match(service, /form\.last_name,\s+form\.second_last_name,/);
});
