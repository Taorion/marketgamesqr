const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../empresa/js/inventory-photos.js"), "utf8");

function setup() {
  const nodes = {};
  for (const id of ["inventoryPhotoInput", "inventoryPhotoPreview", "inventoryPhotoRemove", "inventoryPhotoMessage"]) {
    nodes[id] = { value: "", hidden: true, events: {}, validationMessage: "",
      addEventListener(event, handler) { this.events[event] = handler; },
      setCustomValidity(message) { this.validationMessage = message; },
      checkValidity() { return !this.validationMessage; }, reportValidity() {},
      removeAttribute(key) { delete this[key]; },
    };
  }
  const window = {};
  let resolvePhoto;
  const context = { window, document: { getElementById: id => nodes[id] },
    businessScopeKey: () => "test-business", authHeaders: () => ({}), escapeHtml: s => s,
    api: () => new Promise(resolve => { resolvePhoto = resolve; }),
    URL: { createObjectURL: () => "blob:test-photo", revokeObjectURL() {} },
    FileReader: class { readAsDataURL(file) { this.result = `data:${file.type};base64,dGVzdA==`; this.onload(); } },
  };
  vm.runInNewContext(source, context);
  const editor = window.inventoryPhotoEditor;
  editor.reset();
  return { nodes, editor, resolve: value => resolvePhoto(value),
    select(size, type = "image/png") {
      nodes.inventoryPhotoInput.files = [{ size, type, name: "producto.png" }];
      nodes.inventoryPhotoInput.events.change();
    },
  };
}

test("selecting a valid photo shows preview and includes it only on save", async () => {
  const ui = setup();
  assert.equal(Object.keys(await ui.editor.payload()).length, 0);
  ui.select(500000);
  assert.equal(ui.nodes.inventoryPhotoPreview.hidden, false);
  assert.match((await ui.editor.payload()).photo_data_url, /^data:image\/png;base64,/);
});

test("client rejects oversized and unsupported photos before save", async () => {
  const ui = setup();
  ui.select(500001);
  await assert.rejects(ui.editor.payload(), /500 KB/);
  ui.select(100, "image/svg+xml");
  await assert.rejects(ui.editor.payload(), /JPG, PNG o WebP/);
});

test("removal is explicit and reset does not remove a stored photo", async () => {
  const ui = setup();
  ui.editor.reset({ id: "product", has_photo: true });
  assert.equal(Object.keys(await ui.editor.payload()).length, 0);
  ui.nodes.inventoryPhotoRemove.events.click();
  assert.equal((await ui.editor.payload()).photo_data_url, null);
  ui.editor.reset();
  assert.equal(Object.keys(await ui.editor.payload()).length, 0);
});

test("late saved-photo response cannot overwrite a new selection", async () => {
  const ui = setup();
  ui.editor.reset({ id: "product", has_photo: true });
  ui.select(100);
  ui.resolve({ data_url: "data:old-photo" });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.nodes.inventoryPhotoPreview.src, "blob:test-photo");
});
