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
  /* name, level, category, sub category, department, amount, period */
  const LIMITS=[
    ['Travel - monthly limit','Category-Wide','Travel Reimbursement','','',15000,'Monthly','Local and intercity travel claimed in a month.'],
    ['Air travel - per claim','Category-Wide','Travel Reimbursement','Intercity Travel - Air','',12000,'Per Claim','Economy fare for one trip.'],
    ['Accommodation - per stay','Category-Wide','Accommodation','','',6000,'Per Claim','Hotel stay on one claim.'],
    ['Fuel - monthly limit','Category-Wide','Fuel Reimbursement','','',4000,'Monthly','Fuel for business travel in own vehicle.'],
    ['Telephone & internet - monthly limit','Category-Wide','Telephone & Internet','','',1500,'Monthly','Mobile and broadband bills.'],
    ['Team outing - quarterly limit','Category-Wide','Team Outing','','',10000,'Quarterly','Per employee, for team outings in a quarter.'],
    ['Office events - annual limit','Category-Wide','Office Events','','',25000,'Annual','Events and festivals in a financial year.'],
    ['Stationery - monthly limit','Category-Wide','Office Stationery','','',2000,'Monthly','Office supplies bought by the employee.'],
    ['Books & learning - annual limit','Category-Wide','Books & Learning','','',20000,'Annual','Books, courses and certifications in a financial year.'],
    ['Sales - field travel','Department','Travel Reimbursement','','Sales',20000,'Monthly','Field sales travel to client sites.'],
    ['Operations - fuel','Department','Fuel Reimbursement','','Operations',6000,'Monthly','Site visits by the operations team.']];
  function seed(){
    if(typeof presBuilding!=='undefined'&&presBuilding)return 0;
    const ent=nova();if(!ent)return 0;
    const u=typeof idUserByEmail==='function'?idUserByEmail('karan.shah@opendhi.in'):null;
    const by=u?(typeof idName==='function'?idName(u.userId):'Karan Shah'):'Karan Shah',byId=u?u.userId:'';
    const depts=typeof capDepts==='function'?capDepts():[];
    let n=0;
    LIMITS.forEach(function(x){
      if(cappingData.some(function(r){return r.entity===ent&&r.name===x[0];}))return;
      if(typeof EXP_CATEGORIES!=='undefined'&&EXP_CATEGORIES.indexOf(x[2])<0)return;
      if(x[4]&&depts.length&&depts.indexOf(x[4])<0)return;
      const at='01 Apr 2026 | 10:'+String(10+n).slice(-2)+':00 AM';
      const r={id:capNextId++,key:capNextKey++,status:'Active',createdBy:by,createdById:byId,entity:ent,createdAt:at,name:x[0],level:x[1],category:x[2],subCat:x[3],dept:x[4],position:'',
        employeeEid:'',reason:'',currency:'INR',desc:x[7],versions:[capV(1,x[5],x[6],'Warning','2026-04-01','')],activatedOn:'2026-04-01',
        logs:[{date:'01 Apr 2026',time:at.split(' | ')[1],user:by,userId:byId,status:'Active',action:'Activated on creation.'},
          {date:'01 Apr 2026',time:at.split(' | ')[1],user:by,userId:byId,status:'Draft',action:'Policy created at '+Number(x[5]).toLocaleString('en-IN')+' INR '+x[6]+', Warning.'}]};
      if(typeof capSyncDates==='function')capSyncDates(r);
      cappingData.unshift(r);n++;
    });
    if(n){if(typeof emsClearCache==='function')emsClearCache();if(typeof presSaveSoon==='function')presSaveSoon();}
    return n;
  }
  window.emsCapLimitsSeed=seed;
  Promise.resolve(window.PRES_READY).then(function(){try{seed();}catch(e){if(window.console)console.warn('[capping limits]',e);}});
})();
