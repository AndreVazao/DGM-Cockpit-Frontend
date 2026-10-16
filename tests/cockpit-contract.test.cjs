const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("every literal DOM lookup in app.js has a matching HTML id", () => {
  const ids = [...app.matchAll(/\$\("([^"]+)"\)/g)].map(match => match[1]);
  const missing = [...new Set(ids.filter(id => !html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")))];
  assert.deepEqual(missing, []);
});

test("command catalog is authenticated and fail-closed", () => {
  assert.match(app, /api\("\/governance\/commands\/catalog"\)/);
  assert.match(app, /data\.mode!=="read-only-allowlist"/);
  assert.match(app, /data\.arbitrary_shell!==false/);
  assert.match(app, /command\.risk!=="READ"/);
  assert.match(app, /state\.availableCommands=\[\]/);
  assert.match(app, /runButton\.disabled=true/);
});

test("diagnostic execution uses the selected catalog ID and explicit POST action", () => {
  assert.match(app, /async function runSelectedCommand\(\)/);
  assert.match(app, /const payload=\{command_id:commandId\}/);
  assert.match(app, /api\("\/governance\/commands\/run",\{method:"POST",body:JSON\.stringify\(payload\)\}\)/);
  assert.doesNotMatch(app, /shell\s*:/);
});

test("periodic health polling does not execute diagnostics", () => {
  const start = app.indexOf("async function probeMotors(forceCatalog)");
  const end = app.indexOf("function newDraft()", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const polling = app.slice(start, end);
  assert.doesNotMatch(polling, /\/governance\/commands\/run/);
  assert.doesNotMatch(polling, /runSelectedCommand\(/);
});

test("command output is rendered as text, not interpreted HTML", () => {
  assert.match(app, /function showCommandResult\(text\)\{const root=\$\("commandResult"\);if\(root\)root\.textContent=/);
  assert.match(html, /id="commandResult"/);
  assert.match(html, /id="commandSelect"/);
  assert.match(html, /id="commandTargetPath"/);
  assert.match(html, /id="runCommandButton"/);
});
