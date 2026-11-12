/* ══ ROLES & ACCESS: MEMBER FIRST, EXPENSE MANAGEMENT ROLES (product owner, 12 Nov 2026) ════════════════════════════
   Company Settings → Roles & Access, Add Role / Edit Role, in a client company (Nova Retail), for the Super Admin and
   the Company Admin:
   - Member Name comes first, then Admin Role (a new person: Full Name and Work Email first, then the role);
   - Admin Role offers, after the existing roles, the Expense Management Team's designations: Reporting Manager,
     Approver, Finance Approver, Expense Manager, Reviewer, Verifier, Member.
   The new roles are names only (product owner's choice): each shows its own Access Scope, and what the person can
   open stays as their other roles allow. Someone holding only one of them works as an Employee (their own claims,
   advances, cards and benefits), so they can still sign in. In the presentation; other companies are unchanged. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const client=function(){return typeof emsClientOnly==='function'&&emsClientOnly();};
  const EMS_CS_ROLES=[
    ['Reporting Manager','Approves their team\'s claims, advances and card requests'],
    ['Approver','Approves claims and advances at their approval step'],
    ['Finance Approver','Finance review, reimbursements and disbursements'],
    ['Expense Manager','Expense policies, wallets, cards and approval routes'],
    ['Reviewer','Reviews claims, advances and card activity (read only)'],
    ['Verifier','Verifies card loads and funding entries'],
    ['Member','Own claims, advances, cards and benefits']];
  EMS_CS_ROLES.forEach(function(x){
    if(typeof CS_ROLE_SCOPE!=='undefined')CS_ROLE_SCOPE[x[0]]=x[1];
    if(typeof CS_ROLE_TONE!=='undefined')CS_ROLE_TONE[x[0]]=x[0]==='Member'?'idle':'info';
    if(typeof CS_ROLE_RANK!=='undefined'&&CS_ROLE_RANK.indexOf(x[0])<0)CS_ROLE_RANK.push(x[0]);
    /* Names only: at most Employee access, so a holder of nothing else can still sign in and use self-service. */
    if(typeof EMS_ROLE_SOURCE!=='undefined'&&EMS_ROLE_SOURCE.Employee.cs.indexOf(x[0])<0)EMS_ROLE_SOURCE.Employee.cs.push(x[0]);
  });
  if(typeof csRoleFormHTML==='function'){
    const f0=csRoleFormHTML;
    csRoleFormHTML=function(){
      const f=typeof csRoleForm!=='undefined'?csRoleForm:null;
      if(!client()||!f||f.kind!=='Client user')return f0.apply(this,arguments);
      /* The list for this form only: approval routes and every other use of the role set are unchanged. */
      const base=CS_ROLE_SETS['Client user'],ext=base.concat(EMS_CS_ROLES.map(function(x){return x[0];}).filter(function(n){return base.indexOf(n)<0;}));
      CS_ROLE_SETS['Client user']=ext;
      let out;try{out=f0.apply(this,arguments);}finally{CS_ROLE_SETS['Client user']=base;}
      /* Member first, then Admin Role. */
      const tmp=document.createElement('div');tmp.innerHTML=out;
      const grid=tmp.querySelector('.ep-form-grid'),role=grid&&grid.querySelector('#csw-csr-role');
      const g=role&&role.closest('.ep-form-group');
      if(g&&grid){grid.appendChild(g);out=tmp.innerHTML;}
      return out;
    };
  }
})();
