/* ══ IDENTITY: ENTITIES, EMPLOYEES AND USERS BY ID ══════════════════════════
   One directory for the whole app. Records store IDs; screens show names and
   Employee Codes.

   - Entity ID      entitiesData[].entityId (ENT-00421). Every entity-owned
                    record carries it; the active entity is the header's.
   - Employee ID    eid, internal and stable (E-1001). One per employment
                    record in Employees (Direct, Global) and Admin Access.
                    empId stays the Employee Code people read (EMP006).
   - User ID        userId (U-1001). A sign-in account, keyed by its email.
                    An account may be linked to the employee record of the
                    same person (eid), which is how "my own records" work.

   SIGNED IN, NOT IMPERSONATED. The signed-in account (Sign in screen) is the
   person behind every action for the whole session. Switch Role only offers
   the roles that account holds in the active entity (Company Settings →
   Roles & Access, and an active employee record for the Employee role).

   MIGRATION. Records written before IDs existed are matched once, at load:
   by email first; by name only when exactly one candidate exists, and that
   match is listed for review; never when two candidates exist - those stay
   unmatched and are flagged. Nothing is re-created or merged by guesswork. */

/* ── Entities ─────────────────────────────────────────────────────────── */
function idEntityRec(eid){return (typeof entitiesData!=='undefined'?entitiesData:[]).find(function(e){return e.entityId===eid;})||null;}
function idEntityByName(name){const e=(typeof entitiesData!=='undefined'?entitiesData:[]).find(function(x){return x.name===name;});return e?e.entityId:'';}
function idEntityName(eid){const e=idEntityRec(eid);return e?e.name:String(eid||'');}
/* The active entity (header → Switch Entity). */
function idEntity(){
  const list=typeof entitiesData!=='undefined'?entitiesData:[];
  const e=list.find(function(x){return typeof seSelectedEntity!=='undefined'&&x.id===seSelectedEntity;})||list[0];
  return e?e.entityId:'';
}
/* Records that predate entity scoping were all created in the first entity. */
const ID_HOME_ENTITY=(typeof entitiesData!=='undefined'&&entitiesData[0])?entitiesData[0].entityId:'';
/* A stored entity reference that may still be a name (old records) → ID. */
function idEntityRef(v){if(!v)return '';if(idEntityRec(v))return v;return idEntityByName(v)||v;}

/* ── Migration review list ─────────────────────────────────────────────── */
/* {kind, ref, value, note, matched:'email'|'name'|'' } - shown in Company
   Settings → Activity & Audit → Logs for whoever manages roles. */
const idMigrationLog=[];
function idNote(kind,ref,value,note,matched,ent){idMigrationLog.push({kind:kind,ref:ref,value:value,note:note,matched:matched||'',entityId:ent==null?ID_HOME_ENTITY:ent});}

/* ── Employees ────────────────────────────────────────────────────────── */
function idEmpStores(){
  return [['de',typeof directEmpData!=='undefined'?directEmpData:[]],['ge',typeof globalEmpData!=='undefined'?globalEmpData:[]],
    ['ax',typeof AX_EMPLOYEES!=='undefined'?AX_EMPLOYEES:[]]];
}
let idEmpNext=1001;
function idEmpAll(){let out=[];idEmpStores().forEach(function(s){out=out.concat(s[1]);});return out;}
/* Give a record its internal ID and entity (new records: the active entity). */
function idEmpRegister(rec,ent){
  if(!rec)return rec;
  if(!rec.eid)rec.eid='E-'+(idEmpNext++);
  if(!rec.entityId)rec.entityId=ent||idEntity()||ID_HOME_ENTITY;
  return rec;
}
idEmpStores().forEach(function(s){s[1].forEach(function(r){idEmpRegister(r,ID_HOME_ENTITY);});});
function idEmp(eid){return eid?idEmpAll().find(function(e){return e.eid===eid;})||null:null;}
function idEmpActive(e){return !!e&&e.status!=='Inactive';}
function idEmpsIn(ent,withInactive){ent=ent||idEntity();return idEmpAll().filter(function(e){return e.entityId===ent&&(withInactive||idEmpActive(e));});}
function idEmpName(eid){const e=idEmp(eid);return e?e.name:'';}
/* The employment kind of a record: Direct, Global or neither (Admin Access people are direct staff). */
function idEmpKind(e){return idEmpStores().find(function(s){return s[1].indexOf(e)>=0;})[0];}
/* A Code is unique inside an entity, not across entities. */
function idEmpByCode(code,ent){ent=ent||idEntity();return code?idEmpAll().find(function(e){return e.entityId===ent&&String(e.empId)===String(code);})||null:null;}
function idEmpByEmail(email,ent){
  email=String(email||'').trim().toLowerCase();if(!email)return null;
  return idEmpAll().find(function(e){return (!ent||e.entityId===ent)&&String(e.email||'').toLowerCase()===email;})||null;
}

/* ── Users (sign-in accounts) ─────────────────────────────────────────── */
const idUsers=[];
let idUserNext=1001;
function idNorm(email){return String(email||'').trim().toLowerCase();}
function idUserByEmail(email){email=idNorm(email);return email?idUsers.find(function(u){return idNorm(u.email)===email;})||null:null;}
function idUser(uid){return uid?idUsers.find(function(u){return u.userId===uid;})||null:null;}
function idAddUser(name,email,kind){
  let u=idUserByEmail(email);
  if(u)return u;
  u={userId:'U-'+(idUserNext++),name:name,email:email,kind:kind||'Client user',eid:'',status:'Active'};
  idUsers.push(u);return u;
}
/* What people read: the linked employee's name, else the account's. */
function idName(uid){
  const u=idUser(uid);
  if(!u)return uid==='System'?'System':String(uid||'');
  const e=idEmp(u.eid);return e?e.name:u.name;
}
function idNames(list,sep){return (list||[]).map(idName).join(sep==null?', ':sep);}
function idEmail(uid){const u=idUser(uid);return u?u.email:'';}
function idUserOfEmp(eid){const u=eid?idUsers.find(function(x){return x.eid===eid;}):null;return u?u.userId:'';}
function idEmpOfUser(uid){const u=idUser(uid);return u?idEmp(u.eid):null;}
/* Active: the account is active and, when linked, so is the employment. */
function idUserActive(uid){
  const u=idUser(uid);if(!u||u.status!=='Active')return false;
  const e=idEmp(u.eid);return !e||idEmpActive(e);
}

/* ── Building the directory from what exists ───────────────────────────── */
(function(){
  /* 1. Role holders (Company Settings → Roles & Access): each row names an account by email. */
  (typeof csRoles!=='undefined'?csRoles:[]).forEach(function(r){
    const u=idAddUser(r.user,r.email,r.kind);
    r.userId=u.userId;
    r.entityId=r.entityId||ID_HOME_ENTITY;
  });
  /* 2. Opendhi staff accounts. */
  (typeof CS_STAFF!=='undefined'?CS_STAFF:[]).forEach(function(s){const u=idAddUser(s.name,s.email,'Opendhi staff');s.userId=u.userId;});
  /* 3. Employees with an email have a self-service account; link by email. */
  idEmpAll().forEach(function(e){
    if(!e.email)return;
    const u=idAddUser(e.name,e.email,'Client user');
    if(!u.eid)u.eid=e.eid;
  });
  /* 4. Employees without an email: link to an unlinked account in the same
        entity only when exactly one has the same name - and list it. */
  idEmpAll().forEach(function(e){
    if(e.email||idUserOfEmp(e.eid))return;
    const cands=idUsers.filter(function(u){
      return !u.eid&&u.name===e.name&&(typeof csRoles==='undefined'||csRoles.some(function(r){return r.userId===u.userId&&(r.entityId===e.entityId||r.entityId==='*');}));
    });
    if(cands.length===1){cands[0].eid=e.eid;idNote('Employee',e.empId+' '+e.name,cands[0].email,'Employee record has no email; linked to the only account with this name in '+idEntityName(e.entityId)+'.','name',e.entityId);}
    else if(cands.length>1)idNote('Employee',e.empId+' '+e.name,'','Several accounts carry this name; not linked. Add the employee\'s email to link the right one.','',e.entityId);
  });
})();
/* A role row added later (Roles & Access) names an existing account or creates one. */
function idEnsureUser(name,email,kind){return idAddUser(name,email,kind).userId;}

/* Resolve a historical name (records written before IDs) to an account in an
   entity. Exactly one candidate → its ID (logged as a name match); none or
   several → '' and the reference is flagged for review. */
function idUserByName(name,ent,ctx){
  if(!name)return '';
  if(name==='System')return 'System';
  ent=ent||ID_HOME_ENTITY;
  const inEnt=function(u){
    const e=idEmp(u.eid);
    if(e&&e.entityId===ent)return true;
    return typeof csRoles!=='undefined'&&csRoles.some(function(r){return r.userId===u.userId&&(r.entityId===ent||r.entityId==='*');});
  };
  const c=idUsers.filter(function(u){return idName(u.userId)===name&&inEnt(u);});
  if(c.length===1){if(ctx&&ctx.log)idNote(ctx.kind||'Record',ctx.ref||'',name,'Matched to the only account with this name in '+idEntityName(ent)+'.','name',ent);return c[0].userId;}
  if(ctx)idNote(ctx.kind||'Record',ctx.ref||'',name,c.length?'Several accounts in '+idEntityName(ent)+' carry this name; left unmatched.':'No account in '+idEntityName(ent)+' carries this name; left unmatched.','',ent);
  return '';
}
function idEmpByName(name,ent){
  ent=ent||ID_HOME_ENTITY;
  const c=idEmpAll().filter(function(e){return e.entityId===ent&&e.name===name;});
  return c.length===1?c[0]:null;
}

/* ── Who belongs to an entity ─────────────────────────────────────────── */
/* Roles & Access role names an account holds in an entity, plus the
   self-service role its active employee record there gives it. */
function idRolesOf(uid,ent){
  ent=ent||idEntity();
  const out=(typeof csRoles!=='undefined'?csRoles:[]).filter(function(r){return r.userId===uid&&(r.entityId===ent||r.entityId==='*');}).map(function(r){return r.role;});
  const e=idEmpOfUser(uid);
  if(e&&e.entityId===ent&&idEmpActive(e))out.push(idEmpKind(e)==='ge'?'EOR Employee':'Direct Employee');
  return out.filter(function(x,i){return out.indexOf(x)===i;});
}
function idUsersIn(ent){ent=ent||idEntity();return idUsers.filter(function(u){return idUserActive(u.userId)&&idRolesOf(u.userId,ent).length>0;});}
function idInEntity(uid,ent){return idUserActive(uid)&&idRolesOf(uid,ent).length>0;}
function idEntitiesOf(uid){return (typeof entitiesData!=='undefined'?entitiesData:[]).filter(function(e){return idRolesOf(uid,e.entityId).length>0;}).map(function(e){return e.entityId;});}

/* Picker labels: the name, with the email when two people share it. */
function idLabel(uid,among){
  const n=idName(uid);
  const twin=(among||idUsers.map(function(u){return u.userId;})).some(function(x){return x!==uid&&idName(x)===n;});
  return twin?n+' · '+idEmail(uid):n;
}
function idLabels(list){return list.map(function(u){return idLabel(u,list);});}
function idFromLabel(label,list){return (list||[]).find(function(u){return idLabel(u,list)===label;})||'';}

/* ── The signed-in account ────────────────────────────────────────────── */
const ID_SESSION_KEY='adt-user',ID_AUTH_KEY='adt-auth-user';
let idSessionUser='';
/* The account that signed in on the Sign in screen. Switch User changes the identity the session works
   as (idSessionUser); this stays the person at the keyboard, so a personal act - an employee's own legal
   declaration - done through Switch User is recorded as simulated, with both people (decision C1). */
let idAuthUser='';
function idAuthMe(){return idAuthUser||idSessionUser;}
function idSwitched(){return !!idAuthUser&&!!idSessionUser&&idAuthUser!==idSessionUser;}
function idMe(){return idSessionUser;}
function idMeName(){return idName(idSessionUser);}
/* Sign in by email: the account must exist, be active and hold a role in some entity. */
function idSignIn(email){
  const u=idUserByEmail(email);
  if(!u)return {error:'No ADT account uses '+String(email||'').trim()+'.'};
  if(!idUserActive(u.userId))return {error:'This account is inactive. Ask your administrator to reactivate it.'};
  const ents=idEntitiesOf(u.userId);
  if(!ents.length)return {error:'This account has no role in any entity yet. Ask your administrator to assign one in Company Settings → Roles & Access.'};
  idSessionUser=u.userId;idAuthUser=u.userId;
  try{sessionStorage.setItem(ID_SESSION_KEY,u.userId);sessionStorage.setItem(ID_AUTH_KEY,u.userId);}catch(e){}
  /* Land in an entity the account belongs to. */
  if(ents.indexOf(idEntity())<0&&typeof entitiesData!=='undefined'){const e=entitiesData.find(function(x){return x.entityId===ents[0];});if(e)seSelectedEntity=e.id;}
  return {userId:u.userId};
}
/* Switch Role's direct switch: the session becomes another account that is
   active in the active entity - no sign-in screen. From then on every action
   is that account's, under its own User ID. */
function idSwitchTo(uid){
  if(!idUser(uid)||!idInEntity(uid,idEntity()))return false;
  idSessionUser=uid;
  try{sessionStorage.setItem(ID_SESSION_KEY,uid);}catch(e){}
  return true;
}
function idSignOut(){idSessionUser='';idAuthUser='';try{sessionStorage.removeItem(ID_SESSION_KEY);sessionStorage.removeItem(ID_AUTH_KEY);}catch(e){}}
/* A tab that was already signed in keeps its account. */
(function(){
  let saved='';try{saved=sessionStorage.getItem(ID_SESSION_KEY)||'';}catch(e){}
  if(saved&&idUser(saved))idSessionUser=saved;
  let auth='';try{auth=sessionStorage.getItem(ID_AUTH_KEY)||'';}catch(e){}
  idAuthUser=auth&&idUser(auth)?auth:idSessionUser;
})();

/* ── RBAC workspaces: entity by ID, team members by account ─────────────── */
/* A workspace belongs to the entity of the same name, or to the platform
   ('*'). A member name becomes the account it unambiguously names. A member
   of a workspace whose entity this ADT instance does not hold, or a name two
   accounts share, stays listed as unmatched and gets no access. */
(function(){
  (typeof rbacWorkspacesData!=='undefined'?rbacWorkspacesData:[]).forEach(function(w){
    if(w.entityId==null)w.entityId=w.module==='Platform Global'?'*':(idEntityByName(w.name)||'');
    w.teams.forEach(function(t){
      if(t.unmatched)return;
      const ids=[],un=[];
      t.members.forEach(function(n){
        if(idUser(n)){ids.push(n);return;}
        let uid='';
        if(w.entityId==='*'){const c=idUsers.filter(function(u){return idName(u.userId)===n;});uid=c.length===1?c[0].userId:'';}
        else if(w.entityId)uid=idUserByName(n,w.entityId);
        const ent=w.entityId==='*'?ID_HOME_ENTITY:w.entityId;
        if(uid){ids.push(uid);idNote('RBAC team',w.name+' · '+t.name,n,'Member matched to the only account with this name'+(w.entityId==='*'?' on the platform':' in '+idEntityName(w.entityId))+'.','name',ent);}
        else{un.push(n);if(w.entityId)idNote('RBAC team',w.name+' · '+t.name,n,'No single account matches this name; not given access.','',ent);}
      });
      t.members=ids;t.unmatched=un;
    });
  });
})();

/* ── Leave requests: linked to an Employee ID where that is certain ───── */
/* Leave data names its employee as written (and has its own codes). Each
   request is linked to the Employee ID of the one employee in its entity with
   that email or name; a name nobody (or several) carries stays unlinked - its
   requests are then seen only by those allowed to see every request. Listed
   once per name for review. */
(function(){
  if(typeof allLeavesData==='undefined')return;
  const seen={};
  allLeavesData.forEach(function(l){
    l.entityId=l.entityId||ID_HOME_ENTITY;
    if(l.eid!=null)return;
    const e=idEmpByEmail(l.email,l.entityId)||idEmpByName(l.name,l.entityId);
    l.eid=e?e.eid:'';
    if(seen[l.name])return;seen[l.name]=1;
    idNote('Leave requests',l.name,l.name,e?'Linked to '+e.empId+' by name (leave data carries no Employee ID).':'No employee record carries this name; its requests are visible only to those who see every request.',e?'name':'',l.entityId);
  });
})();
