/* ══ PHONE ↔ WEB SYNC: THE WEB SIDE (product owner, 14 Nov 2026) ══════════════════════════════════════════════════
   The mobile app (separate repo) and this web app share one Supabase project (js/ems-sync-config.js). Nothing here
   runs until that file holds a Project URL and a Publishable key, and only in the presentation (Nova Retail).

   The web app stays the one engine. The phone never changes a record itself:
   1. The phone sends a command - submit a claim or an advance, approve / reject / send back, withdraw, respond to a
      Follow-Up, record an advance return. This page files it through the web's own functions, as the person who
      did it on the phone (the same checks, route, approvers, numbers and logs as on the web), then writes the result
      back: the web number, or the reason it was not accepted.
   2. This page publishes what the phone shows: Nova Retail's claims and advances (with the web's status words and
      Pending At), the people, the Sub Category / Expense Type / Advance Type lists, and the wallet balances.

   Safe by design:
   - One tab of this browser does the work at a time; the others stay quiet.
   - A command is taken by one page only (status new → working), and a command that was already applied is never
     applied twice.
   - Nothing is filed while a form or a popup is open on this page: it waits until the form is closed.
   - What the page shows, who is signed in and the entity on screen are put back exactly after each command.
   - No connection: the web app works as before, and the sync tries again a little later. */
(function(){
  const CFG=window.EMS_SYNC_CONFIG||{};
  if(!CFG.url||!CFG.key)return;
  if(!/[?&]env=presentation/.test(location.search))return;
  const BASE=String(CFG.url).replace(/\/+$/,'');
  const LS={copy:'ems-sync-web-copy',pub:'ems-sync-web-pub',done:'ems-sync-web-done',lead:'ems-sync-web-lead'};
  const TAB=Math.random().toString(36).slice(2);
  const PHONE=['kabir.joshi','arjun.rao','ritu.sen','rohan.mehta','ananya.iyer','neel.arora'].map(function(n){return n+'@opendhi.in';});
  const TICK=4000;
  const ls=function(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}};
  const lsSet=function(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
  let COPY=ls(LS.copy,'');if(!COPY){COPY='w-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);lsSet(LS.copy,COPY);}

  /* ── Supabase REST (publishable key in the apikey header only) ── */
  const enc=encodeURIComponent;
  function rest(method,path,body,prefer){
    const h={apikey:CFG.key,'Content-Type':'application/json'};if(prefer)h.Prefer=prefer;
    return fetch(BASE+'/rest/v1/'+path,{method:method,headers:h,body:body!=null?JSON.stringify(body):undefined,cache:'no-store'})
      .then(function(r){return r.text().then(function(t){
        if(!r.ok)throw new Error(r.status+' '+String(t||'').slice(0,200));
        return t?JSON.parse(t):null;});});
  }

  /* ── One tab at a time ── */
  function lead(){
    const x=ls(LS.lead,null),now=Date.now();
    if(!x||x.tab===TAB||now-x.at>12000){lsSet(LS.lead,{tab:TAB,at:now});return true;}
    return false;
  }
  window.addEventListener('beforeunload',function(){const x=ls(LS.lead,null);if(x&&x.tab===TAB)try{localStorage.removeItem(LS.lead);}catch(e){}});

  /* ── Nova Retail, people ── */
  const nova=function(){return (typeof presNova==='function'?presNova():null)||(typeof entitiesData!=='undefined'?entitiesData:[]).find(function(e){return /Nova Retail/i.test(e.name);})||null;};
  const phoneUids=function(){return PHONE.map(function(m){const u=idUserByEmail(m);return u?u.userId:'';}).filter(Boolean);};
  /* Read in Nova Retail without changing who is signed in. */
  function inNova(fn){
    const n=nova();if(!n)return null;
    const was=seSelectedEntity;
    if(was===n.id)return fn();
    seSelectedEntity=n.id;if(typeof emsClearCache==='function')emsClearCache();
    try{return fn();}finally{seSelectedEntity=was;if(typeof emsClearCache==='function')emsClearCache();}
  }
  /* Act as the person who did it on the phone, in Nova Retail; everything is put back afterwards. */
  function asUser(uid,fn){
    const n=nova();
    const s={s:idSessionUser,a:idAuthUser,role:currentRole,ent:seSelectedEntity,draft:expDraft,modal:expModalOpen,adv:advForm,ctx:Object.assign({},expLineCtx)};
    seSelectedEntity=n.id;idSessionUser=uid;idAuthUser=uid;currentRole='';emsSyncIdentity();
    try{return fn();}
    finally{
      idSessionUser=s.s;idAuthUser=s.a;seSelectedEntity=s.ent;currentRole=s.role;emsSyncIdentity();
      expDraft=s.draft;expModalOpen=s.modal;advForm=s.adv;expLineCtx=s.ctx;
    }
  }
  /* Is someone in the middle of something on this page? Then commands wait. */
  function busy(){
    if(typeof presBuilding!=='undefined'&&presBuilding)return true;
    if(expModalOpen||advForm)return true;
    if(typeof expEditing==='function'&&expEditing())return true;
    const c=document.getElementById('ems-subconf-root');if(c&&c.innerHTML)return true;
    if(document.querySelector('#eaap-root .ct-modal'))return true;
    if(document.querySelector('[id^="exp-l-"],[id^="exp-e-"],[id^="advf-"],[id^="csw-exp-"],[id^="csw-advf-"]'))return true;
    return false;
  }

  /* ── Commands from the phone ── */
  const recOf=function(wid){const m=/^(exp|adv):(\d+)$/.exec(String(wid||''));if(!m)return null;return m[1]==='exp'?expRec(Number(m[2])):advRec(Number(m[2]));};
  const widOf=function(r){return (advancesData.indexOf(r)>=0?'adv:':'exp:')+r.id;};
  const ok=function(r,extra){return Object.assign({ok:true,wid:widOf(r),ref:expKey(r),status:r.status},extra||{});};
  let toasts=[];
  const lastToast=function(){const t=toasts[toasts.length-1];return t?[t[0],t[2]].filter(Boolean).join(': '):'';};
  function webLine(l){
    const cols={};
    if(EXP_CUSTOM_COLS.indexOf('Vendor GSTIN')>=0)cols['Vendor GSTIN']=String(l.gstin||'').trim();
    if(EXP_CUSTOM_COLS.indexOf('GST Amount')>=0)cols['GST Amount']=l.gst!=null&&l.gst!==''?String(l.gst):'';
    const paid=l.paidBy||'Employee';
    return {title:String(l.title||'').trim(),amount:String(l.amount),category:l.category||'',subCat:l.subCat||'',start:l.start||'',end:l.end||l.start||'',
      proof:l.proof||'',proofUrl:l.proofUrl||'',comments:String(l.comments||'').trim(),cols:cols,paidBy:paid,merchant:String(l.merchant||'').trim(),invoice:String(l.invoice||'').trim(),
      advanceId:paid==='Company Advance'?(l.advanceId||''):'',advAmount:paid==='Company Advance'?String(l.advAmount||l.amount):'',
      cardId:paid==='Corporate Card'?(l.cardId||''):'',cardAmount:paid==='Corporate Card'?String(l.amount):''};
  }
  /* A draft that lives here, continued on the phone: its items are replaced with the phone's (each checked as in the
     form, kept exactly as the form keeps them) and, unless saved as a draft again, it is submitted the way a draft is
     submitted here (js/expense-approvals-ui.js caLogMove). Same record, same number. */
  function updateDraft(p){
    const r=recOf(p.draftWid);
    if(!r||expensesData.indexOf(r)<0)return {ok:false,error:'This draft is no longer on the web.'};
    if(r.status!=='Draft')return {ok:false,error:expKey(r)+' was already submitted on the web.'};
    const lines=(p.lines||[]).map(webLine);
    if(!lines.length)return {ok:false,error:'Add at least one item.'};
    expLineCtx={eid:r.employeeEid,currency:r.currency||'INR',category:lines[0].category,claimId:r.id,lineId:null};
    for(let i=0;i<lines.length;i++){
      toasts=[];expLineCtx.category=lines[i].category;
      if(!expCheckLine(lines[i],lines[i].category))return {ok:false,error:'Item '+(i+1)+' - '+(lastToast()||'not accepted')};
    }
    const t=lines.map(function(l){return l.title;}).filter(Boolean);
    if(!String(r.title||'').trim())r.title=t.length?t[0]+(t.length>1?' + '+(t.length-1)+' more':''):lines[0].category;   // a draft keeps its own title
    r.category=lines[0].category;
    r.lines=lines.map(function(l,i){return Object.assign({id:i+1,title:l.title,amount:parseFloat(l.amount),category:l.category,subCat:l.subCat,start:l.start,end:l.end||l.start,
      proof:l.proof,proofUrl:l.proofUrl,comments:l.comments,cols:Object.assign({},l.cols),status:'Pending',approved:null,
      paidBy:l.paidBy||'',merchant:l.merchant||'',invoice:l.invoice||'',advanceId:l.paidBy==='Company Advance'?l.advanceId||'':'',
      advAmount:l.paidBy==='Company Advance'?Math.round((parseFloat(l.advAmount)||0)*100)/100:null,
      advFx:l.paidBy==='Company Advance'&&typeof advLineFx==='function'?advLineFx(l,{eid:r.employeeEid,currency:r.currency}):null},
      typeof ccExpLineCardFields==='function'?ccExpLineCardFields(l):{});});
    if(p.just&&typeof epEvaluate==='function'){
      const just={};
      try{(epEvaluate({eid:r.employeeEid,name:r.name,category:r.category,currency:r.currency,lines:r.lines,claimId:r.id}).results||[])
        .forEach(function(x){if(x.justify)just[x.key]=String(p.just);});}catch(e){}
      r.policyJust=just;
    }
    caLog(r,'Draft','Items updated on the mobile app: '+r.lines.length+' line item'+(r.lines.length===1?'':'s')+'.');
    if(p.asDraft)return ok(r);
    toasts=[];
    window.emsNoConfirm=true;
    try{caLogMove(r.id,'Awaiting Approval','');}finally{window.emsNoConfirm=false;}
    if(r.status!=='Awaiting Approval')return {ok:false,error:lastToast()||'The web app did not submit the draft.'};
    return ok(r);
  }
  function submitClaim(cid,p){
    if(p.draftWid)return updateDraft(p);
    const ex=expensesData.find(function(r){return r.syncCid===cid;});if(ex)return ok(ex);
    const lines=(p.lines||[]).map(webLine);
    if(!lines.length)return {ok:false,error:'Add at least one item.'};
    const eid=p.eid;
    expLineCtx={eid:eid,currency:'INR',category:lines[0].category,claimId:null,lineId:null};
    /* Every item gets the same item checks as in the form (the last one is checked by the submit itself). */
    for(let i=0;i<lines.length-1;i++){
      toasts=[];expLineCtx.category=lines[i].category;
      if(!expCheckLine(lines[i],lines[i].category))return {ok:false,error:'Item '+(i+1)+' - '+(lastToast()||'not accepted')};
    }
    let just={};
    if(p.just&&typeof epEvaluate==='function'){
      try{(epEvaluate({eid:eid,name:idEmpName(eid),category:lines[0].category,currency:'INR',lines:lines,claimId:null}).results||[])
        .forEach(function(x){if(x.justify)just[x.key]=String(p.just);});}catch(e){}
    }
    const t=lines.map(function(l){return l.title;}).filter(Boolean);
    expDraft={title:t.length?t[0]+(t.length>1?' + '+(t.length-1)+' more':''):lines[0].category,claimFor:p.claimFor==='Others'?'Others':'Self',eid:eid,name:idEmpName(eid),
      category:lines[0].category,currency:'INR',appType:'Reimbursement',travelMode:'None',notes:'',just:just,dupJust:'',costCentreId:'',projectId:'',bgJust:'',
      lines:lines.slice(0,-1),line:lines[lines.length-1]};
    expModalOpen=false;
    toasts=[];
    const n0=expensesData.length;
    window.emsNoConfirm=true;
    try{submitAddExpense(true);}finally{window.emsNoConfirm=false;}
    if(expensesData.length===n0)return {ok:false,error:lastToast()||'The web app did not accept the claim.'};
    const r=expensesData[0];
    r.syncCid=cid;r.origin='mobile';
    return ok(r);
  }
  function submitAdvance(cid,p){
    const ex=advancesData.find(function(r){return r.syncCid===cid;});if(ex)return ok(ex);
    const t=advTypesHere(true).find(function(x){return x.name===p.type;});
    if(!t)return {ok:false,error:'Advance Type "'+p.type+'" is not set up on the web.'};
    const res=advCreate({eid:p.eid,claimFor:p.claimFor==='Others'?'Others':'Self',typeId:t.id,title:String(p.title||'').trim(),purpose:String(p.purpose||'').trim(),
      amount:String(p.amount),currency:'INR',requiredBy:p.requiredBy||'',periodFrom:p.periodFrom||'',periodTo:p.periodTo||'',costCenter:'',project:'',
      notes:String(p.notes||'').trim(),proof:p.proof||'',just:String(p.just||''),plannedCategory:'',costCentreId:'',projectId:'',bgJust:''},true);
    if(!res||res.error)return {ok:false,error:(res&&res.error)||'The web app did not accept the advance.'};
    res.rec.syncCid=cid;res.rec.origin='mobile';if(p.proofUrl)res.rec.proofUrl=p.proofUrl;
    return ok(res.rec);
  }
  function decide(p){
    const r=recOf(p.wid);if(!r)return {ok:false,error:'This request is no longer on the web.'};
    const me=caMe();
    if(!caCanDecide(r,me))return {ok:false,error:(typeof caWhyNotDecide==='function'&&caWhyNotDecide(r))||'This request is no longer waiting for you.'};
    const st=caActiveStage(r),comment=String(p.comment||'').trim(),dec=p.decision;
    if(['Approve','Reject','Follow-Up'].indexOf(dec)<0)return {ok:false,error:'Pick a decision.'};
    const open=st.lineIds.filter(function(lid){const l=r.lines.find(function(x){return x.id===lid;});return l&&!caStageResult(st,l)&&!caStageDecided(st,me,lid);});
    const want=(p.lineIds&&p.lineIds.length?p.lineIds.map(Number):open).filter(function(id){return open.indexOf(id)>=0;});
    if(!want.length)return {ok:false,error:'Nothing is left for you to decide on this request.'};
    let err;
    /* The same calls the web's Approve popup makes (js/ea-approve-lines.js): every open item = the request's own
       decision; some items = a decision on those items only. Send back is always the whole request. */
    if(dec==='Follow-Up'||want.length===open.length)
      err=dec==='Approve'?caDecide(r.id,{scope:'claim',decision:'Approve',comment:comment,why:comment}):caDecide(r.id,{scope:'claim',decision:dec,reason:comment,why:comment});
    else{
      const lsx={};want.forEach(function(id){lsx[id]={decision:dec,reason:dec==='Reject'?comment:''};});
      err=caDecide(r.id,{scope:'lines',lines:lsx,comment:dec==='Approve'?comment:'',why:comment});
    }
    return err?{ok:false,error:err}:ok(r);
  }
  function withdraw(p){
    const r=recOf(p.wid);if(!r)return {ok:false,error:'This request is no longer on the web.'};
    const err=caWithdraw(r.id,String(p.reason||'').trim()||('Withdrawn by '+idMeName()+' from the mobile app.'));
    return err?{ok:false,error:err}:ok(r);
  }
  function respond(p){
    const r=recOf(p.wid);if(!r)return {ok:false,error:'This request is no longer on the web.'};
    const err=caResubmit(r.id,String(p.comment||'').trim());
    return err?{ok:false,error:err}:ok(r);
  }
  function advReturn(p){
    const r=recOf(p.wid);if(!r||advancesData.indexOf(r)<0)return {ok:false,error:'This advance is no longer on the web.'};
    const methods=typeof advMethods==='function'?advMethods():[];
    const err=advRrCreate(r.id,{type:'Return',amount:String(p.amount),method:methods.indexOf(ADV_BASE_METHOD)>=0?ADV_BASE_METHOD:(methods[0]||ADV_BASE_METHOD),
      date:p.date||wbToday(),ref:String(p.ref||'').trim(),extRef:'',evidence:'',remarks:'Recorded on the mobile app'+(p.method?' ('+p.method+')':'')+'.'});
    return err?{ok:false,error:err}:ok(r);
  }
  const DO={'claim.submit':function(c){return submitClaim(c.id,c.payload||{});},'advance.submit':function(c){return submitAdvance(c.id,c.payload||{});},
    'approval.decide':function(c){return decide(c.payload||{});},'request.withdraw':function(c){return withdraw(c.payload||{});},
    'request.respond':function(c){return respond(c.payload||{});},'advance.return':function(c){return advReturn(c.payload||{});}};
  const SAY={'claim.submit':'submitted','advance.submit':'requested','approval.decide':'',
    'request.withdraw':'withdrew','request.respond':'answered the Follow-Up on','advance.return':'recorded a return on'};
  function apply(c){
    const by=c.by_uid||'';
    if(!DO[c.type])return {ok:false,error:'The web app does not know this action.'};
    if(!by||!idUser(by))return {ok:false,error:'The person on the phone is not known on the web.'};
    const r0=renderADTPage,t0=showToast;
    renderADTPage=function(){};showToast=function(a,b,c2){toasts.push([a,b,c2]);};
    let res;
    try{res=asUser(by,function(){return DO[c.type](c);});}
    catch(e){res={ok:false,error:'Could not be recorded on the web ('+(e&&e.message||e)+').'};}
    finally{renderADTPage=r0;showToast=t0;}
    return res;
  }
  let working=false;
  async function commands(){
    const stale=new Date(Date.now()-120000).toISOString();
    /* new ones, and any a closed page took but never finished */
    const list=(await rest('GET','ems_commands?select=*&status=eq.new&order=created_at.asc&limit=20')||[])
      .concat(await rest('GET','ems_commands?select=*&status=eq.working&updated_at=lt.'+enc(stale)+'&order=created_at.asc&limit=20')||[]);
    let changed=false;
    for(const c of (list||[])){
      if(busy())break;
      const got=await rest('PATCH','ems_commands?id=eq.'+enc(c.id)+'&status=eq.'+enc(c.status)+(c.status==='working'?'&updated_at=lt.'+enc(stale):''),{status:'working'},'return=representation');
      if(!got||!got.length)continue;
      const done=ls(LS.done,{});
      let res=done[c.id];
      if(!res){
        if(busy()){await rest('PATCH','ems_commands?id=eq.'+enc(c.id),{status:'new'});break;}
        res=apply(c);
        done[c.id]=res;const keys=Object.keys(done);if(keys.length>400)keys.slice(0,keys.length-400).forEach(function(k){delete done[k];});
        lsSet(LS.done,done);
        if(res.ok){changed=true;note(c,res);}
      }
      await rest('PATCH','ems_commands?id=eq.'+enc(c.id),{status:res.ok?'done':'failed',result:res});
    }
    if(changed){
      if(typeof presSaveSoon==='function')presSaveSoon();
      if(typeof idMe==='function'&&idMe())try{renderADTPage();}catch(e){}
    }
    return changed;
  }
  function note(c,res){
    const who=typeof idName==='function'?idName(c.by_uid):'';
    const p=c.payload||{};
    const verb=c.type==='approval.decide'?({Approve:'approved',Reject:'rejected','Follow-Up':'sent back'}[p.decision]||'decided'):(p.draftWid&&p.asDraft?'updated the draft':SAY[c.type]);
    try{showToast('From the mobile app','success',who+' '+verb+' '+res.ref+'.');}catch(e){}
  }

  /* ── What the phone shows ── */
  const strip=function(o){return JSON.parse(JSON.stringify(o==null?null:o));};
  const shareable=function(u){return u&&/^https?:/i.test(String(u))?String(u):'';};
  const attsOut=function(r){return (r.attachments||[]).filter(function(a){return shareable(a.url);})
    .map(function(a){return {name:a.name,url:a.url,type:a.type||'',size:a.size||'',by:a.by||'',date:a.date||''};});};
  function lineOut(r,l){
    return {id:l.id,title:l.title,amount:l.amount,category:l.category||r.category,subCat:l.subCat,start:l.start,end:l.end,proof:l.proof,proofUrl:shareable(l.proofUrl),
      comments:l.comments||'',cols:strip(l.cols||{}),status:typeof expLineShown==='function'?expLineShown(r,l):(l.status||'Pending'),approved:l.approved==null?null:l.approved,
      paidBy:l.paidBy||'',merchant:l.merchant||'',invoice:l.invoice||'',advanceId:l.advanceId||'',cardId:l.cardId||'',reason:l.reason||''};
  }
  function wfOut(r){
    const w=r.wf;if(!w)return null;
    return {wfKey:w.wfKey,wfName:w.wfName,open:!!w.open,current:w.current||0,
      stages:(w.stages||[]).map(function(s){return {n:s.n,name:s.name,type:s.type,approvers:(s.approvers||[]).slice(),status:s.status,lineIds:(s.lineIds||[]).slice(),
        decisions:(s.decisions||[]).map(function(d){return {who:d.who,decision:d.decision,date:d.date,time:d.time,reason:d.reason||'',comment:d.comment||'',lineId:d.lineId==null?null:d.lineId};})};})};
  }
  function deciders(r){
    const st=typeof caActiveStage==='function'?caActiveStage(r):null,out={};if(!st)return out;
    phoneUids().forEach(function(u){
      if(!caCanDecide(r,u))return;
      out[u]=st.lineIds.filter(function(lid){const l=r.lines.find(function(x){return x.id===lid;});return l&&!caStageResult(st,l)&&!caStageDecided(st,u,lid);});
    });
    return out;
  }
  function flowOf(x){
    const f=typeof eaFlowOf==='function'?eaFlowOf(x):{label:x.status,at:'',role:''};
    return {flow:typeof emsThreeStatus==='function'?emsThreeStatus(f.label):x.status,flowLabel:f.label,pendingAt:f.at||'',pendingRole:f.role||''};
  }
  function common(r){
    const fu=r.wf&&r.wf.fu&&r.wf.fu.open?{by:r.wf.fu.by||'',comment:r.wf.fu.reason||'',date:r.wf.fu.date||''}:null;
    return {id:r.id,key:r.key,ref:expKey(r),title:r.title,employeeEid:r.employeeEid,name:r.name,empId:r.empId,email:r.email,claimFor:r.claimFor||'Self',
      category:r.category,currency:r.currency||'INR',status:r.status,appliedOn:r.appliedOn||'',createdBy:r.createdBy||'',finalAt:r.finalAt||'',
      logs:strip(r.logs||[]),wf:wfOut(r),followUp:fu,deciders:deciders(r),syncCid:r.syncCid||'',origin:r.origin||'web',synced:true};
  }
  function expOut(r){
    const x={kind:'exp',r:r,status:r.status,pay:r.pay?r.pay.status:(eaApproved(r.status)?EA_NA:caPayStatus(r)),set:EA_NA,who:r.name};
    return Object.assign(common(r),flowOf(x),{wid:'exp:'+r.id,kind:'expense',appType:r.appType,
      approvedAmt:typeof caApprovedTotal==='function'&&eaApproved(r.status)?caApprovedTotal(r):null,
      lines:r.lines.map(function(l){return lineOut(r,l);}),attachments:attsOut(r),pay:strip(r.pay||null)});
  }
  function advOut(r){
    const b=advBal(r),dead=['Draft','Rejected','Withdrawn','Cancelled'].indexOf(r.status)>=0;
    const x={kind:'adv',r:r,status:r.status,pay:advDisbStatus(r),set:dead&&!b.issued?EA_NA:advSettleShown(r),who:r.name};
    const ledger=[];
    if(b.issued)ledger.push({type:'Issuance',amount:b.issued});
    if(b.accepted)ledger.push({type:'Utilization',amount:b.accepted});
    if(b.returns)ledger.push({type:'Return',amount:b.returns});
    return Object.assign(common(r),flowOf(x),{wid:'adv:'+r.id,kind:'advance',purpose:r.purpose||'',requiredBy:r.requiredBy||'',periodFrom:r.periodFrom||'',
      periodTo:r.periodTo||'',notes:r.notes||'',proof:r.proof||'',proofUrl:shareable(r.proofUrl),amount:caTotal(r),approvedAmt:b.approved||null,
      bal:strip(b),ledger:ledger,lines:(r.lines||[]).map(function(l){return lineOut(r,l);})});
  }
  function rows(){
    return inNova(function(){
      const n=nova(),E=n.entityId,out={};
      const users={},people=[];
      idUsers.forEach(function(u){
        if(typeof idInEntity==='function'&&!idInEntity(u.userId,E))return;
        users[u.userId]=u.name;
        const e=u.eid?idEmp(u.eid):null;
        if(e&&(e.entityId===E||!e.entityId))people.push({eid:e.eid,empId:e.empId,name:e.name,email:e.email,dept:e.dept||'',jobTitle:e.jobTitle||'',joinDate:e.joinDate||'',
          desc:e.desc||'',contact:e.contact||'',status:e.status||'',managerEid:e.managerEid||'',branch:e.branch||'',gender:e.gender||'',dob:e.dob||'',nationality:e.nationality||''});
      });
      out['meta:people']={users:users,people:people};
      const wal=typeof wbWallets!=='undefined'?wbWallets.filter(function(w){return w.entity===E&&w.status==='Active';}).map(function(w){return w.type;}):[];
      const names={};wal.concat(['CORP','MEAL','FUEL','GIFT','TEL','REIMB']).forEach(function(c){names[c]=typeof wbTypeName==='function'?wbTypeName(c):c;});
      out['meta:lists']={cats:EXP_CATEGORIES.slice(),subcats:strip(EXP_SUBCATS),
        advTypes:advTypesHere(true).filter(function(t){return t.model==='One-Time';}).map(function(t){return t.name;}),
        walletNames:names,usesWallets:wal.length>0,today:wbToday()};
      expensesData.filter(function(r){return r.entity===E;}).forEach(function(r){out['exp:'+r.id]=expOut(r);});
      advancesData.filter(function(r){return r.entity===E;}).forEach(function(r){out['adv:'+r.id]=advOut(r);});
      people.forEach(function(p){
        const cards=ccCardsOfEmp(p.eid).filter(function(c){return c.entity===E&&!(typeof ccCardEnded==='function'&&ccCardEnded(c));});
        if(!cards.length)return;
        const w=emsLedgerWallets(p.eid),codes=[];
        cards.forEach(function(c){ccCardWallets(c).forEach(function(k){if(codes.indexOf(k)<0)codes.push(k);});});
        const ws={};codes.forEach(function(k){const x=w[k]||{};ws[k]={name:names[k]||k,loaded:x.loaded||0,spent:x.spent||0,refunded:x.refunded||0,available:x.available||0};});
        out['wallets:'+p.eid]={eid:p.eid,cards:cards.map(function(c){return {id:c.id,wallets:ccCardWallets(c),currency:c.currency||'INR'};}),wallets:ws};
      });
      out['meta:index']={copy:COPY,ids:Object.keys(out).filter(function(k){return /^(exp|adv|wallets):/.test(k);}).sort()};
      return out;
    });
  }
  const hash=function(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(36)+':'+s.length;};
  async function publish(){
    const all=rows();if(!all)return;
    const pub=ls(LS.pub,{copy:COPY,h:{}});
    const send=[];
    Object.keys(all).forEach(function(id){
      const s=JSON.stringify(all[id]),h=hash(s);
      if(pub.h[id]!==h)send.push({id:id,kind:id.split(':')[0],data:all[id],_h:h});
    });
    if(!send.length)return;
    /* the index last, once everything it lists is there */
    send.sort(function(a,b){return (a.id==='meta:index')-(b.id==='meta:index');});
    for(let i=0;i<send.length;i+=25){
      const part=send.slice(i,i+25);
      await rest('POST','ems_records',part.map(function(x){return {id:x.id,kind:x.kind,data:x.data};}),'resolution=merge-duplicates,return=minimal');
      part.forEach(function(x){pub.h[x.id]=x._h;});
      lsSet(LS.pub,pub);
    }
  }
  /* Another browser published last: publish everything again from this one. */
  async function claimCopy(){
    const got=await rest('GET','ems_records?select=data&id=eq.'+enc('meta:index'));
    const cur=got&&got[0]&&got[0].data?got[0].data.copy:'';
    if(cur!==COPY)lsSet(LS.pub,{copy:COPY,h:{}});
  }

  /* ── The loop ── */
  let ready=false,claimed=false,wait=0;
  async function tick(){
    if(!ready||working||!lead())return;
    if(wait&&Date.now()<wait)return;
    working=true;
    try{
      if(!claimed){await claimCopy();claimed=true;}
      await commands();
      await publish();
      wait=0;
    }catch(e){
      wait=Date.now()+15000;
      if(window.console)console.warn('[ems-sync] will try again shortly:',e&&e.message||e);
    }finally{working=false;}
  }
  Promise.resolve(window.PRES_READY).then(function(){
    ready=true;tick();
    setInterval(tick,TICK);
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')tick();});
  });
  window.emsSyncNow=tick;

  /* ── Files attached on the web: into the same file store as the phone's (product owner, 14 Nov 2026: "store and transfer
     attachments from phone to web and vice versa") ──
     In Nova Retail, a file picked on the web is kept as before (its name, and for an item's Expense Proof a link that
     lasts while the page is open) and is also uploaded; once uploaded, the record keeps the shared link, so the file
     opens on the web after a reload and on the phone. Covers an item's Expense Proof, an advance's Supporting Document
     and the files on a claim's Attachments tab. A file that cannot be uploaded (no connection) stays as it was before. */
  const BUCKET='ems-files';
  const novaHere=function(){const n=nova();return !!n&&typeof idEntity==='function'&&idEntity()===n.entityId;};
  async function uploadFile(file,folder){
    const safe=String(file.name||'file').replace(/[^\w.\-]+/g,'_').slice(-80);
    const path=folder+'/'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)+'/'+safe;
    const url=BASE+'/storage/v1/object/'+BUCKET+'/'+path;
    const go=function(bearer){const h={apikey:CFG.key,'Content-Type':file.type||'application/octet-stream'};if(bearer)h.Authorization='Bearer '+CFG.key;return fetch(url,{method:'POST',headers:h,body:file});};
    let r=await go(false);
    if(!r.ok&&[400,401,403].indexOf(r.status)>=0){const r2=await go(true);if(r2.ok)r=r2;}
    if(!r.ok)throw new Error('upload '+r.status);
    return BASE+'/storage/v1/object/public/'+BUCKET+'/'+path;
  }
  const saved=function(){if(typeof presSaveSoon==='function')presSaveSoon();};
  const fileOf=function(input){return input&&input.files&&input.files[0]?input.files[0]:null;};
  /* An item's Expense Proof: the page's temporary link is swapped for the shared one wherever it is by then. */
  if(typeof expPickProof==='function'){
    const p0=expPickProof;
    expPickProof=function(input){
      const f=fileOf(input);
      const out=p0.apply(this,arguments);
      const t=typeof expDraft!=='undefined'&&expDraft?(expModalOpen?expDraft.line:expDraft):null,tmp=t&&t.proofUrl;
      if(f&&novaHere()&&tmp&&/^blob:/.test(tmp)&&f.size<=10*1024*1024){
        uploadFile(f,'web/receipts').then(function(u){
          const swap=function(l){if(l&&l.proofUrl===tmp)l.proofUrl=u;};
          if(typeof expDraft!=='undefined'&&expDraft){swap(expDraft);swap(expDraft.line);(expDraft.lines||[]).forEach(swap);}
          expensesData.forEach(function(r){(r.lines||[]).forEach(swap);});
          saved();
        }).catch(function(e){if(window.console)console.warn('[ems-sync] receipt not uploaded',e&&e.message||e);});
      }
      return out;
    };
  }
  /* An advance's Supporting Document: the form keeps the link, and the advance it is saved on gets it. */
  let advLinks={};   // file name → shared link, for the advance being written
  if(typeof advPickProof==='function'){
    const a0=advPickProof;
    advPickProof=function(input){
      const f=fileOf(input);
      const out=a0.apply(this,arguments);
      if(f&&novaHere()&&typeof advForm!=='undefined'&&advForm&&advForm.proof===f.name&&f.size<=10*1024*1024){
        const key=f.name,editing=advForm.id;
        uploadFile(f,'web/docs').then(function(u){
          advLinks[key]=u;
          if(advForm&&advForm.proof===key)advForm.proofUrl=u;
          const r=editing!=null?advRec(editing):advLinks.__last&&advRec(advLinks.__last);
          if(r&&r.proof===key&&!shareable(r.proofUrl))r.proofUrl=u;
          saved();
        }).catch(function(e){if(window.console)console.warn('[ems-sync] document not uploaded',e&&e.message||e);});
      }
      return out;
    };
  }
  ['advCreate','advUpdate'].forEach(function(n){
    const f0=window[n];if(typeof f0!=='function')return;
    window[n]=function(){
      const res=f0.apply(this,arguments);
      const r=n==='advCreate'?(res&&res.rec):(res?null:advRec(arguments[0]));
      if(r&&r.proof){if(n==='advCreate')advLinks.__last=r.id;const u=advLinks[r.proof];if(u&&!shareable(r.proofUrl))r.proofUrl=u;}
      return res;
    };
  });
  /* The panel: the Supporting Document opens when there is a shared link. */
  if(typeof advBasicHTML==='function'){
    const b0=advBasicHTML;
    advBasicHTML=function(r){
      const out=b0.apply(this,arguments),u=r&&shareable(r.proofUrl);
      if(!u)return out;
      return out.replace(/(Supporting Document<\/div><div class="lp-sb-field-value">)([^<]+)(<\/div>)/,
        function(m,a,name,c){return a+'<a href="'+attrSafe(u)+'" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">'+name+'</a>'+c;});
    };
  }
  /* A claim's Attachments tab: each new file is uploaded and opens from its shared link. */
  if(typeof attachCommit==='function'){
    const c0=attachCommit;
    attachCommit=function(scope,id,fileList){
      const rec=scope==='exp'&&typeof attachRec==='function'?attachRec('exp',id):null,n0=rec?rec.attachments.length:0;
      const files=fileList?Array.prototype.slice.call(fileList):[];
      const out=c0.apply(this,arguments);
      if(rec&&novaHere()&&rec.attachments.length>n0){
        rec.attachments.slice(0,rec.attachments.length-n0).forEach(function(att){
          const f=files.find(function(x){return x.name===att.name;});
          if(!f||f.size>10*1024*1024)return;
          uploadFile(f,'web/attachments').then(function(u){att.url=u;saved();})
            .catch(function(e){if(window.console)console.warn('[ems-sync] attachment not uploaded',e&&e.message||e);});
        });
      }
      return out;
    };
  }
  if(typeof attachOpen==='function'){
    const o0=attachOpen;
    attachOpen=function(name){
      const r=typeof page!=='undefined'&&page==='expenses'&&typeof expSelectedId!=='undefined'&&expSelectedId!=null&&typeof expRec==='function'?expRec(expSelectedId):null;
      const a=r&&(r.attachments||[]).find(function(x){return x.name===name&&shareable(x.url);});
      if(a){window.open(a.url,'_blank','noopener');return;}
      return o0.apply(this,arguments);
    };
  }
})();
