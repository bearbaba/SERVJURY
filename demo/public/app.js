const $ = id => document.getElementById(id);
const buttons = [...document.querySelectorAll('[data-scenario]')];
let fixtures = {}, selected = 'rework', activeCase = null, mode = 'DEMO', pending = false;
const $choice = key => buttons.find(button => button.dataset.scenario === key);
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 4400); }
function text(id, value) { $(id).textContent = String(value ?? '—'); }
function stage(i, value, label) { $('stage'+i).classList.toggle('active', value); text('done'+i, value ? '✓' : '—'); if (label) text(['','fileState','judgeState','syncState'][i],label); }
function resetStages() {
  activeCase=null; pending=false; stage(1,false,'Waiting for a dispute');stage(2,false,'Waiting for filing');stage(3,false,'Waiting for verdict');
  $('fileBtn').disabled=false; $('judgeBtn').disabled=true; text('caseId','—');text('source','—');text('txHash','—');
  $('resultWrap').replaceChildren();
  const div=document.createElement('div');div.className='result-placeholder';div.innerHTML='<div class="empty-icon">◌</div><span>NO VERDICT YET</span><p>File the dispute, then request an independent decision.</p>';
  $('resultWrap').append(div);
}
function setScenario(scenario) {
  if (!fixtures[scenario] || pending) return;
  selected=scenario;buttons.forEach(b=>b.classList.toggle('selected',b.dataset.scenario===scenario));
  const f=fixtures[scenario];text('taskId',f.taskId);
  for (const key of ['terms','delivery','evidence']) $(key).value=f[key];
  resetStages();
}
async function api(url,options) {
  const resp=await fetch(url,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});
  const data=await resp.json();if (!resp.ok) {const e=new Error(data.error || 'Request failed');e.txHash=data.txHash;throw e;}return data;
}
function currentInput() {return { scenario:selected, taskId:fixtures[selected].taskId,...Object.fromEntries(['terms','delivery','evidence'].map(key=>[key,$(key).value])) };}
function showVerdict(c) {
  const kind=c.verdict==='ACCEPT'?'accept':c.verdict==='REWORK'?'rework':'unknown';
  const sym={accept:'✓',rework:'×',unknown:'?'}[kind];
  const action={accept:'DELIVERY ACCEPTED · TASK CAN CLOSE',rework:'REWORK REQUESTED · PROVIDE MISSING PROOF',unknown:'HUMAN REVIEW · MORE EVIDENCE REQUIRED'}[kind];
  const panel=document.createElement('div');panel.className=`verdict-main ${kind}`;
  const circle=document.createElement('div');circle.className='verdict-icon';circle.textContent=sym;
  const label=document.createElement('div');label.className='verdict-label';label.textContent='CASE DECISION';
  const heading=document.createElement('h3');heading.textContent=c.verdict;
  const p=document.createElement('p');p.textContent=c.reason;
  const next=document.createElement('div');next.className='action';next.textContent=action;
  panel.append(circle,label,heading,p,next);$('resultWrap').replaceChildren(panel);
}
function showError(error) { toast(`${error.message}${error.txHash ? ` · TX: ${error.txHash}` : ''}`); }
buttons.forEach(button=>button.addEventListener('click',()=>setScenario(button.dataset.scenario)));
$('fileBtn').addEventListener('click',async()=>{
  if(pending)return;pending=true;$('fileBtn').disabled=true;
  text('fileState',mode==='LIVE'?'Signing and finalizing on GenLayer…':'Recording scenario fixture…');
  try {
    const data=await api('/api/cases',{method:'POST',body:JSON.stringify(currentInput())});
    activeCase=data;stage(1,true,mode==='LIVE'?'Confirmed GenLayer filing':'Local fixture recorded');
    text('caseId',data.id);text('source',data.auditMode==='GENLAYER'?'ON-CHAIN':'OFFLINE FIXTURE');text('txHash',data.txHash||'NOT APPLICABLE');
    $('judgeBtn').disabled=false;toast('Filed. Request the independent judgment.');
  }catch(error){text('fileState','Filing failed · check input');$('fileBtn').disabled=false;showError(error)}
  pending=false;
});
$('judgeBtn').addEventListener('click',async()=>{
  if(!activeCase||pending)return;pending=true;$('judgeBtn').disabled=true;$('fileBtn').disabled=true;
  text('judgeState',mode==='LIVE'?'Waiting for AI-validator consensus and finalization…':'Applying declared offline fixture…');
  try {
    const data=await api(`/api/cases/${activeCase.id}/judge`,{method:'POST'});activeCase=data;
    stage(2,true,mode==='LIVE'?'On-chain verdict finalized':'Offline fixture evaluated');
    stage(3,true,mode==='LIVE'?'Verdict available for OpenServ task relay':'Preview only · OpenServ sync not performed');
    text('txHash',data.txHash||'NOT APPLICABLE');showVerdict(data);
  }catch(error){text('judgeState','Judgment interrupted · inspect original TX');$('judgeBtn').disabled=false;showError(error)}
  pending=false;
});
$('resetBtn').addEventListener('click',()=>{if(!pending)setScenario(selected)});
async function boot(){
  try{
    const [status,received]=await Promise.all([api('/api/status'),api('/api/scenarios')]);
    fixtures=received;mode=status.mode;text('modeTag',mode==='LIVE'?`LIVE · ${status.chain.toUpperCase()} (SIGNED TRANSACTIONS)`:'LOCAL FIXTURE · NO TRANSACTIONS');
    text('modeNote',mode==='LIVE'?'LIVE MODE / Contract writes require a funded signer. Await finalization and inspect each transaction. No escrow or automatic payment.':'SIMULATION / Fixture outcomes are pre-defined, not AI consensus. No funds or tokens move.');
    setScenario(selected);
  }catch(e){showError(e);$('fileBtn').disabled=true}
}
boot();
