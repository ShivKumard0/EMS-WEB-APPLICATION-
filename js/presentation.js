/* ══ PRESENTATION ENVIRONMENT (D1, product owner approval of 9 Nov 2026) ═════════════════════════════════════════
   Active only when the application is opened at index.html?env=presentation (the presentation launcher). Without that
   address nothing here runs and nothing is stored: the normal application, its starting data and every regression
   suite are unchanged.

   In the presentation environment:
   - The working records are kept in this browser after each change and restored on refresh or reopening, so a company
     created during the presentation, its configuration, employees, roles and records stay available.
   - Only what differs from the starting data is kept. Nothing sensitive is kept: there are no passwords (sign-in has
     none), no documents (only file names exist), and PAN and account numbers are stored masked.
   - An OpenDhi Super Admin can Reset Presentation Data (Company Settings → Platform & Integrations → Presentation
     Data): the prepared company, Nova Retail Pvt Ltd, is built again through the application's own functions.
   This is presentation storage in one browser. It is not the production database (BE-06). */

const PRES_ON=/[?&]env=presentation\b/.test(location.search);
const PRES_KEY='adt-presentation-v1';
/* The prepared data's version: a copy saved from an older version is rebuilt once, so new prepared records reach every browser without a manual reset. Change it whenever the prepared data changes. */
const PRES_DATA_VERSION='2026-11-13.1';
const PRES_COMPANY='Nova Retail Pvt Ltd';

/* ── What is kept ─────────────────────────────────────────────────────── */
/* Screen state, caches and values rebuilt from other records are never kept. */
const PRES_SKIP=/^pres|^(page|renderedPage|activeSidebarItem|lastSidebarSig|currentRole|emsCache|emsPicked|seSelectedEntity|seChosen|idSessionUser|idAuthUser|sbDecorateQueued|listPageNo|listPageSig|lpNewRows|expLineCtx|ccExpClaimDraft|empProfPersona|empSelf|empLogModal|empFormType|profTab|deTab|deSelectedId|csTab|csStructureTab|csSelectedItem|csAtt|csAttEnt|wsTab|wsSelectedId|nc|emb|presBuilding)$|(Form|Modal|Sel|Tab|Sub|Draft|DraftOrig|Open|Act|Rev|Cache|Sig|Queued|Persona|Filter|Filters|Query|Q|F)$/;
let presNames=null,presInitial=null,presTimer=null,presBuilding=false,presHoldAuto=false;
/* While the presentation data is set up, the month's funding batch waits until every
   benefit policy exists: the system prepares one batch per period, from the policies
   active at that moment, so preparing it half-way would leave a policy unfunded. */
(function(){
  if(typeof wbAutoPrepare!=='function')return;
  const ap0=wbAutoPrepare;
  wbAutoPrepare=function(){return presHoldAuto?null:ap0.apply(this,arguments);};
})();
function presGet(n){try{return (new Function('return typeof '+n+'!=="undefined"?'+n+':undefined'))();}catch(e){return undefined;}}
function presSet(n,v){
  const cur=presGet(n);
  if(Array.isArray(cur)&&Array.isArray(v)){cur.length=0;Array.prototype.push.apply(cur,v);return;}
  if(cur&&typeof cur==='object'&&v&&typeof v==='object'&&!Array.isArray(cur)){Object.keys(cur).forEach(function(k){delete cur[k];});Object.assign(cur,v);return;}
  try{(new Function('v',n+'=v'))(v);}catch(e){}
}
/* Masked before it is kept: PAN, account numbers; never kept: passwords, card secrets, file contents. */
function presReplacer(k,v){
  if(typeof v!=='string')return v;
  if(/^(pan|panNumber)$/i.test(k)&&v.length>4&&v.indexOf('•')<0)return '••••••'+v.slice(-4);
  if(/^(accountNumber|accountNo|accNo|acctNo|bankAccount|iban)$/i.test(k)&&v.replace(/\D/g,'').length>4)return '••••'+v.slice(-4);
  if(/password|passwd|^pwd$|^cvv|^cvc|^pin$|^otp$/i.test(k))return undefined;
  if(/^(blob:|data:)/.test(v))return '';
  return v;
}
function presSer(v){try{return JSON.stringify(v,presReplacer);}catch(e){return null;}}
/* The candidate names: every top-level data value of the application, read from its own scripts. */
function presCandidates(){
  if(presNames)return presNames;
  const out=[];
  Array.prototype.forEach.call(document.querySelectorAll('script[src^="js/"]'),function(s){
    try{const x=new XMLHttpRequest();x.open('GET',s.getAttribute('src'),false);x.send();
      /* A declaration may run on to the next line (let a=1,b=2,<newline> c=3;): the later names - ID counters among
         them - are kept too, so a record created after a refresh never reuses a number. Search boxes are not kept. */
      let cont=false;
      (x.responseText||'').split('\n').forEach(function(line){
        const decl=/^(const|let|var)\s/.test(line);
        if(!decl&&!cont)return;
        const re=decl?/(?:^(?:const|let|var)\s+|,\s*)([a-z_$][\w$]*)\s*=(?!=)/g:/(?:^\s*|,\s*)([a-z_$][\w$]*)\s*=(?!=)/g;let m;
        while((m=re.exec(line)))if(out.indexOf(m[1])<0&&!PRES_SKIP.test(m[1])&&(decl||!/Query$/.test(m[1])))out.push(m[1]);
        const code=line.replace(/\/\/.*$/,'').trim(),bal=(code.match(/[\[{(]/g)||[]).length-(code.match(/[\]})]/g)||[]).length;
        cont=bal===0&&/,$/.test(code);
      });}catch(e){}
  });
  /* Opened straight from a file:/// link, the browser may not let the page read its own scripts: the same names,
     generated from those scripts (js/pres-names.js, tools/gen-pres-names.js), are used as well, so the prepared
     company and everything created in it are still kept between visits. */
  if(typeof PRES_NAMES_BUILT!=='undefined')PRES_NAMES_BUILT.forEach(function(n){if(out.indexOf(n)<0&&!PRES_SKIP.test(n))out.push(n);});
  return (presNames=out.filter(function(n){const v=presGet(n);return v!==undefined&&typeof v!=='function'&&!(v&&v.nodeType);}));
}
function presSnapshot(){const o={};presCandidates().forEach(function(n){o[n]=presSer(presGet(n));});return o;}
function presSave(){
  if(!PRES_ON||presBuilding||!presInitial)return;
  const keep={};
  presCandidates().forEach(function(n){const s=presSer(presGet(n));if(s!=null&&s!==presInitial[n])keep[n]=s;});
  try{localStorage.setItem(PRES_KEY,JSON.stringify({v:1,data:PRES_DATA_VERSION,savedAt:new Date().toISOString(),entity:typeof idEntity==='function'?idEntity():'',stores:keep}));}catch(e){}
}
function presSaveSoon(){if(!PRES_ON||presBuilding)return;clearTimeout(presTimer);presTimer=setTimeout(presSave,700);}
function presRestore(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(PRES_KEY)||'null');}catch(e){saved=null;}
  if(!saved||saved.v!==1||!saved.stores)return false;
  if(!Object.keys(saved.stores).length){try{localStorage.removeItem(PRES_KEY);}catch(e){}return false;}   // an empty copy holds no company: rebuilt
  if(saved.data!==PRES_DATA_VERSION){try{localStorage.removeItem(PRES_KEY);}catch(e){}return false;}   // prepared from an older version: rebuilt
  Object.keys(saved.stores).forEach(function(n){try{presSet(n,JSON.parse(saved.stores[n]));}catch(e){}});
  if(saved.entity&&typeof entitiesData!=='undefined'){const e=entitiesData.find(function(x){return x.entityId===saved.entity;});if(e)seSelectedEntity=e.id;}
  if(typeof emsClearCache==='function')emsClearCache();
  return true;
}

/* ── Reset (OpenDhi Super Admin only) ─────────────────────────────────── */
function presCanReset(){return PRES_ON&&typeof emsCanPreview==='function'&&emsCanPreview()&&emsCan('platform.module.control');}
function presTabHTML(){
  if(!presCanReset())return '<div class="wb-empty-sm">Managed by OpenDhi.</div>';
  let s=null;try{s=JSON.parse(localStorage.getItem(PRES_KEY)||'null');}catch(e){}
  return '<div class="lp-sb-view-header"><span class="lp-sb-section-title">Presentation Data</span></div>'
    +'<div class="wb-note"><div class="wb-note-sub">Kept in this browser'+(s&&s.savedAt?' · last saved '+sbEsc(new Date(s.savedAt).toLocaleString('en-IN')):'')+'. Reset rebuilds '+sbEsc(PRES_COMPANY)+' and removes everything created since.</div></div>'
    +'<div class="ca-actions" style="margin-top:12px"><button class="ep-save-btn" onclick="presResetClick()">Reset Presentation Data</button></div>';
}
function presResetClick(){
  if(!presCanReset()){showToast('Not permitted','error','Only an OpenDhi Super Admin resets presentation data.');return;}
  if(!window.confirm('Reset presentation data? Everything created since the last reset is removed and '+PRES_COMPANY+' is prepared again.'))return;
  try{localStorage.removeItem(PRES_KEY);}catch(e){}
  location.reload();
}
if(PRES_ON){
  if(typeof csExtraTabs==='function'){const base=csExtraTabs;csExtraTabs=function(){return base().concat(presCanReset()?[{id:'presentation-data',label:'Presentation Data'}]:[]);};}
  /* A tab of its own, after E-Sign (the panel shows one tab per section). */
  if(typeof CS_GROUPS!=='undefined'&&!CS_GROUPS.some(function(x){return x.id==='presentation';})){
    const at=CS_GROUPS.findIndex(function(x){return x.id==='esign';});
    CS_GROUPS.splice(at>=0?at+1:CS_GROUPS.length,0,{id:'presentation',label:'Presentation Data',tabs:['presentation-data']});
  }
  /* Switch Entity in the presentation does not offer Closedhi (ENT-00293), product owner, 10 Nov 2026. Its data is unchanged. */
  /* Payments post to their funding source like every payment: reimbursements, advance disbursements and card loads, so a
     funding source shows its money in, money out and balance (product owner, 10 Nov 2026). */
  if(typeof bgPostSettlement==='function'){
    bgPostSettlement=function(r,A){
      const p=r.pay;if(!p||!p.sourceId)return;let n=0;
      bgSettlements(p).forEach(function(e){n++;if((e.route||p.route)==='Payroll')return;
        fbPostSystem({key:p.key+'#S'+n,sourceId:p.sourceId,type:'Outflow',dir:-1,amount:e.amount,date:e.payDate,ref:e.ref,originType:'reimbursement',recKey:expKey(r),recId:r.id,
          desc:'Reimbursement '+p.key+' of '+expKey(r)+' paid '+cdLabel(e.payDate)+'.'},A);});
    };
  }
  if(typeof advDisbVerify==='function'){
    const dv0=advDisbVerify;
    advDisbVerify=function(id,key,o,A){
      const out=dv0.apply(this,arguments);
      try{if(out===''){const r=advEngineRec(id),i=r&&r.disb&&r.disb.instructions.find(function(x){return x.key===key;});
        if(i&&i.sourceId&&i.verify&&i.verify.illustrative)fbPostSystem({key:i.key,sourceId:i.sourceId,type:'Outflow',dir:-1,amount:i.verify.amount,date:i.verify.date,ref:i.verify.ref||'',extRef:i.verify.extRef||'',
          originType:'disbursement',recKey:expKey(r),recId:r.id,desc:'Advance disbursement '+i.key+' of '+expKey(r)+' verified by '+caN(i.verify.by)+'.'},A||bgNow());}}catch(e){}
      return out;
    };
  }
  if(typeof ccLoadExecApply==='function'){
    const la0=ccLoadExecApply;
    ccLoadExecApply=function(e,A){
      const out=la0.apply(this,arguments);
      try{const l=ccLoad(e.loadId);
        if(e.source===CC_DEMO&&e.type!=='reversal'&&e.result==='Recorded'&&l&&l.sourceId){const c=ccCard(l.cardId),src=fbSource(l.sourceId);
          const post=fbPostSystem({key:'CLD-'+l.key+'#'+expKey(e),sourceId:src.id,type:'Card Load',dir:-1,amount:e.amount,date:e.date||wbToday(),ref:e.ref||'',originType:'card load',recKey:expKey(l),recId:l.id,
            desc:'Card load '+expKey(l)+': '+expMoney(e.amount,l.currency)+' to the '+wbTypeName(l.wallet)+' wallet of '+ccCardLabel(c)+' ('+ccHolderName(c)+').'},A);
          if(post){e.postingId=post.id;l.exec.posted=(l.exec.posted||[]).concat([post.id]);ccLog(l,l.exec.status,'Funding entry '+post.key+' posted on '+src.key+'.',A);}}}catch(x){}
      return out;
    };
  }
  /* The Budgets page without the Budget Control explanation banner (product owner, 10 Nov 2026: lean screens). */
  if(typeof bgControlNote==='function')bgControlNote=function(){return '';};
  if(typeof seChoices==='function'){const sc=seChoices;seChoices=function(){return sc.apply(this,arguments).filter(function(e){return e.entityId!=='ENT-00293';});};}
}

/* ── The prepared company: built through the application's own functions ─ */
const PRES_PEOPLE=[
  /* code, first, last, email, department, designation, manager email, gender, date of birth */
  ['Karan','Shah','karan.shah@novaretail.in','Administration','General Manager','','Male','1982-03-11'],
  ['Riya','Kapoor','riya.kapoor@novaretail.in','Human Resources','HR Manager','karan.shah@novaretail.in','Female','1988-07-19'],
  ['Rohan','Mehta','rohan.mehta@novaretail.in','Finance','Finance Manager','karan.shah@novaretail.in','Male','1986-01-24'],
  ['Neel','Arora','neel.arora@novaretail.in','Finance','Finance Executive','rohan.mehta@novaretail.in','Male','1994-05-02'],
  ['Vivek','Menon','vivek.menon@novaretail.in','Finance','Finance Controller','karan.shah@novaretail.in','Male','1984-10-08'],
  ['Ritu','Sen','ritu.sen@novaretail.in','Sales','Sales Manager','karan.shah@novaretail.in','Female','1987-12-15'],
  ['Kabir','Joshi','kabir.joshi@novaretail.in','Sales','Sales Executive','ritu.sen@novaretail.in','Male','1997-02-27'],
  ['Arjun','Rao','arjun.rao@novaretail.in','Sales','Sales Executive','ritu.sen@novaretail.in','Male','1995-08-30'],
  ['Ananya','Iyer','ananya.iyer@novaretail.in','Operations','Operations Manager','karan.shah@novaretail.in','Female','1989-04-17'],
  ['Meghna','Pillai','meghna.pillai@novaretail.in','Operations','Operations Executive','ananya.iyer@novaretail.in','Female','1996-11-21'],
  ['Sara','Thomas','sara.thomas@novaretail.in','Compliance','Compliance Officer','karan.shah@novaretail.in','Female','1990-06-05'],
  ['Imran','Khan','imran.khan@novaretail.in','Administration','IT Manager','karan.shah@novaretail.in','Male','1991-09-13'],
  /* More of Nova's store and office staff (product owner, 11 Nov 2026), so Corporate Cards lists a realistic set of cards. */
  ['Rahul','Verma','rahul.verma@novaretail.in','Sales','Sales Executive','ritu.sen@novaretail.in','Male','1996-03-14'],
  ['Sneha','Kulkarni','sneha.kulkarni@novaretail.in','Operations','Store Manager','ananya.iyer@novaretail.in','Female','1990-09-22'],
  ['Aditya','Shah','aditya.shah@novaretail.in','Sales','Area Sales Manager','ritu.sen@novaretail.in','Male','1988-11-05'],
  ['Pooja','Desai','pooja.desai@novaretail.in','Operations','Visual Merchandiser','ananya.iyer@novaretail.in','Female','1995-01-30'],
  ['Farhan','Qureshi','farhan.qureshi@novaretail.in','Sales','Sales Executive','ritu.sen@novaretail.in','Male','1998-06-18'],
  ['Divya','Krishnan','divya.krishnan@novaretail.in','Finance','Finance Executive','vivek.menon@novaretail.in','Female','1993-08-09'],
  ['Karthik','Reddy','karthik.reddy@novaretail.in','Operations','Store Manager','ananya.iyer@novaretail.in','Male','1989-12-02'],
  ['Nisha','Gupta','nisha.gupta@novaretail.in','Human Resources','HR Executive','riya.kapoor@novaretail.in','Female','1997-04-25'],
  /* The Product, Procurement, IT Support and Admin teams (product owner, 12 Nov 2026). */
  ['Nikhil','Bansal','nikhil.bansal@novaretail.in','Product','Product Manager','karan.shah@novaretail.in','Male','1990-02-14'],
  ['Shreya','Malhotra','shreya.malhotra@novaretail.in','Product','Product Analyst','nikhil.bansal@novaretail.in','Female','1996-07-09'],
  ['Manish','Agarwal','manish.agarwal@novaretail.in','Procurement','Procurement Manager','karan.shah@novaretail.in','Male','1987-05-21'],
  ['Kavya','Nair','kavya.nair@novaretail.in','Procurement','Procurement Executive','manish.agarwal@novaretail.in','Female','1995-10-03'],
  ['Rohit','Saxena','rohit.saxena@novaretail.in','Administration','IT Support Engineer','imran.khan@novaretail.in','Male','1997-01-16'],
  ['Deepa','Rawat','deepa.rawat@novaretail.in','Administration','Admin Executive','karan.shah@novaretail.in','Female','1994-03-27'],
  /* Five to six people in every team (product owner, 12 Nov 2026). */
  ['Sanjay','Kumar','sanjay.kumar@novaretail.in','Administration','Office Administrator','karan.shah@novaretail.in','Male','1985-08-19'],
  ['Lakshmi','Narayan','lakshmi.narayan@novaretail.in','Administration','Facilities Executive','karan.shah@novaretail.in','Female','1992-02-07'],
  ['Mohit','Jain','mohit.jain@novaretail.in','Administration','Admin Executive','karan.shah@novaretail.in','Male','1996-12-01'],
  ['Anjali','Mishra','anjali.mishra@novaretail.in','Human Resources','HR Executive','riya.kapoor@novaretail.in','Female','1995-06-23'],
  ['Rajesh','Pandey','rajesh.pandey@novaretail.in','Human Resources','Talent Acquisition Executive','riya.kapoor@novaretail.in','Male','1993-03-15'],
  ['Priya','Nambiar','priya.nambiar@novaretail.in','Human Resources','HR Business Partner','riya.kapoor@novaretail.in','Female','1989-10-11'],
  ['Suresh','Babu','suresh.babu@novaretail.in','Finance','Accounts Executive','rohan.mehta@novaretail.in','Male','1994-07-29'],
  ['Meera','Raghavan','meera.raghavan@novaretail.in','Finance','Accounts Executive','rohan.mehta@novaretail.in','Female','1996-01-17'],
  ['Vikas','Yadav','vikas.yadav@novaretail.in','Operations','Operations Executive','ananya.iyer@novaretail.in','Male','1995-04-08'],
  ['Ritika','Singh','ritika.singh@novaretail.in','Operations','Operations Executive','ananya.iyer@novaretail.in','Female','1997-09-26'],
  ['Arvind','Sharma','arvind.sharma@novaretail.in','Operations','Logistics Coordinator','ananya.iyer@novaretail.in','Male','1991-05-12'],
  ['Ravi','Teja','ravi.teja@novaretail.in','Operations','Store Associate','sneha.kulkarni@novaretail.in','Male','1998-11-03'],
  ['Fatima','Shaikh','fatima.shaikh@novaretail.in','Operations','Store Associate','karthik.reddy@novaretail.in','Female','1999-02-20'],
  ['Aman','Khurana','aman.khurana@novaretail.in','Product','Category Manager','nikhil.bansal@novaretail.in','Male','1988-06-30'],
  ['Neha','Bhatia','neha.bhatia@novaretail.in','Product','Product Analyst','nikhil.bansal@novaretail.in','Female','1997-03-08'],
  ['Tarun','Mehra','tarun.mehra@novaretail.in','Product','Merchandise Planner','nikhil.bansal@novaretail.in','Male','1993-12-14'],
  ['Gaurav','Sethi','gaurav.sethi@novaretail.in','Procurement','Procurement Executive','manish.agarwal@novaretail.in','Male','1994-09-05'],
  ['Shalini','Deshmukh','shalini.deshmukh@novaretail.in','Procurement','Vendor Manager','manish.agarwal@novaretail.in','Female','1990-07-22'],
  ['Harish','Bhat','harish.bhat@novaretail.in','Procurement','Procurement Executive','manish.agarwal@novaretail.in','Male','1996-04-18'],
  ['Ajay','Thakur','ajay.thakur@novaretail.in','Administration','IT Support Engineer','imran.khan@novaretail.in','Male','1997-08-27'],
  ['Swati','Patil','swati.patil@novaretail.in','Administration','System Administrator','imran.khan@novaretail.in','Female','1992-11-09'],
  ['Nitin','Chauhan','nitin.chauhan@novaretail.in','Administration','IT Support Engineer','imran.khan@novaretail.in','Male','1998-05-14'],
  ['Deepak','Sinha','deepak.sinha@novaretail.in','Compliance','Compliance Analyst','sara.thomas@novaretail.in','Male','1993-01-26'],
  ['Ishita','Bose','ishita.bose@novaretail.in','Compliance','Compliance Analyst','sara.thomas@novaretail.in','Female','1996-10-02'],
  ['Arun','Prakash','arun.prakash@novaretail.in','Compliance','Internal Auditor','sara.thomas@novaretail.in','Male','1987-02-16'],
  ['Megha','Dutta','megha.dutta@novaretail.in','Compliance','Risk Analyst','sara.thomas@novaretail.in','Female','1994-06-07']
];
/* Nova's department teams, filled by designation (product owner, 12 Nov 2026). They carry no access of their own:
   approvals stay with the approval teams. */
const PRES_TEAMS=[
  ['Admin Team',['General Manager','Admin Executive','Office Administrator','Facilities Executive']],
  ['HR Team',['HR Manager','HR Executive','Talent Acquisition Executive','HR Business Partner']],
  ['Finance Team',['Finance Manager','Finance Controller','Finance Executive','Accounts Executive']],
  ['Sales Team',['Sales Manager','Area Sales Manager','Sales Executive']],
  ['Operations Team',['Operations Manager','Operations Executive','Logistics Coordinator']],
  ['Store Team',['Store Manager','Visual Merchandiser','Store Associate']],
  ['Product Team',['Product Manager','Product Analyst','Category Manager','Merchandise Planner']],
  ['Procurement Team',['Procurement Manager','Procurement Executive','Vendor Manager']],
  ['IT Support Team',['IT Manager','IT Support Engineer','System Administrator']],
  ['Compliance Team',['Compliance Officer','Compliance Analyst','Internal Auditor','Risk Analyst']]
];
/* The approval teams under the names Nova uses; same people, same access. */
/* More people in the approval teams (product owner, 12 Nov 2026): every step that uses a team takes Any One of them. */
const PRES_TEAM_MORE={'Expense Review Team':['rohan.mehta','vivek.menon','ananya.iyer','aditya.shah'],
  'Budget Committee':['rohan.mehta','karan.shah','ananya.iyer','ritu.sen'],
  'Treasury Team':['divya.krishnan','suresh.babu','meera.raghavan'],
  'Card Approval Team':['rohan.mehta','riya.kapoor','deepa.rawat','sanjay.kumar'],
  'Card Operations Team':['divya.krishnan','suresh.babu','meera.raghavan','vivek.menon'],
  'Department Heads':['nikhil.bansal','manish.agarwal','imran.khan','sara.thomas']};
const PRES_TEAM_NAMES={'Expense Approvers':'Expense Review Team','Budget Approvers':'Budget Committee','Funding Verifiers':'Treasury Team',
  'Budget Owners':'Department Heads','Card Approvers':'Card Approval Team','Card Load Verifiers':'Card Operations Team'};
function presBuildBaseline(){
  const log=[],T0=window.showToast;let lastT='';presBuilding=true;
  window.showToast=function(a,b,c){lastT=a+(c?' - '+c:'');};
  const S=function(email){const r=idSignIn(email);if(r.error)throw new Error('sign-in '+email+': '+r.error);currentRole='';emsSyncIdentity();};
  const setCS=function(id,val){const w=document.getElementById('csw-'+id);if(!w)throw new Error('missing field '+id);const t=w.querySelector('.cs-trigger');t.classList.remove('cs-placeholder');t.querySelector('.cs-value').textContent=val;};
  const setIn=function(id,val){const el=document.getElementById(id);if(!el)throw new Error('missing field '+id);el.value=val;};
  const E=function(label,v){if(v&&(v.error||typeof v==='string'))throw new Error(label+': '+(v.error||v));return v;};
  const U=function(email){return idUserByEmail(email).userId;};
  const emp=function(email){return idEmpAll().find(function(e){return String(e.email).toLowerCase()===email;});};
  const decide=function(r,label){let g=0;while(r.wf&&r.wf.open&&g++<6){const st=caActiveStage(r);if(!st||!st.approvers.length)throw new Error(label+': no approver');S(idEmail(st.approvers[0]));E(label+' stage '+st.n,caDecide(r.id,{scope:'claim',decision:'Approve',comment:''}));}};
  const today=wbToday(),SA='shaun@testemp.com',KS='karan.shah@novaretail.in',RK='riya.kapoor@novaretail.in',RM='rohan.mehta@novaretail.in',NA='neel.arora@novaretail.in',
    VM='vivek.menon@novaretail.in',RS='ritu.sen@novaretail.in',KJ='kabir.joshi@novaretail.in',AR='arjun.rao@novaretail.in',AI='ananya.iyer@novaretail.in',MP='meghna.pillai@novaretail.in',ST='sara.thomas@novaretail.in',IK='imran.khan@novaretail.in';
  const P={};
  const file=function(o){navigatePage('expenses');expSetPageTab('all');startAddExpense();expDraft.title=o.title;expDraft.category=o.category;expDraft.just={};expDraft.lines=(o.lines||[]).slice();expDraft.line=o.line;
    let n=expensesData.length,g=0;do{renderADTPage();document.querySelectorAll('[data-epjust]').forEach(function(el){el.value=o.just||'Business need';});const dj=document.getElementById('exp-e-dupjust');if(dj)dj.value='Separate business expense';submitAddExpense(true);}while(expensesData.length===n&&g++<2);
    if(expensesData.length===n){const w=lastT;cancelAddExpense();throw new Error('claim "'+o.title+'": '+w);}return expensesData[0];};
  const line=function(title,amount,sub,start,o){o=o||{};return {title:title,amount:String(amount),subCat:sub,start:start,end:start,proof:o.proof||'receipt.pdf',proofUrl:'',comments:'',cols:{},paidBy:o.paidBy||'Employee',merchant:o.merchant||'',invoice:'',advanceId:o.advanceId||'',advAmount:o.advAmount!=null?String(o.advAmount):''};};
  const sub=function(cat){return (EXP_SUBCATS[cat]||[cat])[0];};
  /* HR (Riya) checks card details; Riya's own are checked by Karan, the company admin (no one checks their own). */
  const kyc=function(email,V){/* Aadhaar and the two KYC documents (product owner, 12 Nov 2026): a 12-digit number of the person's own and their files. */V=Object.assign({aadhaar:(function(e){let h=7;for(let i=0;i<e.length;i++)h=(h*31+e.charCodeAt(i))%100000000000;return String(2+(h%8))+String(h).padStart(11,'0');})(email),docAadhaar:'Aadhaar Card.pdf',docPan:'PAN Card.pdf'},V);const r=emp(email),HR=email===RK?KS:RK;S(HR);oncToggle(r.eid,'enroll');S(email);empProfPersona={kind:'',id:null};profTab='onc-card';navigatePage('my-profile');oncStartEdit(r.eid);
    oncFields().forEach(function(f){if(f.src!=='onc'||f.type==='decl'||!oncShown(f)||!oncEditable(f))return;const id='onc-e-'+f.k;
      if(f.type==='select'){if(document.getElementById('csw-'+id)&&!getCSValue(id)&&f.opts&&f.opts.length)setCS(id,V[f.k]&&f.opts.indexOf(V[f.k])>=0?V[f.k]:f.opts[0]);}else{const el=document.getElementById(id);if(el&&!el.value&&V[f.k]!=null)el.value=V[f.k];}});
    oncSaveEdit();S(HR);oncReview(r.eid,true);S(email);profTab='onc-card';navigatePage('my-profile');['declConsent','declPep','declTrue'].forEach(function(k){const el=document.getElementById('onc-d-'+k);if(el)el.checked=true;});oncAccept(r.eid);
    const st=oncStatus(oncEmpOf(r.eid),oncRec(r.eid));if(st!=='Ready for Card Enrollment')throw new Error(r.name+' KYC '+st+' · '+lastT);return r;};
  const step=function(name,fn){try{const r=fn();log.push('✓ '+name+(r?' · '+r:''));return r;}catch(e){log.push('✗ '+name+' · '+e.message);throw e;}};
  /* The cards read as a month's real use (product owner, 11 Nov 2026): Arjun's, Ritu's and Vivek's cards were issued in the
     previous month, this month's benefits were approved and loaded on the 1st, and their payments run through the month.
     on(day,time,fn) runs fn with the clock (wbToday, stampNow) set to that day and time, so every record, log and
     funding entry it makes carries that date; a day that is today runs at the real time. Today's walkthrough records
     are unchanged. */
  const M1=today.slice(0,8)+'01',dd=function(n){const d=wbAddDays(M1,n);return d>today?today:d;};
  const on=function(iso,time,fn){
    if(iso>=today)return fn();
    const t0=window.wbToday,s0=window.stampNow,hm=String(time).split(':'),h=Number(hm[0]),mi=Number(hm[1]||0),dt=new Date(iso+'T12:00:00');
    const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],p2=function(n){return n<10?'0'+n:''+n;};let sec=0;
    window.wbToday=function(){return iso;};
    window.stampNow=function(){sec=(sec+7)%60;return {date:dt.getDate()+' '+MON[dt.getMonth()]+' '+dt.getFullYear(),time:p2(h%12||12)+':'+p2(mi)+':'+p2(sec)+' '+(h>=12?'PM':'AM')};};
    try{return fn();}finally{window.wbToday=t0;window.stampNow=s0;}
  };
  const stepOn=function(name,iso,time,fn){return step(name,function(){return on(iso,time,fn);});};
  /* Card controls as Karan records them (Change Controls): a card's own rules can only be stricter than the programme's. */
  const ctl=function(scope,id,set,reason){S(KS);return E(scope+' controls',ccCtlPropose({scope:scope,targetId:id,effFrom:wbToday(),reason:reason,baseVer:null,
    set:Object.assign({perTxn:'',daily:'',monthly:'',annual:'',allowedCats:[],blockedCats:[],channels:{Online:true,POS:true,ATM:false},international:'Allow',mccAllow:'',mccBlock:'',countryAllow:'',countryBlock:''},set)}));};
  return Promise.resolve().then(function(){
    /* 1 · OpenDhi onboards the company */
    step('company',function(){S(SA);setAppRole('Super Admin');navigatePage('settings');ncStart();setIn('nc-name',PRES_COMPANY);setIn('nc-store','Nova Retail');setIn('nc-pass','NovaRetail@2026');setIn('nc-pass2','NovaRetail@2026');ncSave();P.ent=idEntity();if(idEntityName(P.ent)!==PRES_COMPANY)throw new Error(lastT);return P.ent;});
    /* Company Structure is its own page (Administration → Company Structure, js/company-structure.js), 12 Nov 2026. */
    step('structure',function(){navigatePage('company-structure');
      [['departments','Administration','ADM'],['departments','Human Resources','HRD'],['departments','Finance','FIN'],['departments','Sales','SAL'],['departments','Operations','OPS'],['departments','Compliance','CMP'],
       ['designation','General Manager','GMG'],['designation','HR Manager','HRM'],['designation','Finance Manager','FMG'],['designation','Finance Executive','FEX'],['designation','Finance Controller','FCT'],
       ['designation','Sales Manager','SMG'],['designation','Sales Executive','SEX'],['designation','Operations Manager','OMG'],['designation','Operations Executive','OEX'],['designation','Compliance Officer','CMO'],['designation','IT Manager','ITM'],
       ['designation','Store Manager','STM'],['designation','Area Sales Manager','ASM'],['designation','Visual Merchandiser','VMD'],['designation','HR Executive','HRX'],
       ['departments','Product','PRD'],['departments','Procurement','PRC'],
       ['designation','Product Manager','PDM'],['designation','Product Analyst','PDA'],['designation','Procurement Manager','PCM'],['designation','Procurement Executive','PCX'],
       ['designation','IT Support Engineer','ITS'],['designation','Admin Executive','ADX'],
       ['designation','Office Administrator','OFA'],['designation','Facilities Executive','FAX'],['designation','Talent Acquisition Executive','TAE'],['designation','HR Business Partner','HBP'],
       ['designation','Accounts Executive','ACX'],['designation','Logistics Coordinator','LGC'],['designation','Store Associate','SAS'],['designation','Category Manager','CTM'],
       ['designation','Merchandise Planner','MDP'],['designation','Vendor Manager','VNM'],['designation','System Administrator','SYA'],['designation','Compliance Analyst','CMA'],
       ['designation','Internal Auditor','IAU'],['designation','Risk Analyst','RSK']
      ].forEach(function(x){cstSetTab(x[0]);csStructOpen(x[0],null);setIn('css-name',x[1]);setIn('css-code',x[2]);csStructSave();});return csDeptNames().length+' departments, '+csDesigNames().length+' designations';});
    step('card provider and illustrative mode',function(){oncProgrammeEnable('rbl');E('presentation mode',ccSetDemoMode(true,'Presentation company: bank-side events are recorded as Illustrative.'));return oncProg(P.ent).provider;});
    step('company admin',function(){const p=PRES_PEOPLE[0],nx=eaNextEmpId('de',P.ent);
      const r=eaCreateEmployee({empId:nx.prefix+nx.seq,dial:'+91',fname:p[0],lname:p[1],email:p[2],phone:'9820000100',gender:p[6],dob:p[7],nationality:'India',status:'Pending',doj:'2026-04-01',empType:'Full Time',
        dept:p[3],designation:p[4],location:(embLists().location||['Mumbai'])[0],idProofs:['PAN Card'],accessRole:'Employee'},'de',{entityId:P.ent});
      if(!r||!r.eid)throw new Error('Karan not created');navigatePage('settings');openCsSidebar(1);csSetTab('roles-access');csRoleOpen();setCS('csr-role','Entity Super Admin');setCS('csr-user','Karan Shah');csRoleSave();
      if(!idUserOfEmp(r.eid))throw new Error('no account for Karan: '+lastT);return idEmp(r.eid).empId;});
  }).then(function(){
    /* 2 · The Company Admin bulk-uploads the team */
    S(KS);navigatePage('employees');embPlusClick();embMenuPick('bulk');if(!emb)throw new Error('bulk upload did not open: '+lastT);
    const base=embSampleRows()[0];
    const rows=PRES_PEOPLE.slice(1).map(function(p,i){return Object.assign({},base,{fname:p[0],lname:p[1],email:p[2],phone:'98200001'+String(10+i),dept:p[3],designation:p[4],manager:p[5],gender:p[6],dob:p[7],doj:p[0]==='Kabir'?today:'2026-04-01'});});
    return embFormatBook(rows).arrayBuffer().then(function(buf){return embTakeBytes('Nova Retail employees.xlsx',new Uint8Array(buf));}).then(function(){return embValidate();}).then(function(){
      step('bulk upload',function(){const r=emb.result;if(r.valid!==PRES_PEOPLE.length-1)throw new Error('valid '+r.valid+' of '+r.total);embCreate(false);if(emb.confirm)embCreate(true);const b=embBatches[0];embClose();return b.id+' · '+b.created.length+' employees';});
    });
  }).then(function(){
    step('roles',function(){navigatePage('settings');openCsSidebar(1);csSetTab('roles-access');
      [['HR Admin','Riya Kapoor'],['Finance/Billing Admin','Rohan Mehta'],['Manager','Ritu Sen'],['Manager','Ananya Iyer'],['Compliance Officer','Sara Thomas'],['IT Admin','Imran Khan'],
       ['Direct Employee','Kabir Joshi'],['Direct Employee','Arjun Rao'],['Direct Employee','Meghna Pillai'],['Direct Employee','Neel Arora'],['Direct Employee','Vivek Menon'],
       ['Direct Employee','Rahul Verma'],['Direct Employee','Sneha Kulkarni'],['Direct Employee','Aditya Shah'],['Direct Employee','Pooja Desai'],['Direct Employee','Farhan Qureshi'],
       ['Direct Employee','Divya Krishnan'],['Direct Employee','Karthik Reddy'],['Direct Employee','Nisha Gupta'],
       ['Direct Employee','Nikhil Bansal'],['Direct Employee','Shreya Malhotra'],['Direct Employee','Manish Agarwal'],['Direct Employee','Kavya Nair'],
       ['Direct Employee','Rohit Saxena'],['Direct Employee','Deepa Rawat'],
       ['Direct Employee','Sanjay Kumar'],['Direct Employee','Lakshmi Narayan'],['Direct Employee','Mohit Jain'],['Direct Employee','Anjali Mishra'],
       ['Direct Employee','Rajesh Pandey'],['Direct Employee','Priya Nambiar'],['Direct Employee','Suresh Babu'],['Direct Employee','Meera Raghavan'],
       ['Direct Employee','Vikas Yadav'],['Direct Employee','Ritika Singh'],['Direct Employee','Arvind Sharma'],['Direct Employee','Ravi Teja'],
       ['Direct Employee','Fatima Shaikh'],['Direct Employee','Aman Khurana'],['Direct Employee','Neha Bhatia'],['Direct Employee','Tarun Mehra'],
       ['Direct Employee','Gaurav Sethi'],['Direct Employee','Shalini Deshmukh'],['Direct Employee','Harish Bhat'],['Direct Employee','Ajay Thakur'],
       ['Direct Employee','Swati Patil'],['Direct Employee','Nitin Chauhan'],['Direct Employee','Deepak Sinha'],['Direct Employee','Ishita Bose'],
       ['Direct Employee','Arun Prakash'],['Direct Employee','Megha Dutta']
      ].forEach(function(x){csRoleOpen();setCS('csr-role',x[0]);setCS('csr-user',x[1]);csRoleSave();});return csRolesHere().length+' role assignments';});
    step('teams',function(){navigatePage('rbac-workspaces');const w=wsRows().find(function(x){return x.entityId===P.ent;});openWsSidebar(w.id,'members');
      [[NA,'Card Load Verifiers'],[NA,'Funding Verifiers'],[VM,'Funding Verifiers'],[AI,'Card Approvers'],[VM,'Budget Approvers'],[RM,'Budget Owners'],[RS,'Budget Owners'],[AI,'Budget Owners'],[RK,'Budget Owners'],[RS,'Expense Approvers']
      ].forEach(function(x){wsOpenAdd('member');const pool=wsCandidates(w),u=U(x[0]);setCS('ws-m-person',idLabel(u,pool));setCS('ws-m-team',x[1]);wsSaveMember(w.id);});
      return emsWorkspace(P.ent).teams.map(function(t){return t.name+' '+t.members.length;}).join(', ');});
    step('department teams',function(){const w=emsWorkspace(P.ent),ren=PRES_TEAM_NAMES;
      /* Imprest is not used (product owner, 12 Nov 2026): its team goes, and the workspace's history does not name it. */
      w.teams=w.teams.filter(function(t){return !/imprest/i.test(t.name);});
      w.teams.forEach(function(t){if(ren[t.name])t.name=ren[t.name];
        (PRES_TEAM_MORE[t.name]||[]).forEach(function(n){const u=U(n+'@novaretail.in');if(u&&t.members.indexOf(u)<0){t.members.push(u);wsNote(w,idName(u)+' added to '+t.name+'.');}});});
      (w.logs||[]).forEach(function(l){let a=String(l.action||'').replace(/,?\s*Imprest Custodians/g,'');Object.keys(ren).forEach(function(k){a=a.split(k).join(ren[k]);});l.action=a;});
      PRES_TEAMS.forEach(function(x){
        const m=PRES_PEOPLE.filter(function(p){return x[1].indexOf(p[4])>=0;}).map(function(p){return U(p[2]);});
        w.teams.push({id:wsTeamNext++,name:x[0],tpl:null,members:m});wsNote(w,'Team '+x[0]+' added with '+m.length+' member'+(m.length===1?'':'s')+'.');});
      /* The Expense Management Team (product owner, 12 Nov 2026): the people who approve and check expenses, each with a
         designation label; it carries no access of its own and no route uses it. */
      const EMT=[['ritu.sen','Reporting Manager'],['ananya.iyer','Reporting Manager'],['aditya.shah','Approver 1'],['nikhil.bansal','Approver 2'],
        ['rohan.mehta','Finance Approver'],['vivek.menon','Finance Approver'],['neel.arora','Verifier 1'],['karan.shah','Manager']];
      const emt={id:wsTeamNext++,name:'Expense Management Team',tpl:null,members:[],desig:{}};
      EMT.forEach(function(x){const u=U(x[0]+'@novaretail.in');if(u){emt.members.push(u);emt.desig[u]=x[1];}});
      w.teams.push(emt);wsNote(w,'Team Expense Management Team added with '+emt.members.length+' members.');
      /* Access for three department teams (product owner, 12 Nov 2026): the Admin Team everything a company administrator
         has; the Finance Team every finance right; the Compliance Team the Compliance Hub and every compliance review and
         audit right. Each is its own template in RBAC → Templates, applied through the team. */
      const A0=caNow(),at=A0.date+' | '+A0.time,codes={};
      const ok=function(c){return typeof RB_PERM==='undefined'||(RB_PERM[c]&&RB_PLATFORM_CODES.indexOf(c)<0&&c.indexOf('card.demo.')!==0);};
      const fromTpl=function(names){const o=[];rbacTemplatesData.forEach(function(t){if(names.indexOf(t.name)>=0)t.perms.forEach(function(c){if(o.indexOf(c)<0)o.push(c);});});return o;};
      const fromArea=function(mod,areas){const o=[];(RB_CATALOGUE[mod]||[]).forEach(function(a){if(!areas||areas.indexOf(a.area)>=0)a.items.forEach(function(i){o.push(i.c);});});return o;};
      const audit=function(){const o=[];Object.keys(RB_CATALOGUE).forEach(function(m){RB_CATALOGUE[m].forEach(function(a){a.items.forEach(function(i){if(/\.audit\.view$|compliance/.test(i.c))o.push(i.c);});});});return o;};
      const uniq=function(l){const o=[];l.forEach(function(c){if(ok(c)&&o.indexOf(c)<0)o.push(c);});return o;};
      const TPL=[
        ['Admin Team','Admin Team · Full Access','Foundation',uniq(rbCompanyAdminPerms()),'Everything a company administrator manages for this company, for the Admin Team. Platform administration stays with OpenDhi.'],
        ['Finance Team','Finance Team · Full Access','Finance',uniq(fromArea('Finance').concat(fromArea('Budgets'),fromTpl(['Finance Admin Access','Expense Finance Administrator','Advance Finance Administrator','Budget & Funding Administrator','Budget Approver','Funding Verifier','Card Load Verifier','Expense Approver']))),
          'Every finance right in the expense system for the Finance Team: claim and advance finance review, reimbursements and disbursements, budgets and funding, card load verification and payments.'],
        ['Compliance Team','Compliance Team · Full Access','Governance',uniq(fromArea('Governance',['Compliance Hub','Rates & rules']).concat(audit(),fromTpl(['Compliance Officer Access','Expense Compliance Review','Advance Compliance Review','Budget Compliance Review','Card Compliance Review']))),
          'The Compliance Hub in full and every compliance review and audit right in the expense system, for the Compliance Team.']
      ];
      TPL.forEach(function(x){
        const id=rbacTemplatesData.reduce(function(m,t){return Math.max(m,t.id);},0)+1;
        rbacTemplatesData.push(rbSeed(id,x[1],x[2],x[3],[],'Active','Karan Shah',at,x[4]));
        const t=w.teams.find(function(y){return y.name===x[0];});if(t){t.tpl=id;wsNote(w,x[0]+' given the '+x[1]+' template.');}
        codes[x[0]]=x[3].length;
      });
      /* A template for each designation of the Expense Management Team (product owner, 12 Nov 2026), listed first in
         RBAC → Templates: what that designation may do, module by module. Shown, not applied: the team carries no access. */
      const DES=[
        ['Reporting Manager',['Reporting Manager Access','Expense Team Approver','Advance Team Approver','Budget Approval (Reporting Manager)','Card Approval (Reporting Manager)'],
          'Approves the claims, advances, budget requests and card requests of the people who report to them.'],
        ['Approver',['Expense Approver','Advance Team Approver','Card Approver'],'Reviews and approves claims and advances at their approval step, and the card requests sent to them.'],
        ['Finance Approver',['Expense Finance Administrator','Advance Finance Administrator','Budget Approver','Funding Verifier','Finance Admin Access'],
          'The finance review: approves claims and advances for payment, runs reimbursements and disbursements, approves budgets and verifies funding.'],
        ['Manager',['Expense Management Administrator','Budget Owner','Card Administrator'],'Runs expense management for the company: policies and limits, wallets and cards, approval routes and reports.'],
        ['Reviewer',['Expense Compliance Review','Advance Compliance Review','Budget Compliance Review','Card Compliance Review'],'Reads and reviews claims, advances, budgets and card activity for compliance; changes nothing.'],
        ['Verifier',['Card Load Verifier','Funding Verifier'],'Verifies card loads and funding entries before money moves.'],
        ['Member',['Expense Claimant','Advance Requester','Cardholder Self-Service','Benefits Self Service','Budget Self Service'],'Raises their own claims, advances and card requests, and sees their own wallets and benefits.']];
      DES.forEach(function(x){
        if(rbacTemplatesData.some(function(t){return t.emsDesig===x[0];}))return;
        const id=rbacTemplatesData.reduce(function(m,t){return Math.max(m,t.id);},0)+1;
        const EMSM=['Expenses','Advances','Budgets','Cards','Benefits','Finance'];   // the expense system's modules only, no imprest
        const perms=uniq(fromTpl(x[1])).filter(function(c){const m=RB_PERM[c];return m&&EMSM.indexOf(m.module)>=0&&!/imprest/i.test(c+' '+m.area);});
        const t=rbSeed(id,x[0],'Expenses',perms,[],'Active','Karan Shah',at,x[2]+' Designation in the Expense Management Team.');
        t.emsDesig=x[0];t.emsTeam='Expense Management Team';rbacTemplatesData.push(t);codes[x[0]]=t.perms.length;
      });
      if(typeof emsClearCache==='function')emsClearCache();
      return w.teams.map(function(t){return t.name+' '+t.members.length;}).join(', ')+' · templates '+JSON.stringify(codes);});
    step('onboarding',function(){const who={'verified':ST};const done=[];
      PRES_PEOPLE.forEach(function(p){const e=emp(p[2]);if(!e)throw new Error('no employee '+p[2]);let g=0;
        if(p[0]==='Kabir'){S(RK);navigatePage('employees');openDeSidebar(e.id);
          while(g++<3){const n=empNextStep(e);if(!n.key)break;empOpenLogModal('de',e.id,n.key,'sb');const c=document.getElementById('desm-log-comment-inp');if(c)c.value=n.key==='doc-request'?'No documents are collected: the card KYC details are reviewed instead.':'Started';
            /* An EMS client: Kabir only submits his card KYC details; their approval completes onboarding (product owner, 9 Nov 2026). */
            if(n.key==='doc-request'){const nd=document.getElementById('desm-nodocs');if(nd)nd.checked=true;}
            empCommitLog('desm');if(empLogModal){empLogModal=null;throw new Error('Kabir '+n.key+': '+lastT);}if(n.key==='doc-request')break;}
          done.push('Kabir: onboarding started (card KYC to submit)');return;}
        while(empState(e).status!=='Active'&&g++<8){const n=empNextStep(e);if(!n.key)throw new Error(p[0]+' waits at '+(n.wait?n.wait.title:'-'));
          S(who[n.key]||RK);navigatePage('employees');openDeSidebar(e.id);empOpenLogModal('de',e.id,n.key,'sb');const c=document.getElementById('desm-log-comment-inp');if(c)c.value='Completed';
          const nd=document.getElementById('desm-nodocs');if(n.key==='doc-request'&&nd)nd.checked=true;['-skip-asset','-skip-it'].forEach(function(x){const el=document.getElementById('desm'+x);if(el)el.checked=true;});
          empCommitLog('desm');if(empLogModal){empLogModal=null;throw new Error(p[0]+' '+n.key+': '+lastT);}}
        done.push(p[0]);});return done.length+' processed';});
  }).then(function(){
    /* 3 · Company EMS configuration */
    stepOn('wallets',M1,'08:50',function(){presHoldAuto=true;S(KS);navigatePage('wallet-benefits');[['Corporate Expense'],['Meal'],['Fuel'],['Gift'],['Telecom'],['Reimbursement']].forEach(function(x){wbTab='wallets';renderADTPage();wbStartAdd();setCS('wbw-e-type',x[0]);wbFormHook();wbSubmitAdd(true);});
      /* Nova's own Health wallet, funded each month with the others; the card programme takes it later (health wallet). */
      wbTab='wallets';renderADTPage();wbStartAdd();setCS('wbw-e-type',WB_NEW_TYPE);wbFormHook();
      setIn('wbw-e-newName','Health');setIn('wbw-e-newCode','HLTH');setIn('wbw-e-newDesc','Health and wellness: pharmacies, clinics, diagnostics and gyms.');setIn('wbw-e-effFrom','2026-04-01');wbSubmitAdd(true);
      if(!wbType('HLTH'))throw new Error('Health wallet type: '+lastT);
      return wbWallets.filter(function(w){return w.entity===P.ent;}).map(function(w){return w.type+':'+w.status;}).join(',');});
    stepOn('benefit categories and policies',M1,'09:05',function(){
      /* Health & Wellness on the Health wallet (product owner, 12 Nov 2026), funded in the month's batch with the others. */
      [['Meal Allowance','NR-MEAL','Meal'],['Fuel Allowance','NR-FUEL','Fuel'],['Telecom Allowance','NR-TEL','Telecom'],['Festival Gift','NR-GIFT','Gift'],['Health & Wellness','NR-HLTH','Health']].forEach(function(x){wbTab='categories';renderADTPage();wbStartAdd();setIn('wbc-e-name',x[0]);setIn('wbc-e-code',x[1]);setCS('wbc-e-processing','Wallet-Funded');wbFormHook();
        const wopt=Array.prototype.map.call(document.querySelectorAll('#csw-wbc-e-wallet .cs-option'),function(o){return o.textContent.trim();}).find(function(t){return t.indexOf(x[2])===0;});if(wopt)setCS('wbc-e-wallet',wopt);
        const ec=document.getElementById('csw-wbc-e-expCat');if(ec){const o=Array.prototype.map.call(ec.querySelectorAll('.cs-option'),function(o){return o.textContent.trim();}).find(function(t){return t.indexOf({'Meal Allowance':'Meal','Fuel Allowance':'Fuel','Telecom Allowance':'Telephone'}[x[0]]||'~')===0;});if(o)setCS('wbc-e-expCat',o);}
        const ef=document.getElementById('wbc-e-effFrom');if(ef)ef.value='2026-04-01';wbSubmitAdd(true);});
      const cats=wbCategories.filter(function(c){return c.entity===P.ent;});if(cats.length<4)throw new Error('categories: '+lastT);
      [['Meal allowance - all employees',cats.find(function(c){return c.name==='Meal Allowance';}),'2200'],['Fuel allowance - all employees',cats.find(function(c){return c.name==='Fuel Allowance';}),'3000'],
       ['Telecom allowance - all employees',cats.find(function(c){return c.name==='Telecom Allowance';}),'1000'],['Festival gift - all employees',cats.find(function(c){return c.name==='Festival Gift';}),'5000','One-time'],
       ['Health & wellness - all employees',cats.find(function(c){return c.name==='Health & Wellness';}),'1500']].forEach(function(x){
        wbTab='policies';renderADTPage();wbStartAdd();setIn('wbp-e-name',x[0]);const lab=Array.prototype.map.call(document.querySelectorAll('#csw-wbp-e-category .cs-option'),function(o){return o.textContent.trim();}).find(function(t){return t.indexOf(x[1].name)===0;});
        setCS('wbp-e-category',lab);setCS('wbp-e-scope','Entity');wbFormHook();setCS('wbp-e-frequency',x[3]||'Monthly');wbFormHook();setIn('wbp-e-amount',x[2]);if(x[3]){const oc=document.getElementById('wbp-e-occasion');if(oc)oc.value=wbToday();}const ef=document.getElementById('wbp-e-effFrom');if(ef)ef.value=/Health/.test(x[0])?today.slice(0,7)+'-01':'2026-04-01';wbSubmitAdd(true);});   // Health & Wellness is new this month
      const pols=wbPolicies.filter(function(p){return p.entity===P.ent;});if(pols.length<4)throw new Error('policies: '+lastT);return cats.length+' categories, '+pols.length+' policies';});
    stepOn('benefit allocation',M1,'09:30',function(){presHoldAuto=false;S(KS);navigatePage('wallet-benefits');   // every policy exists: the system prepares the month's batch
      const b=wbBatches.find(function(x){return x.entity===P.ent&&x.period===today.slice(0,7);});if(!b)throw new Error('no batch prepared');
      if(b.status!=='Pending Approval'||['MEAL','FUEL','GIFT','TEL'].some(function(w){return !b.rows.some(function(r){return r.walletType===w;});}))throw new Error('batch '+b.key+' '+b.status+' without Meal, Fuel, Gift and Telecom');
      S(RM);navigatePage('wallet-benefits');wbTab='allocations';renderADTPage();wbOpen('a',b.id,'logs');setCS('wba-log-status-sel','Approved');setIn('wba-log-comment-inp','Checked against the headcount');wbCommitLog('a',b.id);return b.key+' '+b.status;});
    step('capping limit',function(){S(KS);navigatePage('capping-limit');startAddCap();setIn('cap-e-name','Meal - monthly limit');setCS('cap-e-cat','Meal Allowance');setCS('cap-e-level','Category-Wide');capFormHook();setCS('cap-e-period','Monthly');capFormHook();
      setCS('cap-e-enf','Warning');setCS('cap-e-cur','INR');setIn('cap-e-amt','2500');setIn('cap-e-from','2026-04-01');submitAddCap(true);
      const c=cappingData.find(function(x){return (x.entity||x.entityId)===P.ent;});if(!c)throw new Error('cap: '+lastT);return c.name+' '+c.status;});
    step('funding sources and entries',function(){S(KS);E('funding tracking',bgCfgSave(Object.assign({},bgCfg(),{fundingTracking:true,reason:'Track company funding for EMS payouts.'})));
      navigatePage('budgets');bgSetPageTab('funding');fbSubPick('sources');fbStart();setIn('fbf-name','Nova Operations Account');setCS('fbf-type','External Bank-Referenced');fbFormHook();setIn('fbf-bank','HDFC Bank');setIn('fbf-ref','50200012347731');setIn('fbf-code','NOVA-OPS');
      setCS('fbf-owner',idLabel(U(RM),fbOwnerPool()));fbFormSave();P.src=fbSources.filter(function(s){return s.entity===P.ent;})[0];if(!P.src)throw new Error('source: '+lastT);
      const src=function(o){return E(o.code,fbSourceSave(Object.assign({type:'External Bank-Referenced',currency:'INR',ownerUid:U(RM),enforcement:'Warning',effFrom:'2026-04-01'},o))).rec;};
      P.cardSrc=src({name:'Nova Card Funding Account',bank:'RBL Bank',maskedRef:'409000183356',code:'NOVA-CARD',desc:'Funds the corporate card loads.'});
      P.reserve=src({name:'Nova Reserve Account',bank:'ICICI Bank',maskedRef:'000405112908',code:'NOVA-RSV',desc:'Reserve for the quarter; tops up the operations account.'});
      /* Recorded by Rohan (Finance), checked by Neel (Funding Verifier): a second person always checks money in. */
      S(RM);const ft=function(source,type,amount,days,ref,desc,ev,o){o=o||{};return E(desc,fbTxnCreate(Object.assign({sourceId:source.id,type:type,amount:String(amount),date:typeof days==='string'?days:wbAddDays(today,-days),ref:ref,desc:desc,evidence:ev},o))).rec;};
      const ok=function(t){S(NA);E('verify '+t.key,fbTxnVerify(t.id));S(RM);};
      ok(ft(P.reserve,'Funding In',2500000,'2026-04-01','ICICI/RTGS/R0001982231','Opening balance - FY 2026-27 reserve','ICICI-credit-advice-Apr.pdf'));
      ok(ft(P.src,'Funding In',1000000,40,'HDFC/NEFT/N2750193842','Quarterly operating funds - Q3','HDFC-credit-advice-Oct.pdf'));
      ok(ft(P.cardSrc,'Funding In',500000,20,'RBL/IMPS/I8820456611','Card funding for November loads','RBL-credit-advice-Nov.pdf'));
      ok(ft(P.src,'Adjustment',1180,9,'HDFC/CHG/OCT26','Bank charges - October','HDFC-statement-Oct.pdf',{direction:'Decrease'}));
      ok(ft(P.reserve,'Adjustment',8450,9,'ICICI/INT/OCT26','Interest credited - October','ICICI-statement-Oct.pdf',{direction:'Increase'}));
      const rej=ft(P.src,'Funding In',200000,5,'HDFC/NEFT/N2750201177','Funds from Nova Holdings','HDFC-credit-advice.pdf');S(NA);E('reject '+rej.key,fbTxnReject(rej.id,'The reference does not match the bank statement; record it again with the correct reference.'));S(RM);
      const p1=ft(P.src,'Funding In',300000,2,'HDFC/RTGS/R0461177203','Top-up for November payouts','HDFC-credit-advice-Nov.pdf');
      const p2=ft(P.cardSrc,'Funding In',50000,1,'RBL/IMPS/I8820499012','Additional card funding - month end','RBL-credit-advice-Nov-2.pdf');
      return [P.src,P.cardSrc,P.reserve].map(function(x){return x.key;}).join(', ')+' · waiting for verification '+p1.key+', '+p2.key;});
    step('budgets',function(){S(KS);
      /* Budget Control on: claims and advances are checked against the department's budget (Warning: going over asks for a reason). */
      E('budget control',bgCfgSave(Object.assign({},bgCfg(),{control:true,enforcement:'Warning',reason:''})));
      [['cc','NR-SALES-W','Sales West','Sales',RS],['cc','NR-SALES-S','Sales South','Sales',RS],['cc','NR-STORE-OPS','Store Operations','Operations',AI],['cc','NR-FIN','Finance','Finance',RM],['cc','NR-PEOPLE','People','Human Resources',RK]].forEach(function(x){
        E(x[1],bgmSave(x[0],{code:x[1],name:x[2],dept:x[3],ownerUid:U(x[4]),effFrom:'2026-04-01'}));});
      [['project','PRJ-PUNE','Pune store expansion','Sales',RS,'2026-06-01','2027-03-31'],['project','PRJ-BLR','Bengaluru store launch','Operations',AI,'2026-09-01','2027-01-31']].forEach(function(x){
        E(x[1],bgmSave(x[0],{code:x[1],name:x[2],dept:x[3],ownerUid:U(x[4]),startDate:x[5],endDate:x[6]}));});
      S(RM);navigatePage('budgets');bgSetPageTab('budgets');
      const mk=function(name,dept,owner,amount){S(RM);navigatePage('budgets');bgSetPageTab('budgets');bgStart();setIn('bgf-name',name);setCS('bgf-type','Department');setCS('bgf-owner',idLabel(U(owner),bgOwnerPool()));
        setIn('bgf-amount',String(amount));setCS('bgf-enf','Warning');setIn('bgf-thr','80');setIn('bgf-from','2026-04-01');bgFormSave();
        const b=bgBudgets.find(function(x){return x.entity===P.ent&&x.title===name;});if(!b)throw new Error('budget '+name+': '+lastT);
        E('allocation '+name,bgAllocSave(b.id,{dept:dept,amount:amount}));return b;};
      const say=function(r,decision,reason){const st=caActiveStage(r);if(!st||!st.approvers.length)throw new Error(expKey(r)+': no approver');S(idEmail(st.approvers[0]));E(decision+' '+expKey(r),caDecide(r.id,{scope:'claim',decision:decision,reason:reason,comment:''}));S(RM);};
      const sales=mk('FY 2026-27 Sales Budget','Sales',RS,600000);E('submit',bgSubmit(sales.id));decide(sales,'Sales budget');
      const ops=mk('FY 2026-27 Operations Budget','Operations',AI,400000);S(RM);E('submit',bgSubmit(ops.id));decide(ops,'Operations budget');
      S(RM);const fin=mk('FY 2026-27 Finance Budget','Finance',RM,250000);E('submit',bgSubmit(fin.id));decide(fin,'Finance budget');
      S(RM);const hr=mk('FY 2026-27 HR Budget','Human Resources',RK,150000);E('submit',bgSubmit(hr.id));
      S(RM);const adm=mk('FY 2026-27 Administration Budget','Administration',RM,300000);
      S(RM);const cmp=mk('FY 2026-27 Compliance Budget','Compliance',RM,200000);E('submit',bgSubmit(cmp.id));say(cmp,'Reject','Compliance spend is covered by the Administration budget this year.');
      /* Budget changes: an increase approved, one waiting for approval, one rejected. */
      S(KS);const r1=E('Sales revision',bgRevisionCreate({budgetId:sales.id,proposedAmount:'650000',reason:'New Thane store opens in December: store visits and launch events.'},true)).rec;decide(r1,expKey(r1));
      S(KS);const r2=E('Operations revision',bgRevisionCreate({budgetId:ops.id,proposedAmount:'440000',reason:'Bengaluru store fit-out runs over the plan.'},true)).rec;
      S(KS);const r3=E('Finance revision',bgRevisionCreate({budgetId:fin.id,proposedAmount:'350000',reason:'Consultants for the finance system upgrade.'},true)).rec;say(r3,'Reject','Fund the system upgrade from next year\'s project budget.');
      S(RM);P.budget=sales;
      return [sales,ops,fin,hr,adm,cmp].map(function(b){return expKey(b)+' '+b.status;}).join(' · ')+' · changes '+[r1,r2,r3].map(function(r){return expKey(r)+' '+r.status;}).join(', ');});
    step('advance policy',function(){S(KS);const t=advTypesHere().find(function(x){return x.name==='Travel Advance';});
      E('policy',advPolicySave({name:'Travel advances',typeId:t.id,appliesTo:'Entity',scopeRef:'',currency:'INR',minAmt:'1000',maxAmt:'20000',maxOpen:'2',maxOutstanding:'40000',maxSettleDays:'30',restriction:'Warning',effFrom:'2026-04-01'},null,true));return 'Travel advances';});
    /* No imprest (petty cash) fund in Nova: not required (product owner, 10 Nov 2026). */
    /* Nova has run on these approval routes since the start of the previous month, so the cards issued then were approved
       on them (product owner, 11 Nov 2026). */
    step('approval routes in force',function(){const from=wbAddDays(M1,-1).slice(0,8)+'01';let n=0;
      caWorkflows.forEach(function(w){if(w.entity===P.ent&&(!w.effFrom||w.effFrom>from)){w.effFrom=from;n++;}});
      /* Card routes: Karan, the company admin, is the fallback when no one else may approve (for example Ananya's own card load,
         as she is the card approver). */
      let f=0;caWorkflows.forEach(function(w){if(w.entity!==P.ent||!/Card/.test(caWfKindOf(w)))return;(w.stages||[]).forEach(function(st){if(!st.fallback){st.fallback=U(KS);f++;}});});
      return n+' routes from '+from+' · '+f+' card stages with a fallback';});
    stepOn('card programme',wbAddDays(M1,-20),'10:00',function(){S(KS);navigatePage('settings');const wf=ccWfOptions('Card Request')[0];
      /* One multi-wallet card per employee (product owner, 10 Nov 2026): company spend, benefits and reimbursements are wallets
         of the same card. It is issued automatically to employees entitled to a benefit (held until Arjun's own request is prepared). */
      window.emsAutoIssueHold=true;
      P.prog=E('programme',ccProgSave({name:'Nova Multi Wallet Card',code:'NOVA-MULTI',provider:'rbl',type:'Multi-Wallet',forms:['Virtual','Physical'],currency:'INR',models:['Direct'],selfRequest:true,adminRequest:true,maxCards:1,
        fundingMode:'Hybrid',wallets:['CORP','MEAL','FUEL','GIFT','TEL','REIMB'],autoIssue:true,workflowId:wf&&wf.id,effFrom:'2026-04-01',funding:{sourceId:P.cardSrc.id},desc:'One RuPay prepaid card: Corporate Expense, Meal, Fuel, Gift, Telecom and Reimbursement wallets.'})).rec;/* Nova's card payments are the record: an expense claim is added only where one is needed, never required for every payment (product owner, 9 Nov 2026). */E('card expense policy',ccClaimPolSave({scope:'entity',requireClaim:'No',effFrom:wbToday(),reason:'Card payments are recorded automatically; an expense claim is added only when a business purpose or receipt is needed.'}));
      ctl('programme',P.prog.id,{perTxn:'25000',daily:'50000',monthly:'150000',annual:'1200000',international:'Restrict',mccBlock:'7995, 5813, 6051',countryAllow:'IN'},
        'Standard rules for every Nova card: no cash withdrawals, India only, and no gambling, bars or quasi-cash.');return P.prog.key+' '+P.prog.code+' · '+P.prog.wallets.join(', ');});
  }).then(function(){
    /* 4 · Connected records of the company's people */
    step('reimbursement (Meghna)',function(){S(MP);const c=file({title:'Client site visit - local travel',category:'Travel Reimbursement',line:line('Cab to client site and back',850,sub('Travel Reimbursement'),wbAddDays(today,-6),{merchant:'CityRide Cabs'})});
      decide(c,expKey(c));S(RM);E('route',caPaySetRoute(c.id,'Manual/External Payment','',null,P.src.id));E('payment',caPaySettle(c.id,{amount:String(caOutstanding(c)),date:today,source:'Illustrative'}));return expKey(c)+' '+c.pay.key+' '+c.pay.status+' (Illustrative)';});
    stepOn('KYC (Arjun)',wbAddDays(M1,-18),'09:30',function(){const a=emp(AR);S(RK);oncToggle(a.eid,'enroll');S(AR);empProfPersona={kind:'',id:null};profTab='onc-card';navigatePage('my-profile');oncStartEdit(a.eid);
      const V={aadhaar:'482759316045',docAadhaar:'Aadhaar Card.pdf',docPan:'PAN Card.pdf',title:'Mr',nameOnCard:'ARJUN RAO',pan:'ABCPR7314K',occupation:'Sales Executive',annualIncome:'Rs. 5 L to 10 L',sourceOfIncome:'Salaried',addr1:'Flat 12, Sea Breeze Apartments',addr2:'Andheri West',city:'Mumbai',state:'Maharashtra',pincode:'400053'};
      oncFields().forEach(function(f){if(f.src!=='onc'||f.type==='decl'||!oncShown(f)||!oncEditable(f))return;const id='onc-e-'+f.k;
        if(f.type==='select'){if(document.getElementById('csw-'+id)&&!getCSValue(id)&&f.opts&&f.opts.length)setCS(id,V[f.k]&&f.opts.indexOf(V[f.k])>=0?V[f.k]:f.opts[0]);}else{const el=document.getElementById(id);if(el&&!el.value&&V[f.k]!=null)el.value=V[f.k];}});
      oncSaveEdit();S(RK);oncReview(a.eid,true);S(AR);profTab='onc-card';navigatePage('my-profile');['declConsent','declPep','declTrue'].forEach(function(k){const el=document.getElementById('onc-d-'+k);if(el)el.checked=true;});oncAccept(a.eid);
      const st=oncStatus(oncEmpOf(a.eid),oncRec(a.eid));if(st!=='Ready for Card Enrollment')throw new Error(st+' · '+oncProblems(oncEmpOf(a.eid),oncRec(a.eid)).map(function(x){return x.k+': '+x.msg;}).join('; ')+' · pending '+JSON.stringify(oncRec(a.eid).pending||null).slice(0,200));return st;});
    step('KYC enrollment on (Kabir)',function(){S(RK);oncToggle(emp(KJ).eid,'enroll');return oncStatus(oncEmpOf(emp(KJ).eid),oncRec(emp(KJ).eid));});
    step('card (Arjun)',function(){const a=emp(AR),k=wbAddDays(M1,-18);
      const r=on(k,'10:15',function(){S(AR);return E('request',ccReqCreate({employeeEid:a.eid,programmeId:P.prog.id,cardType:'Virtual',reason:'Client and vendor spend',deliveryMode:'Office (work location)'},true)).rec;});
      on(k,'15:40',function(){decide(r,expKey(r));});
      const c=on(wbAddDays(k,1),'10:20',function(){S(RM);E('submit to provider',ccEnrSubmit(r.id,{note:''}));return ccCardOfReq(r);});
      on(wbAddDays(k,1),'16:05',function(){E('kyc',ccOutcomeRecord('kyc',r.id,{value:'Verified',source:'Illustrative'}));});
      on(wbAddDays(k,2),'11:10',function(){E('issuance',ccOutcomeRecord('issuance',c.id,{value:'Issued',source:'Illustrative',last4:'7314'}));});
      on(wbAddDays(k,2),'18:35',function(){E('activation',ccOutcomeRecord('activation',c.id,{value:'Confirmed',source:'Illustrative'}));});
      on(wbAddDays(k,4),'11:20',function(){ctl('card',c.id,{daily:'30000',monthly:'100000',blockedCats:['Team Outing','Books & Learning'],mccBlock:'5944'},
        'Field sales card: daily and monthly caps; team outings and learning are claimed, not paid by card; no jewellery.');});
      const l=on(dd(1),'09:30',function(){S(RM);return E('load',ccLoadCreate({cardId:c.id,wallet:'CORP',amount:'15000',currency:'INR',sourceId:P.cardSrc.id,reason:'Client visits this month',comments:''},true)).rec;});
      on(dd(1),'11:05',function(){decide(l,expKey(l));});
      on(dd(1),'12:15',function(){S(RM);E('execution',ccLoadExecRecord(l.id,{result:'Recorded',source:'Illustrative',note:''}));});
      S(RM);
      P.card=c;P.txn=E('transaction',ccTxnSimulate({cardId:c.id,wallet:'CORP',type:'Purchase',date:today,postDate:today,merchant:'Saffron Court Restaurant',amount:'2400',currency:'INR',reason:'Client dinner',mcc:'5812',country:'IN',channel:'POS'})).rec;
      S(AR);navigatePage('cards');ccSetPageTab('cards');ccTxnCreateExpense(P.txn.id);if(!expModalOpen||!expDraft)throw new Error('create expense: '+lastT);
      const d=expDraft;d.category='Office Events';d.title='Client dinner - Andheri account';d.just={};const fix=function(x){x.subCat=x.subCat||sub('Office Events');x.proof=x.proof||'receipt.pdf';};d.lines.forEach(fix);fix(d.line);
      let n=expensesData.length,g=0;do{renderADTPage();document.querySelectorAll('[data-epjust]').forEach(function(el){el.value='Client dinner';});submitAddExpense(true);}while(expensesData.length===n&&g++<2);
      if(expensesData.length===n)throw new Error('card claim: '+lastT);const x=expensesData[0];decide(x,expKey(x));ccMatchSync(P.ent);return expKey(r)+' · '+expKey(c)+' · '+expKey(l)+' · '+expKey(P.txn)+' · '+expKey(x)+' '+P.txn.matchStatus;});
  }).then(function(){
    const a=emp(AR);S(RM);
    const head=CCS_COLS.map(function(c){return c[1];}),row={empId:a.empId,programme:P.prog.code,last4:'7314',wallet:'CORP',ref:'ILLUSTRATIVE-NR-0001',date:today,postDate:today,merchant:'Saffron Court Restaurant',mcc:'5812',country:'IN',channel:'POS',type:'Purchase',status:'Posted',amount:'2400',currency:'INR',description:'Client dinner'};
    const csv=[head.join(','),CCS_COLS.map(function(c){return row[c[0]]||'';}).join(',')].join('\r\n');
    return ccStmtRead('Illustrative card statement.csv',new TextEncoder().encode(csv).buffer).then(function(p){step('statement and reconciliation',function(){
      const s=E('statement',ccStmtCreate(p,{programmeId:P.prog.id,scope:'Programme',sourceRef:'ILLUSTRATIVE-STMT-NR',periodFrom:wbAddDays(today,-7),periodTo:today,demo:true})).rec;
      (s.rows||[]).forEach(function(r){if(r.issue&&r.issue.kind==='near')E('link',ccStmtRowResolve(s.id,r.n,'link','Same transaction as the card activity already recorded'));});
      E('submit',ccStmtSubmit(s.id));S(NA);const v=ccStmtVerify(s.id);if(v&&v.error)throw new Error(v.error);S(RM);E('start',ccRecStart(s.id));ccRecSync(s);E('submit for sign-off',ccRecSubmit(s.id,'All rows matched'));
      S(SA);E('sign-off',ccRecSignoff(s.id,{decision:'Sign Off',notes:'All rows matched'}));return expKey(s)+' '+s.recon.status;});});
  }).then(function(){
    step('refund and dispute (Arjun)',function(){S(RM);const cr=E('refund',ccTxnSimulateCredit(P.txn.id,{kind:'Refund',amount:'400',reason:'Merchant refunded a service charge'})).rec;
      S(AR);const d=E('dispute',ccDspCreate({txnId:P.txn.id,reason:'Incorrect Amount',description:'Service charge added twice on the bill',evidence:'receipt.pdf',amount:'300'})).rec;
      S(RM);E('assign',ccDspAssign(d.id,null));E('review',ccDspReadyForProvider(d.id,'Bill shows the service charge twice'));E('provider',ccDspProviderSubmit(d.id,{}));E('outcome',ccDspOutcome(d.id,{result:'Resolved Against'}));E('close',ccDspClose(d.id,'The refund already covered the duplicated service charge'));
      return expKey(cr)+' · '+expKey(d)+' '+d.status;});
    /* Nova creates its own Health wallet type and adds it to the card programme after Arjun's card was issued: his card does
       not have it, so he can ask for it with a Wallet Request (product owner, 10 Nov 2026). */
    step('health wallet',function(){S(KS);navigatePage('wallet-benefits');
      if(!wbType('HLTH')){wbTab='wallets';renderADTPage();wbStartAdd();setCS('wbw-e-type',WB_NEW_TYPE);wbFormHook();
        setIn('wbw-e-newName','Health');setIn('wbw-e-newCode','HLTH');setIn('wbw-e-newDesc','Health and wellness: pharmacies, clinics, diagnostics and gyms.');setIn('wbw-e-effFrom','2026-04-01');wbSubmitAdd(true);}
      if(!wbType('HLTH'))throw new Error('Health wallet type: '+lastT);
      P.prog=E('add Health to the card',ccProgSave(Object.assign({},P.prog,{wallets:P.prog.wallets.concat(['HLTH'])}))).rec;
      return P.prog.code+' · '+P.prog.wallets.join(', ')+' · Arjun\'s card '+ccCardWallets(P.card).join(', ');});
    step('benefit wallets (Arjun)',function(){const a=emp(AR);S(RM);window.emsAutoIssueHold=false;
      const b=wbBatches.find(function(x){return x.entity===P.ent&&x.status==='Approved'&&x.period===today.slice(0,7);});if(!b)throw new Error('no approved batch');
      const rows=['MEAL','FUEL','GIFT','TEL'].map(function(w){const r=b.rows.find(function(x){return x.eid===a.eid&&x.walletType===w&&x.status==='Planned';});if(!r)throw new Error('no '+w+' allocation for Arjun');return r;});
      const g=on(M1,'10:00',function(){const g=ccBenefitGenerate(b.id,{sourceId:P.cardSrc.id,rowIds:rows.map(function(r){return r.id;})});if(g.error||g.created.length<4)throw new Error('benefit load: '+(g.error||(g.skipped[0]||{}).reason||'none'));
        g.created.forEach(function(l){E(l.wallet+' execution',ccLoadExecRecord(l.id,{result:'Recorded',source:'Illustrative',note:''}));});return g;});
      /* Arjun's card payments (FR-CC-01): with CTX-1001, seven in all; each is its own transaction and updates its wallet. */
      /* No fixed time of day: a payment never precedes the card's issuance in the prepared data; the order is the order recorded. */
      const pay=function(w,merchant,amount,mcc,time,reason){return E(merchant,ccTxnSimulate({cardId:P.card.id,wallet:w,type:'Purchase',date:today,postDate:today,merchant:merchant,amount:String(amount),currency:'INR',reason:reason,mcc:mcc,country:'IN',channel:'POS'})).rec;};
      const t=pay('CORP','City Cab Services',850,'4121','08:45','Cab to a client meeting');
      pay('CORP','Office Stationery',620,'5943','10:30','Stationery for the store team');
      pay('MEAL','Cafe Blue',180,'5814','11:15','Coffee');
      pay('CORP','Parking Services',230,'7523','13:05','Parking at the client office');
      pay('MEAL','Lunch House',240,'5812','13:40','Lunch');
      pay('FUEL','IndianOil Fuel Station',200,'5541','17:20','Fuel');
      return g.created.map(function(l){return expKey(l)+' '+l.wallet;}).join(', ')+' · '+expKey(t)+' and 5 more payments';});
    step('expense claims (Arjun)',function(){S(AR);
      const d0=wbAddDays(today,-5),d1=wbAddDays(today,-4),d2=wbAddDays(today,-3),tr='Travel Reimbursement',ts=sub(tr);
      /* Awaiting approval: two line items. */
      const c=file({title:'Store visits - Bengaluru',category:tr,lines:[line('Cab to Indiranagar store',420,ts,d0,{merchant:'CityRide Cabs'})],line:line('Cab back to office',390,ts,d0,{merchant:'CityRide Cabs'})});
      /* Draft: three line items, ready to submit. */
      navigatePage('expenses');expSetPageTab('all');startAddExpense();expDraft.title='Client visits - Whitefield and Electronic City';expDraft.category=tr;expDraft.just={};
      expDraft.lines=[line('Cab to Whitefield client office',540,ts,d1,{merchant:'CityRide Cabs'}),line('Cab to Electronic City client',610,ts,d2,{merchant:'CityRide Cabs'})];
      expDraft.line=line('Auto back to Koramangala',180,ts,d2,{merchant:'Local auto'});
      const n=expensesData.length;renderADTPage();submitAddExpense(false);if(expensesData.length===n)throw new Error('draft: '+lastT);const dr=expensesData[0];
      return expKey(c)+' '+c.status+' ('+c.lines.length+' items) · '+expKey(dr)+' '+dr.status+' ('+dr.lines.length+' items)';});
    step('travel advance and settlement (Arjun)',function(){S(AR);navigatePage('advances');advSetPageTab('advances');advStart();setCS('advf-type','Travel Advance');advFormHook();setIn('advf-title','Pune client visits');setIn('advf-amount','5000');setIn('advf-purpose','Hotel for two nights and local travel for client meetings at the Hinjewadi and Kharadi stores.');setIn('advf-req',wbAddDays(today,2));
      /* A complete request, as an employee fills it: the trip dates, cost centre, project, budget line, itinerary and a note. */
      setIn('advf-pf',wbAddDays(today,3));setIn('advf-pt',wbAddDays(today,5));if(document.getElementById('csw-advf-cc'))setCS('advf-cc','NR-SALES-W · Sales West');if(document.getElementById('csw-advf-prj'))setCS('advf-prj','PRJ-PUNE · Pune store expansion');advFormHook();   // Cost Centre / Project are no longer on the form (12 Nov)
      setIn('advf-notes','Hotel booked near Hinjewadi. Client meetings on day 1 and day 2; unspent cash returned within 7 days of coming back.');
      if(document.getElementById('csw-advf-pcat')){const o=Array.prototype.map.call(document.querySelectorAll('#csw-advf-pcat .cs-option'),function(x){return x.textContent.trim();});const pc=o.find(function(t){return /Travel|Accommodation/.test(t);});if(pc){setCS('advf-pcat',pc);advFormHook();}}
      advForm.proof='Pune_client_visits_itinerary.pdf';
      const n=advancesData.length;advFormSave(true);if(advancesData.length===n)throw new Error('advance: '+lastT);const a=advancesData[0];decide(a,expKey(a));
      S(RM);E('initiate',advDisbInitiate(a.id,{amount:5000,method:ADV_BASE_METHOD,account:'Salary account on file',sourceId:P.src.id}));S(KS);E('verify',advDisbVerify(a.id,a.disb.instructions[0].key,{amount:5000,date:today,source:'Illustrative'}));
      S(AR);const c=file({title:'Pune visit - hotel',category:'Travel Reimbursement',line:line('Hotel - 1 night',4200,sub('Travel Reimbursement'),today,{paidBy:'Company Advance',advanceId:a.id,advAmount:4200,merchant:'Harbour View Hotel'})});decide(c,expKey(c));
      return expKey(a)+' issued 5,000 (Illustrative) · '+expKey(c)+' settles 4,200';});
    /* More of Arjun's card spending (product owner, 9 Nov 2026): each payment its own transaction - one claimed from the card
       (approved, paid by the card, no reimbursement), one partly refunded. All are posted: a payment made with the card is recorded. */
    step('more card spending (Arjun)',function(){S(RM);
      const pay=function(w,merchant,amount,mcc,reason,ch){return E(merchant,ccTxnSimulate({cardId:P.card.id,wallet:w,type:'Purchase',date:today,postDate:today,merchant:merchant,amount:String(amount),currency:'INR',reason:reason,mcc:mcc,country:'IN',channel:ch||'POS'})).rec;};
      const hotel=pay('CORP','Hotel Ivory Inn - Pune',3200,'7011','Stay for the Pune client visits');
      pay('CORP','BluSmart Cabs',420,'4121','Airport drop');
      pay('MEAL','Chai Point',90,'5814','Tea');
      const amz=pay('CORP','Amazon Business',1150,'5943','Display stands for the store','E-commerce');
      pay('FUEL','HP Petrol Pump',500,'5541','Fuel');
      pay('CORP','Kinko Print & Copy',350,'7338','Client presentation prints');
      const pend=pay('CORP','Airport Parking',180,'7523','Parking at the airport');
      pay('TEL','Airtel Postpaid',599,'4814','Mobile bill');
      pay('GIFT','Croma Electronics',2500,'5732','Festival gift: headphones');
      const cr=E('refund',ccTxnSimulateCredit(amz.id,{kind:'Refund',amount:'150',reason:'One stand returned'})).rec;
      S(AR);navigatePage('cards');ccTxnCreateExpense(hotel.id);if(!expModalOpen||!expDraft)throw new Error('hotel claim: '+lastT);
      const d=expDraft;d.category='Accommodation';d.title='Pune client visit - hotel stay';d.just={};const fix=function(x){x.subCat='Accommodation';x.proof=x.proof||'hotel-invoice.pdf';};d.lines.forEach(fix);fix(d.line);
      let n=expensesData.length,g=0;do{renderADTPage();document.querySelectorAll('[data-epjust]').forEach(function(el){el.value='Client visit stay';});submitAddExpense(true);}while(expensesData.length===n&&g++<2);
      if(expensesData.length===n)throw new Error('hotel claim: '+lastT);const x=expensesData[0];decide(x,expKey(x));ccMatchSync(P.ent);
      return expKey(hotel)+' … '+expKey(pend)+' '+pend.status+' · refund '+expKey(cr)+' · '+expKey(x)+' '+x.status;});
    /* Meghna's card enrollment details are ready: her multi-wallet card is issued automatically (enrollment pending). */
    step('KYC (Meghna)',function(){const r=emp(MP);S(RK);oncToggle(r.eid,'enroll');S(MP);empProfPersona={kind:'',id:null};profTab='onc-card';navigatePage('my-profile');oncStartEdit(r.eid);
      const V={aadhaar:'638104527719',docAadhaar:'Aadhaar Card.pdf',docPan:'PAN Card.pdf',title:'Ms',nameOnCard:'MEGHNA PILLAI',pan:'ABCPP5532M',occupation:'Operations Executive',annualIncome:'Rs. 5 L to 10 L',sourceOfIncome:'Salaried',addr1:'Flat 21, Lake View Residency',addr2:'Powai',city:'Mumbai',state:'Maharashtra',pincode:'400076'};
      oncFields().forEach(function(f){if(f.src!=='onc'||f.type==='decl'||!oncShown(f)||!oncEditable(f))return;const id='onc-e-'+f.k;
        if(f.type==='select'){if(document.getElementById('csw-'+id)&&!getCSValue(id)&&f.opts&&f.opts.length)setCS(id,V[f.k]&&f.opts.indexOf(V[f.k])>=0?V[f.k]:f.opts[0]);}else{const el=document.getElementById(id);if(el&&!el.value&&V[f.k]!=null)el.value=V[f.k];}});
      oncSaveEdit();S(RK);oncReview(r.eid,true);S(MP);profTab='onc-card';navigatePage('my-profile');['declConsent','declPep','declTrue'].forEach(function(k){const el=document.getElementById('onc-d-'+k);if(el)el.checked=true;});oncAccept(r.eid);
      const st=oncStatus(oncEmpOf(r.eid),oncRec(r.eid));if(st!=='Ready for Card Enrollment')throw new Error('Meghna '+st+' · '+lastT);
      S(RM);emsAutoIssueSync();const auto=ccRequests.filter(function(x){return x.employeeEid===r.eid&&x.mode==='Automatic';});
      return st+' · '+auto.map(function(x){return expKey(x)+' '+(ccProg(x.programmeId)||{}).code+' '+ccReqTrack(x);}).join(', ');});
    /* Two more cardholders, so Card Loads shows several people (product owner, 10 Nov 2026): Ritu Sen (a manager) and Vivek Menon.
       Their KYC is done in the app; their cards are issued automatically (they are entitled to the benefits) and their benefit
       wallets are loaded from this month's allocation. */
    step('more cardholders (Ritu, Vivek)',function(){
      const people=[[RS,{title:'Ms',nameOnCard:'RITU SEN',pan:'ABCPS4821L',occupation:'Sales Manager',annualIncome:'Rs. 10 L to 25 L',sourceOfIncome:'Salaried',addr1:'Flat 4B, Palm Grove',addr2:'Bandra West',city:'Mumbai',state:'Maharashtra',pincode:'400050'},'2648'],
        [VM,{title:'Mr',nameOnCard:'VIVEK MENON',pan:'ABCPM6194Q',occupation:'Finance Controller',annualIncome:'Rs. 10 L to 25 L',sourceOfIncome:'Salaried',addr1:'B-702, Lake Homes',addr2:'Powai',city:'Mumbai',state:'Maharashtra',pincode:'400076'},'3907']];
      /* Their card details are completed in the last days of the previous month; the cards are issued automatically on the 1st,
         once the month's benefits are approved (the benefit wallets start that day), and loaded the same morning. */
      const made=people.map(function(x,i){
        const e=on(wbAddDays(M1,-3+i),'11:00',function(){return kyc(x[0],x[1]);});
        const r=on(M1,'09:4'+(i*3),function(){S(RM);emsAutoIssueSync();
          const r=ccRequests.find(function(q){return q.employeeEid===e.eid&&q.mode==='Automatic';});if(!r)throw new Error('no automatic card for '+e.name);
          E(e.name+' enrollment',ccEnrSubmit(r.id,{note:''}));return r;});const c=ccCardOfReq(r);
        on(M1,'09:5'+(i*3),function(){E('kyc',ccOutcomeRecord('kyc',r.id,{value:'Verified',source:'Illustrative'}));E('issuance',ccOutcomeRecord('issuance',c.id,{value:'Issued',source:'Illustrative',last4:x[2]}));});
        on(M1,'10:1'+i,function(){E('activation',ccOutcomeRecord('activation',c.id,{value:'Confirmed',source:'Illustrative'}));});return c;});
      P.cardRitu=made[0];P.cardVivek=made[1];
      on(M1,'10:40',function(){ctl('card',P.cardVivek.id,{perTxn:'10000',monthly:'75000',blockedCats:['Team Outing','Office Events']},
        'Finance controller card: single payments up to 10,000 and 75,000 a month; outings and events are claimed, not paid by card.');});
      S(RM);const b=wbBatches.find(function(x){return x.entity===P.ent&&x.status==='Approved'&&x.period===today.slice(0,7);});
      const eids=[P.cardRitu.employeeEid,P.cardVivek.employeeEid],ids=b.rows.filter(function(r){return eids.indexOf(r.eid)>=0&&r.status==='Planned'&&r.walletType;}).map(function(r){return r.id;});
      const g=on(M1,'10:30',function(){const g=ccBenefitGenerate(b.id,{sourceId:P.cardSrc.id,rowIds:ids});if(g.error)throw new Error('benefit loads: '+g.error);
        g.created.forEach(function(l){E(expKey(l)+' execution',ccLoadExecRecord(l.id,{result:'Recorded',source:'Illustrative',note:''}));});return g;});
      const pay=function(c,w,merchant,amount,mcc,reason){return E(merchant,ccTxnSimulate({cardId:c.id,wallet:w,type:'Purchase',date:today,postDate:today,merchant:merchant,amount:String(amount),currency:'INR',reason:reason,mcc:mcc,country:'IN',channel:'POS'})).rec;};
      pay(P.cardRitu,'MEAL','Cafe Coffee Day',320,'5814','Team coffee');pay(P.cardVivek,'FUEL','Shell Petrol Station',1200,'5541','Fuel');
      return expKey(P.cardRitu)+' •••• 2648 · '+expKey(P.cardVivek)+' •••• 3907 · '+g.created.length+' benefit loads';});
    /* Card Loads in every state Finance works with (product owner, 10 Nov 2026): recorded, approved and waiting to be recorded,
       failed at the bank, rejected, sent back for more information, and two waiting for approval - to approve or reject live. */
    step('card loads (Finance)',function(){
      const L=function(card,amount,reason){S(RM);return E(reason,ccLoadCreate({cardId:card.id,wallet:'CORP',amount:String(amount),currency:'INR',sourceId:P.cardSrc.id,reason:reason,comments:''},true)).rec;};
      const rec=function(l,res,note){S(RM);E('execution '+expKey(l),ccLoadExecRecord(l.id,{result:res,source:'Illustrative',note:note||''}));};
      const say=function(l,decision,reason){const st=caActiveStage(l);if(!st||!st.approvers.length)throw new Error(expKey(l)+': no approver');S(idEmail(st.approvers[0]));E(decision+' '+expKey(l),caDecide(l.id,{scope:'claim',decision:decision,reason:reason,comment:''}));};
      const l1=on(dd(3),'09:40',function(){return L(P.cardRitu,8000,'Client workshop - Bengaluru');});on(dd(3),'12:10',function(){decide(l1,expKey(l1));});on(dd(3),'15:00',function(){rec(l1,'Recorded');});
      const l2=L(P.cardVivek,12000,'Quarter-end vendor visits');decide(l2,expKey(l2));
      const l3=L(P.cardRitu,2500,'Courier and stationery for the store launch');decide(l3,expKey(l3));rec(l3,'Failed','The bank declined the load: the card\'s daily load limit was reached.');
      const l4=L(P.card,25000,'Team offsite - Lonavala');say(l4,'Reject','Too large for one load; raise a travel advance for the offsite.');
      const l5=L(P.cardRitu,4000,'Trade fair stall - Mumbai');say(l5,'Follow-Up','Add the event invitation and the dates of the fair.');
      const l6=L(P.card,3000,'Delhi store visit');const l7=L(P.cardVivek,6500,'Auditor visit - hospitality');
      return [l1,l2,l3,l4,l5,l6,l7].map(function(l){return expKey(l)+' '+ccLoadLabel(l);}).join(' · ');});
    /* A month of card payments for Arjun, Ritu and Vivek (product owner, 11 Nov 2026; Kabir's card is made live in the
       walkthrough): everyday merchants on their wallets, a refund, a declined payment and one awaiting authorization.
       Each stays within what its wallet holds; company-wallet payments come after that wallet was loaded. */
    step('card payments this month',function(){S(RM);
      const ent=entitiesData.find(function(x){return x.entityId===P.ent;});if(ent&&!ent.timezone)ent.timezone='Asia/Kolkata';
      const tz=entTimezone(P.ent);
      const pay=function(c,day,time,w,merchant,amount,mcc,reason,ch,auth){return on(day,time,function(){S(RM);return E(merchant,ccTxnSimulate(Object.assign({cardId:c.id,wallet:w,type:auth?'Authorization':'Purchase',date:day,merchant:merchant,amount:String(amount),currency:'INR',reason:reason,mcc:mcc,country:'IN',channel:ch||'POS'},
        auth?{}:{postDate:day},tz&&day<today?{time:time,tz:tz}:{}))).rec;});};
      const decline=function(t,day,time,why){on(day,time,function(){S(RM);E('decline '+t.merchant,ccTxnVoid(t.id,{outcome:'Declined',reason:why,ref:'DECL-'+String(t.id).padStart(4,'0')}));});return t;};
      const A=P.card,R=P.cardRitu,V=P.cardVivek;
      /* Arjun: his company wallet was loaded on the 2nd. */
      pay(A,dd(2),'09:10','CORP','Uber India',460,'4121','Cab to the Andheri client office');
      pay(A,dd(2),'13:20','MEAL','Swiggy',285,'5812','Lunch','E-commerce');
      pay(A,dd(3),'18:30','FUEL','HP Petrol Pump - Andheri',1000,'5541','Fuel');
      pay(A,dd(4),'11:45','CORP','Starbucks Coffee',520,'5814','Coffee with a client');
      pay(A,dd(5),'13:10','MEAL','Zomato',340,'5812','Lunch','E-commerce');
      const bd=pay(A,dd(7),'15:30','CORP','Blue Dart Express',640,'4215','Courier of signed contracts');
      pay(A,dd(8),'20:00','MEAL','Subway',210,'5814','Dinner');
      /* Ritu: her company wallet was loaded on the 4th. */
      const sw=pay(R,dd(1),'13:05','MEAL','Swiggy',420,'5812','Team lunch','E-commerce');
      on(dd(2),'10:00',function(){S(RM);E('refund',ccTxnSimulateCredit(sw.id,{kind:'Refund',amount:'120',reason:'An item was missing from the order'}));});
      pay(R,dd(2),'09:40','FUEL','Indian Oil - Bandra',1500,'5541','Fuel');
      pay(R,dd(3),'19:25','TEL','Jio Postpaid',799,'4814','Mobile bill','E-commerce');
      pay(R,dd(4),'12:50','CORP','Uber India',640,'4121','Cab to a client in Lower Parel');
      pay(R,dd(5),'13:30','CORP','The Bombay Canteen',2850,'5812','Client lunch');
      pay(R,dd(6),'18:05','GIFT','Tanishq',4500,'5944','Festival gift');
      pay(R,dd(7),'11:20','CORP','FedEx Express',1180,'4215','Courier of product samples');
      const zr=pay(R,dd(8),'14:05','MEAL','Zomato',365,'5812','Lunch','E-commerce');
      decline(pay(R,dd(9),'21:30','GIFT','Croma Electronics',1200,'5732','Festival gift','POS',true),dd(9),'21:31','Insufficient balance in the Gift wallet');
      pay(R,today,'','MEAL','Starbucks Coffee',310,'5814','Coffee','POS',true);
      /* Vivek: benefit wallets only (his company load awaits execution). */
      pay(V,dd(1),'08:50','FUEL','BPCL - Powai',1000,'5541','Fuel');
      pay(V,dd(2),'13:15','MEAL','Haldiram\'s',260,'5812','Lunch');
      pay(V,dd(3),'20:40','TEL','Airtel Postpaid',699,'4814','Mobile bill','E-commerce');
      pay(V,dd(4),'12:30','MEAL','Zomato',410,'5812','Lunch','E-commerce');
      const az=pay(V,dd(6),'16:10','GIFT','Amazon.in',3299,'5999','Festival gift','E-commerce');
      pay(V,dd(8),'13:05','MEAL','Subway',230,'5814','Lunch');
      decline(pay(V,dd(8),'19:00','GIFT','Reliance Digital',2499,'5732','Festival gift','POS',true),dd(8),'19:01','Insufficient balance in the Gift wallet');
      pay(V,today,'','MEAL','Third Wave Coffee',220,'5814','Coffee','POS',true);
      /* More of the month's everyday payments (product owner, 11 Nov 2026), each within its wallet. */
      pay(A,dd(6),'10:15','CORP','Ola Cabs',380,'4121','Cab to the Bandra client office','E-commerce');
      pay(A,dd(6),'20:30','MEAL','Domino\'s Pizza',349,'5814','Dinner','E-commerce');
      pay(A,dd(9),'09:40','CORP','WeWork - BKC',899,'7399','Meeting room for a client pitch');
      pay(A,dd(9),'17:45','FUEL','Shell - Lokhandwala',800,'5541','Fuel');
      pay(R,dd(5),'09:15','CORP','Rapido',145,'4121','Bike taxi to the Khar store','E-commerce');
      pay(R,dd(7),'13:00','MEAL','Chaayos',210,'5814','Lunch');
      pay(R,dd(8),'18:40','CORP','Staples India',1240,'5943','Display material for the store');
      pay(R,dd(9),'12:20','FUEL','HP Petrol Pump - Khar',900,'5541','Fuel');
      pay(V,dd(5),'19:10','MEAL','Swiggy',330,'5812','Dinner','E-commerce');
      pay(V,dd(7),'08:30','FUEL','Indian Oil - Powai',500,'5541','Fuel');
      pay(V,dd(9),'13:30','MEAL','Haldiram\'s',240,'5812','Lunch');
      /* Three open disputes, each raised by the cardholder and under Rohan's review, ready to be marked resolved. */
      const dsp=function(email,t,day,time,reason,desc,ev,amount,aDay,aTime){
        const d=on(day,time,function(){S(email);return E('dispute '+t.merchant,ccDspCreate({txnId:t.id,reason:reason,description:desc,evidence:ev,amount:String(amount)})).rec;});
        on(aDay,aTime,function(){S(RM);E('assign '+expKey(d),ccDspAssign(d.id,null));});return d;};
      const d1=dsp(AR,bd,dd(8),'10:30','Incorrect Amount','The receipt shows 440 for the courier; the card was charged 640.','bluedart-receipt.pdf',200,dd(8),'15:00');
      const d2=dsp(VM,az,dd(9),'11:00','Goods/Services Not Received','The festival gift order was never delivered; Amazon shows it as lost in transit.','amazon-order-status.pdf',3299,dd(9),'16:20');
      const d3=dsp(RS,zr,dd(9),'09:20','Incorrect Amount','The bill total was 245; the card was charged 365.','zomato-bill.pdf',120,dd(9),'12:45');
      S(RM);
      ccMatchSync(P.ent);
      return [A,R,V].map(function(c){return expKey(c)+' '+ccTxnsOfCard(c.id).length+' transactions';}).join(' · ')+' · disputes '+[d1,d2,d3].map(function(d){return expKey(d)+' '+d.status;}).join(', ');});
    /* More cardholders (product owner, 11 Nov 2026): Nova's other staff and the eight new employees. Their card details are
       completed in the last days of the previous month; on the 1st the cards are issued automatically once the month's
       benefits are approved, activated and loaded. Ananya and Neel also get company money for travel and bank visits. All
       cards are Active. Two payments are disputed: Neel's Uber ride charged twice, Ananya's cancelled IndiGo flight. */
    step('more cardholders and payments',function(){
      const H=[
        [AI,{title:'Ms',occupation:'Operations Manager',addr1:'C-1104, Hiranandani Gardens',addr2:'Powai',city:'Mumbai',pincode:'400076'},'5126','ABCPI3317F'],
        [RM,{title:'Mr',occupation:'Finance Manager',addr1:'602, Shanti Kunj',addr2:'Thane West',city:'Thane',pincode:'400601'},'8843','ABCPM2208D'],
        [NA,{title:'Mr',occupation:'Finance Executive',addr1:'14, Laxmi Niwas',addr2:'Vile Parle East',city:'Mumbai',pincode:'400057'},'2290','ABCPA6624H'],
        [ST,{title:'Ms',occupation:'Compliance Officer',addr1:'B-503, Orchid Heights',addr2:'Andheri West',city:'Mumbai',pincode:'400058'},'6618','ABCPT5530K'],
        [IK,{title:'Mr',occupation:'IT Manager',addr1:'301, Al Noor Apartments',addr2:'Kurla West',city:'Mumbai',pincode:'400070'},'4471','ABCPK4719M'],
        [RK,{title:'Ms',occupation:'HR Manager',addr1:'9, Sea Glimpse',addr2:'Bandra West',city:'Mumbai',pincode:'400050'},'9035','ABCPK8051R'],
        ['rahul.verma@novaretail.in',{title:'Mr',occupation:'Sales Executive',addr1:'A-208, Sunshine Residency',addr2:'Goregaon East',city:'Mumbai',pincode:'400063'},'3384','ABCPV1146C'],
        ['sneha.kulkarni@novaretail.in',{title:'Ms',occupation:'Store Manager',addr1:'Flat 7, Shubham Apartments',addr2:'Baner',city:'Pune',state:'Maharashtra',pincode:'411045'},'7752','ABCPK2963E'],
        ['aditya.shah@novaretail.in',{title:'Mr',occupation:'Area Sales Manager',addr1:'1202, Raheja Classique',addr2:'Juhu',city:'Mumbai',pincode:'400049'},'1069','ABCPS7782L'],
        ['pooja.desai@novaretail.in',{title:'Ms',occupation:'Visual Merchandiser',addr1:'4, Parle Colony',addr2:'Vile Parle West',city:'Mumbai',pincode:'400056'},'5590','ABCPD3395N'],
        ['farhan.qureshi@novaretail.in',{title:'Mr',occupation:'Sales Executive',addr1:'18, Noor Manzil',addr2:'Kurla East',city:'Mumbai',pincode:'400024'},'8217','ABCPQ6408P'],
        ['divya.krishnan@novaretail.in',{title:'Ms',occupation:'Finance Executive',addr1:'D-45, Lake Homes',addr2:'Powai',city:'Mumbai',pincode:'400076'},'6403','ABCPK9172S'],
        ['karthik.reddy@novaretail.in',{title:'Mr',occupation:'Store Manager',addr1:'221, 5th Cross, Koramangala',addr2:'4th Block',city:'Bengaluru',state:'Karnataka',pincode:'560034'},'2958','ABCPR4826T'],
        ['nisha.gupta@novaretail.in',{title:'Ms',occupation:'HR Executive',addr1:'B-12, Evershine Nagar',addr2:'Malad West',city:'Mumbai',pincode:'400064'},'4136','ABCPG5517V']];
      /* 1 · Card details, checked by HR */
      const ppl=H.map(function(h,i){const e=emp(h[0]);
        const V=Object.assign({nameOnCard:String(e.name).toUpperCase(),pan:h[3],annualIncome:/Manager|Controller|Officer/.test(h[1].occupation)?'Rs. 10 L to 25 L':'Rs. 5 L to 10 L',sourceOfIncome:'Salaried',state:'Maharashtra'},h[1]);
        on(wbAddDays(M1,-3+(i%3)),(10+(i%6))+':'+(i%2?'15':'40'),function(){return kyc(h[0],V);});return {h:h,e:e};});
      /* 2 · The cards: issued automatically on the 1st, then activated */
      on(M1,'10:40',function(){S(RM);emsAutoIssueSync();});
      ppl.forEach(function(x,i){
        const r=ccRequests.find(function(q){return q.employeeEid===x.e.eid&&q.mode==='Automatic';});if(!r)throw new Error('no automatic card for '+x.e.name);x.r=r;
        on(M1,'10:4'+(i%10),function(){S(RM);E(x.e.name+' enrollment',ccEnrSubmit(r.id,{note:''}));});x.c=ccCardOfReq(r);
        on(M1,'11:0'+(i%10),function(){E('kyc',ccOutcomeRecord('kyc',r.id,{value:'Verified',source:'Illustrative'}));E('issuance',ccOutcomeRecord('issuance',x.c.id,{value:'Issued',source:'Illustrative',last4:x.h[2]}));});
        on(M1,'11:2'+(i%10),function(){E('activation',ccOutcomeRecord('activation',x.c.id,{value:'Confirmed',source:'Illustrative'}));});});
      /* 3 · This month's benefits on every new card */
      const b=wbBatches.find(function(x){return x.entity===P.ent&&x.status==='Approved'&&x.period===today.slice(0,7);});
      const eids=ppl.map(function(x){return x.e.eid;}),ids=b.rows.filter(function(r){return eids.indexOf(r.eid)>=0&&r.status==='Planned'&&r.walletType;}).map(function(r){return r.id;});
      on(M1,'11:45',function(){S(RM);const g=ccBenefitGenerate(b.id,{sourceId:P.cardSrc.id,rowIds:ids});if(g.error)throw new Error('benefit loads: '+g.error);
        g.created.forEach(function(l){E(expKey(l)+' execution',ccLoadExecRecord(l.id,{result:'Recorded',source:'Illustrative',note:''}));});});
      /* 4 · Company money: Ananya's Bengaluru store audit, Neel's bank and vendor visits */
      const card=function(email){return ppl.find(function(x){return x.h[0]===email;}).c;};
      const corp=function(c,amount,reason){const l=on(dd(1),'09:50',function(){S(RM);return E(reason,ccLoadCreate({cardId:c.id,wallet:'CORP',amount:String(amount),currency:'INR',sourceId:P.cardSrc.id,reason:reason,comments:''},true)).rec;});
        on(dd(1),'12:30',function(){decide(l,expKey(l));});on(dd(1),'16:10',function(){S(RM);E('execution '+expKey(l),ccLoadExecRecord(l.id,{result:'Recorded',source:'Illustrative',note:''}));});return l;};
      corp(card(AI),20000,'Bengaluru store audit - travel and stay');corp(card(NA),5000,'Bank and vendor visits this month');
      /* 5 · A month of payments */
      const tz=entTimezone(P.ent);
      const pay=function(c,day,time,w,merchant,amount,mcc,reason,ch){return on(day,time,function(){S(RM);return E(merchant,ccTxnSimulate(Object.assign({cardId:c.id,wallet:w,type:'Purchase',date:day,postDate:day,merchant:merchant,amount:String(amount),currency:'INR',reason:reason,mcc:mcc,country:'IN',channel:ch||'POS'},
        tz&&day<today?{time:time,tz:tz}:{}))).rec;});};
      const P2=[
        [AI,[[3,'10:05','CORP','IndiGo',6840,'4511','Flight to Bengaluru for the store audit','E-commerce'],[4,'09:30','CORP','Air India',7250,'4511','Rebooked flight to Bengaluru','E-commerce'],[5,'21:15','CORP','Lemon Tree Hotel - Whitefield',4200,'7011','Stay for the store audit'],[5,'13:20','MEAL','Swiggy',310,'5812','Lunch','E-commerce'],[7,'18:40','FUEL','Indian Oil - Powai',1200,'5541','Fuel']]],
        [RM,[[2,'09:10','MEAL','Chaayos',180,'5814','Breakfast'],[3,'20:05','TEL','Airtel Postpaid',799,'4814','Mobile bill','E-commerce'],[6,'08:45','FUEL','HP Petrol Pump - Thane',2000,'5541','Fuel'],[7,'19:30','GIFT','Amazon.in',2999,'5999','Festival gift','E-commerce']]],
        [NA,[[3,'13:10','MEAL','Zomato',280,'5812','Lunch','E-commerce'],[4,'19:00','TEL','Jio Postpaid',599,'4814','Mobile bill','E-commerce'],[5,'18:20','CORP','Uber India',412,'4121','Cab to the bank branch','E-commerce'],[5,'18:21','CORP','Uber India',412,'4121','Cab to the bank branch','E-commerce'],[8,'12:40','CORP','Blue Dart Express',360,'4215','Courier of signed cheques']]],
        [ST,[[2,'13:00','MEAL','Haldiram\'s',220,'5812','Lunch'],[4,'08:30','FUEL','Shell - Andheri',1500,'5541','Fuel'],[6,'17:45','GIFT','Croma Electronics',3499,'5732','Festival gift'],[8,'13:15','MEAL','Subway',260,'5814','Lunch']]],
        [IK,[[3,'11:20','TEL','Airtel Postpaid',999,'4814','Mobile bill','E-commerce'],[4,'20:30','MEAL','Domino\'s Pizza',420,'5814','Dinner','E-commerce'],[7,'09:05','FUEL','BPCL - Powai',1800,'5541','Fuel'],[8,'16:50','GIFT','Amazon.in',4299,'5999','Festival gift','E-commerce']]],
        [RK,[[2,'10:15','MEAL','Starbucks Coffee',340,'5814','Coffee'],[5,'18:10','GIFT','Tanishq',4800,'5944','Festival gift'],[6,'19:40','TEL','Jio Postpaid',799,'4814','Mobile bill','E-commerce'],[9,'08:55','FUEL','Indian Oil - Bandra',1000,'5541','Fuel']]],
        ['rahul.verma@novaretail.in',[[2,'13:30','MEAL','Swiggy',260,'5812','Lunch','E-commerce'],[4,'09:15','FUEL','HP Petrol Pump - Goregaon',1200,'5541','Fuel'],[6,'18:00','TEL','Airtel Postpaid',599,'4814','Mobile bill','E-commerce']]],
        ['sneha.kulkarni@novaretail.in',[[3,'13:45','MEAL','Vaishali Restaurant',380,'5812','Lunch'],[5,'08:50','FUEL','Indian Oil - Baner',1500,'5541','Fuel'],[8,'20:10','GIFT','Amazon.in',1999,'5999','Festival gift','E-commerce']]],
        ['aditya.shah@novaretail.in',[[2,'09:40','MEAL','Chaayos',190,'5814','Breakfast'],[4,'21:00','TEL','Jio Postpaid',799,'4814','Mobile bill','E-commerce'],[7,'08:20','FUEL','Shell - Juhu',2200,'5541','Fuel']]],
        ['pooja.desai@novaretail.in',[[3,'13:05','MEAL','Zomato',450,'5812','Lunch','E-commerce'],[6,'17:30','GIFT','Lifestyle Stores',2800,'5651','Festival gift'],[8,'09:10','FUEL','BPCL - Vile Parle',900,'5541','Fuel']]],
        ['farhan.qureshi@novaretail.in',[[2,'08:40','FUEL','HP Petrol Pump - Kurla',1000,'5541','Fuel'],[5,'13:25','MEAL','Subway',240,'5814','Lunch'],[7,'19:15','TEL','Airtel Postpaid',449,'4814','Mobile bill','E-commerce']]],
        ['divya.krishnan@novaretail.in',[[3,'13:10','MEAL','Haldiram\'s',210,'5812','Lunch'],[6,'18:30','GIFT','Tanishq',4500,'5944','Festival gift'],[8,'20:45','TEL','Jio Postpaid',599,'4814','Mobile bill','E-commerce']]],
        ['karthik.reddy@novaretail.in',[[2,'08:30','FUEL','Indian Oil - Koramangala',1800,'5541','Fuel'],[4,'13:15','MEAL','MTR Restaurant',320,'5812','Lunch'],[7,'18:50','GIFT','Croma Electronics',2499,'5732','Festival gift']]],
        ['nisha.gupta@novaretail.in',[[3,'09:50','MEAL','Starbucks Coffee',290,'5814','Coffee'],[5,'20:20','TEL','Jio Postpaid',599,'4814','Mobile bill','E-commerce'],[9,'08:35','FUEL','Shell - Malad',800,'5541','Fuel']]]];
      const made={};P2.forEach(function(x){const c=card(x[0]);made[x[0]]=x[1].map(function(y){return pay(c,dd(y[0]),y[1],y[2],y[3],y[4],y[5],y[6],y[7]);});});
      /* 6 · Two disputes, each raised by the cardholder and under Rohan's review */
      const dsp=function(email,t,day,time,reason,desc,ev,amount,aDay,aTime){
        const d=on(day,time,function(){S(email);return E('dispute '+t.merchant,ccDspCreate({txnId:t.id,reason:reason,description:desc,evidence:ev,amount:String(amount)})).rec;});
        on(aDay,aTime,function(){S(RM);E('assign '+expKey(d),ccDspAssign(d.id,null));});return d;};
      const d5=dsp(NA,made[NA][3],dd(6),'09:30','Duplicate Charge','One Uber trip to the bank branch was charged twice; the receipt shows a single ride of 412.','uber-trip-receipt.pdf',412,dd(6),'11:00');
      const d6=dsp(AI,made[AI][0],dd(5),'12:10','Cancelled Transaction Charged','IndiGo cancelled the 4 Nov flight to Bengaluru; the fare of 6,840 has not been refunded.','indigo-cancellation-email.pdf',6840,dd(5),'15:30');
      S(RM);ccMatchSync(P.ent);
      return ppl.length+' cards ('+ppl.map(function(x){return expKey(x.c)+' '+x.c.status;}).join(', ')+') · disputes '+expKey(d5)+' '+d5.status+', '+expKey(d6)+' '+d6.status;});
    /* Wallet Requests (product owner, 13 Nov 2026): employees ask from Expenses & Advances → Card Load for a top-up of a
       benefit wallet; each goes Manager review → Finance review → Load. Every state is here: with the manager, with
       Finance, sent back, rejected, approved and waiting to be loaded, loaded, and one the bank declined. Karan, the
       company admin, can decide both steps in their place (with a note). */
    step('wallet requests (benefit top-ups)',function(){
      if(typeof ccLoadRouteFix==='function')ccLoadRouteFix();   // Manager review → Finance review, before the first one is raised
      const cardOf=function(email){const e=emp(email);return e?ccCardsOfEmp(e.eid).find(function(c){return c.entity===P.ent&&ccCardUsable(c);})||null:null;};
      const ask=function(email,day,time,w,amount,reason){return on(day,time,function(){S(email);const c=cardOf(email);if(!c)throw new Error('no card for '+email);return E(reason,emsLoadReqCreate(c,w,String(amount),reason,'')).rec;});};
      const act=function(l,day,time,decision,reason){on(day,time,function(){const st=caActiveStage(l);if(!st||!st.approvers.length)throw new Error(expKey(l)+': no approver');S(idEmail(st.approvers[0]));
        E(decision+' '+expKey(l),caDecide(l.id,{scope:'claim',decision:decision,reason:reason||'',comment:''}));});};
      const load=function(l,day,time,res,note){on(day,time,function(){S(RM);E('load '+expKey(l),ccLoadExecRecord(l.id,{result:res,source:'Illustrative',note:note||''}));});};
      const both=function(l,d1,d2){act(l,d1,'11:20','Approve');act(l,d2,'15:40','Approve');};
      const out=[];
      /* Loaded */
      let l=ask(AR,dd(3),'10:05','MEAL',1500,'Late working days during the quarter close');both(l,dd(3),dd(4));load(l,dd(4),'17:10','Recorded');out.push(l);
      l=ask(RS,dd(4),'09:45','FUEL',2000,'Store audits in Pune this month');both(l,dd(4),dd(5));load(l,dd(5),'16:30','Recorded');out.push(l);
      l=ask(RK,dd(5),'12:15','TEL',600,'Extra data for the hiring drive calls');both(l,dd(5),dd(6));load(l,dd(6),'11:50','Recorded');out.push(l);
      /* Declined by the bank */
      l=ask(NA,dd(5),'14:20','GIFT',3000,'Gifts for the branch staff at Diwali');both(l,dd(6),dd(6));load(l,dd(7),'10:40','Failed','The bank declined the load: the card\'s monthly load limit was reached.');out.push(l);
      /* Approved, waiting to be loaded */
      l=ask(AI,dd(7),'09:30','FUEL',3500,'Drives to the Thane and Navi Mumbai stores');both(l,dd(7),dd(8));out.push(l);
      l=ask(ST,dd(8),'10:10','HLTH',4000,'Eye test and new spectacles');both(l,dd(8),dd(9));out.push(l);
      /* Rejected by Finance */
      l=ask(VM,dd(6),'18:05','MEAL',6000,'Client dinners during the vendor meet');act(l,dd(7),'10:15','Approve');act(l,dd(7),'16:45','Reject','Client dinners are claimed as an expense, not loaded to the meal wallet.');out.push(l);
      /* Sent back: by the manager, and by Finance */
      l=ask('rahul.verma@novaretail.in',dd(8),'13:40','GIFT',4000,'Gifts for the top sales team');act(l,dd(9),'10:30','Follow-Up','Add the names of the people the gifts are for.');out.push(l);
      l=ask(IK,dd(8),'15:25','TEL',1200,'International roaming for the Singapore vendor visit');act(l,dd(9),'11:05','Approve');act(l,dd(10),'12:20','Follow-Up','Attach the roaming plan and the travel dates.');out.push(l);
      /* With Finance */
      l=ask('sneha.kulkarni@novaretail.in',dd(9),'09:20','FUEL',2500,'Weekly visits to the Baner and Hinjewadi stores');act(l,dd(10),'10:00','Approve');out.push(l);
      l=ask('aditya.shah@novaretail.in',dd(9),'14:10','MEAL',1800,'Lunches with the new franchise partners');act(l,dd(10),'15:15','Approve');out.push(l);
      l=ask('divya.krishnan@novaretail.in',dd(10),'11:30','HLTH',5000,'Annual health check-up');act(l,dd(11),'09:50','Approve');out.push(l);
      /* With the manager */
      out.push(ask('nisha.gupta@novaretail.in',dd(10),'16:05','MEAL',2000,'Team lunches during the Diwali sale week'));
      out.push(ask('karthik.reddy@novaretail.in',dd(11),'09:15','FUEL',3000,'Extra store visits across Bengaluru this month'));
      out.push(ask('pooja.desai@novaretail.in',dd(11),'12:40','TEL',800,'International roaming for the Dubai supplier visit'));
      out.push(ask('farhan.qureshi@novaretail.in',dd(11),'17:20','GIFT',2500,'Gifts for the store team after the Kurla launch'));
      return out.map(function(x){const st=caActiveStage(x);return expKey(x)+' '+ccLoadLabel(x)+(st?' @'+st.name:'');}).join(' · ');});
  }).then(function(){
    S(SA);setAppRole('Super Admin');const e=entitiesData.find(function(x){return x.entityId===P.ent;});if(e)seSelectedEntity=e.id;if(typeof appEntityChanged==='function')appEntityChanged();
    window.showToast=T0;presBuilding=false;presHoldAuto=false;window.emsAutoIssueHold=false;return log;
  },function(err){window.showToast=T0;presBuilding=false;presHoldAuto=false;window.emsAutoIssueHold=false;try{S(SA);}catch(x){}log.push('STOPPED: '+(err&&err.message));return log;});
}

/* ── Start-up in the presentation environment ─────────────────────────── */
if(PRES_ON){
  presInitial=presSnapshot();
  PRES_BASE_ENTS=(typeof entitiesData!=='undefined'?entitiesData:[]).map(function(e){return e.entityId;});
  const restored=presRestore();
  /* Save after every screen update (debounced) and when the page is left. */
  if(typeof renderADTPage==='function'){const r0=renderADTPage;renderADTPage=function(){const out=r0.apply(this,arguments);presSaveSoon();presRememberEntity();return out;};}
  window.addEventListener('beforeunload',presSave);
  if(!restored){
    const shade=document.createElement('div');shade.id='pres-preparing';
    shade.setAttribute('style','position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;font:600 15px/1.4 inherit;color:#334155');
    shade.textContent='Preparing '+PRES_COMPANY+'…';
    (document.body||document.documentElement).appendChild(shade);
    /* After the page has loaded: every module has finished its own start-up (RBAC templates included). */
    window.PRES_READY=new Promise(function(res){window.addEventListener('load',function(){setTimeout(function(){/* The set-up works through the screens: the app view is shown first, also in a tab that was left signed in (it may still be on the sign-in view), product owner, 12 Nov 2026. */if(typeof showView==='function'&&typeof view!=='undefined'&&view!=='adt')showView('adt');presBuildBaseline().then(function(log){window.PRES_LOG=log;presEnsureBranches();presTidy();/* A set-up that stopped part-way is not kept: the next visit prepares the company again. */if(log.some(function(x){return /^STOPPED/.test(x);})){presInitial=null;if(typeof console!=='undefined')console.error('Presentation set-up stopped:',log.slice(-2));/* Once per tab, the page is loaded again and the company prepared again (a file the server did not deliver, for example). */let tried='';try{tried=sessionStorage.getItem('adt-pres-retry')||'';}catch(e){}if(!tried){try{sessionStorage.setItem('adt-pres-retry','1');}catch(e){}location.reload();return;}}else{try{sessionStorage.removeItem('adt-pres-retry');}catch(e){}presSave();}shade.remove();
      presStart();if(typeof lgEnter==='function')lgEnter();else if(typeof renderADTPage==='function')renderADTPage();res(log);});},0);});});
  }else window.PRES_READY=Promise.resolve(['restored']);
}

/* ── Switch Role in the presentation environment ───────────────────────
   Only the people the three flows use, each under the part they play.
   Picking one signs in as that person - no password screen; this
   environment checks no passwords - so every approval, verification and
   consent is that person's own: maker-checker and the refusal of decisions
   through Switch Role are unchanged. Presentation environment only. */
const PRES_START='shaun@testemp.com';
/* The OpenDhi Super Admin's sign-in shows a company address here, not the sample one. */
const PRES_PLATFORM_EMAIL='shaun.mathew@opendhi.com';
function presStartEmail(){return idUserByEmail(PRES_PLATFORM_EMAIL)?PRES_PLATFORM_EMAIL:PRES_START;}
function presTidy(){
  const u=idUserByEmail(PRES_START);if(u&&!idUserByEmail(PRES_PLATFORM_EMAIL))u.email=PRES_PLATFORM_EMAIL;
  /* The prepared company's own bulk upload is part of its starting state. */
  const nova=presNova();if(nova&&!nova.presBulkBase&&typeof embBatches!=='undefined')nova.presBulkBase=embBatches.filter(function(b){return b.entityId===nova.entityId;}).map(function(b){return b.id;});
}
/* The company picked in Switch Entity stays picked after a refresh (this tab only). */
const PRES_ENT_KEY='adt-pres-entity';
function presRememberEntity(){try{if(typeof idEntity==='function'&&idEntity())sessionStorage.setItem(PRES_ENT_KEY,idEntity());}catch(e){}}
function presRecallEntity(){
  let saved='';try{saved=sessionStorage.getItem(PRES_ENT_KEY)||'';}catch(e){}
  if(!saved||!idMe()||idEntitiesOf(idMe()).indexOf(saved)<0)return false;
  const e=(typeof entitiesData!=='undefined'?entitiesData:[]).find(function(x){return x.entityId===saved;});
  if(e)seSelectedEntity=e.id;return !!e;
}
/* The person picked in Switch Role stays picked after a refresh. The sign-in
   kept by the tab is read when the page starts, before the prepared people
   (Nova Retail's) are restored, so it is read again once they exist. */
function presRecallSession(){
  if(typeof idSessionUser==='undefined'||idSessionUser)return false;
  let s='',a='';try{s=sessionStorage.getItem(ID_SESSION_KEY)||'';a=sessionStorage.getItem(ID_AUTH_KEY)||'';}catch(e){}
  if(!s||!idUser(s)||!idUserActive(s)||!idEntitiesOf(s).length)return false;
  idSessionUser=s;idAuthUser=a&&idUser(a)?a:s;
  return true;
}
function presNova(){return (typeof entitiesData!=='undefined'?entitiesData:[]).find(function(e){return e.name===PRES_COMPANY;})||null;}
/* Bulk upload is shown live in every presentation: on each reload, employees
   created by a live upload in Nova Retail - and the upload itself - are
   removed, so the same file can be uploaded again. Everything else stays. */
function presDropLiveUploads(){
  const nova=presNova();if(!nova||typeof embBatches==='undefined')return 0;
  const mine=embBatches.filter(function(b){return b.entityId===nova.entityId;});
  const keep=nova.presBulkBase||(mine.length?[mine[mine.length-1].id]:[]);
  const live=mine.filter(function(b){return keep.indexOf(b.id)<0;});
  if(!live.length)return 0;
  const eids=[];live.forEach(function(b){(b.created||[]).forEach(function(c){eids.push(c.eid);});});
  const drop=function(arr,f){if(!Array.isArray(arr))return;for(let i=arr.length-1;i>=0;i--)if(f(arr[i]))arr.splice(i,1);};
  const uids=(typeof idUsers!=='undefined'?idUsers:[]).filter(function(u){return eids.indexOf(u.eid)>=0;}).map(function(u){return u.userId;});
  drop(typeof directEmpData!=='undefined'?directEmpData:null,function(e){return eids.indexOf(e.eid)>=0;});
  if(typeof oncData!=='undefined')eids.forEach(function(e){delete oncData[e];});
  drop(typeof csRoles!=='undefined'?csRoles:null,function(r){return uids.indexOf(r.userId)>=0;});
  drop(typeof idUsers!=='undefined'?idUsers:null,function(u){return uids.indexOf(u.userId)>=0;});
  drop(typeof notifData!=='undefined'?notifData:null,function(n){return live.some(function(b){return n.evt==='emb:'+b.id;});});
  drop(embBatches,function(b){return live.indexOf(b)>=0;});
  if(!nova.presBulkBase)nova.presBulkBase=keep;
  embBatchNext=embBatches.reduce(function(m,b){return Math.max(m,parseInt(String(b.id).replace(/\D/g,''),10)+1||m);},1001);
  return eids.length;
}
var PRES_BASE_ENTS=PRES_BASE_ENTS||[];
/* Client companies made here are EMS clients: an EMS menu, no other samples. */
function presMarkClients(){(typeof entitiesData!=='undefined'?entitiesData:[]).forEach(function(e){
  /* OpenDhi's own companies keep every module on (their setup is not changed by the presentation). */
  if(PRES_BASE_ENTS.indexOf(e.entityId)>=0){if(typeof mcStateOf==='function'&&typeof MC_MODULES!=='undefined'){const st=mcStateOf(e.entityId);MC_MODULES.forEach(function(m){if(!m.always)st[m.key]=true;});}e.emsOnly=false;return;}
  e.emsOnly=true;
  /* Once: a client starts with the EMS modules on and the rest off (Module Control can switch them on). */
  if(!e.presMcSet&&typeof mcNewCompanyState==='function'){mcNewCompanyState(mcStateOf(e.entityId));e.presMcSet=true;}
  /* Once: Payments is part of a client's EMS (product owner, 9 Nov 2026). */
  if(!e.presPaySet&&typeof mcStateOf==='function'){mcStateOf(e.entityId).payments=true;e.presPaySet=true;}});}
const PRES_SWITCH=[
  ['OpenDhi Super Admin',PRES_START],
  ['Company Admin','karan.shah@novaretail.in'],
  ['Employee','kabir.joshi@novaretail.in'],
  ['Employee (Cardholder)','arjun.rao@novaretail.in'],
  ['Reporting Manager','ritu.sen@novaretail.in'],
  ['Finance Admin','rohan.mehta@novaretail.in'],
  ['Card Approver','ananya.iyer@novaretail.in'],
  ['Card / Funding Verifier','neel.arora@novaretail.in'],
  ['Compliance','sara.thomas@novaretail.in']
];
/* Start as the OpenDhi Super Admin in OpenDhi's own environment (its home
   company); Nova Retail is reached through Switch Entity, as a client. */
function presStart(){
  if(idSignIn(presStartEmail()).error)return false;
  const home=idEntitiesOf(idMe()).find(function(x){return PRES_BASE_ENTS.indexOf(x)>=0;});
  const e=(typeof entitiesData!=='undefined'?entitiesData:[]).find(function(x){return x.entityId===home;});
  if(e)seSelectedEntity=e.id;
  return true;
}
function presSwitchList(){return PRES_SWITCH.map(function(x){const e=x[1]===PRES_START?presStartEmail():x[1],u=idUserByEmail(e);return u?{label:x[0],email:e,uid:u.userId}:null;}).filter(Boolean);}
function presClientHere(){const e=typeof idEntityRec==='function'?idEntityRec(idEntity()):null;return !!(e&&PRES_BASE_ENTS.indexOf(e.entityId)<0);}
function presRoleMenu(){
  const dd=document.getElementById('role-dd');if(!dd)return;
  const box0=document.getElementById('pres-people');
  /* OpenDhi's own companies keep the standard Switch Role. */
  if(!presClientHere()){if(box0)box0.style.display='none';const a0=document.getElementById('role-acting');if(a0)a0.style.display='';return;}
  const ent=idEntity();
  /* In a client company: its prepared people, and the OpenDhi Super Admin to return. */
  const list=presSwitchList().filter(function(x){return x.email===presStartEmail()||(typeof idInEntity==='function'&&idInEntity(x.uid,ent));});
  dd.querySelectorAll('.role-dd-item[data-role]').forEach(function(b){b.style.display='none';});
  const act=document.getElementById('role-acting');if(act)act.style.display='none';
  let box=document.getElementById('pres-people');
  if(!box){box=document.createElement('div');box.id='pres-people';dd.appendChild(box);}
  box.style.display='';
  const me=idMe();
  box.innerHTML=list.map(function(x){
    const p=PRES_PEOPLE.find(function(r){return r[2]===x.email;});
    return '<button type="button" class="hdr-dd-item role-dd-item'+(x.uid===me?' is-current':'')+'" onclick="presSwitchTo(\''+x.email+'\')">'+x.label
      +'<span>'+sbEsc(idName(x.uid))+' · '+sbEsc(p?p[4]:idEntityName(idEntity()))+'</span></button>';}).join('');
}
function presSwitchTo(email){
  if(typeof closeAllHdrDD==='function')closeAllHdrDD();
  const u=idUserByEmail(email);if(!u)return;
  if(u.userId===idMe()&&!idSwitched())return;
  if(typeof sbLeaveGuard==='function'&&typeof sbAnyDraft==='function'&&sbLeaveGuard(sbAnyDraft(),function(){presSwitchTo(email);}))return;
  const pg=page;
  const r=idSignIn(email);if(r.error){showToast('Not available','error',r.error);return;}
  lgEnter();
  if(pg&&pg!=='dashboard'&&typeof emsPageGuard==='function'&&!emsPageGuard(pg))navigatePage(pg);
  const x=PRES_SWITCH.find(function(y){return y[1]===email||(y[1]===PRES_START&&email===presStartEmail());});
  showToast('Now working as '+idName(u.userId),'info',(x?x[0]+'. ':'')+'Actions are recorded under '+idName(u.userId)+'.');
}
if(PRES_ON){
  /* Each start-up step on its own: one failing never stops the sign-in below. */
  const presTry=function(f){try{f();}catch(e){if(typeof console!=='undefined')console.error('Presentation start-up:',e);}};
  presTry(presMarkClients);
  if(typeof ncSave==='function'){const nc0=ncSave;ncSave=function(){const out=nc0.apply(this,arguments);presMarkClients();return out;};}
  if(typeof emsApplyChrome==='function'){const ac0=emsApplyChrome;emsApplyChrome=function(){const out=ac0.apply(this,arguments);presRoleMenu();return out;};}
  /* No sign-in screen: a new tab opens as the OpenDhi Super Admin (Flow 1). */
  let signed='';try{signed=sessionStorage.getItem('adt-signed-in')||'';}catch(e){}
  if(presNova()){presTry(presDropLiveUploads);presTry(presEnsureBranches);presTry(presTidy);}   // prepared already (the build signs in with the sample address)
  if(signed){presTry(presRecallSession);presTry(presRecallEntity);}
  if(!signed&&idUserByEmail(presStartEmail())&&presStart()){try{sessionStorage.setItem('adt-signed-in','1');}catch(e){}}
}

/* ── Illustrative approvals in the presentation environment ────────────
   The approval engine runs unchanged: every rule (eligible approver,
   separation of duties, maker-checker, stage order) is checked against the
   person picked in Switch Role. Because the presenter picks that person,
   what they record here is labelled Illustrative - decisions, consent,
   verifications - and is never shown as a genuine independent approval. */
const PRES_ILL=' · Illustrative (presentation): selected through Switch Role, not a genuine independent approval';
function presMarkLogs(list,n0){if(!Array.isArray(list))return;const k=list.length-n0;for(let i=0;i<k&&i<list.length;i++){const l=list[i];if(!l||l.illustrative)continue;const f=typeof l.action==='string'?'action':typeof l.comment==='string'?'comment':'action';l[f]=String(l[f]||'')+PRES_ILL;l.illustrative=true;}}
function presAllDecs(r){const o=[];((r&&r.wf&&r.wf.stages)||[]).forEach(function(st){(st.decisions||[]).forEach(function(d){o.push(d);});});return o;}
if(PRES_ON){
  if(typeof caDecide==='function'){const cd0=caDecide;caDecide=function(id){
    const r=typeof caRec==='function'?caRec(id):null,before=presAllDecs(r),n0=r&&r.logs?r.logs.length:0;
    const res=cd0.apply(this,arguments);
    if(res===''&&r){presAllDecs(r).forEach(function(d){if(before.indexOf(d)<0)d.illustrative=true;});presMarkLogs(r.logs,n0);}
    return res;};}
  if(typeof caDecisionRow==='function'){const dr0=caDecisionRow;caDecisionRow=function(d){
    const h=dr0.apply(this,arguments);
    return d&&d.illustrative?h.replace('<div class="ca-dec-hd">','<div class="ca-dec-hd"><span class="lp-status-badge tone-info">Illustrative</span> '):h;};}
  /* KYC consent and the HR review of card details: the employee's own acts, here only illustrated. */
  ['oncAccept','oncReview'].forEach(function(n){const f=window[n];if(typeof f!=='function')return;window[n]=function(eid){
    const r=typeof oncRec==='function'?oncRec(eid,true):null,n0=r&&r.logs?r.logs.length:0;
    const res=f.apply(this,arguments);
    if(r){presMarkLogs(r.logs,n0);if(n==='oncAccept'&&r.decls&&r.logs.length>n0){r.decls.illustrative=true;r.decls.session='Presentation environment: illustrative, not personal consent';}}
    return res;};});
  /* Onboarding document checks and verification steps. */
  if(typeof empDocAccept==='function'){const da0=empDocAccept;empDocAccept=function(kind,id){const e=empFind(kind,id),L=e&&typeof empLogs==='function'?empLogs(e):null,n0=L?L.length:0;const res=da0.apply(this,arguments);if(L)presMarkLogs(L,n0);return res;};}
  if(typeof empCommitLog==='function'){const cl0=empCommitLog;empCommitLog=function(pk){const e=typeof empPkRec==='function'?empPkRec(pk):null,L=e&&typeof empLogs==='function'?empLogs(e):null,n0=L?L.length:0;const res=cl0.apply(this,arguments);if(L)presMarkLogs(L,n0);return res;};}
}

/* ── Bulk upload sample, ready for the prepared company ────────────────
   In Nova Retail, Download Sample gives fourteen new joiners (product owner,
   13 Nov 2026) who are not yet in the company: realistic names, company work
   emails, Nova's own teams and reporting managers, their branch, joining a
   week from today. Each download picks people not already there, so the file
   always validates and can be uploaded live (twice, from 28 joiners).
   Other companies keep the standard sample.
   first, last, department, designation, reporting manager, gender, date of birth, work location */
const PRES_JOINERS=[
  ['Tanvi','Desai','Sales','Sales Executive','ritu.sen@novaretail.in','Female','1998-03-14','Bengaluru Branch'],
  ['Rahul','Nair','Operations','Operations Executive','ananya.iyer@novaretail.in','Male','1996-07-22','Pune Branch'],
  ['Aditi','Kulkarni','Finance','Finance Executive','rohan.mehta@novaretail.in','Female','1997-11-05','Hyderabad'],
  ['Nikhil','Verma','Sales','Sales Executive','ritu.sen@novaretail.in','Male','1995-02-18','Bengaluru Branch'],
  ['Pooja','Reddy','Operations','Operations Executive','ananya.iyer@novaretail.in','Female','1997-06-09','Pune Branch'],
  ['Ishaan','Malhotra','Finance','Finance Executive','rohan.mehta@novaretail.in','Male','1996-12-01','Hyderabad'],
  ['Kavya','Menon','Sales','Sales Executive','ritu.sen@novaretail.in','Female','1999-01-27','Bengaluru Branch'],
  ['Arnav','Gupta','Operations','Operations Executive','ananya.iyer@novaretail.in','Male','1995-10-11','Pune Branch'],
  ['Neha','Bhatt','Finance','Finance Executive','rohan.mehta@novaretail.in','Female','1998-08-30','Hyderabad'],
  ['Simran','Kaur','Human Resources','HR Executive','riya.kapoor@novaretail.in','Female','1998-05-19','Hyderabad'],
  ['Varun','Chopra','Operations','Store Associate','sneha.kulkarni@novaretail.in','Male','1999-08-11','Pune Branch'],
  ['Ayesha','Siddiqui','Product','Product Analyst','nikhil.bansal@novaretail.in','Female','1997-12-06','Hyderabad'],
  ['Kunal','Bhardwaj','Administration','IT Support Engineer','imran.khan@novaretail.in','Male','1998-02-23','Hyderabad'],
  ['Roshni','Das','Procurement','Procurement Executive','manish.agarwal@novaretail.in','Female','1996-09-17','Bengaluru Branch'],
  ['Yash','Tiwari','Compliance','Compliance Analyst','sara.thomas@novaretail.in','Male','1997-04-02','Hyderabad'],
  ['Pallavi','Sawant','Administration','Admin Executive','karan.shah@novaretail.in','Female','1995-11-28','Hyderabad'],
  ['Abhishek','Rathore','Finance','Accounts Executive','rohan.mehta@novaretail.in','Male','1996-06-14','Hyderabad'],
  ['Sakshi','Bajaj','Human Resources','Talent Acquisition Executive','riya.kapoor@novaretail.in','Female','1998-10-21','Hyderabad'],
  ['Manoj','Hegde','Operations','Store Associate','karthik.reddy@novaretail.in','Male','1997-07-07','Bengaluru Branch'],
  ['Tanya','Ghosh','Product','Merchandise Planner','nikhil.bansal@novaretail.in','Female','1995-03-30','Hyderabad'],
  ['Siddharth','Rane','Administration','System Administrator','imran.khan@novaretail.in','Male','1994-12-09','Hyderabad'],
  ['Bhavna','Chawla','Sales','Sales Executive','ritu.sen@novaretail.in','Female','1998-01-15','Bengaluru Branch'],
  ['Prateek','Jha','Operations','Logistics Coordinator','ananya.iyer@novaretail.in','Male','1996-08-24','Pune Branch'],
  ['Anushka','Mathur','Finance','Finance Executive','rohan.mehta@novaretail.in','Female','1997-05-12','Hyderabad'],
  ['Dev','Kapadia','Procurement','Procurement Executive','manish.agarwal@novaretail.in','Male','1995-02-04','Hyderabad'],
  ['Zoya','Mirza','Compliance','Risk Analyst','sara.thomas@novaretail.in','Female','1996-11-13','Hyderabad'],
  ['Harsh','Vardhan','Sales','Sales Executive','ritu.sen@novaretail.in','Male','1999-04-26','Bengaluru Branch'],
  ['Komal','Bedi','Operations','Operations Executive','ananya.iyer@novaretail.in','Female','1998-07-31','Pune Branch']
];
function presSampleRows(){
  const nova=presNova();if(!nova||idEntity()!==nova.entityId||typeof embSampleRows!=='function')return null;
  const base=(embSampleRows()||[])[0];if(!base)return null;
  const doj=wbAddDays(wbToday(),7),locs=embLists().location||[],out=[];
  /* The team that holds the designation (Nova's department teams). */
  const teamOf=function(desig){const t=PRES_TEAMS.find(function(x){return x[1].indexOf(desig)>=0;});return t?t[0]:'';};
  PRES_JOINERS.forEach(function(p,i){
    if(out.length>=14)return;
    const email=(p[0]+'.'+p[1]).toLowerCase()+'@novaretail.in';
    if(typeof eaEmailOwner==='function'&&eaEmailOwner(email,nova.entityId))return;
    out.push(Object.assign({},base,{fname:p[0],lname:p[1],email:email,phone:'98200002'+String(10+i),dept:p[2],designation:p[3],manager:p[4],gender:p[5],dob:p[6],doj:doj,
      location:embPick(locs,p[7])||base.location,team:teamOf(p[3])}));
  });
  return out.length?out:null;
}
if(PRES_ON&&typeof embDownloadSample==='function'){
  const ds0=embDownloadSample;
  embDownloadSample=function(){
    const rows=presSampleRows();if(!rows)return ds0.apply(this,arguments);
    if(!emsCan('h2r.employee.bulk')){emsDeny('download the sample');return;}
    tsxSave(embFormatBook(rows),embFileName('Sample'));
    showToast('Sample downloaded','success',embFileName('Sample')+' · '+rows.length+' employees.');
  };
}

/* ── Nova Retail branches (FR-WB-01) ───────────────────────────────────
   The existing branch stays; Bengaluru and Pune are added, and the people are
   spread across them once. Branches are the company's own (Company Settings
   → Company Structure → Branch); OpenDhi's companies are not touched. */
function presEnsureBranches(){
  /* Kept inside: this runs at start-up, before the rest of this file has run. */
  var PRES_BRANCHES=[['Hyderabad','NR-HYD','Nova Retail Pvt Ltd, Road No. 12, Banjara Hills, Hyderabad 500034, India',17.4126,78.4482],
    ['Bengaluru Branch','NR-BLR','Nova Retail Pvt Ltd, 100 Feet Road, Indiranagar, Bengaluru 560038, India',12.9784,77.6408],
    ['Pune Branch','NR-PUN','Nova Retail Pvt Ltd, Baner Road, Baner, Pune 411045, India',18.559,73.7868]];
  var PRES_BRANCH_OF={'ritu.sen@novaretail.in':'Bengaluru Branch','kabir.joshi@novaretail.in':'Bengaluru Branch','arjun.rao@novaretail.in':'Bengaluru Branch',
    'ananya.iyer@novaretail.in':'Pune Branch','meghna.pillai@novaretail.in':'Pune Branch','neel.arora@novaretail.in':'Pune Branch'};

  const nova=presNova();if(!nova||typeof emsBranchBook!=='function')return;
  const book=emsBranchBook(nova.entityId);if(!book)return;
  book.locations=book.locations||[];
  PRES_BRANCHES.forEach(function(b){
    const ex=book.locations.find(function(l){return l.name===b[0];});
    if(ex){if(!ex.code)ex.code=b[1];return;}
    book.locations.push({name:b[0],code:b[1],address:b[2],lat:b[3],lng:b[4],radius:200,status:'Active'});
  });
  if(nova.presBranchesSet)return;
  (typeof directEmpData!=='undefined'?directEmpData:[]).forEach(function(e){
    if(e.entityId!==nova.entityId)return;
    e.branch=PRES_BRANCH_OF[String(e.email||'').toLowerCase()]||'Hyderabad';
  });
  nova.presBranchesSet=true;
}
/* New joiners in the sample: each one's branch is in PRES_JOINERS (13 Nov 2026). */

/* ── One discreet Illustrative label instead of repeated technical notes ──
   In the presentation company, bank-side activity is simulated: the header
   carries one "Illustrative" label, each simulated record keeps its own
   badge, and notes that only repeat "not connected / not a balance" are not
   shown. The normal application is unchanged. */
var PRES_TECH_NOTES=[/is not connected/i,/not money (remaining )?on the card/i,/not (a )?(bank|wallet) balance/i,/No bank or wallet balance is shown/i,
  /Records marked Illustrative are not bank or provider events/i,/is Provider Confirmed/i,/Planned allocation, not a wallet load/i,/Creates planned records only/i,
  /does not create or activate a bank wallet/i,/They are not wallet balances/i,/Records of entitlement and loads/i];
function presTidyNotes(root){
  if(!root||!presClientHere()||!(typeof ccDemoOn==='function'&&ccDemoOn(idEntity())))return;
  root.querySelectorAll('.wb-note').forEach(function(n){
    const t=(n.textContent||'').replace(/\s+/g,' ').trim();
    if(t.length<260&&PRES_TECH_NOTES.some(function(re){return re.test(t);}))n.style.display='none';
  });
  root.querySelectorAll('.wb-context').forEach(function(c){c.innerHTML=c.innerHTML.replace(/ · Planned figures are not wallet balances/,'');});
}
function presIllPill(){
  return;   // no label on screen (product owner, 9 Nov 2026)
  const host=document.getElementById('entity-trigger');if(!host||!host.parentNode)return;
  let p=document.getElementById('pres-ill-pill');
  const on=presClientHere()&&typeof ccDemoOn==='function'&&ccDemoOn(idEntity());
  if(!p&&on){p=document.createElement('span');p.id='pres-ill-pill';p.className='lp-status-badge tone-info';p.textContent='Illustrative';
    p.title='Bank-side activity in this company is simulated for the presentation; it is not a bank confirmation.';p.style.marginLeft='8px';host.parentNode.insertBefore(p,host.nextSibling);}
  if(p)p.style.display=on?'':'none';
}
/* The cardholder view: the wallet balances instead of load figures. */
if(PRES_ON){
  if(typeof ccCardholderHTML==='function'){const ch0=ccCardholderHTML;ccCardholderHTML=function(eid){
    const out=ch0.apply(this,arguments);
    if(!presClientHere()||typeof emsLedgerHTML!=='function')return out;
    const a=out.indexOf('<div class="wb-proj-cards cc-holder-figs">');if(a<0)return out;
    const endNote='not money remaining on the card.</div></div>';const b=out.indexOf(endNote,a);if(b<0)return out;
    const me=typeof ccEmpOf==='function'?ccEmpOf():null;
    return out.slice(0,a)+emsLedgerHTML(eid,!!me&&me.eid===eid,{history:false})+out.slice(b+endNote.length);
  };}
  if(typeof renderADTPage==='function'){const rr=renderADTPage;renderADTPage=function(){const out=rr.apply(this,arguments);presTidyNotes(document.getElementById('adt-content'));presIllPill();return out;};}
  if(typeof isbTab==='function'){const it=isbTab;isbTab=function(prefix){const out=it.apply(this,arguments);presTidyNotes(document.getElementById(prefix+'-isb-inner'));return out;};}
}

/* ── Sign-in in the presentation: any ID and password ──────────────────
   The presentation opens signed in. If the sign-in page shows (after Sign
   Out, or a new start), any email and any password go in: a known email
   signs in as that person, anything else as the OpenDhi Super Admin. This is
   the isolated presentation only; the normal application is unchanged. */
if(PRES_ON){
  window.addEventListener('load',function(){
    if(typeof lgSignIn==='function'){
      const si0=lgSignIn;
      lgSignIn=function(){
        const em=document.getElementById('lg-email'),pw=document.getElementById('lg-pass');
        const v=em?em.value.trim():'';
        if(em&&!(v&&idUserByEmail(v)))em.value=presStartEmail();
        if(pw&&!pw.value)pw.value='presentation';
        return si0.call(this,'');
      };
    }
    /* Never left on the sign-in page: once the company is ready, sign in. */
    Promise.resolve(window.PRES_READY).then(function(){
      try{if(!idMe()&&presStart()){try{sessionStorage.setItem('adt-signed-in','1');}catch(e){}if(typeof lgEnter==='function')lgEnter();}}catch(e){}
    });
  });
}
