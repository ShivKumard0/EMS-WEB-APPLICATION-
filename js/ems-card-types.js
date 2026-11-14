/* ══ Separate cards per purpose, automatic benefit cards (product owner, 10 Nov 2026) ══════════════
   1. A programme can issue its cards automatically (Benefit and Hybrid funding only): every Active employee who is
      entitled this month to a benefit paid into one of the programme's wallets, and whose card enrollment is ready,
      gets a card without a request. It goes straight to enrollment; the provider still confirms KYC, issuance and
      activation through the one outcome entry point. One automatic card per employee per programme: if it is
      cancelled, an administrator requests one on the employee's behalf.
   The card inventory (physical stock cards) was removed on 10 Nov 2026 at the product owner's request. */

/* ── 1 · Programme setting: Issue Cards Automatically ─────────────────── */
(function(){
  if(typeof ccProgOpen==='function'){
    const o0=ccProgOpen;
    ccProgOpen=function(id){
      const out=o0.apply(this,arguments);
      if(typeof ccProgForm!=='undefined'&&ccProgForm&&!ccProgForm.statusFor){const p=id!=null?ccProg(id):null;ccProgForm.autoIssue=!!(p&&p.autoIssue);}
      return out;
    };
  }
  if(typeof ccProgSync==='function'){
    const s0=ccProgSync;
    ccProgSync=function(){
      const out=s0.apply(this,arguments);
      const f=typeof ccProgForm!=='undefined'?ccProgForm:null;
      if(f&&!f.statusFor&&document.getElementById('csw-ccp-auto'))f.autoIssue=getCSValue('ccp-auto')==='Yes';
      return out;
    };
  }
  if(typeof ccProgFormHTML==='function'){
    const h0=ccProgFormHTML;
    ccProgFormHTML=function(){
      const out=h0.apply(this,arguments),f=ccProgForm||{};
      const field=ccField('Issue Cards Automatically',true,apCS('ccp-auto',['No','Yes'],f.autoIssue?'Yes':'No','Select'),
        'Benefit and Hybrid programmes. Yes: an Active employee entitled to a benefit paid into one of these wallets, with card enrollment ready, gets a card without a request.');
      let i=out.indexOf('<div class="ep-form-group ep-form-full"><div class="lp-sb-section-title" style="margin-top:6px">Card Funding');
      if(i<0)i=out.indexOf('</div><div class="lp-sb-form-actions">');
      return i<0?out:out.slice(0,i)+field+out.slice(i);
    };
  }
  if(typeof ccProgSave==='function'){
    const v0=ccProgSave;
    ccProgSave=function(d,A){
      if(d&&d.autoIssue&&d.fundingMode==='Corporate')return {error:'Automatic issue is for Benefit or Hybrid programmes. A corporate card is requested and approved.'};
      const res=v0.apply(this,arguments);
      if(res&&res.rec&&d&&d.autoIssue!==undefined&&!!res.rec.autoIssue!==!!d.autoIssue){
        A=A||ccNow();const p=res.rec;p.autoIssue=!!d.autoIssue;delete res.unchanged;
        ccLog(p,p.status,'Issue Cards Automatically '+(p.autoIssue?'on: employees entitled to a benefit in '+p.wallets.map(wbTypeName).join(', ')+' get a card without a request.':'off: cards are requested and approved.'),A);
        ccLog(ccCfg(p.entity),'Updated',p.key+' '+p.name+': automatic issue '+(p.autoIssue?'on':'off')+'.',A);
      }
      return res;
    };
  }
  /* The programme list says which programmes issue automatically. */
  if(typeof ccProgrammesSectionHTML==='function'){
    const l0=ccProgrammesSectionHTML;
    ccProgrammesSectionHTML=function(){
      let out=l0.apply(this,arguments);
      ccProgs().filter(function(p){return p.autoIssue;}).forEach(function(p){
        const t=ccE(p.key)+' · '+ccE(p.code)+' · '+ccE(p.type)+' · '+ccE(p.fundingMode);
        out=out.split(t+'</div>').join(t+' · issued automatically</div>');
      });
      return out;
    };
  }
})();

/* ── 2 · Automatic benefit cards ──────────────────────────────────────── */
function emsAutoIssueProgs(ent){
  return ccProgs(ent).filter(function(p){return p.autoIssue&&ccProgActive(p)&&p.fundingMode!=='Corporate'&&(p.forms||[]).length;});
}
/* Employees entitled this month to a benefit paid into one of the programme's wallets: eid → entitlement rows. */
function emsAutoIssueDue(p){
  const out={};
  wbEntitlements(wbToday().slice(0,7)).forEach(function(r){
    if(!wbAllocatable(r)||!r.wallet||p.wallets.indexOf(r.wallet.type)<0)return;
    (out[r.emp.eid]=out[r.emp.eid]||[]).push(r);
  });
  return out;
}
function emsAutoIssueBasis(rows){
  const n=rows.map(function(x){return x.cat.name;});
  return n.length>1?n.slice(0,-1).join(', ')+' and '+n[n.length-1]:n.join('');
}
function emsAutoIssueSync(){
  if(window.emsAutoIssueHold||window.emsAutoIssueBusy)return [];
  if(typeof ccProgs!=='function'||typeof wbEntitlements!=='function'||typeof idEntity!=='function')return [];
  const ent=ccEnt();if(!ent)return [];
  if(typeof mcOn==='function'&&!mcOn('cards'))return [];
  const progs=emsAutoIssueProgs(ent);if(!progs.length)return [];
  window.emsAutoIssueBusy=true;const made=[];
  try{
    progs.forEach(function(p){
      const due=emsAutoIssueDue(p);
      Object.keys(due).forEach(function(eid){
        if(ccLiveCardsOf(eid,p.id).length||ccOpenReqsOf(eid,p.id).length)return;
        if(ccRequests.some(function(r){return r.kind==='card request'&&r.employeeEid===eid&&r.programmeId===p.id&&r.mode==='Automatic';}))return;   // once per employee and programme
        const el=ccEligibility(eid,p.id,'submit');if(!el.ok)return;
        const r=emsAutoIssueCreate(p,eid,due[eid],el);if(r)made.push(r);
      });
    });
  }finally{window.emsAutoIssueBusy=false;}
  return made;
}
function emsAutoIssueCreate(p,eid,rows,el){
  const e=idEmp(eid);if(!e)return null;
  const A=caAt('System',wbToday(),stampNow().time);
  const type=p.forms.indexOf('Virtual')>=0?'Virtual':'Physical';
  /* The card comes with the employee's benefit wallets of this month and the company wallets; other benefit wallets on request. */
  const ent=rows.map(function(x){return x.wallet.type;}),ws=p.wallets.filter(function(w){const t=wbType(w);return !t||t.cls!=='Flexi Benefit'||ent.indexOf(w)>=0;});
  const f=ccReqFields({cardType:type,reason:'Benefit programme enrolment',purpose:'',deliveryMode:type==='Physical'?'Office (work location)':'',comments:'',wallets:ws},p);
  const basis=emsAutoIssueBasis(rows),wallets=ccUniq(rows.map(function(x){return wbTypeName(x.wallet.type);})).join(', ');
  const r=Object.assign({id:ccReqNextId++,key:ccReqNextKey++,prefix:'CRQ',kind:'card request',entity:p.entity,claimFor:'Others',mode:'Automatic',
    employeeEid:e.eid,name:e.name,empId:e.empId,email:e.email||'',dept:e.dept||'',designation:e.jobTitle||e.designation||'',status:'Approved',createdBy:'System',createdAt:ccStamp(A),
    migrated:true,idMigrated:true,category:'Card Request',title:'',track:'',eligibility:{at:ccStamp(A),ok:true,draftOnly:false,reasons:[]},consentSimulated:!!el.consentSimulated,
    lines:[{id:1,title:'Card · '+type,amount:1,subCat:'Card',start:A.iso,end:A.iso,status:'Approved',approved:1}],logs:[],
    auto:{basis:basis,wallets:wallets,at:ccStamp(A)}},f);
  r.currency='card';r.title=ccReqTitle(r);r.purpose='Benefit: '+basis;
  ccRequests.unshift(r);
  ccLog(r,'Approved','Card issued automatically: '+e.name+' is entitled to '+basis+' this month, paid into the '+wallets+' wallet. '+p.name+' issues its cards automatically; no request or approval is needed.',A);
  r.track='Enrollment Pending';r.enr=ccEnrNew(r,p);
  ccLog(r,'Enrollment Pending','Enrollment '+r.enr.key+' is pending'+(p.provider?' with '+ccProviderName(p.provider)+' (KYC by the provider)':'')+'. No card has been issued yet.',A);
  ccNotify([idUserOfEmp(e.eid)],expKey(r)+': '+(/^[aeiou]/i.test(p.name)?'an ':'a ')+p.name+' is being issued to you for your '+basis+(basis.indexOf(' and ')>=0?' benefits.':' benefit.'),r,'auto-issue');
  ccNotify(ccPeopleWith('card.enrollment.manage',p.entity),expKey(r)+': '+p.name+' for '+e.name+' was issued automatically. Send the enrollment to the provider.',r,'auto-issue-admin');
  return r;
}
/* Kept current: before each screen is drawn (the check is cheap; it does nothing where no programme issues automatically). */
(function(){
  if(typeof renderADTPage!=='function')return;
  const r0=renderADTPage;
  renderADTPage=function(){
    try{emsAutoIssueSync();}catch(e){}
    return r0.apply(this,arguments);
  };
})();

/* ── 3 · The Approval tab of an automatic card: no approval route ─────── */
(function(){
  if(typeof caApprovalTabHTML==='function'){
    const t0=caApprovalTabHTML;
    caApprovalTabHTML=function(r){
      if(!r||r.kind!=='card request'||r.mode!=='Automatic')return t0.apply(this,arguments);
      const p=ccProg(r.programmeId);
      return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Approval</span></div>'
        +'<div class="wb-note"><div class="wb-note-sub">No approval needed: issued automatically for '+ccE(r.auto&&r.auto.basis||'a benefit')+'. '+ccE(p?p.name:'The programme')+' issues its cards automatically.</div></div>';
    };
  }
})();

/* ── Dashboard: what needs doing ──────────────────────────────────────── */
(function(){
  if(typeof emsDashTasks!=='function')return;
  const d0=emsDashTasks;
  emsDashTasks=function(){
    const t=d0.apply(this,arguments);
    try{
      if(typeof mcOn==='function'&&!mcOn('cards'))return t;
      const add=function(item,type,status,tone,label,call){t.push({item:item,type:type,due:'',status:status,tone:tone,label:label,call:call});};
      /* Approved card loads waiting for Finance to record what the bank did. */
      if(ccCan('card.load.create')){
        const w=ccLoads.filter(function(l){return l.entity===ccEnt()&&l.exec&&!l.exec.closed&&['Awaiting Execution','Partially Recorded'].indexOf(l.exec.status)>=0;}).length;
        if(w)add(w+' approved card load'+(w===1?'':'s')+' to record','Card load execution','Awaiting Execution','info','Open',"navigatePage('cards');ccSetPageTab('loads');ccLoadStatusF='Awaiting Execution';renderADTPage()");
      }
      if(ccCan('card.enrollment.manage')){
        const n=ccRequests.filter(function(r){return r.entity===ccEnt()&&r.kind==='card request'&&ccReqTrack(r)==='Enrollment Pending'&&r.enr&&['Pending','Failed'].indexOf(r.enr.status)>=0;}).length;
        if(n)add(n+' card enrollment'+(n===1?'':'s')+' to send to the provider','Card enrollment','Enrollment Pending','info','Open',"navigatePage('cards');ccSetPageTab('requests')");
      }
    }catch(e){}
    return t;
  };
})();

/* ══ 4 · Wallets on a card, and the Wallet Request (product owner, 10 Nov 2026) ═════════════════════════════════
   One card, many wallets. Each card carries the wallets switched on for it: a new card gets the wallets its request
   names (an automatic card: the employee's benefits this month and the company wallets). An employee who already
   holds the card asks for another wallet (Health, Meal …) from the same Request form: a Wallet Request, approved on
   the card approval route; on approval the wallet is switched on. A load or a payment goes only to a wallet on the
   card. Cards issued before this keep every wallet of their programme. */
let emsWrqNextKey=1001;
function ccCardWallets(c){const p=c?ccProg(c.programmeId):null;return c&&c.wallets?c.wallets.slice():(p?p.wallets.slice():[]);}
function emsCardOfEmp(eid,progId){return ccLiveCardsOf(eid,progId).filter(function(c){return !ccCardEnded(c)&&c.status!=='Blocked';})[0]||null;}
function emsWalletNames(list){return (list||[]).map(wbTypeName).join(', ');}
(function(){
  /* A new card's wallets: those the request picks, within the programme. */
  if(typeof ccReqFields==='function'){
    const f0=ccReqFields;
    ccReqFields=function(d,p){
      const f=f0.apply(this,arguments);
      if(d&&p&&Array.isArray(d.wallets)&&d.wallets.length){const ok=p.wallets.filter(function(w){return d.wallets.indexOf(w)>=0;});if(ok.length)f.wallets=ok;}
      return f;
    };
  }
  /* The card record takes them when it is born; a replacement keeps the old card's. */
  if(typeof ccEnrSubmit==='function'){
    const e1=ccEnrSubmit;
    ccEnrSubmit=function(reqId){
      const out=e1.apply(this,arguments);
      if(!out){const r=ccReq(reqId),c=r?ccCardOfReq(r):null;
        if(c&&!c.wallets){const p=ccProg(c.programmeId),old=r.kind==='card replacement'?ccCard(r.cardId):null;
          c.wallets=old?ccCardWallets(old):(r.wallets||[]).filter(function(w){return !p||p.wallets.indexOf(w)>=0;});
          if(!c.wallets.length)c.wallets=p?p.wallets.slice():[];}}
      return out;
    };
  }
  /* Loads and payments: only to a wallet on the card. */
  ['ccLoadCheck','ccTxnCheck'].forEach(function(n){
    const f0=window[n];if(typeof f0!=='function')return;
    window[n]=function(d){
      const out=f0.apply(this,arguments);
      try{const c=d&&d.cardId!=null?ccCard(d.cardId):null;
        if(c&&c.wallets&&d.wallet&&c.wallets.indexOf(d.wallet)<0&&out&&out.errors)out.errors.push(wbTypeName(d.wallet)+' is not on '+ccCardLabel(c)+': request the wallet first.');}catch(e){}
      return out;
    };
  });
  /* What the card shows per wallet: only the wallets on it. */
  if(typeof ccWalletEntitlements==='function'){
    const w0=ccWalletEntitlements;
    ccWalletEntitlements=function(c){const out=w0.apply(this,arguments);if(!c||!c.wallets)return out;return out.filter(function(w){return c.wallets.indexOf(w.code)>=0;});};
  }
})();

/* ── The Wallet Request ── */
if(typeof CC_KIND_WF!=='undefined')CC_KIND_WF['wallet request']='Card Request';
function emsWrqTitle(r){const p=ccProg(r.programmeId);return 'Wallet · '+emsWalletNames(r.wallets)+(p?' · '+p.name:'');}
/* '' or why these wallets cannot be asked for now. */
function emsWrqWhyNot(eid,progId,wallets,exceptId){
  const e=idEmp(eid),p=ccProg(progId);
  if(!e)return 'Pick the employee.';if(!p)return 'Pick the card programme.';
  const c=emsCardOfEmp(eid,p.id);if(!c)return e.name+' holds no '+p.name+' yet: request the card first.';
  const el=ccEligibility(eid,p.id,'load');if(!el.ok)return el.reasons.join(' ');
  wallets=wallets||[];if(!wallets.length)return 'Pick the wallet to add.';
  const bad=wallets.filter(function(w){return p.wallets.indexOf(w)<0;});if(bad.length)return emsWalletNames(bad)+' is not a wallet of '+p.name+'.';
  const on=ccCardWallets(c),have=wallets.filter(function(w){return on.indexOf(w)>=0;});
  if(have.length)return emsWalletNames(have)+' is already on '+ccCardLabel(c)+'.';
  const open=ccRequests.find(function(x){return x.kind==='wallet request'&&x.id!==exceptId&&x.employeeEid===eid&&['Draft','Awaiting Approval','Follow-Up'].indexOf(x.status)>=0
    &&x.wallets.some(function(w){return wallets.indexOf(w)>=0;});});
  if(open)return expKey(open)+' ('+open.status+') already asks for '+emsWalletNames(open.wallets.filter(function(w){return wallets.indexOf(w)>=0;}))+'.';
  return '';
}
function emsWrqCreate(d,submit,A){
  A=A||ccNow();d=d||{};
  const e=idEmp(d.employeeEid),p=ccProg(d.programmeId);
  if(!e||e.entityId!==ccEnt())return {error:'Pick an employee of this entity.'};
  if(!p||p.entity!==ccEnt())return {error:'Pick a card programme.'};
  const may=ccReqMayRaise(A,e.eid,p);if(may)return {error:may};
  const why=emsWrqWhyNot(e.eid,p.id,d.wallets);if(why)return {error:why};
  if(CC_REQ_REASONS.indexOf(d.reason)<0)return {error:'Pick the request reason.'};
  if(d.reason==='Other'&&!String(d.purpose||'').trim())return {error:'Describe the purpose when the reason is Other.'};
  const c=emsCardOfEmp(e.eid,p.id),me=idEmpOfUser(A.who),self=!!me&&me.eid===e.eid,ws=p.wallets.filter(function(w){return d.wallets.indexOf(w)>=0;});
  const r={id:ccReqNextId++,key:emsWrqNextKey++,prefix:'WRQ',kind:'wallet request',entity:ccEnt(),claimFor:self?'Self':'Others',mode:self?'Self':'On Behalf',
    employeeEid:e.eid,name:e.name,empId:e.empId,email:e.email||'',dept:e.dept||'',designation:e.jobTitle||e.designation||'',status:'Draft',createdBy:A.who,createdAt:ccStamp(A),
    migrated:true,idMigrated:true,category:'Wallet Request',title:'',track:'',programmeId:p.id,cardId:c.id,cardType:'Wallet',wallets:ws,reason:d.reason,
    purpose:String(d.purpose||'').trim(),comments:String(d.comments||'').trim(),proof:d.proof||'',delivery:null,currency:'card',
    lines:[{id:1,title:'Wallet · '+emsWalletNames(ws),amount:1,subCat:'Wallet',start:A.iso,end:A.iso,status:'Pending',approved:null}],logs:[]};
  r.title=emsWrqTitle(r);
  ccLog(r,'Draft','Wallet request drafted by '+caN(A.who)+(self?'':' on behalf of '+e.name)+': '+emsWalletNames(ws)+' on '+ccCardLabel(c)+'.',A);
  ccRequests.unshift(r);
  if(submit){const se=emsWrqSubmit(r.id,A);if(se){ccRequests.shift();ccReqNextId--;emsWrqNextKey--;return {error:se};}}
  return {rec:r};
}
function emsWrqUpdate(id,d,A){
  A=A||ccNow();d=d||{};
  const r=ccReq(id);if(!r||r.kind!=='wallet request'||r.entity!==ccEnt())return 'No such request.';
  if(['Draft','Follow-Up'].indexOf(r.status)<0)return expKey(r)+' is '+r.status+'; only a draft or a request sent back can be edited.';
  if(!(r.createdBy===A.who||caIsClaimant(r,A.who)||ccPCan(A,'card.request.others')))return caN(A.who)+' cannot edit '+expKey(r)+'.';
  const p=ccProg(r.programmeId),ws=p?p.wallets.filter(function(w){return (d.wallets||r.wallets).indexOf(w)>=0;}):r.wallets;
  const why=emsWrqWhyNot(r.employeeEid,r.programmeId,ws,r.id);if(why)return why;
  const reason=d.reason||r.reason;if(CC_REQ_REASONS.indexOf(reason)<0)return 'Pick the request reason.';
  const nx={wallets:ws,reason:reason,purpose:String(d.purpose!=null?d.purpose:r.purpose).trim(),comments:String(d.comments!=null?d.comments:r.comments).trim(),proof:d.proof!=null?d.proof:r.proof};
  if(nx.reason==='Other'&&!nx.purpose)return 'Describe the purpose when the reason is Other.';
  const ch=Object.keys(nx).filter(function(k){return JSON.stringify(r[k])!==JSON.stringify(nx[k]);});
  Object.assign(r,nx);r.title=emsWrqTitle(r);r.lines[0].title='Wallet · '+emsWalletNames(r.wallets);
  if(ch.length)ccLog(r,r.status,'Edited by '+caN(A.who)+' ('+ch.join(', ')+').',A);
  return '';
}
function emsWrqPreflight(r,o){
  const why=emsWrqWhyNot(r.employeeEid,r.programmeId,r.wallets,r.id);if(why)return {error:'Not possible now: '+why};
  const c=emsCardOfEmp(r.employeeEid,r.programmeId);if(c&&r.cardId!==c.id)r.cardId=c.id;
  return ccEnginePreflight(r,o);
}
function emsWrqSubmit(id,A){
  A=A||ccNow();
  const r=ccReq(id);if(!r||r.kind!=='wallet request'||r.entity!==ccEnt())return 'No such request.';
  if(r.status!=='Draft')return 'Only a draft is submitted; '+expKey(r)+' is '+r.status+'.';
  const p=ccProg(r.programmeId),may=p?ccReqMayRaise(A,r.employeeEid,p):'Pick a card programme.';if(may)return may;
  const pre=emsWrqPreflight(r);if(pre.error)return pre.error;
  if(!caStart(r,pre,A))return expKey(r)+' already has an approval in progress.';
  return '';
}
/* Final approval switches the wallets on for the card. Approval loads nothing. */
function emsWrqOnFinal(r,A){
  if(['Approved','Partially Approved'].indexOf(r.status)<0)return;
  const c=ccCard(r.cardId);if(!c){r.track='Approved';return;}
  const on=ccCardWallets(c),add=r.wallets.filter(function(w){return on.indexOf(w)<0;});
  c.wallets=on.concat(add);r.track='Wallet Added';
  ccLog(c,c.status,'Wallet '+emsWalletNames(add)+' switched on ('+expKey(r)+').',A);
  ccLog(r,'Wallet Added','Approved. '+emsWalletNames(add)+' is now on '+ccCardLabel(c)+'. It is loaded by the benefit policy or a card load; approval loads nothing.',A);
  ccNotify([idUserOfEmp(r.employeeEid)],expKey(r)+': '+emsWalletNames(add)+' is now on your card '+ccCardLabel(c)+'.',r,'wallet-added');
}
if(typeof ccRegisterKind==='function'){
  ccRegisterKind('wallet request',{
    preflight:function(r,o){return emsWrqPreflight(r,o);},
    decisionCheck:function(r,items){
      if(!(items||[]).some(function(it){return it.decision!=='Rejected';}))return '';
      const why=emsWrqWhyNot(r.employeeEid,r.programmeId,r.wallets,r.id);return why?'Cannot approve '+expKey(r)+' now: '+why:'';},
    onFinal:function(r,A){emsWrqOnFinal(r,A);},
    finalNote:'Approval switches the wallet on for the card; it loads nothing.',
    finalNotice:function(r){return expKey(r)+' was '+r.status.toLowerCase()+(r.status!=='Rejected'?' - '+emsWalletNames(r.wallets)+' is on the card':'')+'.';},
    decisionHint:'Approves the wallet request as a whole. On approval the wallet is switched on for the card; nothing is loaded.'});
  if(typeof CA_TYPE_LABEL!=='undefined')CA_TYPE_LABEL['wallet request']='Wallet Request';
}

/* ── The Request form: a new card, or a wallet on the card the employee holds ── */
function emsWrqMode(f){
  if(!f)return false;
  if(f.id!=null){const r=ccReq(f.id);return !!r&&r.kind==='wallet request';}
  return !!(f.employeeEid&&f.programmeId&&emsCardOfEmp(f.employeeEid,f.programmeId));
}
function emsWalletCode(label){const t=(typeof wbTypesHere==='function'?wbTypesHere():WB_WALLET_TYPES).find(function(x){return x.name===label;});return t?t.code:'';}
(function(){
  if(typeof ccReqStart==='function'){
    const s0=ccReqStart;
    ccReqStart=function(id,o){
      const r=id!=null?ccReq(id):null;
      const out=s0.apply(this,arguments);
      if(r&&r.kind==='wallet request'&&ccReqForm)Object.assign(ccReqForm,{wallets:r.wallets.slice(),wrq:true});
      return out;
    };
  }
  if(typeof ccReqSync==='function'){
    const y0=ccReqSync;
    ccReqSync=function(){
      const out=y0.apply(this,arguments),f=ccReqForm;
      if(f&&document.getElementById('msw-ccrf-wallets'))f.wallets=getMSValue('ccrf-wallets').map(emsWalletCode).filter(Boolean);
      return out;
    };
  }
  if(typeof ccReqFormHTML==='function'){
    const h0=ccReqFormHTML;
    ccReqFormHTML=function(){
      const f=ccReqForm;
      if(emsWrqMode(f))return emsWrqFormHTML(f);
      const out=h0.apply(this,arguments),p=f&&f.programmeId?ccProg(f.programmeId):null;
      if(!p)return out;
      /* A new card: the wallets to switch on (all of the programme's unless fewer are picked). */
      if(!Array.isArray(f.wallets)||!f.wallets.length)f.wallets=p.wallets.slice();
      const field=ccField('Wallets',true,apMS('ccrf-wallets',p.wallets.map(wbTypeName),f.wallets.filter(function(w){return p.wallets.indexOf(w)>=0;}).map(wbTypeName),'Select wallets'),
        'Currency '+ccE(p.currency)+'. More wallets can be requested later.');
      return out.replace(/<div class="ep-form-group"><label class="ep-form-label">Requested Currency · Wallets<\/label>[\s\S]*?<\/div>/,field);
    };
  }
  if(typeof ccReqSave==='function'){
    const v0=ccReqSave;
    ccReqSave=function(submit){
      ccReqSync();const f=ccReqForm;if(!f)return;
      if(!emsWrqMode(f)){
        if(f.programmeId&&Array.isArray(f.wallets)&&!f.wallets.length&&document.getElementById('msw-ccrf-wallets')){showToast('Not saved','error','Pick at least one wallet.');return;}
        return v0.apply(this,arguments);
      }
      if(f.id!=null){
        const r=ccReq(f.id),e=emsWrqUpdate(f.id,f);if(e){showToast('Not saved','error',e);return;}
        if(submit&&r.status==='Draft'){const se=emsWrqSubmit(r.id);if(se){showToast('Saved as draft','error',se);ccReqForm=null;renderADTPage();return;}}
        ccReqForm=null;ccReqSel=r.id;renderADTPage();showToast(submit?'Wallet request submitted':'Wallet request saved','success',expKey(r)+' · '+ccReqTrack(r)+'.');return;
      }
      const res=emsWrqCreate(f,submit);
      if(res.error){showToast(submit?'Not submitted':'Not saved','error',res.error);return;}
      ccReqForm=null;ccReqSel=res.rec.id;ccReqTab='basic-details';renderADTPage();
      const st=caActiveStage(res.rec);
      showToast(submit?'Wallet request submitted':'Draft saved','success',expKey(res.rec)+(submit?' is with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'. On approval the wallet is switched on for the card.':' is a draft; submit it when ready.'));
    };
  }
})();
function emsWrqFormHTML(f){
  const pool=ccReqEmpPool(),e=f.employeeEid?idEmp(f.employeeEid):null,p=f.programmeId?ccProg(f.programmeId):null,me=ccEmpOf();
  const progs=e?ccReqProgOptions(f):[],self=!!(me&&e&&me.eid===e.eid),edit=f.id!=null,rec=edit?ccReq(f.id):null;
  const c=rec?ccCard(rec.cardId):(e&&p?emsCardOfEmp(e.eid,p.id):null),on=c?ccCardWallets(c):[];
  const avail=p?p.wallets.filter(function(w){return on.indexOf(w)<0;}):[];
  f.wallets=(f.wallets||[]).filter(function(w){return avail.indexOf(w)>=0;});
  const mgr=e&&typeof caManagerOf==='function'?caManagerOf(e.eid):'';
  const ro=function(v){return '<input class="ep-form-input ca-ro" readonly value="'+attrSafe(v)+'">';};
  const body='<div class="ep-form-grid">'
    +ccField('Employee',true,!edit&&(pool.length>1||!self)?axCS('ccrf-emp',pool.map(ccEmpLabel),e?ccEmpLabel(e):'','Search employee','ccReqHook'):ro(e?ccEmpLabel(e):''))
    +ccField('Department · Designation',false,ro(e?(e.dept||'—')+' · '+(e.jobTitle||e.designation||'—'):''))
    +ccField('Reporting Manager',false,ro(mgr?caN(mgr):'—'))
    +ccField('Card Programme',true,edit?ro(p?ccProgLabel(p):''):apCS('ccrf-prog',progs.map(ccProgLabel),p?ccProgLabel(p):'','Select programme','ccReqHook'))
    +ccField('Card',false,ro(c?ccMask(c.last4)+' · '+expKey(c)+' · '+c.status:''))
    +ccField('Wallets on the Card',false,ro(emsWalletNames(on)||'—'))
    +ccField('Wallets Requested',true,avail.length?(function(){const h=apMS('ccrf-wallets',p.wallets.map(wbTypeName),f.wallets.map(wbTypeName),'Select wallets');
        apMSState['ccrf-wallets'].disabled=on.filter(function(w){return p.wallets.indexOf(w)>=0;}).map(wbTypeName);apMSState['ccrf-wallets'].disabledTag='On the card';return h;})()
      :'<div class="wb-empty-sm">Every wallet of '+ccE(p?p.name:'this programme')+' is already on the card.</div>')
    +ccField('Request Reason',true,apCS('ccrf-reason',CC_REQ_REASONS,f.reason,'Select'))
    +ccField('Business Purpose',f.reason==='Other',ccInput('ccrf-purpose',f.purpose,'What the wallet is for'))
    +ccField('Supporting Document',false,f.proof?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.proof)+'</span></div>'
      :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="ccReqProof(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span></span></label>')
    +ccField('Additional Comments',false,ccArea('ccrf-comments',f.comments,''),'',true)
    +'</div>';
  return bgModal(edit?'Edit Wallet Request · '+expKey(rec):'Wallet Request','A wallet is added to the card you hold once the request is approved. Approval loads nothing.',body,
    {close:'ccReqFormClose()',btns:avail.length?'<button class="ep-cancel-btn" onclick="ccReqSave(false)">Save Draft</button><button class="ep-save-btn" onclick="ccReqSave(true)">'+(rec&&rec.status==='Follow-Up'?'Save changes':'Submit')+'</button>':''});
}
/* The request panel and the approver's popup, for a wallet request. */
(function(){
  if(typeof ccReqBasicHTML==='function'){
    const b0=ccReqBasicHTML;
    ccReqBasicHTML=function(r){
      if(!r||r.kind!=='wallet request')return b0.apply(this,arguments);
      const p=ccProg(r.programmeId),c=ccCard(r.cardId),me=idMe(),own=r.createdBy===me||caIsClaimant(r,me);
      let act='';
      if(r.status==='Draft'&&(own||ccCan('card.request.others'))){act+=ccBtn('Submit','emsWrqSubmitClick('+r.id+')',true)+ccBtn('Edit','ccReqStart('+r.id+')');}
      if(typeof caCanWithdraw==='function'&&caCanWithdraw(r))act+=ccBtn('Withdraw','caActOpen(\'withdraw\','+r.id+')');
      if(r.status==='Follow-Up'&&typeof caCanRespond==='function'&&caCanRespond(r))act+=ccBtn('Edit before resubmitting','ccReqStart('+r.id+')');
      const why=['Draft','Follow-Up'].indexOf(r.status)>=0?emsWrqWhyNot(r.employeeEid,r.programmeId,r.wallets,r.id):'';
      const mgr=typeof caManagerOf==='function'?caManagerOf(r.employeeEid):'';
      return (act?'<div class="lp-sb-view-header"><span class="lp-sb-section-title">Actions</span><span class="ca-actions">'+act+'</span></div>':'')
        +(why?'<div class="wb-note is-wait"><b>Not ready to submit</b><div class="wb-note-sub">'+ccE(why)+'</div></div>':'')
        +'<div class="lp-sb-detail-grid">'
        +axField(AX_ICO.fHash,'Wallet Request ID',expKey(r))
        +axField(AX_ICO.fUser,'Employee',ccE(r.name)+' <span class="ax-sub">'+ccE(r.empId||'')+(r.dept?' · '+ccE(r.dept):'')+'</span>')
        +axField(AX_ICO.fUser,'Requested By',ccE(caN(r.createdBy))+' <span class="ax-sub">'+ccE(r.mode)+' · '+ccE(r.createdAt)+'</span>')
        +axField(AX_ICO.fUser,'Reporting Manager',ccE(mgr?caN(mgr):'—'))
        +axField(AX_ICO.fTag,'Card',ccE(c?ccMask(c.last4)+' · '+expKey(c):'—')+(p?' <span class="ax-sub">'+ccE(p.name)+'</span>':''))
        +axField(AX_ICO.fCash,'Wallets Requested',ccE(emsWalletNames(r.wallets)))
        +axField(AX_ICO.fBox,'Wallets on the Card',ccE(c?emsWalletNames(ccCardWallets(c)):'—'))
        +axField(AX_ICO.fTag,'Request Reason',ccE(r.reason)+(r.purpose?' <span class="ax-sub">'+ccE(r.purpose)+'</span>':''))
        +axField(AX_ICO.fCheck,'Status',ccE(ccReqTrack(r)))
        +axField(EXP_ICO.clip.replace('width="13" height="13" ',''),'Supporting Document',ccE(r.proof||'—'))
        +axField(EXP_ICO.note,'Additional Comments',ccE(r.comments||'—'),true)
        +'</div>';
    };
  }
  if(typeof ccReviewInfoHTML==='function'){
    const v0=ccReviewInfoHTML;
    ccReviewInfoHTML=function(r){
      if(!r||r.kind!=='wallet request')return v0.apply(this,arguments);
      const c=ccCard(r.cardId),why=emsWrqWhyNot(r.employeeEid,r.programmeId,r.wallets,r.id);
      return '<div class="wb-note'+(why?' is-bad':'')+'"><b>'+ccE(r.title)+'</b><div class="wb-note-sub">'+ccE(r.name)+' ('+ccE(r.empId||'')+(r.dept?', '+ccE(r.dept):'')+')'
        +(r.mode==='On Behalf'?' · requested by '+ccE(caN(r.createdBy)):' · self-request')
        +'<br>Card '+ccE(c?ccMask(c.last4)+' · '+expKey(c):'—')+' · wallets on it: '+ccE(c?emsWalletNames(ccCardWallets(c)):'—')
        +'<br>Requested: <b>'+ccE(emsWalletNames(r.wallets))+'</b> · Reason: '+ccE(r.reason)+(r.purpose?' - '+ccE(r.purpose):'')
        +(why?'<br><b>'+ccE(why)+'</b>':'')+'<br>Approval switches the wallet on for the card; it loads nothing.</div></div>';
    };
  }
  /* A notice about a wallet request opens it. */
  if(typeof ccOpenByKey==='function'){
    const k1=ccOpenByKey;
    ccOpenByKey=function(cid){
      const m=/^WRQ-(\d+)$/.exec(String(cid||''));
      if(m){const r=ccRequests.find(function(x){return x.prefix==='WRQ'&&x.key===Number(m[1]);});if(r&&typeof ccOpenReqUI==='function'){ccOpenReqUI(r.id);return true;}return false;}
      return k1.apply(this,arguments);
    };
  }
})();
function emsWrqSubmitClick(id){
  const e=emsWrqSubmit(id);if(e){showToast('Not submitted','error',e);return;}
  const r=ccReq(id),st=caActiveStage(r);renderADTPage();
  showToast('Wallet request submitted','success',expKey(r)+' is with '+(st?'Stage '+st.n+' · '+caNs(st.approvers):'approval')+'. On approval the wallet is switched on for the card.');
}

/* Wallets Requested lists every wallet of the programme; those already on the card are greyed out and cannot be
   picked (product owner, 10 Nov 2026). A multi-select may carry a "disabled" list; without one it is unchanged. */
(function(){
  if(typeof msOptionsHTML!=='function'||typeof apMSState==='undefined')return;
  const o0=msOptionsHTML;
  msOptionsHTML=function(id){
    const s=apMSState[id];
    if(!s||!s.disabled||!s.disabled.length)return o0.apply(this,arguments);
    const all=s.opts;
    try{
      return all.map(function(o){
        if(s.disabled.indexOf(o)>=0)return '<div class="cs-option ems-ms-off" role="option" aria-disabled="true"><span>'+attrSafe(o)+'</span><span class="ems-ms-tag">'+attrSafe(s.disabledTag||'Unavailable')+'</span></div>';
        s.opts=[o];return o0.call(this,id);
      },this).join('');
    }finally{s.opts=all;}
  };
  if(typeof msPick==='function'){
    const p0=msPick;
    msPick=function(id,val){const s=apMSState[id];if(s&&s.disabled&&s.disabled.indexOf(val)>=0)return;return p0.apply(this,arguments);};
  }
})();

/* ── Card Loads as people read them in a client company (product owner, 9-10 Nov 2026) ──
   The word "Illustrative" is not shown, so a load recorded as illustrative reads "Recorded" (its source stays on the
   record). The tiles are the states Finance works with: Awaiting Approval, Awaiting Execution, Recorded, Rejected,
   Failed - each filters the list. */
function emsPlainLoads(){return (typeof PRES_ON!=='undefined'&&PRES_ON)||(typeof emsClientOnly==='function'&&emsClientOnly());}
(function(){
  if(typeof ccLoadLabel==='function'){
    const l0=ccLoadLabel;
    ccLoadLabel=function(l){
      const s=l0.apply(this,arguments);if(!emsPlainLoads())return s;
      return s===CC_DEMO?'Recorded':s==='Partially Illustrative'?'Partially Recorded':s==='Reversed (Illustrative)'?'Reversed':s;
    };
  }
  if(typeof ccLoadListHTML==='function'&&typeof CC_LOAD_STATES!=='undefined'){
    const h0=ccLoadListHTML;
    ccLoadListHTML=function(){
      if(!emsPlainLoads())return h0.apply(this,arguments);
      const drop=['Partially Illustrative','Illustrative','Reversed (Illustrative)'],kept=CC_LOAD_STATES.slice();
      for(let i=CC_LOAD_STATES.length-1;i>=0;i--)if(drop.indexOf(CC_LOAD_STATES[i])>=0)CC_LOAD_STATES.splice(i,1);
      let out;try{out=h0.apply(this,arguments);}finally{CC_LOAD_STATES.length=0;Array.prototype.push.apply(CC_LOAD_STATES,kept);}
      const all=ccLoads.filter(ccLoadVisible),cnt=function(s){return all.filter(function(l){return ccLoadLabel(l)===s;}).length;};
      const tiles=[['Awaiting Approval',''],['Awaiting Execution','wait'],['Recorded','ok'],['Rejected','bad'],['Failed','bad']]
        .map(function(t){return caStat(t[0],cnt(t[0]),ccLoadStatusF===t[0],'ccLoadStat(\''+t[0]+'\')',t[1]||undefined);}).join('');
      const re=/<div class="listing-stat[^"]*" onclick="ccLoadStat\('[^']*'\)">[\s\S]*?<div class="listing-stat-label">[^<]*<\/div><\/div>/g;
      const m=out.match(re);if(!m||!m.length)return out;
      const a=out.indexOf(m[0]),z=out.lastIndexOf(m[m.length-1])+m[m.length-1].length;
      return out.slice(0,a)+tiles+out.slice(z);
    };
  }
})();
