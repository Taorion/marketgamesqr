const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../empresa/js/app.js'), 'utf8');
const scope = vm.createContext({});
for (const name of ['escapeHtml', 'leadDirectoryMetadata', 'leadContextNotes', 'renderLeadContext']) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end), scope);
}

test('context notes support directory metadata and canonical detail values', () => {
  assert.equal(scope.leadContextNotes({metadata: {manual_notes: 'Nota manual'}}), 'Nota manual');
  assert.equal(scope.leadContextNotes({metadata: {notes: 'Nota capturada'}}), 'Nota capturada');
  assert.equal(scope.leadContextNotes({notes: 'Actualizada', metadata: {manual_notes: 'Anterior'}}), 'Actualizada');
  assert.equal(scope.leadContextNotes({notes: '', metadata: {manual_notes: 'Anterior'}}), '');
});

test('directory shows full multiline notes and interest, escaping stored HTML', () => {
  const notes = 'Primera línea\n' + 'Contexto largo '.repeat(180) + '<img src=x onerror=alert(1)>';
  const html = scope.renderLeadContext({metadata: {manual_notes: notes}, top_interest: 'Catálogo'}, true);
  assert.ok(html.includes(scope.escapeHtml(notes)));
  assert.ok(html.includes('Catálogo'));
  assert.ok(html.includes('Notas de contexto'));
  assert.ok(!html.includes('<img'));
});

test('detail includes saved commercial fields without inventing empty data', () => {
  const html = scope.renderLeadContext({document_type: 'NIT', document_id: '123', source_detail: 'Referido', metadata: {manual_company: 'Empresa', manual_job_title: 'Compras', manual_importance_reason: 'Llamar el lunes', manual_notes: 'Contexto'}});
  for (const value of ['NIT · 123', 'Referido', 'Empresa', 'Compras', 'Llamar el lunes', 'Contexto']) assert.ok(html.includes(value));
  assert.equal(scope.renderLeadContext({}, true), '');
});
