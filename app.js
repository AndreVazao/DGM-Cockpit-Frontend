/* DGM-MAT Cockpit Frontend. No external dependencies. */
(function () {
  "use strict";
  const API = window.location.origin;
  const SESSION_KEY = "dgm-mat-cockpit-session-v1";
  const THREADS_KEY = "dgm-mat-cockpit-local-v1";
  const MAX_FILE_BYTES = 2 * 1024 * 1024;
  const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
  const MAX_FILES = 8;
  const ALLOWED_EXT = new Set(["txt","md","markdown","json","jsonl","csv","tsv","py","js","ts","tsx","jsx","html","css","xml","yaml","yml","toml","ini","cfg","log","ps1","bat","cmd","sql","sh","rst","diff","patch"]);
  const state = { token: sessionStorage.getItem(SESSION_KEY) || "", threads: [], activeId: null, attachments: [], localDrafts: loadDrafts(), sending: false, availableCommands: [] };
  const $ = id => document.getElementById(id);
  const ui = {
    sidebar:$("sidebar"), list:$("threadList"), chat:$("chat"), messages:$("messages"), welcome:$("welcome"),
    title:$("conversationTitle"), context:$("contextLine"), statusDot:$("statusDot"), statusText:$("statusText"),
    input:$("messageInput"), send:$("sendButton"), attach:$("attachButton"), picker:$("documentPicker"),
    bootstrapPicker:$("bootstrapPicker"), pairDialog:$("pairDialog"), pairError:$("pairError"),
    renameDialog:$("renameDialog"), renameInput:$("renameInput"), attachmentList:$("attachmentList")
  };
  function loadDrafts(){ try { const d=JSON.parse(localStorage.getItem(THREADS_KEY)||"[]"); return Array.isArray(d)?d:[]; } catch(_){ return []; } }
  function saveDrafts(){ localStorage.setItem(THREADS_KEY,JSON.stringify(state.localDrafts)); }
  function esc(value){ return String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function active(){ return state.threads.find(t=>t.id===state.activeId)||state.localDrafts.find(t=>t.id===state.activeId)||null; }
  function setStatus(ok,text){ ui.statusDot.classList.toggle("online",!!ok); ui.statusText.textContent=text; }
  function api(path,options){
    const headers = new Headers(options && options.headers || {});
    headers.set("Accept","application/json");
    if(state.token) headers.set("Authorization","Bearer "+state.token);
    if(options && options.body && !(options.body instanceof FormData)) headers.set("Content-Type","application/json");
    return fetch(API+path,Object.assign({},options||{},{headers,cache:"no-store"}));
  }
  async function readJson(response){ let data={}; try{data=await response.json();}catch(_){} if(!response.ok){if(response.status===401){state.token="";sessionStorage.removeItem(SESSION_KEY);} throw new Error(data.detail||("HTTP "+response.status));} return data; }
  async function pairWithBootstrapFile(file){
    ui.pairError.textContent="";
    if(!file){return;}
    if(!["token","txt"].includes((file.name.split(".").pop()||"").toLowerCase())){ui.pairError.textContent="Seleciona o ficheiro bootstrap.token.";return;}
    if(file.size>16384){ui.pairError.textContent="O ficheiro selecionado não parece ser um token de bootstrap válido.";return;}
    const bootstrap=(await file.text()).trim();
    if(bootstrap.length<60){ui.pairError.textContent="O token selecionado é inválido ou está incompleto.";return;}
    try{
      const response=await fetch(API+"/auth/session",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+bootstrap},body:JSON.stringify({client_id:"dgm-mat-desktop-cockpit"})});
      const data=await readJson(response);
      state.token=data.access_token;
      sessionStorage.setItem(SESSION_KEY,state.token);
      ui.pairDialog.close();
      await refresh();
    }catch(error){ui.pairError.textContent="Não foi possível ligar: "+error.message+". Confirma que abriste o cockpit pelo PC local e escolheste o bootstrap.token correto.";}
  }
  async function refresh(){
    if(!state.token){setStatus(false,"Não ligado · sessão local necessária");render();return false;}
    try{
      const status=await readJson(await api("/mobile/status"));
      const data=await readJson(await api("/mobile/threads"));
      state.threads=Array.isArray(data.threads)?data.threads:[];
      const localActive=state.localDrafts.find(t=>t.id===state.activeId);
      if(localActive && localActive.messages.length===0){ /* keep empty draft selected */ }
      else if(!state.activeId || !state.threads.some(t=>t.id===state.activeId)) state.activeId=state.threads[0]&&state.threads[0].id||null;
      setStatus(true,"API e conversas disponíveis · execução por confirmar");
      ui.context.textContent="DGM-MAT · "+(status.ollama&&status.ollama.available?"Ollama disponível":"modo de resposta do runtime");
      render();
      return true;
    }catch(error){
      setStatus(false,error.message==="Failed to fetch"?"PC indisponível · abre o cockpit no PC":"Sessão expirada ou API indisponível");
      if(!state.token)openPairDialog();
      render();
      return false;
    }
  }
  const motorState = [
    {id:"api",name:"API DGM-MAT",state:"yellow",detail:"A verificar…"},
    {id:"chat",name:"Conversas / histórico",state:"yellow",detail:"À espera de sessão"},
    {id:"ollama",name:"Motor de IA local",state:"yellow",detail:"A verificar…"},
    {id:"repair",name:"Autocorreção",state:"yellow",detail:"A verificar endpoint"},
    {id:"executor",name:"Executor governado",state:"yellow",detail:"A verificar catálogo autorizado"},
    {id:"inventory",name:"Inventário de motores",state:"yellow",detail:"Ainda não consultado"},
    {id:"browser",name:"Controlo web",state:"red",detail:"Capacidade ainda não confirmada"}
  ];
  function renderMotors(){
    const root=$("motorList"); if(!root)return;
    root.replaceChildren();
    motorState.forEach(m=>{
      const row=document.createElement("div");row.className="motor-row";
      const led=document.createElement("span");led.className="led "+m.state;
      const info=document.createElement("span");info.className="motor-info";
      const name=document.createElement("strong");name.textContent=m.name;
      const detail=document.createElement("small");detail.textContent=m.detail;
      info.append(name,detail);row.append(led,info);root.append(row);
    });
  }
  function setMotor(id,state,detail){const m=motorState.find(x=>x.id===id);if(m){m.state=state;m.detail=detail;}renderMotors();renderOffice();}
  const motorLabels={green:"Confirmado",yellow:"Parcial",red:"Indisponível"};
  const officeStateLabels={active:"Ativo",waiting:"À espera",idle:"Em espera",unknown:"Sem telemetria",degraded:"Degradado"};
  let officeTelemetry=null;
  let officeTelemetryError="";
  let officeTelemetryLoading=false;
  function officeVisualState(state){
    if(state==="active")return "green";
    if(state==="waiting")return "yellow";
    if(state==="degraded")return "red";
    return "unknown";
  }
  const officeFloorMap = [
    {id:"front-office",title:"Piso 0 · Receção e ligação ao proprietário",department:null,detail:"Sem feed específico de receção / Chief of Staff."},
    {id:"central",title:"Piso 1 · Direção central",department:null,detail:"Estado do runtime; não prova por si só que o worker esteja ativo."},
    {id:"engineering",title:"Piso 2 · Engenharia e QA",department:"engineering"},
    {id:"research",title:"Piso 3 · Investigação e laboratórios",department:"research"},
    {id:"memory",title:"Piso 4 · Memória e conhecimento",department:"memory"},
    {id:"governance",title:"Piso 5 · Aprovações e governação",department:"approvals"},
    {id:"design",title:"Piso 6 · Design, produto e UI/UX",department:null,detail:"Sem feed específico de design / produto."},
    {id:"agents",title:"Piso 7 · RH e catálogo de agentes",department:"agents"},
    {id:"operations",title:"Piso 8 · Operações, armazém e expedição",department:"operations"}
  ];
  function renderOfficeFloors(telemetry){
    const root=$("officeFloorDirectory");if(!root)return;
    root.querySelectorAll("[data-office-floor]").forEach(card=>{
      const spec=officeFloorMap.find(item=>item.id===card.dataset.officeFloor);
      if(!spec)return;
      const badge=card.querySelector("[data-floor-state]");
      const detail=card.querySelector("[data-floor-detail]");
      let status="unknown",summary=spec.detail||"Sem fonte de estado específica.";
      if(telemetry&&spec.id==="central"&&telemetry.runtime){
        const runtime=telemetry.runtime;
        const raw=String(runtime.status||"unknown");
        if(runtime.is_degraded===true||raw.toLowerCase()==="degraded")status="degraded";
        else if(["running","healthy","ready"].includes(raw.toLowerCase()))status="active";
        summary="Runtime observado: "+raw+" · não implica execução de missão confirmada.";
      }else if(telemetry&&spec.department){
        const department=telemetry.departments&&telemetry.departments[spec.department];
        if(department){
          status=officeVisualState(department.state)==="green"?"active":officeVisualState(department.state)==="yellow"?"waiting":officeVisualState(department.state)==="red"?"degraded":"unknown";
          summary=department.reason||"Sem detalhe devolvido pelo runtime.";
          if(spec.department==="engineering")summary=(department.active_missions||0)+" missão(ões) ativas · "+(department.waiting_missions||0)+" à espera.";
          else if(spec.department==="approvals")summary=(department.waiting_decisions||0)+" decisões pendentes · "+(department.approved_actions||0)+" aprovadas · "+(department.running_actions||0)+" em execução.";
          else if(spec.department==="operations")summary=department.worker_alive===true?"Heartbeat do worker confirmado.":"Heartbeat do worker não confirmado.";
        }
      }
      if(badge){badge.textContent=officeStateLabels[status]||"Sem telemetria";badge.className="floor-state state-"+officeVisualState(status);}
      if(detail)detail.textContent=summary;
    });
  }
  function renderOfficeRoster(telemetry){
    const summary=$("officeRosterSummary"),departmentsRoot=$("officeDeclaredDepartments"),agentsRoot=$("officeDeclaredAgents"),policy=$("officeRosterPolicy");
    if(!summary||!departmentsRoot||!agentsRoot||!policy)return;
    departmentsRoot.replaceChildren();agentsRoot.replaceChildren();
    const organization=telemetry&&telemetry.organization;
    if(!organization||!Array.isArray(organization.departments)||!Array.isArray(organization.agents)){
      summary.textContent="Catálogo organizacional ainda não disponível nesta versão do backend";
      policy.textContent="A vista operacional continua disponível. Os papéis não serão inferidos a partir de nomes ou estados genéricos.";
      return;
    }
    summary.textContent=organization.departments.length+" departamentos · "+organization.agents.length+" agentes definidos";
    policy.textContent=String(organization.activity_policy||"Papéis declarados não comprovam atividade real.");
    const stateLabels={active:"Ativo",waiting:"À espera",idle:"Em espera",unknown:"Sem telemetria",degraded:"Degradado",offline:"Offline"};
    function makeCard(className,title,description,details,status){
      const card=document.createElement("article");card.className=className;
      const heading=document.createElement("strong");heading.textContent=String(title||"Sem nome");card.append(heading);
      const body=document.createElement("p");body.textContent=String(description||"Sem descrição declarada.");card.append(body);
      (details||[]).forEach(value=>{const line=document.createElement("small");line.textContent=String(value);card.append(line);});
      const badge=document.createElement("span");badge.className="office-roster-state";badge.textContent=stateLabels[status]||"Sem telemetria";card.append(badge);
      return card;
    }
    organization.departments.forEach(department=>{
      const capabilities=Array.isArray(department.capabilities)?department.capabilities.join(" · "):"Capacidades não declaradas";
      departmentsRoot.append(makeCard("office-roster-card",department.name,department.mission,["Capacidades: "+(capabilities||"não declaradas")],department.activity_state));
    });
    organization.agents.forEach(agent=>{
      agentsRoot.append(makeCard("office-roster-card",agent.name,String(agent.role||"Papel não declarado")+" · "+String(agent.department_id||"sem departamento"),[
        "Maturidade: "+String(agent.execution_maturity||"ROLE_DEFINED_ONLY"),
        String(agent.activation_blocker||"Ativação não verificada")
      ],agent.activity_state));
    });
  }
  function renderOffice(){
    const office=$("officeView");if(!office)return;
    const truth=$("officeTruthText");
    if(truth){
      if(!state.token)truth.textContent="Sessão local necessária para consultar o runtime";
      else if(officeTelemetry)truth.textContent="Telemetria autenticada · "+officeTelemetry.missions.total+" missões observadas · "+(officeTelemetry.generated_at||"agora");
      else if(officeTelemetryError)truth.textContent=officeTelemetryError;
      else truth.textContent="Sessão autenticada · a consultar estados reais…";
    }
    renderOfficeFloors(officeTelemetry);
    renderOfficeRoster(officeTelemetry);
    const missions=officeTelemetry&&officeTelemetry.missions;
    const actionCounts=officeTelemetry&&officeTelemetry.actions&&officeTelemetry.actions.counts||{};
    const setKpi=(id,value)=>{const node=$(id);if(node)node.textContent=value==null?"—":String(value);};
    setKpi("officeActiveMissions",missions&&missions.counts?missions.counts.RUNNING: null);
    setKpi("officeWaitingApprovals",actionCounts.QUEUED==null?null:actionCounts.QUEUED);
    setKpi("officeRunningActions",actionCounts.RUNNING==null?null:actionCounts.RUNNING);
    const worker=officeTelemetry&&officeTelemetry.queue_worker;
    setKpi("officeWorkerStatus",worker?(worker.worker_alive?"Confirmado":"Não confirmado"):"Sem leitura");
    office.querySelectorAll("[data-office-room]").forEach(room=>{
      const id=room.dataset.officeRoom;
      const stateLabel=room.querySelector("[data-office-state]");
      const detail=room.querySelector("[data-office-detail]");
      const led=room.querySelector(".room-led");
      const department=officeTelemetry&&officeTelemetry.departments&&officeTelemetry.departments[id];
      if(department){
        const visual=officeVisualState(department.state);
        if(stateLabel){stateLabel.textContent=officeStateLabels[department.state]||"Sem telemetria";stateLabel.className="room-state state-"+visual;}
        let summary=department.reason||"Sem detalhe devolvido pelo runtime";
        if(id==="engineering")summary=(department.active_missions||0)+" missão(ões) ativas · "+(department.waiting_missions||0)+" à espera";
        else if(id==="approvals")summary=(department.waiting_decisions||0)+" decisões pendentes · "+(department.approved_actions||0)+" aprovadas · "+(department.running_actions||0)+" em execução";
        else if(id==="operations")summary=department.worker_alive?"Worker da fila confirmado":"Worker da fila não confirmado";
        if(detail)detail.textContent=summary;
        if(led)led.className="room-led "+visual;
        return;
      }
      const motor=motorState.find(item=>item.id===id);
      if(!motor)return; // No data source means unknown, never fabricated activity.
      const label=motorLabels[motor.state]||"Sem leitura";
      if(stateLabel){stateLabel.textContent=label;stateLabel.className="room-state state-"+(motor.state||"unknown");}
      if(detail)detail.textContent=motor.detail||"Sem detalhe devolvido pelo runtime";
      if(led)led.className="room-led "+(motor.state||"unknown");
    });
    renderRecentMissionActivity(missions);
  }
  function renderRecentMissionActivity(missions){
    const list=$("officeMissionActivity"),empty=$("officeActivityEmpty");
    if(!list||!empty)return;
    list.replaceChildren();
    const recent=missions&&Array.isArray(missions.recent)?missions.recent:[];
    if(!recent.length){
      empty.textContent=missions&&missions.total===0?"Ainda não existem checkpoints de missão para apresentar.":"Sem atividade de missão disponível na telemetria.";
      empty.hidden=false;
      return;
    }
    empty.hidden=true;
    const labels={CREATED:"Criada",QUEUED:"Na fila",APPROVAL_PENDING:"Aguarda aprovação",RUNNING:"Em execução",WAITING_FOR_USER:"À espera do operador",COMPLETED:"Concluída",CANCELLED:"Cancelada",FAILED:"Falhou"};
    recent.slice(0,8).forEach(mission=>{
      const item=document.createElement("li");item.className="office-activity-item";
      const top=document.createElement("div");top.className="office-activity-top";
      const id=document.createElement("strong");id.textContent=String(mission.mission_id||"Missão sem ID");
      const status=document.createElement("span");status.className="office-activity-status";status.textContent=labels[mission.status]||"Estado desconhecido";
      top.append(id,status);
      const meta=document.createElement("p");meta.className="office-activity-meta";
      const details=[];
      if(mission.handler)details.push("handler: "+String(mission.handler));
      if(mission.action_id!==null&&mission.action_id!==undefined)details.push("ação #"+String(mission.action_id));
      if(mission.updated_at){
        const date=new Date(mission.updated_at);
        details.push(Number.isNaN(date.getTime())?"data não validada":date.toLocaleString("pt-PT"));
      }
      meta.textContent=details.join(" · ")||"Sem detalhes adicionais na fonte";
      item.append(top,meta);list.append(item);
    });
  }
  async function probeOfficeTelemetry(){
    if(officeTelemetryLoading)return;
    if(!state.token){
      officeTelemetry=null;officeTelemetryError="Sessão local necessária para consultar o runtime";renderOffice();return;
    }
    officeTelemetryLoading=true;
    try{
      const payload=await readJson(await api("/runtime/office/telemetry"));
      if(!payload||payload.schema!=="dgm-mat.office-telemetry.v1"||!payload.missions||!payload.missions.counts||!payload.actions||!payload.actions.counts||!payload.departments||!payload.queue_worker)throw new Error("Contrato de telemetria inválido");
      officeTelemetry=payload;officeTelemetryError="";
    }catch(_){
      officeTelemetry=null;officeTelemetryError="Telemetria indisponível · confirma a ligação e a sessão local";
    }finally{
      officeTelemetryLoading=false;renderOffice();
    }
  }
  function setView(view){
    const office=view==="office";
    $("chat").classList.toggle("hidden",office);
    $("composerArea").classList.toggle("hidden",office);
    $("officeView").classList.toggle("hidden",!office);
    $("chatViewButton").classList.toggle("active",!office);
    $("officeViewButton").classList.toggle("active",office);
    $("chatViewButton").setAttribute("aria-pressed",String(!office));
    $("officeViewButton").setAttribute("aria-pressed",String(office));
    $("conversationTitle").textContent=office?"Escritório digital DGM-MAT":(active()&&active().title||"Nova conversa");
    $("contextLine").textContent=office?"Vista observacional · telemetria autenticada":"DGM-MAT · PC local";
    if(office){renderOffice();probeOfficeTelemetry();}
  }
  let lastRepairProbe=0;
  let lastCommandCatalogProbe=0;
  function showCommandResult(text){const root=$("commandResult");if(root)root.textContent=String(text||"").slice(0,4000);}
  function syncCommandTargetField(){
    const select=$("commandSelect"),field=$("commandTargetPath");if(!select||!field)return;
    const spec=state.availableCommands.find(c=>c.id===select.value);
    field.hidden=!(spec&&spec.requires_target);
    field.required=!!(spec&&spec.requires_target);
    field.placeholder=field.required?"Pasta Git existente dentro das raízes autorizadas":"Sem pasta necessária para este comando";
  }
  async function probeCommandCatalog(force){
    if(!state.token){setMotor("executor","red","Sessão autenticada necessária");return;}
    if(!force && Date.now()-lastCommandCatalogProbe<120000)return;
    lastCommandCatalogProbe=Date.now();
    setMotor("executor","yellow","A consultar catálogo de comandos…");
    try{
      const data=await readJson(await api("/governance/commands/catalog"));
      const commands=Array.isArray(data.commands)?data.commands:[];
      if(data.mode!=="read-only-allowlist"||data.arbitrary_shell!==false)throw new Error("Política inesperada; catálogo recusado");
      if(!commands.length||commands.some(command=>!command||typeof command.id!=="string"||!/^[a-z][a-z0-9._-]{0,99}$/.test(command.id)||command.risk!=="READ"||typeof command.requires_target!=="boolean"))throw new Error("Catálogo vazio ou com esquema/permissões inválidos");
      state.availableCommands=commands;
      const runButton=$("runCommandButton");if(runButton)runButton.disabled=false;
      const select=$("commandSelect");
      if(select){
        const previous=select.value;select.replaceChildren();
        commands.forEach(command=>{const option=document.createElement("option");option.value=String(command.id||"");option.textContent=String(command.id||"comando")+" — "+String(command.description||"");select.append(option);});
        select.value=commands.some(c=>c.id===previous)?previous:(commands.some(c=>c.id==="engines.inventory")?"engines.inventory":String(commands[0]?.id||""));
        syncCommandTargetField();
      }
      setMotor("executor","green",commands.length+" comandos autorizados · apenas leitura");
      const inventory=commands.find(c=>c.id==="engines.inventory");
      setMotor("inventory",inventory?"yellow":"red",inventory?"Disponível por pedido explícito":"Comando de inventário ausente no catálogo");
    }catch(error){
      state.availableCommands=[];
      const select=$("commandSelect");if(select){select.replaceChildren();const option=document.createElement("option");option.value="";option.textContent="Catálogo indisponível";select.append(option);}
      const runButton=$("runCommandButton");if(runButton)runButton.disabled=true;
      setMotor("executor","red","Catálogo não acessível: "+error.message);
      setMotor("inventory","yellow","Inventário não executado");
    }
  }
  async function runSelectedCommand(){
    const button=$("runCommandButton"),select=$("commandSelect"),target=$("commandTargetPath");
    const commandId=select&&select.value;const spec=state.availableCommands.find(c=>c.id===commandId);
    if(!spec){showCommandResult("Catálogo não carregado. Atualiza o estado e confirma a sessão de operador.");return;}
    const targetPath=target?target.value.trim():"";
    if(spec.requires_target&&!targetPath){showCommandResult("Este diagnóstico requer uma pasta Git existente dentro das raízes autorizadas.");syncCommandTargetField();if(target)target.focus();return;}
    if(button)button.disabled=true;
    showCommandResult("A executar o diagnóstico autorizado: "+commandId+"…");
    if(commandId==="engines.inventory")setMotor("inventory","yellow","A executar engines.inventory…");
    try{
      const payload={command_id:commandId};if(spec.requires_target)payload.target_path=targetPath;
      const data=await readJson(await api("/governance/commands/run",{method:"POST",body:JSON.stringify(payload)}));
      const status=String(data.status||"unknown");
      setMotor("executor",status==="passed"?"green":status==="unavailable"?"yellow":"red","Último diagnóstico: "+commandId+" · "+status+" · "+String(data.duration_ms??"?")+" ms");
      if(commandId==="engines.inventory")setMotor("inventory",status==="passed"?"green":status==="unavailable"?"yellow":"red","Resultado real: "+status+" · "+String(data.duration_ms??"?")+" ms");
      let output=String(data.stdout||"").trim();
      if(commandId==="engines.inventory"&&output){
        try{
          const parsed=JSON.parse(output);
          if(parsed===null)output="Nenhum processo correspondente encontrado.";
          else{const list=Array.isArray(parsed)?parsed:[parsed];output=list.map(p=>String(p.Name||p.name||"processo")+" · PID "+String(p.ProcessId??p.processId??p.Id??"?")).join("\n");}
        }catch(_){}
      }
      if(!output)output=String(data.stderr||"Sem saída.");
      showCommandResult("Comando: "+commandId+"\nEstado: "+status+"\nCódigo: "+String(data.returncode??"n/d")+"\nDuração: "+String(data.duration_ms??"?")+" ms\n\n"+output);
    }catch(error){
      setMotor("executor","red","Diagnóstico falhou: "+error.message);
      if(commandId==="engines.inventory")setMotor("inventory","red","Inventário falhou: "+error.message);
      showCommandResult("Não foi possível concluir o diagnóstico.\n"+error.message+"\n\nConfirma sessão de operador, backend e registo de auditoria.");
    }finally{if(button)button.disabled=false;}
  }
  async function probeMotors(forceCatalog){
    setMotor("api","yellow","A testar /health…");
    try{
      const response=await fetch(API+"/health",{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const data=await response.json().catch(()=>({}));
      const health=String(data.status||data.state||"").toLowerCase();
      if(["degraded","warning","unhealthy","error","partial"].includes(health))setMotor("api","yellow","API respondeu com estado "+health);
      else setMotor("api","green","API respondeu · HTTP "+response.status);
    }catch(error){setMotor("api","red","Sem resposta: "+error.message);}
    if(!state.token){
      setMotor("chat","red","Sessão não autenticada");
      setMotor("ollama","yellow","Requer sessão para consultar o estado");
      setMotor("repair","yellow","Requer sessão para consultar o estado");
      setMotor("executor","red","Sessão autenticada necessária");
      setMotor("inventory","yellow","Ligar sessão para consultar motores");
      setMotor("browser","red","Não foi encontrada capacidade de controlo web confirmada");
      return;
    }
    await probeCommandCatalog(!!forceCatalog);
    try{
      const data=await readJson(await api("/mobile/status"));
      setMotor("chat","green","API de conversas respondeu");
      if(data.ollama&&data.ollama.available)setMotor("ollama","green","Ollama reportado como disponível");
      else setMotor("ollama","yellow","Não disponível ou não confirmado pelo runtime");
    }catch(error){
      setMotor("chat","red","Falha ao consultar conversas: "+error.message);
      setMotor("ollama","yellow","Estado não confirmado");
    }
    if(Date.now()-lastRepairProbe>120000){
      lastRepairProbe=Date.now();
      try{
        const data=await readJson(await api("/governance/audit/self"));
        const automatic=Array.isArray(data.automatic_actions)?data.automatic_actions.length:0;
        setMotor("repair","yellow","Diagnóstico responde · "+automatic+" ação(ões) automática(s) planeada(s); capacidade limitada");
      }catch(error){setMotor("repair","red","Endpoint de diagnóstico indisponível: "+error.message);}
    }
    setMotor("browser","red","Controlo de navegador não confirmado no backend");
  }
  function openPairDialog(){ui.pairError.textContent="";if(!ui.pairDialog.open)ui.pairDialog.showModal();}
  function newDraft(){
    const t={id:"draft-"+(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()),title:"Nova conversa",created_at:new Date().toISOString(),updated_at:new Date().toISOString(),messages:[],local:true};
    state.localDrafts.unshift(t);state.activeId=t.id;saveDrafts();ui.sidebar.classList.remove("open");render();ui.input.focus();
  }
  async function ensureServerThread(thread){
    if(!thread.local)return thread;
    const data=await readJson(await api("/mobile/threads",{method:"POST",body:JSON.stringify({title:thread.title||"Nova conversa"})}));
    state.localDrafts=state.localDrafts.filter(t=>t.id!==thread.id);state.activeId=data.id;
    state.threads.unshift(data);saveDrafts();return data;
  }
  function addMessage(container, message){
    const row=document.createElement("div");row.className="message-row"+(message.role==="user"?" user":"");
    const bubble=document.createElement("div");bubble.className="message "+(message.role==="user"?"user":"assistant")+(message.error?" error":"")+(message.pending?" pending":"");
    const content=document.createElement("div");content.className="message-content";content.textContent=message.content||"";
    const meta=document.createElement("div");meta.className="message-meta";
    const date=message.created_at?new Date(message.created_at):new Date();
    meta.textContent=(message.role==="user"?"Tu":"DGM-MAT")+" · "+date.toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})+(message.pending?" · por enviar":"");
    bubble.append(content,meta);
    const missionId=message.role==="assistant"&&message.metadata&&message.metadata.mission_id;
    if(missionId){
      const tracker=document.createElement("div");tracker.className="mission-tracker";
      const status=document.createElement("p");status.className="mission-tracker-status";status.setAttribute("aria-live","polite");
      status.textContent="Missão registada · execução por confirmar";
      const check=document.createElement("button");check.type="button";check.className="mission-check-button";check.textContent="Consultar estado real";
      check.addEventListener("click",async()=>{
        check.disabled=true;status.textContent="A consultar o checkpoint persistido…";
        try{
          const payload=await readJson(await api("/runtime/missions/"+encodeURIComponent(String(missionId))));
          if(!payload||String(payload.mission_id)!==String(missionId)||typeof payload.status!=="string")throw new Error("Resposta de detalhe de missão inválida");
          const labels={CREATED:"Criada",QUEUED:"Na fila",APPROVAL_PENDING:"Aguarda aprovação",RUNNING:"Em execução",WAITING_FOR_USER:"À espera do operador",COMPLETED:"Concluída",SUCCEEDED:"Concluída",CANCELLED:"Cancelada",FAILED:"Falhou"};
          const parts=["Estado persistido: "+(labels[payload.status]||"Desconhecido"),"ID "+String(missionId)];
          if(typeof payload.progress==="number")parts.push("progresso reportado "+Math.round(Math.max(0,Math.min(1,payload.progress))*100)+"%");
          if(payload.updated_at){
            const date=new Date(payload.updated_at);
            parts.push(Number.isNaN(date.getTime())?"data não validada":date.toLocaleString("pt-PT"));
          }
          if(payload.handler)parts.push("handler "+String(payload.handler).slice(0,120));
          const resultValue=payload.result;
          if(resultValue!==null&&resultValue!==undefined){
            const resultText=typeof resultValue==="string"?resultValue:JSON.stringify(resultValue);
            parts.push("resultado: "+String(resultText).slice(0,700));
          }
          if(payload.output!==null&&payload.output!==undefined){
            const outputText=typeof payload.output==="string"?payload.output:JSON.stringify(payload.output);
            parts.push("saída: "+String(outputText).slice(0,700));
          }
          if(payload.result_truncated||payload.output_truncated)parts.push("conteúdo longo limitado pela API");
          if(payload.error)parts.push("erro registado: "+String(payload.error).slice(0,300));
          status.textContent=parts.join(" · ");
        }catch(error){
          status.textContent="Estado/resultado não confirmado: "+error.message+". O cockpit não assume sucesso nem falha sem checkpoint válido.";
        }finally{check.disabled=false;}
      });
      tracker.append(status,check);bubble.append(tracker);
    }
    row.append(bubble);container.append(row);
  }
  function render(){
    const t=active();
    ui.title.textContent=t&&t.title||"Nova conversa";
    ui.welcome.classList.toggle("hidden",!!(t&&t.messages&&t.messages.length));
    ui.messages.replaceChildren();
    (t&&t.messages||[]).forEach(m=>addMessage(ui.messages,m));
    if(t&&t.local){ui.context.textContent="Rascunho local · ainda não sincronizado";}
    ui.chat.scrollTop=ui.chat.scrollHeight;
    const combined=[...state.threads,...state.localDrafts].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
    ui.list.replaceChildren();
    combined.forEach(thread=>{
      const button=document.createElement("button");button.className="thread"+(thread.id===state.activeId?" active":"");button.dataset.id=thread.id;
      const title=document.createElement("span");title.className="thread-title";title.textContent=thread.title||"Nova conversa";
      const meta=document.createElement("span");meta.className="thread-meta";meta.textContent=new Date(thread.updated_at||thread.created_at||Date.now()).toLocaleString("pt-PT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
      button.append(title,meta);ui.list.append(button);
    });
    ui.send.disabled=state.sending;
    renderAttachments();
  }
  async function selectThread(id){
    state.activeId=id;
    const local=state.localDrafts.find(t=>t.id===id);
    if(!local && state.token){
      try{const thread=await readJson(await api("/mobile/threads/"+encodeURIComponent(id)));const i=state.threads.findIndex(t=>t.id===id);if(i>=0)state.threads[i]=thread;else state.threads.unshift(thread);}
      catch(error){setStatus(false,error.message);}
    }
    render();ui.sidebar.classList.remove("open");
  }
  async function createServerThread(title){
    return readJson(await api("/mobile/threads",{method:"POST",body:JSON.stringify({title:title||"Nova conversa"})}));
  }
  async function sendMessage(){
    if(state.sending)return;
    const text=ui.input.value.trim();
    if(!text && !state.attachments.length)return;
    if(!state.token){openPairDialog();return;}
    state.sending=true;ui.send.disabled=true;
    let thread=active();
    if(!thread){newDraft();thread=active();}
    const attachments=state.attachments.slice();
    let content=text;
    if(attachments.length){
      const blocks=attachments.map(a=>"\n\n--- DOCUMENTO ANEXADO: "+a.name+" ---\n"+a.content+"\n--- FIM DO DOCUMENTO ---");
      content=(content?content+"\n\n":"")+"Contexto documental enviado pelo utilizador:"+blocks.join("");
    }
    ui.input.value="";state.attachments=[];renderAttachments();
    const pending={id:"pending-"+Date.now(),role:"user",content,created_at:new Date().toISOString(),pending:true};
    thread.messages=thread.messages||[];thread.messages.push(pending);thread.updated_at=pending.created_at;render();
    try{
      thread=await ensureServerThread(thread);
      const data=await readJson(await api("/mobile/threads/"+encodeURIComponent(thread.id)+"/messages",{method:"POST",body:JSON.stringify({content})}));
      const updated=data.thread;
      if(updated){const i=state.threads.findIndex(t=>t.id===updated.id);if(i>=0)state.threads[i]=updated;else state.threads.unshift(updated);}
      state.activeId=thread.id;
      render();
    }catch(error){
      const current=active();
      if(current){current.messages=current.messages.filter(m=>m.id!==pending.id);current.messages.push({role:"assistant",content:"A mensagem não foi confirmada pelo backend: "+error.message+"\n\nO texto não foi declarado como executado. Verifica a ligação e tenta novamente.",created_at:new Date().toISOString(),error:true});}
      setStatus(false,"Falha no envio · mensagem não confirmada");render();
    }finally{state.sending=false;render();ui.input.focus();}
  }
  function renderAttachments(){
    ui.attachmentList.replaceChildren();
    state.attachments.forEach((file,index)=>{
      const chip=document.createElement("div");chip.className="attachment";
      const label=document.createElement("span");label.textContent=file.name+" · "+Math.ceil(file.size/1024)+" KB";
      const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.setAttribute("aria-label","Remover "+file.name);remove.onclick=()=>{state.attachments.splice(index,1);renderAttachments();};
      chip.append(label,remove);ui.attachmentList.append(chip);
    });
  }
  async function pickDocuments(files){
    const incoming=Array.from(files||[]);
    if(state.attachments.length+incoming.length>MAX_FILES){alert("Máximo de "+MAX_FILES+" ficheiros por mensagem.");return;}
    let total=state.attachments.reduce((sum,a)=>sum+a.size,0);
    for(const file of incoming){
      const ext=(file.name.split(".").pop()||"").toLowerCase();
      if(!ALLOWED_EXT.has(ext)){alert("Formato não suportado: "+file.name+". Usa ficheiros de texto, Markdown, código, CSV ou JSON.");continue;}
      if(file.size>MAX_FILE_BYTES){alert(file.name+" excede o limite de 2 MB por ficheiro.");continue;}
      if(total+file.size>MAX_TOTAL_BYTES){alert("O total de anexos por mensagem não pode exceder 5 MB.");break;}
      try{const content=await file.text();state.attachments.push({name:file.name,size:file.size,content});total+=file.size;}
      catch(_){alert("Não foi possível ler "+file.name);}
    }
    ui.picker.value="";renderAttachments();
  }
  async function renameActive(){
    const thread=active();if(!thread)return;
    ui.renameInput.value=thread.title||"Nova conversa";$("renameDialog").showModal();
  }
  $("saveRename").addEventListener("click",async function(event){
    event.preventDefault();const title=ui.renameInput.value.trim(),thread=active();if(!title||!thread)return;
    if(thread.local){thread.title=title;thread.updated_at=new Date().toISOString();saveDrafts();}
    else{
      try{const data=await readJson(await api("/mobile/threads/"+encodeURIComponent(thread.id)+"/rename",{method:"POST",body:JSON.stringify({title})}));const i=state.threads.findIndex(t=>t.id===thread.id);if(i>=0)state.threads[i]=data;}
      catch(error){setStatus(false,"Não foi possível renomear: "+error.message);return;}
    }
    $("renameDialog").close();render();
  });
  $("chatViewButton").addEventListener("click",()=>setView("chat"));
  $("officeViewButton").addEventListener("click",()=>setView("office"));
  $("officeFloorDirectory").addEventListener("click",function(event){
    const button=event.target.closest("[data-floor-target]");if(!button)return;
    const target=button.dataset.floorTarget;
    const room=document.querySelector('[data-office-room="'+target+'"]');
    if(!room)return;
    room.scrollIntoView({behavior:"auto",block:"center"});
    room.setAttribute("tabindex","-1");
    room.focus({preventScroll:true});
  });
  $("newChat").addEventListener("click",newDraft);
  $("motorRefresh").addEventListener("click",()=>probeMotors(true));
  $("runCommandButton").addEventListener("click",runSelectedCommand);
  $("commandSelect").addEventListener("change",syncCommandTargetField);
  $("refreshButton").addEventListener("click",refresh);
  $("pairButton").addEventListener("click",openPairDialog);
  $("chooseToken").addEventListener("click",function(event){event.preventDefault();ui.pairDialog.close();ui.bootstrapPicker.click();});
  ui.bootstrapPicker.addEventListener("change",async function(){const file=ui.bootstrapPicker.files&&ui.bootstrapPicker.files[0];await pairWithBootstrapFile(file);ui.bootstrapPicker.value="";});
  $("renameButton").addEventListener("click",renameActive);
  ui.list.addEventListener("click",event=>{const button=event.target.closest("[data-id]");if(button)selectThread(button.dataset.id);});
  $("attachButton").addEventListener("click",()=>ui.picker.click());
  ui.picker.addEventListener("change",()=>pickDocuments(ui.picker.files));
  $("sendButton").addEventListener("click",sendMessage);
  ui.input.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();sendMessage();}});
  ui.input.addEventListener("input",()=>{ui.input.style.height="auto";ui.input.style.height=Math.min(ui.input.scrollHeight,180)+"px";});
  document.querySelectorAll("[data-prompt]").forEach(button=>button.addEventListener("click",()=>{ui.input.value=button.dataset.prompt;ui.input.focus();}));
  window.addEventListener("storage",event=>{if(event.key===SESSION_KEY){state.token=sessionStorage.getItem(SESSION_KEY)||"";}});
  renderMotors();
  renderOffice();
  if(!["127.0.0.1","localhost"].includes(location.hostname)){
    setStatus(false,"Por segurança, abre no PC local: 127.0.0.1:8181/app/");
  }else if(state.token){refresh();probeMotors();}else{setStatus(false,"Não ligado · sessão local necessária");openPairDialog();probeMotors();}
  window.addEventListener("focus",probeMotors);
  window.setInterval(()=>{probeMotors();if(!$("officeView").classList.contains("hidden"))probeOfficeTelemetry();},30000);
})();
