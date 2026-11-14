/* ══ NOVA RETAIL: ARJUN RAO FIRST UNDER CLAIM FOR: OTHERS (product owner, 14 Nov 2026) ════════════════════════════
   "in others always show arjun first so that i can show the sync between arjun mobile and web": in the presentation
   company the Employee list under Claim For: Others - New Request for an expense claim, a card load and an advance -
   starts with Arjun Rao, whose phone shows the request. The other employees keep their order; nothing else changes,
   and every other company is unchanged. */
(function(){
  const AR='arjun.rao@opendhi.in';
  const inNova=function(){
    const ent=typeof emsMfEnt==='function'?emsMfEnt():'';
    return !!ent&&typeof idEntity==='function'&&idEntity()===ent;
  };
  const arjun=function(){const u=typeof idUserByEmail==='function'?idUserByEmail(AR):null;return u&&u.eid?u.eid:'';};
  const first=function(list,item){const i=list.indexOf(item);if(i>0){list.splice(i,1);list.unshift(item);}return list;};
  /* Expense claim and card load (the same form): the list is employee IDs. */
  if(typeof expPickPool==='function'){
    const p0=expPickPool;
    expPickPool=function(){const out=p0.apply(this,arguments);return inNova()&&arjun()?first(out,arjun()):out;};
  }
  /* Advance: the list is "Name · Employee ID". */
  if(typeof advEmpOptions==='function'){
    const a0=advEmpOptions;
    advEmpOptions=function(){
      const out=a0.apply(this,arguments);if(!inNova())return out;
      const e=arjun()&&typeof idEmp==='function'?idEmp(arjun()):null;
      return e?first(out,e.name+' · '+e.empId):out;
    };
  }
})();
