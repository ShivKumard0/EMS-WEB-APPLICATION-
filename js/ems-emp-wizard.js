/* ══ ADD EMPLOYEE TIDY, CALENDAR MONTH / YEAR, ACTIVE FROM LOGS (product owner, 13 Nov 2026) ═════════════════════════
   1. Every calendar picks the month and the year from two dropdowns in its head (the arrows stay), so a date of
      birth decades back is three clicks.
   2. Create New Employee:
      - no Compliance Snapshot step;
      - no Employee Status choice: every new employee starts Pending;
      - Access Governance asks three things only: Assign Team (one team, a dropdown), Reporting Manager (the managers
        of that team; the company's other managers when it has none yet) and Role within Team (Team Member or Team
        Manager). No access-role cards and no Access Preview: the employee gets the standard Employee access.
   3. A Pending employee's Logs offers Active: picked with a comment, the employee is Active.
   In the presentation; the standard application is unchanged. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;

  /* ── 1 · Calendar: Month and Year dropdowns ── */
  (function(){
    const st=document.createElement('style');st.id='cd-my-style';
    st.textContent='.cd-title.cd-my{display:flex;align-items:center;gap:6px}'
      +'.cd-title.cd-my select{border:1px solid var(--border,#e5e7eb);border-radius:8px;background:#fff;color:inherit;font:inherit;font-size:13px;font-weight:600;padding:3px 6px;cursor:pointer}'
      +'.cd-title.cd-my select:focus-visible{outline:2px solid var(--btn-accent,#0f172a);outline-offset:1px}';
    (document.head||document.documentElement).appendChild(st);
  })();
  if(typeof cdPaint==='function'){
    const p0=cdPaint;
    cdPaint=function(id){
      const out=p0.apply(this,arguments);
      const panel=document.getElementById('cdp-'+id),v=typeof cdView!=='undefined'?cdView[id]:null;
      const t=panel&&panel.querySelector('.cd-title');if(!t||!v)return out;
      const now=new Date().getFullYear(),y0=Math.min(v.y,now-100),y1=Math.max(v.y,now+10);
      let ys='';for(let y=y1;y>=y0;y--)ys+='<option value="'+y+'"'+(y===v.y?' selected':'')+'>'+y+'</option>';
      t.classList.add('cd-my');
      t.innerHTML='<select aria-label="Month" onchange="cdJump(\''+id+'\',this.value,null)">'
          +CD_MONTHS.map(function(m,i){return '<option value="'+i+'"'+(i===v.m?' selected':'')+'>'+m+'</option>';}).join('')+'</select>'
        +'<select aria-label="Year" onchange="cdJump(\''+id+'\',null,this.value)">'+ys+'</select>';
      return out;
    };
    window.cdJump=function(id,m,y){
      const v=(typeof cdView!=='undefined'&&cdView[id])||{y:new Date().getFullYear(),m:new Date().getMonth()};
      cdView[id]={y:y!=null?Number(y):v.y,m:m!=null?Number(m):v.m};
      cdPaint(id);
    };
  }

  /* ── 2 · Create New Employee ── */
  if(typeof EA_STEPS!=='undefined'){
    const ci=EA_STEPS.findIndex(function(s){return s.key==='compliance';});if(ci>=0)EA_STEPS.splice(ci,1);
    const idn=EA_STEPS.find(function(s){return s.key==='identity';});
    if(idn)idn.fields=idn.fields.filter(function(f){return f.k!=='status';});
    const acc=EA_STEPS.find(function(s){return s.key==='access';});
    if(acc){acc.fields=acc.fields.filter(function(f){return f.k!=='accessRole';});acc.cardSub='Team, reporting manager and role within the team';}
  }
  if(typeof EA_TEAM_ROLES!=='undefined')EA_TEAM_ROLES.splice(0,EA_TEAM_ROLES.length,'Team Member','Team Manager');
  if(typeof eaDefaults==='function'){
    const d0=eaDefaults;
    eaDefaults=function(){const d=d0.apply(this,arguments);d.status='Pending';d.accessRole='Employee';return d;};
  }
  /* The company's own teams: a client company's (Roles & Access teams), otherwise the Teams list. */
  const clientTeams=function(){return typeof emsClientOnly==='function'&&emsClientOnly()&&typeof ctmAll==='function'?ctmAll():null;};
  const MGR=/^(Reporting Manager|Manager|Team Manager)$/;
  function managersOf(name){
    const c=clientTeams();
    if(c){const x=c.find(function(y){return y.t.name===name;});if(!x)return [];
      return x.t.members.filter(function(u){return MGR.test((typeof ctmDesigOf==='function'?ctmDesigOf(x.t,u):(x.t.desig||{})[u])||'');})
        .map(function(u){return typeof idName==='function'?idName(u):u;}).filter(Boolean);}
    const t=(typeof teamsData!=='undefined'?teamsData:[]).find(function(y){return y.name===name;});
    return t&&t.membersList?t.membersList.filter(function(m){return MGR.test(m.role||'');}).map(function(m){return m.name;}):[];
  }
  if(typeof eaTeamNames==='function'){
    const n0=eaTeamNames;
    eaTeamNames=function(){const c=clientTeams();return c?c.map(function(x){return x.t.name;}):n0.apply(this,arguments);};
  }
  const allManagers=function(){const out=[];eaTeamNames().forEach(function(n){managersOf(n).forEach(function(m){if(out.indexOf(m)<0)out.push(m);});});return out;};
  if(typeof eaTeamManagers==='function'){
    eaTeamManagers=function(name){const own=managersOf(name);return own.length?own:allManagers();};
  }
  const esc=function(s){return typeof eaEsc==='function'?eaEsc(s):String(s);};
  if(typeof eaAccessBody==='function'){
    eaAccessBody=function(){
      const team=(eaData.teams||[])[0]||'',teams=eaTeamNames();
      const own=team?managersOf(team):[],mgrs=team?eaTeamManagers(team):[];
      const box=function(t){return '<div class="ea-locked is-muted">'+esc(t)+'</div>';};
      const hint=function(t){return '<span class="ea-hint">'+esc(t)+'</span>';};
      return '<div class="ep-form-grid">'
        +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Assign Team</label>'
          +(teams.length?apCS('ea-team1',teams,team,'Select team','eaTeamPick'):box('No teams yet'))+hint('The team this employee belongs to')+'</div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Reporting Manager</label>'
          +(team?(mgrs.length?apCS('ea-manager',mgrs,eaData.manager||'','Select reporting manager','eaOnSelect'):box('No managers yet')):box('Select a team first'))
          +hint(!team?'Managers of the team selected above':(own.length?'Managers of '+team:'No manager on '+team+' yet: the company’s managers'))+'</div>'
        +'<div class="ep-form-group"><label class="ep-form-label">Role within Team</label>'
          +(team?apCS('ea-teamRole',EA_TEAM_ROLES,eaData.teamRole||'','Select role','eaOnSelect'):box('Select a team first'))
          +hint('Team Member or Team Manager')+'</div>'
        +'</div>';
    };
  }
  window.eaTeamPick=function(val){
    eaData.teams=val?[val]:[];
    if(eaData.manager&&(!val||eaTeamManagers(val).indexOf(eaData.manager)<0))eaData.manager='';
    if(!val)eaData.teamRole='';
    renderADTPage();
  };
  /* A manager picked from a team who has no employee record in this company is not made the reporting line (it
     would stop the employee being created); the employee is created without one, and it can be set later. */
  if(typeof eaSubmit==='function'){
    const s0=eaSubmit;
    eaSubmit=function(){
      if(eaData&&eaData.manager&&typeof idEmpByName==='function'&&!idEmpByName(eaData.manager,idEntity()))eaData.manager='';
      return s0.apply(this,arguments);
    };
  }

  /* ── 3 · Logs: Active for a Pending employee, with a comment ── */
  if(typeof EMP_LOG!=='undefined'&&!EMP_LOG['mark-active'])EMP_LOG['mark-active']={label:'Active',owner:'HR'};
  if(typeof EMP_STEP!=='undefined'&&!EMP_STEP['mark-active'])EMP_STEP['mark-active']={cta:'Mark Active',hint:'Make this employee Active now. Add a comment to say why.'};
  if(typeof empLogOptionsBase==='function'){
    const b0=empLogOptionsBase;
    empLogOptionsBase=function(emp,st){const out=b0.apply(this,arguments);return st&&st.status==='Pending'?out.concat(['mark-active']):out;};
  }
  /* The status after an Active log: Active, and the logs after it read from there. */
  if(typeof empState==='function'){
    const e0=empState;
    empState=function(emp){
      const logs=typeof empLogs==='function'?empLogs(emp):(emp.logs||[]);
      const i=logs.findIndex(function(l){return l.type==='mark-active';});
      if(i<0)return e0.apply(this,arguments);
      const view=Object.assign({},emp,{logs:logs.slice(0,i).concat([{type:'active'},{type:'onboarding'}])});
      return e0.call(this,view);
    };
  }
  /* The Super Admin's Logs head shows only the step that is due (Start Onboarding Process for a Pending employee):
     Mark Active sits beside it. Other roles get it with their own open steps. */
  if(typeof empNextCardHTML==='function'){
    const c0=empNextCardHTML;
    empNextCardHTML=function(kind,emp){
      if(!(typeof empAllStepsRight==='function'&&empAllStepsRight()&&empState(emp).status==='Pending'&&typeof lplBarHTML==='function'))return c0.apply(this,arguments);
      const l0=lplBarHTML;
      lplBarHTML=function(status,sub,actions,o){
        actions=(actions||[]).concat([{label:'Mark Active',onclick:"empOpenLogModal('"+kind+"',"+emp.id+",'mark-active','sb')",quiet:true}]);
        return l0.call(this,status,sub,actions,Object.assign({},o||{},{maxBtns:actions.length}));
      };
      try{return c0.apply(this,arguments);}finally{lplBarHTML=l0;}
    };
  }
  if(typeof empStepWhyNot==='function'){
    const w0=empStepWhyNot;
    empStepWhyNot=function(emp,k){const r=w0.apply(this,arguments);return r&&k==='mark-active'?'Available for Pending employees.':r;};
  }
})();
