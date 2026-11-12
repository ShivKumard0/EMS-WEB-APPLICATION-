/* ══ LOGS ONLY IN THE LOGS TAB (product owner, 10 Nov 2026) ═════════════════════════════════════════════════
   A tab shows its own content; its change log is in the Logs tab, not listed at the bottom of the tab.
   - Company Settings: the changes to Card Programmes, the card provider, Card Enrollment fields, Exchange Rates,
     Module Control, Advance Settings and Budget Settings are listed in Activity & Audit → Logs, each with its area.
   - An employee: the card enrollment (KYC) log is in the employee's Logs tab, with the employee's other logs.
   Nothing is deleted: every log is kept where it was recorded and only shown in one place. */
function emsLogTime(l){const t=Date.parse(String(l.date||'')+' '+String(l.time||''));return isNaN(t)?0:t;}
function emsLogSort(list){
  return list.map(function(l,i){return {l:l,i:i,t:emsLogTime(l)};})
    .sort(function(a,b){return b.t-a.t||a.i-b.i;}).map(function(x){return x.l;});
}
/* The company's settings changes, each named by its area. */
function csSettingsLogs(){
  const ent=idEntity(),out=[];
  const add=function(area,list,status){(list||[]).forEach(function(l){out.push(Object.assign({},l,{status:status||l.status||'Updated',action:area+' · '+(l.action||'')}));});};
  try{
    if(typeof ccCfg==='function')add('Card Programmes',ccCfg(ent).logs);
    if(typeof oncProgLogs==='function')add('Card Provider',oncProgLogs(ent));
    if(typeof oncCfgLogs!=='undefined'){
      add('Card Enrollment',oncCfgLogs.filter(function(l){return l.status==='Config'&&l.entity===ent;}),'Updated');
      if(typeof emsCan==='function'&&emsCan('onc.registry.manage'))add('Card Provider Fields',oncCfgLogs.filter(function(l){return l.status==='Registry';}),'Updated');
    }
    if(typeof epRateLogs!=='undefined')add('Exchange Rates',epRateLogs);
    if(typeof mcLogsOf==='function')add('Module Control',mcLogsOf(ent));
    if(typeof advCfgBook!=='undefined'&&advCfgBook[ent])add('Advance Settings',advCfgBook[ent].logs);
    if(typeof bgCfgBook!=='undefined'&&bgCfgBook[ent])add('Budget Settings',bgCfgBook[ent].logs);
  }catch(e){}
  return out;
}
/* Company Settings → Logs: the entity's own logs and its settings changes, newest first. */
function csLogsAll(){
  const ent=idEntity(),e=typeof idEntityRec==='function'?idEntityRec(ent):null,client=!!(e&&e.emsOnly);
  /* A status log belongs to its company; the platform's sample entries (no company) are not shown in a client company. */
  const own=(typeof csLogsData!=='undefined'?csLogsData:[]).filter(function(l){return l.entity?l.entity===ent:!client;});
  return emsLogSort(own.concat(csSettingsLogs()));
}
/* A status log saved here is the company's, by the person signed in. */
(function(){
  if(typeof csSaveLog!=='function'||typeof csLogsData==='undefined')return;
  const s0=csSaveLog;
  csSaveLog=function(){
    const n=csLogsData.length,out=s0.apply(this,arguments);
    if(csLogsData.length>n){const l=csLogsData[0];l.entity=idEntity();if(typeof idMe==='function'&&idMe()&&typeof caN==='function'){l.user=caN(idMe());l.userId=idMe();}}
    return out;
  };
})();

/* The employee's Logs tab: the employee's logs and the card enrollment log, newest first. */
(function(){
  if(typeof empTimelineHTML!=='function')return;
  const t0=empTimelineHTML;
  empTimelineHTML=function(emp){
    const r=emp&&emp.eid&&typeof oncData!=='undefined'?oncData[emp.eid]:null,extra=r&&r.logs&&r.logs.length?r.logs:null;
    if(!extra||typeof empLogs!=='function')return t0.apply(this,arguments);
    const rows=empLogs(emp).map(function(l){return {status:empLifeHtml(l.status),user:empLifeHtml(l.user),role:l.system?'System':'',date:l.date,time:l.time,action:empLifeHtml(l.action),src:l};})
      .concat(extra.map(function(l){return {status:empLifeHtml(l.status),user:empLifeHtml(l.user),role:'',date:l.date,time:l.time,action:empLifeHtml('Card enrollment · '+l.action),src:null};}));
    return lplTableHTML(emsLogSort(rows),{rowExtra:function(x){return x.src&&typeof empLogExtraHTML==='function'?empLogExtraHTML(x.src):'';}});
  };
})();
