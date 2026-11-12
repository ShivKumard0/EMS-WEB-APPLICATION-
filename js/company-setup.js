/* ══ ADD COMPANY (FR-EMS-EMP-01 FR-EMP-09, 8 Nov 2026) ══════════════════════
   Administration → Company Settings → + : a client company that has bought
   Expense Management, created inside the same ADT, with its own Entity ID.

   Created with it, and nothing more:
   - the company record (name, type, country, timezone, base currency, plan);
   - Module Control set to what was bought (Expenses, Corporate Cards, Funding
     & Budgets), the rest as for every company;
   - OpenDhi's administration of it (the creator's Opendhi role); the client's own
     administrator and users are added in Roles & Access;
   - its RBAC workspace with the standard Expense Management teams, empty -
     nobody is made an approver or verifier automatically;
   - the platform's default approval routes for each request type, pointed at
     this company's own teams, with no fallback approver; and the standard
     advance types on those routes.
   Nothing is copied from another company: no employees, masters, policies,
   amounts, budgets, funding, cards or balances. Company Structure, policies,
   wallets, budgets and the card programme are configured by the company. */

const NC_TYPES=['EOR Entity','PEO Entity'];
const NC_PLANS=['Enterprise','Professional'];
const NC_TZ={'India':'Asia/Kolkata','Germany':'Europe/Berlin','France':'Europe/Paris','Italy':'Europe/Rome','Netherlands':'Europe/Amsterdam','Portugal':'Europe/Lisbon',
  'Spain':'Europe/Madrid','United Kingdom':'Europe/London','United States':'America/New_York','Singapore':'Asia/Singapore'};
const NC_TEAMS=[['Expense Approvers','Expense Approver'],['Imprest Custodians','Imprest Custodian'],['Budget Approvers','Budget Approver'],['Funding Verifiers','Funding Verifier'],
  ['Budget Owners','Budget Owner'],['Card Approvers','Card Approver'],['Card Load Verifiers','Card Load Verifier']];
function ncCountries(){return ['India'].concat(EA_COUNTRIES.filter(function(c){return c!=='India';}));}
function ncZones(){const z=[];Object.keys(NC_TZ).forEach(function(k){if(z.indexOf(NC_TZ[k])<0)z.push(NC_TZ[k]);});return z;}
function ncCurrencies(){return typeof EXP_CURRENCIES!=='undefined'?EXP_CURRENCIES.slice():['INR'];}

let nc=null;
function ncCanCreate(){return typeof emsCan==='function'&&emsCan('foundation.entity.create');}
function ncStart(){
  if(!ncCanCreate()){emsDeny('create a company');return;}
  nc={name:'',type:'EOR Entity',country:'India',tz:'Asia/Kolkata',cur:'INR',plan:'Enterprise',cards:true,budgets:true,error:''};
  ncRender();
}
function ncClose(){nc=null;const h=document.getElementById('nc-host');if(h)h.remove();}
function ncRender(){
  if(!nc){ncClose();return;}
  let h=document.getElementById('nc-host');
  if(!h){h=document.createElement('div');h.id='nc-host';document.body.appendChild(h);}
  h.innerHTML=ncHTML();
}
function ncSync(){
  if(!nc)return;
  const n=document.getElementById('nc-name');if(n)nc.name=n.value.trim();
  ['type','country','tz','cur','plan'].forEach(function(k){if(document.getElementById('csw-nc-'+k)){const v=getCSValue('nc-'+k);if(v)nc[k]=v;}});
}
/* A new country brings its usual timezone and currency, which can still be changed. */
function ncCountry(v){
  if(!nc)return;ncSync();nc.country=v;
  if(NC_TZ[v])nc.tz=NC_TZ[v];
  if(typeof BG_COUNTRY_CUR!=='undefined'&&BG_COUNTRY_CUR[v]&&ncCurrencies().indexOf(BG_COUNTRY_CUR[v])>=0)nc.cur=BG_COUNTRY_CUR[v];
  ncRender();
}
function ncToggle(k){if(!nc)return;ncSync();if(k==='cards'||k==='budgets')nc[k]=!nc[k];ncRender();}
function ncHTML(){
  const sw=function(k,label,on,locked){
    return '<div class="ea-toggle-row"><div><div class="ea-block-head">'+label+'</div></div>'
      +(locked?'<span class="lp-status-badge tone-ok">Included</span>'
        :'<label class="cs-toggle"><input type="checkbox"'+(on?' checked':'')+' onchange="ncToggle(\''+k+'\')"><span class="cs-toggle-slider"></span></label>')+'</div>';
  };
  return '<div class="ct-modal-overlay nc-overlay"><div class="ct-modal nc-modal" role="dialog" aria-modal="true" aria-label="Add Company" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Add Company</span><button class="ct-modal-close" onclick="ncClose()" title="Close">'+EMB_ICO.x+'</button></div>'
    +'<div class="ep-form-grid">'
      +'<div class="ep-form-group" style="grid-column:1/-1"><label class="ep-form-label">Company Name <span class="req">*</span></label><input class="ep-form-input" id="nc-name" value="'+attrSafe(nc.name)+'" placeholder="Registered company name"></div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Entity Type <span class="req">*</span></label>'+apCS('nc-type',NC_TYPES,nc.type,'Select type')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Country <span class="req">*</span></label>'+apCS('nc-country',ncCountries(),nc.country,'Select country','ncCountry')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Timezone <span class="req">*</span></label>'+apCS('nc-tz',ncZones(),nc.tz,'Select timezone')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Base Currency <span class="req">*</span></label>'+apCS('nc-cur',ncCurrencies(),nc.cur,'Select currency')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Plan <span class="req">*</span></label>'+apCS('nc-plan',NC_PLANS,nc.plan,'Select plan')+'</div>'
    +'</div>'
    +(nc.error?'<div class="wb-note is-bad">'+sbEsc(nc.error)+'</div>':'')
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="ncClose()">Cancel</button><button class="ep-save-btn" onclick="ncSave()">Create Company</button></div></div>'
    +'</div></div>';
}
function ncSlug(name){
  let base=String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'company',s=base,i=2;
  while(entitiesData.some(function(e){return e.id===s;}))s=base+'-'+(i++);
  return s;
}
function ncNextEntityId(){
  let n=entitiesData.reduce(function(m,e){const v=parseInt(String(e.entityId||'').replace(/\D/g,''),10);return isNaN(v)?m:Math.max(m,v);},0)+1;
  while(entitiesData.some(function(e){return e.entityId==='ENT-'+String(n).padStart(5,'0');}))n++;
  return 'ENT-'+String(n).padStart(5,'0');
}
function ncSave(){
  if(!nc)return;
  if(!ncCanCreate()){emsDeny('create a company');return;}
  ncSync();
  const fail=function(m){nc.error=m;ncRender();};
  if(!nc.name)return fail('Company Name is required.');
  if(entitiesData.some(function(e){return e.name.toLowerCase()===nc.name.toLowerCase();}))return fail('A company named '+nc.name+' already exists.');
  if(NC_TYPES.indexOf(nc.type)<0)return fail('Pick the entity type.');
  if(ncCountries().indexOf(nc.country)<0)return fail('Pick the country.');
  if(typeof ccTzValid==='function'&&!ccTzValid(nc.tz))return fail('Pick a standard timezone.');
  if(ncCurrencies().indexOf(nc.cur)<0)return fail('Pick the base currency.');
  const r=ncCreate(nc);
  if(r.error)return fail(r.error);
  ncClose();
  /* Into the new company, on its Company Settings. */
  seSelectedEntity=r.ent.id;
  if(typeof appEntityChanged==='function')appEntityChanged();
  navigatePage('settings');
  if(typeof openCsSidebar==='function')openCsSidebar(1);
  showToast('Company created','success',r.ent.name+' · '+r.ent.entityId+'. Set up Company Structure, Roles & Access and team members next.');
}
/* The creation itself, kept apart from the popup so it is one checked step. */
function ncCreate(d){
  const s=stampNow(),at=s.date+' | '+s.time,me=idMe(),meName=idMeName(),today=typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);
  const words=String(d.name).trim().split(/\s+/);
  const ent={id:ncSlug(d.name),initials:(words[0][0]+(words[1]?words[1][0]:(words[0][1]||''))).toUpperCase(),name:String(d.name).trim(),entityId:ncNextEntityId(),
    type:d.type,country:d.country,plan:d.plan,employees:0,active:true,timezone:d.tz,baseCurrency:d.cur,createdBy:me,createdAt:at,
    logs:[{date:s.date,time:s.time,user:meName,userId:me,status:'Active',action:'Company created by '+meName+' ('+d.type+', '+d.country+', '+d.cur+', '+d.tz+').'}]};
  entitiesData.push(ent);
  const E=ent.entityId;
  /* Module Control: what was bought. */
  const st=mcNewCompanyState(mcStateOf(E));st.expenses=true;st.cards=!!d.cards;st.budgets=!!d.budgets;
  mcLogsOf(E).unshift({date:s.date,time:s.time,user:meName,userId:me,status:'Enabled',
    action:'Expenses'+(d.cards?', Corporate Cards':'')+(d.budgets?', Funding & Budgets':'')+' enabled when '+ent.name+' was created.'+(!d.cards||!d.budgets?' Not bought: '+[!d.cards?'Corporate Cards':'',!d.budgets?'Funding & Budgets':''].filter(Boolean).join(', ')+'.':'')});
  /* OpenDhi keeps administering it: an OpenDhi role on every company already covers it; otherwise the
     creator's Opendhi role is given for this company. The client's own administrator is added in
     Roles & Access (Entity Super Admin) - never automatically. */
  if(!csRoles.some(function(x){return x.userId===me&&x.entityId==='*'&&CS_ROLE_SETS['Opendhi staff'].indexOf(x.role)>=0;}))
    csRoles.push({id:csRoleNext++,kind:'Opendhi staff',role:'Opendhi Super Admin',userId:me,user:meName,email:idEmail(me),entityId:E,added:csRoleToday()});
  /* Its workspace with the standard teams, no members. */
  const w=wsSeed(wsNextKey++,ent.name,wsNextEntity++,'Entity','','Active',meName,at,'Standard Expense Management teams.',NC_TEAMS.map(function(t){return wsTeam(t[0],t[1],[]);}));
  w.entityId=E;w.logs=[{date:s.date,time:s.time,user:meName,status:'Active',action:'Workspace created with the company: '+NC_TEAMS.map(function(t){return t[0];}).join(', ')+' (no members yet).'}];
  rbacWorkspacesData.unshift(w);
  const homeWs=rbacWorkspacesData.find(function(x){return x.entityId===ID_HOME_ENTITY;});
  const teamMap={};
  if(homeWs)homeWs.teams.forEach(function(t){const nt=w.teams.find(function(x){return x.name===t.name;});if(nt)teamMap[String(t.id)]=String(nt.id);});
  /* The default route of each request type: whole company, all categories, no amount band. */
  const wfMap={},made=[];
  caWorkflows.filter(function(x){return x.entity===ID_HOME_ENTITY&&x.status==='Active'&&x.appliesTo==='Entity'&&x.category==='All'&&!x.subCat&&!x.minAmt&&!x.maxAmt;}).forEach(function(src){
    const stages=src.stages.map(function(g){
      const c=Object.assign({},g,{fallback:'',escalation:''});
      if(g.type==='RBAC Team')c.ref=teamMap[String(g.ref)]||'';
      return c;
    });
    if(stages.some(function(g){return g.type==='RBAC Team'&&!g.ref;}))return;    // a team this company does not have
    const id=caWfNext++;
    const nw=Object.assign({},src,{id:id,key:id,entity:E,thrCur:d.cur,effFrom:today,effTo:'',createdBy:me,createdAt:at,stages:stages,version:1,activatedOn:today,
      versions:[{v:1,at:at,by:me,reason:'Created with the company',stages:JSON.parse(JSON.stringify(stages))}]});
    delete nw.logs;
    caWorkflows.push(nw);wfMap[src.id]=id;made.push(nw.name);
  });
  /* Standard advance types on those routes (definitions only; policies and limits are the company's). */
  if(typeof advTypes!=='undefined')advTypes.filter(function(t){return t.entity===ID_HOME_ENTITY&&t.status==='Active'&&wfMap[t.workflowId];}).forEach(function(t){
    const c=JSON.parse(JSON.stringify(t));
    c.id=advTypeNext++;c.key='AT-'+(100+c.id);c.entity=E;c.workflowId=wfMap[t.workflowId];c.createdBy=me;c.createdAt=at;
    c.logs=[{date:s.date,time:s.time,user:meName,userId:me,status:'Active',action:'Created with the company.'}];
    advTypes.push(c);
  });
  ent.logs.unshift({date:s.date,time:s.time,user:meName,userId:me,status:'Active',action:'Set up: workspace with '+w.teams.length+' standard teams (no members), '+made.length+' default approval routes; administered by '+meName+' (OpenDhi).'});
  if(typeof emsClearCache==='function')emsClearCache();
  return {ent:ent,workspace:w,routes:made};
}

/* ══ ROLES & ACCESS: a person who is not an employee (a client admin) ══════
   Company Settings → Roles & Access → Add Role → "Add a new person": name and
   work email. The account is the same one ADT keeps for that email (a person
   who already has an ADT account keeps it); no second account is created. */
function csRoleNewPerson(on){if(!csRoleForm)return;csRoleForm.newPerson=!!on;csRoleForm.uid='';refreshCsSidebar();}
function csRoleNewPersonUid(){
  const n=document.getElementById('csr-new-name'),e=document.getElementById('csr-new-email');
  const name=n?n.value.trim():'',email=e?e.value.trim():'';
  if(!name)return {error:'Full Name is required'};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return {error:'Enter a valid Work Email'};
  const emp=idEmpByEmail(email);
  if(emp&&emp.entityId!==idEntity())return {error:'This email belongs to an employee of another company.'};
  const uid=idEnsureUser(name,email,'Client user'),u=idUser(uid);
  if(emp&&u&&!u.eid&&!idUserOfEmp(emp.eid))u.eid=emp.eid;    // this company's employee: the same person
  return {uid:uid};
}
