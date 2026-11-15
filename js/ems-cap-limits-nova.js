/* ══ CAPPING LIMITS FOR THE CLIENT COMPANY (product owner, 15 Nov 2026) ═════════════════════════════════════════════
   "add realistic capping limit in the capping limit section ... add capping limits for multiple wallets and
   categories so that when i click on capping limit i can see all the limits."
   The company had one limit (Meal - monthly). These are added once, by name, as Active policies in force since
   1 Apr 2026: one for every expense category - including the ones the benefit wallets cover (Meal, Fuel, Telephone)
   - and two department limits. All are Warning limits, like the Meal one: a claim over the limit asks for a
   justification and can still be submitted; nothing is blocked. They are ordinary Capping Limit records - they can be
   edited, deactivated and versioned from the page.
   Only in the presentation company. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof cappingData==='undefined'||typeof capV!=='function')return;
  const nova=function(){return typeof emsMfEnt==='function'?emsMfEnt():'';};
  /* Every limit is per request (product owner, 15 Nov 2026: "capping limit is for each transaction - for this
     transaction limit is 4000 and applied is 3000; for the next request 4000 limit and ask 5000, just tell you have
     exceeded the limit, but nothing should block the submission; if the limit is crossed he needs to mention the
     reason and then he can submit"): each limit is Per Claim and a Warning - nothing adds up over a month, nothing
     blocks. The limits made earlier the same day as monthly / quarterly / annual ones, and the company's Meal limit,
     are changed once (the change is written to each limit's Logs); limits created after that are left as created.
     old name, name, level, category, sub category, department, amount per request */
  const LIMITS=[
    ['Travel - monthly limit','Travel limit','Category-Wide','Travel Reimbursement','','',15000,'Local and intercity travel on one request.'],
    ['Air travel - per claim','Air travel limit','Category-Wide','Travel Reimbursement','Intercity Travel - Air','',12000,'Economy fare for one trip.'],
    ['Accommodation - per stay','Accommodation limit','Category-Wide','Accommodation','','',6000,'Hotel stay on one request.'],
    ['Fuel - monthly limit','Fuel limit','Category-Wide','Fuel Reimbursement','','',4000,'Fuel for business travel in own vehicle.'],
    ['Telephone & internet - monthly limit','Telephone & internet limit','Category-Wide','Telephone & Internet','','',1500,'Mobile and broadband bills.'],
    ['Team outing - quarterly limit','Team outing limit','Category-Wide','Team Outing','','',10000,'Per employee, for one team outing.'],
    ['Office events - annual limit','Office events limit','Category-Wide','Office Events','','',10000,'One event or festival.'],
    ['Stationery - monthly limit','Stationery limit','Category-Wide','Office Stationery','','',2000,'Office supplies bought by the employee.'],
    ['Books & learning - annual limit','Books & learning limit','Category-Wide','Books & Learning','','',8000,'A book, course or certification.'],
    ['Sales - field travel','Sales - field travel limit','Department','Travel Reimbursement','','Sales',20000,'Field sales travel to client sites.'],
    ['Operations - fuel','Operations - fuel limit','Department','Fuel Reimbursement','','Operations',6000,'Site visits by the operations team.'],
    ['Meal - monthly limit','Meal limit','Category-Wide','Meal Allowance','','',2500,'']];
  const actor=function(){
    const u=typeof idUserByEmail==='function'?idUserByEmail('karan.shah@opendhi.in'):null;
    return {by:u?(typeof idName==='function'?idName(u.userId):'Karan Shah'):'Karan Shah',id:u?u.userId:''};
  };
  function seed(){
    if(typeof presBuilding!=='undefined'&&presBuilding)return 0;
    const ent=nova();if(!ent)return 0;
    const A=actor(),by=A.by,byId=A.id;
    const depts=typeof capDepts==='function'?capDepts():[];
    const mine=function(){return cappingData.filter(function(r){return r.entity===ent;});};
    let n=0;
    /* 1 · the limits, by name */
    LIMITS.forEach(function(x){
      if(mine().some(function(r){return r.name===x[0]||r.name===x[1];}))return;
      if(x[0]==='Meal - monthly limit')return;   // the company's own limit: only changed below
      if(typeof EXP_CATEGORIES!=='undefined'&&EXP_CATEGORIES.indexOf(x[3])<0)return;
      if(x[5]&&depts.length&&depts.indexOf(x[5])<0)return;
      const at='01 Apr 2026 | 10:'+String(10+n).slice(-2)+':00 AM';
      const r={id:capNextId++,key:capNextKey++,status:'Active',createdBy:by,createdById:byId,entity:ent,createdAt:at,name:x[1],level:x[2],category:x[3],subCat:x[4],dept:x[5],position:'',
        employeeEid:'',reason:'',currency:'INR',desc:x[7],versions:[capV(1,x[6],'Per Claim','Warning','2026-04-01','')],activatedOn:'2026-04-01',perClaim:true,
        logs:[{date:'01 Apr 2026',time:at.split(' | ')[1],user:by,userId:byId,status:'Active',action:'Activated on creation.'},
          {date:'01 Apr 2026',time:at.split(' | ')[1],user:by,userId:byId,status:'Draft',action:'Policy created at '+Number(x[6]).toLocaleString('en-IN')+' INR Per Claim, Warning.'}]};
      if(typeof capSyncDates==='function')capSyncDates(r);
      cappingData.unshift(r);n++;
    });
    /* 2 · once for the company: every limit it has becomes Per Claim + Warning */
    const e=typeof entitiesData!=='undefined'?entitiesData.find(function(y){return y.entityId===ent;}):null;
    if(e&&!e.capPerClaim){
      const s=typeof stampNow==='function'?stampNow():{date:'',time:''};
      mine().forEach(function(r){
        const x=LIMITS.find(function(y){return y[0]===r.name||y[1]===r.name;});
        const was=(r.versions||[]).map(function(v){return v.period+' · '+v.enforcement+' · '+v.amount;}).join('|');
        (r.versions||[]).forEach(function(v){v.period='Per Claim';v.basis='';v.enforcement='Warning';if(x)v.amount=x[6];});
        if(x){r.name=x[1];if(x[7])r.desc=x[7];}
        r.perClaim=true;
        if(typeof capSyncDates==='function')capSyncDates(r);
        const now=(r.versions||[]).map(function(v){return v.period+' · '+v.enforcement+' · '+v.amount;}).join('|');
        if(was!==now){(r.logs=r.logs||[]).unshift({date:s.date,time:s.time,user:by,userId:byId,status:r.status,
          action:'Limit applies to each request: '+Number(r.amount).toLocaleString('en-IN')+' INR Per Claim, Warning (a request over it needs a reason; nothing is blocked).'});n++;}
      });
      e.capPerClaim=true;n++;
    }
    if(n){if(typeof emsClearCache==='function')emsClearCache();if(typeof presSaveSoon==='function')presSaveSoon();}
    return n;
  }
  window.emsCapLimitsSeed=seed;
  Promise.resolve(window.PRES_READY).then(function(){try{seed();}catch(e){if(window.console)console.warn('[capping limits]',e);}});
})();
