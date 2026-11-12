/* ══ ADMIN ACCESS: IT ACCESS + ASSET ALLOCATION ═══════════════════════════
   Two Governance modules, built out of the parts every other listing already
   uses - apCS filters + listing-stats above an .lp-table in an .lp-split-wrap,
   the .lp-isb-* detail panel behind the row action, Logs and Workflow tabs on
   the shared timeline, and a .ct-modal--form popup for creating and
   editing, like every other create form in the app. Only the asset- and access-specific parts are new.

   ONE LISTING, NOT TWO. The reference screens split each module into Direct
   and Global Employee tabs. An asset or an access record belongs to the
   PERSON, not to the employment type they were hired under, so one list holds
   both and the filters do the narrowing.

   STATUS MOVES IN LOGS, NOT IN EDIT. Same rule as Holidays: Edit changes what
   the record IS; a move between statuses carries a comment, and the comment
   is only collected in Logs. So the edit form leaves Status and Assignment
   alone, and says where they live. */

/* ── Shared reference data ─────────────────────────────────────────────── */
/* People outside the Employees module who still hold assets or access.
   Employees themselves are read live from directEmpData / globalEmpData. */
const AX_EMPLOYEES=[
  {name:'Rajan Kumar',empId:'EMP101',dept:'Engineering',branch:'Punjab',desig:'Senior Developer'},
  {name:'Neha Sharma',empId:'EMP102',dept:'Sales',branch:'Mumbai',desig:'Account Executive'},
  {name:'Aman Singh',empId:'EMP103',dept:'Engineering',branch:'Bangalore',desig:'DevOps Engineer'},
  {name:'Shaun Mathew',empId:'EMP104',dept:'Admin',branch:'Hyderabad',desig:'IT Administrator'},
  /* Employees who file and approve expenses (Expense Management). */
  {name:'Syed Ayaz',empId:'1200',dept:'Operations',branch:'Hyderabad',desig:'Support Specialist',email:'syed.ayaz@opendhi.com'},
  {name:'Tarak Swain',empId:'768',dept:'Sales',branch:'Mumbai',desig:'Business Analyst',email:'tarak.swain@maaserp.com'},
  {name:'Premnath Jayachandran',empId:'991',dept:'Engineering',branch:'Bangalore',desig:'Senior Developer',email:'premnath.jayachandran@opendhi.com'},
  {name:'Prem Raj',empId:'731',dept:'Operations',branch:'Hyderabad',desig:'Ops Manager',email:'prem.raj@maaserp.com'},
  {name:'Arjun Nair',empId:'655',dept:'Engineering',branch:'Bangalore',desig:'Software Engineer',email:'arjun.nair@maaserp.com'},
  {name:'Vikram Rao',empId:'1105',dept:'Finance',branch:'Hyderabad',desig:'Finance Manager',email:'vikram.rao@opendhi.com'}
];
const AX_DEPTS=['Engineering','Finance','HR','Operations','Sales','Admin'];
const AX_BRANCHES=['Hyderabad','Punjab','Mumbai','Delhi','Bangalore'];
/* Everyone an asset or access can be assigned to: the people above plus
   every Direct and Global employee, so a new joiner created today can be
   handed a laptop in the same session. */
function axPeople(withInactive){
  const out=[];
  (typeof directEmpData!=='undefined'?directEmpData:[]).concat(typeof globalEmpData!=='undefined'?globalEmpData:[]).forEach(function(e){
    if(e.status==='Inactive'&&!withInactive)return;
    out.push({name:e.name,empId:e.empId,dept:e.dept,branch:e.branch||e.country||'',desig:e.jobTitle||''});
  });
  AX_EMPLOYEES.forEach(function(x){if(!out.some(function(o){return o.name===x.name;}))out.push(x);});
  return out;
}
/* Look-ups include Inactive people, so a past holder still shows their ID. */
function axEmp(name){return axPeople(true).find(function(e){return e.name===name;})||null;}
function axEmpNames(){return axPeople().map(function(e){return e.name;});}
function axDash(v){return (v==null||v==='')?'<span class="sb-dash">—</span>':v;}
function axDate(iso){return cdLabel(iso)||'—';}
function axToday(){return cdISO(new Date());}
function axDaysBetween(a,b){
  const x=cdParse(a),y=cdParse(b);
  return x&&y?Math.round((y-x)/86400000):null;
}
function axStamp(){const s=stampNow();return s.date+' | '+s.time;}
function axMoney(v){
  const n=parseFloat(v);
  return isNaN(n)?'—':'₹'+n.toLocaleString('en-IN');
}
function axBadge(tone,text){return '<span class="lp-status-badge tone-'+tone+'">'+text+'</span>';}

const AX_ICO={
  dots:'<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>',
  chevL:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
  chevR:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
  x:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  back:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
  pen:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  plus:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>',
  trash:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  person:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  cal:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  clk:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  /* Field-card icons: 16px, 1.8 stroke - the weight .lp-sb-field-icon is drawn
     at everywhere else in the app. */
  fTag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  fHash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  fBox:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  fBarcode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14"/></svg>',
  fUser:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  fPin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  fBuild:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="7" x2="9.01" y2="7"/><line x1="15" y1="7" x2="15.01" y2="7"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="9" y1="17" x2="15" y2="17"/></svg>',
  fCal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  fCash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>',
  fStore:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z"/><path d="M9 21v-6h6v6"/></svg>',
  fShield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  fHeart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  fMonitor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  fKey:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2"/><path d="M16 7l3 3"/><path d="M18.5 4.5l2 2"/></svg>',
  fMail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></svg>',
  fLock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  fCheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  fClock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  fTicket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3z"/><path d="M13 5v14"/></svg>',
  heroAsset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>',
  heroKey:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2"/><path d="M16 7l3 3"/><path d="M18.5 4.5l2 2"/></svg>'
};
function axField(ico,label,val,wide){
  return '<div class="lp-sb-field-card'+(wide?' is-wide':'')+'"><div class="lp-sb-field-icon">'+ico+'</div>'
    +'<div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div>'
    +'<div class="lp-sb-field-value">'+axDash(val)+'</div></div></div>';
}
/* The tab strip every detail panel opens with - scroll arrows, the tabs, close. */
function axTabBar(prefix,tabs,cur,navFn,closeFn){
  return '<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\''+prefix+'-isb-tabs\')" title="Scroll left">'+AX_ICO.chevL+'</button>'
    +'<div class="lp-isb-tabs" id="'+prefix+'-isb-tabs">'+tabs.map(function(t){
      return '<button class="lp-isb-tab'+(cur===t.id?' active':'')+'" onclick="'+navFn+'(\''+t.id+'\')">'+t.label+'</button>';
    }).join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\''+prefix+'-isb-tabs\')" title="Scroll right">'+AX_ICO.chevR+'</button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="'+closeFn+'()" title="Close">'+AX_ICO.x+'</button></div>'
    +'</div>';
}
/* The Logs tab, in the exact shape every other module's has (lpLogsView):
   current status and its moves, then the log table. `extra` is markup that sits
   between the status and the comment - the asset log uses it for the
   employee an asset is being assigned to. */
function axLogsHTML(logs,status,statusOpts,ids,extra,hook){
  const form='<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+status+'</div>'
    +'<p class="lp-logs-form-sub">'+ids.sub+'</p>'
    +lpLogStatusField(ids.sel,status,statusOpts,hook)
    +(extra||'')
    +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="'+ids.inp+'" placeholder="Enter comment"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px">'
    +'<button class="ep-cancel-btn" style="flex:1" onclick="'+ids.cancel+'">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="'+ids.save+'">Submit</button>'
    +'</div></div>';
  return lpLogsView(logs,form);
}
/* A label with "+ Add" on its right, and - once clicked - a one-line input
   under it that adds a new option to that list without leaving the form. */
function axAddLabel(label,req,addKey,onAdd){
  return '<label class="ep-form-label ax-label">'+'<span>'+label+(req?' <span class="req">*</span>':'')+'</span>'
    +(addKey?'<button type="button" class="ax-add-link" onclick="'+onAdd+'(\''+addKey+'\')">'+AX_ICO.plus+'Add</button>':'')
    +'</label>';
}
function axInlineAdd(prefix,key,openKey,placeholder,saveFn,cancelFn){
  if(openKey!==key)return '';
  return '<div class="ax-inline-add">'
    +'<input class="ep-form-input" id="'+prefix+'-new-'+key+'" placeholder="'+attrSafe(placeholder)+'" '
    +'onkeydown="if(event.key===\'Enter\'){event.preventDefault();'+saveFn+'(\''+key+'\');}else if(event.key===\'Escape\'){'+cancelFn+'();}">'
    +'<button type="button" class="ep-save-btn ax-inline-btn" onclick="'+saveFn+'(\''+key+'\')">Add</button>'
    +'<button type="button" class="ep-cancel-btn ax-inline-btn" onclick="'+cancelFn+'()">Cancel</button>'
    +'</div>';
}
function axFocus(id){setTimeout(function(){const el=document.getElementById(id);if(el)el.focus();},30);}

/* ══ ASSET ALLOCATION ══════════════════════════════════════════════════════ */
const AST_STATUSES=['Available','Assigned','In Repair','Returned','Lost','Damaged','Retired','Disposed'];
/* The listing's quick tiles: the four states an asset spends its life in. */
const AST_TILES=['Assigned','Available','In Repair','Returned'];
const AST_CONDITIONS=['New','Good','Fair','Damaged','Under Repair','Scrap'];
let AST_CATEGORIES=['Laptop','Monitor','Mobile','Accessories','Furniture','Networking'];
let AST_VENDORS=['Dell India','Apple Store','HP World','Logitech Distributors','Croma Business'];

const assetsData=[
  {id:1,name:'Laptop Dell',category:'Laptop',type:'Hardware',code:'LT-001',serial:'NFA123456',brand:'Dell',model:'Latitude 7420',
   assignedTo:'Pallavi Parate',assignedOn:'2026-02-10',branch:'Hyderabad',status:'Assigned',condition:'Good',
   purchaseDate:'2025-12-18',cost:78000,vendor:'Dell India',warrantyStart:'2025-12-18',warrantyEnd:'2028-12-17',
   createdBy:'Shaun Mathew',createdAt:'18 Dec 2025 | 11:20:00 AM',
   history:[{employee:'Pallavi Parate',from:'2026-02-10',to:'',condition:'New'}]},
  {id:2,name:'HP Monitor',category:'Monitor',type:'Peripheral',code:'MN-002',serial:'NFA654321',brand:'HP',model:'E24 G5',
   assignedTo:'Rajan Kumar',assignedOn:'2026-03-04',branch:'Punjab',status:'Assigned',condition:'New',
   purchaseDate:'2026-02-26',cost:16500,vendor:'HP World',warrantyStart:'2026-02-26',warrantyEnd:'2029-02-25',
   createdBy:'Shaun Mathew',createdAt:'26 Feb 2026 | 03:05:00 PM',
   history:[{employee:'Rajan Kumar',from:'2026-03-04',to:'',condition:'New'}]},
  {id:3,name:'Wireless Mouse',category:'Accessories',type:'Peripheral',code:'AC-003',serial:'NFA789456',brand:'Logitech',model:'M650',
   assignedTo:'',assignedOn:'',branch:'Mumbai',status:'Available',condition:'Good',
   purchaseDate:'2025-08-12',cost:2400,vendor:'Logitech Distributors',warrantyStart:'2025-08-12',warrantyEnd:'2026-11-11',
   createdBy:'Pallavi Parate',createdAt:'12 Aug 2025 | 10:00:00 AM',
   history:[{employee:'Anika Shah',from:'2025-08-20',to:'2026-07-30',condition:'Good'}]},
  {id:4,name:'iPhone 14',category:'Mobile',type:'Hardware',code:'MB-004',serial:'NFA321654',brand:'Apple',model:'iPhone 14 128GB',
   assignedTo:'',assignedOn:'',branch:'Delhi',status:'In Repair',condition:'Fair',
   purchaseDate:'2024-11-05',cost:69900,vendor:'Apple Store',warrantyStart:'2024-11-05',warrantyEnd:'2025-11-04',
   createdBy:'Shaun Mathew',createdAt:'05 Nov 2024 | 04:40:00 PM',
   history:[{employee:'Rahul Mehta',from:'2024-11-10',to:'2026-09-18',condition:'Fair'}]},
  {id:5,name:'Keyboard',category:'Accessories',type:'Peripheral',code:'AC-005',serial:'NFA147852',brand:'Logitech',model:'K380',
   assignedTo:'Dev Kulkarni',assignedOn:'2026-05-02',branch:'Bangalore',status:'Assigned',condition:'Good',
   purchaseDate:'2026-04-20',cost:3200,vendor:'Logitech Distributors',warrantyStart:'2026-04-20',warrantyEnd:'2027-04-19',
   createdBy:'Pallavi Parate',createdAt:'20 Apr 2026 | 12:15:00 PM',
   history:[{employee:'Dev Kulkarni',from:'2026-05-02',to:'',condition:'New'}]},
  {id:6,name:'MacBook Pro 14',category:'Laptop',type:'Hardware',code:'LT-006',serial:'NFA963852',brand:'Apple',model:'M3 Pro 18GB',
   assignedTo:'Anika Shah',assignedOn:'2026-07-31',branch:'Mumbai',status:'Assigned',condition:'New',
   purchaseDate:'2026-07-22',cost:199900,vendor:'Apple Store',warrantyStart:'2026-07-22',warrantyEnd:'2027-07-21',
   createdBy:'Shaun Mathew',createdAt:'22 Jul 2026 | 09:45:00 AM',
   history:[{employee:'Anika Shah',from:'2026-07-31',to:'',condition:'New'}]},
  {id:7,name:'Dell UltraSharp 27',category:'Monitor',type:'Peripheral',code:'MN-007',serial:'NFA258147',brand:'Dell',model:'U2723QE',
   assignedTo:'',assignedOn:'',branch:'Hyderabad',status:'Returned',condition:'Good',
   purchaseDate:'2025-03-15',cost:42000,vendor:'Dell India',warrantyStart:'2025-03-15',warrantyEnd:'2028-03-14',
   createdBy:'Pallavi Parate',createdAt:'15 Mar 2025 | 02:30:00 PM',
   history:[{employee:'Neha Sharma',from:'2025-03-20',to:'2026-09-30',condition:'Good'}]},
  {id:8,name:'Office Chair',category:'Furniture',type:'Furniture',code:'FN-008',serial:'NFA000439',brand:'Featherlite',model:'Astra Mesh',
   assignedTo:'Shaun Mathew',assignedOn:'2026-01-12',branch:'Hyderabad',status:'Assigned',condition:'Good',
   purchaseDate:'2026-01-08',cost:14500,vendor:'Croma Business',warrantyStart:'2026-01-08',warrantyEnd:'2027-01-07',
   createdBy:'Shaun Mathew',createdAt:'08 Jan 2026 | 10:10:00 AM',
   history:[{employee:'Shaun Mathew',from:'2026-01-12',to:'',condition:'New'}]},
  {id:9,name:'Wi-Fi Router',category:'Networking',type:'Network Device',code:'NW-009',serial:'NFA741963',brand:'TP-Link',model:'Archer AX55',
   assignedTo:'',assignedOn:'',branch:'Bangalore',status:'Available',condition:'New',
   purchaseDate:'2026-09-02',cost:6800,vendor:'Croma Business',warrantyStart:'2026-09-02',warrantyEnd:'2029-09-01',
   createdBy:'Shaun Mathew',createdAt:'02 Sep 2026 | 05:20:00 PM',history:[]},
  {id:10,name:'ThinkPad E14',category:'Laptop',type:'Hardware',code:'LT-010',serial:'NFA852741',brand:'Lenovo',model:'E14 Gen 5',
   assignedTo:'Aman Singh',assignedOn:'2026-06-15',branch:'Bangalore',status:'Assigned',condition:'Good',
   purchaseDate:'2026-06-01',cost:64000,vendor:'Croma Business',warrantyStart:'2026-06-01',warrantyEnd:'2027-05-31',
   createdBy:'Pallavi Parate',createdAt:'01 Jun 2026 | 11:00:00 AM',
   history:[{employee:'Aman Singh',from:'2026-06-15',to:'',condition:'New'}]},
  {id:11,name:'Samsung Galaxy S23',category:'Mobile',type:'Hardware',code:'MB-011',serial:'NFA369258',brand:'Samsung',model:'S23 256GB',
   assignedTo:'',assignedOn:'',branch:'Mumbai',status:'In Repair',condition:'Damaged',
   purchaseDate:'2025-05-10',cost:74999,vendor:'Croma Business',warrantyStart:'2025-05-10',warrantyEnd:'2026-05-09',
   createdBy:'Shaun Mathew',createdAt:'10 May 2025 | 01:45:00 PM',
   history:[{employee:'Neha Sharma',from:'2025-05-15',to:'2026-08-22',condition:'Damaged'}]}
];
let assetNextId=12;
/* Updated Date (FR-10.2): the last time anything happened to the asset. */
assetsData.forEach(function(a){
  const last=(a.history||[]).reduce(function(m,x){return [x.from,x.to,m].filter(Boolean).sort().pop()||'';},'');
  a.updatedAt=a.updatedAt||(last?cdLabel(last):String(a.createdAt).split(' | ')[0]);
  a.notes=a.notes||'';
  /* Key ID: the record's number in the Assets system. Employee Confirmation:
     whether the employee holding it has confirmed receiving it. */
  a.keyId=a.keyId||1250+a.id;
  if(a.empConfirm===undefined)a.empConfirm=a.status==='Assigned'?([1,2,5,8].indexOf(a.id)>=0?'Confirmed':'Not Confirmed'):'';
});
let assetNextKey=1250+assetNextId;
/* Handing an asset over always starts unconfirmed; taking it back clears it. */
function astMarkAssigned(a){a.empConfirm='Not Confirmed';}
function astMarkUnassigned(a){a.empConfirm='';}
function astConfirmReceipt(id){
  const a=assetsData.find(function(x){return x.id===id;});if(!a||a.status!=='Assigned')return;
  a.empConfirm='Confirmed';astTouch(a);
  const s=stampNow();astSeedLogs(a);
  if(a.logs)a.logs.unshift({date:s.date,time:s.time,user:CURRENT_USER,status:'Assigned',action:a.assignedTo+' confirmed receiving '+a.name+' ('+a.code+').'});
  renderADTPage();
  showToast('Receipt confirmed','success',a.assignedTo+' has confirmed '+a.name+' ('+a.code+').');
}
function astTouch(a){a.updatedAt=stampNow().date;}
/* The employee's department is read through the person rather than stored on
   the asset, so a transfer moves every asset they hold with them. */
function astDept(a){const e=axEmp(a.assignedTo);return e?e.dept:'';}

// ── State ──
let astSelectedId=null,astTab='basic-details';
let astDeptF='',astBranchF='',astCatF='',astStatusF='',astEmpF='';
let astDraft=null,astEditId=null,astAddOpen='',astModalOpen=false,astDraftOrig='';
let astLogAssignee='';   // the employee picked in the Logs form, when moving to Assigned

function astRows(){
  return assetsData.filter(function(a){
    if(astDeptF&&astDept(a)!==astDeptF)return false;
    if(astEmpF&&a.assignedTo!==astEmpF)return false;
    if(astBranchF&&a.branch!==astBranchF)return false;
    if(astCatF&&a.category!==astCatF)return false;
    if(astStatusF&&a.status!==astStatusF)return false;
    return true;
  });
}
function astToggleStat(v){astStatusF=astStatusF===v?'':v;astSelectedId=null;renderADTPage();}
function applyAstFilters(){
  const e=getCSValue('ast-f-emp'),b=getCSValue('ast-f-branch'),s=getCSValue('ast-f-status');
  astEmpF=e&&e!=='All Employees'?e:'';
  astBranchF=b&&b!=='All Branches'?b:'';
  astStatusF=s&&s!=='All Statuses'?s:'';
  astSelectedId=null;renderADTPage();
}
/* ── SEARCH AS A TYPE-AHEAD ──
   The search box does not filter the table. As the user types, matching
   assets drop down under the box; picking one opens its detail panel. The
   table, its filters and its paging stay exactly as they were.

   Matched against name, Key ID, barcode, code, category, holder and branch.
   Up / Down move the highlight, Enter opens it, Escape closes the list. */
const AST_SUGGEST_MAX=6;
let astSugHits=[],astSugIdx=0;
function astSugEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
/* The matched part of a value, marked - escaped first, so a query can never
   inject markup. */
function astSugMark(v,q){
  const s=String(v==null?'':v),i=q?s.toLowerCase().indexOf(q):-1;
  if(i<0)return astSugEsc(s);
  return astSugEsc(s.slice(0,i))+'<mark>'+astSugEsc(s.slice(i,i+q.length))+'</mark>'+astSugEsc(s.slice(i+q.length));
}
function astSuggest(q){
  const box=document.getElementById('ast-f-q');if(!box)return;
  q=String(q||'').trim().toLowerCase();
  if(!q){astSugClose();return;}
  const fields=function(a){return [a.name,String(a.keyId),a.serial,a.code,a.category,a.assignedTo,a.branch];};
  const all=assetsData.filter(function(a){return fields(a).some(function(f){return f&&String(f).toLowerCase().indexOf(q)>=0;});});
  /* Name matches first - that is what most people type. */
  all.sort(function(x,y){return (y.name.toLowerCase().indexOf(q)>=0?1:0)-(x.name.toLowerCase().indexOf(q)>=0?1:0);});
  astSugHits=all.slice(0,AST_SUGGEST_MAX);astSugIdx=0;
  let pop=document.getElementById('ast-suggest');
  if(!pop){
    pop=document.createElement('div');pop.id='ast-suggest';pop.className='ax-suggest';pop.setAttribute('role','listbox');
    document.body.appendChild(pop);
  }
  pop.innerHTML=astSugHits.length
    ?astSugHits.map(function(a,i){
        return '<button type="button" role="option" class="ax-sug-row'+(i===0?' is-on':'')+'" data-i="'+i+'"'
          +' onmousedown="event.preventDefault()" onmouseenter="astSugHover('+i+')" onclick="astSugPick('+i+')">'
          +'<span class="ax-sug-main"><span class="ax-sug-name">'+astSugMark(a.name,q)+'</span>'
          +'<span class="ax-sug-sub">Key ID: '+astSugMark(a.keyId,q)+(a.serial?' · '+astSugMark(a.serial,q):'')+' · '+astSugMark(a.category,q)+'</span></span>'
          +'<span class="ax-sug-side"><span class="ax-sug-who">'+(a.assignedTo?astSugMark(a.assignedTo,q):'Unassigned')+'</span>'
            +axBadge(statusTone(a.status),a.status)+'</span>'
        +'</button>';
      }).join('')
      +'<div class="ax-sug-foot">'+(all.length>AST_SUGGEST_MAX?'Top '+AST_SUGGEST_MAX+' of '+all.length+' matches':all.length+' match'+(all.length===1?'':'es'))
        +'<span><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open</span></div>'
    :'<div class="ax-sug-none">No assets match “'+astSugEsc(q)+'”</div>';
  const r=box.getBoundingClientRect();
  pop.style.left=r.left+'px';pop.style.top=(r.bottom+6)+'px';
  pop.style.width=Math.max(r.width,440)+'px';
  pop.classList.add('is-open');
  box.setAttribute('aria-expanded','true');
}
function astSugClose(){
  const pop=document.getElementById('ast-suggest');if(pop)pop.remove();
  astSugHits=[];
  const box=document.getElementById('ast-f-q');if(box)box.setAttribute('aria-expanded','false');
}
function astSugHover(i){
  astSugIdx=i;
  document.querySelectorAll('#ast-suggest .ax-sug-row').forEach(function(r){r.classList.toggle('is-on',+r.dataset.i===i);});
}
function astSugPick(i){
  const a=astSugHits[i];if(!a)return;
  astSugClose();
  openAstSidebar(a.id);
}
function astSuggestEnter(){
  /* Enter right after typing can beat the debounce, so match now. */
  const box=document.getElementById('ast-f-q');
  if(!document.getElementById('ast-suggest')&&box)astSuggest(box.value);
  astSugPick(astSugIdx);
}
document.addEventListener('keydown',function(e){
  if(!e.target||e.target.id!=='ast-f-q'||!document.getElementById('ast-suggest'))return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    if(!astSugHits.length)return;
    astSugHover((astSugIdx+(e.key==='ArrowDown'?1:-1)+astSugHits.length)%astSugHits.length);
  }else if(e.key==='Escape'){astSugClose();}
});
/* The list belongs to the box: it goes when focus or the page moves away. */
document.addEventListener('mousedown',function(e){
  if(!document.getElementById('ast-suggest'))return;
  if(e.target.closest&&(e.target.closest('#ast-suggest')||e.target.id==='ast-f-q'))return;
  astSugClose();
});
window.addEventListener('resize',function(){astSugClose();});
window.addEventListener('scroll',function(e){
  if(e.target&&e.target.closest&&e.target.closest('#ast-suggest'))return;
  astSugClose();
},true);
function resetAstFilters(){astDeptF='';astBranchF='';astCatF='';astStatusF='';astEmpF='';astSelectedId=null;renderADTPage();}

// ── Detail panel ──
function openAstSidebar(id,tab){
  if(astSelectedId!=null&&astSelectedId!==id&&sbLeaveGuard('ast',function(){openAstSidebar(id,tab);}))return;
  if(astInlineEdit()&&astEditId!==id){astDraft=null;astEditId=null;}
  astTab=tab||sbKeepTab(astSelectedId,astTab);astSelectedId=id;astLogAssignee='';
  const sb=document.getElementById('ast-split-sb');if(sb)sb.classList.add('open');
  isbTab('ast',renderAstSidebar);
  document.querySelectorAll('.ast-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='ast-row-'+id);});
}
function closeAstSidebar(){
  if(sbLeaveGuard('ast',closeAstSidebar))return;
  if(astInlineEdit()){astDraft=null;astEditId=null;}
  astSelectedId=null;
  const sb=document.getElementById('ast-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.ast-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navAstTab(t){if(astInlineEdit()&&!sbHasDraft('ast')){astDraft=null;astEditId=null;}astTab=t;astLogAssignee='';isbTab('ast',renderAstSidebar);}

/* Seeded from the record, newest first, ending on the record's own status -
   a log that ends somewhere the record is not is worse than no log at all. */
function astSeedLogs(a){
  const fx=[];
  const h=a.history||[];
  const created=String(a.createdAt).split(' | ');
  fx.push({date:created[0],time:created[1]||'09:00:00 AM',user:a.createdBy,status:'Available',
    action:a.name+' ('+a.code+') added to the '+a.branch+' inventory.'});
  h.slice().reverse().forEach(function(x){
    fx.unshift({date:axDate(x.from),time:'10:00:00 AM',user:a.createdBy,status:'Assigned',
      action:'Assigned to '+x.employee+' in '+x.condition+' condition.'});
    if(x.to)fx.unshift({date:axDate(x.to),time:'04:30:00 PM',user:a.createdBy,
      status:a.status==='Assigned'?'Returned':a.status,
      action:a.status==='In Repair'?'Collected from '+x.employee+' and sent for repair.'
        :'Returned by '+x.employee+'.'});
  });
  return seedLogs(a,fx);
}
const astWorkflowData={};
function astWorkflow(a){
  if(!astWorkflowData[a.id]){
    const p=String(a.createdAt).split('|');
    const d=(p[0]||'').trim(),t=(p[1]||'').trim()||'09:00:00 AM';
    const wf=[{title:'Asset Registered',user:a.createdBy,date:d,time:t,
      description:a.name+' ('+a.code+') registered as '+a.category+', bought from '+(a.vendor||'an unrecorded vendor')
        +' for '+axMoney(a.cost)+'.'}];
    (a.history||[]).forEach(function(x){
      wf.unshift({title:'Asset Assigned',user:a.createdBy,date:axDate(x.from),time:'10:00:00 AM',
        description:'Handed over to '+x.employee+' in '+x.condition+' condition.'});
      if(x.to)wf.unshift({title:a.status==='In Repair'?'Sent for Repair':'Asset Returned',user:a.createdBy,
        date:axDate(x.to),time:'04:30:00 PM',description:'Collected back from '+x.employee+'.'});
    });
    astWorkflowData[a.id]=wf;
  }
  return astWorkflowData[a.id];
}
/* Warranty is a date the reader has to do arithmetic on; the panel does it. */
function astWarranty(a){
  if(!a.warrantyEnd)return {tone:'idle',text:'No warranty recorded'};
  const left=axDaysBetween(axToday(),a.warrantyEnd);
  if(left<0)return {tone:'bad',text:'Expired '+axDate(a.warrantyEnd)};
  if(left<=60)return {tone:'wait',text:'Expires in '+left+' day'+(left===1?'':'s')};
  return {tone:'ok',text:'Under warranty — '+Math.round(left/30)+' months left'};
}
function renderAstSidebar(){
  const a=assetsData.find(function(x){return x.id===astSelectedId;});if(!a)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},
    {id:'purchase',label:'Purchase & Warranty'},{id:'workflow',label:'Workflow'}];
  const tabBar=axTabBar('ast',tabs,astTab,'navAstTab','closeAstSidebar');
  let body='';
  if(astTab==='basic-details'&&astInlineEdit(a.id)){
    body=astHeroHTML(a,'editing')+axInlineFormHTML(astFormFieldsHTML(),'cancelAddAsset()','submitAddAsset()');
  }else if(astTab==='basic-details'){
    body=astHeroHTML(a,true)
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fHash,'Key ID',String(a.keyId))
      +axField(AX_ICO.fHash,'Asset ID / Code',a.code)
      +axField(AX_ICO.fTag,'Asset Category',a.category)
      +axField(AX_ICO.fBarcode,'Asset Barcode / Serial Number',a.serial)
      +axField(AX_ICO.fHeart,'Condition',axBadge(statusTone(a.condition),a.condition))
      +axField(AX_ICO.fMonitor,'Brand',a.brand)
      +axField(AX_ICO.fMonitor,'Model',a.model)
      +axField(AX_ICO.fPin,'Admin Branch / Location',a.branch)
      +axField(AX_ICO.fCheck,'Employee Confirmation',a.empConfirm
        ?axBadge(a.empConfirm==='Confirmed'?'ok':'wait',a.empConfirm)
          +(a.empConfirm!=='Confirmed'?' <button type="button" class="ax-confirm-btn" onclick="astConfirmReceipt('+a.id+')">Mark Confirmed</button>':'')
        :'')
      +axField(AX_ICO.fUser,'Create By',a.createdBy)
      +axField(AX_ICO.fCal,'Create Time',a.createdAt)
      +axField(AX_ICO.fCal,'Update Time',a.updatedAt)
      +axField(AX_ICO.fTicket,'Comment / Notes',a.notes,true)
      +'</div>';
  }else if(astTab==='purchase'){
    const w=astWarranty(a);
    const span=axDaysBetween(a.warrantyStart,a.warrantyEnd),used=axDaysBetween(a.warrantyStart,axToday());
    const pct=span>0?Math.max(0,Math.min(100,Math.round(used/span*100))):0;
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Purchase</span></div>'
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fCal,'Purchase Date',axDate(a.purchaseDate))
      +axField(AX_ICO.fCash,'Purchase Cost',axMoney(a.cost))
      +axField(AX_ICO.fStore,'Vendor / Supplier',a.vendor,true)
      +'</div>'
      +'<div class="lp-sb-view-header" style="margin-top:22px"><span class="lp-sb-section-title">Warranty</span>'+axBadge(w.tone,w.text)+'</div>'
      +(a.warrantyStart&&a.warrantyEnd
        ?'<div class="ax-warranty"><div class="ax-warranty-bar"><span class="tone-'+w.tone+'" style="width:'+pct+'%"></span></div>'
          +'<div class="ax-warranty-ends"><span>'+axDate(a.warrantyStart)+'</span><span>'+axDate(a.warrantyEnd)+'</span></div></div>':'')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fShield,'Warranty Start Date',axDate(a.warrantyStart))
      +axField(AX_ICO.fShield,'Warranty End Date',axDate(a.warrantyEnd))
      +'</div>';
  }else if(astTab==='history'){
    body=sbHistoryHTML(a);
  }else if(astTab==='logs'){
    /* Moving to Assigned needs a person, so the form grows that one field
       only when Assigned is the status picked. */
    const extra='<div id="ast-log-assignee" style="'+(astLogAssignee?'':'display:none')+'">'
      +'<div class="lp-logs-form-label">Assign To <span class="lp-logs-form-req">*</span></div>'
      +apCS('ast-log-emp',axEmpNames(),'','Select Employee')+'</div>';
    body=axLogsHTML(astSeedLogs(a),a.status,AST_STATUSES,
      {sel:'ast-log-status-sel',inp:'ast-log-comment-inp',sub:'Move this asset on and say why',
       cancel:'navAstTab(\'logs\')',save:'astSaveLog('+a.id+')'},extra,'astLogStatusHook');
  }else{
    body=wfTimelineHTML(wfAsset(a));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
/* The shared detail-panel header (sbHero, core.js) - this design is where it
   started, and every module's panel now opens with it. */
function astHeroHTML(a,mode){
  return sbHero({img:a.image,icon:AX_ICO.heroAsset,name:a.name,
    meta:[a.code,a.assignedTo?'With '+a.assignedTo:'Unassigned'],
    status:axBadge(statusTone(a.status),a.status),editing:mode==='editing',onEdit:mode?'startAddAsset('+a.id+')':''});
}
function astLogStatusHook(val){
  const box=document.getElementById('ast-log-assignee');
  astLogAssignee=val==='Assigned'?'1':'';
  if(box)box.style.display=val==='Assigned'?'':'none';
}
function astSaveLog(id){
  const a=assetsData.find(function(x){return x.id===id;});if(!a)return;
  const was=a.status;
  const next=getCSValue('ast-log-status-sel');
  const emp=getCSValue('ast-log-emp');
  if(next==='Assigned'&&was==='Assigned'){showToast('Already assigned','error','Move it to Returned first, then assign it again.');return;}
  if(next==='Assigned'&&!emp){
    const t=csTrigger('ast-log-emp');if(t){t.style.borderColor='#b83a3a';setTimeout(function(){t.style.borderColor='';},1500);}
    showToast('Pick who it is assigned to','error');return;
  }
  const inp=document.getElementById('ast-log-comment-inp');
  const comment=inp?inp.value.trim():'';
  astSeedLogs(a);
  if(!lpCommitLog(a,'ast-log-status-sel','ast-log-comment-inp',a.logs))return;
  const today=axToday();
  const open=(a.history||[]).find(function(x){return !x.to;});
  /* Leaving Assigned closes the current hand-over; arriving at it opens one. */
  if(was==='Assigned'&&a.status!=='Assigned'){
    if(open)open.to=today;
    a.assignedTo='';a.assignedOn='';astMarkUnassigned(a);
  }
  if(a.status==='Assigned'&&was!=='Assigned'){
    a.history=a.history||[];
    a.history.unshift({employee:emp,from:today,to:'',condition:a.condition});
    a.assignedTo=emp;a.assignedOn=today;astMarkAssigned(a);
    const e=axEmp(emp);if(e)a.branch=e.branch;
  }
  astTouch(a);
  if(a.status!==was){
    astWorkflow(a);
    const title={'Assigned':'Asset Assigned','Available':'Back in Inventory','In Repair':'Sent for Repair','Returned':'Asset Returned',
      'Lost':'Asset Lost','Damaged':'Asset Damaged','Retired':'Asset Retired','Disposed':'Asset Disposed'}[a.status];
    wfPush(astWorkflowData,id,title,'Moved from '+was+' to '+a.status+(a.status==='Assigned'?' — handed to '+emp:'')+'. '+comment);
  }
  astLogAssignee='';
  renderADTPage();
  showToast('Log added','success',a.name+' is now '+a.status+(a.status==='Assigned'?' with '+emp:'')+'.');
}

// ── Listing ──
function buildAssetAllocationHTML(){
  const count=function(s){return assetsData.filter(function(a){return a.status===s;}).length;};
  const rows=astRows();
  const shown=rows;
  if(astSelectedId&&!shown.some(function(a){return a.id===astSelectedId;}))astSelectedId=null;
  const pgn=listPage('asset-allocation',[astEmpF,astBranchF,astStatusF].join('|'),shown.map(function(a,i){
    return '<tr class="ast-row'+(astSelectedId===a.id?' lp-row-selected':'')+'" id="ast-row-'+a.id+'" style="cursor:pointer" onclick="openAstSidebar('+a.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+a.name+'</div>'
        +'<div class="lp-c-sub">Key ID: '+a.keyId+'</div></td>'
      +'<td>'+(a.serial?'<div class="lp-c-plain ax-barcode">'+a.serial+'</div>':'<span class="sb-dash">—</span>')+'</td>'
      +'<td><div class="lp-c-plain">'+a.category+'</div></td>'
      +'<td><div class="lp-c-plain'+(a.assignedTo?'':' is-none')+'">'+(a.assignedTo||'Unassigned')+'</div><div class="lp-c-sub">'+a.branch+'</div></td>'
      +'<td>'+axBadge(statusTone(a.status),a.status)+'</td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('asset-allocation',a.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No assets match this filter.</td></tr>');
  const stat=function(s){const color='var(--st-'+statusTone(s)+'-fg)';
    return '<div class="listing-stat'+(astStatusF===s?' stat-selected':'')+'" onclick="astToggleStat(\''+s+'\')">'
      +'<div class="listing-stat-count" style="color:'+color+'">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +(typeof empReturnBarHTML==='function'?empReturnBarHTML():'')
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('ast-f-q','','Search asset, Key ID, barcode, employee','astSuggestEnter()','astSuggest')
    +axCS('ast-f-emp',axEmpNames(),astEmpF,'All Employees')
    +axCS('ast-f-branch',AX_BRANCHES,astBranchF,'All Branches')
    +axCS('ast-f-status',AST_STATUSES,astStatusF,'All Statuses')
    +clearFiltersBtn([astEmpF,astBranchF,astStatusF],'resetAstFilters()')
    +'<button class="lp-pill-search" onclick="applyAstFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +AST_TILES.map(function(s){return stat(s);}).join('')
    +'</div></div>'
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="ast-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    /* What a row needs to be found and recognised: the asset (its code under
       the name), category, who has it and its status. Key ID, serial, branch,
       employee confirmation and dates are in the detail panel. */
    +'<table class="lp-table ax-table"><thead><tr><th>S. No</th><th>Asset</th><th>Barcode</th><th>Category</th>'
      +'<th>Assigned To</th><th>Asset Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(astSelectedId?' open':'')+'" id="ast-split-sb"><div class="lp-isb" id="ast-isb-inner">'+(astSelectedId?sbRender(renderAstSidebar,'ast'):'')+'</div></div>'
    +'</div></div>'
    +(astModalOpen?buildAddAssetModalHTML():'');
}

// ── Add / Edit Asset popup ──
/* ASSET ID / CODE IS GENERATED, never typed: a prefix for the category and the
   record number - LT-012 for the twelfth record if it is a laptop. A category
   with no fixed prefix uses its first two letters. */
const AST_CODE_PREFIX={Laptop:'LT',Monitor:'MN',Mobile:'MB',Accessories:'AC',Furniture:'FN',Networking:'NW'};
function astNextCode(category,id){
  const pre=AST_CODE_PREFIX[category]||String(category||'AS').replace(/[^a-z]/gi,'').slice(0,2).toUpperCase()||'AS';
  let n=id,code;
  do{code=pre+'-'+String(n++).padStart(3,'0');}while(assetsData.some(function(a){return a.code===code;}));
  return code;
}
/* The Assets dropdowns can be cleared - clicking the option that is already
   picked unpicks it (csSelect, data-csclear) - and searched - a search box
   tops every menu (csSearchSetup, data-cssearch). Both live in core.js. */
function axCS(id,opts,val,ph,hook){
  return apCS(id,opts,val,ph,hook).replace('<div class="cs-wrap"','<div class="cs-wrap" data-csclear="1" data-cssearch="1"');
}
/* THE FORM IS STATE, NOT MARKUP. "+ Add" and the image picker both repaint
   the popup, so everything typed is read back into astDraft first (astSync) -
   otherwise adding a vendor would wipe the asset name above it. */
function astBlankDraft(){
  return {name:'',category:'',serial:'',code:'',model:'',brand:'',cost:'',purchaseDate:'',warrantyEnd:'',
    vendor:'',condition:'',warrantyStart:'',status:'',branch:'',assignedTo:'',image:'',imageName:'',notes:''};
}
/* Edit opens these same fields inside the asset's panel - the listing stays in
   view, as every other module's Edit does. "+ Add" is the popup. */
function astInlineEdit(id){return !!astEditId&&!astModalOpen&&(id==null||astEditId===id);}
function startAddAsset(editId){
  const a=editId?assetsData.find(function(x){return x.id===editId;}):null;
  astEditId=a?a.id:null;
  astDraft=a?Object.assign(astBlankDraft(),{name:a.name,category:a.category,serial:a.serial,code:a.code,
      model:a.model,brand:a.brand,cost:a.cost!=null?String(a.cost):'',purchaseDate:a.purchaseDate,warrantyEnd:a.warrantyEnd,
      vendor:a.vendor,condition:a.condition,warrantyStart:a.warrantyStart,status:a.status,branch:a.branch,
      assignedTo:a.assignedTo,image:a.image||'',imageName:a.imageName||'',notes:a.notes||''})
    :astBlankDraft();
  astAddOpen='';astModalOpen=!a;astDraftOrig=JSON.stringify(astDraft);
  if(a){astSelectedId=a.id;astTab='basic-details';}
  if(page!=='asset-allocation'){page='asset-allocation';syncSidebarDropdown(page);}
  renderADTPage();
}
function cancelAddAsset(){
  astDraft=null;astEditId=null;astAddOpen='';astModalOpen=false;
  axCloseCreate();
}
function astSync(){
  if(!astDraft)return;
  const v=function(id){const el=document.getElementById(id);return el?el.value.trim():null;};
  [['name','ast-name'],['serial','ast-serial'],['model','ast-model'],['brand','ast-brand'],['cost','ast-cost'],['notes','ast-notes']]
    .forEach(function(p){const x=v(p[1]);if(x!==null)astDraft[p[0]]=x;});
  [['purchaseDate','ast-pdate'],['warrantyEnd','ast-wend'],['warrantyStart','ast-wstart']]
    .forEach(function(p){const el=document.getElementById(p[1]);if(el)astDraft[p[0]]=el.value;});
  [['category','ast-cat'],['vendor','ast-vendor'],['condition','ast-cond'],['status','ast-status'],
   ['branch','ast-branch'],['assignedTo','ast-emp']]
    .forEach(function(p){if(document.getElementById('csw-'+p[1]))astDraft[p[0]]=getCSValue(p[1]);});
}
const AST_ADD_LISTS={category:'Asset Category',vendor:'Vendor / Supplier'};
function astOpenAdd(key){astSync();astAddOpen=astAddOpen===key?'':key;renderADTPage();axFocus('ast-new-'+key);}
function astCancelAdd(){astSync();astAddOpen='';renderADTPage();}
function astSaveAdd(key){
  const el=document.getElementById('ast-new-'+key);
  const val=el?el.value.trim():'';
  if(!val){showToast('Enter a name first','error');if(el)el.focus();return;}
  if(/['"]/.test(val)){showToast('Quotes are not allowed in a name','error');return;}
  astSync();
  const list=key==='category'?AST_CATEGORIES:AST_VENDORS;
  if(list.some(function(x){return x.toLowerCase()===val.toLowerCase();})){
    showToast(val+' already exists','info','It has been selected for you.');
    astDraft[key]=list.find(function(x){return x.toLowerCase()===val.toLowerCase();});
  }else{
    list.push(val);astDraft[key]=val;
    showToast(AST_ADD_LISTS[key]+' added','success','"'+val+'" is now an option.');
  }
  astAddOpen='';renderADTPage();
}
/* An image is read into the draft as a data URL - there is no server here to
   upload it to, and this is exactly what a preview needs. */
function astPickImage(input){
  const f=input.files&&input.files[0];
  if(f)astTakeImage(f);
  input.value='';
}
function astTakeImage(f){
  if(!/^image\/(png|jpe?g)$/.test(f.type)){showToast('PNG or JPG only','error',f.name+' is not a PNG or JPG image.');return;}
  if(f.size>5*1024*1024){showToast('Image is over 5 MB','error','Pick an image of 5 MB or less.');return;}
  const r=new FileReader();
  r.onload=function(){astSync();astDraft.image=r.result;astDraft.imageName=f.name;renderADTPage();};
  r.readAsDataURL(f);
}
function astDropImage(e){
  e.preventDefault();
  const z=document.getElementById('ast-img-zone');if(z)z.classList.remove('is-over');
  const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
  if(f)astTakeImage(f);
}
function astDragImage(e,on){
  e.preventDefault();
  const z=document.getElementById('ast-img-zone');if(z)z.classList.toggle('is-over',on);
}
function astClearImage(){astSync();astDraft.image='';astDraft.imageName='';renderADTPage();}
/* Same popup every other creation form uses - .ct-modal-overlay / .ct-modal
   --form, an .ep-form-grid of fields, and Cancel beside the primary action on
   one right-aligned row - so creating an asset feels like creating a payhead,
   a holiday or a rate. */
function astFormFieldsHTML(){
  if(!astDraft)astDraft=astBlankDraft();
  const d=astDraft,edit=!!astEditId;
  const txt=function(id,label,val,ph,req,type){
    return '<div class="ep-form-group"><label class="ep-form-label" for="'+id+'">'+label+(req?' <span class="req">*</span>':'')+'</label>'
      +'<input class="ep-form-input" id="'+id+'" type="'+(type||'text')+'" value="'+attrSafe(val||'')+'" placeholder="'+attrSafe(ph)+'"'
      +(type==='number'?' min="0" step="1"':'')+'></div>';
  };
  const sel=function(key,id,label,opts,val,ph,req){
    return '<div class="ep-form-group">'+axAddLabel(label,req,key,'astOpenAdd')
      +axCS(id,opts,val,ph)
      +(key?axInlineAdd('ast',key,astAddOpen,label+' Name','astSaveAdd','astCancelAdd'):'')+'</div>';
  };
  const date=function(id,label,val){
    return '<div class="ep-form-group"><label class="ep-form-label">'+label+'</label>'+apCD(id,val,'dd-mm-yyyy')+'</div>';
  };
  /* Status and the person it is with move in Logs once the asset exists, so
     editing leaves them out rather than offering a second, comment-less way
     to change them. */
  const assignFields=edit
    ?'<div class="ep-form-group ep-form-full"><div class="ax-locked-note">Status <b>'+d.status+'</b>'
      +(d.assignedTo?' · with <b>'+d.assignedTo+'</b>':'')+'. Status and assignment move in the asset&rsquo;s <b>Logs</b> tab, where each move carries a comment.</div></div>'
    :sel('','ast-status','Asset Status',AST_STATUSES,d.status,'Select Status',true)
      +'<div class="ep-form-group"><label class="ep-form-label">Assign To Employee</label>'
        +axCS('ast-emp',axEmpNames(),d.assignedTo,'Search Employee')
        +'<div class="ea-hint">Required when the status is Assigned.</div></div>';
  /* The image is one row across the popup: a slim drop target while empty,
     a thumbnail with its name once picked. */
  const imageBox=d.image
    ?'<div class="ax-img-row"><img src="'+d.image+'" alt="Asset image">'
      +'<span class="ax-img-name" title="'+attrSafe(d.imageName)+'">'+(d.imageName||'Asset image')+'</span>'
      +'<button type="button" class="att-row-btn is-danger" onclick="astClearImage()" title="Remove image">'+AX_ICO.trash+'</button></div>'
    :'<label class="att-zone ax-img-zone" id="ast-img-zone" ondragover="astDragImage(event,true)" ondragleave="astDragImage(event,false)" ondrop="astDropImage(event)">'
      +'<input type="file" accept="image/png,image/jpeg" hidden onchange="astPickImage(this)">'
      +'<span class="att-zone-ico">'+AX_ICO.upload+'</span>'
      +'<span><span class="att-zone-title">Click to upload or drag and drop</span>'
      +'<span class="att-zone-hint"> · PNG, JPG (max 5 MB)</span></span></label>';
  /* FR-10.1, in its order. There is no Asset ID / Code field - the code is
     generated on save (astNextCode) - and no Asset Type. + Add is on Category
     and Vendor. */
  const fields=txt('ast-name','Asset Name',d.name,'e.g. Dell Laptop',true)
      +sel('category','ast-cat','Asset Category',AST_CATEGORIES,d.category,'Select Category',true)
      +txt('ast-serial','Barcode / Serial Number',d.serial,'e.g. NFA000439',true)
      +txt('ast-brand','Brand',d.brand,'e.g. Dell')
      +txt('ast-model','Model',d.model,'e.g. Latitude 7420')
      +date('ast-pdate','Purchase Date',d.purchaseDate)
      +'<div class="ep-form-group"><label class="ep-form-label" for="ast-cost">Purchase Cost</label>'
        +'<div class="ax-currency"><span>₹</span><input class="ep-form-input" id="ast-cost" type="number" min="0" step="1" value="'+attrSafe(d.cost||'')+'" placeholder="e.g. 75000"></div></div>'
      +sel('vendor','ast-vendor','Vendor / Supplier',AST_VENDORS,d.vendor,'Select Vendor / Supplier',false)
      +date('ast-wstart','Warranty Start Date',d.warrantyStart)
      +date('ast-wend','Warranty End Date',d.warrantyEnd)
      +sel('','ast-branch','Branch / Location',AX_BRANCHES,d.branch,'Select Branch',false)
      +sel('','ast-cond','Asset Condition',AST_CONDITIONS,d.condition,'Select Condition',true)
      +assignFields
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Asset Image</label>'+imageBox+'</div>'
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="ast-notes">Comment / Notes</label>'
        +'<textarea class="ep-form-input ax-notes" id="ast-notes" placeholder="Anything worth knowing about this asset">'+attrSafe(d.notes||'')+'</textarea></div>';
  return fields;
}
function buildAddAssetModalHTML(){
  const fields=astFormFieldsHTML();
  const d=astDraft,edit=!!astEditId;
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(edit?'Edit Asset':'Add Asset')+'</span>'
      +'<button class="ct-modal-close" onclick="cancelAddAsset()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+(edit?'Update the details of '+d.name+' ('+d.code+').':'Create a new asset and assign it to an employee.')
      +' Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid">'+fields+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddAsset()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="submitAddAsset()">'+(edit?'Save Changes':'Save Asset')+'</button>'
    +'</div></div>'
    +'</div></div>';
}
/* Closing a create / edit popup. It may have been opened over an employee's
   lifecycle log, so that context is released too. */
/* The in-panel frame for an edit form: the popup's own fields, with Cancel and
   Save changes under them as on every other panel. */
function axInlineFormHTML(fields,onCancel,onSave){
  return '<div class="lp-sb-edit-form ax-sb-edit"><div class="lp-sb-edit-section"><div class="ep-form-grid">'+fields+'</div>'
    +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="'+onCancel+'">Cancel</button>'
    +'<button class="ep-save-btn" onclick="'+onSave+'">Save changes</button></div></div></div>';
}
function axCloseCreate(){
  if(typeof empAxCtx!=='undefined')empAxCtx=null;
  renderADTPage();
}
function submitAddAsset(){
  astSync();
  const d=astDraft,edit=!!astEditId;
  const need=[['name','Asset Name'],['category','Asset Category'],['serial','Barcode / Serial Number'],['condition','Asset Condition']];
  if(!edit)need.push(['status','Asset Status']);
  for(let i=0;i<need.length;i++){
    if(!String(d[need[i][0]]||'').trim()){showToast(need[i][1]+' is required','error');return;}
  }
  /* Barcodes are NFA followed by six digits - NFA000439. Typed in any case,
     stored in capitals. */
  d.serial=String(d.serial||'').trim().toUpperCase();
  if(!/^NFA\d{6}$/.test(d.serial)){
    showToast('Barcode format is NFA + 6 digits','error','For example NFA000439 - "'+d.serial+'" does not match.');return;}
  if(assetsData.some(function(a){return a.id!==astEditId&&a.serial&&a.serial.toLowerCase()===d.serial.toLowerCase();})){
    showToast('Barcode / Serial Number '+d.serial+' is already in use','error','Every asset needs its own barcode.');return;}
  if(d.cost!==''&&(isNaN(parseFloat(d.cost))||parseFloat(d.cost)<0)){showToast('Purchase Cost must be a number','error');return;}
  if(d.warrantyStart&&d.warrantyEnd&&d.warrantyEnd<=d.warrantyStart){
    showToast('Warranty ends before it starts','error','Warranty End Date must be after the start date.');return;}
  if(d.purchaseDate&&d.purchaseDate>axToday()){showToast('Purchase Date is in the future','error');return;}
  if(!edit){
    if(d.status==='Assigned'&&!d.assignedTo){showToast('Pick who the asset is assigned to','error','An Assigned asset needs an employee.');return;}
    if(d.assignedTo&&d.status!=='Assigned'){showToast('Status must be Assigned','error','An asset handed to '+d.assignedTo+' is Assigned, not '+d.status+'.');return;}
  }
  const emp=axEmp(d.assignedTo);
  const branch=d.branch||(emp?emp.branch:'')||AX_BRANCHES[0];
  if(edit){
    const a=assetsData.find(function(x){return x.id===astEditId;});if(!a)return;
    const fields=[['name','Asset Name'],['category','Category'],['serial','Serial Number'],
      ['model','Model'],['brand','Brand'],['purchaseDate','Purchase Date'],['warrantyStart','Warranty Start'],['warrantyEnd','Warranty End'],
      ['vendor','Vendor'],['condition','Condition'],['branch','Branch'],['notes','Notes']];
    const changes=fields.filter(function(f){return String(a[f[0]]||'')!==String(f[0]==='branch'?branch:(d[f[0]]||''));}).map(function(f){return f[1];});
    if(String(a.cost)!==String(d.cost===''?'':parseFloat(d.cost)))changes.push('Purchase Cost');
    if((a.image||'')!==(d.image||''))changes.push('Image');
    if(!changes.length){cancelAddAsset();showToast('No changes','info','Nothing was different.');return;}
    Object.assign(a,{name:d.name,category:d.category,serial:d.serial,model:d.model,brand:d.brand,
      cost:d.cost===''?'':parseFloat(d.cost),purchaseDate:d.purchaseDate,warrantyStart:d.warrantyStart,warrantyEnd:d.warrantyEnd,
      vendor:d.vendor,condition:d.condition,branch:branch,image:d.image,imageName:d.imageName,notes:d.notes});
    astTouch(a);
    astWorkflow(a);
    wfPush(astWorkflowData,a.id,'Asset Edited','Updated: '+changes.join(', ')+'.');
    astDraft=null;astEditId=null;astModalOpen=false;
    axCloseCreate();
    showToast('Asset updated','success',a.name+' ('+a.code+') saved.');
    return;
  }
  const id=assetNextId++;
  const today=axToday();
  d.code=astNextCode(d.category,id);
  const a={id:id,keyId:assetNextKey++,empConfirm:d.status==='Assigned'?'Not Confirmed':'',name:d.name,category:d.category,code:d.code,serial:d.serial,brand:d.brand,model:d.model,
    assignedTo:d.status==='Assigned'?d.assignedTo:'',assignedOn:d.status==='Assigned'?today:'',branch:branch,
    status:d.status,condition:d.condition,purchaseDate:d.purchaseDate,cost:d.cost===''?'':parseFloat(d.cost),vendor:d.vendor,
    warrantyStart:d.warrantyStart,warrantyEnd:d.warrantyEnd,image:d.image,imageName:d.imageName,notes:d.notes,
    createdBy:CURRENT_USER,createdAt:axStamp(),updatedAt:stampNow().date,
    history:d.status==='Assigned'?[{employee:d.assignedTo,from:today,to:'',condition:d.condition}]:[]};
  const s=stampNow();
  a.logs=[{date:s.date,time:s.time,user:CURRENT_USER,status:a.status,
    action:a.status==='Assigned'?'Asset added and assigned to '+a.assignedTo+'.':'Asset added to the '+branch+' inventory as '+a.status+'.'}];
  astWorkflowData[id]=[{title:a.status==='Assigned'?'Asset Assigned':'Asset Registered',user:CURRENT_USER,date:s.date,time:s.time,
    description:a.name+' ('+a.code+') registered'+(a.status==='Assigned'?' and handed to '+a.assignedTo:'')+'.'}];
  assetsData.unshift(a);
  lpLanded('asset-allocation',id);
  astDraft=null;astModalOpen=false;
  axCloseCreate();
  showToast('Asset saved','success',a.name+' ('+a.code+') is '+(a.status==='Assigned'?'assigned to '+a.assignedTo:a.status.toLowerCase())+'.');
}

/* ══ IT ACCESS (FR-10.3 / FR-10.4) ═════════════════════════════════════════
   Who has access to what. Passwords, API tokens, secret keys and other
   authentication secrets are never stored here - only the login, the role
   and who provisioned it. */
const ITA_STATUSES=['Pending','Active','Inactive','On Hold','Revoked','Expired'];
const ITA_TILES=['Active','Pending','On Hold','Revoked','Expired'];
const ITA_ACCESS_TYPES=['User Account','Admin Access','Group Access','Shared Access','Application Access',
  'Database Access','VPN Access','Repository Access','Other'];
const ITA_ROLES=['Viewer','Contributor','Editor','Administrator','Owner'];
const AX_PROVISIONERS=['Shaun Mathew','Pallavi Parate','Aman Singh','Tarak Swain'];
let ITA_SYSTEMS=['Microsoft 365','Jira','AWS Console','VPN','GitHub','Slack','Google Workspace','Salesforce'];
/* + Add System / Application stores its domain and logo as master data. */
const ITA_SYSTEM_META={
  'Microsoft 365':{url:'office.com'},'Jira':{url:'atlassian.net'},'AWS Console':{url:'console.aws.amazon.com'},
  'VPN':{url:'vpn.company.com'},'GitHub':{url:'github.com'},'Slack':{url:'slack.com'},
  'Google Workspace':{url:'workspace.google.com'},'Salesforce':{url:'salesforce.com'}
};

const itAccessData=[
  {id:1,system:'Microsoft 365',accessType:'User Account',login:'pallavi@company.com',assignedTo:'Pallavi Parate',role:'Contributor',
   status:'Active',effective:'2024-01-01',expiry:'',mfa:'Yes',provisionedBy:'Shaun Mathew',notes:'',
   createdBy:'Shaun Mathew',createdAt:'01 Jan 2024 | 10:00:00 AM'},
  {id:2,system:'Jira',accessType:'Application Access',login:'pallavi_jira',assignedTo:'Pallavi Parate',role:'Editor',
   status:'Active',effective:'2024-01-01',expiry:'',mfa:'No',provisionedBy:'Shaun Mathew',notes:'',
   createdBy:'Shaun Mathew',createdAt:'01 Jan 2024 | 10:20:00 AM'},
  {id:3,system:'AWS Console',accessType:'Admin Access',login:'rajan.aws',assignedTo:'Rajan Kumar',role:'Administrator',
   status:'Active',effective:'2024-02-15',expiry:'2026-11-15',mfa:'Yes',provisionedBy:'Aman Singh',notes:'Quarterly access review.',
   createdBy:'Shaun Mathew',createdAt:'15 Feb 2024 | 11:30:00 AM'},
  {id:4,system:'VPN',accessType:'VPN Access',login:'rk.vpn',assignedTo:'Rajan Kumar',role:'Viewer',
   status:'Revoked',effective:'2024-03-10',expiry:'2027-03-09',mfa:'Yes',provisionedBy:'Shaun Mathew',notes:'',
   createdBy:'Shaun Mathew',createdAt:'10 Mar 2024 | 09:15:00 AM',revokedOn:'2026-08-12'},
  {id:5,system:'GitHub',accessType:'Repository Access',login:'anika.gh',assignedTo:'Anika Shah',role:'Contributor',
   status:'Active',effective:'2024-04-01',expiry:'',mfa:'Yes',provisionedBy:'Aman Singh',notes:'',
   createdBy:'Shaun Mathew',createdAt:'01 Apr 2024 | 02:00:00 PM'},
  {id:6,system:'Salesforce',accessType:'User Account',login:'neha.sharma@company.com',assignedTo:'Neha Sharma',role:'Editor',
   status:'Pending',effective:'2026-10-10',expiry:'2027-10-09',mfa:'Yes',provisionedBy:'',notes:'',
   createdBy:'Pallavi Parate',createdAt:'01 Oct 2026 | 03:40:00 PM'},
  {id:7,system:'Slack',accessType:'User Account',login:'dev.k@company.com',assignedTo:'Dev Kulkarni',role:'Contributor',
   status:'Active',effective:'2026-05-02',expiry:'',mfa:'No',provisionedBy:'Pallavi Parate',notes:'',
   createdBy:'Pallavi Parate',createdAt:'02 May 2026 | 10:05:00 AM'},
  {id:8,system:'AWS Console',accessType:'Application Access',login:'aman.devops',assignedTo:'Aman Singh',role:'Administrator',
   status:'Active',effective:'2026-06-15',expiry:'2026-10-20',mfa:'Yes',provisionedBy:'Shaun Mathew',notes:'',
   createdBy:'Shaun Mathew',createdAt:'15 Jun 2026 | 12:30:00 PM'},
  {id:9,system:'Google Workspace',accessType:'User Account',login:'rahul.mehta@company.com',assignedTo:'Rahul Mehta',role:'Contributor',
   status:'Expired',effective:'2025-04-01',expiry:'2026-03-31',mfa:'Yes',provisionedBy:'Shaun Mathew',notes:'',
   createdBy:'Shaun Mathew',createdAt:'01 Apr 2025 | 09:00:00 AM'},
  {id:10,system:'Jira',accessType:'Application Access',login:'aman_jira',assignedTo:'Aman Singh',role:'Viewer',
   status:'On Hold',effective:'2026-10-07',expiry:'',mfa:'No',provisionedBy:'',notes:'Waiting on licence.',
   createdBy:'Shaun Mathew',createdAt:'03 Oct 2026 | 11:10:00 AM'}
];
let itAccessNextId=11;
function itaEmpId(r){const e=axEmp(r.assignedTo);return e&&e.empId?e.empId:'';}

// ── State ──
let itaSelectedId=null,itaTab='basic-details';
let itaSysF='',itaTypeF='',itaStatusF='',itaQ='';
let itaDraft=null,itaEditId=null,itaAddOpen='',itaModalOpen=false,itaDraftOrig='';
let itaSysDraft={name:'',url:'',logo:'',logoName:''};

function itaRows(){
  return itAccessData.filter(function(r){
    if(itaSysF&&r.system!==itaSysF)return false;
    if(itaTypeF&&r.accessType!==itaTypeF)return false;
    if(itaStatusF&&r.status!==itaStatusF)return false;
    return true;
  });
}
function itaToggleStat(v){itaStatusF=itaStatusF===v?'':v;itaSelectedId=null;renderADTPage();}
function applyItaFilters(){
  const s=getCSValue('ita-f-sys'),t=getCSValue('ita-f-type'),st=getCSValue('ita-f-status');
  itaSysF=s&&s!=='All Systems'?s:'';
  itaTypeF=t&&t!=='All Access Types'?t:'';
  itaStatusF=st&&st!=='All Statuses'?st:'';
  itaQ=lpSearchValue('ita-f-q');
  itaSelectedId=null;renderADTPage();
}
function resetItaFilters(){itaSysF='';itaTypeF='';itaStatusF='';itaQ='';itaSelectedId=null;renderADTPage();}

// ── Detail panel ──
function openItaSidebar(id,tab){
  if(itaSelectedId!=null&&itaSelectedId!==id&&sbLeaveGuard('ita',function(){openItaSidebar(id,tab);}))return;
  if(itaInlineEdit()&&itaEditId!==id){itaDraft=null;itaEditId=null;}
  itaTab=tab||sbKeepTab(itaSelectedId,itaTab);itaSelectedId=id;
  const sb=document.getElementById('ita-split-sb');if(sb)sb.classList.add('open');
  isbTab('ita',renderItaSidebar);
  document.querySelectorAll('.ita-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='ita-row-'+id);});
}
function closeItaSidebar(){
  if(sbLeaveGuard('ita',closeItaSidebar))return;
  if(itaInlineEdit()){itaDraft=null;itaEditId=null;}
  itaSelectedId=null;
  const sb=document.getElementById('ita-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.ita-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navItaTab(t){if(itaInlineEdit()&&!sbHasDraft('ita')){itaDraft=null;itaEditId=null;}itaTab=t;isbTab('ita',renderItaSidebar);}

function itaSeedLogs(r){
  const p=String(r.createdAt).split(' | ');
  const fx=[{date:p[0],time:p[1]||'09:00:00 AM',user:r.createdBy,status:'Pending',
    action:'Access to '+r.system+' requested for '+r.assignedTo+'.'}];
  if(r.status!=='Pending')fx.unshift({date:axDate(r.effective),time:'10:00:00 AM',user:r.provisionedBy||r.createdBy,status:'Active',
    action:r.accessType+' provisioned as '+r.role+'. Login '+r.login+'.'});
  if(r.status==='Revoked')fx.unshift({date:axDate(r.revokedOn||r.expiry),time:'05:00:00 PM',user:'Shaun Mathew',status:'Revoked',
    action:'Access revoked — no longer required for the role.'});
  if(r.status==='Expired')fx.unshift({date:axDate(r.expiry),time:'11:59:00 PM',user:'System',status:'Expired',
    action:'Access lapsed on its expiry / review date.'});
  if(r.status==='On Hold')fx.unshift({date:p[0],time:'11:30:00 AM',user:r.createdBy,status:'On Hold',action:r.notes||'Put on hold.'});
  return seedLogs(r,fx);
}
const itaWorkflowData={};
function itaWorkflow(r){
  if(!itaWorkflowData[r.id]){
    const p=String(r.createdAt).split('|');
    const d=(p[0]||'').trim(),t=(p[1]||'').trim()||'09:00:00 AM';
    const wf=[{title:'Access Requested',user:r.createdBy,date:d,time:t,
      description:r.accessType+' on '+r.system+' requested for '+r.assignedTo+'.'}];
    if(['Active','Revoked','Expired','Inactive'].indexOf(r.status)>=0)wf.unshift({title:'Access Provisioned',user:r.provisionedBy||r.createdBy,date:axDate(r.effective),time:'10:00:00 AM',
      description:'Provisioned by '+(r.provisionedBy||r.createdBy)+'. Effective '+axDate(r.effective)+(r.expiry?', review / expiry '+axDate(r.expiry):', with no end date')+'.'});
    if(r.status==='Revoked')wf.unshift({title:'Access Revoked',user:'Shaun Mathew',date:axDate(r.revokedOn||r.expiry),time:'05:00:00 PM',
      description:'Login '+r.login+' disabled on '+r.system+'.'});
    if(r.status==='Expired')wf.unshift({title:'Access Expired',user:'System',date:axDate(r.expiry),time:'11:59:00 PM',
      description:'Reached its expiry / review date without renewal.'});
    itaWorkflowData[r.id]=wf;
  }
  return itaWorkflowData[r.id];
}
/* "Expiry 20 Oct 2026" is a date; "15 days left" is what an admin renewing
   access actually needs, so the panel says that too. */
function itaValidity(r){
  if(r.status==='Revoked')return {tone:'bad',text:'Revoked'};
  if(r.status==='Inactive')return {tone:'bad',text:'Inactive'};
  if(r.status==='On Hold')return {tone:'wait',text:'On hold'};
  if(r.status==='Pending')return {tone:'wait',text:'Starts '+axDate(r.effective)};
  if(!r.expiry)return {tone:'ok',text:'No expiry'};
  const left=axDaysBetween(axToday(),r.expiry);
  if(left<0)return {tone:'idle',text:'Expired '+axDate(r.expiry)};
  if(left<=30)return {tone:'wait',text:'Review in '+left+' day'+(left===1?'':'s')};
  return {tone:'ok',text:left+' days left'};
}
function itaSysLogo(name,size){
  const m=ITA_SYSTEM_META[name];
  return m&&m.logo?'<img class="ax-sys-logo" src="'+m.logo+'" alt="" style="width:'+(size||18)+'px;height:'+(size||18)+'px">':'';
}
function renderItaSidebar(){
  const r=itAccessData.find(function(x){return x.id===itaSelectedId;});if(!r)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'validity',label:'Validity'},
    {id:'provisioning',label:'Provisioning'},{id:'workflow',label:'Workflow'}];
  const tabBar=axTabBar('ita',tabs,itaTab,'navItaTab','closeItaSidebar');
  const e=axEmp(r.assignedTo);
  const meta=ITA_SYSTEM_META[r.system]||{};
  let body='';
  const hero=function(editing){return sbHero({img:meta.logo,icon:AX_ICO.heroKey,name:r.system,meta:[r.accessType,r.assignedTo],
    status:axBadge(statusTone(r.status),r.status),editing:editing,onEdit:'startAddItAccess('+r.id+')'});};
  if(itaTab==='basic-details'&&itaInlineEdit(r.id)){
    body=hero(true)+axInlineFormHTML(itaFormFieldsHTML(),'cancelAddItAccess()','submitAddItAccess()');
  }else if(itaTab==='basic-details'){
    body=hero(false)
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fUser,'Employee Name',r.assignedTo)
      +axField(AX_ICO.fHash,'Employee ID',itaEmpId(r))
      +axField(AX_ICO.fMonitor,'System / Application',r.system+(meta.url?' <span class="ax-sub">'+meta.url+'</span>':''))
      +axField(AX_ICO.fKey,'Access Type',r.accessType)
      +axField(AX_ICO.fMail,'Work Email / Login ID',r.login)
      +axField(AX_ICO.fShield,'Role / Permission Profile',r.role)
      +axField(AX_ICO.fBuild,'Department',e?e.dept:'')
      +axField(AX_ICO.fLock,'MFA Enabled',r.mfa==='Yes'?axBadge('ok','Yes'):axBadge('wait','No'))
      +axField(AX_ICO.fTicket,'Comment / Notes',r.notes,true)
      +'</div>';
  }else if(itaTab==='validity'){
    const v=itaValidity(r);
    const span=r.expiry?axDaysBetween(r.effective,r.expiry):null,used=axDaysBetween(r.effective,axToday());
    const pct=span>0?Math.max(0,Math.min(100,Math.round(used/span*100))):0;
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Access Period</span>'+axBadge(v.tone,v.text)+'</div>'
      +(span>0?'<div class="ax-warranty"><div class="ax-warranty-bar"><span class="tone-'+v.tone+'" style="width:'+pct+'%"></span></div>'
        +'<div class="ax-warranty-ends"><span>'+axDate(r.effective)+'</span><span>'+axDate(r.expiry)+'</span></div></div>':'')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fCal,'Effective Date',axDate(r.effective))
      +axField(AX_ICO.fCal,'Expiry / Review Date',r.expiry?axDate(r.expiry):'No expiry')
      +axField(AX_ICO.fCheck,'Access Status',axBadge(statusTone(r.status),r.status))
      +(r.revokedOn?axField(AX_ICO.fLock,'Revoked On',axDate(r.revokedOn)):'')
      +'</div>';
  }else if(itaTab==='provisioning'){
    body='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Provisioning</span></div>'
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fCheck,'Provisioned By',r.provisionedBy||(r.status==='Pending'||r.status==='On Hold'?'Not yet provisioned':''))
      +axField(AX_ICO.fUser,'Requested By',r.createdBy)
      +axField(AX_ICO.fCal,'Requested On',String(r.createdAt).split(' | ')[0])
      +axField(AX_ICO.fLock,'Credentials','Not stored — no passwords, tokens or secrets are kept here.')
      +'</div>';
  }else if(itaTab==='history'){
    body=sbHistoryHTML(r);
  }else if(itaTab==='logs'){
    body=axLogsHTML(itaSeedLogs(r),r.status,ITA_STATUSES,
      {sel:'ita-log-status-sel',inp:'ita-log-comment-inp',sub:'Move this access on and say why',
       cancel:'navItaTab(\'logs\')',save:'itaSaveLog('+r.id+')'},'');
  }else{
    body=wfTimelineHTML(wfItAccess(r));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
function itaSaveLog(id){
  const r=itAccessData.find(function(x){return x.id===id;});if(!r)return;
  const was=r.status;
  const inp=document.getElementById('ita-log-comment-inp');
  const comment=inp?inp.value.trim():'';
  itaSeedLogs(r);
  if(!lpCommitLog(r,'ita-log-status-sel','ita-log-comment-inp',r.logs))return;
  if(r.status!==was){
    if(r.status==='Active'&&!r.provisionedBy)r.provisionedBy=CURRENT_USER;
    if(r.status==='Revoked')r.revokedOn=axToday();
    if(r.status==='Active')delete r.revokedOn;
    itaWorkflow(r);
    const title={'Active':was==='Pending'?'Access Provisioned':'Access Restored','Pending':'Access Pending','On Hold':'Access On Hold',
      'Inactive':'Access Deactivated','Revoked':'Access Revoked','Expired':'Access Expired'}[r.status];
    wfPush(itaWorkflowData,id,title,'Moved from '+was+' to '+r.status+'. '+comment);
  }
  renderADTPage();
  showToast('Log added','success',r.system+' access for '+r.assignedTo+' is now '+r.status+'.');
}

// ── Listing (FR-10.4) ──
function buildItAccessHTML(){
  const count=function(s){return itAccessData.filter(function(r){return r.status===s;}).length;};
  const shown=lpSearchRows(itaRows(),itaQ);
  if(itaSelectedId&&!shown.some(function(r){return r.id===itaSelectedId;}))itaSelectedId=null;
  const pgn=listPage('it-access',[itaSysF,itaTypeF,itaStatusF,itaQ].join('|'),shown.map(function(r,i){
    return '<tr class="ita-row'+(itaSelectedId===r.id?' lp-row-selected':'')+'" id="ita-row-'+r.id+'" style="cursor:pointer" onclick="openItaSidebar('+r.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link">'+r.assignedTo+'</div><div class="lp-c-sub">'+(itaEmpId(r)||'—')+'</div></td>'
      +'<td><div class="lp-c-plain ax-sys-cell">'+itaSysLogo(r.system,16)+r.system+'</div><div class="lp-c-sub">'+r.accessType+'</div></td>'
      +'<td><div class="lp-c-plain ax-c-trunc" title="'+attrSafe(r.login)+'">'+r.login+'</div><div class="lp-c-sub">'+(r.role||'—')+'</div></td>'
      +'<td>'+axBadge(statusTone(r.status),r.status)+'</td>'
      +'<td><div class="lp-c-plain">'+axDate(r.effective)+'</div><div class="lp-c-sub">'+(r.expiry?'Review '+axDate(r.expiry):'No expiry')+'</div></td>'
      // Provisioned By is on the panel's Basic Details.
      +'<td onclick="event.stopPropagation()">'+rowLogCell('it-access',r.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No access records match this filter.</td></tr>');
  const stat=function(s){const color='var(--st-'+statusTone(s)+'-fg)';
    return '<div class="listing-stat'+(itaStatusF===s?' stat-selected':'')+'" onclick="itaToggleStat(\''+s+'\')">'
      +'<div class="listing-stat-count" style="color:'+color+'">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +(typeof empReturnBarHTML==='function'?empReturnBarHTML():'')
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('ita-f-q',itaQ,'Search employee, ID, login','applyItaFilters()')
    +apCS('ita-f-sys',ITA_SYSTEMS,itaSysF,'All Systems')
    +apCS('ita-f-type',ITA_ACCESS_TYPES,itaTypeF,'All Access Types')
    +apCS('ita-f-status',ITA_STATUSES,itaStatusF,'All Statuses')
    +clearFiltersBtn([itaSysF,itaTypeF,itaStatusF,itaQ],'resetItaFilters()')
    +'<button class="lp-pill-search" onclick="applyItaFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
    +ITA_TILES.map(function(s){return stat(s);}).join('')
    +'</div></div>'
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="ita-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table ax-table"><thead><tr><th>S. No</th><th>Employee Name</th><th>System</th>'
      +'<th>Login ID</th><th>Access Status</th><th>Effective Date</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(itaSelectedId?' open':'')+'" id="ita-split-sb"><div class="lp-isb" id="ita-isb-inner">'+(itaSelectedId?sbRender(renderItaSidebar,'ita'):'')+'</div></div>'
    +'</div></div>'
    +(itaModalOpen?buildAddItAccessModalHTML():'');
}

// ── Add / Edit IT Access popup (FR-10.3) ──
function itaBlankDraft(){
  return {system:'',accessType:'',login:'',assignedTo:'',role:'',status:'',effective:'',expiry:'',provisionedBy:'',mfa:'Yes',notes:''};
}
function itaInlineEdit(id){return !!itaEditId&&!itaModalOpen&&(id==null||itaEditId===id);}
function startAddItAccess(editId){
  const r=editId?itAccessData.find(function(x){return x.id===editId;}):null;
  itaEditId=r?r.id:null;
  itaDraft=r?Object.assign(itaBlankDraft(),{system:r.system,accessType:r.accessType,login:r.login,assignedTo:r.assignedTo,
      role:r.role,status:r.status,effective:r.effective,expiry:r.expiry,provisionedBy:r.provisionedBy,mfa:r.mfa,notes:r.notes||''})
    :itaBlankDraft();
  itaAddOpen='';itaModalOpen=!r;itaDraftOrig=JSON.stringify(itaDraft);
  if(r){itaSelectedId=r.id;itaTab='basic-details';}
  if(page!=='it-access'){page='it-access';syncSidebarDropdown(page);}
  renderADTPage();
}
function cancelAddItAccess(){
  itaDraft=null;itaEditId=null;itaAddOpen='';itaModalOpen=false;
  axCloseCreate();
}
function itaSync(){
  if(!itaDraft)return;
  [['login','ita-login'],['notes','ita-notes']].forEach(function(p){const el=document.getElementById(p[1]);if(el)itaDraft[p[0]]=el.value.trim();});
  [['effective','ita-eff'],['expiry','ita-exp']].forEach(function(p){const el=document.getElementById(p[1]);if(el)itaDraft[p[0]]=el.value;});
  [['system','ita-sys'],['accessType','ita-type'],['assignedTo','ita-emp'],['role','ita-role'],['status','ita-status'],
   ['provisionedBy','ita-prov'],['mfa','ita-mfa']]
    .forEach(function(p){if(document.getElementById('csw-'+p[1]))itaDraft[p[0]]=getCSValue(p[1]);});
  const n=document.getElementById('ita-new-sys-name'),u=document.getElementById('ita-new-sys-url');
  if(n)itaSysDraft.name=n.value.trim();
  if(u)itaSysDraft.url=u.value.trim();
}
function itaOpenAdd(key){
  itaSync();itaAddOpen=itaAddOpen===key?'':key;
  if(itaAddOpen)itaSysDraft={name:'',url:'',logo:'',logoName:''};
  renderADTPage();axFocus('ita-new-sys-name');
}
function itaCancelAdd(){itaSync();itaAddOpen='';renderADTPage();}
function itaPickSysLogo(input){
  const f=input.files&&input.files[0];input.value='';
  if(!f)return;
  if(!/^image\//.test(f.type)){showToast('Image files only','error',f.name+' is not an image.');return;}
  if(f.size>2*1024*1024){showToast('Logo is over 2 MB','error');return;}
  const rd=new FileReader();
  rd.onload=function(){itaSync();itaSysDraft.logo=rd.result;itaSysDraft.logoName=f.name;renderADTPage();};
  rd.readAsDataURL(f);
}
function itaSaveAdd(){
  itaSync();
  const val=itaSysDraft.name;
  if(!val){showToast('System / Application Name is required','error');axFocus('ita-new-sys-name');return;}
  if(/['"]/.test(val)){showToast('Quotes are not allowed in a name','error');return;}
  const hit=ITA_SYSTEMS.find(function(x){return x.toLowerCase()===val.toLowerCase();});
  if(hit){itaDraft.system=hit;showToast(hit+' already exists','info','It has been selected for you.');}
  else{
    ITA_SYSTEMS.push(val);itaDraft.system=val;
    ITA_SYSTEM_META[val]={url:itaSysDraft.url,logo:itaSysDraft.logo};
    showToast('System added','success','"'+val+'" is now available in every System / Application dropdown.');
  }
  itaAddOpen='';renderADTPage();
}
/* + Add System / Application: name, domain and logo, stored as master data. */
function itaSysAddHTML(){
  if(itaAddOpen!=='system')return '';
  const s=itaSysDraft;
  return '<div class="ax-sys-add">'
    +'<input class="ep-form-input" id="ita-new-sys-name" placeholder="System / Application Name" value="'+attrSafe(s.name)+'">'
    +'<input class="ep-form-input" id="ita-new-sys-url" placeholder="Domain URL, e.g. app.company.com" value="'+attrSafe(s.url)+'">'
    +'<div class="ax-sys-add-row">'
      +(s.logo?'<span class="ax-sys-add-logo"><img src="'+s.logo+'" alt="">'+attrSafe(s.logoName)+'</span>'
        :'<label class="ep-cancel-btn ax-inline-btn ax-sys-upload"><input type="file" accept="image/*" hidden onchange="itaPickSysLogo(this)">'+AX_ICO.upload+' Logo Upload</label>')
      +'<span style="flex:1"></span>'
      +'<button type="button" class="ep-cancel-btn ax-inline-btn" onclick="itaCancelAdd()">Cancel</button>'
      +'<button type="button" class="ep-save-btn ax-inline-btn" onclick="itaSaveAdd()">Add</button>'
    +'</div></div>';
}
/* Picking the employee fills in the Employee ID underneath. */
function itaEmpHook(){itaSync();renderADTPage();}
function itaFormFieldsHTML(){
  if(!itaDraft)itaDraft=itaBlankDraft();
  const d=itaDraft,edit=!!itaEditId;
  const e=axEmp(d.assignedTo);
  const sel=function(id,label,opts,val,ph,req,hook){
    return '<div class="ep-form-group">'+axAddLabel(label,req)+apCS(id,opts,val,ph,hook)+'</div>';
  };
  const statusField=edit
    ?'<div class="ep-form-group ep-form-full"><div class="ax-locked-note">Access Status <b>'+d.status+'</b>. '
      +'Status moves in the record&rsquo;s <b>Logs</b> tab, where each move carries a comment.</div></div>'
    :sel('ita-status','Access Status',ITA_STATUSES,d.status,'Select Status',true);
  const fields='<div class="ep-form-group">'+axAddLabel('Employee Name',true)
        +apCS('ita-emp',axEmpNames(),d.assignedTo,'Search Employee','itaEmpHook')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Employee ID</label>'
        +'<input class="ep-form-input" readonly value="'+attrSafe(e&&e.empId?e.empId:'')+'" placeholder="Auto — from the employee"></div>'
      +'<div class="ep-form-group">'+axAddLabel('System / Application',true,'system','itaOpenAdd')
        +apCS('ita-sys',ITA_SYSTEMS,d.system,'Select System')+itaSysAddHTML()+'</div>'
      +sel('ita-type','Access Type',ITA_ACCESS_TYPES,d.accessType,'Select Access Type',true)
      +'<div class="ep-form-group"><label class="ep-form-label" for="ita-login">Work Email / Login ID <span class="req">*</span></label>'
        +'<input class="ep-form-input" id="ita-login" value="'+attrSafe(d.login)+'" placeholder="e.g. name@company.com"></div>'
      +sel('ita-role','Role / Permission Profile',ITA_ROLES,d.role,'Select Role',false)
      +statusField
      +'<div class="ep-form-group"><label class="ep-form-label">Effective Date <span class="req">*</span></label>'+apCD('ita-eff',d.effective,'dd-mm-yyyy')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">Expiry / Review Date</label>'+apCD('ita-exp',d.expiry,'dd-mm-yyyy')
        +'<div class="ea-hint">Optional. Leave empty for access with no end date.</div></div>'
      +sel('ita-prov','Provisioned By',AX_PROVISIONERS,d.provisionedBy,'Search User',false)
      +sel('ita-mfa','MFA Enabled',['Yes','No'],d.mfa,'Select',true)
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="ita-notes">Comment / Notes</label>'
        +'<textarea class="ep-form-input ax-notes" id="ita-notes" placeholder="Anything worth knowing about this access">'+attrSafe(d.notes||'')+'</textarea>'
        +'<div class="ea-hint">Do not enter passwords, API tokens, secret keys or any other authentication secret — they are never stored.</div></div>';
  return fields;
}
function buildAddItAccessModalHTML(){
  const fields=itaFormFieldsHTML();
  const d=itaDraft,edit=!!itaEditId;
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(edit?'Edit IT Access':'Add IT Access')+'</span>'
      +'<button class="ct-modal-close" onclick="cancelAddItAccess()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+(edit?'Update '+d.system+' access for '+d.assignedTo+'.':'Grant system access to an employee.')
      +' Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid">'+fields+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddItAccess()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="submitAddItAccess()">'+(edit?'Save Changes':'Save Access')+'</button>'
    +'</div></div>'
    +'</div></div>';
}
function submitAddItAccess(){
  itaSync();
  const d=itaDraft,edit=!!itaEditId;
  const need=[['assignedTo','Employee Name'],['system','System / Application'],['accessType','Access Type'],
    ['login','Work Email / Login ID'],['effective','Effective Date'],['mfa','MFA Enabled']];
  if(!edit)need.push(['status','Access Status']);
  for(let i=0;i<need.length;i++){
    if(!String(d[need[i][0]]||'').trim()){showToast(need[i][1]+' is required','error');return;}
  }
  if(d.expiry&&d.expiry<=d.effective){showToast('Access ends before it starts','error','Expiry / Review Date must be after the Effective Date.');return;}
  if(!edit&&d.status==='Active'&&!d.provisionedBy){showToast('Who provisioned it?','error','Active access needs Provisioned By.');return;}
  const clash=itAccessData.find(function(r){
    return r.id!==itaEditId&&r.system===d.system&&r.assignedTo===d.assignedTo&&['Active','Pending','On Hold'].indexOf(r.status)>=0;
  });
  if(clash){showToast(d.assignedTo+' already has '+d.system+' access','error','Record '+clash.login+' is '+clash.status+'. Update that one instead.');return;}
  if(edit){
    const r=itAccessData.find(function(x){return x.id===itaEditId;});if(!r)return;
    const fields=[['assignedTo','Employee'],['system','System'],['accessType','Access Type'],['login','Login'],['role','Role'],
      ['effective','Effective Date'],['expiry','Expiry / Review Date'],['provisionedBy','Provisioned By'],['mfa','MFA'],['notes','Notes']];
    const changes=fields.filter(function(f){return String(r[f[0]]||'')!==String(d[f[0]]||'');}).map(function(f){return f[1];});
    if(!changes.length){cancelAddItAccess();showToast('No changes','info','Nothing was different.');return;}
    fields.forEach(function(f){r[f[0]]=d[f[0]];});
    itaWorkflow(r);
    wfPush(itaWorkflowData,r.id,'Access Edited','Updated: '+changes.join(', ')+'.');
    itaDraft=null;itaEditId=null;itaModalOpen=false;
    axCloseCreate();
    showToast('Access updated','success',r.system+' for '+r.assignedTo+' saved.');
    return;
  }
  const id=itAccessNextId++;
  const s=stampNow();
  const r={id:id,system:d.system,accessType:d.accessType,login:d.login,assignedTo:d.assignedTo,role:d.role,status:d.status,
    effective:d.effective,expiry:d.expiry,mfa:d.mfa,provisionedBy:d.provisionedBy,notes:d.notes,
    createdBy:CURRENT_USER,createdAt:axStamp()};
  r.logs=[{date:s.date,time:s.time,user:CURRENT_USER,status:r.status,
    action:r.accessType+' on '+r.system+' '+(r.status==='Active'?'provisioned for ':'recorded for ')+r.assignedTo+'.'+(r.notes?' '+r.notes:'')}];
  itaWorkflowData[id]=[{title:r.status==='Active'?'Access Provisioned':'Access Requested',user:CURRENT_USER,date:s.date,time:s.time,
    description:r.accessType+' on '+r.system+' for '+r.assignedTo+(r.provisionedBy?', provisioned by '+r.provisionedBy:'')+'.'}];
  itAccessData.unshift(r);
  lpLanded('it-access',id);
  itaDraft=null;itaModalOpen=false;
  axCloseCreate();
  showToast('Access saved','success',r.system+' access for '+r.assignedTo+' is '+r.status+'.');
}

/* ── Page titles ──────────────────────────────────────────────────────────
   getPageMeta() falls back to supportPageMeta for any page it does not name,
   so the four pages register their titles there instead of in that function. */
Object.assign(supportPageMeta,{
  'asset-allocation':{title:'Assets',context:'Admin Access',filters:[],columns:[],rows:[]},
  'it-access':{title:'IT Accesses',context:'Admin Access',filters:[],columns:[],rows:[]}
});

/* Unsaved edits (sbDraftReg, core.js): the draft is read in from the form and
   compared with what the form opened with. */
sbDraftReg('ast',{
  dirty:function(){if(!astInlineEdit())return false;astSync();return JSON.stringify(astDraft)!==astDraftOrig;},
  drop:function(){astDraft=null;astEditId=null;}});
sbDraftReg('ita',{
  dirty:function(){if(!itaInlineEdit())return false;itaSync();return JSON.stringify(itaDraft)!==itaDraftOrig;},
  drop:function(){itaDraft=null;itaEditId=null;}});
