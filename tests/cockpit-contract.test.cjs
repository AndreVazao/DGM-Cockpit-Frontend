const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

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


test("virtual office is a separate view and preserves the brain/UI authority boundary", () => {
  assert.match(html, /id="officeView"/);
  assert.match(html, /id="officeViewButton"/);
  assert.match(html, /1792476724975\.jpg/);
  assert.match(html, /Estados com proveniência/);
  assert.match(html, /O backend ainda não fornece eventos deste departamento/);
  assert.match(app, /function renderOffice\(\)/);
  assert.match(app, /if\(!motor\)return; \/\/ No data source means unknown, never fabricated activity\./);
  assert.match(app, /function setView\(view\)/);
});

test("office only projects observed motor state; unknown departments do not receive invented activity", () => {
  assert.match(app, /const motor=motorState\.find\(item=>item\.id===id\)/);
  assert.match(html, /Sem telemetria/);
  assert.match(html, /Investigação/);
  assert.match(html, /Memória &amp; arquivo/);
  assert.match(html, /Aprovações &amp; segurança/);
});


test("chat and office navigation remains accessible and does not replace the core chat", () => {
  assert.match(html, /id="chatViewButton" type="button" aria-pressed="true"/);
  assert.match(html, /id="officeViewButton" type="button" aria-pressed="false"/);
  assert.match(html, /id="composerArea"/);
  assert.match(app, /\$\("composerArea"\)\.classList\.toggle\("hidden",office\)/);
});


test("virtual office consumes authenticated live telemetry without exposing mission goals", () => {
  assert.match(app, /api\("\/runtime\/office\/telemetry"\)/);
  assert.match(app, /dgm-mat\.office-telemetry\.v1/);
  assert.match(app, /officeTelemetry\.missions\.total/);
  assert.match(html, /id="officeActiveMissions"/);
  assert.match(html, /id="officeWaitingApprovals"/);
  assert.match(html, /data-office-room="engineering"/);
  assert.match(html, /data-office-room="operations"/);
  assert.match(html, /data-office-room="agents"/);
  assert.match(app, /No data source means unknown, never fabricated activity/);
});


test("isometric office blueprint is accessible and explicitly separated from live telemetry", () => {
  assert.match(html, /class="office-blueprint"/);
  assert.match(html, /id="blueprintSvgTitle"/);
  assert.match(html, /id="blueprintSvgDesc"/);
  assert.match(html, /Esquema estático · não representa atividade em direto/);
  assert.match(html, /COORDENAÇÃO/);
  assert.match(css, /Isometric office blueprint: deliberately static architecture/);
});


test("chat readiness does not claim mission execution is ready from conversation bridge alone", () => {
  assert.match(app, /API e conversas disponíveis · execução por confirmar/);
  assert.doesNotMatch(app, /PC ligado · DGM-MAT pronto/);
});

test("runtime office contract remains observational and preserves unknown departments", () => {
  assert.match(app, /api\("\/runtime\/office\/telemetry"\)/);
  assert.match(app, /dgm-mat\.office-telemetry\.v1/);
  assert.match(app, /No data source means unknown, never fabricated activity/);
  assert.match(html, /Esquema estático · não representa atividade em direto/);
});

test("virtual office renders a bounded recent mission feed from telemetry without mission goals", () => {
  assert.match(html, /id="officeMissionActivity"/);
  assert.match(html, /id="officeActivityEmpty"/);
  assert.match(app, /function renderRecentMissionActivity\(missions\)/);
  assert.match(app, /Array\.isArray\(missions\.recent\)/);
  assert.match(app, /recent\.slice\(0,8\)/);
  assert.match(app, /id\.textContent=String\(mission\.mission_id/);
  assert.doesNotMatch(app.slice(app.indexOf("function renderRecentMissionActivity"), app.indexOf("async function probeOfficeTelemetry")), /mission\.goal/);
  assert.match(css, /\.office-activity-list\{display:grid/);
});


test("assistant mission messages read exact persisted mission state and result", () => {
  assert.ok(app.includes("message.metadata&&message.metadata.mission_id"));
  assert.ok(app.includes('api("/runtime/missions/"+encodeURIComponent(String(missionId)))'));
  assert.ok(app.includes("Estado/resultado não confirmado"));
  assert.ok(app.includes("payload.result_truncated||payload.output_truncated"));
  assert.ok(html.includes("avatar careca semelhante será produzido como recurso separado"));
  assert.ok(html.includes("1792476724975.jpg"));
  assert.ok(css.includes(".mission-tracker{"));
});


test("virtual office exposes the complete logical floor directory with evidence-based states", () => {
  assert.ok(html.includes('id="officeFloorDirectory"'));
  for (const floor of ["front-office","central","engineering","research","memory","governance","design","agents","operations"]) {
    assert.ok(html.includes('data-office-floor="'+floor+'"'), "missing logical floor "+floor);
  }
  assert.ok(app.includes("function renderOfficeFloors(telemetry)"));
  assert.ok(app.includes("Sem fonte de estado específica."));
  assert.ok(app.includes("não implica execução de missão confirmada."));
  assert.ok(css.includes(".office-floor-grid{display:grid"));
});


test("logical floor directory navigates to matching operational rooms", () => {
  assert.ok(app.includes('event.target.closest("[data-floor-target]")'));
  assert.ok(app.includes('room.scrollIntoView({behavior:"auto",block:"center"})'));
  for (const target of ["api","engineering","research","memory","approvals","agents","operations"]) {
    assert.ok(html.includes('data-floor-target="'+target+'"'), "missing floor navigation target "+target);
  }
  assert.ok(css.includes(".floor-open:focus-visible"));
});


test("virtual office renders the declared role catalog separately from live telemetry", () => {
  assert.match(html, /id="officeRosterDirectory"/);
  assert.match(html, /id="officeDeclaredDepartments"/);
  assert.match(html, /id="officeDeclaredAgents"/);
  assert.match(app, /function renderOfficeRoster\(telemetry\)/);
  assert.match(app, /const organization=telemetry&&telemetry\.organization/);
  assert.match(html, /Papéis declarados ≠ trabalhadores ativos/);
  assert.match(app, /Sem telemetria/);
  assert.doesNotMatch(app.slice(app.indexOf("function renderOfficeRoster"), app.indexOf("function renderOffice()")), /innerHTML/);
});

test("minimal dashboard exposes a user-triggered end-to-end conversation integrity check", () => {
  assert.match(html, /id="e2eTestButton"/);
  assert.match(html, /id="e2eSteps"/);
  assert.match(html, /id="e2eResult"/);
  assert.match(app, /async function runEndToEndTest\(\)/);
  assert.match(app, /fetch\(API\+"\/health"/);
  assert.match(app, /api\("\/runtime\/health"\)/);
  assert.match(app, /api\("\/mobile\/status"\)/);
  assert.match(app, /api\("\/mobile\/threads"\)/);
  assert.match(app, /api\("\/mobile\/threads\/"\+encodeURIComponent\(thread\.id\)\+"\/messages"/);
  assert.match(app, /const persisted=await readJson\(await api\("\/mobile\/threads\/"\+encodeURIComponent\(thread\.id\)\)\)/);
  assert.match(app, /const noMission=!response\.mission_id/);
  assert.match(app, /const chatIntent=!!response\.intent&&response\.intent\.intent==="chat"/);
  assert.match(app, /const testMessage="Ping local do cockpit DGM-MAT\. Devolve apenas a sequência "\+marker/);
  assert.match(app, /E2E_THREAD_KEY/);
  assert.match(app, /RESULTADO: PASSOU/);
  assert.match(app, /Não executou missões nem comandos/);
});
