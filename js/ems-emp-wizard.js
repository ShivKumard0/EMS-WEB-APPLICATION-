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
    /* No Benefits & Eligibility step (product owner, 13 Nov 2026): Access Governance is the last step and creates the
       employee. Benefits stay on by default and no card enrollment is started; both remain on the employee's record. */
    const bi=EA_STEPS.findIndex(function(s){return s.key==='onc';});if(bi>=0)EA_STEPS.splice(bi,1);
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

  /* ── 4 · Bulk Upload Employees: the same details as Create New Employee (product owner, 13 Nov 2026) ──
     The format and the sample ask what the form asks, in its order: Identity (First Name, Last Name, Email, Country
     Dial Code, Phone Number, Gender, Date of Birth, Nationality), Employment Structure (Joining Date, Employment Type,
     Department, Designation, Work Location) and Access Governance (Assign Team, Reporting Manager, Role within
     Team). No Benefits Eligible (the form has no Benefits & Eligibility step), no Employment Country and no ID Proof Types (the form no longer asks them). Every employee is
     created Pending - no status choice - and is made Active from their Logs, like one added by hand. While the
     presentation prepares its company, the original format is used, so the prepared people are exactly as before. */
  if(typeof EMB_COLS!=='undefined'&&typeof EMB_LISTS!=='undefined'){
    const C=function(k,h,req,purpose,fmt,val,o){return Object.assign({k:k,h:h,req:req,purpose:purpose,fmt:fmt,val:val,note:''},o||{});};
    const NEW_COLS=[
      C('fname','First Name',1,'The employee\'s first (given) name.','Text','Cannot be blank. Spaces before and after are removed.',{note:'As on official records.'}),
      C('lname','Last Name',1,'The employee\'s last (family) name.','Text','Cannot be blank.'),
      C('email','Email',1,'Identifies the employee in ADT.','name@company.com','A valid email. Unique in the file and among this company\'s employees.',{note:'Never include passwords.'}),
      C('dial','Country Dial Code',1,'Dialling prefix of the phone number.','Text, e.g. +91','One of the listed dial codes.',{list:'dial',note:'Keep the + sign.'}),
      C('phone','Phone Number',1,'The employee\'s contact number.','Text, digits only','At least 7 digits.',{note:'Enter as text so no digit is lost.'}),
      C('gender','Gender',1,'Gender.','Listed value','One of the listed values.',{list:'gender'}),
      C('dob','Date of Birth',1,'Date of birth.','YYYY-MM-DD','A valid past date, before the Joining Date.',{date:1}),
      C('nationality','Nationality',1,'Nationality.','Listed value','One of the listed nationalities.',{list:'nationality'}),
      C('doj','Joining Date',1,'Employment start date.','YYYY-MM-DD','A valid calendar date.',{date:1,note:'Every employee is created Pending; make them Active from their Logs.'}),
      C('empType','Employment Type',1,'Employment arrangement.','Listed value','One of the listed employment types.',{list:'empType'}),
      C('dept','Department',1,'Department in Company Structure.','Listed value','Must exist in this company\'s Company Structure.',{list:'dept',note:'Departments are never created from the file.'}),
      C('designation','Designation',1,'Designation in Company Structure.','Listed value','Must exist in this company\'s Company Structure.',{list:'desig',note:'Designations are never created from the file.'}),
      C('location','Work Location',1,'Where the employee works.','Listed value','One of the listed work locations.',{list:'location'}),
      C('team','Assign Team',0,'The team the employee belongs to.','Listed value','One of this company\'s teams.',{list:'team'}),
      C('manager','Reporting Manager',0,'The employee\'s reporting manager.','Name or email','An employee of this company, or another row in this file; not the employee themself.',{note:'Gives the manager no extra access.'}),
      C('teamRole','Role within Team',0,'The employee\'s role in the team.','Team Member or Team Manager','One of the listed roles. Needs Assign Team.',{list:'teamRole'})];
    const NEW_LISTS=[['dial','Country Dial Code'],['gender','Gender'],['nationality','Nationality'],['empType','Employment Type'],['dept','Department'],['desig','Designation'],
      ['location','Work Location'],['team','Assign Team'],['teamRole','Role within Team']];
    const OLD_COLS=EMB_COLS.slice(),OLD_LISTS=EMB_LISTS.slice();
    const building=function(){return typeof presBuilding!=='undefined'&&presBuilding;};
    const useCols=function(){const nw=!building(),c=nw?NEW_COLS:OLD_COLS,l=nw?NEW_LISTS:OLD_LISTS;
      EMB_COLS.splice.apply(EMB_COLS,[0,EMB_COLS.length].concat(c));EMB_LISTS.splice.apply(EMB_LISTS,[0,EMB_LISTS.length].concat(l));return nw;};
    useCols();
    if(typeof EMB_STEPS!=='undefined'&&EMB_STEPS.length)
      EMB_STEPS[EMB_STEPS.length-1]='Every employee is created Pending. Make each one Active from their Logs (Mark Active), as for an employee added one at a time.';
    if(typeof embLists==='function'){
      const l0=embLists;
      embLists=function(){const L=l0.apply(this,arguments);L.team=eaTeamNames();L.teamRole=EA_TEAM_ROLES.slice();return L;};
    }
    if(typeof embFormatBook==='function'){const f0=embFormatBook;embFormatBook=function(){useCols();return f0.apply(this,arguments);};}
    /* Every employee starts Pending: the status is shown, not chosen. */
    if(typeof embSetStatus==='function')embSetStatus=function(){if(emb)emb.status='Pending';};
    if(typeof embHTML==='function'){
      const h0=embHTML;
      embHTML=function(){
        if(emb)emb.status='Pending';
        const out=h0.apply(this,arguments),tmp=document.createElement('div');tmp.innerHTML=out;
        const cs=tmp.querySelector('#csw-emb-status');
        if(cs){const d=document.createElement('div');d.className='ea-locked';d.innerHTML=(typeof EA_ICONS!=='undefined'?EA_ICONS.lock:'')+'<span>Pending</span>';cs.replaceWith(d);}
        return tmp.innerHTML;
      };
    }
    /* A manager given by name is read as that person: another row of the file, or an employee of this company. */
    if(typeof embCheck==='function'){
      const k0=embCheck;
      embCheck=function(grid){
        if(!useCols())return k0.apply(this,arguments);
        const ix=function(k){return EMB_COLS.findIndex(function(c){return c.k===k;});};
        const mi=ix('manager'),fi=ix('fname'),li=ix('lname'),ei=ix('email');
        const g=(grid||[]).map(function(r){return (r||[]).slice();});
        const byName={};g.slice(1).forEach(function(r){const n=(String(r[fi]||'').trim()+' '+String(r[li]||'').trim()).trim().toLowerCase();if(n&&r[ei]&&!byName[n])byName[n]=String(r[ei]).trim();});
        g.slice(1).forEach(function(r){
          const v=String(r[mi]==null?'':r[mi]).trim();if(!v||v.indexOf('@')>=0)return;
          const fr=byName[v.toLowerCase()];if(fr){r[mi]=fr;return;}
          const e=typeof idEmpByName==='function'?idEmpByName(v,idEntity()):null;if(e&&e.email)r[mi]=e.email;
        });
        const res=k0.call(this,g);if(!res||res.error)return res;
        const L=embLists();
        res.rows.forEach(function(r){
          const add=[],d=r.d;
          if(d.team){const p=embPick(L.team,d.team);if(p)d.team=p;else add.push({field:'Assign Team',msg:'Assign Team not found in this company'});}
          if(d.teamRole){const p=embPick(L.teamRole,d.teamRole);if(!p)add.push({field:'Role within Team',msg:'Role within Team must be Team Member or Team Manager'});
            else{d.teamRole=p;if(!d.team)add.push({field:'Role within Team',msg:'Role within Team needs Assign Team'});}}
          if(!add.length)return;
          r.errors=add.concat(r.status==='Valid'?[]:r.errors);r.status='Invalid';
        });
        const n=function(s){return res.rows.filter(function(r){return r.status===s;}).length;};
        res.valid=n('Valid');res.invalid=n('Invalid');res.duplicate=n('Duplicate');
        return res;
      };
    }
    /* Created exactly as one added by hand: Pending, the team and role on its first log, benefits on, no card enrollment. */
    if(typeof embCreate==='function'){
      const c0=embCreate;
      embCreate=function(){
        if(!useCols()||typeof eaCreateEmployee!=='function')return c0.apply(this,arguments);
        if(emb)emb.status='Pending';
        const a0=eaCreateEmployee;
        eaCreateEmployee=function(d,kind,o){
          const t=d.team||'';d.teams=t?[t]:[];d.accessRole='Employee';
          d.onc={enroll:false,benefitsEligible:true,fields:{}};   // as the form: benefits on, no card enrollment
          if(o&&o.action)o.action=o.action.replace('No team assigned yet.',(t?'Assigned to '+t+(d.teamRole?' as '+d.teamRole:'')+'.':'No team assigned yet.')+' Access role: Employee.');
          return a0.apply(this,arguments);
        };
        try{return c0.apply(this,arguments);}finally{eaCreateEmployee=a0;}
      };
    }
    /* The sample: every column filled, with this company's own teams and managers. */
    const teamFor=function(dept){const T=eaTeamNames();return embPick(T,dept+' Team')||T.find(function(t){return t.toLowerCase().indexOf(String(dept||'').toLowerCase())===0;})||T[0]||'';};
    const mgrName=function(team,given){
      if(given&&given.indexOf('@')>=0){const e=typeof idEmpByEmail==='function'?idEmpByEmail(given,idEntity()):null;if(e)return e.name;}
      if(given)return given;
      const ok=(team?eaTeamManagers(team):[]).find(function(n){return typeof idEmpByName==='function'&&!!idEmpByName(n,idEntity());});
      return ok||'';
    };
    const fill=function(r){const team=teamFor(r.dept);return Object.assign({},r,{team:team,manager:mgrName(team,r.manager),teamRole:'Team Member'});};
    if(typeof embSampleRows==='function'){
      const s0=embSampleRows;
      embSampleRows=function(){const rows=s0.apply(this,arguments);if(!rows||building())return rows;useCols();return rows.map(fill);};
    }
    if(typeof presSampleRows==='function'){
      const p0=presSampleRows;
      presSampleRows=function(){const rows=p0.apply(this,arguments);return rows?rows.map(fill):rows;};
    }
  }
})();
