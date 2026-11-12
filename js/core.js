
// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ STATE ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
let view='adt',mode='agent',page='dashboard',agent='contractor',adtSidebarCollapsed=false,agentSidebarCollapsed=true,notifOpen=false,notifShowUnread=true,agentMsgs=[{role:'bot',text:"Hi John! I'm your ADT Agent. What would you like to do today?"}],formStep=-1,returnToReview=false,cw=360,selectedAIJourneyId='contract-creation',aiEventDrawerIdx=-1,cameFromDashboard=false;
let aiContractPrefill=null,aiAssistedFlow=false,aiCtNotFoundOpen=false,aiProposalDraft=null,aiCtChatMsgs=[],aiWizardFormData={},aiCreatedContractId=null;
const aiDealManager={name:'Karan Mehta',role:'Deal Manager',initials:'KM'};
const aiOpsManager={name:'Priya Nair',role:'Ops Manager',initials:'PN'};
let aiCtAnimatedStage=-1,aiCtPendingEmpType='',aiCtJourneyEmployee=null;
const aiPayrollManager={name:'Meera Iyer',role:'Finance Approver',initials:'MI'};
let aiPayrollAnimatedStage=-1,aiPayrollData={};
let selectedAIRunId='RUN-2001';
let aiJourneyDetailSelectedStage=-1;
const aiAutomationRuns={
  'contract-creation':[
    {runId:'RUN-2001',client:'Rashi Singh',country:'Netherlands',contractType:'EOR',currentStepIdx:2,status:'Waiting for Approval',lastActivity:'3 hours ago'},
    {runId:'RUN-2002',client:'Rajdeep Singh',country:'Netherlands',contractType:'EOR',currentStepIdx:4,status:'Exception',lastActivity:'1 hour ago',exceptionNote:'Signed document could not be verified against the approved contract terms.'},
    {runId:'RUN-2003',client:'Emma Schmidt',country:'Germany',contractType:'EOR',currentStepIdx:6,status:'Completed',lastActivity:'2 days ago'}
  ],
  'payroll-creation':[
    {runId:'RUN-3001',client:'Antar Malhotra',country:'India',contractType:'Direct Employee',currentStepIdx:3,status:'Waiting for Approval',lastActivity:'4 hours ago'},
    {runId:'RUN-3002',client:'Anika Shah',country:'India',contractType:'Direct Employee',currentStepIdx:2,status:'Exception',lastActivity:'45 minutes ago',exceptionNote:'Statutory rate mismatch detected during salary calculation — needs Finance review.'},
    {runId:'RUN-3003',client:'Pallavi Parate',country:'India',contractType:'Direct Employee',currentStepIdx:1,status:'Active',lastActivity:'20 minutes ago'}
  ],
  'h2r-lifecycle':[
    {runId:'RUN-4001',client:'Sofia Romano',country:'Italy',contractType:'Contractor',currentStepIdx:3,status:'Waiting for Approval',lastActivity:'6 hours ago'},
    {runId:'RUN-4002',client:'Lucas Dubois',country:'France',contractType:'EOR',currentStepIdx:1,status:'Exception',lastActivity:'2 hours ago',exceptionNote:'Compliance Hub could not return statutory requirements for France — missing country configuration.'},
    {runId:'RUN-4003',client:'James Wilson',country:'United Kingdom',contractType:'EOR',currentStepIdx:4,status:'Completed',lastActivity:'3 days ago'}
  ]
};

let openDropdowns=new Set();
let activeSidebarItem='dashboard';
// Sub-tab state for the merged Employees / Timesheet modules
let empSubTab='direct';
let tsSubTab='my';
// ── ICON LIBRARY (shared between parents and children) ──
const sbIco={
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  userCheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
  database:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  building:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>',
  store:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z"/><path d="M9 21v-6h6v6"/></svg>',
  fileCheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>',
  fileText:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  shieldCheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
  sliders:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  key:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3L21 2"/><path d="M16 7l3 3"/><path d="M18.5 4.5l2 2"/></svg>',
  folderDoc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  laptop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
  /* Contract-type tiles. Same 24x24 box and same 1.8 stroke as every icon
     above, and all four drawn on currentColor - type is a FILTER, not a
     status, and colour on this screen is already spoken for by the p1..p8
     pipeline ladder and the compliance tones. A per-type palette here would
     put a fifth colour system on a table that already carries two.

     One subject each, centred in the box. The previous set drew two subjects
     per icon - a building AND a person, a card AND a spine, a case AND a
     clock - which at 27px is four or five strokes fighting inside a 4mm
     square: what you actually saw was a smudge that told the four types
     apart by position on the row rather than by shape. These read at a
     glance and stay distinct from each other: a building we employ through,
     two people sharing one employment, a passport, a case of one's own. */
  ctEor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M6 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16"/><path d="M15 10h3a2 2 0 0 1 2 2v9"/><path d="M9.5 7.5h2"/><path d="M9.5 11.5h2"/><path d="M9.5 15.5h2"/></svg>',
  ctPeo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.3"/><path d="M2.5 20v-1.2A4.8 4.8 0 0 1 7.3 14h3.4a4.8 4.8 0 0 1 4.8 4.8V20"/><path d="M16.2 5.1a3.3 3.3 0 0 1 0 5.8"/><path d="M17.6 14.2A4.8 4.8 0 0 1 21.5 18.9V20"/></svg>',
  ctImmigration:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2.5" width="16" height="19" rx="2.5"/><circle cx="12" cy="9.5" r="2.8"/><path d="M8.6 15.6h6.8"/><path d="M10 18.3h4"/></svg>',
  ctContractor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="19" height="13.5" rx="2.5"/><path d="M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7"/><path d="M2.5 12.5h19"/><path d="M10.5 12.5h3"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>',
  calStar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M12 12.6l1.15 2.35 2.6.38-1.88 1.83.44 2.59L12 18.53l-2.31 1.22.44-2.59-1.88-1.83 2.6-.38z"/></svg>',
  dollar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  gauge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>',
  receipt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1V2l-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 7V5.5A1.5 1.5 0 0 0 18.5 4H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/><path d="M16.5 14h.01"/></svg>',
  card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M6 15h2"/><path d="M12 15h4"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
  megaphone:'<svg class="mg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.2v3.6a1 1 0 0 0 .8 1L15 17.5V6.5L3.8 9.2a1 1 0 0 0-.8 1z"/><path d="M6.5 14.9v2.6a2 2 0 0 0 4 0v-1.6"/><path class="mg-wave" d="M18 9.5a4 4 0 0 1 0 5"/><path class="mg-wave" d="M18 9.5a4 4 0 0 1 0 5"/><path class="mg-wave" d="M18 9.5a4 4 0 0 1 0 5"/></svg>',
  chatLines:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 10h8"/><path d="M8 14h5"/></svg>',
  ticket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3z"/><path d="M13 5v14"/></svg>',
  cog:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
};

const sidebarItems=[
  // Grouped by what the user is doing, not by which team owns the screen.
  // Rules this list follows: a section header earns its place only if it holds
  // more than one module; a dropdown only if it holds more than one page; and a
  // child never repeats the word its parent already said.
  {section:'Overview'},
  {id:'dashboard',label:'Dashboard',color:'orange',icon:sbIco.grid},

  {section:'Workforce'},
  {dropdown:'People',color:'blue',icon:sbIco.users,children:[
    {id:'employees',label:'Employees',color:'blue',icon:sbIco.user},
    {id:'teams',label:'Teams',color:'blue',icon:sbIco.users}
  ]},
  {dropdown:'Contracts',color:'teal',icon:sbIco.fileCheck,children:[
    {id:'contracts',label:'Overview',color:'teal',icon:sbIco.fileCheck},
    {id:'contract-templates',label:'Templates',color:'teal',icon:sbIco.fileText}
  ]},
  {id:'hr-docs',label:'HR Docs',color:'blue',icon:sbIco.folderDoc},

  {section:'Time & Pay'},
  {dropdown:'Time & Attendance',color:'teal',icon:sbIco.clock,children:[
    {id:'timesheet',label:'Timesheets',color:'teal',icon:sbIco.clock},
    {id:'all-leaves',label:'Leave Requests',color:'teal',icon:sbIco.calendar},
    {id:'leave-policies',label:'Leave Policies',color:'teal',icon:sbIco.fileText},
    {id:'holidays',label:'Holidays',color:'teal',icon:sbIco.calStar}
  ]},
  {dropdown:'Payroll Management',color:'green',icon:sbIco.dollar,children:[
    {id:'payroll',label:'Payroll',color:'green',icon:sbIco.dollar},
    {id:'payheads',label:'Payheads',color:'green',icon:sbIco.receipt}
  ]},
  // Expenses are filed against a category; Capping Limit is the most one may come to.
  {dropdown:'Expense Management',color:'green',icon:sbIco.receipt,children:[
    {id:'expenses',label:'Expenses',color:'green',icon:sbIco.receipt},
    {id:'capping-limit',label:'Capping Limit',color:'green',icon:sbIco.gauge},
    // Who is entitled to which flexi benefit - js/wallet-benefits.js.
    {id:'wallet-benefits',label:'Wallet & Benefits',color:'green',icon:sbIco.wallet},
    // Company money given before it is spent, and its settlement - js/advances.js.
    {id:'advances',label:'Advances & Imprest',color:'green',icon:sbIco.card},
    // Budget authority and corporate funding records - js/budgets.js.
    {id:'budgets',label:'Funding & Budgets',color:'green',icon:sbIco.dollar},
    // Corporate cards: programmes, requests, cards, controls, loads - js/cards.js.
    {id:'cards',label:'Corporate Cards',color:'green',icon:sbIco.card}
  ]},
  {dropdown:'Finance',color:'green',icon:sbIco.wallet,children:[
    {id:'payments',label:'Payments',color:'green',icon:sbIco.card}
  ]},

  {section:'Governance'},
  {dropdown:'Compliance Hub',color:'amber',icon:sbIco.shield,children:[
    {id:'compliance',label:'Compliance Item',color:'amber',icon:sbIco.shieldCheck},
    {id:'rates-rules',label:'Rates & Rules',color:'amber',icon:sbIco.sliders}
  ]},
  {dropdown:'Administration',color:'slate',icon:sbIco.cog,children:[
    {id:'settings',label:'Company Settings',color:'slate',icon:sbIco.building},
    {id:'all-users',label:'Users',color:'slate',icon:sbIco.userCheck}
  ]},
  {dropdown:'Admin Access',color:'slate',icon:sbIco.lock,children:[
    {id:'asset-allocation',label:'Assets',color:'slate',icon:sbIco.laptop},
    {id:'it-access',label:'IT Accesses',color:'slate',icon:sbIco.key}
  ]},
  // Who can do what: workspaces hold teams, a team applies a template
  // (js/rbac-workspaces.js, js/rbac-templates.js).
  {dropdown:'RBAC',color:'slate',icon:sbIco.shieldCheck,children:[
    {id:'rbac-workspaces',label:'Workspaces',color:'slate',icon:sbIco.building},
    {id:'rbac-templates',label:'Templates',color:'slate',icon:sbIco.shieldCheck}
  ]},
  // Written here, read on the employee dashboard (js/announcement-admin.js).
  {id:'announcements',label:'Announcements',color:'slate',icon:sbIco.megaphone},

  {section:'Support'},
  {id:'chats',label:'Chats',color:'indigo',icon:sbIco.chatLines},
  {id:'support-tickets',label:'Tickets',color:'indigo',icon:sbIco.ticket}
];


function getSidebarItems(){return sidebarItems;}

const ctxMap={dashboard:'You\'re on the <b>Dashboard</b>. I can help you understand metrics, navigate sections, or start any workflow.',people:'You\'re viewing <b>People</b>. I can help search employees, filter by country, or explain statuses.',contracts:'You\'re on <b>Contracts</b>. I can help create, review, or modify contracts.',payroll:'You\'re viewing <b>Payroll</b>. I can help with salary calculations or running payroll.',compliance:'You\'re on the <b>Compliance Hub</b>. I can check requirements for specific countries.',settings:'You\'re in <b>Company Settings</b>. I can help configure account or manage permissions.',teams:'You\'re viewing <b>Teams</b>. I can help manage team structures.',leaves:'You\'re on <b>Leaves</b>. I can help with leave policies and applications.',payments:'You\'re viewing <b>Payments</b>. I can help track invoices and payment history.',support:'You\'re on <b>Support</b>. I\'m here to help with any questions.'};

const sidebarToggleSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="14" rx="2"/><line x1="15" y1="5" x2="15" y2="19"/></svg>';
const chevronSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>';
const rowActionSvg='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';
const supportPageMeta={
  dashboard:{title:'Dashboard',context:'Dashboard',filters:['Country','Team','Status'],columns:['S. No','Metric','Scope','Value','Trend','Status'],rows:[[1,'Headcount','All entities','247','+12 this month','Active'],[2,'Active Teams','6 countries','18','Stable','Active'],[3,'Open Tasks','Operations','24','Needs review','Pending'],[4,'Invoices','Finance','10','Generated','Active'],[5,'Compliance Checks','Global','14','3 due soon','Pending'],[6,'Contracts','Workforce','25','15 drafts','Active']]},
  people:{title:'People',context:'People',filters:['Country','Worker Type','Status'],columns:['S. No','Name','Country','Worker Type','Team','Status'],rows:[[1,'Anika Shah','Netherlands','EOR','Engineering','Active'],[2,'Rahul Mehta','India','Contractor','Product','Active'],[3,'Maya Vos','Netherlands','PEO','Finance','Inactive'],[4,'Luis Martin','Spain','EOR','Sales','Active'],[5,'Nora Kim','Germany','Contractor','Design','Pending'],[6,'Owen Clark','United Kingdom','EOR','Operations','Active']]},
  teams:{title:'Teams',context:'Teams',filters:['Country','Department','Status'],columns:['S. No','Team','Department','Country','Members','Status'],rows:[[1,'Core Payroll','Finance','Netherlands','18','Active'],[2,'People Ops','HR','India','12','Active'],[3,'Compliance Desk','Legal','Germany','7','Active'],[4,'Entity Setup','Operations','Spain','9','Pending'],[5,'Customer Success','Support','United Kingdom','21','Active'],[6,'Local Admin','Admin','Netherlands','4','Inactive']]},
  contracts:{title:'Contracts',context:'Contracts',filters:['Country','Type','Status'],columns:['S. No','Contract Name','Country','Worker Type','Start Date','Status'],rows:[[1,'Netherlands EOR - Anika','Netherlands','EOR','12 May 2026','Active'],[2,'India Contractor - Rahul','India','Contractor','18 Apr 2026','Active'],[3,'Germany PEO - Nora','Germany','PEO','Pending','Pending'],[4,'Spain EOR - Luis','Spain','EOR','01 May 2026','Active'],[5,'UK EOR - Owen','United Kingdom','EOR','15 Mar 2026','Active'],[6,'Netherlands PEO - Maya','Netherlands','PEO','Expired','Inactive']]},
  leaves:{title:'Leaves',context:'Leaves',filters:['Country','Leave Type','Status'],columns:['S. No','Employee','Country','Leave Type','Dates','Status'],rows:[[1,'Anika Shah','Netherlands','Annual Leave','20-24 May','Active'],[2,'Rahul Mehta','India','Sick Leave','09 May','Pending'],[3,'Luis Martin','Spain','Parental Leave','Jun-Jul','Active'],[4,'Nora Kim','Germany','Annual Leave','14-18 May','Pending'],[5,'Owen Clark','United Kingdom','Holiday','27 May','Active'],[6,'Maya Vos','Netherlands','Sick Leave','Closed','Inactive']]},
  payroll:{title:'Pay Runs',context:'Pay Runs',filters:['Country','Cycle','Status'],columns:['S. No','Cycle','Country','Employees','Gross Pay','Status'],rows:[[1,'May 2026','Netherlands','41','EUR 184,200','Active'],[2,'May 2026','India','83','INR 9,840,000','Pending'],[3,'April 2026','Germany','19','EUR 92,450','Active'],[4,'April 2026','Spain','22','EUR 78,110','Active'],[5,'March 2026','United Kingdom','28','GBP 116,700','Active'],[6,'March 2026','Netherlands','39','EUR 176,900','Inactive']]},
  payments:{title:'Payments',context:'Payments',filters:['Country','Category','Status'],columns:['S. No','Invoice','Country','Category','Amount','Status'],rows:[[1,'INV-2048','Netherlands','Payroll','EUR 184,200','Active'],[2,'INV-2047','India','Contractor','INR 2,410,000','Pending'],[3,'INV-2046','Germany','Compliance','EUR 4,250','Active'],[4,'INV-2045','Spain','Payroll','EUR 78,110','Active'],[5,'INV-2044','United Kingdom','Benefits','GBP 8,720','Inactive'],[6,'INV-2043','Netherlands','Entity Setup','EUR 12,600','Active']]},
  /* One row: the entity you are signed in to. Every setting (bank, structure,
     roles, payroll, leaves...) is a tab on its panel, not a row of its own. */
  settings:{title:'Company Settings',context:'Company Settings',filters:[],columns:['S. No','Entity','Entity ID','Type','Country','Owner','Updated','Status'],rows:[[1,'Opendhi','ENT-00293','EOR Entity','India','Pallavi Parate','Today','Active']]},
  support:{title:'Support',context:'Support',filters:['Topic','Priority','Status'],columns:['S. No','Ticket','Topic','Owner','Updated','Status'],rows:[[1,'SUP-1018','Payroll question','ADT Support','Today','Active'],[2,'SUP-1017','Contract review','Legal Desk','Yesterday','Pending'],[3,'SUP-1016','Compliance rates','Compliance Desk','06 May 2026','Active'],[4,'SUP-1015','Payment proof','Finance Ops','04 May 2026','Active'],[5,'SUP-1014','Account access','Admin','Closed','Inactive'],[6,'SUP-1013','Entity setup','Operations','01 May 2026','Active']]},
  payheads:{title:'Payheads',context:'Payheads',filters:['Type','Status'],columns:['S. No','Payhead','Type','Calculation','Applies To','Status'],rows:[[1,'Basic Salary','Earning','50% of CTC','All employees','Active'],[2,'House Rent Allowance','Earning','40% of Basic','All employees','Active'],[3,'Provident Fund','Deduction','12% of Basic','India','Active'],[4,'Professional Tax','Deduction','Flat, state slab','India','Active'],[5,'Holiday Allowance','Earning','8% of gross','Netherlands','Active'],[6,'Overtime','Earning','1.5x hourly rate','Hourly contracts','Pending']]},
  'all-users':{title:'Users',context:'Users',filters:['Role','Status'],columns:['S. No','Name','Email','Role','Last Active','Status'],rows:[[1,'Pallavi Parate','pallavi@testemp.com','Entity Super Admin','Today','Active'],[2,'Shaun Mathew','shaun@testemp.com','Admin','Today','Active'],[3,'Karan Mehta','karan@testemp.com','Deal Manager','Yesterday','Active'],[4,'Priya Nair','priya@testemp.com','Ops Manager','06 May 2026','Active'],[5,'Meera Iyer','meera@testemp.com','Finance Approver','02 May 2026','Pending'],[6,'Antar Malhotra','antar@testemp.com','Employee','28 Apr 2026','Inactive']]},
  'all-leaves':{title:'Leave Requests',context:'Leave Requests',filters:['Leave Type','Status'],columns:['S.No','Key Id','Full Name','Leave Hours','From Date','To Date','Status'],rows:[
    [1,'2014','Shaun J','Full Day','14-04-2026','16-04-2026','Approved'],
    [2,'2019','Pallavi P','Half Day','18-04-2026','18-04-2026','Pending'],
    [3,'2021','Anika Shah','Full Day','20-04-2026','22-04-2026','Approved'],
    [4,'2025','Rahul Mehta','Full Day','25-04-2026','27-04-2026','Unapproved'],
    [5,'2031','Nora Kim','Half Day','28-04-2026','28-04-2026','Pending'],
    [6,'2033','Luis Martin','Full Day','02-05-2026','04-05-2026','Approved']
  ]}
};

// Payroll cycle detail - one record per row in the payroll listing.
// Figures are internally consistent: gross - deductions + employer cost = total cost,
// and gross - deductions = net payable.
const payrollRecords={
  1:{id:1,cycle:'May 2026',period:'01 May 2026 - 31 May 2026',country:'Netherlands',entity:'Dhi Hyperlocal BV',currency:'EUR',employees:41,
     grossPay:'EUR 184,200',deductions:'EUR 41,880',employerCost:'EUR 33,156',netPayable:'EUR 142,320',totalCost:'EUR 217,356',
     payDate:'28 May 2026',cutOff:'20 May 2026',payMethod:'SEPA Bank Transfer',frequency:'Monthly',
     owner:'Pallavi Parate',approver:'Finance Ops',approvedOn:'22 May 2026',status:'Active',payrollId:'PR-2026-NL-05'},
  2:{id:2,cycle:'May 2026',period:'01 May 2026 - 31 May 2026',country:'India',entity:'Dhi Hyperlocal Pvt Ltd',currency:'INR',employees:83,
     grossPay:'INR 9,840,000',deductions:'INR 1,968,000',employerCost:'INR 1,180,800',netPayable:'INR 7,872,000',totalCost:'INR 11,020,800',
     payDate:'30 May 2026',cutOff:'22 May 2026',payMethod:'NEFT Bank Transfer',frequency:'Monthly',
     owner:'Rahul Mehta',approver:'-',approvedOn:'-',status:'Pending',payrollId:'PR-2026-IN-05'},
  3:{id:3,cycle:'April 2026',period:'01 Apr 2026 - 30 Apr 2026',country:'Germany',entity:'Dhi Hyperlocal GmbH',currency:'EUR',employees:19,
     grossPay:'EUR 92,450',deductions:'EUR 22,188',employerCost:'EUR 18,027',netPayable:'EUR 70,262',totalCost:'EUR 110,477',
     payDate:'28 Apr 2026',cutOff:'20 Apr 2026',payMethod:'SEPA Bank Transfer',frequency:'Monthly',
     owner:'Neha Sharma',approver:'Finance Ops',approvedOn:'23 Apr 2026',status:'Active',payrollId:'PR-2026-DE-04'},
  4:{id:4,cycle:'April 2026',period:'01 Apr 2026 - 30 Apr 2026',country:'Spain',entity:'Dhi Hyperlocal SL',currency:'EUR',employees:22,
     grossPay:'EUR 78,110',deductions:'EUR 19,527',employerCost:'EUR 15,622',netPayable:'EUR 58,583',totalCost:'EUR 93,732',
     payDate:'29 Apr 2026',cutOff:'21 Apr 2026',payMethod:'SEPA Bank Transfer',frequency:'Monthly',
     owner:'Aman Singh',approver:'Finance Ops',approvedOn:'24 Apr 2026',status:'Active',payrollId:'PR-2026-ES-04'},
  5:{id:5,cycle:'March 2026',period:'01 Mar 2026 - 31 Mar 2026',country:'United Kingdom',entity:'Dhi Hyperlocal Ltd',currency:'GBP',employees:28,
     grossPay:'GBP 116,700',deductions:'GBP 28,008',employerCost:'GBP 16,105',netPayable:'GBP 88,692',totalCost:'GBP 132,805',
     payDate:'28 Mar 2026',cutOff:'20 Mar 2026',payMethod:'BACS Bank Transfer',frequency:'Monthly',
     owner:'Olivia Clark',approver:'Finance Ops',approvedOn:'23 Mar 2026',status:'Active',payrollId:'PR-2026-UK-03'},
  6:{id:6,cycle:'March 2026',period:'01 Mar 2026 - 31 Mar 2026',country:'Netherlands',entity:'Dhi Hyperlocal BV',currency:'EUR',employees:39,
     grossPay:'EUR 176,900',deductions:'EUR 40,687',employerCost:'EUR 31,842',netPayable:'EUR 136,213',totalCost:'EUR 208,742',
     payDate:'28 Mar 2026',cutOff:'20 Mar 2026',payMethod:'SEPA Bank Transfer',frequency:'Monthly',
     owner:'Pallavi Parate',approver:'Finance Ops',approvedOn:'22 Mar 2026',status:'Inactive',payrollId:'PR-2026-NL-03'}
};
const prLogsData={
  1:[{date:'22 May 2026',time:'11:20:00 AM',user:'Finance Ops',status:'Active',action:'Cycle approved for disbursement.'},
     {date:'20 May 2026',time:'06:00:00 PM',user:'Pallavi Parate',status:'Pending',action:'Inputs locked at cut-off.'}],
  2:[{date:'22 May 2026',time:'06:00:00 PM',user:'Rahul Mehta',status:'Pending',action:'Awaiting finance approval.'}],
  3:[{date:'23 Apr 2026',time:'10:05:00 AM',user:'Finance Ops',status:'Active',action:'Cycle approved for disbursement.'}],
  4:[{date:'24 Apr 2026',time:'09:40:00 AM',user:'Finance Ops',status:'Active',action:'Cycle approved for disbursement.'}],
  5:[{date:'23 Mar 2026',time:'02:15:00 PM',user:'Finance Ops',status:'Active',action:'Cycle approved for disbursement.'}],
  6:[{date:'30 Mar 2026',time:'05:30:00 PM',user:'Finance Ops',status:'Inactive',action:'Cycle closed and archived.'}]
};

// These three modules shipped with an empty logs:[] on every record, so their
// Logs tab always read "No activity logs yet". Entries are anchored to each
// record's own createdBy / createdAt so the log agrees with the record.
const complianceLogsData={
  1:[{date:'15 Jun 2026',time:'01:30:34 PM',user:'Pritam Rai',status:'Active',action:'Requirement created.'}],
  2:[{date:'12 Jun 2026',time:'11:05:02 AM',user:'Pritam Rai',status:'Active',action:'Requirement created.'}],
  3:[{date:'10 Jun 2026',time:'04:22:40 PM',user:'Neha Sharma',status:'Active',action:'Requirement created.'}],
  4:[{date:'08 Jun 2026',time:'09:15:11 AM',user:'Neha Sharma',status:'Active',action:'Requirement created.'}],
  5:[{date:'05 Jun 2026',time:'02:48:57 PM',user:'Aman Singh',status:'Active',action:'Requirement created.'}],
  6:[{date:'03 Jun 2026',time:'10:30:19 AM',user:'Aman Singh',status:'Active',action:'Requirement created.'}],
  7:[{date:'01 Jun 2026',time:'05:52:03 PM',user:'Pritam Rai',status:'Active',action:'Requirement created.'}],
  8:[{date:'11 Jun 2026',time:'10:15:00 AM',user:'Rahul Mehta',status:'Inactive',action:'Marked inactive.'},
     {date:'28 May 2026',time:'03:10:45 PM',user:'Rahul Mehta',status:'Active',action:'Requirement created.'}],
  9:[{date:'09 Jun 2026',time:'03:20:00 PM',user:'Rahul Mehta',status:'Inactive',action:'Marked inactive.'},
     {date:'25 May 2026',time:'12:40:22 PM',user:'Rahul Mehta',status:'Active',action:'Requirement created.'}]
};
const ratesRulesLogsData={
  1:[{date:'02 Mar 2026',time:'02:53:47 PM',user:'Tarak Swain',status:'Active',action:'Rate created.'}],
  2:[{date:'18 Mar 2026',time:'11:05:00 AM',user:'Tarak Swain',status:'Inactive',action:'Marked inactive.'},
     {date:'02 Mar 2026',time:'02:55:10 PM',user:'Tarak Swain',status:'Active',action:'Rate created.'}],
  3:[{date:'28 Feb 2026',time:'11:20:00 AM',user:'Neha Sharma',status:'Active',action:'Rate created.'}],
  4:[{date:'16 Mar 2026',time:'02:30:00 PM',user:'Neha Sharma',status:'Inactive',action:'Marked inactive.'},
     {date:'28 Feb 2026',time:'11:25:40 AM',user:'Neha Sharma',status:'Active',action:'Rate created.'}],
  5:[{date:'25 Feb 2026',time:'04:10:15 PM',user:'Aman Singh',status:'Active',action:'Rate created.'}],
  6:[{date:'12 Mar 2026',time:'09:45:00 AM',user:'Aman Singh',status:'Inactive',action:'Marked inactive.'},
     {date:'25 Feb 2026',time:'04:15:30 PM',user:'Aman Singh',status:'Active',action:'Rate created.'}],
  7:[{date:'06 Mar 2026',time:'04:50:00 PM',user:'Rahul Mehta',status:'Inactive',action:'Marked inactive.'},
     {date:'20 Feb 2026',time:'09:40:00 AM',user:'Rahul Mehta',status:'Active',action:'Rate created.'}]
};
// Newest first, and the top entry always agrees with the template's own status
// — a log that ends on a different status than the record is showing is worse
// than no log at all. Entries read as the drafting -> review -> publish ->
// revise life a contract template actually has.
const ctpLogsData={
  1:[{date:'06 Mar 2026',time:'10:15:22 AM',user:'Tarak Swain',   status:'Active',  action:'Published for Netherlands EOR proposals.'},
     {date:'04 Mar 2026',time:'03:40:10 PM',user:'Pallavi Parate',status:'Active',  action:'Legal review completed — no changes requested.'},
     {date:'02 Mar 2026',time:'02:53:47 PM',user:'Tarak Swain',   status:'Active',  action:'Template created.'}],
  2:[{date:'12 Mar 2026',time:'09:05:00 AM',user:'Neha Sharma',   status:'Active',  action:'Clause 7 updated for the 2026 statutory notice period.'},
     {date:'03 Mar 2026',time:'04:12:30 PM',user:'Tarak Swain',   status:'Active',  action:'Approved for use on all Netherlands EOR contracts.'},
     {date:'01 Mar 2026',time:'10:45:18 AM',user:'Neha Sharma',   status:'Active',  action:'Sent to legal for review.'},
     {date:'28 Feb 2026',time:'11:20:00 AM',user:'Neha Sharma',   status:'Active',  action:'Template created.'}],
  3:[{date:'14 Mar 2026',time:'01:25:00 PM',user:'Aman Singh',    status:'Inactive',action:'Marked inactive — superseded by the India PEO v2 draft.'},
     {date:'08 Mar 2026',time:'12:30:44 PM',user:'Pallavi Parate',status:'Active',  action:'Legal flagged the gratuity clause for rework.'},
     {date:'25 Feb 2026',time:'04:10:15 PM',user:'Aman Singh',    status:'Active',  action:'Template created.'}],
  4:[{date:'05 Mar 2026',time:'02:20:05 PM',user:'Rahul Mehta',   status:'Active',  action:'Works council wording added to section 4.'},
     {date:'24 Feb 2026',time:'11:00:00 AM',user:'Neha Sharma',   status:'Active',  action:'Approved for German direct hires.'},
     {date:'20 Feb 2026',time:'09:40:00 AM',user:'Rahul Mehta',   status:'Active',  action:'Template created.'}]
};
// Payroll workflow - ends on each cycle's real status.
const prWorkflowData={
  1:[{title:'Approved for Disbursement',user:'Finance Ops',date:'22 May 2026',time:'11:20:00 AM',description:'May 2026 Netherlands cycle approved. Payment scheduled for 28 May 2026.'},
     {title:'Inputs Locked',user:'Pallavi Parate',date:'20 May 2026',time:'06:00:00 PM',description:'Attendance and variable inputs locked at cut-off for 41 employees.'},
     {title:'Cycle Opened',user:'System',date:'01 May 2026',time:'09:00:00 AM',description:'Monthly payroll cycle opened for Dhi Hyperlocal BV.'}],
  2:[{title:'Awaiting Approval',user:'Rahul Mehta',date:'22 May 2026',time:'06:00:00 PM',description:'INR 9,840,000 gross submitted to Finance Ops for approval.'},
     {title:'Inputs Locked',user:'Rahul Mehta',date:'22 May 2026',time:'05:00:00 PM',description:'Inputs locked at cut-off for 83 employees.'},
     {title:'Cycle Opened',user:'System',date:'01 May 2026',time:'09:00:00 AM',description:'Monthly payroll cycle opened for Dhi Hyperlocal Pvt Ltd.'}],
  3:[{title:'Approved for Disbursement',user:'Finance Ops',date:'23 Apr 2026',time:'10:05:00 AM',description:'April 2026 Germany cycle approved. Payment scheduled for 28 Apr 2026.'},
     {title:'Inputs Locked',user:'Neha Sharma',date:'20 Apr 2026',time:'06:00:00 PM',description:'Inputs locked at cut-off for 19 employees.'},
     {title:'Cycle Opened',user:'System',date:'01 Apr 2026',time:'09:00:00 AM',description:'Monthly payroll cycle opened for Dhi Hyperlocal GmbH.'}],
  4:[{title:'Approved for Disbursement',user:'Finance Ops',date:'24 Apr 2026',time:'09:40:00 AM',description:'April 2026 Spain cycle approved. Payment scheduled for 29 Apr 2026.'},
     {title:'Inputs Locked',user:'Aman Singh',date:'21 Apr 2026',time:'06:00:00 PM',description:'Inputs locked at cut-off for 22 employees.'},
     {title:'Cycle Opened',user:'System',date:'01 Apr 2026',time:'09:00:00 AM',description:'Monthly payroll cycle opened for Dhi Hyperlocal SL.'}],
  5:[{title:'Approved for Disbursement',user:'Finance Ops',date:'23 Mar 2026',time:'02:15:00 PM',description:'March 2026 UK cycle approved. Payment scheduled for 28 Mar 2026.'},
     {title:'Inputs Locked',user:'Olivia Clark',date:'20 Mar 2026',time:'06:00:00 PM',description:'Inputs locked at cut-off for 28 employees.'},
     {title:'Cycle Opened',user:'System',date:'01 Mar 2026',time:'09:00:00 AM',description:'Monthly payroll cycle opened for Dhi Hyperlocal Ltd.'}],
  6:[{title:'Cycle Closed',user:'Finance Ops',date:'30 Mar 2026',time:'05:30:00 PM',description:'March 2026 Netherlands cycle closed and archived after disbursement.'},
     {title:'Payment Disbursed',user:'Finance Ops',date:'28 Mar 2026',time:'11:00:00 AM',description:'EUR 136,213 net disbursed to 39 employees via SEPA.'},
     {title:'Cycle Opened',user:'System',date:'01 Mar 2026',time:'09:00:00 AM',description:'Monthly payroll cycle opened for Dhi Hyperlocal BV.'}]
};
let prSelectedId=null,prTab='basic-details';
function openPrSidebar(id){
  if(String(prSelectedId)===String(id)){closePrSidebar();return;}  // clicking the open row closes it again
  prTab=sbKeepTab(prSelectedId,prTab);prSelectedId=id;
  const sb=document.getElementById('pr-split-sb');if(sb)sb.classList.add('open');
  /* isbTab() rather than a wholesale innerHTML write: moving from one cycle to
     the next is the same panel showing a different record, so only the body
     needs replacing. The tab strip stays put instead of being rebuilt and
     re-animated under the pointer. It falls back to a full rebuild on its own
     when the panel is opening from empty. */
  isbTab('pr',renderPrSidebar);
  markPrSelectedRow();
}
function closePrSidebar(){
  prSelectedId=null;
  const sb=document.getElementById('pr-split-sb');if(sb)sb.classList.remove('open');
  markPrSelectedRow();
}
// Same hand-marking the generic listing does (markLstSelectedRow): payroll used
// to skip it, so a clicked row got no grey fill or orange rail and the browser's
// own blue selection was the only feedback. Now it reads like every other table.
function markPrSelectedRow(){
  const rows=document.querySelectorAll('#adt-content tr.lp-row[data-row-id]');
  rows.forEach(function(r){
    r.classList.toggle('lp-row-selected',prSelectedId!=null&&r.dataset.rowId===String(prSelectedId));
  });
}
function navPrTab(tab){prTab=tab;isbTab('pr',renderPrSidebar);}
/* Pay Runs shipped with a Logs tab that could only be read. Every other module
   in the app also lets you POST one - pick the status the record is moving to,
   say why - so this is the same form on the same helpers, not a new mechanism.
   Clearing the two fields is all Cancel means here: the panel stays open. */
function prCancelLog(){
  csClear('pr-log-status-sel');
  const inp=document.getElementById('pr-log-comment-inp');if(inp)inp.value='';
}
function prSaveLog(id){
  const r=payrollRecords[id];if(!r)return;
  const was=r.status;
  if(!lpCommitLog(r,'pr-log-status-sel','pr-log-comment-inp',prLogsData[id]))return;
  /* The listing draws its Status column from supportPageMeta.payroll.rows,
     which is a different object than the record - leaving it alone would show
     a row badge and a set of counters that disagree with the log just written. */
  const meta=getPageMeta('payroll');
  const si=(meta.columns||[]).findIndex(function(c){return c==='Status'||c==='status';});
  const row=(meta.rows||[]).find(function(x){return String(x[0])===String(id);});
  if(row&&si>=0)row[si]=r.status;
  renderADTPage();
  showToast('Log added','success',r.status!==was
    ? r.cycle+' '+r.country+' moved to '+r.status+'.'
    : 'Comment saved to '+r.cycle+' '+r.country+'.');
}

// ── GENERIC LISTING SIDEBAR ──
// Payroll and Company Settings each own a hand-built detail panel. Every other
// listing (Payheads, Users, People, Teams, Contracts, Payments, Support…)
// shares this one, so its action button behaves exactly like theirs instead of
// being a dead control. The panel is generated from the page's own columns,
// which is why a listing gets a correct one without a bespoke renderer.
let lstSelectedPg=null,lstSelectedId=null,lstTab='basic-details';
function openLstSidebar(pg,id){
  if(lstSelectedId!=null&&String(lstSelectedId)!==String(id)&&sbLeaveGuard('lst',function(){openLstSidebar(pg,id);}))return;
  const same=lstSelectedPg===pg&&String(lstSelectedId)===String(id);
  if(same){closeLstSidebar();return;}   // clicking the open row closes it again
  lstTab=lstSelectedPg===pg?sbKeepTab(lstSelectedId,lstTab):'basic-details';lstSelectedPg=pg;lstSelectedId=id;
  const sb=document.getElementById('lst-split-sb');if(sb)sb.classList.add('open');
  markLstSelectedRow();
  refreshLstSidebar();
}
function closeLstSidebar(){if(sbLeaveGuard('lst',closeLstSidebar))return;sbEditing=null;
  lstSelectedPg=null;lstSelectedId=null;
  const sb=document.getElementById('lst-split-sb');if(sb)sb.classList.remove('open');
  markLstSelectedRow();
}
function navLstTab(tab){if(!sbHasDraft('lst'))sbEditing=null;lstTab=tab;isbTab('lst',renderLstSidebar);}
/* A different record is the same panel showing different values, so this goes
   through isbTab() too: the tab strip is left alone and only .lp-isb-body is
   replaced. isbTab falls back to the wholesale rebuild by itself whenever the
   tab set actually differs, or when the panel is opening from empty. */
function refreshLstSidebar(){
  const inner=document.getElementById('lst-isb-inner');if(!inner)return;
  if(lstSelectedId==null){inner.innerHTML='';return;}
  isbTab('lst',renderLstSidebar);
}
// Highlight the row the panel is describing. Done by hand rather than through a
// re-render so the open/close width transition is not thrown away mid-flight.
function markLstSelectedRow(){
  const rows=document.querySelectorAll('#adt-content tr.lp-row[data-row-id]');
  rows.forEach(function(r){
    r.classList.toggle('lp-row-selected',lstSelectedId!=null&&r.dataset.rowId===String(lstSelectedId));
  });
}
// The row the sidebar is currently describing, or null once it is filtered away.
function getLstSelectedRow(){
  if(lstSelectedPg==null||lstSelectedId==null)return null;
  return (getListingRows(lstSelectedPg)||[]).find(function(r){return String(r[0])===String(lstSelectedId);})||null;
}
// Per-record log trail, seeded from the row on first open so the history a user
// adds survives tab switches and status changes for the rest of the session.
const lstLogsStore={};
function lstRowStatus(row){
  const cols=(getPageMeta(lstSelectedPg).columns)||[];
  const i=cols.findIndex(function(c){return c==='Status'||c==='status';});
  return row&&i>=0?String(row[i]):'';
}
function getLstLogs(){
  const key=lstSelectedPg+':'+lstSelectedId;
  if(!lstLogsStore[key]){
    const st=lstRowStatus(getLstSelectedRow())||'Active';
    lstLogsStore[key]=[
      {date:'22 Apr 2026',time:'05:44:07 PM',user:'Shaun Mathew',   status:st,       action:'Reviewed — current status confirmed.'},
      {date:'14 Apr 2026',time:'11:28:08 PM',user:'Pallavi Parate',status:'Pending',action:'Submitted for review.'},
      {date:'10 Apr 2026',time:'09:00:00 AM',user:'System',        status:'Active', action:'Record created.'}
    ];
  }
  return lstLogsStore[key];
}
function lstSaveLog(){
  const sel=csTrigger('lst-log-status-sel');
  const inp=document.getElementById('lst-log-comment-inp');
  if(!sel||!inp)return;
  const status=getCSValue('lst-log-status-sel'),comment=inp.value.trim();
  if(!status){sel.style.borderColor='#b83a3a';setTimeout(function(){sel.style.borderColor='';},1500);return;}
  if(!comment){inp.style.borderColor='#b83a3a';setTimeout(function(){inp.style.borderColor='';},1500);return;}
  const now=new Date();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr=now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear();
  const h=now.getHours(),mm=now.getMinutes(),ss=now.getSeconds();
  const timeStr=(h%12||12)+':'+(mm<10?'0'+mm:mm)+':'+(ss<10?'0'+ss:ss)+' '+(h>=12?'PM':'AM');
  getLstLogs().unshift({date:dateStr,time:timeStr,user:'Pallavi Parate',status:status,action:comment});
  // Reflect the new status on the record itself, so the row badge and the
  // Active/Inactive/Pending counters above the table agree with the log.
  const row=getLstSelectedRow(),meta=getPageMeta(lstSelectedPg);
  const si=(meta.columns||[]).findIndex(function(c){return c==='Status'||c==='status';});
  if(row&&si>=0)row[si]=status;
  const tbl=document.querySelector('#adt-content tr.lp-row[data-row-id="'+lstSelectedId+'"]');
  if(tbl){
    const cell=tbl.children[si];
    if(cell)cell.innerHTML='<span class="lp-status-badge '+statusClass(status)+'">'+status+'</span>';
  }
  refreshLstSidebar();
  showToast('Log added','success','Comment saved with status "'+status+'".');
}
// ── Record log helpers ────────────────────────────────────────────────────
// A record's history starts life in a module fixture (ctpLogsData and friends)
// and is copied onto the record the first time it is read. Panels used to read
// `fixture[id] || rec.logs`, which meant the fixture always won and every
// comment the user submitted was written to rec.logs and never shown again.
// Seeding once and then reading only rec.logs keeps additions visible.
function seedLogs(rec,fixture){
  if(!rec.logs||!rec.logs.length){
    rec.logs=(fixture||[]).map(function(l){
      return {date:l.date,time:l.time,user:l.user,status:l.status,action:l.action};
    });
  }
  return rec.logs;
}
// Every log form in the app is "pick the new status, say why". This renders the
// status half; the comment box and buttons stay with the caller because the
// panels differ on Save vs Cancel/Submit.
/* THE APP'S OWN DROPDOWN, not a native <select>. Every one of these panels
   used to render a real <select>, which meant the operating system drew the
   option list: a blue highlight bar and system fonts inside a modal that
   styles everything else itself. apCS() is the control the filter bars and
   the creation forms use, so the log forms now look like the rest of the app.
   Callers read it with getCSValue(id) and flash csTrigger(id).

   `hook` is the name of a global function for panels where picking a status
   changes what else the form shows — the employee lifecycle swaps in that
   status's checklist. apCS calls it with (value, id). */
function lpLogStatusField(id,current,opts,hook){
  return '<div class="lp-logs-form-label">Status <span class="lp-logs-form-req">*</span></div>'
    +apCS(id,opts||[],current||'','Select Status',hook);
}
// Validate, stamp, record, and move the record onto the status that was chosen.
// Returns false when the form is incomplete so the caller can stop.
function lpCommitLog(rec,statusSelId,commentInpId,fixture){
  const sel=csTrigger(statusSelId);
  const inp=document.getElementById(commentInpId);
  const status=getCSValue(statusSelId);
  const comment=inp?inp.value.trim():'';
  const flash=function(el){if(el){el.style.borderColor='#b83a3a';setTimeout(function(){el.style.borderColor='';},1500);}};
  if(!status){flash(sel);return false;}
  if(!comment){flash(inp);return false;}
  const s=stampNow();
  seedLogs(rec,fixture).unshift({date:s.date,time:s.time,user:CURRENT_USER,status:status,action:comment});
  rec.status=status;
  return true;
}

// ── Timestamps and history ────────────────────────────────────────────────
// One clock for every log and timeline entry, in the format the fixtures
// already use ("18 Jun 2026" / "04:40:00 PM"), so entries the user adds sit
// in the same list as the seeded ones without looking foreign.
/* The signed-in person (js/identity.js): their name, for logs people read,
   and their User ID, for records that must say exactly who acted. Switch
   Role never changes either (js/ems-access.js emsSyncIdentity). */
let CURRENT_USER='Shaun Mathew';
let CURRENT_USER_ID='';
/* The signed-in user's role. Company Settings → Roles & Access shows the same
   value for this user, and the permission gates read it, so the two cannot
   drift apart. */
const CURRENT_USER_ROLE='Entity Super Admin';
/* Dashboard headers greet the person instead of naming the dashboard. The tab
   strip above already says which dashboard this is, so a heading reading
   "Employee Dashboard" repeated it and told the user nothing. Each header is:
     [data-dash-date]    today's date, small, above      - from the clock,
                         never typed: a date in a template is wrong tomorrow
     [data-dash-greet]   "Good afternoon, Meera"         - time of day + name
     .hr-header-desc     what this view covers for them
   The Employee Dashboard greets the employee it belongs to (empSelfRec);
   every other view greets the signed-in user. Run again on each tab switch so
   a tab left open over lunch does not still say good morning. */
function dashGreeting(){
  const h=new Date().getHours();
  return h<5?'Good evening':h<12?'Good morning':h<17?'Good afternoon':'Good evening';
}
function fillDashHeaders(){
  const date=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.querySelectorAll('[data-dash-date]').forEach(function(el){el.textContent=date;});
  const self=typeof empSelfRec==='function'?empSelfRec():null;
  document.querySelectorAll('[data-dash-greet]').forEach(function(el){
    const who=(el.closest('#employee-view')&&self?self.name:CURRENT_USER)||'';
    el.textContent=dashGreeting()+(who?', '+who.split(' ')[0]:'');
  });
}
document.addEventListener('DOMContentLoaded',fillDashHeaders);

function stampNow(){
  const now=new Date();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h=now.getHours();const ampm=h>=12?'PM':'AM';h=h%12||12;
  const p=function(n){return n<10?'0'+n:''+n;};
  return {
    date:now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear(),
    time:p(h)+':'+p(now.getMinutes())+':'+p(now.getSeconds())+' '+ampm
  };
}
// Prepend a real entry to a record's Workflow timeline. These maps are keyed
// by record id and read newest-first, hence unshift. Creating the array when
// a record has no history yet is deliberate: a ticket raised in this session
// still deserves a timeline.
function wfPush(map,id,title,description,user){
  if(!map)return;
  const s=stampNow();
  if(!map[id])map[id]=[];
  map[id].unshift({title:title,user:user||CURRENT_USER,date:s.date,time:s.time,description:description});
}
// Append to a record's Logs tab without moving its status. lpCommitLog() is
// the form version of this (status + comment together); this is for the
// inline actions, which already know the status they are moving to.
/* == WHAT A STATUS ON A LOG ENTRY ACTUALLY MEANS =============================

   Every entry carries the status the record was IN when that entry was written
   - not a status change. Most entries are not changes at all: a template gets
     sent to legal, reviewed, published, amended, and it is Active throughout.
   The timeline printed that status as the headline of every card, so four
   ordinary edits read as "changed to Active" four times over, which is not a
   history any record could actually have - a record goes Active, then
   Inactive; it does not go Active again and again.

   So the headline is now the status only where the status MOVED. Everything
   else is headed "Updated" in neutral grey, and the comment underneath - which
   was always the real content of the entry - says what happened. Nothing about
   the stored logs changed; only the claim the timeline was making about them.

   LISTS ARE NEWEST FIRST, so the entry that came BEFORE this one in time is
   list[i+1], not list[i-1]. The oldest entry always counts as a change: it is
   the one that put the record in its first status. */
function logIsChange(list,i){
  if(!list||!list[i])return true;
  const older=list[i+1];
  return !older||older.status!==list[i].status;
}
/* The avatar ring and the dot follow the headline: coloured on a real move,
   grey on an ordinary update. */
function logDotKey(list,i,key){return logIsChange(list,i)?key:'event';}
function logHeadRow(list,i,key,label){
  const k=logIsChange(list,i)?key:'event';
  const text=logIsChange(list,i)?label:'Updated';
  return '<div class="lp-log-status-row"><span class="lp-log-dot lp-log-dot--'+k+'"></span>'
    +'<span class="lp-log-status-text lp-log-status-text--'+k+'">'+text+'</span></div>';
}
function logPush(rec,fixture,status,comment,user){
  const s=stampNow();
  seedLogs(rec,fixture).unshift({date:s.date,time:s.time,user:user||CURRENT_USER,status:status,action:comment});
}

function getPageMeta(pg){if(pg==='cfg-overview')return{title:'Overview',context:'Configure',filters:[],columns:[],rows:[]};if(pg==='cfg-systems')return{title:'Systems',context:'Configure',filters:[],columns:[],rows:[]};if(pg==='cfg-system-detail'){const s=cfgSystems.find(x=>x.id===selectedCfgSystemId);return{title:s?s.name:'System',context:'Configure',filters:[],columns:[],rows:[]};}if(pg==='cfg-system-add')return{title:'Add Custom System',context:'Configure',filters:[],columns:[],rows:[]};if(pg==='cfg-data-foundation')return{title:'Data Foundation',context:'Configure',filters:[],columns:[],rows:[]};if(pg==='cfg-model-detail'){const m=cfgModels.find(x=>x.id===selectedCfgModelId);return{title:m?m.name:'Model',context:'Configure',filters:[],columns:[],rows:[]};}if(pg==='cfg-model-add')return{title:'New Model',context:'Configure',filters:[],columns:[],rows:[]};if(pg==='cfg-context-journey')return{title:'Context & Journey',context:'Configure',filters:[],columns:[],rows:[]};if(pg==='cfg-journey-detail'){const j=cfgJourneys.find(x=>x.id===selectedCfgJourneyId);return{title:j?j.name:'Journey',context:'Configure',filters:[],columns:[],rows:[]};}if(pg==='cfg-agents')return{title:'Agents',context:'Configure',filters:[],columns:[],rows:[]};if(pg==='ai-executive')return{title:'AI Executive',context:'AI Executive',filters:[],columns:[],rows:[]};if(pg==='ai-journey-detail'){const j=aiJourneys.find(x=>x.id===selectedAIJourneyId);return{title:j?j.name:'Journey Detail',context:'AI Executive',filters:[],columns:[],rows:[]};}if(pg==='ai-automate-form'){const j=aiJourneys.find(x=>x.id===selectedAIJourneyId);return{title:'Automate Journey',context:j?j.name:'AI Executive',filters:[],columns:[],rows:[]};}if(pg==='ai-contract-assistant')return{title:'AI Contract Assistant',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='ai-proposal-created')return{title:'Proposal Created',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='ai-proposal-waiting-approval')return{title:'Waiting for Approval',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='contract-eor'||pg==='contract-peo'||pg==='contract-type-select')return{title:'Create a Contract',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='contract-immigration')return{title:'New Immigration Request',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='contract-contractor')return{title:'New Contractor Request',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='ai-employee-created')return{title:'Employee Created',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='ai-contract-document')return{title:'Contract Document',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='ai-contract-waiting-approval')return{title:'Waiting for Approval',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='ai-onboarding-run')return{title:'Onboarding',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='ai-journey-complete')return{title:'Journey Complete',context:'Contracts',filters:[],columns:[],rows:[]};if(pg==='ai-active-automation'){const j=aiJourneys.find(x=>x.id===selectedAIJourneyId);return{title:j?j.name+' Automation':'Active Automation',context:'AI Executive',filters:[],columns:[],rows:[]};}if(pg==='ai-run-detail')return{title:'Run '+selectedAIRunId,context:'AI Executive',filters:[],columns:[],rows:[]};if(pg==='ai-journey-run'){const flow=aiRunFlows[aiRunFlowJourneyId];return{title:flow?flow.entryLabel:'AI Executive',context:'AI Executive',filters:[],columns:[],rows:[]};}if(pg==='cost-calculator')return{title:'Cost Calculator',context:'Cost Calculator',filters:[],columns:[],rows:[]};if(pg==='announcements')return{title:'Announcements',context:'Announcements',filters:[],columns:[],rows:[]};if(pg==='holidays')return{title:'Holidays',context:'Holidays',filters:[],columns:[],rows:[]};if(pg==='leave-balance')return{title:'Leave Balance',context:'Leave Balance',filters:[],columns:[],rows:[]};if(pg==='leave-policies')return{title:'Leave Policies',context:'Leave Policies',filters:[],columns:[],rows:[]};if(pg==='leave-policy-edit')return{title:'Edit Leave Policy',context:'Leave Policy',filters:[],columns:[],rows:[]};if(pg==='team-add')return{title:'Create New Team',context:'Teams',filters:[],columns:[],rows:[]};if(pg==='employee-add')return{title:'Create New Employee',context:'Employees',filters:[],columns:[],rows:[]};if(pg==='employees')return{title:'Employees',context:'Employees',filters:[],columns:[],rows:[]};if(pg==='direct')return{title:'Direct Employee',context:'Direct Employee',filters:[],columns:[],rows:[]};if(pg==='global')return{title:'Global Employee',context:'Global Employee',filters:[],columns:[],rows:[]};if(pg==='timesheet')return{title:'Timesheets',context:'Timesheet',filters:[],columns:[],rows:[]};if(pg==='my-timesheet')return{title:'My Timesheet',context:'My Timesheet',filters:[],columns:[],rows:[]};if(pg==='all-timesheet')return{title:'All Timesheet',context:'All Timesheet',filters:[],columns:[],rows:[]};if(pg==='at-timesheet-view')return{title:(atViewedEmp?atViewedEmp.name+' — Timesheet':'Timesheet'),context:'All Timesheet',filters:[],columns:[],rows:[]};if(pg==='my-profile')return{title:'My Profile',context:'My Profile',filters:[],columns:[],rows:[]};if(pg==='support-tickets')return{title:'Tickets',context:'Tickets',filters:[],columns:[],rows:[]};if(pg==='chats')return{title:'Chats',context:'Chats',filters:[],columns:[],rows:[]};if(pg==='switch-entity')return{title:'Switch Entity',context:'Switch Entity',filters:[],columns:[],rows:[]};if(pg==='compliance')return{title:'Compliance Item',context:'Compliance Item',filters:[],columns:[],rows:[]};if(pg==='rates-rules')return{title:'Rates & Rules',context:'Rates & Rules',filters:[],columns:[],rows:[]};if(pg==='payheads')return{title:'Payheads',context:'Payheads',filters:[],columns:[],rows:[]};if(pg==='contract-templates')return{title:'Contract Templates',context:'Contract Templates',filters:[],columns:[],rows:[]};return supportPageMeta[pg]||supportPageMeta.dashboard;}
function getPageTitle(pg){
  /* Inside one type's listing the header names that type, so "Contracts"
     only ever means the mixed list or the type cards. */
  if(pg==='contracts'&&!ctLandingOpen&&ctTypeFilter!==CT_TYPE_ALL&&CT_TYPES[ctTypeFilter])return CT_TYPES[ctTypeFilter].label+' Contracts';
  if(pg==='contract-eor'||pg==='contract-peo')return 'New '+(pg==='contract-peo'?'PEO':'EOR')+' Contract';
  if(pg==='apply-application')return 'Apply Application';
  return getPageMeta(pg).title;
}
function statusClass(v){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-');}
// Detail panels (the ones the action button opens) state the record's own status
// as coloured text — see .sb-status. The pill form stays on table cells and on
// lists of *other* records. One tone map so every panel in the app agrees.
const SB_STATUS_TONE={
  // ok — reached a good terminal state
  active:'ok',approved:'ok',completed:'ok',complete:'ok',resolved:'ok',paid:'ok',signed:'ok',connected:'ok',verified:'ok',success:'ok',present:'ok',ready:'ok',
  'quotation-approved':'ok','proposal-approved':'ok','contract-approved':'ok',
  // bad — stopped, refused or broken
  inactive:'bad',unapproved:'bad',rejected:'bad','expiring-soon':'bad',blocked:'bad',failed:'bad',expired:'bad',terminated:'bad',cancelled:'bad',canceled:'bad',overdue:'bad',
  disconnected:'bad',exception:'bad',absent:'bad',escalated:'bad',
  // wait — in flight, someone owes an action
  pending:'wait','follow-up':'wait',draft:'wait',submitted:'wait','in-progress':'wait','on-hold':'wait','under-review':'wait','pending-review':'wait','needs-review':'wait','waiting-client':'wait','waiting-csm':'wait','waiting-for-client':'wait','waiting-for-csm':'wait',
  'proposal-sent':'wait','contract-sent':'wait','waiting-for-approval':'wait','pending-onboarding':'wait',onboarding:'wait',inprog:'wait',unfilled:'wait',unpaid:'wait',
  // info — informational, nothing owed
  open:'info','awaiting-upload':'info','new':'info',scheduled:'info',created:'info',updated:'info',
  // idle — neutral / archived
  closed:'idle',archived:'idle',
  // pipeline end states
  'ready-for-payroll':'ok','ready-for-payroll ':'ok',
  // Immigration / Contractor stages. 'pending-onboarding' and 'active' are
  // already covered above and mean the same thing here.
  'pending-kickoff':'wait','ready-for-filing':'wait','filed':'ok',
  // Admin Access: asset lifecycle and condition, and IT access. Assigned is the
  // asset's working state (like Active); Available is stock on the shelf.
  assigned:'ok',available:'info','in-repair':'wait',returned:'idle',revoked:'bad',
  good:'ok',fair:'wait',poor:'bad',damaged:'bad',
  lost:'bad',retired:'idle',disposed:'idle','under-repair':'wait',scrap:'bad'
};
// Contract pipeline stages get their own ordered palette so a deal's
// position is readable at a glance. Anything not listed here falls back to
// its SB_STATUS_TONE colour, so other modules are unaffected.
const CT_PIPELINE_STEP={
  submitted:1,'quotation-approved':2,'proposal-sent':3,'proposal-approved':4,
  'contract-sent':5,'contract-approved':6,onboarding:7,'ready-for-payroll':8
};
function statusTone(v){return SB_STATUS_TONE[statusClass(v)]||'idle';}
/* Modules add their own statuses' tones without recolouring a status another
   module already owns (Cancelled, Escalated...). */
function sbToneAdd(o){Object.keys(o).forEach(function(k){if(!(k in SB_STATUS_TONE))SB_STATUS_TONE[k]=o[k];});}
// `label` is for stores that key a status ('waiting_client') apart from how it
// reads ('Waiting for Client'); the tone is always taken from the raw value.
function sbStatus(v,label){
  const text=label!=null?label:(v==null||v===''?'-':String(v));
  return '<span class="sb-status '+statusTone(v)+'">'+text+'</span>';
}
/* ── THE DETAIL PANEL HEADER ────────────────────────────────────────────────
   One header for the details tab of every action-sidebar: an icon tile, the
   record's name, a line of what identifies it, its status, and Edit - so the
   panel says WHAT this is before the grid of fields under it. Built once here
   (styles: .sb-hero in leaves.css) so no module grows its own version again.
     o.icon   svg markup (or o.img, an image URL)
     o.name   the record's name
     o.meta   array of short identifiers, joined with dots; empties dropped
     o.status markup on the right (sbHeroBadge for a status pill)
     o.edit   the module's Edit button markup, or o.onEdit, an onclick string */
const SB_PEN='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
/* While the form is open the header keeps its place and says so, in the slot
   the Edit button held. */
const SB_EDITING_TAG='<span class="sb-hero-editing">'+SB_PEN+' Editing</span>';
function sbEditBtn(onclick){return '<button class="lp-sb-view-edit-btn"'+(onclick?' onclick="'+onclick+'"':'')+'>'+SB_PEN+' Edit</button>';}
function sbHeroBadge(status){return status?'<span class="lp-status-badge tone-'+statusTone(status)+'">'+status+'</span>':'';}
function sbHero(o){
  const meta=(o.meta||[]).filter(function(x){return x!=null&&x!==''&&x!=='--';});
  return '<div class="sb-hero">'
    +(o.img?'<img class="sb-hero-img" src="'+o.img+'" alt="">':'<div class="sb-hero-ico">'+(o.icon||'')+'</div>')
    +'<div class="sb-hero-txt"><div class="sb-hero-name">'+o.name+'</div>'
      +(meta.length?'<div class="sb-hero-meta">'+meta.join('<span class="sb-dot">•</span>')+'</div>':'')+'</div>'
    +'<div class="sb-hero-right">'+(o.status||'')
      +(o.editing?SB_EDITING_TAG:(o.edit||(o.onEdit?sbEditBtn(o.onEdit):'')))+'</div>'
    +'</div>';
}
function titleForAdd(pg){return pg==='dashboard'?'Dashboard':getPageTitle(pg);}
function getSidebarActivePage(pg){if(pg==='cfg-journey-detail')return 'cfg-context-journey';if(pg==='cfg-system-detail'||pg==='cfg-system-add')return 'cfg-systems';if(pg==='cfg-model-detail'||pg==='cfg-model-add')return 'cfg-data-foundation';if(pg==='team-add')return 'teams';if(pg==='employee-add')return 'employees';if(pg==='direct'||pg==='global')return 'employees';if(pg==='at-timesheet-view'||pg==='my-timesheet'||pg==='all-timesheet')return 'timesheet';if(pg==='leave-policy-edit')return 'leave-policies';if(pg==='ai-journey-detail'||pg==='ai-automate-form'||pg==='ai-active-automation'||pg==='ai-run-detail'||pg==='ai-journey-run')return 'ai-executive';if(pg==='ai-contract-assistant'||pg==='ai-proposal-created'||pg==='ai-proposal-waiting-approval'||pg==='contract-type-select'||pg==='contract-eor'||pg==='contract-peo'||pg==='contract-immigration'||pg==='contract-contractor'||pg==='ai-employee-created'||pg==='ai-contract-document'||pg==='ai-contract-waiting-approval'||pg==='ai-onboarding-run'||pg==='ai-journey-complete')return 'contracts';return pg;}

function attrSafe(v){return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
function customSelect(id,selected,options,placeholder,variant){
  const safeId=String(id).replace(/[^a-zA-Z0-9_-]/g,'-');
  const opts=(options||[]).map(o=>String(o));
  const current=selected||placeholder||opts[0]||'Select';
  const optHtml=opts.map(o=>`<button type="button" class="custom-select-option ${o===current?'selected':''}" data-value="${attrSafe(o)}" onclick="selectCustomOption(event,this)"><span class="custom-select-text">${o}</span><svg class="custom-select-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>`).join('');
  const muted=current===(placeholder||'');
  return `<div class="custom-select ${variant||''}" id="${safeId}" data-value="${attrSafe(current)}"><button type="button" class="custom-select-trigger" onclick="toggleCustomSelect(event,'${safeId}')"><span class="${muted?'placeholder':''}">${current}</span><svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg></button><div class="custom-select-menu">${optHtml}</div></div>`;
}
/* A muted second line under named options of either dropdown (apCS's
   .cs-option or customSelect's .custom-select-option) — "Biweekly / Every 14
   days". Only the option row changes: both controls write the option's own
   value back to the field, so the description never ends up in it.
   hints: {optionValue: 'description'} */
function csWithHints(html,hints){
  Object.keys(hints||{}).forEach(function(k){
    const d='<small class="cs-opt-hint">'+hints[k]+'</small>';
    html=html.replace('<span>'+k+'</span>','<span class="cs-opt-col">'+k+d+'</span>')
      .replace('<span class="custom-select-text">'+k+'</span>','<span class="cs-opt-col"><span class="custom-select-text">'+k+'</span>'+d+'</span>');
  });
  return html;
}
function closeCustomSelects(exceptId){document.querySelectorAll('.custom-select.open').forEach(s=>{if(!exceptId||s.id!==exceptId)s.classList.remove('open');});}
function toggleCustomSelect(event,id){
  event.stopPropagation();
  const root=document.getElementById(id);if(!root)return;
  const open=root.classList.contains('open');
  closeCustomSelects(id);
  root.classList.toggle('open',!open);
  if(!open){
    const trigger=root.querySelector('.custom-select-trigger');
    const menu=root.querySelector('.custom-select-menu');
    // Left-aligned and trigger-width, because a select's list belongs directly
    // under its field. Everything else is the shared rule.
    if(trigger&&menu)
      placeAnchoredMenu(menu,trigger.getBoundingClientRect(),
        {alignLeft:true,width:trigger.getBoundingClientRect().width});
  }
}
/* ── ANCHORED MENU PLACEMENT ───────────────────────────────────────────────
   Every popup in this app is position:fixed, because they open inside
   overflow:auto containers (table cards, the detail panel) that would clip an
   absolutely-positioned one. Fixed means the app has to place them itself, and
   three copies of that arithmetic had grown — on the contracts row menu, the
   payments row menu, and the custom select — all with the SAME defect:

       if (it fits below) place below; else place above;

   "Else place above" is not a fallback, it is a guess. An eight-step contract
   menu is ~300px tall, so on a row near the top of the viewport neither side
   fits — and the code flipped it upward anyway, running the first two steps
   off the top of the screen where they could not be read or clicked.

   The rule here is: below if it fits, above if THAT fits, otherwise the
   roomier of the two with the height capped so the menu scrolls instead of
   leaving the viewport. Horizontally the right edges align, then the whole
   thing is clamped inside the window, so a menu on the last column can never
   hang off the side either.                                                 */
var MENU_GAP=6, MENU_EDGE=10;
/* The viewport is not the boundary — the CONTENT AREA is. A row menu that
   climbs over the top bar covers the account switcher and reads as a stray
   panel that belongs to nothing. The ceiling is therefore the bottom of the
   topbar, measured rather than hard-coded so it survives the bar changing
   height. */
/* WHERE position:fixed ACTUALLY RESOLVES FROM.
   Not always the viewport. Any ancestor with a transform, filter, perspective,
   will-change or containment becomes the containing block for its fixed
   descendants — so the top/left this function computes in viewport coordinates
   would land the menu offset by that ancestor's own position, and the
   ancestor's overflow would clip it as well.

   That is exactly what happens in a modal: .ct-modal animates in with
   `m-modal-in`, whose keyframes carry a transform, and the animation is
   declared `both` so it keeps applying after it finishes. A dropdown opened
   inside one was being placed relative to the modal while being measured
   against the window.

   Rather than depend on which properties a given browser treats as creating
   the containing block, this walks up and asks. No transformed ancestor →
   {0,0} and the arithmetic is unchanged. */
function fixedOrigin(el){
  for(var p=el&&el.parentElement;p&&p!==document.documentElement;p=p.parentElement){
    var cs=window.getComputedStyle(p);
    if((cs.transform&&cs.transform!=='none')||
       (cs.perspective&&cs.perspective!=='none')||
       (cs.filter&&cs.filter!=='none')||
       /transform|perspective|filter/.test(cs.willChange||'')||
       /paint|layout|strict|content/.test(cs.contain||'')){
      var r=p.getBoundingClientRect();
      return {x:r.left,y:r.top};
    }
  }
  return {x:0,y:0};
}
function menuBounds(){
  var top=MENU_EDGE;
  var bar=document.querySelector('.topbar');
  if(bar){
    var r=bar.getBoundingClientRect();
    if(r.height&&r.bottom>0)top=r.bottom+MENU_GAP;
  }
  return {top:top,bottom:window.innerHeight-MENU_EDGE};
}
/* A row's Action menu (Contracts, the employee journey, every listing's
   status pill) opens under its status pill - left edges lined up, at least
   as wide as the pill - not under the whole Action cell, which pushed it
   right, under the ☰ beside the pill. Above it when there is no room below,
   as placeAnchoredMenu decides. */
function placeActionMenu(menu,wrap){
  if(!menu||!wrap)return;
  var btn=wrap.querySelector('.ct-action-btn')||wrap;
  var r=btn.getBoundingClientRect();
  menu.style.minWidth=Math.round(r.width)+'px';
  placeAnchoredMenu(menu,r,{alignLeft:true});
}
function placeAnchoredMenu(menu,anchor,opts){
  if(!menu||!anchor)return;
  opts=opts||{};
  // Measure at natural size — a cap left over from the last placement would
  // otherwise be read back as the menu's real height.
  menu.style.maxHeight='';menu.style.right='auto';menu.style.bottom='auto';
  menu.style.top='0px';menu.style.left='0px';
  if(opts.width)menu.style.width=opts.width+'px';
  var mw=menu.offsetWidth,mh=menu.offsetHeight;
  var vw=window.innerWidth,vh=window.innerHeight;

  // Horizontal: aligned to the edge the caller asked for, then clamped.
  var left=opts.alignLeft?anchor.left:anchor.right-mw;
  left=Math.min(Math.max(MENU_EDGE,left),Math.max(MENU_EDGE,vw-mw-MENU_EDGE));

  var b=menuBounds();
  var below=b.bottom-anchor.bottom-MENU_GAP;
  var above=anchor.top-MENU_GAP-b.top;
  var top,cap;
  if(mh<=below){top=anchor.bottom+MENU_GAP;cap=below;}
  else if(mh<=above){top=anchor.top-MENU_GAP-mh;cap=above;}
  else if(below>=above){top=anchor.bottom+MENU_GAP;cap=below;}
  else {top=b.top;cap=above;}
  // Whatever the branch decided, it lands inside the bounds.
  cap=Math.max(120,Math.min(cap,b.bottom-b.top));
  top=Math.min(Math.max(b.top,top),Math.max(b.top,b.bottom-Math.min(mh,cap)));

  // Everything above is in viewport coordinates; convert once, at the end, to
  // whatever this menu's fixed positioning is actually measured from.
  var o=fixedOrigin(menu);
  menu.style.left=Math.round(left-o.x)+'px';
  menu.style.top=Math.round(top-o.y)+'px';
  /* Cap ONLY when the space actually constrains it. Writing an inline
     max-height unconditionally would override the stylesheet's own limit —
     .custom-select-menu caps itself at 280px — and let a select grow to full
     height just because the window happened to be tall. */
  menu.style.maxHeight=(cap<mh)?Math.floor(cap)+'px':'';
  /* A CAPPED MENU MUST OPEN ON THE PART THAT MATTERS. Left at scrollTop 0 it
     shows the steps already completed and hides the one the row is actually
     on — so it is scrolled to bring the current step into view, centred in
     what room there is. */
  if(cap<mh){
    var cur=menu.querySelector('.current')||menu.querySelector('.cs-selected,.selected');
    menu.scrollTop=cur?Math.max(0,cur.offsetTop-(cap-cur.offsetHeight)/2):0;
  }else menu.scrollTop=0;
}
/* A fixed menu does not travel with the row it belongs to, so scrolling would
   leave it pointing at nothing. Closing is the honest response — repositioning
   mid-scroll makes it look glued to the viewport instead of to its row.

   BUT A MENU SCROLLING ITSELF IS NOT THE PAGE MOVING UNDER IT. This listens in
   the capture phase to catch scrolls in any container, which also catches the
   menu's own scrollport — so a long option list closed itself the instant you
   tried to scroll it, and the scrollbar looked broken. A scroll that started
   inside an open popup is the user reading it, and is ignored. */
var ANCHORED_MENUS='.ct-action-menu,.custom-select-menu,.cd-panel,.cs-dropdown';
function closeAnchoredMenus(e){
  var t=e&&e.target;
  if(t&&t.closest&&t.closest(ANCHORED_MENUS))return;
  document.querySelectorAll('.ct-action-menu.open').forEach(function(m){m.classList.remove('open');});
  if(typeof closeCustomSelects==='function')closeCustomSelects();
  if(typeof cdCloseAll==='function')cdCloseAll();
  document.querySelectorAll('.cs-dropdown.cs-open').forEach(function(d){
    d.classList.remove('cs-open');
    var t=d.previousElementSibling;if(t)t.classList.remove('cs-open');
  });
}
window.addEventListener('scroll',closeAnchoredMenus,true);
window.addEventListener('resize',closeAnchoredMenus);

function selectCustomOption(event,opt){event.stopPropagation();const root=opt.closest('.custom-select');if(!root)return;const label=opt.querySelector('.custom-select-text');const trigger=root.querySelector('.custom-select-trigger span');root.dataset.value=label?label.textContent.trim():opt.textContent.trim();if(trigger&&label){trigger.innerHTML=label.innerHTML;trigger.classList.remove('placeholder');}root.querySelectorAll('.custom-select-option').forEach(o=>o.classList.remove('selected'));opt.classList.add('selected');root.classList.remove('open');}
function getCustomSelectValue(id){const root=document.getElementById(id);if(!root)return'';const span=root.querySelector('.custom-select-trigger span');if(span&&span.classList.contains('placeholder'))return'';return root.dataset.value||'';}
/* THE DATE PANEL CLOSES ON A CLICK ANYWHERE ELSE, AND THAT HAS TO BE A
   CAPTURE-PHASE LISTENER. It was in the bubble-phase sweep below, which never
   fired for the place the picker is used most: every modal in this app stops
   propagation on its own box (ct-modal's onclick="event.stopPropagation()", so
   a click inside the dialog does not reach the overlay and dismiss it), and a
   click that never reaches document cannot be heard there. The panel stayed
   open until you clicked its own icon again. Capture runs on the way DOWN, so
   it is heard before anything downstream can stop it.

   The other popups in the sweep below have the same gap inside a modal; they
   are left as they are rather than moved wholesale, since each one's menu
   items would then close before their own handlers run. */
document.addEventListener('click',e=>{if(!e.target.closest('.cd-wrap'))cdCloseAll();},true);
/* ── POPUP SCROLL LOCK ──────────────────────────────────────────────────────
   While a popup is open the page behind it must not move. Popups live inside
   the page's own scroller, so a wheel over the backdrop - or over a popup too
   short to scroll, or one already at its end - fell through to the listing
   underneath. Freezing the scroller itself (overflow:hidden) would make the
   page jump sideways as its scrollbar went; instead the wheel is checked: it
   goes through only when something INSIDE the popup can still scroll that way
   (the popup body, a dropdown list, a long field), and is stopped otherwise. */
const POPUP_OPEN_SEL='.lp-split-sb.open.is-popup,.ct-modal-overlay:not([style*="none"]):not(.fp-page),.cost-calc-overlay:not(.hidden),.oh-overlay,.ts-overlay,#emp-block-pop';
function popupCanScroll(el,stop,dy){
  for(;el&&el!==stop&&el.nodeType===1;el=el.parentElement){
    const cs=getComputedStyle(el);
    if(!/(auto|scroll)/.test(cs.overflowY)||el.scrollHeight<=el.clientHeight+1)continue;
    if(dy<0?el.scrollTop>0:el.scrollTop+el.clientHeight<el.scrollHeight-1)return true;
  }
  return false;
}
document.addEventListener('wheel',function(e){
  const open=[...document.querySelectorAll(POPUP_OPEN_SEL)].filter(o=>o.offsetParent!==null||getComputedStyle(o).position==='fixed');
  if(!open.length)return;
  const top=open[open.length-1];                        // the popup on top is the one being used
  if(!top.contains(e.target)||!popupCanScroll(e.target,top,e.deltaY))e.preventDefault();
},{passive:false,capture:true});
/* Capture phase, like apCD's listener above: every popup stops clicks from
   bubbling (onclick="event.stopPropagation()"), which kept any dropdown
   opened inside one from ever closing on an outside click. */
document.addEventListener('click',e=>{if(!e.target.closest('.custom-select'))closeCustomSelects();if(!e.target.closest('.cs-wrap')){document.querySelectorAll('.cs-dropdown.cs-open').forEach(d=>{d.classList.remove('cs-open');const t=d.previousElementSibling;if(t)t.classList.remove('cs-open');});}if(!e.target.closest('.ct-action-wrap'))document.querySelectorAll('.ct-action-menu.open').forEach(m=>m.classList.remove('open'));if(!e.target.closest('.se-dd-wrap')){const p=document.getElementById('se-dd-panel');if(p)p.classList.remove('open');}},true);
const filterOptionMap={Country:['Country','Netherlands','India','Germany','Spain','United Kingdom'],Status:['Status','Active','Pending','Inactive'],Team:['Team','Engineering','Product','Finance','Operations'],Department:['Department','Finance','HR','Legal','Operations','Support'],Area:['Area','Company','Finance','Access','Workspace','Security'],Owner:['Owner','Pallavi Parate','Finance Ops','Admin','System'],Topic:['Topic','Payroll question','Contract review','Compliance rates','Payment proof'],Priority:['Priority','High','Medium','Low'],Category:['Category','Payroll','Contractor','Compliance','Benefits'],Cycle:['Cycle','May 2026','April 2026','March 2026'],Type:['Type','Earning','Deduction','EOR','PEO','Contractor'],Role:['Role','Entity Super Admin','Admin','Deal Manager','Ops Manager','Finance Approver','Employee'],'Worker Type':['Worker Type','EOR','PEO','Contractor'],'Leave Type':['Leave Type','Annual Leave','Sick Leave','Parental Leave','Holiday']};
function getFilterOptions(label){return filterOptionMap[label]||[label,'All','Active','Pending','Inactive'];}
function isCreateContractRequest(text){const q=String(text).toLowerCase();return q.includes('create')&&q.includes('contract');}
function isNetherlandsContractRequest(text){
  const q=String(text).toLowerCase();
  // Explicit: "create contract in netherlands"
  if(isCreateContractRequest(q)&&q.includes('netherland'))return true;
  // Shorthand: "create in netherlands", "create netherlands", "netherlands contract"
  if((q.includes('create')||q.includes('make')||q.includes('start')||q.includes('open')||q.includes('setup')||q.includes('set up')||q.includes('new'))&&q.includes('netherland'))return true;
  // Affirmative after suggestion: "yes netherlands", "ok netherlands", "proceed netherlands", "netherlands please", "netherlands" alone, "yes proceed", "proceed"
  if(q.includes('netherland'))return true;
  return false;
}
function showWorkspaceEmpty(){
  const col=document.getElementById('form-col');if(!col)return;
  col.style.display='flex';
  col.innerHTML=`<div class="workspace-empty"><div class="workspace-empty-inner"><svg class="workspace-mural" viewBox="0 0 180 180" fill="none"><circle cx="90" cy="90" r="4" fill="#6b7280"/><circle cx="57" cy="82" r="3" fill="#9ca3af"/><circle cx="126" cy="71" r="3" fill="#9ca3af"/><circle cx="139" cy="101" r="2" fill="#c3c8d1"/><circle cx="72" cy="134" r="2" fill="#c3c8d1"/><path d="M45 94c0-28 18-51 45-56" stroke="#d4d8df" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="26 18"/><path d="M133 126c-16 19-45 25-68 12" stroke="#d4d8df" stroke-width="1.5" stroke-linecap="round"/><path d="M118 49c23 10 38 32 38 58" stroke="#d4d8df" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="22 16"/><path d="M70 66c18-12 43-8 56 10" stroke="#c5cad3" stroke-width="1.5" stroke-linecap="round"/><path d="M118 117c-16 15-42 15-58 0" stroke="#c5cad3" stroke-width="1.5" stroke-linecap="round"/><circle cx="90" cy="90" r="36" stroke="#dde1e7" stroke-width="1.5"/><circle cx="90" cy="90" r="20" stroke="#cbd1db" stroke-width="1.5" stroke-dasharray="20 14"/><path d="M90 77l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9z" stroke="#8d95a3" stroke-width="1.6" stroke-linejoin="round"/><path d="M83 100l14-20" stroke="#b5bbc6" stroke-width="1.3" stroke-linecap="round"/></svg><div class="workspace-title">Your workspace will appear here</div><div class="workspace-copy">As you chat, I'll show relevant data, templates and previews on this side.</div></div></div>`;
  const chatCol=document.getElementById('agent-chat-col');if(chatCol)chatCol.style.flex='0 0 380px';
}
function startNetherlandsContract(){returnToReview=false;formStep=0;const chatCol=document.getElementById('agent-chat-col');if(chatCol)chatCol.style.flex='0 0 380px';buildForm(0);}
function ensureAgentModuleContent(){
  let el=document.getElementById('agent-module-content');
  if(!el){
    el=document.createElement('div');
    el.id='agent-module-content';
    el.className='agent-module-content';
    const area=document.querySelector('#v-agent-active .content-area');
    if(area)area.appendChild(el);
  }
  return el;
}
function getAgentWorkspaceButton(){
  let btn=document.getElementById('agent-workspace-btn');
  if(!btn){
    btn=document.createElement('button');
    btn.id='agent-workspace-btn';
    btn.className='agent-workspace-btn';
    btn.title='Back to Agent workspace';
    btn.setAttribute('aria-label','Back to Agent workspace');
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>';
    btn.onclick=restoreAgentWorkspace;
    document.body.appendChild(btn);
  }
  return btn;
}
function setAgentWorkspaceButton(show){const btn=getAgentWorkspaceButton();btn.style.display=show?'flex':'none';}
function restoreAgentWorkspace(){
  const moduleEl=ensureAgentModuleContent();
  moduleEl.style.display='none';
  const chatCol=document.getElementById('agent-chat-col');
  const formCol=document.getElementById('form-col');
  if(chatCol)chatCol.style.display='flex';
  renderChat('agent-chat',agentMsgs);buildInput('inp-active');
  if(formStep>=0){if(formCol)formCol.style.display='flex';buildForm(formStep);}else{showWorkspaceEmpty();}
  setAgentWorkspaceButton(false);
}
function showAgentModule(pg){
  buildSidebar('agent-sb',agentSidebarCollapsed,pg);
  const chatCol=document.getElementById('agent-chat-col');
  const formCol=document.getElementById('form-col');
  if(chatCol)chatCol.style.display='none';
  if(formCol)formCol.style.display='none';
  const moduleEl=ensureAgentModuleContent();
  moduleEl.style.display='block';
  /* Agent mode obeys the same Module Control and role guard as the ADT view. */
  moduleEl.innerHTML=pg==='dashboard'?dashboardContentHTML:((typeof emsPageGuard==='function'&&emsPageGuard(pg))||buildListingHTML(pg));
  if(typeof emsApplyChrome==='function')emsApplyChrome();
  if(pg==='dashboard'&&window.activeDashboardTab&&typeof switchDashboard==='function')switchDashboard(window.activeDashboardTab);
  // The dashboard snapshot is the idle attendance card; the shift it is hiding
  // may still be open. Same restore the ADT view does.
  if(pg==='dashboard'&&typeof _attRestore==='function')_attRestore();
  setAgentWorkspaceButton(true);
}
function hideAgentWorkspaceButton(){const btn=document.getElementById('agent-workspace-btn');if(btn)btn.style.display='none';}

const formSteps=[
  {title:'Eligibility',short:'Eligibility',sub:'Confirm where the employee will work and their authorization status.'},
  {title:'Employee Information',short:'Profile',sub:'Tell us a bit about the new hire so we can prepare the paperwork.'},
  {title:'Job Details',short:'Job',sub:'Define the role, schedule, and compensation for this contract.'},
  {title:'Other Details',short:'Leaves',sub:'Set leave entitlements, probation, and notice period pre-filled to local minimums.'},
  {title:'Review & Submit',short:'Review',sub:'Quick check before we draft the contract. You can edit anything below.'},
  {title:'Success',short:'Done',sub:''}
];

// -- SIDEBAR BUILDER --
/* WHAT THE SIDEBAR ACTUALLY DEPENDS ON, written down so a repaint can tell
   whether it needs rebuilding at all. It is these three and nothing else: the
   page (which item is active), the collapse state, and which dropdown is open.
   renderADTPage() used to rebuild it on every call, which meant every filter
   click threw away and rebuilt the whole nav - see the note there. */
function sidebarSig(id,collapsed,activePg){
  return id+'|'+(collapsed?1:0)+'|'+activePg+'|'+Array.from(openDropdowns).sort().join(',')+'|'+(typeof emsSidebarSig==='function'?emsSidebarSig():'');
}
let lastSidebarSig=null;
/* The key a sidebar icon's hover animation is chosen by (css/sidebar-icons.css):
   the page id for an item, "grp-" plus the group name for a dropdown parent. */
function sbIcoKey(name,isGroup){
  const k=String(name||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return isGroup?'grp-'+k:k;
}

function buildSidebar(id,collapsed,activePg){
  const el=document.getElementById(id);if(!el)return;
  /* Stamped here rather than at the call site so that EVERY route into a
     rebuild - the collapse toggle, a dropdown click, a direct call - leaves the
     signature describing what is really on screen. */
  if(id==='adt-sidebar')lastSidebarSig=sidebarSig(id,collapsed,activePg);
  el.className='sidebar'+(collapsed?' collapsed':'');el.innerHTML='';
  /* The topbar is a sibling of the rail, not an ancestor, so CSS alone cannot
     tell the page title how wide the rail currently is. Stamped on the view
     that owns this sidebar - never on :root - or the agent view's collapsed
     rail and the dashboard's open one would fight over one value. */
  const view=el.closest('.view');
  if(view){
    view.style.setProperty('--sb-w',collapsed?'62px':'224px');
    /* The var alone is not enough: collapsed, the rail is narrower than the logo,
       so the topbar cannot line up with it at all and has to fall back to plain
       header spacing. That is a different layout, not a different width. */
    view.classList.toggle('sb-collapsed',!!collapsed);
  }
  const scope=id==='adt-sidebar'?'adt':'agent';
  const top=document.createElement('div');top.className='sb-top';
  top.innerHTML=(collapsed?'':'<span class="sb-menu-label">Menu</span>')+'<button class="sidebar-toggle" onclick="toggleSidebar(\''+scope+'\')" title="Toggle sidebar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="5" width="16" height="14" rx="2"/><line x1="15" y1="5" x2="15" y2="19"/></svg></button>';
  el.appendChild(top);
  const items=getSidebarItems();
  items.forEach(item=>{
    if(item.section){if(!collapsed){const s=document.createElement('div');s.className='sb-section';s.textContent=item.section;el.appendChild(s);}return;}
    if(item.dropdown){
      const isOpen=openDropdowns.has(item.dropdown);
      const hasActiveChild=(item.children||[]).some(c=>c.id===activePg);
      if(!collapsed){
        const parentBtn=document.createElement('button');parentBtn.type='button';
        parentBtn.className='sb-parent'+(isOpen?' open':'')+(hasActiveChild?' has-active':'');
        parentBtn.innerHTML='<div class="sb-ico-wrap" data-ico="'+sbIcoKey(item.dropdown,true)+'">'+(item.icon||'')+'</div><span>'+item.dropdown+'</span><svg class="sb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
        parentBtn.title=item.dropdown;
        const childrenDiv=document.createElement('div');childrenDiv.className='sb-children';childrenDiv.style.maxHeight=isOpen?'600px':'0';
        (item.children||[]).forEach(child=>{
          const cd=document.createElement('button');cd.type='button';
          cd.className='sb-item'+(child.id===activePg?' active':'');
          cd.innerHTML='<div class="sb-ico-wrap" data-ico="'+sbIcoKey(child.id)+'">'+(child.icon||'')+'</div><span>'+child.label+'</span>';
          cd.title=child.label;
          cd.onclick=()=>{activeSidebarItem=child.id;navigatePage(child.id);};
          childrenDiv.appendChild(cd);
        });
        parentBtn.onclick=()=>{
          if(collapsed){if(scope==='adt'){adtSidebarCollapsed=false;openDropdowns.clear();openDropdowns.add(item.dropdown);buildSidebar(id,false,activeSidebarItem);sbMarkToggling(id);}return;}
          if(openDropdowns.has(item.dropdown)){openDropdowns.delete(item.dropdown);childrenDiv.style.maxHeight='0';parentBtn.classList.remove('open');}
          else{el.querySelectorAll('.sb-parent.open').forEach(b=>b.classList.remove('open'));el.querySelectorAll('.sb-children').forEach(c=>c.style.maxHeight='0');openDropdowns.clear();openDropdowns.add(item.dropdown);childrenDiv.style.maxHeight='600px';parentBtn.classList.add('open');}
        };
        el.appendChild(parentBtn);el.appendChild(childrenDiv);
      }else{
        const d=document.createElement('button');d.type='button';d.className='sb-parent'+(hasActiveChild?' has-active':'');
        d.innerHTML='<div class="sb-ico-wrap" data-ico="'+sbIcoKey(item.dropdown,true)+'">'+(item.icon||'')+'</div>';
        d.title=item.dropdown;
        // Opening a group from the collapsed rail expands the rail too, so it is
        // the same move as the toggle button and animates the same way.
        d.onclick=()=>{adtSidebarCollapsed=false;openDropdowns.clear();openDropdowns.add(item.dropdown);buildSidebar(id,false,activeSidebarItem);sbMarkToggling(id);};
        el.appendChild(d);
      }
      return;
    }
    const d=document.createElement('button');
    d.type='button';
    d.className='sb-item'+(item.id===activePg?' active':'')+(item.id==='ai-executive'?' sb-item-ai':'');
    d.innerHTML='<div class="sb-ico-wrap" data-ico="'+sbIcoKey(item.id)+'">'+(item.icon||'')+'</div><span>'+item.label+'</span>';
    d.title=item.label;
    d.onclick=item.placeholder?()=>{}:()=>{activeSidebarItem=item.id;navigatePage(item.id);};
    el.appendChild(d);
  });
}
const defaultChildIcon='<svg class="sb-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/></svg>';

// ── MODULE SUB-TABS ──
// Employees and Timesheet are single sidebar entries that host two views each.
const modTabIco={
  globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
};
function buildModuleTabsHTML(tabs,active,handler,full){
  return '<div class="mod-tabs-row'+(full?' full':'')+'"><div class="mod-tabs" role="tablist">'
    +tabs.map(t=>'<button type="button" role="tab" aria-selected="'+(t.id===active)+'" class="mod-tab'+(t.id===active?' active':'')+'" onclick="'+handler+'(\''+t.id+'\')">'
      +(t.icon||'')+'<span>'+t.label+'</span>'
      +'</button>').join('')
    +'</div></div>';
}
// ── EMPLOYEE DETAIL EDIT ──
// The detail panels shipped with an Edit button that had no onclick at all.
// These follow the pattern already used by the leave-policy sidebar: an inline
// edit mode on the record, Cancel/Save, then a re-render so the listing row and
// the panel agree.
let geEditMode=false, deEditMode=false;
const SB_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Records store "10 Feb 2024"; <input type=date> needs "2024-02-10". Convert both
// ways so editing a date cannot silently rewrite the stored format.
function sbDateToISO(str){
  if(!str||str==='--')return '';
  const m=String(str).trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if(!m)return '';
  const mi=SB_MONTHS.findIndex(x=>x.toLowerCase()===m[2].toLowerCase());
  if(mi<0)return '';
  return m[3]+'-'+String(mi+1).padStart(2,'0')+'-'+m[1].padStart(2,'0');
}
function sbISOToDate(iso){
  if(!iso)return '--';
  const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return '--';
  return m[3]+' '+SB_MONTHS[+m[2]-1]+' '+m[1];
}
function sbVal(id){const el=document.getElementById(id);return el?el.value.trim():null;}
function startGeEdit(){geEditMode=true;refreshGeSidebar();}
function cancelGeEdit(){geEditMode=false;refreshGeSidebar();}
function startDeEdit(){deEditMode=true;refreshDeSidebar();}
function cancelDeEdit(){deEditMode=false;refreshDeSidebar();}
function refreshGeSidebar(){const el=document.getElementById('ge-isb-inner');if(el)el.innerHTML=renderGeSidebar();}
function refreshDeSidebar(){const el=document.getElementById('de-isb-inner');if(el)el.innerHTML=renderDeSidebar();}

// ── EMPLOYEE DETAIL EDIT FORMS ──
// One spec per panel drives both the inputs and the save, so a field can never
// be present in the form and forgotten on save.
const GE_EDIT_FIELDS=[
  {k:'name',     label:'Name',           type:'text'},
  {k:'dept',     label:'Department',     type:'select', opts:['Engineering','Finance','HR','Operations']},
  {k:'empId',    label:'Employee ID',    type:'text',   readonly:true, hint:'System generated'},
  {k:'country',  label:'Country',        type:'select', opts:['Germany','France','Italy','United Kingdom']},
  {k:'jobTitle', label:'Job Title',      type:'text'},
  {k:'workerType',label:'Worker Type',   type:'select', opts:['EOR','Contractor']},
  {k:'joinDate', label:'Joining Date',   type:'date'},
  {k:'desc',     label:'Description',    type:'text'},
  {k:'contact',  label:'Contact Number', type:'tel'},
  {k:'email',    label:'Email',          type:'email'}
];
const DE_EDIT_FIELDS=[
  {k:'name',     label:'Name',           type:'text'},
  {k:'dept',     label:'Department',     type:'select', opts:['Engineering','HR','Product']},
  {k:'empId',    label:'Employee ID',    type:'text',   readonly:true, hint:'System generated'},
  {k:'branch',   label:'Branch',         type:'select', opts:['Punjab','Hyderabad','Mumbai','Delhi']},
  {k:'jobTitle', label:'Job Title',      type:'text'},
  {k:'joinDate', label:'Joining Date',   type:'date'},
  {k:'desc',     label:'Description',    type:'text'},
  {k:'contact',  label:'Contact Number', type:'tel'},
  {k:'email',    label:'Email',          type:'email'}
];
function sbEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
/* Field types: text / email / tel / number, select (opts: a list, or a function
   of the record), bool (a Yes/No select over true/false), date (a 'dd Mon yyyy'
   value), isodate (a 'yyyy-mm-dd' value) and textarea. readonly shows the value
   greyed with its hint; req marks it required; full spans both columns. */
function buildSbEditForm(prefix,fields,rec,onCancel,onSave){
  const call=s=>s.indexOf('(')<0?s+'()':s;
  const inputs=fields.map(f=>{
    const id=prefix+'-'+f.k;
    const raw=rec[f.k]==null||rec[f.k]==='--'?'':rec[f.k];
    let ctl;
    if(f.type==='select'){
      const opts=(typeof f.opts==='function'?f.opts(rec):f.opts).slice();
      if(raw&&opts.indexOf(raw)<0)opts.unshift(raw);   // never drop an unlisted existing value
      ctl=sbSelect(id,opts,raw);
      if(f.hints)ctl=csWithHints(ctl,f.hints);         // a description under each option
    }else if(f.type==='bool'){
      ctl=sbSelect(id,['Yes','No'],rec[f.k]?'Yes':'No');
    }else if(f.type==='date'){
      // apCD still carries the value on an <input id> — sbCollect reads .value unchanged.
      ctl=apCD(id,sbDateToISO(raw),'Select date');
    }else if(f.type==='isodate'){
      ctl=apCD(id,/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:'','Select date');
    }else if(f.type==='textarea'){
      ctl='<textarea class="ep-form-input" id="'+id+'" rows="3">'+sbEsc(raw)+'</textarea>';
    }else{
      ctl='<input class="ep-form-input" id="'+id+'" type="'+(f.type||'text')+'" value="'+sbEsc(raw)+'"'
        +(f.readonly?' disabled':'')+'>';
    }
    return '<div class="lp-sb-field"'+(f.full?' style="grid-column:1/-1"':'')+'><label>'+f.label
      +(f.req?' <span class="req">*</span>':'')
      +(f.readonly&&f.hint?' <span class="sb-field-hint">'+f.hint+'</span>':'')+'</label>'+ctl+'</div>';
  }).join('');
  return '<div class="lp-sb-edit-form"><div class="lp-sb-edit-section"><div class="lp-sb-form-grid">'
    +inputs
    +'</div><div class="lp-sb-form-actions">'
    +'<button class="ep-cancel-btn" onclick="'+call(onCancel)+'">Cancel</button>'
    +'<button class="ep-save-btn" onclick="'+call(onSave)+'">Save changes</button>'
    +'</div></div></div>';
}
function applySbEdit(prefix,fields,rec){
  fields.forEach(f=>{
    if(f.readonly)return;
    const val=sbVal(prefix+'-'+f.k);
    if(val===null)return;
    rec[f.k]=f.type==='bool'?val==='Yes'
      :f.type==='date'?sbISOToDate(val)
      :f.type==='isodate'?val
      :(val===''?'--':val);
  });
}

/* ── EDIT IN PLACE, EVERY PANEL ──
   Edit turns a panel's Basic Details into its form right there - the listing
   stays beside it, the header card stays on top saying Editing, and Save /
   Cancel bring the details back. One slot holds the record being edited, so
   opening another record, another tab or another page simply drops it.
   A panel registers once: sbEditReg(key,{prefix,render,get,fields,noun,title}). */
let sbEditing=null;   // {key,id}
const SB_EDITORS={};
function sbEditReg(key,cfg){SB_EDITORS[key]=cfg;}
function sbIsEditing(key,id){return !!sbEditing&&sbEditing.key===key&&String(sbEditing.id)===String(id);}
function sbEditFields(key,rec){const f=SB_EDITORS[key].fields;return typeof f==='function'?f(rec):f;}
function sbEditFormHTML(key,rec){
  return buildSbEditForm('sbed-'+key,sbEditFields(key,rec),rec,"sbCancelEdit('"+key+"')","sbSaveEdit('"+key+"')");
}
function sbRepaint(key){const ed=SB_EDITORS[key];isbTab(ed.prefix||key,ed.render);}
function sbStartEdit(key,id){sbEditing={key:key,id:id};sbRepaint(key);}
function sbCancelEdit(key){sbEditing=null;sbRepaint(key);}

/* ── UNSAVED EDITS OUTLIVE A TAB SWITCH ──
   A panel form that has been changed is never thrown away by moving to another
   tab of the same record: the form is put aside as it stands (SB_STASH) and
   put back when its tab is opened again, the tab carries a dot meanwhile, and
   the header still says Editing. A form nobody touched just closes, as before.
   Leaving the RECORD - another row, closing the panel, another page - with
   changes pending asks first (sbLeaveGuard); only Discard loses them.

   "Changed" is any typing, any dropdown pick (csSelect) or date pick (cdSet)
   inside a .lp-sb-edit-form. Panels that keep their form in a draft object
   instead (Assets, IT Access, the settings tabs) register their own dirty
   test and reset with sbDraftReg; the rest only register how to leave edit
   mode. Every panel is addressed by its prefix - the <prefix>-isb-inner id. */
const SB_FORM_SEL='.lp-sb-edit-form';
const SB_DIRTY_FORMS=new WeakSet();
const SB_STASH={};    // prefix -> {node, tab}
const SB_DRAFT={};    // prefix -> {drop, dirty?, tabs?}
function sbDraftReg(prefix,o){SB_DRAFT[prefix]=o;}
function sbMarkDirty(el){const f=el&&el.closest&&el.closest(SB_FORM_SEL);if(f)SB_DIRTY_FORMS.add(f);}
function sbMarkPanelDirty(prefix){const f=sbFormIn(prefix);if(f)SB_DIRTY_FORMS.add(f);}
['input','change'].forEach(function(t){document.addEventListener(t,function(e){sbMarkDirty(e.target);},true);});
function sbFormIn(prefix){const inner=document.getElementById(prefix+'-isb-inner');return inner?inner.querySelector('.lp-isb-body '+SB_FORM_SEL):null;}
function sbTabIdOf(btn){const m=String(btn.getAttribute('onclick')||'').match(/\(\s*'([^']+)'/);return m?m[1]:'';}
function sbHasDraft(prefix){
  const r=SB_DRAFT[prefix];
  if(r&&r.dirty)return !!r.dirty();
  if(SB_STASH[prefix])return true;
  const f=sbFormIn(prefix);
  return !!(f&&SB_DIRTY_FORMS.has(f));
}
function sbDraftTabs(prefix){
  const r=SB_DRAFT[prefix];
  if(r&&r.tabs)return r.tabs();
  return SB_STASH[prefix]?[SB_STASH[prefix].tab]:(r&&r.dirty&&r.dirty()?['basic-details']:[]);
}
function sbDropDraft(prefix){
  delete SB_STASH[prefix];
  const f=sbFormIn(prefix);if(f)SB_DIRTY_FORMS.delete(f);
  const r=SB_DRAFT[prefix];if(r&&r.drop)r.drop();
}
/* Called by isbTab around every body swap. */
function sbStashBefore(prefix,oldBody,oldTab,newTab){
  if(!oldBody||oldTab===newTab||SB_STASH[prefix])return;
  const r=SB_DRAFT[prefix];if(r&&r.dirty)return;      // keeps its own draft
  const f=oldBody.querySelector(SB_FORM_SEL);
  if(f&&SB_DIRTY_FORMS.has(f))SB_STASH[prefix]={node:f,tab:oldTab||'basic-details'};
}
function sbRestoreAfter(prefix,inner){
  const s=SB_STASH[prefix];if(!s)return;
  const f=inner.querySelector('.lp-isb-body '+SB_FORM_SEL);
  if(f&&f!==s.node){f.replaceWith(s.node);delete SB_STASH[prefix];}
}
/* The dot on a tab holding unsaved changes. Run after every repaint. */
function sbMarkDraftTabs(){
  const keys={};Object.keys(SB_STASH).forEach(function(k){keys[k]=1;});Object.keys(SB_DRAFT).forEach(function(k){keys[k]=1;});
  Object.keys(keys).forEach(function(prefix){
    const inner=document.getElementById(prefix+'-isb-inner');if(!inner)return;
    const tabs=sbHasDraft(prefix)?sbDraftTabs(prefix):[];
    inner.querySelectorAll('.lp-isb-tab').forEach(function(b){
      b.classList.toggle('has-draft',!b.classList.contains('active')&&tabs.indexOf(sbTabIdOf(b))>=0);
      if(b.classList.contains('has-draft'))b.title='Unsaved changes';else if(b.title==='Unsaved changes')b.removeAttribute('title');
    });
  });
}
/* ── EDIT AND ENLARGE, ON EVERY TAB ──
   Two icon buttons beside the close x of every panel's tab bar, whatever tab
   is open: Enlarge opens the panel as a popup over the page - every tab and
   its details at full size - and pressed again puts it back, and Edit - on panels that have an edit
   form - goes to Basic Details and opens it. The tab bars are written by
   twenty renderers; rather than touch each, the buttons are added to any bar
   that lacks them whenever the page changes (one MutationObserver). */
const SB_WIDE={};
const SB_PEN_ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
const SB_GROW_ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const SB_SHRINK_ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
/* How each panel opens its edit form, from any tab. The shared edit form
   (sbEditReg) needs only its nav function and selected id. */
function sbGenEdit(key,nav,id){return function(){window[nav]('basic-details');if(!sbIsEditing(key,id()))sbStartEdit(key,id());};}
const SB_TOOL_EDIT={
  de:function(){navDeTab('basic-details');if(!deEditMode)startDeEdit();},
  ge:function(){navGeTab('basic-details');if(!geEditMode)startGeEdit();},
  tm:sbGenEdit('tm','navTmTab',function(){return tmSelectedId;}),
  pm:sbGenEdit('pm','navPmTab',function(){return pmSelectedId;}),
  ct:sbGenEdit('ct','navCtTab',function(){return ctSelectedId;}),
  cmp:sbGenEdit('cmp','navComplianceTab',function(){return complianceSelectedId;}),
  rr:sbGenEdit('rr','navRatesRuleTab',function(){return ratesRuleSelectedId;}),
  ctp:sbGenEdit('ctp','navCtpTab',function(){return ctpSelectedId;}),
  lst:sbGenEdit('lst','navLstTab',function(){return lstSelectedId;}),
  hd:function(){navHdTab('basic-details');if(!hdEditMode)hdSetEdit(true);},
  lp:function(){navLPSidebar('basic-details');if(!lpSidebarEditMode){lpSidebarEditMode=true;refreshLPSidebar();}},
  ast:function(){navAstTab('basic-details');if(!astInlineEdit())startAddAsset(astSelectedId);},
  ita:function(){navItaTab('basic-details');if(!itaInlineEdit())startAddItAccess(itaSelectedId);}
};
function sbToolPrefix(el){const inner=el.closest('[id$="-isb-inner"]');return inner?inner.id.slice(0,-'-isb-inner'.length):'';}
function sbToolEdit(btn){const f=SB_TOOL_EDIT[sbToolPrefix(btn)];if(f)f();}
function sbToolWide(btn){
  const p=sbToolPrefix(btn);if(!p)return;
  SB_WIDE[p]=!SB_WIDE[p];
  sbDecorateTabbars();
}
/* ── THE POPUP'S RECORD HEADER ──
   Opened as a popup, the panel reads like a record window: the record itself
   (icon, name, status, its identifying line) on a header across the top, then
   the tab bar, then the tab. The header is lifted from the details tab's own
   hero (sbHero / the holiday hero), remembered per panel so it stays in place
   while any other tab is open. Shrink and close sit on its right; the tab bar
   gives up its own x while the header carries one. */
const SB_POP_REC={};
const SB_X_ICO='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
function sbPopReadHero(body){
  const hero=body.querySelector('.sb-hero:not(.sb-hero-auto),.hd-sb-hero');if(!hero)return null;
  const name=hero.querySelector('.sb-hero-name,.hd-sb-hero-name');if(!name)return null;
  const ico=hero.querySelector('.sb-hero-ico,.sb-hero-img,.hd-sb-datechip');
  const meta=hero.querySelector('.sb-hero-meta,.hd-sb-hero-meta');
  const right=hero.querySelector('.sb-hero-right,.hd-sb-hero-right');
  let status='';
  if(right){
    const r=right.cloneNode(true);
    r.querySelectorAll('button,.sb-tools,.sb-hero-editing').forEach(function(x){x.remove();});
    status=r.innerHTML.trim();
  }
  return {ico:ico?ico.outerHTML:'',name:name.innerHTML,meta:meta?meta.innerHTML:'',status:status};
}
/* Panels whose details tab has no hero: the header is read off the list row
   the panel was opened from - its name cell, its status pill, and the next
   two plain cells as the identifying line. */
const SB_POP_DOC_ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
function sbPopReadRow(inner){
  const panel=inner.closest('.lp-split-sb');
  const row=panel&&panel.parentElement&&panel.parentElement.querySelector('tr.lp-row-selected');
  if(!row)return null;
  const txt=function(el){return (el.textContent||'').replace(/\s+/g,' ').trim();};
  const tbl=row.closest('table');const hrow=tbl&&tbl.tHead&&tbl.tHead.rows[0];
  const isNo=function(i){const th=hrow&&hrow.cells[i];return !!th&&/^(s\.?\s*no\.?|sr\.?\s*no\.?|#)$/i.test(txt(th));};
  const cells=Array.prototype.filter.call(row.cells,function(td,i){
    return !td.classList.contains('lp-c-n')&&!isNo(i)&&!td.querySelector('button,input')&&txt(td);
  });
  const plain=cells.filter(function(td){return !td.querySelector('.lp-status-badge');});
  if(!plain.length)return null;
  /* A leading ID column (94132, INV-2041, TCK-1021) is not the record's name:
     the name is the next cell, and the ID leads the identifying line. */
  const idLike=function(td){return /^[A-Z]{0,5}[-#]?\d[\d-]*$/.test(txt(td));};
  const lead=plain.length>1&&idLike(plain[0])?plain.shift():null;
  const nameCell=plain[0];
  const first=nameCell.firstElementChild;
  const name=txt(first&&first.children.length===0?first:nameCell);
  const meta=lead?[txt(lead)]:[];
  const sub=nameCell.querySelector('.lp-c-sub');if(sub&&txt(sub)!==name)meta.push(txt(sub));
  plain.slice(1).forEach(function(td){
    if(meta.length>=3)return;
    const f=td.firstElementChild;const t=txt(f&&!f.classList.contains('sb-dash')?f:td);
    if(t&&t!=='—'&&t!=='--')meta.push(t);
  });
  const badge=row.querySelector('.lp-status-badge');
  const esc=function(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');};
  return {ico:'<div class="sb-hero-ico">'+SB_POP_DOC_ICO+'</div>',name:esc(name),
    meta:meta.map(esc).join('<span class="sb-dot">•</span>'),status:badge?badge.outerHTML:''};
}
/* Which list row the panel belongs to, so a remembered header is only reused
   for the record it was read from. */
function sbSelRowId(inner){
  const panel=inner.closest('.lp-split-sb');
  const row=panel&&panel.parentElement&&panel.parentElement.querySelector('tr.lp-row-selected');
  return row?(row.id||String(row.rowIndex)):'';
}
/* The record header for a tab that has none: the details tab's hero if it was
   read for this same record, otherwise the selected list row. */
function sbRecFor(p,inner){
  const r=SB_POP_REC[p];
  if(r&&r.rowId===sbSelRowId(inner))return r;
  return sbPopReadRow(inner);
}
function sbPopClose(btn){
  const inner=btn.closest('[id$="-isb-inner"]');
  const x=inner&&inner.querySelector('.lp-isb-tabbar .lp-isb-close');
  if(x)x.click();
}
function sbPopHead(p,inner,body){
  /* Only the first (details) tab's hero describes the record; a card on any
     other tab - the E-Sign integration, say - is about that tab. */
  const firstTab=inner.querySelector('.lp-isb-tab');
  const rec=(!firstTab||firstTab.classList.contains('active'))?sbPopReadHero(body):null;
  if(rec){rec.rowId=sbSelRowId(inner);SB_POP_REC[p]=rec;}
  let head=inner.querySelector(':scope>.sb-pop-head');
  if(!SB_WIDE[p]){if(head)head.remove();return;}
  const r=SB_POP_REC[p]||sbPopReadRow(inner)||{ico:'',name:'',meta:'',status:''};
  const hasX=!!inner.querySelector('.lp-isb-tabbar .lp-isb-close');
  const sig=JSON.stringify([r,hasX]);
  if(head&&head.dataset.sig===sig&&head===inner.firstElementChild)return;
  if(!head){head=document.createElement('div');head.className='sb-pop-head';}
  head.dataset.sig=sig;
  head.innerHTML=(r.ico?'<div class="sb-pop-ico">'+r.ico+'</div>':'')
    +'<div class="sb-pop-txt">'
      +'<div class="sb-pop-title"><span class="sb-pop-name">'+r.name+'</span>'+(r.status?'<span class="sb-pop-status">'+r.status+'</span>':'')+'</div>'
      +(r.meta?'<div class="sb-pop-meta">'+r.meta+'</div>':'')
    +'</div>'
    +'<div class="sb-pop-tools">'
      +'<button type="button" class="sb-tool sb-pop-btn" title="Close popup" aria-label="Close popup" onclick="sbToolWide(this)">'+SB_SHRINK_ICO+'</button>'
      +(hasX?'<button type="button" class="sb-tool sb-pop-btn" title="Close" aria-label="Close" onclick="sbPopClose(this)">'+SB_X_ICO+'</button>':'')
    +'</div>';
  if(inner.firstElementChild!==head)inner.insertBefore(head,inner.firstChild);
}
/* Placed INSIDE the record's header card at the top of the open tab, on its
   right beside the status: next to the card's own Edit on Basic Details (only
   Enlarge is added there), and on every other tab in the same card, added to
   the tab when it has none. Only a panel with no record to describe falls back
   to a section heading row or a slim row of its own. Edit is left out while
   the form is already open. */
function sbDecorateTabbars(){
  document.querySelectorAll('[id$="-isb-inner"]').forEach(function(inner){
    const p=inner.id.slice(0,-'-isb-inner'.length);
    const panel=inner.closest('.lp-split-sb');
    if(panel&&!panel.classList.contains('open')){SB_WIDE[p]=false;delete SB_POP_REC[p];}   // a closed panel leaves the popup
    if(panel)panel.classList.toggle('is-popup',!!SB_WIDE[p]);
    const body=inner.querySelector('.lp-isb-body');if(!body)return;
    let tools=body.querySelector('.sb-tools');
    if(!tools){
      const first=body.firstElementChild;
      let hero=first&&first.matches('.sb-hero,.hd-sb-hero')?first:null;
      /* The standard: Enlarge (and Edit) live in the record's header card, on
         every tab. A tab that opens without one gets the same card - the
         details tab's hero, remembered, or failing that the selected list
         row - so the tools are never on a loose row of their own. */
      if(hero&&!hero.classList.contains('sb-hero-auto')){const r=sbPopReadHero(body);if(r){r.rowId=sbSelRowId(inner);SB_POP_REC[p]=r;}}
      if(!hero){
        const rec=sbRecFor(p,inner);
        if(rec){
          hero=document.createElement('div');hero.className='sb-hero sb-hero-auto';
          hero.innerHTML=(rec.ico||'<div class="sb-hero-ico">'+SB_POP_DOC_ICO+'</div>')
            +'<div class="sb-hero-txt"><div class="sb-hero-name">'+rec.name+'</div>'
            +(rec.meta?'<div class="sb-hero-meta">'+rec.meta+'</div>':'')+'</div>'
            +'<div class="sb-hero-right">'+(rec.status||'')+'</div>';
          body.insertBefore(hero,body.firstChild);
        }
      }
      const head=!hero&&first&&first.matches('.lp-sb-view-header')?first:null;
      const host=hero?hero.querySelector('.sb-hero-right,.hd-sb-hero-right'):head;
      /* Workflow and Logs are records of what happened - approvals, status
         moves - and a record is not edited. Logs already has its own action
         (the status move and its comment), so a pencil there only competed
         with it. No Edit on either tab. Bank Details has its own
         "+ Add Bank Detail" action, so it gets no pencil either. */
      const act=inner.querySelector('.lp-isb-tab.active');
      const onWf=!!act&&/workflow|\blogs?\b|bank-details|bank details/i.test(sbTabIdOf(act)+' '+act.textContent);
      const hasEdit=onWf||!!(host&&host.querySelector('.lp-sb-view-edit-btn,.sb-hero-editing'))||!!body.querySelector('.lp-sb-edit-form');
      tools=document.createElement('span');tools.className='sb-tools';
      tools.innerHTML=(SB_TOOL_EDIT[p]&&!hasEdit?'<button type="button" class="sb-tool" title="Edit" aria-label="Edit" onclick="sbToolEdit(this)">'+SB_PEN_ICO+'</button>':'')
        +'<button type="button" class="sb-tool sb-tool-wide" onclick="sbToolWide(this)"></button>';
      if(host)host.appendChild(tools);
      else{const row=document.createElement('div');row.className='sb-body-tools';row.appendChild(tools);body.insertBefore(row,body.firstChild);}
    }
    const wide=tools.querySelector('.sb-tool-wide');
    if(wide&&wide.dataset.on!==String(!!SB_WIDE[p])){
      wide.dataset.on=String(!!SB_WIDE[p]);
      wide.innerHTML=SB_WIDE[p]?SB_SHRINK_ICO:SB_GROW_ICO;
      wide.title=wide.ariaLabel=SB_WIDE[p]?'Close popup':'Open in popup';
    }
    sbPopHead(p,inner,body);
  });
  /* One dimmed backdrop under whichever panel is open as a popup. Clicking it
     does nothing - like every popup, it closes from its own button or x. */
  const any=document.querySelector('.lp-split-sb.open.is-popup');
  let bd=document.getElementById('sb-popup-backdrop');
  if(any&&!bd){bd=document.createElement('div');bd.id='sb-popup-backdrop';document.body.appendChild(bd);}
  else if(!any&&bd)bd.remove();
}
let sbDecorateQueued=false;
new MutationObserver(function(){
  if(sbDecorateQueued)return;sbDecorateQueued=true;
  requestAnimationFrame(function(){sbDecorateQueued=false;sbDecorateTabbars();});
/* Class changes too: closing a panel only takes its "open" class away, and
   that has to take the popup and its backdrop with it. */
}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});

/* The prefix of any panel on screen with changes pending. */
function sbAnyDraft(){
  const seen={};
  document.querySelectorAll('[id$="-isb-inner"]').forEach(function(el){seen[el.id.slice(0,-'-isb-inner'.length)]=1;});
  Object.keys(SB_STASH).forEach(function(k){seen[k]=1;});
  return Object.keys(seen).find(function(p){return sbHasDraft(p);})||null;
}
/* true when it stopped the caller - the dialog then re-runs `retry` on Discard. */
function sbLeaveGuard(prefix,retry){
  if(!prefix||!sbHasDraft(prefix))return false;
  sbConfirmDiscard(prefix,function(){sbDropDraft(prefix);retry();});
  return true;
}
function sbConfirmDiscard(prefix,onDiscard){
  sbCloseDiscard();
  const el=document.createElement('div');
  el.id='sb-discard-pop';el.className='ct-modal-overlay sb-discard-overlay';
  el.innerHTML='<div class="ct-modal sb-discard" role="alertdialog" aria-modal="true" aria-label="Discard unsaved changes">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Discard unsaved changes?</span>'
      +'<button class="ct-modal-close" onclick="sbKeepEditing(\''+prefix+'\')" title="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'<p class="ct-modal-sub">This record has changes that have not been saved. Discard them, or keep editing and save them first.</p>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="sbKeepEditing(\''+prefix+'\')">Keep editing</button>'
      +'<button class="ep-save-btn" id="sb-discard-go">Discard changes</button>'
    +'</div></div></div>';
  document.body.appendChild(el);
  el.querySelector('#sb-discard-go').onclick=function(){sbCloseDiscard();onDiscard();};
}
function sbCloseDiscard(){const el=document.getElementById('sb-discard-pop');if(el)el.remove();}
/* Keep editing takes the reader back to the form, wherever they had wandered. */
function sbKeepEditing(prefix){
  sbCloseDiscard();
  const inner=document.getElementById(prefix+'-isb-inner');
  const b=inner&&inner.querySelector('.lp-isb-tab.has-draft');
  if(b)b.click();
}
function sbEditBtnFor(key,id){return sbEditBtn("sbStartEdit('"+key+"',"+JSON.stringify(id).replace(/"/g,'&quot;')+")");}
function sbSaveEdit(key){
  if(!sbEditing||sbEditing.key!==key)return;
  const id=sbEditing.id,ed=SB_EDITORS[key],rec=ed.get(id);if(!rec)return;
  const fields=sbEditFields(key,rec);
  for(const f of fields){
    if(f.req&&!sbVal('sbed-'+key+'-'+f.k)){
      showToast(f.label+' is required','error');
      const el=document.getElementById('sbed-'+key+'-'+f.k);if(el)el.focus();
      return;
    }
  }
  // A field with a rule of its own (an order's Payment Cycle) can refuse here.
  if(ed.check&&ed.check(rec,id)===false)return;
  const before=JSON.stringify(rec);
  applySbEdit('sbed-'+key,fields,rec);
  sbEditing=null;
  if(JSON.stringify(rec)===before){sbRepaint(key);showToast('No changes','info','Nothing was different.');return;}
  if(ed.saved)ed.saved(rec,id);
  renderADTPage();          // the listing row shows the same values
  showToast(ed.noun+' updated','success',ed.title?ed.title(rec,id):'');
}
function saveGeEdit(){
  const emp=globalEmpData.find(e=>e.id===geSelectedId);
  if(!emp)return;
  applySbEdit('gesb',GE_EDIT_FIELDS,emp);
  geEditMode=false;
  const id=geSelectedId;
  renderADTPage();          // the listing row shows name/dept/country too
  openGeSidebar(id);
  showToast('Employee details updated','success',emp.name+' \u00b7 '+emp.empId);
}
function saveDeEdit(){
  const emp=directEmpData.find(e=>e.id===deSelectedId);
  if(!emp)return;
  applySbEdit('desb',DE_EDIT_FIELDS,emp);
  deEditMode=false;
  const id=deSelectedId;
  renderADTPage();
  openDeSidebar(id);
  showToast('Employee details updated','success',emp.name+' \u00b7 '+emp.empId);
}

function setEmpSubTab(t){if(empSubTab===t)return;
  if(sbLeaveGuard(sbAnyDraft(),function(){setEmpSubTab(t);}))return;empSubTab=t;deSelectedId=null;geSelectedId=null;empStatusModal=null;renderADTPage();}
function setTsSubTab(t){if(tsSubTab===t)return;tsSubTab=t;renderADTPage();}
function buildEmployeesHTML(){
  const tabs=[
    {id:'direct',label:'Direct Employee',icon:modTabIco.user},
    {id:'global',label:'Global Employee',icon:modTabIco.globe}
  ];
  /* Without the right to see every record, a person sees their own (and
     their team's) - on the list their own employment is in. */
  if(typeof emsCan==='function'&&!emsCan('h2r.employee.view')&&!emsCan('h2r.employee.view.team')){
    const me=typeof emsActorRecord==='function'?emsActorRecord():null;
    const k=me&&typeof idEmpKind==='function'?idEmpKind(me):'de';
    const keep=k==='ge'?'global':'direct';
    tabs.splice(0,tabs.length,tabs.find(function(t){return t.id===keep;}));empSubTab=keep;
  }
  const body=empSubTab==='global'?buildGlobalListingHTML():buildDirectListingHTML();
  return '<div class="mod-page">'+buildModuleTabsHTML(tabs,empSubTab,'setEmpSubTab')+body+'</div>';
}
function buildTimesheetHTML(){
  const tabs=[
    {id:'my',label:'My Timesheet',icon:modTabIco.clock},
    {id:'all',label:'All Timesheet',icon:modTabIco.list}
  ];
  const body=tsSubTab==='all'?buildAllTimesheetHTML():buildMyTimesheetHTML();
  return '<div class="mod-page">'+buildModuleTabsHTML(tabs,tsSubTab,'setTsSubTab',true)+body+'</div>';
}

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ NOTIFICATION POPOVER ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
// ── TOAST NOTIFICATIONS ──
function showToast(title,type,sub){
  type=type||'success';
  let stack=document.getElementById('toast-stack');
  if(!stack){stack=document.createElement('div');stack.id='toast-stack';document.body.appendChild(stack);}
  const icons={
    success:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  const el=document.createElement('div');
  el.className='toast '+type;
  el.innerHTML='<div class="toast-ico">'+(icons[type]||icons.success)+'</div>'
    +'<div class="toast-body"><div class="toast-title">'+title+'</div>'+(sub?'<div class="toast-sub">'+sub+'</div>':'')+'</div>'
    +'<button class="toast-close" onclick="dismissToast(this)" title="Dismiss"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  stack.appendChild(el);
  while(stack.children.length>4)stack.removeChild(stack.firstChild);
  el._timer=setTimeout(function(){dismissToastEl(el);},3400);
  return el;
}
function dismissToast(btn){dismissToastEl(btn.closest('.toast'));}
function dismissToastEl(el){
  if(!el||el.classList.contains('toast-leaving'))return;
  clearTimeout(el._timer);
  el.classList.add('toast-leaving');
  setTimeout(function(){el.remove();},240);
}

// ── DEMO ACTION DELEGATION ──
// Buttons in this mockup with no dedicated handler get plausible demo
// behaviour + a toast here, so every visible control responds. Buttons with an
// inline onclick are left alone.
// Pagination used to be faked here: a handler that moved the .active class
// between static page buttons under a table already showing every row it had.
// Every pager in the app now carries a real goListPage() onclick, so there is
// nothing left for this delegation to catch - see listPage() below.
document.addEventListener('click',function(e){
  const btn=e.target.closest('button');
  if(!btn||btn.disabled)return;
  if(btn.onclick||btn.getAttribute('onclick'))return;
  if(btn.closest('#toast-stack'))return;
  const cls=btn.classList;
  const txt=(btn.textContent||'').replace(/\s+/g,' ').trim();
  // Notifications panel
  if(cls.contains('np-mark')){notifData.forEach(function(n){n.pending=false;});renderNotif();showToast('All notifications marked as read');return;}
  if(cls.contains('np-iconbtn')&&btn.title==='Refresh'){renderNotif();showToast('Notifications refreshed','info');return;}
  // Timesheets
  if(cls.contains('ts-submit-btn')||cls.contains('ts-sb-submit')){showToast('Timesheet submitted for approval','success','Your manager has been notified.');return;}
  if(cls.contains('ts-btn-search')){renderADTPage();showToast('Filters applied','info');return;}
  if(cls.contains('ts-btn-reset')){tsResetRange();renderADTPage();return;}
  if(cls.contains('ts-refresh-btn')){renderADTPage();showToast('Timesheet refreshed','info');return;}
  // Cost calculator
  if(cls.contains('cc-export-btn')){showToast('Preparing PDF export…','info');setTimeout(function(){showToast('Cost breakdown exported as PDF');},1000);return;}
  // Chat / ticket reply
  if(txt==='Send'){
    const inp=btn.previousElementSibling;
    if(inp&&inp.tagName==='INPUT'){
      const val=inp.value.trim();
      if(!val){showToast('Please type a reply first','error');return;}
      const row=btn.parentElement;
      row.insertAdjacentHTML('beforebegin','<div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px"><div style="flex:1;display:flex;justify-content:flex-end"><div><div style="font-size:11px;font-weight:600;color:var(--navy);margin-bottom:3px;text-align:right">Pallavi Parate <span style="color:#9ca3af;font-weight:400">&middot; Just now</span></div><div class="demo-reply-bubble" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px 0 8px 8px;padding:8px 12px;font-size:12.5px;color:#374151;line-height:1.4"></div></div></div><div style="width:28px;height:28px;border-radius:50%;background:#fff7ed;color:#ea580c;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">PP</div></div>');
      const bubble=row.previousElementSibling.querySelector('.demo-reply-bubble');
      if(bubble)bubble.textContent=val;
      inp.value='';
      showToast('Reply sent');
    }else{showToast('Message sent');}
    return;
  }
  if(txt==='Reassign'){showToast('Reassigned successfully','success','The new owner has been notified.');return;}
  // Password / profile
  if(txt==='Update Password'){
    const sec=btn.closest('div')?btn.closest('div').parentElement:null;
    const pws=sec?[].slice.call(sec.querySelectorAll('input[type="password"]')):[];
    if(pws.length&&pws.some(function(p){return !p.value.trim();})){showToast('Please fill in all password fields','error');return;}
    pws.forEach(function(p){p.value='';});
    showToast('Password updated successfully');return;
  }
  if(cls.contains('prof-edit-btn')||txt==='Edit Profile'){showToast('Fields are editable — make your changes and press Save','info');return;}
  // Generic save / edit / cancel in sidebars & forms
  if(cls.contains('ep-save-btn')){showToast(txt==='Save Changes'?'Changes saved successfully':'Saved successfully');return;}
  if(cls.contains('ep-cancel-btn')){renderADTPage();showToast('Changes discarded','info');return;}
  if(cls.contains('lp-logs-save-btn')){
    if(txt.indexOf('Approval')>=0){showToast('Document sent for approval');}
    else if(txt==='Update'){showToast('Updated successfully');}
    else{showToast('Saved successfully');}
    return;
  }
  if(cls.contains('lp-sb-view-edit-btn')){showToast('Fields are editable — make your changes and press Save','info');return;}
  // Downloads & uploads
  if(txt.indexOf('Download')>=0){showToast('Preparing download…','info');setTimeout(function(){showToast('Downloaded successfully');},900);return;}
  if(btn.title==='Upload'||txt==='Upload'){showToast('Document uploaded');return;}
  if(txt.indexOf('Create Invoice')>=0){startAddInvoice();return;}
  if(txt==='Refresh'){showToast('Refreshed','info');return;}
  if(btn.title==='Remove'){
    const row=btn.closest('[class*="row"], li')||btn.parentElement;
    if(row){row.remove();showToast('Removed');}
    return;
  }
  // "+ Add X" buttons (attachments, bank details, branches, roles, members…)
  if(/^\+?\s*Add\b/i.test(txt)){
    const what=txt.replace(/^\+?\s*Add\s*/i,'').trim()||'Item';
    showToast(what.charAt(0).toUpperCase()+what.slice(1)+' added');
    return;
  }
  if(btn.innerHTML.indexOf('M18.5 2.5')>=0){showToast('Fields are editable — make your changes and press Save','info');return;}
  if(txt==='Submit for Approval'){showToast('Submitted for approval');return;}
});

const notifData=[
  {name:'Your Invoice is ready for review',cid:'234',time:'22 sec ago',pending:true},
  {name:'Your contract is created',cid:'544',time:'1 min ago',pending:false},
  {name:'Your Invoice is ready for review',cid:'467',time:'2 min ago',pending:true},
  {name:'Your contract is created',cid:'321',time:'5 hrs ago',pending:false},
  {name:'Your Invoice is ready for review',cid:'675',time:'1 day ago',pending:true}
];
function toggleNotif(e){if(e)e.stopPropagation();closeAllHdrDD();notifOpen=!notifOpen;renderNotif();}
function notifMarkAllRead(){notifData.forEach(function(n){n.pending=false;});notifUpdateList();showToast('All notifications marked as read');}
/* Refresh spins its icon once and fades the list back in. Restarting the
   class (remove, reflow, add) lets a second click replay the spin. */
function notifRefresh(btn){
  if(btn){btn.classList.remove('is-spinning');void btn.offsetWidth;btn.classList.add('is-spinning');
    btn.addEventListener('animationend',function(){btn.classList.remove('is-spinning');},{once:true});}
  notifUpdateList();showToast('Notifications refreshed','info');
}
/* The switch and the list are updated IN PLACE. renderNotif() rebuilds the
   whole panel with innerHTML, which drew the switch already in its end state -
   its knob jumped instead of sliding - and swapped the list with no motion. */
function notifToggleUnread(btn){
  notifShowUnread=!notifShowUnread;
  btn.classList.toggle('on',notifShowUnread);
  btn.setAttribute('aria-checked',notifShowUnread?'true':'false');
  notifUpdateList();
}
/* A notification may name its readers (n.to); others do not see it. */
/* A notification is read in its own entity, by the accounts it names. */
function notifVisible(n){
  if(n.entity&&typeof idEntity==='function'&&n.entity!==idEntity())return false;
  return !n.to||(typeof idMe==='function'&&n.to.indexOf(idMe())>=0);
}
function notifListHTML(){
  const mine=notifData.filter(notifVisible);
  const list=notifShowUnread?mine.filter(n=>n.pending):mine;
  /* Each unread row carries its own "Mark as read" (a tick, under the time).
     Index into notifData, not into the filtered list, so the button still
     points at the right notification while "Only Show Unread" is on. */
  return list.map(n=>{const i=notifData.indexOf(n);
    const go=n.go?` is-link" role="button" tabindex="0" onclick="atReqOpenFromNotif(${i})" onkeydown="if(event.key==='Enter')atReqOpenFromNotif(${i})`:'';
    const r=n.req;
    /* A correction request reads as: what it is, who asked for which kind,
       then the day and who has to approve - not one run-on line. */
    const detail=r?`<div class="np-req-who"><b>${r.who}</b> · ${r.kind}</div>`
      +`<div class="np-req-facts"><span class="np-req-fact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${r.day}</span>`
      +`<span class="np-req-fact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${r.to}</span></div>`:'';
    return `<div class="np-item${n.pending?' is-unread':''}${go}${r?' is-req':''}" data-i="${i}"><div class="np-avatar">${n.ini||'N'}</div><div class="np-body"><div class="np-row1"><div class="np-text">${n.name}</div><div class="np-time">${n.time}</div></div>${detail}<div class="np-row2">${r?'':(n.sub||'Contract ID - '+n.cid)}${n.pending?'<span class="np-pending">Pending</span><button type="button" class="np-read" title="Mark as read" aria-label="Mark as read" onclick="event.stopPropagation();notifMarkRead('+i+',this)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Mark as read</span></button>':''}</div></div></div>`;
  }).join('')||'<div style="padding:24px;text-align:center;color:var(--gray);font-size:12px">No unread notifications</div>';
}
/* One notification read. With "Only Show Unread" on, the row slides out
   before the list is redrawn, so it is clear where it went. */
function notifMarkRead(i,btn){
  const n=notifData[i];if(!n||!n.pending)return;
  n.pending=false;
  const row=btn&&btn.closest('.np-item');
  if(notifShowUnread&&row&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    row.classList.add('is-leaving');notifSyncBell();
    setTimeout(function(){notifUpdateList(true);},220);
  }else notifUpdateList(true);
}
function notifUpdateList(quiet){
  notifSyncBell();
  const l=document.querySelector('#notif-pop .np-list');
  if(!l){renderNotif();return;}
  l.innerHTML=notifListHTML();
  if(quiet)return;     // one row changed in place: no need to fade the whole list
  l.classList.remove('np-list-in');void l.offsetWidth;l.classList.add('np-list-in');
}
/* The bell carries the unread count and says whether its panel is open, so
   the panel always reads as belonging to the button under it. */
function notifSyncBell(){
  const n=notifData.filter(x=>x.pending&&(typeof notifVisible!=='function'||notifVisible(x))).length;
  const b=document.getElementById('notif-badge');
  if(b)b.hidden=!n;
  const t=document.getElementById('notif-trigger');
  if(t){t.classList.toggle('is-open',!!notifOpen);t.setAttribute('aria-expanded',notifOpen?'true':'false');
    t.title=n?'Notifications ('+n+' unread)':'Notifications';}
}
function renderNotif(){
  const el=document.getElementById('notif-pop');if(!el)return;
  notifSyncBell();
  if(!notifOpen){el.classList.add('hidden');return;}
  el.classList.remove('hidden');
  el.innerHTML=`<div class="np-head"><div class="np-title">Notifications</div><div class="np-actions"><button class="np-iconbtn np-refresh" title="Refresh" aria-label="Refresh notifications" onclick="notifRefresh(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button><button class="np-iconbtn" onclick="toggleNotif()" title="Close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div></div>
  <div class="np-controls"><button class="np-mark" onclick="notifMarkAllRead()">Mark all as read</button><div class="np-toggle-row"><span>Only Show Unread</span><button type="button" class="np-switch ${notifShowUnread?'on':''}" role="switch" aria-checked="${notifShowUnread}" aria-label="Only show unread" onclick="event.stopPropagation();notifToggleUnread(this)"></button></div></div>
  <div class="np-list">${notifListHTML()}</div>`;
}
document.getElementById('notif-pop')?.addEventListener('click',e=>e.stopPropagation());
notifSyncBell();
document.addEventListener('click',e=>{if(notifOpen&&!e.target.closest('#notif-pop')&&!e.target.closest('#notif-trigger')){notifOpen=false;renderNotif();}});

// ── HEADER DROPDOWNS ──
function toggleHdrDD(id){
  const panel=document.getElementById(id);
  if(!panel)return;
  const isOpen=panel.classList.contains('open');
  closeAllHdrDD();
  if(!isOpen){
    panel.classList.add('open');
    const trigger=panel.previousElementSibling||panel.parentElement.querySelector('.company-sel,.user-sel');
    if(trigger){const chev=trigger.querySelector('.hdr-dd-chev');if(chev)chev.style.transform='rotate(180deg)';}
  }
}
/* ── LOGGED-IN ROLE ──
   Who is working. The employee lifecycle reads it to decide which steps this
   person can record (empRoleCan); Super Admin can record every step. */
let currentRole='Super Admin';
/* Only a role the signed-in account holds in this entity (Roles & Access). */
function setAppRole(r){
  /* Straight to the role: as yourself when you hold it, otherwise as a
     person who holds it in this entity (js/ems-access.js emsSwitchRole). */
  if(typeof emsSwitchRole==='function'){
    const sw=emsSwitchRole(r);
    if(!sw.ok){closeAllHdrDD();showToast('Role not available','error',sw.error);return false;}
  }
  currentRole=r;
  if(typeof emsSyncIdentity==='function')emsSyncIdentity();
  if(typeof notifSyncBell==='function')notifSyncBell();
  const label=typeof emsRoleLabel==='function'?emsRoleLabel(r):r;
  const who=typeof emsActorName==='function'?emsActorName():'';
  const lbl=document.getElementById('role-label');if(lbl)lbl.textContent=label;
  document.querySelectorAll('.role-dd-item').forEach(b=>b.classList.toggle('is-current',b.dataset.role===r));
  closeAllHdrDD();
  /* One click is the whole switch: a page this role cannot open gives way to the Dashboard. */
  if(typeof emsPageGuard==='function'&&typeof page!=='undefined'&&page!=='dashboard'&&emsPageGuard(page))page='dashboard';
  renderADTPage();
  if(typeof syncHeaderUser==='function')syncHeaderUser();
  if(typeof emsApplyChrome==='function')emsApplyChrome();
  showToast('Working as '+label+(who?' · '+who:''),'info','Access comes from the RBAC templates of this role'+(who?' and the teams of '+who+'. Actions are recorded under '+who+'.':'.'));
  return true;
}
function closeAllHdrDD(){
  document.querySelectorAll('.hdr-dd-panel.open').forEach(p=>{
    p.classList.remove('open');
    const wrap=p.closest('.hdr-dd-wrap');
    if(wrap){const chev=wrap.querySelector('.hdr-dd-chev');if(chev)chev.style.transform='';}
  });
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.hdr-dd-wrap'))closeAllHdrDD();
});

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ TOPBAR BUILDER ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
function buildTopbar(id,m){
  const el=document.getElementById(id);
  const pageLeft=`<div class="adt-logo"><img src="${window.__resources?.logo||'assets/logo.png'}" alt="Bhaiyaa"></div><span class="topbar-page">${getPageTitle(page)}</span><button class="page-add-btn" title="Add ${titleForAdd(page)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>`;
  const agentLeft=`<div class="adt-logo"><img src="${window.__resources?.logo||'assets/logo.png'}" alt="Bhaiyaa"></div><span style="font-size:13px;font-weight:600">Agent Mode</span><span class="badge">BETA</span>`;
  el.innerHTML=`<div class="topbar-left">${m==='agent'?agentLeft:pageLeft}</div>
  <div class="topbar-center"></div>
  <div class="topbar-right">
    <button class="tb-icon" onclick="openSearch()" title="Search (Ctrl+K)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
    <button class="tb-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>
    <div class="company-sel" style="font-size:12px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg> Dhi Hyperlocal <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>
    <div class="user-sel" style="font-size:12px"><div class="user-avatar-sm" style="width:24px;height:24px;font-size:9px">PP</div> Pallavi Parate</div>
    <button class="close-btn" onclick="closeAgent()" title="Exit Agent Mode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Close</button>
  </div>`;
}

// -- INPUT BAR BUILDER --
function buildInput(id,ph){
  const el=document.getElementById(id);
  el.innerHTML=`<div class="input-row">
    <div class="icon-btn" onclick="togglePlus('${id}')" style="position:relative"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      <div class="plus-dd" id="pdd-${id}">
        <div class="plus-dd-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload File</div>
        <div class="plus-dd-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Share Link</div>
        <div class="plus-dd-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Add URL</div>
      </div>
    </div>
    <input class="input-field" placeholder="${ph||'Ask anything or describe what you need...'}" onkeydown="if(event.key==='Enter')sendMsg('${id}')">
    <div style="position:relative">
      <div class="agent-sel" onclick="toggleAgent('${id}')"><svg class="agent-sp-icon" width="13" height="13" viewBox="0 0 24 24" fill="var(--orange)" stroke="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg><span class="agent-sel-dot" style="width:5px;height:5px;border-radius:50%;background:${agent==='contractor'?'var(--green)':'var(--gray)'};flex-shrink:0"></span><span class="agent-label">${agent==='contractor'?'Contractor Agent':'Payroll Agent'}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>
      <div class="agent-dd" id="add-${id}">
        <div class="agent-dd-hdr">Select Agent</div>
        <div class="agent-dd-item ${agent==='contractor'?'active':''}" onclick="pickAgent('contractor','${id}')"><span style="width:6px;height:6px;border-radius:50%;background:var(--green)"></span><div><div class="nm">Contractor Agent</div><div class="desc">Contracts, onboarding & compliance</div></div>${agent==='contractor'?'<span style="margin-left:auto;color:var(--orange);font-weight:700">&#10003;</span>':''}</div>
        <div class="agent-dd-item disabled"><span style="width:6px;height:6px;border-radius:50%;background:var(--gray)"></span><div><div class="nm">Payroll Agent</div><div class="desc">Salary, deductions & payslips</div></div><span class="coming-tag">Coming Soon</span></div>
      </div>
    </div>
    <button class="icon-btn" onclick="sendMsg('${id}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
  </div>`;
}

function togglePlus(id){const d=document.getElementById('pdd-'+id);d.classList.toggle('open');setTimeout(()=>document.addEventListener('click',function h(){d.classList.remove('open');document.removeEventListener('click',h);}),10);}
function toggleAgent(id){const d=document.getElementById('add-'+id);d.classList.toggle('open');setTimeout(()=>document.addEventListener('click',function h(){d.classList.remove('open');document.removeEventListener('click',h);}),10);}
function pickAgent(a,id){agent=a;document.getElementById('add-'+id).classList.remove('open');rebuildInputs();}
function rebuildInputs(){if(view==='agent-empty')buildInput('inp-empty');if(view==='agent-active')buildInput('inp-active');}

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ RENDER CHAT ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ RENDER CHAT ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
function renderChat(area,msgs){
  const el=document.getElementById(area);el.innerHTML='';
  msgs.forEach(m=>{const r=document.createElement('div');r.className='msg-row '+(m.role==='user'?'user':'');
    if(m.role==='bot')r.innerHTML=`<div class="bot-av"><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--orange)" stroke="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg></div>`;
    const b=document.createElement('div');b.className='bubble '+(m.role==='user'?'user':'bot');b.innerHTML=m.text;r.appendChild(b);
    if(m.role==='user')r.innerHTML+=`<div class="user-av">PP</div>`;
    el.appendChild(r);
  });el.scrollTop=el.scrollHeight;
}
function showTyping(area){const el=document.getElementById(area);const r=document.createElement('div');r.className='msg-row';r.id='typing';r.innerHTML=`<div class="bot-av"><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--orange)" stroke="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg></div><div class="bubble bot typing-dots"><span></span><span></span><span></span></div>`;el.appendChild(r);el.scrollTop=el.scrollHeight;}
function hideTyping(){const t=document.getElementById('typing');if(t)t.remove();}

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ FORM BUILDER ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
function buildStepper(active){
  const labels=['Eligibility','Profile','Job','Leaves','Review'];
  let html='<div class="stepper">';
  labels.forEach((l,i)=>{
    const cls=i<active?'done':(i===active?'active':'');
    const num=i<active?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':(i+1);
    html+=`<div class="step-dot ${cls}"><div class="sd-circle">${num}</div><div class="sd-label">${l}</div></div>`;
    if(i<labels.length-1)html+=`<div class="step-line ${i<active?'done':''}"></div>`;
  });
  html+='</div>';
  return html;
}
function selRadio(card){const grid=card.parentElement;[...grid.querySelectorAll('.choice-card')].forEach(c=>c.classList.remove('selected'));card.classList.add('selected');const inp=card.querySelector('input');if(inp)inp.checked=true;}
function buildForm(step){
  const col=document.getElementById('form-col');col.style.display='flex';col.innerHTML='';
  const fp=document.createElement('div');fp.className='form-panel';
  const s=formSteps[step];
  if(step===5){fp.innerHTML=`<div class="success-card"><div class="success-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><div class="success-meta">&#10022; Created by Contractor Agent</div><h2 style="font-size:24px;font-weight:700;margin-bottom:8px;letter-spacing:-.3px">Contract Created Successfully!</h2><p style="font-size:13px;color:var(--gray);margin-bottom:8px;max-width:380px;line-height:1.55">Your contract is ready. We've sent it to the employee for signature and notified your team.</p><div style="font-size:12.5px;color:var(--navy);margin-bottom:24px;font-weight:500"><span style="color:var(--gray)">Contract ID</span> <span style=ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âfont-weight:700ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â>#342124</span> &middot; Netherlands &middot; EOR &mdash; Employee</div><div style=ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âdisplay:flex;gap:10px;justify-content:centerÃƒÂ¢Ã¢â€šÂ¬Ã‚Â><button class=ÃƒÂ¢Ã¢â€šÂ¬Ã‚Âbtn btn-primaryÃƒÂ¢Ã¢â€šÂ¬Ã‚Â>View Contract &#8594;</button><button class="btn btn-secondary">All Contracts</button></div></div>`;col.appendChild(fp);return;}
  let header=`<div class="fp-shell">${buildStepper(step)}<div class="fp-title-row"><div class="fp-eyebrow">Step ${step+1} of 5 &middot; ${s.short}</div><div class="fp-h1">${s.title}</div><div class="fp-sub">${s.sub}</div></div></div>`;
  let body='';
  if(step===0){body=`<div class="section-block"><div class="section-head">Country & Nationality</div><div class="form-grid"><div class="form-field"><label class="form-label">Employee Nationality <span class="req">*</span></label>${customSelect('employee-nationality','Select Country',['Select Country','Netherlands','India','Germany'],'Select Country')}</div><div class="form-field"><label class="form-label">Working from <span class="req">*</span></label><input class="form-input readonly" value="&#127475;&#127473; Netherlands" readonly><span class="field-prefill">&#10022; Pre-filled by Agent</span></div></div></div><div class="section-block"><div class="section-head">Work Authorization</div><div class="choice-grid"><label class="choice-card selected" onclick="selRadio(this)"><input type="radio" name="auth" checked><div class="choice-radio"></div><div class="choice-body"><div class="choice-title">Yes, employee has a work permit</div><div class="choice-desc">They already hold a valid permit & BSN to work in Netherlands.</div></div></label><label class="choice-card" onclick="selRadio(this)"><input type="radio" name="auth"><div class="choice-radio"></div><div class="choice-body"><div class="choice-title">ADT to assist with work visa</div><div class="choice-desc">We'll handle visa sponsorship & onboarding paperwork on your behalf.</div></div></label></div></div><div class="info-box tip"><div class="ib-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></div><div><strong>Netherlands compliance note</strong>All employees need a BSN (Citizen Service Number) and a valid work permit before their start date.</div></div>`;}
  else if(step===1){body=`<div class="section-block"><div class="section-head">Personal details</div><div class="form-grid"><div class="form-field"><label class="form-label">First name <span class="req">*</span></label><input class="form-input" placeholder="e.g. Anika"></div><div class="form-field"><label class="form-label">Last name <span class="req">*</span></label><input class="form-input" placeholder="e.g. Shah"></div><div class="form-field"><label class="form-label">Gender <span class="req">*</span></label>${customSelect('employee-gender','Select Gender',['Select Gender','Female','Male','Non-binary','Prefer not to say'],'Select Gender')}</div><div class="form-field"><label class="form-label">Date of birth <span class="req">*</span></label><input class="form-input" placeholder="DD / MM / YYYY"></div></div></div><div class="section-block"><div class="section-head">Contact</div><div class="form-grid"><div class="form-field"><label class="form-label">Email address <span class="req">*</span></label><input class="form-input" placeholder="name@company.com"></div><div class="form-field"><label class="form-label">Mobile number <span class="req">*</span></label><input class="form-input" placeholder="+91  Enter mobile number"></div></div><div class="form-grid full" style="margin-top:16px"><div class="form-field"><label class="form-label">Address</label><input class="form-input" placeholder="Street, city, postal code, country"></div></div></div>`;}
  else if(step===2){body=`<div class="section-block"><div class="section-head">Role</div><div class="form-grid"><div class="form-field"><label class="form-label">Job title <span class="req">*</span></label><input class="form-input" placeholder="e.g. Senior Software Engineer"></div><div class="form-field"><label class="form-label">Primary skill <span class="req">*</span></label><input class="form-input" placeholder="e.g. Backend, Python"></div></div><div class="form-grid full" style="margin-top:16px"><div class="form-field"><label class="form-label">Job description</label><input class="form-input" placeholder="Briefly describe responsibilities (max 100 words)"><span class="field-hint">A short summary of duties and expectations.</span></div></div></div><div class="section-block"><div class="section-head">Employment type</div><div class="form-grid"><div class="form-field"><label class="form-label">Employment term</label>${ciRadio('cw-emp-term',['Permanent','Fixed term'],'Permanent')}</div><div class="form-field"><label class="form-label">Employee type</label>${ciRadio('cw-emp-time',['Full time','Part time'],'Full time')}</div></div><div class="form-grid" style="margin-top:16px"><div class="form-field"><label class="form-label">From date <span class="req">*</span></label><input class="form-input" placeholder="DD / MM / YYYY"></div><div class="form-field"><label class="form-label">To date</label><input class="form-input" placeholder="Optional &middot; DD / MM / YYYY"></div></div></div><div class="section-block"><div class="section-head">Schedule & compensation</div><div class="form-grid"><div class="form-field"><label class="form-label">Work schedule</label><div class="input-suffix"><input value="40"><span class="sfx">hours / week</span></div></div><div class="form-field"><label class="form-label">Pay frequency <span class="req">*</span></label>${customSelect('pay-frequency','Monthly',['Monthly','Bi-weekly','Weekly'],'')}</div></div><div class="form-grid full" style="margin-top:16px"><div class="form-field"><label class="form-label">Pay amount <span class="req">*</span></label><div class="pay-group">${customSelect('pay-currency','INR &#8377;',['INR &#8377;','EUR &#8364;','USD $'],'','currency-select')}<input value="70,000"></div><span class="field-hint">Gross pay before taxes & deductions.</span></div></div></div>`;}
  else if(step===3){body=`<div class="section-block"><div class="section-head">Leave entitlement</div><p style="font-size:12px;color:var(--gray);margin-bottom:14px;line-height:1.5">Pre-filled to Netherlands statutory minimums. Add more days if you'd like to offer above the legal floor.</p><table class="leave-table"><thead><tr><th>Leave type</th><th>Mandatory</th><th>Additional</th><th style="text-align:right">Total</th></tr></thead><tbody><tr><td class="lt-name">Annual leaves</td><td>18 days</td><td class="lt-add">+ Add days</td><td class="lt-total" style="text-align:right">18 days</td></tr><tr><td class="lt-name">Sick leaves</td><td>12 days</td><td>06 days</td><td class="lt-total" style="text-align:right">18 days</td></tr><tr><td class="lt-name">Maternity leaves</td><td>36 weeks</td><td>02 weeks</td><td class="lt-total" style="text-align:right">38 weeks</td></tr></tbody></table><button class="add-link"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add another leave type</button></div><div class="section-block"><div class="section-head">Probation & notice</div><div class="form-grid"><div class="form-field"><label class="form-label">Probation period</label><div class="input-suffix"><input value="3"><span class="sfx">months</span></div><span class="field-hint">A 1-month gross salary deposit will be invoiced.</span></div><div class="form-field"><label class="form-label">Notice period</label><div class="input-suffix"><input value="3"><span class="sfx">months</span></div><span class="field-hint">Standard for Netherlands EOR contracts.</span></div></div></div>`;}
  else if(step===4){body=`<div class="review-section"><div class="review-title">Eligibility <button class="review-edit" onclick="editReviewStep(0)">Edit &#8599;</button></div><div class="review-grid"><div class="review-row"><div class="rr-label">Employee Nationality</div><div class="rr-val">Netherlands</div></div><div class="review-row"><div class="rr-label">Working from</div><div class="rr-val">Netherlands</div></div><div class="review-row"><div class="rr-label">Work authorization</div><div class="rr-val">Has work permit</div></div></div></div><div class="review-section"><div class="review-title">Employee Information <button class="review-edit" onclick="editReviewStep(1)">Edit &#8599;</button></div><div class="review-grid"><div class="review-row"><div class="rr-label">Full name</div><div class="rr-val empty">to be filled</div></div><div class="review-row"><div class="rr-label">Email</div><div class="rr-val empty">to be filled</div></div><div class="review-row"><div class="rr-label">Mobile</div><div class="rr-val empty">to be filled</div></div><div class="review-row"><div class="rr-label">Date of birth</div><div class="rr-val empty">to be filled</div></div></div></div><div class="review-section"><div class="review-title">Job Details <button class="review-edit" onclick="editReviewStep(2)">Edit &#8599;</button></div><div class="review-grid"><div class="review-row"><div class="rr-label">Employment</div><div class="rr-val">Permanent &middot; Full time</div></div><div class="review-row"><div class="rr-label">Pay amount</div><div class="rr-val">INR 70,000 / Monthly</div></div><div class="review-row"><div class="rr-label">Work schedule</div><div class="rr-val">40 hours / week</div></div><div class="review-row"><div class="rr-label">Job title</div><div class="rr-val empty">to be filled</div></div></div></div><div class="review-section"><div class="review-title">Other Details <button class="review-edit" onclick="editReviewStep(3)">Edit &#8599;</button></div><div class="review-grid"><div class="review-row"><div class="rr-label">Annual leaves</div><div class="rr-val">18 days</div></div><div class="review-row"><div class="rr-label">Sick leaves</div><div class="rr-val">18 days</div></div><div class="review-row"><div class="rr-label">Probation</div><div class="rr-val">3 months</div></div><div class="review-row"><div class="rr-label">Notice period</div><div class="rr-val">3 months</div></div></div></div><div class="info-box tip"><div class="ib-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg></div><div><strong>You're almost there</strong>Submit to draft this contract &mdash; we'll send it for signature &amp; notify your team.</div></div>`;}
  const isLast=step===4;
  const backBtn=step>0?'<button class="btn btn-secondary" onclick="prevStep()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg> Back</button>':'<span></span>';
  const nextLabel=isLast?'Submit Contract':'Continue';
  const nextCls=isLast?'btn btn-success':'btn btn-primary';
  const prefill=step===0?'<div class="prefill-text"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg> Agent pre-filled Netherlands for you</div>':'<div style="font-size:11.5px;color:var(--gray)">Step '+(step+1)+' of 5</div>';
  const _ck=String.fromCharCode(10003),_ar=String.fromCharCode(8594);const footer='<div class="fp-foot"><div class="form-footer">'+backBtn+prefill+'<button class="'+nextCls+'" onclick="nextStep()">'+nextLabel+(isLast?' '+_ck:' '+_ar)+'</button></div></div>';
  fp.innerHTML=header+'<div class="fp-body">'+body+'</div>'+footer;col.appendChild(fp);
}

function editReviewStep(step){returnToReview=true;formStep=step;buildForm(step);}
function nextStep(){if(returnToReview&&formStep<4){returnToReview=false;formStep=4;buildForm(4);return;}formStep++;if(formStep<=5){if(formStep===5){const col=document.getElementById('form-col');col.style.display='flex';col.innerHTML='<div class="contract-loader"><div class="cl-spinner"></div><div class="cl-title">Creating Contract...</div><div class="cl-sub">Setting up EOR agreement for Netherlands</div></div>';setTimeout(()=>{buildForm(5);agentMsgs.push({role:'bot',text:String.fromCodePoint(127881)+' Contract created successfully! Contract ID: <b>#342124</b> for Netherlands (EOR). You can view it anytime from the Contracts page.'});renderChat('agent-chat',agentMsgs);},2500);}else{buildForm(formStep);}}}
function prevStep(){if(formStep>0){formStep--;buildForm(formStep);}}

// ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ NAVIGATION ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
function showView(v){document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));document.getElementById('v-'+v).classList.add('active');view=v;}

/* buildSidebar() replaces the rail's contents, so the new nav simply appeared
   while the width was still animating - the width glided and everything inside
   it popped. This marks the rail for the length of the move; motion.css fades
   the new items in behind that class, and ONLY behind that class, so the
   rebuilds that happen on every filter change stay as still as they are now.
   The timer is cleared per rail, or a fast second click would strip the class
   off the move that is still running. */
var sbToggleTimers={};
function sbMarkToggling(id){
  const el=document.getElementById(id);if(!el)return;
  clearTimeout(sbToggleTimers[id]);
  el.classList.add('sb-toggling');
  sbToggleTimers[id]=setTimeout(function(){el.classList.remove('sb-toggling');},420);
}
/* ── SMALL SCREENS: THE RAIL FOLDS ITSELF ──
   Below 1024px a 224px rail leaves the page too little room, so it folds to its
   62px icon strip on its own, and opens back up when the window grows again -
   unless the reader folded or opened it themselves in between, which is theirs
   to keep. On a phone (640px and below) an opened rail lies OVER the page (CSS)
   rather than squeezing it, so picking a page folds it away again. */
const SB_NARROW_MQ=window.matchMedia('(max-width:1024px)');
const SB_PHONE_MQ=window.matchMedia('(max-width:640px)');
let sbAutoFolded=false;
function sbFitViewport(){
  if(SB_NARROW_MQ.matches&&!adtSidebarCollapsed){adtSidebarCollapsed=true;sbAutoFolded=true;}
  else if(!SB_NARROW_MQ.matches&&sbAutoFolded){adtSidebarCollapsed=false;sbAutoFolded=false;}
  else return false;
  return true;
}
function sbFoldOnPhone(){
  if(!SB_PHONE_MQ.matches||adtSidebarCollapsed)return;
  adtSidebarCollapsed=true;sbAutoFolded=true;
  buildSidebar('adt-sidebar',true,getSidebarActivePage(page));
}
SB_NARROW_MQ.addEventListener('change',function(){
  if(sbFitViewport())buildSidebar('adt-sidebar',adtSidebarCollapsed,getSidebarActivePage(page));
});
function toggleSidebar(scope){
  if(scope==='adt'){adtSidebarCollapsed=!adtSidebarCollapsed;sbAutoFolded=false;buildSidebar('adt-sidebar',adtSidebarCollapsed,getSidebarActivePage(page));sbMarkToggling('adt-sidebar');return;}
  agentSidebarCollapsed=!agentSidebarCollapsed;buildSidebar('agent-sb',agentSidebarCollapsed,page);buildTopbar('agent-topbar-active','agent');sbMarkToggling('agent-sb');
}

function openAgent(){hideAgentWorkspaceButton();showView('agent-empty');mode='agent';buildTopbar('agent-topbar-empty','agent');buildInput('inp-empty');buildQuickActions();setTimeout(initAmThreeJS,80);}
function closeAgent(){stopAmThreeJS();hideAgentWorkspaceButton();showView('adt');renderADTPage();}

function dashboardBackHTML(){
  return cameFromDashboard?'<button class="ep-back" style="margin:0 0 14px" onclick="navigatePage(\'dashboard\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to Dashboard</button>':'';
}
// Keep the sidebar accordion in sync when navigation happens from outside the
// sidebar (dashboard cards, search, deep links) so the owning group is expanded.
function syncSidebarDropdown(pg){
  const target=getSidebarActivePage(pg);
  const group=getSidebarItems().find(it=>it.dropdown&&(it.children||[]).some(c=>c.id===target));
  if(!group)return;
  activeSidebarItem=target;
  if(openDropdowns.has(group.dropdown))return;
  openDropdowns.clear();openDropdowns.add(group.dropdown);
}
function navigatePage(pg,fromDashboard){
  if(sbLeaveGuard(sbAnyDraft(),function(){navigatePage(pg,fromDashboard);}))return;
  /* Entering Contracts from the sidebar starts at the type chooser. Arriving
     from a dashboard tile does not: openDashCard has already applied a status
     filter and cleared this flag, and re-raising the gate here would throw
     that choice away - apply() runs before navigatePage(), so this guard is
     what keeps the two in the right order. */
  if(pg==='contracts'&&!fromDashboard)ctLandingOpen=true;
  /* HR Docs opens on its cards, not on whichever type was open last. */
  if(pg==='hr-docs'&&typeof hdocReset==='function')hdocReset();
  ctStatusModal=null;   // a half-made status move never follows you to another page
  empStatusModal=null;
  sbEditing=null;   // an edit left open belongs to the page being left
  sbFoldOnPhone();  // a rail opened over the page on a phone closes once a page is picked
  if(typeof eaOpen!=='undefined'){eaOpen=false;}
  if(typeof tmCreateOpen!=='undefined'){tmCreateOpen=false;}
  /* Employee lifecycle redirects (Add Asset, Upload Documents...) carry a
     return context; a plain navigation drops it. */
  if(typeof empNavHook==='function')empNavHook(pg);
  prCreateOpen=false;pmCreateOpen=false;
  page=pg;
  syncSidebarDropdown(pg);
  if(typeof syncHeaderUser==='function')syncHeaderUser();
  cameFromDashboard=!!fromDashboard;
  if(view==='adt'){renderADTPage();return;}
  if(view==='agent-active'){showAgentModule(pg);return;}
}

/* ══ DETAIL PANEL: SWITCHING A TAB REPLACES THE BODY, NOTHING ELSE ════════
   Every one of the sixteen detail panels used to answer a tab click with

       inner.innerHTML = renderXSidebar();

   which throws away and rebuilds the ENTIRE panel - the back button, the tab
   strip, the scroll arrows, the close button - in order to change the one
   thing below them. Everything visibly reloaded to swap a form. The tab strip
   lost its horizontal scroll position, anything focused was blurred, and the
   active-tab box could not animate because the element carrying it no longer
   existed a frame later.

   isbTab() still calls the same builder - the builders are untouched - but it
   takes only the .lp-isb-body out of the result and swaps that one node in.
   The tab strip is left alone entirely; its buttons just have the .active
   class moved between them, in place.

   THE FALLBACK IS THE POINT. A panel whose tab strip does not match the one
   already on screen - a different set of tabs, a different order - is not a
   tab switch at all, and gets the old wholesale replacement. Same for any
   panel that does not follow the shared tabbar/body shape. This can degrade
   to exactly the previous behaviour; it can never render the wrong panel.
   ═══════════════════════════════════════════════════════════════════════ */
/* == A DETAIL PANEL THAT THROWS MUST SAY SO ================================

   THE FAILURE THIS EXISTS FOR. Every detail panel is a render function that
   reads a record and returns markup. Opening one does two things in order: it
   puts the 'open' class on the panel, then it renders the body into it. So a
   render function that THROWS leaves the first half done and the second half
   never run — a large empty white sheet, no message on screen, and an
   exception in a console nobody has open. Three panels shipped that way for
   months (Pay Runs, Teams, Global Employee) because each used one icon it had
   never declared: a mistake that survives `node --check` and only fires when
   that exact panel is opened.

   The markup is now produced through here instead. A throw becomes a readable
   panel and a console error, so the next one is found the first time it is
   seen rather than reported as "the sidebar keeps going blank". */
function sbRender(render,label){
  try{return render()||'';}
  catch(err){
    if(typeof console!=='undefined'&&console.error)
      console.error('Detail panel failed to render'+(label?' ['+label+']':'')+':',err);
    return '<div class="lp-isb-body"><div class="sb-render-error">'
      +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12.01" y2="16.5"/></svg>'
      +'<b>This panel could not be opened.</b>'
      +'<span>'+String((err&&err.message)||err).replace(/</g,'&lt;')+'</span>'
      +'</div></div>';
  }
}
/* == MOVING ROW TO ROW KEEPS THE TAB =======================================
   Someone reading the Logs of one record and clicking the next row in the
   listing is comparing Logs with Logs. Throwing them back to Basic Details on
   every click made that a two-click job per row. So the tab carries over when
   the panel is ALREADY open; a panel opening from closed still starts on the
   default, because there is no tab to carry.

   `prevId` is the record the panel was showing before this click (null when
   closed). An explicit tab - a dashboard tile or a row menu asking for Logs -
   always wins, and is passed straight through by the callers. */
function sbKeepTab(prevId,curTab,def){
  return prevId!=null&&curTab?curTab:(def||'basic-details');
}
let isbTabFixing=false;
function isbTab(prefix,render){
  var inner=document.getElementById(prefix+'-isb-inner');
  if(!inner)return;
  var oldBody=inner.querySelector('.lp-isb-body');
  var oldTabs=inner.querySelector('.lp-isb-tabs');

  var tpl=document.createElement('div');
  tpl.innerHTML=sbRender(render,prefix);
  var newBody=tpl.querySelector('.lp-isb-body');
  var newTabs=tpl.querySelector('.lp-isb-tabs');
  /* A changed form on the tab being left is put aside, not dropped. */
  var actOf=function(t){var x=t&&t.querySelector('.lp-isb-tab.active');return x?sbTabIdOf(x):'';};
  sbStashBefore(prefix,oldBody,actOf(oldTabs),actOf(newTabs));

  if(!oldBody||!newBody||!oldTabs||!newTabs||!sameTabs(oldTabs,newTabs)){
    inner.innerHTML=tpl.innerHTML;
  }else{
    oldBody.replaceWith(newBody);
    /* Move the highlight without touching the buttons themselves. */
    var a=oldTabs.querySelectorAll('.lp-isb-tab'),b=newTabs.querySelectorAll('.lp-isb-tab');
    for(var i=0;i<a.length;i++){
      a[i].classList.toggle('active',b[i].classList.contains('active'));
      /* The label is the same, but a mark on it (the Requests tab's pending
         dot) belongs to the record now shown, not the one before it. */
      if(a[i].innerHTML!==b[i].innerHTML)a[i].innerHTML=b[i].innerHTML;
    }
  }
  sbRestoreAfter(prefix,inner);
  sbMarkDraftTabs();
  /* The carried-over tab may not exist on this record - a ticket with no chat
     has no Conversation tab, an entity of another kind has a different strip.
     Then nothing in the strip is active, and the panel goes to its first tab
     through that tab's own button, so each module's own nav function does
     whatever else switching tab involves. Guarded so it can only happen once. */
  var strip=inner.querySelector('.lp-isb-tabs');
  if(strip&&!isbTabFixing&&!strip.querySelector('.lp-isb-tab.active')){
    var first=strip.querySelector('.lp-isb-tab');
    if(first){isbTabFixing=true;try{first.click();}finally{isbTabFixing=false;}return;}
  }
  isbRevealTab(prefix);
}

function sameTabs(oldTabs,newTabs){
  var a=oldTabs.querySelectorAll('.lp-isb-tab'),b=newTabs.querySelectorAll('.lp-isb-tab');
  if(!a.length||a.length!==b.length)return false;
  for(var i=0;i<a.length;i++)if(a[i].textContent!==b[i].textContent)return false;
  return true;
}

/* 'nearest', not 'start'. Scrolling the chosen tab to the left edge made sense
   when the strip was being rebuilt anyway; against a strip that now stays put
   it would yank the whole row sideways on every click. This only scrolls when
   the tab is actually out of view. */
function isbRevealTab(prefix){
  requestAnimationFrame(function(){
    var t=document.getElementById(prefix+'-isb-tabs');
    if(!t)return;
    var a=t.querySelector('.lp-isb-tab.active');
    if(a)a.scrollIntoView({inline:'nearest',block:'nearest'});
  });
}

/* ══ DASHBOARD CARDS THAT OPEN SOMETHING ══════════════════════════════════
   Every dashboard tile counts records that live somewhere - or it doesn't.
   "Pending Requests 8" is eight rows on All Leaves. "Total Invoiced ₹14.3L"
   is a sum with no list behind it. This table is where that call is made, so
   it is made ONCE for a label rather than fifty-one times in the markup, and
   so a label that appears on four dashboards ("Pending Invoices" does) cannot
   drift into behaving differently on each of them.

   Keyed on the tile's own label text. Every label not in here is a static
   tile; the two are styled apart in css/dashboard-multiview.css.

   [page, filter] - filter is optional and only ever a value the destination's
   own filter control can actually produce, so landing there shows a list the
   user could have reached by hand. Where a card's wording has no equivalent
   in the destination's vocabulary ("Escalated Tickets" is not a ticket status)
   it links unfiltered rather than inventing one. */
var DASH_CARD_LINK={
  /* people */
  'Total Employees':              ['employees'],
  'Total Workforce':              ['employees'],
  'Active People':                ['employees'],
  'My Team':                      ['teams'],
  'Present Today':                ['attendance'],
  /* leave */
  'Leave Balance':                ['all-leaves'],
  'On Leave today':               ['all-leaves','Approved'],
  'On Leave Today':               ['all-leaves','Approved'],
  'Pending Requests':             ['all-leaves','Pending'],
  'Pending Approvals':            ['all-leaves','Pending'],
  /* contracts - Onboarding and Ready for Payroll are both real ctFlow stages */
  'Contracts':                    ['contracts'],
  'Active Contracts':             ['contracts'],
  'Onboarding Pending':           ['contracts','Onboarding'],
  'Ready for Payroll':            ['contracts','Ready for Payroll'],
  /* money - counts of invoices, not sums of them */
  'Pending Invoices':             ['payments','__pending_group__'],
  'Paid Invoices':                ['payments','Paid'],
  'Paid This Month':              ['payments','Paid'],
  'Overdue Invoices':             ['payments','Unpaid'],  /* overdue ⊂ unpaid */
  /* the rest */
  'Tickets':                      ['support-tickets'],
  'Escalated Tickets':            ['support-tickets'],
  'Compliance Items':             ['compliance'],
  'Latest Payslip':               ['payroll']
};

/* Each destination keeps its filter in its own global. Setting it to '' is
   as important as setting it to a value: arriving from a card must never
   inherit the filter left behind by the last visit. */
var DASH_CARD_FILTER={
  'all-leaves':      function(v){alStatusFilter=v;alSelectedId=null;},
  'payments':        function(v){pmInvoiceStatusFilter=v;pmSelectedId=null;},
  /* A dashboard tile names a status, so the type question is already answered
     as "whichever type is in this state" - skip the chooser and show rows. */
  'contracts':       function(v){ctQuickStatusFilter=v;ctSelectedId=null;ctTypeFilter=CT_TYPE_ALL;ctLandingOpen=false;},
  'support-tickets': function(v){tkQuickStatusFilter=v;tkSelectedId=null;},
  'compliance':      function(v){complianceStatusFilter=v;complianceSelectedId=null;}
};

function openDashCard(label){
  var target=DASH_CARD_LINK[label];
  if(!target)return false;
  var apply=DASH_CARD_FILTER[target[0]];
  if(apply)apply(target[1]||'');
  navigatePage(target[0],true);
  return true;
}

/* ── A DASHBOARD ROW OPENS ITS OWN RECORD ──
   A row on a dashboard names one record, so clicking it has to land on THAT
   record — not on the top of a listing where it may be filtered out, on page
   3, or not selected. Every row used to call navigatePage(listing) and stop.

   dashOpenRecord does the three things that make the row findable:
     1. clears the listing's filters and search (a filter left over from the
        last visit could hide the row),
     2. turns to the page the row is on,
     3. opens its detail panel on Basic Details and scrolls the row into view.
   `row` is the listing's row-id prefix, `key` its listPage key. */
var DASH_RECORD={
  'all-leaves':{row:'al-row-',key:'all-leaves',
    clear:function(){alStatusFilter='';alSearchQuery='';},
    open:function(id){alSelectedId=id;openAlSidebar(id,'basic-details');}},
  'payments':{row:'pm-row-',key:'payments',
    clear:function(){pmInvoiceStatusFilter='';pmDateFilter='';pmSearchQuery='';},
    open:function(id){pmSelectedId=id;openPmSidebar(id,'basic-details');}},
  'support-tickets':{row:'tk-row-',key:'support-tickets',
    clear:function(){tkQuickStatusFilter='';tkChannelFilter='';tkSearchQuery='';},
    open:function(id){tkSelectedId=id;openTkSidebar(id,'basic-details');}},
  'chats':{row:'chat-row-',key:'chats',
    clear:function(){chatQuickStatusFilter='';chatSearchQuery='';},
    open:function(id){chatSelectedId=id;openChatSidebar(id,'basic-details');}},
  'contracts':{row:'ct-row-',key:'contracts',
    clear:function(){ctQuickStatusFilter='';ctCountryFilter='';ctSearchQuery='';ctTypeFilter=CT_TYPE_ALL;ctLandingOpen=false;},
    open:function(id){ctSelectedId=id;openCtSidebar(id,'basic-details');}},
  'compliance':{row:'cmp-row-',key:'compliance',
    clear:function(){complianceCountryFilter='';complianceModelFilter='';complianceStatusFilter='';complianceSearchQuery='';},
    open:function(id){complianceSelectedId=id;complianceTab='basic-details';openComplianceSidebar(id);}}
};
function dashOpenRecord(listing,id){
  var c=DASH_RECORD[listing];
  if(!c){navigatePage(listing,true);return;}
  c.clear();
  navigatePage(listing,true);
  /* After the listing has painted: its rows and panel only exist then. */
  setTimeout(function(){
    var rowId=c.row+id;
    if(!document.getElementById(rowId)){
      for(var n=1;n<=50;n++){
        listPageNo[c.key]=n;renderADTPage();
        if(document.getElementById(rowId))break;
      }
    }
    c.open(id);
    var row=document.getElementById(rowId);
    if(row)row.scrollIntoView({block:'nearest'});
  },0);
}

/* One delegated listener rather than fifty-one inline onclicks - and it takes
   the keyboard too, since a tile that is a button to the mouse has to be one
   to everything else. Space is prevented so it opens the card instead of
   scrolling the dashboard under it. */
document.addEventListener('click',function(e){
  var card=e.target.closest&&e.target.closest('.hr-stat-card.is-link');
  if(!card)return;
  var lab=card.querySelector('.hr-stat-label');
  if(lab)openDashCard(lab.textContent.trim());
});
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  var card=document.activeElement;
  if(!card||!card.classList||!card.classList.contains('is-link'))return;
  if(!card.classList.contains('hr-stat-card'))return;
  e.preventDefault();
  var lab=card.querySelector('.hr-stat-label');
  if(lab)openDashCard(lab.textContent.trim());
});

/* == A TILE MUST COUNT WHAT ITS CLICK REVEALS ==============================

   THE FAILURE THIS EXISTS FOR. The dashboard tiles were written as static
   markup with the numbers typed in. "Ready for Payroll 25" sat next to a
   contracts list holding four records, none of them at that stage, so clicking
   the tile landed on an empty table. Two tiles labelled "Compliance Items"
   even disagreed with each other — 9 on one dashboard, 14 on another.

   A typed number is a claim nobody re-checks. So the linked tiles no longer
   carry one: each is filled in from the SAME data its click will show, through
   the SAME filter DASH_CARD_FILTER applies. There is one source, so the two
   cannot drift apart.

   ONLY THE LINKED TILES. A static tile has nowhere to go and nothing to
   disagree with. And a tile whose value is not a row count — "Latest Payslip
   Apr", "Paid This Month ₹8.25L" — is left exactly as authored: there is no
   list of things to count, and overwriting it with a number would be worse
   than the number being stale. Anything with no counter here is left alone. */
/* Tiles whose number is NOT a count of what their click shows, so counting
   them would trade a stale number for a wrong one:

     Leave Balance      a number of DAYS, not a number of leave requests.
     Escalated Tickets  the ticket data models no escalation, so the tile
                        links to the unfiltered list; counting it would
                        report every ticket as escalated.

   Both keep their authored number and stay linked. The honest fix for the
   second is a real escalated flag on tickets, which is a data change, not a
   dashboard one. */
var DASH_CARD_NO_COUNT={'Leave Balance':1,'Escalated Tickets':1};
var DASH_CARD_COUNT={
  /* Each of these mirrors its listing's own filter line, and is verified
     against it by the test suite rather than by eye. */
  'contracts':       function(v){return (v?contractsData.filter(function(x){return x.status===v;}):contractsData).length;},
  'all-leaves':      function(v){return (v?allLeavesData.filter(function(x){return x.status===v;}):allLeavesData).length;},
  'compliance':      function(v){return (v?complianceItemsData.filter(function(x){return x.status===v;}):complianceItemsData).length;},
  'payments':        function(v){
    if(!v)return paymentsData.length;
    if(v==='__pending_group__')return paymentsData.filter(function(p){return p.invoiceStatus==='Unpaid'||p.invoiceStatus==='Pending';}).length;
    return paymentsData.filter(function(p){return p.invoiceStatus===v;}).length;
  },
  'support-tickets': function(v){
    var was=tkQuickStatusFilter;tkQuickStatusFilter=v||'';
    var n=tkRows().length;tkQuickStatusFilter=was;return n;   // its own row-getter, so the two agree by construction
  },
  'teams':           function(){return teamsData.length;},
  'employees':       function(){return empPool.length;}
};
/* ── EMPLOYEE DASHBOARD: ANNOUNCEMENTS ─────────────────────────────────────
   What HR and the employee's manager have posted, read by js/announcements.js
   into the Latest Updates panel under Key Metrics. One post:
     from      'hr' | 'manager'   - decides the avatar colour and the role word
     author    who posted it
     title, text
     category  optional neutral tag ('Holiday', 'Policy', 'Team'…)
     pinned    optional - an amber "Pinned" tag
     when      ISO date-time it was posted; sorted on, and shown as
               "2 hours ago" against the clock
   An empty list is a real state, not an error: the panel says the employee is
   caught up. */
const empAnnouncements=[
  {from:'hr',author:'Priya Sharma',title:'Diwali holiday announced',category:'Holiday',pinned:true,when:'2026-10-12T09:30:00',
   text:'The office will remain closed on 8 Nov for Diwali. Please plan your deliverables and update your timesheets before the break.'},
  {from:'manager',author:'Rajan Kumar',title:'Sprint planning moved to Thursday',category:'Team',when:'2026-10-11T16:10:00',
   text:'This week’s sprint planning is moving to Thursday at 11:00 AM. Bring your estimates for the open tickets on the board.'},
  {from:'hr',author:'Priya Sharma',title:'Updated leave policy for 2027',category:'Policy',when:'2026-10-09T11:00:00',
   text:'We’ve revised the carry-forward rules for earned leave. Read the updated policy under Leave Policies before the end of the quarter.'},
  {from:'manager',author:'Rajan Kumar',title:'Great work on the October release',category:'Team',when:'2026-10-07T18:20:00',
   text:'Thanks, everyone, for the push on the October release — it shipped on time with zero rollbacks. Team lunch is on Friday at 1:00 PM.'},
  {from:'hr',author:'Priya Sharma',title:'Annual health check-up camp',category:'Wellness',when:'2026-10-05T10:00:00',
   text:'A free health check-up camp will be held in the Hyderabad office on 20 Oct. Register through the HR desk by 17 Oct to book your slot.'}
];
/* Runs after the dashboard paints. Writes only where a counter exists and the
   tile currently holds something that looks like a plain count, so a value
   tile is never clobbered by a row total. */
function syncDashCardCounts(root){
  var scope=root||document;
  var cards=scope.querySelectorAll?scope.querySelectorAll('.hr-stat-card.is-link'):[];
  Array.prototype.forEach.call(cards,function(card){
    var lab=card.querySelector('.hr-stat-label');
    var num=card.querySelector('.hr-stat-number');
    if(!lab||!num)return;
    var label=lab.textContent.trim();
    if(DASH_CARD_NO_COUNT[label])return;
    var target=DASH_CARD_LINK[label];
    if(!target)return;
    var count=DASH_CARD_COUNT[target[0]];
    if(!count)return;
    /* A tile showing "Apr" or "₹8.25L" is not a row count and is not ours to
       rewrite, even where its destination happens to be countable. */
    if(!/^\d+$/.test(num.textContent.trim()))return;
    try{num.textContent=String(count(target[1]||''));}catch(e){}
  });
}

function buildQuickActions(){
  const g=document.getElementById('qa-grid');g.innerHTML='';
  [{l:'Cost Calculator',d:'Estimate costs across countries',i:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/></svg>'},{l:'Create Contract',display:'Onboard an Employee',d:'Create contract for employee',i:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'}].forEach(a=>{
    const c=document.createElement('div');c.className='action-card';
    c.innerHTML=`<div class="ac-icon">${a.i}</div><div><div class="ac-label">${a.display||a.l}</div><div class="ac-desc">${a.d}</div></div>`;
    c.onclick=()=>quickAction(a.l);g.appendChild(c);
  });
}

function quickAction(label){
  formStep=-1;
  const txt=label==='Create Contract'?'Create Contract':`I want to use ${label}`;
  agentMsgs.push({role:'user',text:txt});
  showView('agent-active');buildTopbar('agent-topbar-active','agent');buildSidebar('agent-sb',agentSidebarCollapsed,page);renderChat('agent-chat',agentMsgs);buildInput('inp-active');showWorkspaceEmpty();
  showTyping('agent-chat');
  setTimeout(()=>{hideTyping();
    if(label==='Create Contract'){
      agentMsgs.push({role:'bot',text:'Sure. Which country should I use for this contract? Type something like <b>create contract in Netherlands</b> and I will open the workspace.'});
    }else{agentMsgs.push({role:'bot',text:`Sure! Let me set up the ${label} for you. Which country would you like to start with?`});}
    renderChat('agent-chat',agentMsgs);
  },1200);
}
// == CONTEXT-AWARE RESPONSE ENGINE ==
function isDataQuery(t){const q=t.toLowerCase();return(q.includes('how many')||q.includes('count')||q.includes('total')||q.includes('show')||q.includes('list')||q.includes('pending')||q.includes('active')||q.includes('inactive')||q.includes('status'))&&!isCreateContractRequest(q);}

function getContextualAnswer(text,pg){
  const q=text.toLowerCase().trim();
  const meta=getPageMeta(pg);
  const rows=meta.rows||[];
  const cols=meta.columns||[];
  if(!rows.length)return 'I can help you with the <b>'+meta.title+'</b> page. What would you like to know?';
  const statusIdx=cols.findIndex(function(c){return c.toLowerCase()==='status';});
  const nameIdx=1;
  const countryIdx=cols.findIndex(function(c){return c.toLowerCase()==='country';});
  const byStatus=function(s){return statusIdx>=0?rows.filter(function(r){return String(r[statusIdx]||'').toLowerCase()===s.toLowerCase();}):[];};
  const fmtList=function(items,max){max=max||4;var ns=items.slice(0,max).map(function(r){return'<b>'+r[nameIdx]+'</b>';}).join(', ');return items.length>max?ns+' and <b>'+(items.length-max)+' more</b>':ns;};
  const pending=byStatus('pending');
  const active=byStatus('active');
  const inactive=byStatus('inactive');
  const isCount=q.includes('how many')||q.includes('count')||q.includes('total')||q.includes('number of');
  const isList=q.includes('list')||q.includes('show')||q.includes('which')||q.includes('all')||q.includes('what are');
  const nm=meta.title.toLowerCase();
  if(q.includes('pending')&&(isCount||isList)){
    if(pending.length===0)return 'There are <b>no pending</b> '+nm+' on this page right now.';
    return 'There '+(pending.length===1?'is':'are')+' <b>'+pending.length+' pending</b> '+nm+(pending.length>0?': '+fmtList(pending):'')+'.';}
  if(q.includes('active')&&!q.includes('inactive')&&(isCount||isList)){
    return 'There '+(active.length===1?'is':'are')+' <b>'+active.length+' active</b> '+nm+(active.length>0?': '+fmtList(active):'')+'.';}
  if((q.includes('inactive')||q.includes('closed'))&&(isCount||isList)){
    return 'There '+(inactive.length===1?'is':'are')+' <b>'+inactive.length+' inactive/closed</b> '+nm+(inactive.length>0?': '+fmtList(inactive):'')+'.';}
  if(isCount){
    var statStr=statusIdx>=0?' - <span style="color:var(--green)">'+active.length+' active</span>, <span style="color:#b45309">'+pending.length+' pending</span>, <span style="color:var(--gray)">'+inactive.length+' inactive</span>':'';
    return 'The <b>'+meta.title+'</b> page shows <b>'+rows.length+' total</b> records'+statStr+'.';}
  if(countryIdx>=0){
    var cmap={netherlands:'Netherlands',india:'India',germany:'Germany',spain:'Spain','united kingdom':'United Kingdom',uk:'United Kingdom'};
    var ckeys=Object.keys(cmap);
    for(var ci=0;ci<ckeys.length;ci++){var k=ckeys[ci];if(q.includes(k)){var v=cmap[k];var filt=rows.filter(function(r){return String(r[countryIdx]||'').toLowerCase().includes(k==='uk'?'kingdom':k);});if(filt.length===0)return 'No '+nm+' found for <b>'+v+'</b> on this page.';return 'Found <b>'+filt.length+' '+nm+'</b> for <b>'+v+'</b>: '+fmtList(filt,5)+'.';}}
  }
  var kws=q.split(/\s+/).filter(function(w){return w.length>3&&['what','which','when','where','does','have','this','that','there','from','with','about','many'].indexOf(w)<0;});
  if(kws.length>0){var matches=rows.filter(function(r){return kws.some(function(kw){return r.join(' ').toLowerCase().includes(kw);});});if(matches.length>0&&matches.length<rows.length)return 'Found <b>'+matches.length+' matching record'+(matches.length>1?'s':'')+'</b> on <b>'+meta.title+'</b>: '+fmtList(matches,4)+'.';}
  var defStat=statusIdx>=0?' - <span style="color:var(--green)">'+active.length+' active</span>, <span style="color:#b45309">'+pending.length+' pending</span>, <span style="color:var(--gray)">'+inactive.length+' inactive</span>. Try asking <i>"How many are pending?"</i> or <i>"Show active '+nm+'"</i>':'';
  return 'The <b>'+meta.title+'</b> page currently has <b>'+rows.length+' records</b>'+defStat+'.';}

function agentReply(t){
  var q=t.toLowerCase().trim();
  var unsupportedCountries=['russia','india','germany','spain','france','italy','usa','united states','uk','united kingdom','england','scotland','wales','ireland','northern ireland','china','australia','canada','brazil','mexico','japan','poland','portugal','sweden','norway','denmark','finland','austria','switzerland','belgium','singapore','dubai','uae','emirates','turkey','vietnam','thailand','malaysia','indonesia','philippines','south korea','korea','taiwan','hong kong','new zealand','south africa','nigeria','kenya','egypt','saudi arabia','saudi','qatar','bahrain','oman','kuwait','israel','greece','czech','hungary','romania','ukraine','croatia','serbia','slovakia','bulgaria','latvia','lithuania','estonia','iceland','luxembourg','malta','cyprus','bangladesh','pakistan','sri lanka','nepal','myanmar','cambodia','laos','mongolia','kazakhstan','uzbekistan','azerbaijan','georgia','armenia','ghana','ethiopia','tanzania','uganda','rwanda','senegal','cameroon','ivory coast','morocco','algeria','tunisia','libya','sudan','angola','mozambique','zimbabwe','zambia','botswana','namibia','madagascar','mauritius','colombia','argentina','chile','peru','venezuela','ecuador','bolivia','uruguay','paraguay','guatemala','cuba','dominican republic','costa rica','panama','jamaica'];
  var foundCountry=unsupportedCountries.find(function(c){return q.includes(c);});
  var capCountry=foundCountry?foundCountry.split(' ').map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(' '):'';
  // Check if last bot message was suggesting Netherlands - if user says yes/proceed, start form
  var lastBot=agentMsgs.filter(function(m){return m.role==='bot';});
  var lastBotText=lastBot.length>0?lastBot[lastBot.length-1].text.toLowerCase():'';
  var botSuggestedNetherlands=lastBotText.includes('netherland');
  var userAffirms=/^(yes|yeah|yep|yup|ok|okay|sure|proceed|go ahead|do it|alright|fine|sounds good|let'?s go|let'?s do it|create it|make it|start it)[\s!.]*$/.test(q);
  if(botSuggestedNetherlands&&userAffirms){setTimeout(function(){startNetherlandsContract();},100);return 'Great! Opening the Netherlands contract workspace now.';}
  // Greeting detection
  var isPureGreeting=/^(hi+|hello+|hey+|howdy|greetings|good morning|good afternoon|good evening)[\s!.]*$/i.test(q);
  var isHowAreYou=/how are you|how'?s it going|how do you do|what'?s up/i.test(q);
  if(isPureGreeting){return "Hello! I'm your ADT Agent. I can help you create contracts, manage employees, check payroll, and more. What would you like to do today?";}
  if(isHowAreYou){return "I'm doing great, thanks for asking! Ready to help. I can create contracts, look up employee data, assist with payroll, and more. What do you need?";}

  // Netherlands contract - start immediately
  if(isNetherlandsContractRequest(t)){return null;}
  // Create contract with unsupported country
  if(isCreateContractRequest(t)&&foundCountry){return 'Contracts for <b>'+capCountry+'</b> are not yet supported in this workspace. We currently support <b>Netherlands</b> contracts. Would you like me to <b>create a Netherlands contract</b> instead?';}
  // Create contract generic
  if(isCreateContractRequest(t)){return 'Got it! We currently support <b>Netherlands</b> contracts. Type <b>create contract in Netherlands</b> to get started right away.';}
  // Mentioned an unsupported country in any context
  if(foundCountry){return 'Contracts for <b>'+capCountry+'</b> are not yet available. Currently, we support <b>Netherlands</b> contracts. Say <b>create contract in Netherlands</b> if you want to proceed.';}
  // Data / page queries
  if(isDataQuery(t)){return getContextualAnswer(t,page);}
  // Wants to create or set something up generically
  if(q.includes('contract')||q.includes('create')||q.includes('new')||q.includes('add')||q.includes('hire')||q.includes('onboard')){return 'I can help with that! Currently I support creating <b>Netherlands contracts</b>. Just say <b>create contract in Netherlands</b> to open the workspace.';}
  // Fallback - helpful generic
  return 'I can help you with contracts, payroll, compliance, and more. Try <b>create contract in Netherlands</b>, or ask me about any data on this page like <i>"How many contracts are active?"</i>';}

function sendMsg(id){
  const inp=document.querySelector('#'+id+' .input-field');const t=inp.value.trim();if(!t)return;inp.value='';
  if(view==='agent-empty'||view==='agent-active'){
    const startsContract=isNetherlandsContractRequest(t);
    agentMsgs.push({role:'user',text:t});
    if(view==='agent-empty'){stopAmThreeJS();showView('agent-active');buildTopbar('agent-topbar-active','agent');buildSidebar('agent-sb',agentSidebarCollapsed,page);buildInput('inp-active');if(formStep<0)showWorkspaceEmpty();}
    else if(formStep<0){showWorkspaceEmpty();}
    renderChat('agent-chat',agentMsgs);showTyping('agent-chat');
    setTimeout(()=>{hideTyping();
      if(startsContract){agentMsgs.push({role:'bot',text:"Great! I'll open the Netherlands contract workspace now."});startNetherlandsContract();}
      else{var reply=agentReply(t);if(reply){agentMsgs.push({role:'bot',text:reply});if(formStep<0)showWorkspaceEmpty();}}
      renderChat('agent-chat',agentMsgs);
    },1000);
  }
}

function buildListingCell(cell,column){
  if(column==='Status'||column==='status')return `<td><span class="lp-status-badge ${statusClass(cell)}">${cell}</span></td>`;
  if(column==='S.No'||column==='S. No')return `<td style="font-weight:700;color:var(--gray)">${cell}</td>`;
  return `<td>${cell}</td>`;
}

/* ══ LISTING PAGINATION ═══════════════════════════════════════════════════
   ONE pager for every listing in the app.

   Before this there were three: .lp-pagination on seven pages, .pagination
   with the smaller .page-btn on two, .at-pagination on one, and nothing at
   all on six more - and of the ten that had a control, only two of them
   actually turned a page. The rest were static markup a delegated click
   handler moved an .active class around inside, under a table that had
   quietly rendered every row it owned. So a listing's length told you
   nothing, "Showing 1-7 of 7 entries" sat under a table showing 24, and the
   same product had three different answers to what a page control looks like.

   All of it now comes through listPage(). One control, one page size, one
   behaviour, and the table below it really is holding LIST_PAGE_SIZE rows.

   WHY IT SLICES RENDERED ROWS RATHER THAN DATA.  Every builder already maps
   its filtered array with the row index in hand - that index IS the S. No
   column - so cutting the page out after the map keeps that numbering running
   continuously across pages for free. Slicing the data instead would mean
   finding and offsetting the S. No expression in fourteen builders, which is
   an off-by-one waiting to happen in fourteen places. These lists are tens of
   rows; building a string we then drop costs nothing measurable.
   ═══════════════════════════════════════════════════════════════════════ */
const LIST_PAGE_SIZE=10;
const listPageNo={};    // listing key -> the 1-based page it is on
const listPageSig={};   // listing key -> the filter state that page belongs to

const PG_PREV='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
const PG_NEXT='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

function goListPage(key,n){listPageNo[key]=n;renderADTPage();}
/* ── LANDING ON WHAT WAS JUST ADDED ────────────────────────────────────────
   Every listing files a new record at the TOP of its data - unshift, not push -
   so the thing just created is the first row of the first page. That was only
   half the promise: listPage() deliberately keeps whatever page you were on
   (see the note there), so filing a record from page 4 left you on page 4,
   looking at rows from a fortnight ago, with the new one three pages behind
   you. It read as "nothing happened".

   So an add says where it landed. lpLanded() puts the listing back on page one
   and marks the new ids; the rows carry .lp-row-new for one repaint, which is
   enough to catch the eye without becoming a state the row is in. */
let lpNewRows={};
function lpLanded(key,ids){
  listPageNo[key]=1;
  lpNewRows[key]={};
  (Array.isArray(ids)?ids:[ids]).forEach(function(id){lpNewRows[key][id]=1;});
}
/* A listing whose order is NOT newest-first - the holiday calendar is by date,
   because a calendar out of date order is not a calendar - cannot put the new
   row on top. It goes to the page the row is actually on instead. */
function lpLandedAt(key,index){
  listPageNo[key]=Math.max(1,Math.floor(index/LIST_PAGE_SIZE)+1);
}
/* Which listing draws its rows under which id prefix. Kept here, as one table,
   rather than teaching sixteen row builders to ask whether they are new: the
   highlight is a thing that happens TO a row, not a property of it, and every
   one of those builders already emits the id this needs. */
const LP_ROW_PREFIX={
  'compliance':'cmp','rates-rules':'rr','contract-templates':'ctp','payheads':'ph',
  'teams':'tm','support-tickets':'tk','all-leaves':'al','leave-policies':'lp',
  'holidays':'hd','direct-employees':'de','global-employees':'ge',
  'asset-allocation':'ast','it-access':'ita','hr-docs':'hdoc','announcements':'anm'
};
/* Run at the end of every repaint. The mark is spent on the first paint that
   finds the row, so the flash happens once - on the repaint the add itself
   triggered - and a filter change five minutes later is not still lighting it
   up. Rows that are marked but not on screen (a filter hides them, or the page
   moved) keep their mark until they are. */
function lpFlashNew(){
  Object.keys(lpNewRows).forEach(function(key){
    const pre=LP_ROW_PREFIX[key];if(!pre)return;
    Object.keys(lpNewRows[key]).forEach(function(id){
      const row=document.getElementById(pre+'-row-'+id);
      if(!row)return;
      delete lpNewRows[key][id];
      row.classList.add('lp-row-new');
      // Taken off once the animation has played, so the class cannot survive
      // into a later patch of the same row and re-fire.
      setTimeout(function(){row.classList.remove('lp-row-new');},2000);
    });
  });
}

/* key       stable name for this listing, used to remember its page
   sig       its current filter state, joined into a string - see below
   rowsHTML  every row the filter left, already rendered, in order
   emptyHTML the "nothing matches" row to show when there are none      */
function listPage(key,sig,rowsHTML,emptyHTML){
  const total=rowsHTML.length;
  const pages=Math.max(1,Math.ceil(total/LIST_PAGE_SIZE));
  /* A FILTER CHANGE is the one thing that should throw you back to page 1 -
     page 4 of an unfiltered list has nothing to do with page 4 of a filtered
     one. Everything else that repaints a listing must leave the page alone,
     which is why this keys off the filter state and not off the row count:
     approving the last Pending row on page 3 changes the count too, and being
     bounced to page 1 for it is the exact jolt qaCommit exists to avoid. */
  if(listPageSig[key]!==sig){listPageSig[key]=sig;listPageNo[key]=1;}
  const p=Math.min(Math.max(1,listPageNo[key]||1),pages);
  listPageNo[key]=p;
  const from=(p-1)*LIST_PAGE_SIZE;
  const slice=rowsHTML.slice(from,from+LIST_PAGE_SIZE);
  /* A window of five, so the control is the same width on a 3-page list as on
     an 86-page one and the arrows never move out from under the pointer. */
  let lo=Math.max(1,p-2),hi=Math.min(pages,lo+4);lo=Math.max(1,hi-4);
  let nums='';
  for(let n=lo;n<=hi;n++)nums+=`<button class="lp-pg-btn${n===p?' active':''}" onclick="goListPage('${key}',${n})">${n}</button>`;
  return {
    rows:slice.join('')||emptyHTML,
    pager:'<div class="lp-pagination">'
      +`<span class="lp-pagination-info">Showing ${total?from+1:0}&ndash;${from+slice.length} of ${total} entries</span>`
      +'<div class="lp-pagination-controls">'
      +`<button class="lp-pg-btn lp-pg-arrow" onclick="goListPage('${key}',${p-1})"${p===1?' disabled':''} aria-label="Previous page">${PG_PREV}</button>`
      +nums
      +`<button class="lp-pg-btn lp-pg-arrow" onclick="goListPage('${key}',${p+1})"${p===pages?' disabled':''} aria-label="Next page">${PG_NEXT}</button>`
      +'</div></div>'
  };
}

// The rows a listing page is currently showing, after its status filter. The
// table and the row action menu both read from here so a menu can never act on
// a different record than the one the user clicked.
function getListingRows(pg){
  const meta=getPageMeta(pg);
  const allRows=meta.rows||[];
  const cols=meta.columns||[];
  const statusIdx=cols.findIndex(c=>c==='Status'||c==='status');
  const f=listStatusFilters[pg]||'';
  return f&&statusIdx>=0?allRows.filter(r=>String(r[statusIdx]||'')===f):allRows;
}

function buildListingHTML(pg){
  const meta=getPageMeta(pg);
  const allRows=meta.rows||[];
  const cols=meta.columns||[];
  const statusIdx=cols.findIndex(c=>c==='Status'||c==='status');
  const statusFilter=listStatusFilters[pg]||'';
  const rows=getListingRows(pg);
  const isLeavePg=(pg==='all-leaves'||pg==='leaves');
  const s1Key=isLeavePg?'approved':'active';
  const s2Key=isLeavePg?'unapproved':'inactive';
  const s1Label=isLeavePg?'Approved':'Active';
  const s2Label=isLeavePg?'Unapproved':'Inactive';
  const s1Count=statusIdx>=0?allRows.filter(r=>String(r[statusIdx]||'').toLowerCase()===s1Key).length:0;
  const s2Count=statusIdx>=0?allRows.filter(r=>String(r[statusIdx]||'').toLowerCase()===s2Key).length:0;
  const s3Count=statusIdx>=0?allRows.filter(r=>String(r[statusIdx]||'').toLowerCase()==='pending').length:0;
  const pgSlug=pg.replace(/[^a-z0-9]/g,'-');
  const q=listSearchQueries[pg]||'';
  /* Search first, then the page's own dropdowns. */
  const filters=lpSearchField('lst-'+pgSlug+'-q',q,'Search',"applyListingFilters('"+pg+"')")
    +meta.filters.map((f,i)=>apCS(`lst-${pgSlug}-f${i}`,getFilterOptions(f).slice(1),f==='Status'?statusFilter:'',f)).join('');
  const hamburger='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const headers=cols.map(c=>`<th>${c}</th>`).join('')+'<th>ACTION</th>';
  // Payroll keeps its own detail panel; every other listing shares the generic
  // one. Either way the row and its action button open the same thing.
  const isPr=pg==='payroll';
  const openCall=row=>isPr?`openPrSidebar(${row[0]})`:`openLstSidebar('${pg}',${row[0]})`;
  const selId=isPr?prSelectedId:(lstSelectedPg===pg?lstSelectedId:null);
  const pgn=listPage(pg,statusFilter+'|'+q,lpSearchRows(rows,q).map(row=>
    `<tr class="lp-row${selId!=null&&String(selId)===String(row[0])?' lp-row-selected':''}" data-row-id="${row[0]}" style="cursor:pointer" onclick="${openCall(row)}">`
      +row.map((cell,ci)=>buildListingCell(cell,cols[ci])).join('')
      /* A listing without a Status column has no move to offer: just the ☰. */
      +(statusIdx>=0&&typeof rowLogCell==='function'
        ?'<td onclick="event.stopPropagation()">'+rowLogCell(isPr?'payroll':'lst:'+pg,row[0])+'</td>'
        :`<td><button class="lp-action-btn" title="View details" onclick="event.stopPropagation();${openCall(row)}">${hamburger}</button></td>`)
    +`</tr>`),
    `<tr><td colspan="${cols.length+1}" style="padding:24px;text-align:center;color:var(--gray)">No records match this filter.</td></tr>`);
  const sbOpen=isPr?!!prSelectedId:(lstSelectedPg===pg&&lstSelectedId!=null);
  const sidebar=isPr
    ? `<div class="lp-split-sb${sbOpen?' open':''}" id="pr-split-sb"><div class="lp-isb" id="pr-isb-inner">${sbOpen?sbRender(renderPrSidebar,'payroll'):''}</div></div>`
    : `<div class="lp-split-sb${sbOpen?' open':''}" id="lst-split-sb"><div class="lp-isb" id="lst-isb-inner">${sbOpen?sbRender(renderLstSidebar,pg):''}</div></div>`;
  return `<div class="listing-page">`
    +dashboardBackHTML()
    +`<div class="listing-top">`
      +`<div class="lp-filter-bar" style="flex:1;min-width:0"><div class="lp-filter-bar-label">Select Filter</div><div class="lp-filter-bar-row">${filters}${clearFiltersBtn([listStatusFilters[pg]],`resetListingFilters('${pg}')`)}<button class="lp-pill-search" onclick="applyListingFilters('${pg}')">Search</button></div></div>`
      +`<div class="listing-stats">`
        +`<div class="listing-stat ${s1Key}${statusFilter===s1Label?' stat-selected':''}" onclick="toggleListingStatFilter('${pg}','${s1Label}')"><div class="listing-stat-count">${s1Count}</div><div class="listing-stat-label">${s1Label}</div></div>`
        +`<div class="listing-stat ${s2Key}${statusFilter===s2Label?' stat-selected':''}" onclick="toggleListingStatFilter('${pg}','${s2Label}')"><div class="listing-stat-count">${s2Count}</div><div class="listing-stat-label">${s2Label}</div></div>`
        +`<div class="listing-stat pending${statusFilter==='Pending'?' stat-selected':''}" onclick="toggleListingStatFilter('${pg}','Pending')"><div class="listing-stat-count">${s3Count}</div><div class="listing-stat-label">Pending</div></div>`
      +`</div>`
    +`</div>`
    +`<div class="lp-split-wrap">`
      +`<div class="lp-split-main">`
        +`<div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">`
          +`<table class="lp-table" style="min-width:700px"><thead><tr>${headers}</tr></thead><tbody>${pgn.rows}</tbody></table>`
          +pgn.pager
        +`</div>`
      +`</div>`
      +sidebar
    +`</div>`
    +`</div>`
    +(pg==='payroll'&&prCreateOpen?buildCreatePayRunModalHTML():'');
}

function applyListingFilters(pg){
  const slug=pg.replace(/[^a-z0-9]/g,'-');
  const meta=getPageMeta(pg);
  const idx=(meta.filters||[]).findIndex(f=>f==='Status'||f==='status');
  const status=idx>=0?getCSValue('lst-'+slug+'-f'+idx):'';
  if(status&&status!=='Status')listStatusFilters[pg]=status;else delete listStatusFilters[pg];
  const q=lpSearchValue('lst-'+slug+'-q');
  if(q)listSearchQueries[pg]=q;else delete listSearchQueries[pg];
  renderADTPage();
}
function resetListingFilters(pg){
  delete listStatusFilters[pg];
  delete listSearchQueries[pg];
  renderADTPage();
}
// Renders a "Clear Filters" pill only when at least one filter is actually
// applied. `applied` is the list of a page's filter-state values; `call` is the
// page's own clear handler.
/* THE SEARCH BOX, FIRST IN EVERY FILTER BAR. One builder, so the control, its
   place in the row and its Enter-to-search are the same on all sixteen
   listings rather than each page's own input. It is deliberately the first
   thing in the bar: typing a name is what people reach for before they reach
   for a dropdown, and a box that moves from page to page has to be hunted for.

   Enter runs the page's own apply, the same function the Search button calls,
   so there is one path in and no second definition of what searching means. */
/* liveCall, when given, is a global function NAME run with the typed text a
   moment after each keystroke, so results narrow as the user types. The page
   repaints in place (patchDom), so the box keeps its focus and caret. */
function lpSearchField(id,value,placeholder,applyCall,liveCall){
  return '<input class="lp-search-input" id="'+id+'" type="text" placeholder="'+(placeholder||'Search')+'"'
    +' value="'+attrSafe(value||'')+'" onkeydown="if(event.key===\'Enter\')'+applyCall+'"'
    +(liveCall?' oninput="lpLiveSearch(this,\''+liveCall+'\')" autocomplete="off"':'')+'>';
}
let lpLiveTimer=null;
function lpLiveSearch(el,fn){
  clearTimeout(lpLiveTimer);
  lpLiveTimer=setTimeout(function(){
    if(typeof window[fn]!=='function')return;
    const pos=el.selectionStart;
    window[fn](el.value.trim());
    /* Belt and braces: if the repaint did replace the box, put the caret back. */
    const now=document.getElementById(el.id);
    if(now&&document.activeElement!==now){now.focus();try{now.setSelectionRange(pos,pos);}catch(e){}}
  },160);
}
function lpSearchValue(id){
  const el=document.getElementById(id);
  return el?el.value.trim():'';
}
/* WHAT THE QUERY IS MATCHED AGAINST: every string and number the record
   carries, not a hand-picked list of fields per listing. A curated list is a
   second place to remember when a column is added — and it is the column
   nobody updated that the search then silently cannot find. The cost is that a
   query can match something not on screen (an id, an email); for a search box
   that is usually the answer somebody wanted anyway. */
function lpSearchMatch(q,rec){
  if(!q)return true;
  const needle=String(q).trim().toLowerCase();
  if(!needle)return true;
  if(rec==null)return false;
  return Object.keys(rec).some(function(k){
    const v=rec[k];
    return (typeof v==='string'||typeof v==='number')
      &&String(v).toLowerCase().indexOf(needle)!==-1;
  });
}
function lpSearchRows(rows,q){
  if(!q)return rows;
  return rows.filter(function(r){return lpSearchMatch(q,r);});
}
function clearFiltersBtn(applied,call){
  const n=(applied||[]).filter(Boolean).length;
  if(!n)return '';
  return '<button class="lp-pill-clear" onclick="'+call+'" title="Clear applied filters">'
    +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    +'Clear Filters<span class="lp-pill-clear-count">'+n+'</span></button>';
}
function toggleListingStatFilter(pg,value){
  if(listStatusFilters[pg]===value)delete listStatusFilters[pg];
  else listStatusFilters[pg]=value;
  renderADTPage();
}

// -- LEAVE POLICIES DATA & PAGES --
const leavePoliciesData=[
  {id:1, type:'Casual Leave',        yearly:24, monthly:5,    carryForward:10,  probation:true,  prorate:false, status:'Active',   assignBy:'Department',  assignValue:'Engineering', employees:['Anika Shah','Shaun J','Utkarsh Shukla','Ashneet Kaur','Sneha Kulkarni','Diksha Kumari','Pardeep Verga']},
  {id:2, type:'Sick Leave',          yearly:12, monthly:2,    carryForward:5,   probation:true,  prorate:true,  status:'Active',   assignBy:'Designation', assignValue:'Developer',   employees:['Rahul Mehta','Pallavi P','Shaun J','Utkarsh Shukla','Ashneet Kaur','Sneha Kulkarni','Diksha Kumari','Pardeep Verga']},
  {id:3, type:'Earned Leave',        yearly:18, monthly:1,    carryForward:15,  probation:false, prorate:true,  status:'Active',   assignBy:'Branch',      assignValue:'Hyderabad',   employees:['Nora Kim','Sneha Kulkarni']},
  {id:4, type:'Maternity Leave',     yearly:26, monthly:null, carryForward:null,probation:true,  prorate:false, status:'Inactive', assignBy:'Department',  assignValue:'HR',          employees:['Luis Martin']},
  {id:5, type:'Paternity Leave',     yearly:10, monthly:null, carryForward:null,probation:false, prorate:false, status:'Active',   assignBy:'Department',  assignValue:'Engineering', employees:['Shaun J','Rahul Mehta']},
  {id:6, type:'Bereavement Leave',   yearly:5,  monthly:null, carryForward:null,probation:true,  prorate:false, status:'Active',   assignBy:'Branch',      assignValue:'Mumbai',      employees:['Pallavi P']},
  {id:7, type:'Marriage Leave',      yearly:7,  monthly:null, carryForward:null,probation:false, prorate:false, status:'Active',   assignBy:'Department',  assignValue:'Sales',       employees:['Luis Martin']},
  {id:8, type:'Compensatory Leave',  yearly:12, monthly:3,    carryForward:6,   probation:true,  prorate:true,  status:'Active',   assignBy:'Designation', assignValue:'Developer',   employees:['Anika Shah','Nora Kim']},
  {id:9, type:'Privilege Leave',     yearly:15, monthly:2,    carryForward:10,  probation:false, prorate:true,  status:'Active',   assignBy:'Branch',      assignValue:'Delhi',       employees:['Rahul Mehta']},
  {id:10,type:'Unpaid Leave',        yearly:30, monthly:10,   carryForward:null,probation:true,  prorate:false, status:'Active',   assignBy:'Department',  assignValue:'Product',     employees:['Shaun J']},
  {id:11,type:'Study Leave',         yearly:10, monthly:null, carryForward:5,   probation:false, prorate:true,  status:'Inactive', assignBy:'Designation', assignValue:'HR Manager',  employees:[]},
  {id:12,type:'Sabbatical Leave',    yearly:90, monthly:null, carryForward:null,probation:false, prorate:false, status:'Inactive', assignBy:'Department',  assignValue:'Workforce',   employees:[]},
  {id:13,type:'Adoption Leave',      yearly:20, monthly:null, carryForward:null,probation:true,  prorate:false, status:'Active',   assignBy:'Branch',      assignValue:'Bangalore',   employees:['Pallavi P','Luis Martin']},
  {id:14,type:'Half Day Leave',      yearly:24, monthly:4,    carryForward:8,   probation:true,  prorate:true,  status:'Active',   assignBy:'Department',  assignValue:'Design',      employees:['Nora Kim']},
  {id:15,type:'Optional Holiday',    yearly:3,  monthly:1,    carryForward:null,probation:false, prorate:false, status:'Active',   assignBy:'Branch',      assignValue:'Chennai',     employees:['Anika Shah']},
  {id:16,type:'Work From Home Leave',yearly:20, monthly:5,    carryForward:null,probation:true,  prorate:true,  status:'Active',   assignBy:'Designation', assignValue:'Recruiter',   employees:['Rahul Mehta','Pallavi P']},
  {id:17,type:'Quarantine Leave',    yearly:14, monthly:null, carryForward:null,probation:true,  prorate:false, status:'Inactive', assignBy:'Department',  assignValue:'Operations',  employees:[]},
];
let leaveEditId=1;
const empPool=[
  {id:'EMP001',name:'Shaun J',key:'CLOCLO11755'},
  {id:'EMP002',name:'Pallavi P',key:'CLO0002'},
  {id:'EMP003',name:'Anika Shah',key:'CLO0003'},
  {id:'EMP004',name:'Rahul Mehta',key:'CLO0004'},
  {id:'EMP005',name:'Nora Kim',key:'CLO0005'},
  {id:'EMP006',name:'Luis Martin',key:'CLO0006'}
];
const empPoolExt={
  EMP001:{dept:'Workforce',desig:'HR Manager',branch:'Hyderabad'},
  EMP002:{dept:'HR',desig:'Recruiter',branch:'Hyderabad'},
  EMP003:{dept:'Engineering',desig:'Developer',branch:'Mumbai'},
  EMP004:{dept:'Product',desig:'Product Manager',branch:'Delhi'},
  EMP005:{dept:'Design',desig:'UX Designer',branch:'Hyderabad'},
  EMP006:{dept:'Sales',desig:'Sales Executive',branch:'Mumbai'}
};
const filterData={
  Department:['Engineering','Product','Finance','Sales','Design','Operations','HR','Workforce'],
  Designation:['Developer','Product Manager','Recruiter','UX Designer','HR Manager','Sales Executive'],
  Branch:['Hyderabad','Mumbai','Delhi','Bangalore','Chennai']
};
let selectedEmps=new Set();
let lpAddModalOpen=false;   // creation is a popup, like every other create form
let apFilterType='',apFilterValue='';
let lpSidebarPolicyId=null,lpSidebarTab='basic-details',lpSidebarEditMode=false,lpEmpEditMode=false;
let lpFilterField='',lpFilterStatus='';
let listStatusFilters={},alStatusFilter='',pmInvoiceStatusFilter='',pmDateFilter='';
/* One query per listing, held the same way the dropdown filters are: the bar
   is rebuilt on every repaint, so what was typed has to live outside it.
   listSearchQueries is keyed by page for the listings that share one builder. */
let listSearchQueries={};
let deSearchQuery='',geSearchQuery='',tmSearchQuery='',alSearchQuery='',pmSearchQuery='',
    complianceSearchQuery='',ratesRuleSearchQuery='',ctpSearchQuery='',phSearchQuery='',
    hdSearchQuery='',lpFilterQuery='',atSearchQuery='',tkSearchQuery='',chatSearchQuery='';
let ctQuickStatusFilter='',atTsQuickFilter='',tkQuickStatusFilter='',chatQuickStatusFilter='';
/* ctQuickStatusFilter holds a status, in both views: the selected type's own
   flow, or any flow's status when the band is on All. ctSetType() still
   clears it on a type change, because a status from the type you just left is
   not one this type can be in. Country and Search survive a type change; both
   apply to all four types. */
let ctTypeFilter=CT_TYPE_ALL,ctCountryFilter='',ctSearchQuery='';
/* Contracts opens on a four-card type chooser rather than straight into the
   table, and returns to it every time the section is entered afresh. The type
   band still sits above the list once you are inside, All included, so
   cross-type work stays reachable and switching type does not cost a trip back
   out to the cards. Anything that arrives with a type or a status already
   decided - a dashboard tile, a search result, a deep link - sets this false
   and lands on the rows, because that choice has already been made. */
let ctLandingOpen=true;
/* One Tickets module, two filters: the status quick-filter above and the
   channel it came in on. Channel is what used to split this into two pages;
   it is a filter now, not a separate module. */
let tkChannelFilter='';
const lpLogsData={
  1:[
    {date:'22 Apr 2026',time:'05:44:07 PM',user:'Admin',status:'Active',action:'Policy reactivated after review'},
    {date:'01 Dec 2025',time:'10:32:19 AM',user:'Rahul M.',status:'Updated',action:'Yearly count updated to 24'},
    {date:'10 Nov 2025',time:'09:15:44 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  2:[
    {date:'05 Oct 2025',time:'11:28:08 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  3:[
    {date:'15 Nov 2025',time:'02:10:55 PM',user:'Anika S.',status:'Updated',action:'Carry forward limit updated to 15'},
    {date:'01 Sep 2025',time:'11:02:44 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  4:[
    {date:'10 Jan 2026',time:'03:45:32 PM',user:'Admin',status:'Inactive',action:'Status changed to Inactive ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â policy retired'},
    {date:'20 Aug 2025',time:'01:30:00 PM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  5:[
    {date:'15 Mar 2026',time:'10:10:00 AM',user:'Admin',status:'Active',action:'Policy activated for Engineering'},
    {date:'02 Jan 2026',time:'09:00:00 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  6:[
    {date:'11 Feb 2026',time:'04:20:00 PM',user:'Shaun J',status:'Updated',action:'Eligible branches updated'},
    {date:'05 Dec 2025',time:'11:00:00 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  7:[{date:'20 Nov 2025',time:'02:00:00 PM',user:'Admin',status:'Created',action:'Policy created'}],
  8:[
    {date:'18 Apr 2026',time:'01:15:00 PM',user:'Rahul M.',status:'Updated',action:'Monthly limit revised to 3'},
    {date:'01 Jan 2026',time:'08:30:00 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  9:[{date:'22 Feb 2026',time:'03:45:00 PM',user:'Admin',status:'Created',action:'Policy created for Delhi branch'}],
  10:[{date:'10 Mar 2026',time:'09:20:00 AM',user:'Admin',status:'Created',action:'Policy created'}],
  11:[
    {date:'05 Apr 2026',time:'11:30:00 AM',user:'Admin',status:'Inactive',action:'Policy deactivated pending review'},
    {date:'14 Oct 2025',time:'10:00:00 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  12:[
    {date:'01 May 2026',time:'09:00:00 AM',user:'Admin',status:'Inactive',action:'Sabbatical policy suspended for this cycle'},
    {date:'30 Sep 2025',time:'03:00:00 PM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  13:[{date:'28 Jan 2026',time:'02:30:00 PM',user:'Admin',status:'Created',action:'Policy created for Bangalore branch'}],
  14:[
    {date:'12 Apr 2026',time:'10:45:00 AM',user:'Nora K.',status:'Updated',action:'Carry forward limit set to 8'},
    {date:'03 Nov 2025',time:'11:00:00 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  15:[{date:'07 Mar 2026',time:'08:00:00 AM',user:'Admin',status:'Created',action:'Optional holiday policy created for Chennai'}],
  16:[
    {date:'20 Apr 2026',time:'04:00:00 PM',user:'Pallavi P.',status:'Updated',action:'Monthly limit revised to 5'},
    {date:'15 Jan 2026',time:'10:30:00 AM',user:'Admin',status:'Created',action:'Policy created'}
  ],
  17:[
    {date:'01 Jun 2026',time:'01:00:00 PM',user:'Admin',status:'Inactive',action:'Policy deactivated ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no longer required'},
    {date:'20 Apr 2020',time:'09:00:00 AM',user:'Admin',status:'Created',action:'Quarantine leave policy created during COVID period'}
  ]
};
const lpWorkflowData={
  1:[
    {title:'Policy Activated',user:'Admin',date:'22 Apr 2026',time:'05:44:07 PM',description:'Policy set to Active after review. Yearly count confirmed at 24 days.'},
    {title:'Approval Step Added',user:'Rahul M.',date:'01 Dec 2025',time:'10:32:19 AM',description:'Manager approval step added to the leave request workflow.'},
    {title:'Workflow Initialized',user:'Admin',date:'10 Nov 2025',time:'09:15:44 AM',description:'Default single-step workflow created for Casual Leave policy.'}
  ],
  2:[
    {title:'Workflow Initialized',user:'Admin',date:'05 Oct 2025',time:'11:28:08 AM',description:'HR approval workflow created for Sick Leave policy.'}
  ],
  3:[
    {title:'Final Approver Updated',user:'Anika S.',date:'15 Nov 2025',time:'02:10:55 PM',description:'HR Head added as final approver for escalated leave requests.'},
    {title:'Workflow Initialized',user:'Admin',date:'01 Sep 2025',time:'11:02:44 AM',description:'Two-step workflow created: Manager review followed by HR Head approval.'}
  ],
  4:[
    {title:'Workflow Suspended',user:'Admin',date:'10 Jan 2026',time:'03:45:32 PM',description:'Workflow suspended as Maternity Leave policy was set to Inactive status.'},
    {title:'Workflow Initialized',user:'Admin',date:'20 Aug 2025',time:'01:30:00 PM',description:'HR approval workflow created for Maternity Leave policy.'}
  ],
  5:[
    {title:'Workflow Initialized',user:'Admin',date:'02 Jan 2026',time:'09:00:00 AM',description:'Single-step Manager approval workflow created for Paternity Leave.'}
  ],
  6:[
    {title:'Approver Updated',user:'Shaun J',date:'11 Feb 2026',time:'04:20:00 PM',description:'HR Head set as approver for Bereavement Leave requests.'},
    {title:'Workflow Initialized',user:'Admin',date:'05 Dec 2025',time:'11:00:00 AM',description:'Workflow created for Bereavement Leave ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â auto-approve for up to 3 days.'}
  ],
  7:[{title:'Workflow Initialized',user:'Admin',date:'20 Nov 2025',time:'02:00:00 PM',description:'Single-step HR approval workflow created for Marriage Leave.'}],
  8:[
    {title:'Approval Rule Updated',user:'Rahul M.',date:'18 Apr 2026',time:'01:15:00 PM',description:'Monthly comp-off limit approval updated to require manager sign-off.'},
    {title:'Workflow Initialized',user:'Admin',date:'01 Jan 2026',time:'08:30:00 AM',description:'Two-step approval workflow created for Compensatory Leave.'}
  ],
  9:[{title:'Workflow Initialized',user:'Admin',date:'22 Feb 2026',time:'03:45:00 PM',description:'Manager approval workflow initialized for Privilege Leave ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Delhi branch.'}],
  10:[{title:'Workflow Initialized',user:'Admin',date:'10 Mar 2026',time:'09:20:00 AM',description:'Unpaid leave workflow created with mandatory HR approval for all requests.'}],
  11:[
    {title:'Workflow Paused',user:'Admin',date:'05 Apr 2026',time:'11:30:00 AM',description:'Workflow paused as Study Leave policy is under policy review.'},
    {title:'Workflow Initialized',user:'Admin',date:'14 Oct 2025',time:'10:00:00 AM',description:'Study Leave approval workflow initialized with L&D Head as approver.'}
  ],
  12:[
    {title:'Workflow Suspended',user:'Admin',date:'01 May 2026',time:'09:00:00 AM',description:'Sabbatical Leave workflow suspended for this financial year.'},
    {title:'Workflow Initialized',user:'Admin',date:'30 Sep 2025',time:'03:00:00 PM',description:'Long-leave workflow created requiring CEO approval for sabbatical requests.'}
  ],
  13:[{title:'Workflow Initialized',user:'Admin',date:'28 Jan 2026',time:'02:30:00 PM',description:'Adoption Leave workflow created ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â HR + Manager dual approval required.'}],
  14:[
    {title:'Step Updated',user:'Nora K.',date:'12 Apr 2026',time:'10:45:00 AM',description:'Half Day Leave workflow updated to allow self-approval for up to 2 instances/month.'},
    {title:'Workflow Initialized',user:'Admin',date:'03 Nov 2025',time:'11:00:00 AM',description:'Workflow initialized for Half Day Leave ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â single Manager approval.'}
  ],
  15:[{title:'Workflow Initialized',user:'Admin',date:'07 Mar 2026',time:'08:00:00 AM',description:'Optional Holiday workflow created ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â employee self-select with HR visibility.'}],
  16:[
    {title:'Approver Changed',user:'Pallavi P.',date:'20 Apr 2026',time:'04:00:00 PM',description:'Reporting Manager replaced HR as primary approver for WFH Leave requests.'},
    {title:'Workflow Initialized',user:'Admin',date:'15 Jan 2026',time:'10:30:00 AM',description:'Work From Home Leave workflow created with team-lead approval step.'}
  ],
  17:[
    {title:'Workflow Deactivated',user:'Admin',date:'01 Jun 2026',time:'01:00:00 PM',description:'Quarantine Leave workflow deactivated ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â policy retired post-COVID guidelines.'},
    {title:'Workflow Initialized',user:'Admin',date:'20 Apr 2020',time:'09:00:00 AM',description:'Emergency quarantine leave workflow created with auto-approval for first 7 days.'}
  ]
};
/* `hook` is the name of a global function called as hook(value,id) whenever a
   selection is made — the same shape apCD's onpick already had. It exists so a
   form that has to REACT to a pick (enable a dependent field, refresh a live
   preview, re-count what is still required) does not have to add another
   branch to the if-else chain inside csSelect, which is how that chain grew. */
function apCS(id,opts,defVal,placeholder,hook){
  const sel=opts.find(o=>o===defVal)||'';
  const isEmpty=!sel;
  const optStr=opts.map(o=>`<div class="cs-option${sel===o?' cs-selected':''}" onclick="csSelect(this,'${o}','${id}')"><span>${o}</span><svg class="cs-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>`).join('');
  return `<div class="cs-wrap" id="csw-${id}"${hook?` data-cshook="${hook}"`:''}><button type="button" class="cs-trigger${isEmpty?' cs-placeholder':''}" onclick="csToggle(this)" data-csid="${id}" data-csph="${placeholder||''}"><span class="cs-value">${sel||placeholder}</span><svg class="cs-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button><div class="cs-dropdown" id="csd-${id}">${optStr}</div></div>`;
}
/* CLICKING AN OPEN FILTER'S OWN TRIGGER HAD TO CLOSE IT, AND DIDN'T.
   The "close the others" sweep excluded the current dropdown by comparing its
   id against `csid + '__drop'` — but these are rendered as `csd-<csid>`, so
   the exclusion never matched anything. The sweep therefore closed the
   dropdown you had just clicked, and the toggle on the next line put it
   straight back: every click on the trigger left it open.

   Nothing else revealed it, because a click on a DIFFERENT trigger or outside
   the bar closes it through paths that never depended on this comparison.
   Used by every listing's filter bar, so this was the same dead toggle on all
   of them. */
function csToggle(btn){
  const id=btn.dataset.csid, mine='csd-'+id;
  document.querySelectorAll('.cs-dropdown.cs-open').forEach(d=>{
    if(d.id===mine)return;                       // leave the one being toggled alone
    d.classList.remove('cs-open');
    const t=d.previousElementSibling;if(t)t.classList.remove('cs-open');
  });
  const drop=document.getElementById(mine);if(!drop)return;
  const open=drop.classList.toggle('cs-open');btn.classList.toggle('cs-open',open);
  // Fixed, so the list is placed here rather than by CSS: left-aligned and
  // trigger-width, the same call the custom select makes. Placement runs
  // after the class flip because the helper measures the open menu.
  if(open){
    drop.style.minHeight='';
    csSearchSetup(drop);
    placeAnchoredMenu(drop,btn.getBoundingClientRect(),
      {alignLeft:true,width:btn.getBoundingClientRect().width});
    /* Held at its opened height, so narrowing the list by typing does not
       make the menu jump - above all one that opened upwards. */
    if(drop.querySelector('.cs-search'))drop.style.minHeight=drop.offsetHeight+'px';
  }
}
/* ── SEARCHABLE DROPDOWNS ──
   A select whose wrapper carries data-cssearch gets a search box at the top
   of its menu. Opening the menu clears it and puts the caret in it, so a
   long list (every employee) can be narrowed by typing straight away. Enter
   picks the first match; Escape closes the menu. Options are hidden, never
   removed, so csSelect and getCSValue work exactly as before. */
const CS_SEARCH_ICO='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
function csSearchSetup(drop){
  const wrap=drop.closest('.cs-wrap');
  if(!wrap||!wrap.dataset.cssearch)return;
  let box=drop.querySelector('.cs-search');
  if(!box){
    box=document.createElement('div');box.className='cs-search';
    box.innerHTML=CS_SEARCH_ICO+'<input type="text" placeholder="Search…" aria-label="Search options" autocomplete="off">';
    drop.insertBefore(box,drop.firstChild);
    const none=document.createElement('div');none.className='cs-search-none';none.textContent='No matches';none.hidden=true;
    drop.appendChild(none);
    const inp=box.querySelector('input');
    inp.addEventListener('input',function(){csSearchFilter(drop,inp.value);});
    inp.addEventListener('click',function(e){e.stopPropagation();});
    inp.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        e.preventDefault();
        const first=Array.prototype.find.call(drop.querySelectorAll('.cs-option'),function(o){return !o.hidden;});
        if(first)first.click();
      }else if(e.key==='Escape'){
        drop.classList.remove('cs-open');
        const t=document.querySelector('[data-csid="'+drop.id.replace(/^csd-/,'')+'"]');
        if(t){t.classList.remove('cs-open');t.focus();}
      }
    });
  }
  const inp=box.querySelector('input');
  inp.value='';csSearchFilter(drop,'');
  setTimeout(function(){inp.focus({preventScroll:true});},0);
}
function csSearchFilter(drop,q){
  q=String(q||'').trim().toLowerCase();
  let shown=0;
  drop.querySelectorAll('.cs-option').forEach(function(o){
    const hit=!q||o.textContent.toLowerCase().indexOf(q)>=0;
    o.hidden=!hit;if(hit)shown++;
  });
  const none=drop.querySelector('.cs-search-none');if(none)none.hidden=shown>0;
}
/* The standard dropdown for a FORM that reads its values back by id.
   apCS has no element carrying the id itself, so this pairs it with a hidden
   input that does - kept in step on every pick - and getElementById(id).value
   keeps working, the way apCD keeps its input. onChange (a global function
   name) runs after the pick, for forms that track unsaved changes. */
function sbSelect(id,opts,val,onChange){
  return apCS(id,opts,val,'Select','sbSelSync')
      .replace('<div class="cs-wrap"','<div class="cs-wrap"'+(onChange?' data-sbnext="'+onChange+'"':''))
    +'<input type="hidden" id="'+id+'" value="'+attrSafe(val==null?'':val)+'">';
}
function sbSelSync(val,csid){
  const inp=document.getElementById(csid);if(inp)inp.value=val;
  const wrap=document.getElementById('csw-'+csid);
  const next=wrap&&wrap.dataset.sbnext;
  if(next&&typeof window[next]==='function')window[next](val,csid);
}
/* A filter's value cut short with "…" (main.css) shows in full on hover: the tooltip is set only
   while the text is actually cut, so a value that fits has none. */
document.addEventListener('mouseover',function(e){
  const t=e.target&&e.target.closest&&e.target.closest('.lp-filter-bar-row .cs-trigger');if(!t)return;
  const v=t.querySelector('.cs-value');if(!v)return;
  if(v.scrollWidth>v.clientWidth+1)t.title=v.textContent;else if(t.hasAttribute('title'))t.removeAttribute('title');
});
function csSelect(opt,val,csid){
  const drop=document.getElementById('csd-'+csid);if(!drop)return;
  /* Opt-in un-pick: on a select marked data-csclear, choosing the option that
     is already selected clears the field back to its placeholder. getCSValue
     then reads '' and any hook is told the value is now ''. */
  const cwrap=document.getElementById('csw-'+csid);
  if(cwrap&&cwrap.dataset.csclear&&opt.classList.contains('cs-selected')){
    sbMarkDirty(opt);
    opt.classList.remove('cs-selected');
    const t=document.querySelector(`[data-csid="${csid}"]`);
    if(t){t.querySelector('.cs-value').textContent=t.dataset.csph||'Select';t.classList.add('cs-placeholder');t.classList.remove('cs-open');}
    drop.classList.remove('cs-open');
    const h=cwrap.dataset.cshook;if(h&&typeof window[h]==='function')window[h]('',csid);
    return;
  }
  sbMarkDirty(opt);
  drop.querySelectorAll('.cs-option').forEach(o=>o.classList.remove('cs-selected'));
  opt.classList.add('cs-selected');
  const trigger=document.querySelector(`[data-csid="${csid}"]`);
  if(trigger){trigger.querySelector('.cs-value').textContent=val;trigger.classList.remove('cs-placeholder','cs-open');}
  drop.classList.remove('cs-open');
  if(csid==='ap-filter-type')setApFilterType(val);
  /* Contract Type re-scopes the whole listing - Status options, column
     headers, summary cards - so it applies on selection rather than waiting
     for Search, which would leave those three showing the old type. */
  else if(csid==='ct-f-type')ctSetType(ctTypeFromLabel(val));
  else if(csid==='ap-filter-value')apFilterValue=val;
  else if(csid==='lp-filter-field')lpFilterField=val;
  else if(csid==='lp-filter-status')lpFilterStatus=val;
  /* Anything else that needs to react declares a hook on the select itself.
     Add new side effects THERE, not as another branch above. */
  const wrap=document.getElementById('csw-'+csid);
  const hook=wrap&&wrap.dataset.cshook;
  if(hook&&typeof window[hook]==='function')window[hook](val,csid);
}
/* ── CUSTOM DATE PICKER (apCD) ─────────────────────────────────────────────
   A drop-in replacement for <input type="date">, whose calendar is drawn by
   the browser and cannot be styled - it landed in our filter bars as a piece
   of stray Chrome UI with its own type, spacing and blue selection.

   IT KEEPS THE INPUT. The element carrying `id` is still an <input> holding
   the same ISO yyyy-mm-dd value, just hidden behind the widget, so every
   existing reader - getElementById(id).value - keeps working untouched and
   swapping a native picker for this one is a one-line change at the call site.

   `onpick` is an optional function NAME, called with the ISO value, for the
   call sites that used onchange.                                            */
const cdView={};   // id -> {y,m} the panel is currently showing
const CD_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const CD_MON_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function cdISO(dt){const p=n=>(n<10?'0':'')+n;return dt.getFullYear()+'-'+p(dt.getMonth()+1)+'-'+p(dt.getDate());}
function cdParse(iso){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');
  return m?new Date(+m[1],+m[2]-1,+m[3]):null;
}
// "18 Aug 2026" reads at a glance; "2026-08-18" and "dd-mm-yyyy" do not.
function cdLabel(iso){const d=cdParse(iso);return d?d.getDate()+' '+CD_MON_SHORT[d.getMonth()]+' '+d.getFullYear():'';}
function getCDValue(id){const el=document.getElementById(id);return el?el.value:'';}
function apCD(id,value,placeholder,onpick){
  const iso=value||'';
  const lbl=cdLabel(iso);
  const calIco='<svg class="cd-cal-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4.5" width="18" height="17" rx="2.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  return '<div class="cd-wrap" id="cdw-'+id+'">'
    +'<input type="hidden" id="'+id+'" value="'+iso+'"'+(onpick?' data-cdpick="'+onpick+'"':'')+'>'
    // The placeholder rides on the trigger so Clear can restore it verbatim.
    +'<button type="button" class="cd-trigger'+(lbl?'':' cd-placeholder')+'" data-cdid="'+id+'" data-cdph="'+(placeholder||'Select date')+'" onclick="cdToggle(this)">'
      +'<span class="cd-value">'+(lbl||placeholder||'Select date')+'</span>'+calIco
    +'</button>'
    +'<div class="cd-panel" id="cdp-'+id+'"></div>'
  +'</div>';
}
function cdToggle(btn){
  const id=btn.dataset.cdid;
  const panel=document.getElementById('cdp-'+id);if(!panel)return;
  const wasOpen=panel.classList.contains('cd-open');
  cdCloseAll();
  if(wasOpen)return;                       // clicking the open trigger closes it
  const cur=cdParse(getCDValue(id))||new Date();
  cdView[id]={y:cur.getFullYear(),m:cur.getMonth()};   // always reopen on the selected month
  cdPaint(id);
  panel.classList.add('cd-open');
  btn.classList.add('cd-open');
  cdPlace(btn,panel);
}
/* Measured, not guessed: the panel is fixed-positioned, so it needs real
   coordinates. Aligned to the trigger's left edge and dropped below it, unless
   that would run past an edge - then it flips to the right of the trigger or
   opens upward, the way the row action menus already do. */
/* Was a fourth hand-rolled copy of this arithmetic, with the same "else place
   above" guess the other three had — and no idea that a transformed ancestor
   moves what `fixed` resolves against, which matters now the picker is used
   inside modals. It goes through the shared placer like everything else.
   alignLeft, because a date panel belongs under the left edge of its field;
   no width, because the calendar has its own. */
function cdPlace(btn,panel){
  placeAnchoredMenu(panel,btn.getBoundingClientRect(),{alignLeft:true});
  /* A capped calendar scrolls its weeks, and starting them at the first of the
     month would hide the day the field is already set to. placeAnchoredMenu
     does this for menus by scrolling the menu itself; here the scroller is the
     grid, so it is done from the control that knows which cell matters. */
  const grid=panel.querySelector('.cd-grid');
  if(!grid)return;
  if(grid.scrollHeight<=grid.clientHeight+1){grid.scrollTop=0;return;}
  const cell=grid.querySelector('.cd-sel')||grid.querySelector('.cd-today');
  grid.scrollTop=cell?Math.max(0,cell.offsetTop-(grid.clientHeight-cell.offsetHeight)/2):0;
}
function cdCloseAll(){
  document.querySelectorAll('.cd-panel.cd-open').forEach(p=>p.classList.remove('cd-open'));
  document.querySelectorAll('.cd-trigger.cd-open').forEach(t=>t.classList.remove('cd-open'));
}
function cdNav(id,delta){
  const v=cdView[id]||{y:new Date().getFullYear(),m:new Date().getMonth()};
  const d=new Date(v.y,v.m+delta,1);
  cdView[id]={y:d.getFullYear(),m:d.getMonth()};
  cdPaint(id);
}
function cdPaint(id){
  const panel=document.getElementById('cdp-'+id);if(!panel)return;
  const v=cdView[id],sel=getCDValue(id),todayISO=cdISO(new Date());
  const first=new Date(v.y,v.m,1);
  const lead=first.getDay();                       // Sunday-first, matching the native picker's week
  const dim=new Date(v.y,v.m+1,0).getDate();
  const weeks=Math.ceil((lead+dim)/7);             // five for most months, six when one needs it
  const chev=d=>'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="'+(d<0?'15 18 9 12 15 6':'9 18 15 12 9 6')+'"/></svg>';
  /* THIS MONTH ONLY. It used to draw a fixed 42 cells from the Sunday before
     the 1st, greying whatever fell outside — which gave a five-week month
     like September 2026 an entire sixth row of October, on top of the odd
     days either end. A panel anchored low in the window then had to SCROLL to
     show a week that was not even the month on its title bar. It draws the
     weeks the month occupies and leaves the rest of the first and last week
     blank, the way .oh-day.is-empty does in the holidays calendar. The panel
     is a row shorter in a five-week month; the arrows are how you reach the
     next one, which is what they were always for. */
  let cells='';
  for(let i=0;i<weeks*7;i++){
    const dn=i-lead+1;
    if(dn<1||dn>dim){cells+='<span class="cd-day cd-blank"></span>';continue;}
    const iso=cdISO(new Date(v.y,v.m,dn));
    const cls='cd-day'+(iso===todayISO?' cd-today':'')+(sel&&iso===sel?' cd-sel':'');
    cells+='<button type="button" class="'+cls+'" onclick="cdPick(\''+id+'\',\''+iso+'\')">'+dn+'</button>';
  }
  panel.innerHTML='<div class="cd-head">'
      +'<button type="button" class="cd-nav" onclick="cdNav(\''+id+'\',-1)" title="Previous month">'+chev(-1)+'</button>'
      +'<span class="cd-title">'+CD_MONTHS[v.m]+' '+v.y+'</span>'
      +'<button type="button" class="cd-nav" onclick="cdNav(\''+id+'\',1)" title="Next month">'+chev(1)+'</button>'
    +'</div>'
    +'<div class="cd-grid">'+['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>'<div class="cd-dow">'+d+'</div>').join('')+cells+'</div>'
    +'<div class="cd-foot">'
      +'<button type="button" class="cd-link" onclick="cdClear(\''+id+'\')">Clear</button>'
      +'<button type="button" class="cd-link cd-strong" onclick="cdPick(\''+id+'\',\''+todayISO+'\')">Today</button>'
    +'</div>';
}
// One path for every value change, so the hidden input, the trigger label and
// any onpick hook can never disagree about what the field holds.
function cdSet(id,iso){
  const inp=document.getElementById(id);if(!inp)return;
  inp.value=iso;
  sbMarkDirty(inp);
  const trigger=document.querySelector('[data-cdid="'+id+'"]');
  if(trigger){
    trigger.querySelector('.cd-value').textContent=cdLabel(iso)||trigger.dataset.cdph||'Select date';
    trigger.classList.toggle('cd-placeholder',!iso);
  }
  const hook=inp.dataset.cdpick;
  /* id as well as the value, matching apCS's hook, so one handler can serve
     every date field on a form instead of one named handler per field. */
  if(hook&&typeof window[hook]==='function')window[hook](iso,id);
}
function cdPick(id,iso){cdSet(id,iso);cdCloseAll();}
function cdClear(id){cdSet(id,'');cdCloseAll();}
/* A fixed panel does not travel with its trigger, so any scroll underneath it
   would leave the calendar stranded. Capture phase, because scroll does not
   bubble - one listener covers every scroll container there will ever be. */
document.addEventListener('scroll',function(e){
  var open=document.querySelector('.cd-panel.cd-open');
  if(!open)return;
  /* ...but the panel's OWN weeks scroll when it has been capped short, and a
     calendar that shut itself the moment it scrolled to the selected day would
     never be open long enough to click. Only scrolling underneath it counts. */
  if(e.target&&e.target.nodeType===1&&open.contains(e.target))return;
  cdCloseAll();
},true);
window.addEventListener('resize',cdCloseAll);

function markApFormDirty(){}
function cancelAddPolicy(){selectedEmps=new Set();apFilterType='';apFilterValue='';lpAddModalOpen=false;renderADTPage();}
function resetLpFilters(){lpFilterField='';lpFilterStatus='';lpFilterQuery='';renderADTPage();}
function addListingItem(pg){if(pg==='contracts'){
  /* Inside a type's listing the type is already chosen, so Add opens that
     type's own intake rather than the chooser (or the AI assistant, which
     would start by asking for a type again). The landing and the All band
     have no type yet and keep the chooser. */
  if(page==='contracts'&&!ctLandingOpen&&ctTypeFilter!==CT_TYPE_ALL&&ctTypeEnabled(ctTypeFilter)){aiAssistedFlow=false;aiContractPrefill=null;ctStartIntake(ctTypeFilter,'listing');return;}
  ctIntakeFrom='chooser';const j=aiJourneys.find(x=>x.id==='contract-creation');aiAssistedFlow=false;aiContractPrefill=null;aiCtAnimatedStage=-1;aiCtPendingEmpType='';aiCtJourneyEmployee=null;page=(j&&j.status==='Active')?'ai-contract-assistant':'contract-type-select';renderADTPage();}else if(pg==='teams'){startAddTeam();}else if(pg==='all-leaves'){startAddLeave();}else if(pg==='compliance'){complianceModalOpen=true;renderADTPage();}else if(pg==='rates-rules'){ratesRuleModalOpen=true;renderADTPage();}else if(pg==='contract-templates'){ctpModalOpen=true;renderADTPage();}else if(pg==='payheads'){startAddPayhead();}else if(pg==='holidays'){startAddHoliday();}else if(pg==='support-tickets'){openCreateTicket();}/* Direct, Global and the Employees tab all open the same four-step intake;
   the sub-tab decides which listing it lands in and which step-2 fields
   exist. See js/employee-add.js. */
else if(pg==='employees'||pg==='direct'||pg==='global'){startAddEmployee(pg==='global'||(pg==='employees'&&empSubTab==='global')?'ge':'de');}else if(pg==='payments'){startAddInvoice();}else if(pg==='payroll'){startAddPayRun();}else if(pg==='asset-allocation'){startAddAsset();}else if(pg==='it-access'){startAddItAccess();}else{addDemoMetaRow(pg);}}
/* addDemoEmployee() and its name pool lived here: one button that invented a
   plausible record and inserted it. It is gone, not deprecated - the four-step
   intake in js/employee-add.js is the only way an employee is created now, so
   a second path that skipped every required field would only make the form
   optional. */
function addDemoMetaRow(pg){
  const meta=getPageMeta(pg);
  if(!meta||!meta.rows||!meta.columns||!meta.columns.length){showToast('Nothing to add here','info');return;}
  const cols=meta.columns;
  const row=cols.map(function(c,i){
    if(i===0)return meta.rows.length+1;
    const lc=String(c).toLowerCase();
    if(lc==='status')return 'Pending';
    if(lc.indexOf('name')>=0||lc===meta.title.toLowerCase().replace(/s$/,''))return 'New '+meta.title.replace(/s$/,'');
    if(lc.indexOf('date')>=0||lc.indexOf('active')>=0||lc.indexOf('updated')>=0)return 'Today';
    return '--';
  });
  row[0]=0;
  meta.rows.unshift(row);
  meta.rows.forEach(function(r,i){r[0]=i+1;});
  renderADTPage();
  showToast(meta.title.replace(/s$/,'')+' added','success','A new record has been created.');
}

// -- DIRECT EMPLOYEE PAGE --
/* `status` is the Employee Status - Pending, Onboarding, Active or
   Inactive - and is settled from each record's log at load by
   employee-lifecycle.js, which also holds the seeded histories
   (EMP_LIFE_SEED) and the requested documents (EMP_REQ_SEED). Offboarding is
   a phase of Active, not a status.

   The rows cover every stage of the journey: Antar and Pallavi Active, Anika
   Active and mid-offboarding, Rahul Inactive, Dev verified and waiting on
   Asset & IT, Meera waiting on her documents, Karan still Pending. */
const directEmpData=[
  {id:1,name:'Antar Malhotra',empId:'EMP001',dept:'Engineering',branch:'Punjab',jobTitle:'Software Engineer',joinDate:'15 Jan 2025',desc:'Full time employee',contact:'+91 9999999996',email:'antar@testemp.com',status:'Active'},
  {id:2,name:'Pallavi Parate',empId:'EMP002',dept:'HR',branch:'Hyderabad',jobTitle:'HR Manager',joinDate:'20 Mar 2024',desc:'Full time employee',contact:'+91 8888888888',email:'pallavi@testemp.com',status:'Active'},
  {id:3,name:'Anika Shah',empId:'EMP003',dept:'Engineering',branch:'Mumbai',jobTitle:'Developer',joinDate:'05 Jun 2024',desc:'Contract employee',contact:'+91 7777777777',email:'anika@testemp.com',status:'Active'},
  {id:4,name:'Rahul Mehta',empId:'EMP004',dept:'Product',branch:'Delhi',jobTitle:'Product Manager',joinDate:'01 Feb 2024',desc:'--',contact:'--',email:'rahul@testemp.com',status:'Inactive'},
  {id:5,name:'Dev Kulkarni',empId:'EMP005',dept:'Engineering',branch:'Bangalore',jobTitle:'QA Engineer',joinDate:'10 Sep 2026',desc:'Full time employee',contact:'+91 9812345670',email:'dev@testemp.com',status:'Onboarding'},
  {id:6,name:'Meera Iyer',empId:'EMP006',dept:'Design',branch:'Hyderabad',jobTitle:'UX Designer',joinDate:'15 Sep 2026',desc:'Full time employee',contact:'+91 9812345671',email:'meera@testemp.com',status:'Onboarding'},
  {id:7,name:'Karan Verma',empId:'EMP007',dept:'Engineering',branch:'Bangalore',jobTitle:'Software Engineer',joinDate:'--',desc:'Full time employee',contact:'+91 9812345672',email:'karan@testemp.com',status:'Pending'},
];
const deWorkflowData={
  1:[
    {title:'Onboarding Complete',user:'HR',date:'15 Jan 2025',time:'09:00:00 AM',description:'Employee onboarding checklist completed and access provisioned.'},
    {title:'Background Verification Cleared',user:'Admin',date:'10 Jan 2025',time:'03:00:00 PM',description:'Background verification cleared. Employee cleared for joining.'}
  ],
  2:[
    {title:'Onboarding Complete',user:'Admin',date:'20 Mar 2024',time:'10:15:00 AM',description:'HR Manager onboarding completed. Access to HR systems granted.'}
  ],
  3:[
    {title:'Contract Signed',user:'HR',date:'05 Jun 2024',time:'11:30:00 AM',description:'Contract signed by employee. Contract type: Fixed term.'}
  ],
  4:[
    {title:'Exit Initiated',user:'Admin',date:'12 Feb 2025',time:'02:00:00 PM',description:'Offboarding workflow initiated. Final settlement pending review.'},
    {title:'Onboarding Complete',user:'Admin',date:'01 Feb 2024',time:'09:00:00 AM',description:'Employee onboarded. Role: Product Manager.'}
  ],
  5:[
    {title:'Verification Completed',user:'Tarak Swain',date:'05 Sep 2026',time:'03:05:00 PM',description:'Documents verified. Asset allocation and IT access still open.'}
  ],
  6:[
    {title:'Onboarding Initiated',user:'HR',date:'02 Sep 2026',time:'09:15:00 AM',description:'Onboarding invitation sent. Awaiting information and documents from the employee.'}
  ]
};
let deSelectedId=null,deTab='basic-details';
let deDeptFilter='',deBranchFilter='',deStatusFilter='';
const globalEmpData=[
  {id:1,name:'Emma Schmidt',empId:'GEP001',dept:'Engineering',country:'Germany',jobTitle:'Senior Developer',workerType:'EOR',joinDate:'10 Feb 2024',desc:'Full time employee',contact:'+49 152 0000 0001',email:'emma@testemp.com',status:'Active'},
  {id:2,name:'Lucas Dubois',empId:'GEP002',dept:'Finance',country:'France',jobTitle:'Finance Analyst',workerType:'EOR',joinDate:'15 Apr 2024',desc:'Full time employee',contact:'+33 6 12 34 56 78',email:'lucas@testemp.com',status:'Active'},
  {id:3,name:'Sofia Romano',empId:'GEP003',dept:'HR',country:'Italy',jobTitle:'HR Specialist',workerType:'Contractor',joinDate:'01 Mar 2024',desc:'Contract employee',contact:'+39 347 000 0001',email:'sofia@testemp.com',status:'Active'},
  {id:4,name:'James Wilson',empId:'GEP004',dept:'Operations',country:'United Kingdom',jobTitle:'Ops Manager',workerType:'EOR',joinDate:'--',desc:'--',contact:'+44 7000 000001',email:'james@testemp.com',status:'Inactive'},
  /* Same reason as EMP005/EMP006 above: Marco is blocked on a missing
     document, Ana cleared verification with the optional re-submission item
     never needed. */
  {id:5,name:'Marco Rossi',empId:'GEP005',dept:'Engineering',country:'Italy',jobTitle:'Backend Developer',workerType:'EOR',joinDate:'21 Sep 2026',desc:'Full time employee',contact:'+39 347 000 0002',email:'marco@testemp.com',status:'Onboarding'},
  {id:6,name:'Ana Silva',empId:'GEP006',dept:'Support',country:'Portugal',jobTitle:'Support Specialist',workerType:'EOR',joinDate:'14 Sep 2026',desc:'Full time employee',contact:'+351 91 000 0001',email:'ana@testemp.com',status:'Onboarding'},
];
let geStatusFilter='';
const geWorkflowData={
  1:[
    {title:'Onboarding Complete',user:'HR',date:'10 Feb 2024',time:'09:00:00 AM',description:'EOR onboarding via Dhi completed. Access provisioned for Germany entity.'},
    {title:'Contract Signed',user:'Admin',date:'05 Feb 2024',time:'04:00:00 PM',description:'EOR employment contract signed by employee and Dhi.'}
  ],
  2:[
    {title:'Onboarding Complete',user:'Admin',date:'15 Apr 2024',time:'10:30:00 AM',description:'EOR onboarding complete. France entity payroll activated.'}
  ],
  3:[
    {title:'Contract Renewed',user:'HR',date:'20 Nov 2024',time:'02:15:00 PM',description:'Contractor agreement renewed for 12 months.'},
    {title:'Contract Signed',user:'Admin',date:'01 Mar 2024',time:'09:00:00 AM',description:'Initial contractor agreement signed.'}
  ],
  4:[
    {title:'Offboarding Initiated',user:'Admin',date:'05 Jan 2025',time:'03:00:00 PM',description:'Offboarding workflow started. Final settlement and access revocation pending.'},
    {title:'Onboarding Complete',user:'Admin',date:'01 Feb 2024',time:'09:00:00 AM',description:'EOR onboarding complete. UK entity payroll activated.'}
  ],
  5:[
    {title:'Documents Received',user:'System',date:'01 Sep 2026',time:'07:40:00 PM',description:'Employee submitted mandatory information. Codice Fiscale document still outstanding.'}
  ],
  6:[
    {title:'Documents Submitted',user:'System',date:'01 Sep 2026',time:'12:35:00 PM',description:'All requested documents uploaded. Waiting for Compliance verification.'}
  ]
};
let geSelectedId=null,geTab='basic-details';
const teamsData=[
  {id:1,teamId:'2881',name:'Core Payroll',dept:'Finance',country:'Netherlands',members:18,email:'corepayroll@testemp.com',createdBy:'Admin',joinDate:'From: 01 Jan 2025',status:'Active',
   membersList:[{name:'Emma Schmidt',role:'Reporting Manager',desig:'Finance Head'},{name:'Lucas Dubois',role:'Member',desig:'Payroll Analyst'},{name:'Sofia Romano',role:'Member',desig:'--'}]},
  {id:2,teamId:'2882',name:'People Ops',dept:'HR',country:'India',members:12,email:'peopleops@testemp.com',createdBy:'Pallavi Parate',joinDate:'From: 15 Feb 2025',status:'Active',
   membersList:[{name:'Pallavi Parate',role:'Reporting Manager',desig:'HR Manager'},{name:'Anika Shah',role:'Member',desig:'HR Specialist'}]},
  {id:3,teamId:'2883',name:'Compliance Desk',dept:'Legal',country:'Germany',members:7,email:'compliance@testemp.com',createdBy:'Tarak Swain',joinDate:'From: 01 Mar 2025',status:'Active',
   membersList:[{name:'James Wilson',role:'Reporting Manager',desig:'Legal Head'},{name:'Emma Schmidt',role:'Member',desig:'Compliance Analyst'}]},
  {id:4,teamId:'2884',name:'Entity Setup',dept:'Operations',country:'Spain',members:9,email:'entitysetup@testemp.com',createdBy:'Admin',joinDate:'From: 10 Apr 2025',status:'Pending',
   membersList:[{name:'Rahul Mehta',role:'Reporting Manager',desig:'Ops Manager'}]},
  {id:5,teamId:'2885',name:'Customer Success',dept:'Support',country:'United Kingdom',members:21,email:'customersuccess@testemp.com',createdBy:'Admin',joinDate:'From: 01 May 2025',status:'Active',
   membersList:[{name:'Nora Kim',role:'Reporting Manager',desig:'CS Lead'},{name:'Luis Martin',role:'Member',desig:'CS Specialist'},{name:'Antar Malhotra',role:'Member',desig:'--'}]},
  {id:6,teamId:'2886',name:'Local Admin',dept:'Admin',country:'Netherlands',members:4,email:'localadmin@testemp.com',createdBy:'Admin',joinDate:'From: 01 Jun 2025',status:'Inactive',
   membersList:[]}
];
const tmLogsData={
  1:[{date:'10 Jun 2025',time:'11:00:00 AM',user:'Admin',status:'Updated',action:'Team members updated. Count changed to 18.'},{date:'01 Jan 2025',time:'09:00:00 AM',user:'Admin',status:'Created',action:'Team Core Payroll created.'}],
  2:[{date:'15 Feb 2025',time:'10:00:00 AM',user:'Admin',status:'Created',action:'Team People Ops created.'}],
  3:[{date:'01 Mar 2025',time:'09:00:00 AM',user:'Admin',status:'Created',action:'Team Compliance Desk created.'}],
  4:[{date:'10 Apr 2025',time:'02:00:00 PM',user:'Admin',status:'Updated',action:'Team status set to Pending — approval awaited.'},{date:'10 Apr 2025',time:'09:00:00 AM',user:'Admin',status:'Created',action:'Team Entity Setup created.'}],
  5:[{date:'20 May 2025',time:'03:00:00 PM',user:'Admin',status:'Updated',action:'New members added to Customer Success team.'},{date:'01 May 2025',time:'09:00:00 AM',user:'Admin',status:'Created',action:'Team Customer Success created.'}],
  6:[{date:'15 Jul 2025',time:'04:00:00 PM',user:'Admin',status:'Inactive',action:'Team status changed to Inactive.'},{date:'01 Jun 2025',time:'09:00:00 AM',user:'Admin',status:'Created',action:'Team Local Admin created.'}]
};
const tmWorkflowData={
  1:[{title:'Team Activated',user:'Admin',date:'01 Jan 2025',time:'09:00:00 AM',description:'Team setup complete. Finance payroll team activated with 18 members.'},{title:'Members Assigned',user:'Admin',date:'01 Jan 2025',time:'10:00:00 AM',description:'Initial member assignment completed for Core Payroll team.'}],
  2:[{title:'Team Activated',user:'Admin',date:'15 Feb 2025',time:'10:00:00 AM',description:'People Ops team set up. HR workflows initialised.'}],
  3:[{title:'Team Activated',user:'Tarak Swain',date:'01 Mar 2025',time:'09:00:00 AM',description:'Compliance Desk team activated for Germany entity.'}],
  4:[{title:'Approval Pending',user:'Admin',date:'10 Apr 2025',time:'02:00:00 PM',description:'Entity Setup team pending approval from regional head.'},{title:'Team Created',user:'Admin',date:'10 Apr 2025',time:'09:00:00 AM',description:'Entity Setup team created and submitted for approval.'}],
  5:[{title:'Team Activated',user:'Admin',date:'01 May 2025',time:'09:00:00 AM',description:'Customer Success team activated for UK entity.'}],
  6:[{title:'Team Deactivated',user:'Admin',date:'15 Jul 2025',time:'04:00:00 PM',description:'Local Admin team deactivated. Members reassigned.'},{title:'Team Activated',user:'Admin',date:'01 Jun 2025',time:'09:00:00 AM',description:'Local Admin team created for Netherlands entity.'}]
};
let tmSelectedId=null,tmTab='basic-details';
let tmDeptFilter='',tmStatusFilter='';
const ctFlow=['Submitted','Quotation Approved','Proposal Sent','Proposal Approved','Contract Sent','Contract Approved','Onboarding','Ready for Payroll'];
const contractsData=[
  {id:1,contractId:'94135',empName:'Antar Malhotra',empDesig:'Business Analyst',country:'Netherlands',type:'EOR',serviceType:'Permanent',date:'2026-06-11 15:17:26',status:'Submitted',
   nationality:'India',countryOfOp:'Netherlands',workPermit:false,gender:'MALE',email:'antar@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'Business Analyst',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:2,contractId:'94134',empName:'Rashi Singh',empDesig:'java',country:'Netherlands',type:'EOR',serviceType:'Fixed term',date:'2026-06-06 15:05:48',status:'Proposal Sent',
   nationality:'India',countryOfOp:'Netherlands',workPermit:false,gender:'FEMALE',email:'rashi@testemp.com',contact:'+91 8888888888',dob:'1995-03-15',jobTitle:'Java Developer',skill:'Java, Spring Boot',empDuration:'2026-06-06 – 2026-12-06',empType:'EOR',workSchedule:'8',payAmount:'85000',currency:'INR',jobDesc:'Java backend development',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.04',baseGross:'0.06',holidayBonus:'0.06',month13:'0.06',monthlyGrossNet:'0.02',monthlyInvoice:'0.02',monthlySalary12:'0.05',monthlySalary1392:'0.06',netPay:'0.10',socialPremAmt:'0.05',socialPremPct:'26.02',totalMonthlyGross:'0.05'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:3,contractId:'94133',empName:'Deepak Singh',empDesig:'java',country:'Netherlands',type:'EOR',serviceType:'Permanent',date:'2026-06-06 14:07:35',status:'Inactive',
   nationality:'India',countryOfOp:'Netherlands',workPermit:false,gender:'MALE',email:'deepak@testemp.com',contact:'+91 7777777777',dob:'1993-07-22',jobTitle:'Java Developer',skill:'Java',empDuration:'2026-06-06 – 2026-12-06',empType:'EOR',workSchedule:'8',payAmount:'78000',currency:'INR',jobDesc:'Java development',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.04',baseGross:'0.05',holidayBonus:'0.05',month13:'0.05',monthlyGrossNet:'0.01',monthlyInvoice:'0.02',monthlySalary12:'0.04',monthlySalary1392:'0.05',netPay:'0.09',socialPremAmt:'0.04',socialPremPct:'26.02',totalMonthlyGross:'0.04'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Inactive',doc:null}]},
  {id:4,contractId:'94132',empName:'Rajdeep Singh',empDesig:'java developer',country:'Netherlands',type:'EOR',serviceType:'Fixed term',date:'2026-06-06 12:34:17',status:'Proposal Sent',
   nationality:'India',countryOfOp:'Netherlands',workPermit:false,gender:'MALE',email:'rajdeep@testemp.com',contact:'+91 6666666666',dob:'1990-11-10',jobTitle:'Java Developer',skill:'Java, Microservices',empDuration:'2026-06-06 – 2026-12-06',empType:'EOR',workSchedule:'8',payAmount:'90000',currency:'INR',jobDesc:'java developer',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.06',holidayBonus:'0.06',month13:'0.06',monthlyGrossNet:'0.02',monthlyInvoice:'0.02',monthlySalary12:'0.05',monthlySalary1392:'0.06',netPay:'0.11',socialPremAmt:'0.05',socialPremPct:'26.02',totalMonthlyGross:'0.05'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:5,contractId:'94136',empName:'Sanne de Vries',empDesig:'Payroll Specialist',country:'Netherlands',type:'EOR',serviceType:'Permanent',date:'2026-06-12 10:10:00',status:'Ready for Payroll',
   nationality:'India',countryOfOp:'Netherlands',workPermit:false,gender:'MALE',email:'sanne.de.vries@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'Payroll Specialist',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:6,contractId:'94137',empName:'Marco Rossi',empDesig:'Frontend Engineer',country:'Netherlands',type:'EOR',serviceType:'Part time',date:'2026-06-13 10:11:00',status:'Ready for Payroll',
   nationality:'India',countryOfOp:'Netherlands',workPermit:false,gender:'MALE',email:'marco.rossi@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'Frontend Engineer',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:7,contractId:'94138',empName:'Priya Nair',empDesig:'QA Analyst',country:'India',type:'PEO',serviceType:'Permanent',date:'2026-06-14 10:12:00',status:'Ready for Payroll',
   nationality:'India',countryOfOp:'India',workPermit:false,gender:'MALE',email:'priya.nair@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'QA Analyst',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:8,contractId:'94139',empName:'Tom Baker',empDesig:'Account Manager',country:'United Kingdom',type:'EOR',serviceType:'Fixed term',date:'2026-06-15 10:13:00',status:'Ready for Payroll',
   nationality:'India',countryOfOp:'United Kingdom',workPermit:false,gender:'MALE',email:'tom.baker@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'Account Manager',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:9,contractId:'94140',empName:'Lena Fischer',empDesig:'Data Engineer',country:'Germany',type:'EOR',serviceType:'Permanent',date:'2026-06-16 10:14:00',status:'Ready for Payroll',
   nationality:'India',countryOfOp:'Germany',workPermit:false,gender:'MALE',email:'lena.fischer@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'Data Engineer',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:10,contractId:'94141',empName:'Carlos Ruiz',empDesig:'Support Lead',country:'Spain',type:'EOR',serviceType:'Permanent',date:'2026-06-17 10:15:00',status:'Onboarding',
   nationality:'India',countryOfOp:'Spain',workPermit:false,gender:'MALE',email:'carlos.ruiz@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'Support Lead',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:11,contractId:'94142',empName:'Aisha Khan',empDesig:'HR Coordinator',country:'India',type:'PEO',serviceType:'Permanent',date:'2026-06-18 10:16:00',status:'Onboarding',
   nationality:'India',countryOfOp:'India',workPermit:false,gender:'MALE',email:'aisha.khan@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'HR Coordinator',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:12,contractId:'94143',empName:'Jonas Meyer',empDesig:'DevOps Engineer',country:'Germany',type:'EOR',serviceType:'Fixed term',date:'2026-06-19 10:17:00',status:'Onboarding',
   nationality:'India',countryOfOp:'Germany',workPermit:false,gender:'MALE',email:'jonas.meyer@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'DevOps Engineer',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:13,contractId:'94144',empName:'Emma Wilson',empDesig:'Product Designer',country:'United Kingdom',type:'EOR',serviceType:'Permanent',date:'2026-06-20 10:18:00',status:'Contract Approved',
   nationality:'India',countryOfOp:'United Kingdom',workPermit:false,gender:'MALE',email:'emma.wilson@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'Product Designer',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  {id:14,contractId:'94145',empName:'Ravi Shankar',empDesig:'Backend Engineer',country:'India',type:'PEO',serviceType:'Part time',date:'2026-06-21 10:19:00',status:'Contract Sent',
   nationality:'India',countryOfOp:'India',workPermit:false,gender:'MALE',email:'ravi.shankar@testemp.com',contact:'+91 9999999996',dob:'2010-01-01',jobTitle:'Backend Engineer',skill:'JIRA',empDuration:'2026-06-11 – 2026-12-15',empType:'EOR',workSchedule:'7',payAmount:'100000',currency:'INR',jobDesc:'job desc',payFrequency:'Monthly',
   commercial:{adtFee:'549',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.07',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'EOR NL Proposal',note:'Optional',status:'Pending',doc:null}]},
  /* ── Immigration ──────────────────────────────────────────────────────────
     Same record shape as EOR/PEO on purpose. The four types differ in their
     stage list, their column labels and their summary cards - not in their
     storage - so one table renderer and one detail panel serve all four.
     `serviceType` is the type-scoped sub-product; it is what the type column
     reads for every type, with only the column's LABEL differing. */
  {id:15,contractId:'94146',empName:'Priya Raman',empDesig:'Solutions Architect',country:'Germany',type:'Immigration',serviceType:'New hire sponsorship',date:'2026-06-22 09:20:00',status:'Submitted',
   nationality:'India',countryOfOp:'Germany',workPermit:false,gender:'FEMALE',email:'priya.raman@testemp.com',contact:'+91 9812345670',dob:'1992-04-18',jobTitle:'Solutions Architect',skill:'Cloud Architecture',empDuration:'2026-07-01 – 2028-06-30',empType:'Immigration',workSchedule:'8',payAmount:'145000',currency:'INR',jobDesc:'Relocating to Germany on an EU Blue Card.',payFrequency:'Monthly',
   commercial:{adtFee:'1450',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.00',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'20.10',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'Passport copy',note:'Mandatory',status:'Pending',doc:null},{item:'Degree certificate',note:'Mandatory',status:'Pending',doc:null}]},
  {id:16,contractId:'94147',empName:'Diego Alvarez',empDesig:'Regional Sales Lead',country:'Spain',type:'Immigration',serviceType:'Relocation',date:'2026-06-22 11:05:00',status:'Proposal Sent',
   nationality:'Mexico',countryOfOp:'Spain',workPermit:false,gender:'MALE',email:'diego.alvarez@testemp.com',contact:'+34 600112233',dob:'1988-11-02',jobTitle:'Regional Sales Lead',skill:'Enterprise Sales',empDuration:'2026-08-01 – 2029-07-31',empType:'Immigration',workSchedule:'8',payAmount:'62000',currency:'EUR',jobDesc:'Intra-company relocation to Madrid.',payFrequency:'Monthly',
   commercial:{adtFee:'1250',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.00',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'23.60',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'Relocation proposal',note:'Mandatory',status:'Approved',doc:null}]},
  {id:17,contractId:'94148',empName:'Mei Tanaka',empDesig:'QA Lead',country:'Netherlands',type:'Immigration',serviceType:'Permit renewal',date:'2026-06-23 14:40:00',status:'Contract Sent',
   nationality:'Japan',countryOfOp:'Netherlands',workPermit:true,gender:'FEMALE',email:'mei.tanaka@testemp.com',contact:'+31 612345678',dob:'1990-07-25',jobTitle:'QA Lead',skill:'Test Automation',empDuration:'2026-09-01 – 2029-08-31',empType:'Immigration',workSchedule:'8',payAmount:'5800',currency:'EUR',jobDesc:'Highly skilled migrant permit renewal.',payFrequency:'Monthly',
   commercial:{adtFee:'980',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.00',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'Current permit copy',note:'Mandatory',status:'Approved',doc:null},{item:'Salary threshold check',note:'Mandatory',status:'Approved',doc:null}]},
  {id:18,contractId:'94149',empName:'Omar Haddad',empDesig:'Data Scientist',country:'United Kingdom',type:'Immigration',serviceType:'New hire sponsorship',date:'2026-06-24 10:00:00',status:'Pending Kickoff',
   nationality:'Jordan',countryOfOp:'United Kingdom',workPermit:false,gender:'MALE',email:'omar.haddad@testemp.com',contact:'+44 7700900123',dob:'1994-02-09',jobTitle:'Data Scientist',skill:'Machine Learning',empDuration:'2026-10-01 – 2029-09-30',empType:'Immigration',workSchedule:'8',payAmount:'4900',currency:'GBP',jobDesc:'Skilled Worker visa, Certificate of Sponsorship pending.',payFrequency:'Monthly',
   commercial:{adtFee:'1680',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.00',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'15.05',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'Certificate of Sponsorship',note:'Mandatory',status:'Pending',doc:null},{item:'English language evidence',note:'Mandatory',status:'Approved',doc:null}]},
  {id:19,contractId:'94150',empName:'Sara Lindqvist',empDesig:'Product Manager',country:'Germany',type:'Immigration',serviceType:'Transfer',date:'2026-06-25 16:30:00',status:'Ready for Filing',
   nationality:'Sweden',countryOfOp:'Germany',workPermit:true,gender:'FEMALE',email:'sara.lindqvist@testemp.com',contact:'+49 15112345678',dob:'1991-09-14',jobTitle:'Product Manager',skill:'Product Strategy',empDuration:'2026-08-15 – 2029-08-14',empType:'Immigration',workSchedule:'8',payAmount:'7200',currency:'EUR',jobDesc:'Intra-company transfer from Stockholm to Berlin.',payFrequency:'Monthly',
   commercial:{adtFee:'1120',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.00',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'20.10',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'Transfer letter',note:'Mandatory',status:'Approved',doc:null},{item:'Host entity declaration',note:'Mandatory',status:'Approved',doc:null}]},
  {id:20,contractId:'94151',empName:'Kofi Mensah',empDesig:'Finance Analyst',country:'Netherlands',type:'Immigration',serviceType:'Dependent visa support',date:'2026-06-26 09:15:00',status:'Filed',
   nationality:'Ghana',countryOfOp:'Netherlands',workPermit:true,gender:'MALE',email:'kofi.mensah@testemp.com',contact:'+31 687654321',dob:'1989-12-30',jobTitle:'Finance Analyst',skill:'FP&A',empDuration:'2026-07-01 – 2029-06-30',empType:'Immigration',workSchedule:'8',payAmount:'5100',currency:'EUR',jobDesc:'Dependent visas for spouse and one child.',payFrequency:'Monthly',
   commercial:{adtFee:'760',annualGross:'0.05',baseGross:'0.07',holidayBonus:'0.07',month13:'0.00',monthlyGrossNet:'0.02',monthlyInvoice:'0.03',monthlySalary12:'0.06',monthlySalary1392:'0.07',netPay:'0.13',socialPremAmt:'0.06',socialPremPct:'26.02',totalMonthlyGross:'0.06'},
   complianceItems:[{item:'Marriage certificate',note:'Mandatory',status:'Approved',doc:null},{item:'Birth certificate',note:'Mandatory',status:'Approved',doc:null}]},
  /* ── Contractor ───────────────────────────────────────────────────────────── */
  {id:21,contractId:'94152',empName:'Elena Petrova',empDesig:'UX Researcher',country:'Spain',type:'Contractor',serviceType:'Direct contractor management',date:'2026-06-22 13:10:00',status:'Submitted',
   nationality:'Bulgaria',countryOfOp:'Spain',workPermit:true,gender:'FEMALE',email:'elena.petrova@testemp.com',contact:'+34 611223344',dob:'1993-05-11',jobTitle:'UX Researcher',skill:'User Research',empDuration:'2026-07-01 – 2026-12-31',empType:'Contractor',workSchedule:'6',payAmount:'55',currency:'EUR',jobDesc:'Six-month research engagement, hourly.',payFrequency:'Hourly',
   commercial:{adtFee:'320',annualGross:'0.00',baseGross:'0.00',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.00',monthlyInvoice:'0.04',monthlySalary12:'0.00',monthlySalary1392:'0.00',netPay:'0.00',socialPremAmt:'0.00',socialPremPct:'0.00',totalMonthlyGross:'0.00'},
   complianceItems:[{item:'Classification questionnaire',note:'Mandatory',status:'Pending',doc:null}]},
  {id:22,contractId:'94153',empName:'Tom Becker',empDesig:'DevOps Consultant',country:'Germany',type:'Contractor',serviceType:'Contractor of Record',date:'2026-06-23 10:45:00',status:'Proposal Sent',
   nationality:'Germany',countryOfOp:'Germany',workPermit:true,gender:'MALE',email:'tom.becker@testemp.com',contact:'+49 15198765432',dob:'1986-08-21',jobTitle:'DevOps Consultant',skill:'Kubernetes',empDuration:'2026-07-15 – 2027-07-14',empType:'Contractor',workSchedule:'8',payAmount:'95',currency:'EUR',jobDesc:'Platform migration engagement.',payFrequency:'Hourly',
   commercial:{adtFee:'480',annualGross:'0.00',baseGross:'0.00',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.00',monthlyInvoice:'0.05',monthlySalary12:'0.00',monthlySalary1392:'0.00',netPay:'0.00',socialPremAmt:'0.00',socialPremPct:'0.00',totalMonthlyGross:'0.00'},
   complianceItems:[{item:'Classification questionnaire',note:'Mandatory',status:'Approved',doc:null},{item:'Trade registration',note:'Mandatory',status:'Approved',doc:null}]},
  {id:23,contractId:'94154',empName:'Aditya Rao',empDesig:'Mobile Developer',country:'India',type:'Contractor',serviceType:'Direct contractor management',date:'2026-06-24 15:25:00',status:'Contract Sent',
   nationality:'India',countryOfOp:'India',workPermit:true,gender:'MALE',email:'aditya.rao@testemp.com',contact:'+91 9876543210',dob:'1995-01-19',jobTitle:'Mobile Developer',skill:'React Native',empDuration:'2026-07-01 – 2027-06-30',empType:'Contractor',workSchedule:'8',payAmount:'2800',currency:'INR',jobDesc:'Mobile app build, retainer.',payFrequency:'Hourly',
   commercial:{adtFee:'210',annualGross:'0.00',baseGross:'0.00',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.00',monthlyInvoice:'0.04',monthlySalary12:'0.00',monthlySalary1392:'0.00',netPay:'0.00',socialPremAmt:'0.00',socialPremPct:'0.00',totalMonthlyGross:'0.00'},
   complianceItems:[{item:'Classification questionnaire',note:'Mandatory',status:'Approved',doc:null},{item:'PAN / GST details',note:'Mandatory',status:'Pending',doc:null}]},
  {id:24,contractId:'94155',empName:'Chloe Dubois',empDesig:'Brand Designer',country:'United Kingdom',type:'Contractor',serviceType:'Contractor conversion advisory',date:'2026-06-25 11:50:00',status:'Pending Onboarding',
   nationality:'France',countryOfOp:'United Kingdom',workPermit:true,gender:'FEMALE',email:'chloe.dubois@testemp.com',contact:'+44 7700900456',dob:'1992-03-08',jobTitle:'Brand Designer',skill:'Brand Identity',empDuration:'2026-08-01 – 2027-01-31',empType:'Contractor',workSchedule:'5',payAmount:'70',currency:'GBP',jobDesc:'Advisory on converting to a permanent engagement.',payFrequency:'Hourly',
   commercial:{adtFee:'395',annualGross:'0.00',baseGross:'0.00',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.00',monthlyInvoice:'0.05',monthlySalary12:'0.00',monthlySalary1392:'0.00',netPay:'0.00',socialPremAmt:'0.00',socialPremPct:'0.00',totalMonthlyGross:'0.00'},
   complianceItems:[{item:'IR35 assessment',note:'Mandatory',status:'Approved',doc:null}]},
  {id:25,contractId:'94156',empName:'Nikhil Sharma',empDesig:'Data Engineer',country:'India',type:'Contractor',serviceType:'Contractor of Record',date:'2026-06-26 08:35:00',status:'Onboarding',
   nationality:'India',countryOfOp:'India',workPermit:true,gender:'MALE',email:'nikhil.sharma@testemp.com',contact:'+91 9123456780',dob:'1990-10-27',jobTitle:'Data Engineer',skill:'Airflow, dbt',empDuration:'2026-07-01 – 2027-06-30',empType:'Contractor',workSchedule:'8',payAmount:'3100',currency:'INR',jobDesc:'Data platform engagement via Contractor of Record.',payFrequency:'Hourly',
   commercial:{adtFee:'265',annualGross:'0.00',baseGross:'0.00',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.00',monthlyInvoice:'0.04',monthlySalary12:'0.00',monthlySalary1392:'0.00',netPay:'0.00',socialPremAmt:'0.00',socialPremPct:'0.00',totalMonthlyGross:'0.00'},
   complianceItems:[{item:'Classification questionnaire',note:'Mandatory',status:'Approved',doc:null},{item:'Bank verification',note:'Mandatory',status:'Pending',doc:null}]},
  {id:26,contractId:'94157',empName:'Ana Costa',empDesig:'Technical Writer',country:'Spain',type:'Contractor',serviceType:'Direct contractor management',date:'2026-06-27 12:00:00',status:'Active',
   nationality:'Portugal',countryOfOp:'Spain',workPermit:true,gender:'FEMALE',email:'ana.costa@testemp.com',contact:'+34 655443322',dob:'1994-06-05',jobTitle:'Technical Writer',skill:'API Documentation',empDuration:'2026-05-01 – 2027-04-30',empType:'Contractor',workSchedule:'6',payAmount:'48',currency:'EUR',jobDesc:'Ongoing documentation engagement.',payFrequency:'Hourly',
   commercial:{adtFee:'290',annualGross:'0.00',baseGross:'0.00',holidayBonus:'0.00',month13:'0.00',monthlyGrossNet:'0.00',monthlyInvoice:'0.04',monthlySalary12:'0.00',monthlySalary1392:'0.00',netPay:'0.00',socialPremAmt:'0.00',socialPremPct:'0.00',totalMonthlyGross:'0.00'},
   complianceItems:[{item:'Classification questionnaire',note:'Mandatory',status:'Approved',doc:null}]}
];
const ctLogsData={
  1:[{date:'11 Jun 2026',time:'03:17:26 PM',user:'Admin',status:'Submitted',action:'Contract submitted for review and quotation.'}],
  2:[{date:'6 Jun 2026',time:'03:05:48 PM',user:'Admin',status:'Proposal Sent',action:'EOR proposal sent to employee for review.'},{date:'6 Jun 2026',time:'02:00:00 PM',user:'Manager',status:'Quotation Approved',action:'Quotation approved by manager. Proceeding to proposal.'},{date:'6 Jun 2026',time:'01:00:00 PM',user:'Admin',status:'Submitted',action:'Contract submitted for review.'}],
  3:[{date:'6 Jun 2026',time:'02:07:35 PM',user:'Admin',status:'Inactive',action:'Contract set to Inactive.'}],
  4:[{date:'6 Jun 2026',time:'12:34:17 PM',user:'Admin',status:'Proposal Sent',action:'EOR proposal sent to employee.'},{date:'6 Jun 2026',time:'11:00:00 AM',user:'Admin',status:'Submitted',action:'Contract submitted for review.'}]
};
const ctWorkflowData={
  1:[{title:'Contract Submitted',user:'Admin',date:'11 Jun 2026',time:'03:17:26 PM',description:'EOR contract for Antar Malhotra submitted for quotation and review.'}],
  2:[{title:'Proposal Sent',user:'Admin',date:'6 Jun 2026',time:'03:05:48 PM',description:'EOR proposal dispatched to Rashi Singh for review and acceptance.'},{title:'Quotation Approved',user:'Manager',date:'6 Jun 2026',time:'02:00:00 PM',description:'Quotation approved. Proposal stage initiated.'},{title:'Contract Submitted',user:'Admin',date:'6 Jun 2026',time:'01:00:00 PM',description:'EOR contract submitted for review.'}],
  3:[{title:'Contract Inactive',user:'Admin',date:'6 Jun 2026',time:'02:07:35 PM',description:'Contract for Deepak Singh set to Inactive.'}],
  4:[{title:'Proposal Sent',user:'Admin',date:'6 Jun 2026',time:'12:34:17 PM',description:'EOR proposal sent to Rajdeep Singh.'},{title:'Contract Submitted',user:'Admin',date:'6 Jun 2026',time:'11:00:00 AM',description:'EOR contract submitted for review.'}]
};
let ctSelectedId=null,ctTab='basic-details';

// -- AI EXECUTIVE MODULE --
const aiJourneys=[
  {id:'contract-creation',name:'Contract Creation Journey',desc:'Automates the flow from deal creation through proposal, contract signing, onboarding, and payroll readiness.',modules:['Deal Desk','Employee Profile','Proposal','Contracts','Onboarding','Payroll'],coverage:72,humanSteps:2,aiSteps:5,status:'Inactive',risk:'Medium',updated:'02 Jul 2026, 10:20 AM',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>'},
  {id:'payroll-creation',name:'Payroll Creation Journey',desc:'Automates payroll runs end-to-end from a prompt through attendance capture, salary calculation, approval, and salary slip creation.',modules:['Payroll','Timesheet','Payheads','Compliance Hub','Finance'],coverage:83,humanSteps:1,aiSteps:5,status:'Active',risk:'Medium',updated:'03 Jul 2026, 4:30 PM',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.6"/></svg>'},
  {id:'h2r-lifecycle',name:'Hire to Retire (H2R) Journey',desc:'Automates the full employee lifecycle from creation through country-specific compliance and leave policy setup to eventual offboarding.',modules:['Employee Profile','Compliance Hub','Leave','Onboarding'],coverage:65,humanSteps:1,aiSteps:4,status:'Inactive',risk:'Medium',updated:'28 Jun 2026, 11:00 AM',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>'}
];

const aiJourneyEvents={
  'contract-creation':[
    {name:'Deal Created (Employee Created)',chips:['AI Automated','Deal Desk','Employee'],source:'AI Prompt Parser',desc:"AI parses a natural-language prompt to create the deal and, if the person doesn't already exist, creates or matches the Employee record in the same step.",validation:'Employee name and ID are matched or created against existing records.',human:'None — fully automated.',failure:'Ambiguous name matches are flagged for manual employee selection.',next:'Proposal Sent',fields:['Employee Name','Employee ID','Country','Client','Contract Type']},
    {name:'Proposal Sent',chips:['AI Automated','Proposal'],source:'AI Contract Assistant',desc:'AI drafts commercial terms and compliance items, then sends the proposal for internal approval.',validation:'Commercial terms are validated against country rate rules.',human:'None — AI-supported drafting.',failure:'Missing rate data blocks the send and raises an exception.',next:'Proposal Approved',fields:['Billing Rate','Pay Rate','Margin %','Compliance Checklist']},
    {name:'Proposal Approved',chips:['Human Required','Approval Required'],source:'Deal Manager',desc:'Deal Manager reviews commercial terms and the compliance checklist, then approves the proposal.',validation:'Manual review sign-off is recorded.',human:'Required — Deal Manager approval.',failure:'Rejection routes back to Proposal Sent for correction.',next:'Contract Sent',fields:['Approver Name','Approval Timestamp']},
    {name:'Contract Sent',chips:['AI Automated','Docuseal'],source:'AI + Docuseal',desc:'AI generates the contract from the approved proposal and sends it for signature via Docuseal.',validation:'Contract fields are auto-filled from the proposal and the signature request is tracked.',human:'None — AI assisted generation.',failure:'A signature bounce or timeout raises an exception for resend.',next:'Contract Approved',fields:['Contract Number','Signatory Email','Docuseal Status']},
    {name:'Contract Approved',chips:['Human Required','Approval Required'],source:'Ops Manager',desc:'Ops Manager confirms the signed contract and marks it approved internally.',validation:'The signed document is verified against the contract terms.',human:'Required — Ops Manager approval.',failure:'A discrepancy sends the contract back for correction.',next:'Onboarding',fields:['Approver Name','Signed Document ID']},
    {name:'Onboarding',chips:['AI Automated','Onboarding'],source:'AI Onboarding Engine',desc:'AI runs the onboarding checklist — documents, compliance checks, system access provisioning.',validation:'All onboarding checklist items are marked complete.',human:'None — fully automated.',failure:'A missing document flags an exception for HR follow-up.',next:'Ready for Payroll',fields:['Onboarding Checklist','Document Status','Compliance Status']},
    {name:'Ready for Payroll',chips:['AI Automated','Payroll'],source:'AI Payroll Readiness Check',desc:'AI validates that all payroll-required fields are complete and marks the employee ready for the next payroll cycle.',validation:'Bank details, tax info, and compensation mapping are all present.',human:'None — fully automated.',failure:'Incomplete payroll data blocks readiness and raises an exception.',next:'Journey Complete — Ready for Payroll',fields:['Bank Details','Compensation Mapping','Tax Info']}
  ],
  'payroll-creation':[
    {name:'Prompt Given (Name, ID, etc.)',chips:['AI Automated','Prompt'],source:'AI Prompt Parser',desc:'AI parses a prompt containing the employee name/ID and the payroll period to initiate the run.',validation:'Employee identity is resolved against Employee records.',human:'None — AI assisted parsing.',failure:'An unresolved employee ID raises an exception for manual lookup.',next:'Attendance Capture',fields:['Employee Name','Employee ID','Pay Period']},
    {name:'Attendance Capture',chips:['AI Automated','Timesheet'],source:'AI Timesheet Sync',desc:'AI pulls attendance and timesheet records for the pay period.',validation:'Attendance days are reconciled against leave records.',human:'None — fully automated.',failure:'Missing attendance data raises an exception.',next:'Salary Calculation',fields:['Days Present','Days on Leave','Overtime Hours']},
    {name:'Salary Calculation',chips:['AI Automated','Calculation'],source:'AI Payroll Engine',desc:'AI calculates gross/net salary using payheads, statutory deductions, and country compliance rates.',validation:'The calculation is cross-checked against compliance rate rules.',human:'None — fully automated.',failure:'A rate mismatch raises an exception for finance review.',next:'Approval',fields:['Gross Pay','Deductions','Net Pay']},
    {name:'Approval',chips:['Human Required','Approval Required'],source:'Finance Approver',desc:'Finance reviews the calculated payroll and approves it for disbursement.',validation:'Manual sign-off is recorded.',human:'Required — Finance approval.',failure:'Rejection routes back to Salary Calculation.',next:'Salary Slip',fields:['Approver Name','Approval Timestamp']},
    {name:'Salary Slip Template',chips:['AI Automated','Payslip'],source:'AI Payslip Generator',desc:'AI creates a salary slip template and populates it with employee, attendance, and salary details.',validation:'Payslip totals match the approved calculation.',human:'None — fully automated.',failure:'A generation failure raises an exception for retry.',next:'Salary Slip Created',fields:['Payslip ID','Net Pay','Issue Date']},
    {name:'Salary Slip Created',chips:['AI Automated','Payroll'],source:'AI Payroll Archive',desc:'AI marks the salary slip as created and stores it against the employee record.',validation:'The generated salary slip is available in payroll documents.',human:'None — fully automated.',failure:'A storage failure raises an exception for retry.',next:'Journey Complete — Salary Slip Created',fields:['Payslip ID','Employee ID','Created Date']}
  ],
  'h2r-lifecycle':[
    {name:'Employee Creation',chips:['AI Automated','Employee'],source:'AI Prompt Parser',desc:'AI creates the employee record from a prompt with name, role, and country.',validation:'A duplicate check is run against existing employee records.',human:'None — AI assisted.',failure:'A duplicate match raises an exception for manual resolution.',next:'Fetch Country Details (Compliance Hub)',fields:['Employee Name','Role','Country','Employment Type']},
    {name:'Fetch Country Details (Compliance Hub)',chips:['AI Automated','Compliance Hub'],source:'AI Compliance Hub Sync',desc:"AI fetches statutory and compliance requirements for the employee's country from the Compliance Hub.",validation:'Country rate rules and statutory requirements are retrieved.',human:'None — fully automated.',failure:'A missing country config raises an exception for the compliance team.',next:'Show Leave Policies',fields:['Country Rate Rules','Statutory Requirements','Tax Bands']},
    {name:'Show Leave Policies',chips:['AI Automated','Leave'],source:'AI Leave Policy Engine',desc:"AI matches and displays the applicable leave policy for the employee's country and entity.",validation:"The leave policy is matched to the employee's country and entity.",human:'None — AI assisted display.',failure:'No matching policy raises an exception for HR to configure one.',next:'Ask for Approval if Required',fields:['Leave Policy Name','Leave Types','Annual Entitlement']},
    {name:'Ask for Approval if Required',chips:['Human Required','Approval Required'],source:'HR Manager',desc:'If the leave policy or compliance setup deviates from standard, HR reviews and approves before finalizing.',validation:'Manual sign-off is recorded when a deviation is detected.',human:'Required only on deviation — otherwise auto-skipped.',failure:'Rejection routes back to Show Leave Policies for reconfiguration.',next:'Offboarding',fields:['Approver Name','Deviation Reason']},
    {name:'Offboarding',chips:['AI Automated','Offboarding'],source:'AI Offboarding Engine',desc:"AI runs the offboarding checklist — access revocation, final settlement calculation, exit compliance checks — when the employee's exit is triggered.",validation:'All offboarding checklist items are marked complete.',human:'None — fully automated.',failure:'A pending final settlement raises an exception for finance.',next:'Journey Complete — Offboarding',fields:['Exit Date','Final Settlement Amount','Access Revocation Status']}
  ]
};

// -- Configure: Systems (full parity with reference config console) --
const cfgSystems=[
  {id:'sap',name:'SAP S/4HANA',type:'SAP',method:'REST / OData',endpoint:'https://lnt-s4.vyoma.local/sap/odata/',auth:'OAuth 2.0',apis:142,lastTested:'3 hrs ago',status:'Connected',
    apiList:[
      {name:'API_PRODUCT_SRV · Product',dir:'rw'},
      {name:'API_BUSINESS_PARTNER · Supplier',dir:'rw'},
      {name:'API_PURCHASEORDER_PROCESS',dir:'r'},
      {name:'API_MATERIAL_DOCUMENT · GR',dir:'r'},
      {name:'API_SUPPLIERINVOICE',dir:'r'}
    ]},
  {id:'infor',name:'Infor ERP',type:'Infor',method:'Web Network',endpoint:'https://infor-wn.vyoma.local/',auth:'API Key',apis:38,lastTested:'yesterday',status:'Connected',
    apiList:[
      {name:'SupplierMaster · Vendor',dir:'rw'},
      {name:'PurchaseOrder · Read',dir:'r'},
      {name:'GoodsReceipt · Read',dir:'r'}
    ]},
  {id:'portal',name:'Vendor Portal',type:'3rd-party',method:'REST',endpoint:'https://vendors.vyoma.local/api/',auth:'OAuth 2.0',apis:12,lastTested:'2 days ago',status:'Connected',
    apiList:[
      {name:'VendorInvite · Onboarding',dir:'rw'},
      {name:'VendorDocuments · Read',dir:'r'}
    ]}
];

// -- Configure: Data models (full parity: Material + Vendor, each with mapping/enrichment/rules/test) --
const cfgModels=[
  {id:'material',name:'Material',source:'SAP',desc:'Standard fields from SAP, plus enrichment fields held in Data Foundation.',
    mapped:[['Material ID','Product','string'],['Description','ProductDescription','string'],['Base unit','BaseUnit','string'],['Base price','NetPriceAmount','decimal']],
    enrichment:[{name:'Site',type:'string'},{name:'Project code',type:'string'},{name:'Compliance',type:'string'},{name:'Preferred vendor',type:'string'},{name:'Lead time',type:'string'}],
    rules:{makerChecker:true,validation:'Base price must be greater than zero'},
    sample:[['Material ID','MAT-100482'],['Description','TMT Steel Grade X'],['Base unit','TON'],['Base price','₹52,000 / T'],['Site','Hyderabad Metro'],['Compliance','IS 1786']]},
  {id:'vendor',name:'Vendor',source:'SAP + Infor',desc:'Supplier master unified across SAP and Infor.',
    mapped:[['Vendor ID','SupplierID','string'],['Vendor Name','SupplierName','string'],['Country','Country','string'],['Payment Terms','PaymentTerms','string'],['Rating','VendorRating','decimal'],['Bank Details','BankInfo','object']],
    enrichment:[{name:'Risk Category',type:'string'},{name:'ESG Score',type:'string'},{name:'Preferred Status',type:'string'}],
    rules:{makerChecker:true,validation:'Vendor rating ≥ 3.0'},
    sample:[['Vendor ID','VEN-2044'],['Vendor Name','Bharat Steel Traders'],['Country','India'],['Payment Terms','Net 30'],['Rating','4.2'],['Bank Details','HDFC •••• 2210']]}
];
let cfgModelTested={};
let cfgModelEditing=false;
let cfgModelDraft=null;

// -- Configure: Context & Journey (ADT's real business journeys — same set as AI Executive) --
const cfgJourneys=[
  {id:'contract-creation',name:'Contract Creation Journey',desc:'Automates the flow from deal creation through proposal, contract signing, onboarding, and payroll readiness.',status:'Inactive',tags:['7 steps','Deal Desk, Contracts'],
    steps:[
      {name:'Create Deal & Employee Record',src:'AI Prompt Parser',type:'src'},
      {name:'Send Proposal',src:'AI Contract Assistant',type:'src'},
      {name:'Proposal Approval',src:'Deal Manager',type:'rule'},
      {name:'Send Contract for Signature',src:'AI + Docuseal',type:'src'},
      {name:'Contract Approval',src:'Ops Manager',type:'rule'},
      {name:'Run Onboarding',src:'AI Onboarding Engine',type:'src'},
      {name:'Check Payroll Readiness',src:'AI Payroll Readiness Check',type:'src'}
    ]},
  {id:'payroll-creation',name:'Payroll Creation Journey',desc:'Automates payroll runs end-to-end from a prompt through attendance capture, salary calculation, approval, and salary slip creation.',status:'Active',tags:['6 steps','Payroll, Compliance Hub'],
    steps:[
      {name:'Parse Prompt (Name, ID, etc.)',src:'AI Prompt Parser',type:'src'},
      {name:'Capture Attendance',src:'AI Timesheet Sync',type:'src'},
      {name:'Calculate Salary',src:'AI Payroll Engine',type:'src'},
      {name:'Payroll Approval',src:'Finance Approver',type:'rule'},
      {name:'Generate Salary Slip',src:'AI Payslip Generator',type:'src'},
      {name:'Finalize Salary Slip',src:'AI Payroll Archive',type:'src'}
    ]},
  {id:'h2r-lifecycle',name:'Hire to Retire (H2R) Journey',desc:'Automates the full employee lifecycle from creation through country-specific compliance and leave policy setup to eventual offboarding.',status:'Inactive',tags:['5 steps','Compliance Hub, Leave'],
    steps:[
      {name:'Create Employee Record',src:'AI Prompt Parser',type:'src'},
      {name:'Fetch Country Compliance Details',src:'AI Compliance Hub Sync',type:'src'},
      {name:'Show Leave Policy',src:'AI Leave Policy Engine',type:'src'},
      {name:'HR Approval (if Required)',src:'HR Manager',type:'rule'},
      {name:'Run Offboarding',src:'AI Offboarding Engine',type:'src'}
    ]}
];

// -- Configure: Agents — one per AI-driven step across Contract Creation / Payroll Creation / H2R Lifecycle --
const cfgAgents=[
  {name:'AI Prompt Parser',type:'Transaction agent',desc:"Parses a natural-language prompt to extract the employee's name, ID, and other key details needed to kick off the journey.",model:'Bharat GPT',usedIn:'Contract Creation, Payroll Creation, H2R Lifecycle',guardrail:'Fully automated',
    skillMd:`# AI Prompt Parser — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Contract Creation Journey, Payroll Creation Journey, H2R Lifecycle Journey
Guardrail: Fully automated

## Role
Parses a natural-language prompt to extract the employee's name, ID, and other key details needed to kick off a journey.

## Context: Contract Creation Journey
Step: Create Deal & Employee Record
Fields read: Employee Name, Employee ID, Country, Client, Contract Type
Validation: Employee name and ID are matched or created against existing records.
On failure: Ambiguous name matches are flagged for manual employee selection.

## Context: Payroll Creation Journey
Step: Parse Prompt (Name, ID, etc.)
Fields read: Employee Name, Employee ID, Pay Period
Validation: Employee identity is resolved against Employee records.
On failure: An unresolved employee ID raises an exception for manual lookup.

## Context: H2R Lifecycle Journey
Step: Create Employee Record
Fields read: Employee Name, Role, Country, Employment Type
Validation: A duplicate check is run against existing employee records.
On failure: A duplicate match raises an exception for manual resolution.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Contract Assistant',type:'Transaction agent',desc:'Drafts commercial terms and compliance items, then prepares the proposal for approval.',model:'Bharat GPT',usedIn:'Contract Creation Journey',guardrail:'Human approves next step',
    skillMd:`# AI Contract Assistant — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Contract Creation Journey
Guardrail: Human approves next step

## Role
Drafts commercial terms and compliance items, then prepares the proposal for approval.

## Step
Send Proposal

## Fields read
Billing Rate, Pay Rate, Margin %, Compliance Checklist

## Validation
Commercial terms are validated against country rate rules.

## On failure
Missing rate data blocks the send and raises an exception.

## Governance
The next step, Proposal Approval, is owned by the Deal Manager and must be signed off before the journey continues.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI + Docuseal',type:'Transaction agent',desc:'Generates the contract from the approved proposal and sends it for signature via Docuseal.',model:'Bharat GPT',usedIn:'Contract Creation Journey',guardrail:'Human approves next step',
    skillMd:`# AI + Docuseal — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Contract Creation Journey
Guardrail: Human approves next step

## Role
Generates the contract from the approved proposal and sends it for signature via Docuseal.

## Step
Send Contract for Signature

## Fields read
Contract Number, Signatory Email, Docuseal Status

## Validation
Contract fields are auto-filled from the proposal and the signature request is tracked.

## On failure
A signature bounce or timeout raises an exception for resend.

## Governance
The next step, Contract Approval, is owned by the Ops Manager and must be signed off before onboarding begins.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Onboarding Engine',type:'Transaction agent',desc:'Runs the onboarding checklist — documents, compliance checks, and system access provisioning.',model:'Bharat GPT',usedIn:'Contract Creation Journey',guardrail:'Fully automated',
    skillMd:`# AI Onboarding Engine — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Contract Creation Journey
Guardrail: Fully automated

## Role
Runs the onboarding checklist — documents, compliance checks, and system access provisioning.

## Step
Run Onboarding

## Fields read
Onboarding Checklist, Document Status, Compliance Status

## Validation
All onboarding checklist items are marked complete.

## On failure
A missing document flags an exception for HR follow-up.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Payroll Readiness Check',type:'Transaction agent',desc:'Validates that bank details, tax info, and compensation mapping are complete before the next payroll cycle.',model:'Bharat GPT',usedIn:'Contract Creation Journey',guardrail:'Fully automated',
    skillMd:`# AI Payroll Readiness Check — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Contract Creation Journey
Guardrail: Fully automated

## Role
Validates that bank details, tax info, and compensation mapping are complete before the next payroll cycle.

## Step
Check Payroll Readiness

## Fields read
Bank Details, Compensation Mapping, Tax Info

## Validation
Bank details, tax info, and compensation mapping are all present.

## On failure
Incomplete payroll data blocks readiness and raises an exception.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Timesheet Sync',type:'Transaction agent',desc:'Pulls attendance and timesheet records for the pay period.',model:'Bharat GPT',usedIn:'Payroll Creation Journey',guardrail:'Fully automated',
    skillMd:`# AI Timesheet Sync — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Payroll Creation Journey
Guardrail: Fully automated

## Role
Pulls attendance and timesheet records for the pay period.

## Step
Capture Attendance

## Fields read
Days Present, Days on Leave, Overtime Hours

## Validation
Attendance days are reconciled against leave records.

## On failure
Missing attendance data raises an exception.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Payroll Engine',type:'Transaction agent',desc:'Calculates gross/net salary using payheads, statutory deductions, and country compliance rates.',model:'Bharat GPT',usedIn:'Payroll Creation Journey',guardrail:'Human approves next step',
    skillMd:`# AI Payroll Engine — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Payroll Creation Journey
Guardrail: Human approves next step

## Role
Calculates gross/net salary using payheads, statutory deductions, and country compliance rates.

## Step
Calculate Salary

## Fields read
Gross Pay, Deductions, Net Pay

## Validation
The calculation is cross-checked against compliance rate rules.

## On failure
A rate mismatch raises an exception for finance review.

## Governance
The next step, Payroll Approval, is owned by the Finance Approver and must be signed off before the salary slip is generated.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Payslip Generator',type:'Transaction agent',desc:'Creates a salary slip template and populates it with employee, attendance, and salary details.',model:'Bharat GPT',usedIn:'Payroll Creation Journey',guardrail:'Fully automated',
    skillMd:`# AI Payslip Generator — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Payroll Creation Journey
Guardrail: Fully automated

## Role
Creates a salary slip template and populates it with employee, attendance, and salary details.

## Step
Generate Salary Slip

## Fields read
Payslip ID, Net Pay, Issue Date

## Validation
Payslip totals match the approved calculation.

## On failure
A generation failure raises an exception for retry.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Payroll Archive',type:'Transaction agent',desc:'Finalizes the salary slip and stores it against the employee record.',model:'Bharat GPT',usedIn:'Payroll Creation Journey',guardrail:'Fully automated',
    skillMd:`# AI Payroll Archive — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: Payroll Creation Journey
Guardrail: Fully automated

## Role
Finalizes the salary slip and stores it against the employee record.

## Step
Finalize Salary Slip

## Fields read
Payslip ID, Employee ID, Created Date

## Validation
The generated salary slip is available in payroll documents.

## On failure
A storage failure raises an exception for retry.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Compliance Hub Sync',type:'Transaction agent',desc:"Fetches statutory and compliance requirements for the employee's country from the Compliance Hub.",model:'Bharat GPT',usedIn:'H2R Lifecycle Journey',guardrail:'Fully automated',
    skillMd:`# AI Compliance Hub Sync — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: H2R Lifecycle Journey
Guardrail: Fully automated

## Role
Fetches statutory and compliance requirements for the employee's country from the Compliance Hub.

## Step
Fetch Country Compliance Details

## Fields read
Country Rate Rules, Statutory Requirements, Tax Bands

## Validation
Country rate rules and statutory requirements are retrieved.

## On failure
A missing country config raises an exception for the compliance team.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Leave Policy Engine',type:'Transaction agent',desc:"Matches and displays the applicable leave policy for the employee's country and entity.",model:'Bharat GPT',usedIn:'H2R Lifecycle Journey',guardrail:'Human approves on deviation',
    skillMd:`# AI Leave Policy Engine — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: H2R Lifecycle Journey
Guardrail: Human approves on deviation

## Role
Matches and displays the applicable leave policy for the employee's country and entity.

## Step
Show Leave Policy

## Fields read
Leave Policy Name, Leave Types, Annual Entitlement

## Validation
The leave policy is matched to the employee's country and entity.

## On failure
No matching policy raises an exception for HR to configure one.

## Governance
If the matched policy deviates from standard, the next step, HR Approval (if Required), is owned by the HR Manager and must sign off before the journey continues. Otherwise this step is auto-skipped.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`},
  {name:'AI Offboarding Engine',type:'Transaction agent',desc:'Runs the offboarding checklist — access revocation, final settlement, and exit compliance checks.',model:'Bharat GPT',usedIn:'H2R Lifecycle Journey',guardrail:'Fully automated',
    skillMd:`# AI Offboarding Engine — skill.md

Model: Bharat GPT
Type: Transaction agent
Used in: H2R Lifecycle Journey
Guardrail: Fully automated

## Role
Runs the offboarding checklist — access revocation, final settlement, and exit compliance checks.

## Step
Run Offboarding

## Fields read
Exit Date, Final Settlement Amount, Access Revocation Status

## Validation
All offboarding checklist items are marked complete.

## On failure
A pending final settlement raises an exception for finance.

## Audit
Every action this agent takes is logged with timestamp, data source, and outcome for compliance audit.`}
];
const cfgAgentsOriginalSkill=cfgAgents.map(function(a){return a.skillMd;});
let cfgAgentSkillModalIdx=-1;
let cfgAgentSkillEditing=false;

// -- Configure: Overview recent activity (copied from reference console) --
const cfgRecentActivity=[
  {title:'Material model updated',sub:'2 enrichment fields added',when:'12 min ago'},
  {title:'Procure-to-Pay journey activated',sub:'6 steps · live',when:'1 hr ago'},
  {title:'SAP S/4HANA connection tested',sub:'142 released APIs available',when:'3 hrs ago'},
  {title:'Infor ERP connected',sub:'via Infor Web Network',when:'yesterday'}
];

// -- Configure: shared UI state --
let selectedCfgSystemId=null,selectedCfgModelId=null,selectedCfgJourneyId=null;
let cfgSystemEditing=false;
let cfgSystemDraft=null;
let cfgStepAssignments={};
let cfgDrawerJourneyId=null,cfgDrawerStepIdx=-1;

// -- AI Executive: live run flows for activated journeys (Create Contract / Create Employee / Run Payroll) --
let aiRunFlowJourneyId=null,aiRunFlowStep=-1,aiRunFlowData={};
const aiRunFlows={
  'h2r-lifecycle':{
    entryLabel:'Create Employee',
    entryDesc:'Tell me who you\'re onboarding — I\'ll create the employee record and walk through country compliance and leave policy setup automatically.',
    promptPlaceholder:'e.g. Create an employee for Rahul Mehta in India as Product Manager',
    steps:[
      {label:'Employee Creation',running:'Creating employee record…',type:'ai'},
      {label:'Fetch Country Details',running:'Fetching compliance details from the Compliance Hub…',type:'ai'},
      {label:'Leave Policy Match',running:'Matching the applicable leave policy…',type:'ai'},
      {label:'Approval Check',running:'Checking for policy deviations…',type:'auto-skip',skipNote:'No deviation detected — step skipped automatically.'},
      {label:'Employee Onboarded',running:'Finalizing employee profile…',type:'ai'}
    ]
  },
  'payroll-creation':{
    entryLabel:'Run Payroll',
    entryDesc:'Tell me who you\'re running payroll for — I\'ll gather their details, capture attendance, calculate salary, and generate the slip automatically.',
    promptPlaceholder:'e.g. Run payroll for Anika Shah for this month',
    steps:[
      {label:'Employee Fetch',running:'Fetching employee details…',type:'fetch'},
      {label:'Attendance Capture',running:'Capturing attendance records…',type:'ai'},
      {label:'Salary Calculation',running:'Calculating gross and net salary…',type:'ai'},
      {label:'Approval',running:'Waiting for Finance approval…',type:'manual'},
      {label:'Salary Slip Template',running:'Generating salary slip template…',type:'slip'},
      {label:'Salary Slip Created',running:'Creating salary slip…',type:'complete'}
    ]
  }
};
const allLeavesData=[
  {id:1,empId:'CLOCLO11755',name:'Shaun J',leaveId:'2014',leaveType:'Casual Leave',leaveFrom:'14-04-2026',leaveTo:'16-04-2026',leaveHours:'Full Day',description:'I need leave',email:'shaun.varghese1805@gmail.com',appliedDate:'14 Apr, 2026 23:40:25',createdBy:'Self',status:'Approved',subStatus:'Paid'},
  {id:2,empId:'CLOCLO11756',name:'Pallavi P',leaveId:'2019',leaveType:'Sick Leave',leaveFrom:'18-04-2026',leaveTo:'18-04-2026',leaveHours:'Half Day',description:'Not feeling well',email:'pallavi.p@maaserp.com',appliedDate:'17 Apr, 2026 10:15:00',createdBy:'Self',status:'Pending',subStatus:'Unpaid'},
  {id:3,empId:'CLOCLO11757',name:'Anika Shah',leaveId:'2021',leaveType:'Casual Leave',leaveFrom:'20-04-2026',leaveTo:'22-04-2026',leaveHours:'Full Day',description:'Personal work',email:'anika.shah@maaserp.com',appliedDate:'19 Apr, 2026 09:00:00',createdBy:'Self',status:'Approved',subStatus:'Paid'},
  {id:4,empId:'CLOCLO11758',name:'Rahul Mehta',leaveId:'2025',leaveType:'Earned Leave',leaveFrom:'25-04-2026',leaveTo:'27-04-2026',leaveHours:'Full Day',description:'Family function',email:'rahul.mehta@maaserp.com',appliedDate:'22 Apr, 2026 14:30:00',createdBy:'Self',status:'Unapproved',subStatus:'Unpaid'},
  {id:5,empId:'CLOCLO11759',name:'Nora Kim',leaveId:'2031',leaveType:'Sick Leave',leaveFrom:'28-04-2026',leaveTo:'28-04-2026',leaveHours:'Half Day',description:'Doctor appointment',email:'nora.kim@maaserp.com',appliedDate:'27 Apr, 2026 08:45:00',createdBy:'Self',status:'Pending',subStatus:'Unpaid'},
  {id:6,empId:'CLOCLO11760',name:'Luis Martin',leaveId:'2033',leaveType:'Casual Leave',leaveFrom:'02-05-2026',leaveTo:'04-05-2026',leaveHours:'Full Day',description:'Vacation trip',email:'luis.martin@maaserp.com',appliedDate:'30 Apr, 2026 11:20:00',createdBy:'Self',status:'Approved',subStatus:'Paid'},
  /* The five the Reporting Manager dashboard lists under "Team Leave Requests".
     They are real records, not card decoration: Approve / Reject there opens
     THIS row's Logs, so a name on the dashboard that had no record behind it
     would send the manager to a panel that could not exist. */
  {id:7,empId:'CLOCLO11761',name:'Utkarsh Shukla',leaveId:'2028',leaveType:'Casual Leave',leaveFrom:'15-05-2026',leaveTo:'16-05-2026',leaveHours:'Full Day',description:'Family function out of town.',email:'utkarsh.shukla@testemp.com',appliedDate:'09 May, 2026 09:20:00',createdBy:'Self',status:'Pending',subStatus:'Unpaid'},
  {id:8,empId:'CLOCLO11762',name:'Ashneet Kaur',leaveId:'2031',leaveType:'Sick Leave',leaveFrom:'18-05-2026',leaveTo:'18-05-2026',leaveHours:'Full Day',description:'Down with fever, will share the certificate.',email:'ashneet.kaur@testemp.com',appliedDate:'17 May, 2026 08:05:00',createdBy:'Self',status:'Pending',subStatus:'Unpaid'},
  {id:9,empId:'CLOCLO11763',name:'Sneha Kulkarni',leaveId:'2034',leaveType:'Earned Leave',leaveFrom:'22-05-2026',leaveTo:'23-05-2026',leaveHours:'Full Day',description:'Planned break, handover shared with the team.',email:'sneha.kulkarni@testemp.com',appliedDate:'12 May, 2026 16:40:00',createdBy:'Self',status:'Pending',subStatus:'Paid'},
  {id:10,empId:'CLOCLO11764',name:'Diksha Kumari',leaveId:'2037',leaveType:'Casual Leave',leaveFrom:'26-05-2026',leaveTo:'26-05-2026',leaveHours:'Full Day',description:'Personal work.',email:'diksha.kumari@testemp.com',appliedDate:'20 May, 2026 11:12:00',createdBy:'Self',status:'Pending',subStatus:'Unpaid'},
  {id:11,empId:'CLOCLO11765',name:'Pardeep Verga',leaveId:'2040',leaveType:'Sick Leave',leaveFrom:'28-05-2026',leaveTo:'29-05-2026',leaveHours:'Full Day',description:'Recovering after a minor procedure.',email:'pardeep.verga@testemp.com',appliedDate:'26 May, 2026 07:55:00',createdBy:'Self',status:'Pending',subStatus:'Unpaid'}
];
// Leave approval workflow - keyed by allLeavesData id. Ends on each row's real status.
const alWorkflowData={
  1:[{title:'Leave Approved',user:'Reporting Manager',date:'15 Apr 2026',time:'10:12:00 AM',description:'Casual Leave 14-16 Apr approved for Shaun J. Balance updated.'},
     {title:'Manager Review',user:'Reporting Manager',date:'15 Apr 2026',time:'09:30:00 AM',description:'Request reviewed against team coverage for the week.'},
     {title:'Leave Applied',user:'Shaun J',date:'14 Apr 2026',time:'11:40:25 PM',description:'Casual Leave applied for 14-16 Apr 2026 (Full Day). Reason: I need leave.'}],
  2:[{title:'Awaiting Approval',user:'Reporting Manager',date:'17 Apr 2026',time:'11:00:00 AM',description:'Sick Leave request pending manager action. Medical note not required for half day.'},
     {title:'Leave Applied',user:'Pallavi P',date:'17 Apr 2026',time:'10:15:00 AM',description:'Sick Leave applied for 18 Apr 2026 (Half Day). Reason: Not feeling well.'}],
  3:[{title:'Leave Approved',user:'Reporting Manager',date:'19 Apr 2026',time:'02:20:00 PM',description:'Casual Leave 20-22 Apr approved for Anika Shah. Cover arranged within team.'},
     {title:'Leave Applied',user:'Anika Shah',date:'19 Apr 2026',time:'09:00:00 AM',description:'Casual Leave applied for 20-22 Apr 2026 (Full Day). Reason: Personal work.'}],
  4:[{title:'Leave Unapproved',user:'Reporting Manager',date:'23 Apr 2026',time:'10:05:00 AM',description:'Earned Leave 25-27 Apr not approved. Clashes with month-end payroll cycle.'},
     {title:'Manager Review',user:'Reporting Manager',date:'22 Apr 2026',time:'05:00:00 PM',description:'Request reviewed against payroll close-out dates.'},
     {title:'Leave Applied',user:'Rahul Mehta',date:'22 Apr 2026',time:'02:30:00 PM',description:'Earned Leave applied for 25-27 Apr 2026 (Full Day). Reason: Family function.'}],
  5:[{title:'Awaiting Approval',user:'Reporting Manager',date:'27 Apr 2026',time:'09:30:00 AM',description:'Sick Leave request pending manager action.'},
     {title:'Leave Applied',user:'Nora Kim',date:'27 Apr 2026',time:'08:45:00 AM',description:'Sick Leave applied for 28 Apr 2026 (Full Day).'}]
};
const alLogsData={
  1:[{date:'14 Apr, 2026',time:'23:40:25',user:'Shaun J',status:'Approved',action:'Leave applied and approved by manager.'}],
  2:[{date:'17 Apr, 2026',time:'10:15:00',user:'Pallavi P',status:'Pending',action:'Leave application submitted, awaiting approval.'}],
  3:[{date:'19 Apr, 2026',time:'09:00:00',user:'Anika Shah',status:'Approved',action:'Leave applied and approved by manager.'}],
  4:[{date:'22 Apr, 2026',time:'14:30:00',user:'Rahul Mehta',status:'Unapproved',action:'Leave application rejected by manager.'}],
  5:[{date:'27 Apr, 2026',time:'08:45:00',user:'Nora Kim',status:'Pending',action:'Leave application submitted, awaiting approval.'}],
  6:[{date:'30 Apr, 2026',time:'11:20:00',user:'Luis Martin',status:'Approved',action:'Leave applied and approved by manager.'}]
};
let alSelectedId=null,alTab='basic-details';
const paymentsData=[
  {id:1,orderId:'1116',name:'Antar Malhotra',amountDue:'INR 0.00',type:'EOR - Employee',orderStatus:'Onboarding',invoiceStatus:'Paid',
   key:'1116',dealId:'94130',entityName:'Closedhi',addedFrom:'agency',createdTime:'02 Jun 2026 | 10:43 am',courseId:'2981',courseName:'JIRA',lastUpdated:'--',startFrom:'01 May 2026',endTo:'01 Aug 2026',workingCountry:'Belgium',orderCategory:'international',
   emp:{empId:'8691456',name:'Antar Malhotra',email:'antar@testemp.com',mobile:'+91 9999999996',status:'Pending Onboarding',createdOn:'01 Jun 2026 | 02:54 pm'},
   sales:{companyId:'27659',companyName:'Closedhi',contactPersonId:'46518',contactPersonName:'Shaun Mathew',rateType:'Monthly',days:'0',rate:'INR 1,00,000.00',totalAmount:'INR 1,00,000.00',contractPeriod:'92',workLocation:'Belgium',tsPeriodDate:'—',paymentTerm:'0',
     /* How approved timesheets are billed - one invoice per week, or one per
        month. My Timesheet reads it (tsCycle) to decide what is locked and
        submitted as a unit; js/ts-billing.js reads it to build invoice drafts.
        The rate is revised on Thursday 18 Jun, so the week of 15-21 Jun is a
        Weekly period that crosses a rate change. */
     paymentCycle:'Weekly',currency:'INR',
     rateSchedule:[{from:'2026-01-01',amount:95000},{from:'2026-06-18',amount:100000}]},
   user:{
     company:{userId:'27659',concernPersonName:'Shaun Mathew',companyName:'Closedhi',firstName:'Shaun',lastName:'Mathew',email:'shaun.varghese@opendhi.com',mobile:'+91 9949860707',altMobile:'—',website:'—',address:'Flat No: 41204, Olive Block Indu Fortune Fields, Railway Station, Gardenia, near HITECH city, Phase 13, Kukatpally Housing Board Colony, Kukatpally, Hyderabad, Telangana 500085, India'},
     concern:{key:'46518',name:'Shaun Mathew',mobile:'+91 9949860707',email:'shaun.varghese@opendhi.com',date:'12 Apr 2026 | 08:53 pm',createBy:'Shaun Mathew',address:'—'}
   },
   attachments:[]},
  {id:2,orderId:'1114',name:'Elon Musk',amountDue:'EUR 0.00',type:'EOR - Employee',orderStatus:'Onboarding',invoiceStatus:'Unpaid',
   key:'1114',dealId:'94128',entityName:'SpaceX EOR Ltd.',addedFrom:'agency',createdTime:'01 Jun 2026 | 09:00 am',courseId:'2975',courseName:'Python',lastUpdated:'--',startFrom:'01 Jun 2026',endTo:'31 Dec 2026',workingCountry:'USA',orderCategory:'international',
   emp:{empId:'8691455',name:'Elon Musk',email:'elon@spacex.com',mobile:'+1 555 000 0000',status:'Pending Onboarding',createdOn:'01 Jun 2026 | 09:30 am'},
   sales:{companyId:'27660',companyName:'SpaceX EOR Ltd.',contactPersonId:'46520',contactPersonName:'Gwynne Shotwell',rateType:'Monthly',days:'0',rate:'EUR 8,500.00',totalAmount:'EUR 8,500.00',contractPeriod:'184',workLocation:'USA',tsPeriodDate:'—',paymentTerm:'0',
     paymentCycle:'Monthly',currency:'EUR',rateSchedule:[{from:'2026-01-01',amount:8500}]},
   user:{
     company:{userId:'27660',concernPersonName:'Gwynne Shotwell',companyName:'SpaceX EOR Ltd.',firstName:'Gwynne',lastName:'Shotwell',email:'gwynne@spacex.com',mobile:'+1 555 000 0001',altMobile:'—',website:'—',address:'1 Rocket Rd, Hawthorne, CA 90250, United States'},
     concern:{key:'46520',name:'Gwynne Shotwell',mobile:'+1 555 000 0001',email:'gwynne@spacex.com',date:'03 Jun 2026 | 11:20 am',createBy:'Gwynne Shotwell',address:'—'}
   },
   attachments:[]}
];
const pmWorkflowData={
  1:[{title:'Order Created',user:'Admin',date:'02 Jun 2026',time:'10:43 am',description:'EOR order created for Antar Malhotra in Belgium.'}],
  2:[{title:'Order Created',user:'Admin',date:'01 Jun 2026',time:'09:00 am',description:'EOR order created for Elon Musk in USA.'}]
};
const pmLogsData={
  1:[{date:'02 Jun 2026',time:'10:43 AM',user:'Shaun Mathew',status:'Onboarding',action:'Order created for Antar Malhotra.'}],
  2:[{date:'01 Jun 2026',time:'09:00 AM',user:'Gwynne Shotwell',status:'Onboarding',action:'Order created for Elon Musk.'}]
};
const pmLogStatusOptions=['Follow Up','Onboarding','Closed','Inactive','Logistic Terminated','Logistic Completed','Offboarding','Finance Termination','Finance Completed','Confirmation Vendor','initial discussion done','Order Extension','Revision'];
const pmInvoiceFlow=['Unpaid','Pending','Paid'];
let pmSelectedId=null,pmTab='basic-details',pmUserSubTab='company-details';
/* The step picked from the row's Invoice Status menu, carried into the Logs
   tab so the form opens already set to the move the user asked for. Cleared
   the moment the log is saved or the panel closes - it describes one click,
   not a state the record is in. */
let pmPendingStatus='';

// ── COMPLIANCE ITEMS DATA & STATE ──
const complianceItemsData=[
  {id:1,country:'Netherlands',item:'test',model:'EOR',status:'Active',category:'Onboarding',createdBy:'Pritam Rai',createdAt:'15 Jun 2026 | 01:30:34 PM',mandatory:true,payrollBlocking:false,evidenceRequired:false,attachments:[],logs:[]},
  {id:2,country:'Belgium',item:'antar compliance test',model:'EOR',status:'Active',category:'Onboarding',createdBy:'Pritam Rai',createdAt:'12 Jun 2026 | 11:05:02 AM',mandatory:true,payrollBlocking:false,evidenceRequired:true,attachments:[],logs:[]},
  {id:3,country:'India',item:'peo india',model:'PEO',status:'Active',category:'Statutory',createdBy:'Neha Sharma',createdAt:'10 Jun 2026 | 04:22:40 PM',mandatory:true,payrollBlocking:true,evidenceRequired:true,attachments:[],logs:[]},
  {id:4,country:'Netherlands',item:'Final Settlement Approval',model:'PEO',status:'Active',category:'Offboarding',createdBy:'Neha Sharma',createdAt:'08 Jun 2026 | 09:15:11 AM',mandatory:true,payrollBlocking:true,evidenceRequired:false,attachments:[],logs:[]},
  {id:5,country:'India',item:'Provident Fund Registration',model:'EOR',status:'Active',category:'Statutory',createdBy:'Aman Singh',createdAt:'05 Jun 2026 | 02:48:57 PM',mandatory:true,payrollBlocking:true,evidenceRequired:true,attachments:[],logs:[]},
  {id:6,country:'Germany',item:'direct - onboarding',model:'Direct',status:'Active',category:'Onboarding',createdBy:'Aman Singh',createdAt:'03 Jun 2026 | 10:30:19 AM',mandatory:true,payrollBlocking:false,evidenceRequired:true,attachments:[],logs:[]},
  {id:7,country:'Germany',item:'test with no evidence in germany',model:'PEO',status:'Active',category:'Onboarding',createdBy:'Pritam Rai',createdAt:'01 Jun 2026 | 05:52:03 PM',mandatory:false,payrollBlocking:false,evidenceRequired:false,attachments:[],logs:[]},
  {id:8,country:'Spain',item:'Work Permit Verification',model:'EOR',status:'Inactive',category:'Statutory',createdBy:'Rahul Mehta',createdAt:'28 May 2026 | 03:10:45 PM',mandatory:true,payrollBlocking:true,evidenceRequired:true,attachments:[],logs:[]},
  {id:9,country:'India',item:'Gratuity Registration',model:'PEO',status:'Inactive',category:'Statutory',createdBy:'Rahul Mehta',createdAt:'25 May 2026 | 12:40:22 PM',mandatory:true,payrollBlocking:false,evidenceRequired:true,attachments:[],logs:[]}
];
let complianceNextId=10;
let complianceCountryFilter='',complianceModelFilter='',complianceStatusFilter='';
let complianceModalOpen=false;
let complianceSelectedId=null,complianceTab='basic-details';

// ── OPENDHI COMPLIANCE ADMIN DASHBOARD ─────────────────────────────────────
// WHAT THIS ROLE ACTUALLY DOES, because the dashboard is shaped around it:
//   1. Documents the client uploads during contract creation land in this
//      admin's queue. They read each one and APPROVE or REJECT it.
//   2. Documents the employee provides at onboarding go through the same review.
//   3. The country statutory pack is theirs to own outright — they upload it,
//      and they keep it alive as it approaches expiry.
// So every row on this dashboard is a DOCUMENT, and the only question the
// dashboard has to answer is "which documents need me, and what for".
//
// One list behind the whole screen: the tiles are counts over it, clicking a
// tile filters it, and the table under them pages through it. Every number is
// derived, so a tile can never disagree with the rows it filters to.
const OCA_PAGE_SIZE=10;

// The document lifecycle. Six states, each defined by WHOSE move it is next, so
// a document can only ever sit in one of them:
//   Awaiting Upload → nothing has been provided yet
//   Pending Review  → it is in, and the compliance admin must approve or reject
//   Rejected        → refused; a corrected copy is owed
//   Approved        → accepted and in force
//   Expiring Soon   → in force, but validity lapses inside 30 days
//   Closed          → out of force: lapsed, superseded or no longer applicable
// Ordered here the way the day runs — the review queue first, because that is
// the work this role is actually measured on, and the settled states last.
const ocaStatuses=[
  {key:'Pending Review', note:'Uploaded and waiting on your approve / reject decision'},
  {key:'Awaiting Upload',note:'Required, but nothing has been provided yet'},
  {key:'Rejected',       note:'You refused it — a corrected copy is owed'},
  {key:'Expiring Soon',  note:'In force, but validity lapses within 30 days'},
  {key:'Approved',       note:'Checked, accepted and currently in force'},
  {key:'Closed',         note:'Out of force — lapsed, superseded or withdrawn'}
];
const OCA_STATUS_KEYS=ocaStatuses.map(function(s){return s.key;});
// The three states that put the document on someone's desk. Everything else is
// settled, and the header only counts the unsettled ones as "need action".
const OCA_ACTIONABLE=['Pending Review','Awaiting Upload','Rejected','Expiring Soon'];
function ocaNeedsAction(r){return OCA_ACTIONABLE.indexOf(r.status)>-1;}
// A document is settled once it is in force or out of force.
function ocaHasValidity(r){return r.status==='Approved'||r.status==='Expiring Soon'||r.status==='Closed';}

// The three streams the role handles, and they differ by WHO OWES THE UPLOAD —
// which is exactly what decides whether the admin chases someone or does it
// themselves. Stream is a column and a panel field, not a filter: it never
// changes what the admin does next, only who they say it to.
const ocaCategories=[
  {key:'contract',label:'Contract Documents',source:'Client'},
  {key:'employee',label:'Employee Documents',source:'Employee'},
  {key:'country', label:'Country Compliance',source:'Compliance Admin'}
];
const ocaItems=[
  // ── Contract Documents — the client uploads these during contract creation ──
  {id:1, doc:'Signed EOR contract',            who:'Nimbus Retail BV',  cat:'contract',due:'Today',  validTill:'',            status:'Pending Review'},
  {id:2, doc:'Client KYC pack',                who:'Vertex Labs GmbH',  cat:'contract',due:'Today',  validTill:'',            status:'Pending Review'},
  {id:3, doc:'Service agreement addendum',     who:'Aurora Health SL',  cat:'contract',due:'22 May', validTill:'',            status:'Pending Review'},
  {id:4, doc:'Purchase order copy',            who:'Orion Systems Ltd', cat:'contract',due:'26 May', validTill:'',            status:'Awaiting Upload'},
  {id:5, doc:'Signed PEO contract',            who:'Kanan Textiles',    cat:'contract',due:'23 May', validTill:'',            status:'Rejected'},
  {id:6, doc:'Company registration certificate',who:'Nimbus Retail BV', cat:'contract',due:'12 Feb', validTill:'31 Mar 2027', status:'Approved'},
  {id:7, doc:'VAT registration proof',         who:'Vertex Labs GmbH',  cat:'contract',due:'03 Mar', validTill:'30 Jun 2027', status:'Approved'},
  {id:8, doc:'Counter-signed contract',        who:'Helix Motors NV',   cat:'contract',due:'27 May', validTill:'',            status:'Awaiting Upload'},
  {id:9, doc:'Master service agreement',       who:'Orion Systems Ltd', cat:'contract',due:'10 Mar', validTill:'12 Sep 2026', status:'Expiring Soon'},
  {id:10,doc:'Bank mandate form',              who:'Aurora Health SL',  cat:'contract',due:'25 May', validTill:'',            status:'Rejected'},
  {id:11,doc:'Authorised signatory letter',    who:'Kanan Textiles',    cat:'contract',due:'24 May', validTill:'',            status:'Pending Review'},
  {id:12,doc:'Client insurance certificate',   who:'Helix Motors NV',   cat:'contract',due:'05 Mar', validTill:'05 Sep 2026', status:'Expiring Soon'},
  {id:13,doc:'Contract termination notice',    who:'Zephyr Foods Oy',   cat:'contract',due:'18 Apr', validTill:'30 Apr 2026', status:'Closed'},
  {id:14,doc:'Data processing agreement',      who:'Nimbus Retail BV',  cat:'contract',due:'20 Jan', validTill:'31 Dec 2027', status:'Approved'},
  {id:15,doc:'Rate card annexure',             who:'Vertex Labs GmbH',  cat:'contract',due:'29 May', validTill:'',            status:'Awaiting Upload'},
  {id:16,doc:'Group company guarantee',        who:'Zephyr Foods Oy',   cat:'contract',due:'08 Feb', validTill:'31 Jan 2028', status:'Approved'},

  // ── Employee Documents — the employee provides these at onboarding ──
  {id:17,doc:'Passport copy',                  who:'Ramesh Patel',      cat:'employee',due:'Today',  validTill:'',            status:'Pending Review'},
  {id:18,doc:'Work permit',                    who:'Priya Sharma',      cat:'employee',due:'Today',  validTill:'',            status:'Pending Review'},
  {id:19,doc:'Address proof',                  who:'Arjun Desai',       cat:'employee',due:'22 May', validTill:'',            status:'Rejected'},
  {id:20,doc:'Degree certificate',             who:'Nora Kim',          cat:'employee',due:'24 May', validTill:'',            status:'Awaiting Upload'},
  {id:21,doc:'Bank mandate',                   who:'Luis Martin',       cat:'employee',due:'25 May', validTill:'',            status:'Rejected'},
  {id:22,doc:'Tax residency form',             who:'Emma Schmidt',      cat:'employee',due:'26 May', validTill:'',            status:'Awaiting Upload'},
  {id:23,doc:'Background check report',        who:'Lucas Dubois',      cat:'employee',due:'28 May', validTill:'',            status:'Pending Review'},
  {id:24,doc:'Identity document',              who:'Sofia Romano',      cat:'employee',due:'14 Feb', validTill:'14 Aug 2029', status:'Approved'},
  {id:25,doc:'Residence card',                 who:'Thijs Verbeek',     cat:'employee',due:'10 Mar', validTill:'10 Sep 2026', status:'Expiring Soon'},
  {id:26,doc:'Right to work evidence',         who:'Pallavi Parate',    cat:'employee',due:'23 May', validTill:'',            status:'Pending Review'},
  {id:27,doc:'Signed offer letter',            who:'Owen Clark',        cat:'employee',due:'05 Jan', validTill:'No expiry',   status:'Approved'},
  {id:28,doc:'Photo ID',                       who:'Maya Vos',          cat:'employee',due:'22 Jan', validTill:'22 Nov 2028', status:'Approved'},
  {id:29,doc:'Provident fund nomination',      who:'Anika Shah',        cat:'employee',due:'25 May', validTill:'',            status:'Awaiting Upload'},
  {id:30,doc:'Medical fitness certificate',    who:'Mark Lee',          cat:'employee',due:'02 Mar', validTill:'02 Sep 2026', status:'Expiring Soon'},
  {id:31,doc:'Relieving letter — previous employer',who:'John Doe',     cat:'employee',due:'27 May', validTill:'',            status:'Pending Review'},
  {id:32,doc:'Visa page copy',                 who:'Thijs Verbeek',     cat:'employee',due:'15 Mar', validTill:'31 Mar 2026', status:'Closed'},
  {id:33,doc:'Social security registration',   who:'Neha Sharma',       cat:'employee',due:'11 Feb', validTill:'No expiry',   status:'Approved'},
  {id:34,doc:'Emergency contact declaration',  who:'Aishi Verma',       cat:'employee',due:'17 Jan', validTill:'No expiry',   status:'Approved'},

  // ── Country Compliance — the admin owns these outright, upload and renewal ──
  {id:35,doc:'Wage tax declaration pack',      who:'Netherlands',       cat:'country', due:'29 May', validTill:'',            status:'Awaiting Upload'},
  {id:36,doc:'Works council agreement',        who:'Netherlands',       cat:'country', due:'08 Mar', validTill:'08 Sep 2026', status:'Expiring Soon'},
  {id:37,doc:'Provident fund registration',    who:'India',             cat:'country', due:'14 Jan', validTill:'No expiry',   status:'Approved'},
  {id:38,doc:'ESIC registration certificate',  who:'India',             cat:'country', due:'15 Mar', validTill:'15 Sep 2026', status:'Expiring Soon'},
  {id:39,doc:'Shops & Establishments licence', who:'India',             cat:'country', due:'01 Mar', validTill:'01 Sep 2026', status:'Expiring Soon'},
  {id:40,doc:'Dimona declaration template',    who:'Belgium',           cat:'country', due:'19 Jan', validTill:'No expiry',   status:'Approved'},
  {id:41,doc:'Meal voucher scheme approval',   who:'Belgium',           cat:'country', due:'03 Jun', validTill:'',            status:'Awaiting Upload'},
  {id:42,doc:'Social insurance registration',  who:'Germany',           cat:'country', due:'27 Jan', validTill:'No expiry',   status:'Approved'},
  {id:43,doc:'Trade licence — Gewerbeanmeldung',who:'Germany',          cat:'country', due:'16 Mar', validTill:'16 Sep 2026', status:'Expiring Soon'},
  {id:44,doc:'Employer liability insurance',   who:'Spain',             cat:'country', due:'27 May', validTill:'',            status:'Rejected'},
  {id:45,doc:'Collective agreement filing',    who:'Spain',             cat:'country', due:'26 May', validTill:'',            status:'Pending Review'},
  {id:46,doc:'Right to work check policy',     who:'United Kingdom',    cat:'country', due:'09 Feb', validTill:'No expiry',   status:'Approved'},
  {id:47,doc:'PAYE registration certificate',  who:'United Kingdom',    cat:'country', due:'21 Jan', validTill:'No expiry',   status:'Approved'},
  {id:48,doc:'Data protection registration',   who:'United Kingdom',    cat:'country', due:'12 Apr', validTill:'30 Apr 2026', status:'Closed'}
];
// One filter and one only: the status tile. Clicking the active tile clears it.
// ocaSelectedId is the row whose detail panel is open — the same split-panel
// pattern the listing pages use, so the dashboard behaves like the rest of the app.
let ocaStatusFilter='',ocaPage=1,ocaSelectedId=null,ocaTab='basic-details';
function ocaRows(){
  return ocaStatusFilter?ocaItems.filter(function(r){return r.status===ocaStatusFilter;}):ocaItems;
}
function ocaStatusCount(key){return ocaItems.filter(function(r){return r.status===key;}).length;}
function ocaCat(key){
  return ocaCategories.find(function(x){return x.key===key;})||{label:key,source:'—'};
}
function ocaCatLabel(key){return ocaCat(key).label;}
// Who owed the upload. Until it arrives there is nobody to credit, so the cell
// says so rather than naming a party that has not delivered anything.
function ocaUploadedBy(r){return r.status==='Awaiting Upload'?'Not uploaded':ocaCat(r.cat).source;}
/* ── The file behind the row ───────────────────────────────────────────────
   Every row on this dashboard IS a document, but the dashboard only ever
   described one — name, owner, due date — and never let anyone open it. That
   made the single decision this role exists to take, approve or reject, a
   decision taken blind.

   There is no file store behind this prototype, so the file is DERIVED from
   the row the same way its history is: name, type, page count, size and who
   sent it all come out of the record's own id, document name and category.
   Derived means stable — the same row shows the same file every time it is
   opened — and a row nobody has uploaded to has no file at all rather than a
   placeholder pretending to be one. */
function ocaHasFile(r){return !!r&&r.status!=='Awaiting Upload';}
function ocaSlug(v){return String(v).trim().replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
// Photo IDs and scans arrive as images, everything else as a PDF. Read off the
// document's own name so the icon, the page count and the viewer all agree.
function ocaFileKind(r){return /passport|photo|visa page|identity document|residence card/i.test(r.doc)?'JPG':'PDF';}
function ocaFileMeta(r){
  const kind=ocaFileKind(r);
  return {
    kind:kind,
    name:ocaSlug(r.doc)+'_'+ocaRef(r)+'.'+kind.toLowerCase(),
    pages:kind==='JPG'?1:2+(r.id%5),        // 2–6 pages, stable per row
    size:(140+((r.id*37)%680))+' KB',       // 140–819 KB, stable per row
    by:ocaCat(r.cat).source
  };
}
function ocaFileLine(r){
  const f=ocaFileMeta(r);
  return f.kind+' · '+f.pages+(f.pages===1?' page':' pages')+' · '+f.size;
}
// One date column, two meanings, and the status says which: a document in force
// shows how long it stays in force, one still in the queue shows when it is due.
function ocaDateLabel(r){return ocaHasValidity(r)?'Valid Till':'Action Due';}
function ocaDateValue(r){return ocaHasValidity(r)?(r.validTill||'—'):r.due;}
function ocaPageCount(){return Math.max(1,Math.ceil(ocaRows().length/OCA_PAGE_SIZE));}

// ── RATES & RULES DATA & STATE ──

// ── PAYHEADS DATA & STATE ──
/* A payhead is one line on a payslip and the rule that produces it. Two things
   define it and the form asks for both before anything else:
     · CATEGORY  — which side of the payslip it lands on. An Earning adds to
       gross, a Deduction takes from it, an Employer Contribution is a cost the
       employee never sees on their net. Getting this wrong does not make the
       number wrong, it makes the payslip wrong.
     · CALCULATION ON — the base the rule is applied to. "12%" means nothing
       until it says 12% of what.

   SLABS ARE THE RULE ITSELF. Even a flat payhead is one slab that happens to
   cover every value, which is why there is no separate "simple" mode — one
   shape handles "12% of Basic" and a five-band professional tax table, and the
   listing can report both with the same column. A slab's `to` being empty
   means "and above", so the last band always closes the range. */
const PH_CATEGORIES=['Earning','Deduction','Employer Contribution','Reimbursement'];
const PH_CALC_ON=['CTC','Basic','Gross','Net','Fixed Amount','Attendance Days'];
const PH_METHODS=['Flat Amount','Percentage'];
const payheadsData=[
  {id:1,name:'Basic Salary',category:'Earning',calcOn:'CTC',status:'Active',
   createdBy:'Shaun Mathew',createdAt:'02 Mar 2026 | 11:20:00 AM',
   slabs:[{from:'0',to:'',value:'50',method:'Percentage'}],logs:[]},
  {id:2,name:'House Rent Allowance',category:'Earning',calcOn:'Basic',status:'Active',
   createdBy:'Shaun Mathew',createdAt:'02 Mar 2026 | 11:32:00 AM',
   slabs:[{from:'0',to:'',value:'40',method:'Percentage'}],logs:[]},
  {id:3,name:'Provident Fund',category:'Deduction',calcOn:'Basic',status:'Active',
   createdBy:'Neha Sharma',createdAt:'05 Mar 2026 | 09:14:00 AM',
   slabs:[{from:'0',to:'15000',value:'12',method:'Percentage'},
          {from:'15000',to:'',value:'1800',method:'Flat Amount'}],logs:[]},
  {id:4,name:'Professional Tax',category:'Deduction',calcOn:'Gross',status:'Active',
   createdBy:'Neha Sharma',createdAt:'05 Mar 2026 | 09:40:00 AM',
   slabs:[{from:'0',to:'15000',value:'0',method:'Flat Amount'},
          {from:'15000',to:'20000',value:'150',method:'Flat Amount'},
          {from:'20000',to:'',value:'200',method:'Flat Amount'}],logs:[]},
  {id:5,name:'Holiday Allowance',category:'Earning',calcOn:'Gross',status:'Active',
   createdBy:'Pritam Rai',createdAt:'11 Mar 2026 | 03:05:00 PM',
   slabs:[{from:'0',to:'',value:'8',method:'Percentage'}],logs:[]},
  {id:6,name:'Overtime',category:'Earning',calcOn:'Attendance Days',status:'Active',
   createdBy:'Pritam Rai',createdAt:'14 Mar 2026 | 10:48:00 AM',
   slabs:[{from:'0',to:'',value:'1.5',method:'Percentage'}],logs:[]},
  {id:7,name:'Employer PF Contribution',category:'Employer Contribution',calcOn:'Basic',status:'Active',
   createdBy:'Aman Singh',createdAt:'18 Mar 2026 | 12:10:00 PM',
   slabs:[{from:'0',to:'',value:'12',method:'Percentage'}],logs:[]},
  {id:8,name:'Internet Reimbursement',category:'Reimbursement',calcOn:'Fixed Amount',status:'Inactive',
   createdBy:'Aman Singh',createdAt:'22 Mar 2026 | 04:26:00 PM',
   slabs:[{from:'0',to:'',value:'1500',method:'Flat Amount'}],logs:[]}
];
let payheadNextId=9;
let phModalOpen=false;   // creation is a popup, like every other create form
let phSelectedId=null,phTab='basic-details';
let phCategoryFilter='',phStatusFilter='';
/* The slab rows being edited on the create page. Held here rather than read off
   the DOM on submit, because Add Slab has to repaint the block and anything
   already typed must survive that repaint. */
let phDraftSlabs=[];

// How a payhead's rule reads in one line — used by the listing and the panel so
// the two can never describe the same rule differently.
function phRuleText(p){
  if(!p||!p.slabs||!p.slabs.length)return '—';
  if(p.slabs.length===1){
    const s=p.slabs[0];
    return s.method==='Percentage'?s.value+'% of '+p.calcOn:'Flat '+s.value;
  }
  return p.slabs.length+' slabs on '+p.calcOn;
}
function phRows(){
  return payheadsData.filter(function(p){
    if(phCategoryFilter&&p.category!==phCategoryFilter)return false;
    if(phStatusFilter&&p.status!==phStatusFilter)return false;
    return true;
  });
}

/* == HOLIDAYS ==============================================================
   The entity's holiday calendar. A holiday is a date the entity does not work
   on, so the record is deliberately thin — a name, a date, what kind of day it
   is, and which entity it belongs to.

   WHAT IS DERIVED, NEVER STORED: the weekday, the year, and whether the day is
   still to come. All three are facts about the date, and a stored copy of a
   fact about another field is a field that will eventually disagree with it.
   Deriving the weekday is also what lets the create form fill it in live as the
   date is picked — same value, same place, so the two cannot disagree.

   DATES ARE ISO (yyyy-mm-dd) IN STORE, formatted on the way out. That is what
   makes sorting and the year filter one-liners, and it is the format apCD's
   hidden input already hands back, so the create form and the store speak the
   same language with no conversion between them.

   HOLIDAYS ARRIVE IN BATCHES, NOT ONE AT A TIME. Nobody adds Republic Day on
   its own — a calendar is published once a year, a dozen rows in one sitting.
   So the create popup is a repeating row list, each row a holiday with its own
   name, and Add is one action over the whole batch (see hdDraftRows).

   EVERY VIEW IS SCOPED TO THE ENTITY IN THE TOPBAR SWITCHER, which is why
   there is no entity column and no entity filter: you are looking at one
   entity's calendar, and switching entity switches the calendar. The create
   popup states the same entity rather than asking for it. */
const HD_TYPES=['Public Holiday','Optional Holiday','Company Holiday'];
/* NOT EVERY HOLIDAY APPLIES TO EVERY OFFICE. A regional festival is observed
   where it is regional — Ugadi closes Hyderabad and nothing else — so a holiday
   carries the branch it belongs to. "All Branches" is the ordinary case and the
   default, which keeps the common holiday a one-decision record. */
const HD_ALL_BRANCHES='All Branches';
const HD_DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function hdDayName(iso){const d=cdParse(iso);return d?HD_DAY_NAMES[d.getDay()]:'';}
function hdYearOf(iso){return String(iso||'').slice(0,4);}
function hdDateLabel(iso){return cdLabel(iso)||'—';}
// Today at day resolution, so a holiday happening TODAY still counts as
// upcoming rather than flipping to past at one second after midnight.
function hdTodayISO(){return cdISO(new Date());}
function hdIsUpcoming(h){return !!h.date&&h.date>=hdTodayISO();}
/* A holiday on a Saturday or Sunday costs the entity no working day. HR asks
   this of every published calendar, so the calendar answers it in place. */
function hdIsWeekend(iso){const d=hdDayName(iso);return d==='Saturday'||d==='Sunday';}
/* The next holiday actually coming up on this entity's calendar — not the
   filtered list, because "Next" is a fact about the year and should not move to
   a different row because someone filtered by type. */
function hdNextUpId(){
  const t=hdTodayISO();
  const up=hdEntityRows()
    .filter(function(h){return h.status==='Active'&&h.date>=t;})
    .sort(function(a,b){return a.date<b.date?-1:1;});
  return up.length?up[0].id:null;
}
const holidaysData=[
  {id:1,name:'New Year’s Day',date:'2026-01-01',type:'Optional Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Pallavi Parate',createdAt:'18 Dec 2025 | 10:12:00 AM',logs:[]},
  {id:2,name:'Makar Sankranti',date:'2026-01-14',type:'Optional Holiday',branches:['Hyderabad','Mumbai'],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Pallavi Parate',createdAt:'18 Dec 2025 | 10:12:00 AM',logs:[]},
  {id:3,name:'Republic Day',date:'2026-01-26',type:'Public Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Pallavi Parate',createdAt:'18 Dec 2025 | 10:12:00 AM',logs:[]},
  {id:4,name:'Holi',date:'2026-03-04',type:'Public Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Pallavi Parate',createdAt:'18 Dec 2025 | 10:12:00 AM',logs:[]},
  {id:5,name:'Ugadi',date:'2026-03-19',type:'Optional Holiday',branches:['Hyderabad'],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'04 Jan 2026 | 03:40:00 PM',logs:[]},
  {id:6,name:'Ram Navami',date:'2026-03-26',type:'Optional Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'04 Jan 2026 | 03:40:00 PM',logs:[]},
  {id:7,name:'Labour Day',date:'2026-05-01',type:'Optional Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'04 Jan 2026 | 03:40:00 PM',logs:[]},
  {id:8,name:'Independence Day',date:'2026-08-15',type:'Public Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Pallavi Parate',createdAt:'18 Dec 2025 | 10:12:00 AM',logs:[]},
  {id:9,name:'Ganesh Chaturthi',date:'2026-09-14',type:'Optional Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Aman Singh',createdAt:'22 Jan 2026 | 11:05:00 AM',logs:[]},
  {id:10,name:'Gandhi Jayanti',date:'2026-10-02',type:'Public Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Pallavi Parate',createdAt:'18 Dec 2025 | 10:12:00 AM',logs:[]},
  {id:11,name:'Dussehra',date:'2026-10-20',type:'Public Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Aman Singh',createdAt:'22 Jan 2026 | 11:05:00 AM',logs:[]},
  {id:12,name:'Diwali',date:'2026-11-08',type:'Public Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Aman Singh',createdAt:'22 Jan 2026 | 11:05:00 AM',logs:[]},
  {id:13,name:'Christmas',date:'2026-12-25',type:'Public Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Aman Singh',createdAt:'22 Jan 2026 | 11:05:00 AM',logs:[]},
  {id:14,name:'Foundation Day',date:'2026-12-31',type:'Company Holiday',branches:['Hyderabad','Mumbai','Delhi'],entity:'Dhi Hyperlocal',recurring:false,status:'Active',createdBy:'Shaun Mathew',createdAt:'02 Feb 2026 | 09:18:00 AM',logs:[]},
  {id:15,name:'Quarantine Day',date:'2025-04-20',type:'Company Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:false,status:'Inactive',createdBy:'Shaun Mathew',createdAt:'12 Apr 2025 | 05:44:00 PM',logs:[]},
  {id:16,name:'Labour Day',date:'2026-05-01',type:'Optional Holiday',branches:[],entity:'Closedhi',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'04 Jan 2026 | 03:40:00 PM',logs:[]},
  {id:17,name:'Christmas',date:'2026-12-25',type:'Public Holiday',branches:[],entity:'Closedhi',recurring:true,status:'Active',createdBy:'Aman Singh',createdAt:'22 Jan 2026 | 11:05:00 AM',logs:[]},
  {id:18,name:'Karva Chauth',date:'2026-10-29',type:'Optional Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'10 Feb 2026 | 11:30:00 AM',logs:[]},
  {id:19,name:'Govardhan Puja',date:'2026-11-09',type:'Optional Holiday',branches:['Delhi','Mumbai'],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'10 Feb 2026 | 11:30:00 AM',logs:[]},
  {id:20,name:'Bhai Dooj',date:'2026-11-11',type:'Optional Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'10 Feb 2026 | 11:30:00 AM',logs:[]},
  {id:21,name:'Chhath Puja',date:'2026-11-15',type:'Optional Holiday',branches:['Delhi'],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'10 Feb 2026 | 11:30:00 AM',logs:[]},
  {id:22,name:'Guru Nanak Jayanti',date:'2026-11-24',type:'Optional Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'10 Feb 2026 | 11:30:00 AM',logs:[]},
  {id:23,name:'Christmas Eve',date:'2026-12-24',type:'Optional Holiday',branches:[],entity:'Dhi Hyperlocal',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'10 Feb 2026 | 11:30:00 AM',logs:[]},
  {id:24,name:'Diwali (Day 2)',date:'2026-11-09',type:'Optional Holiday',branches:[],entity:'Closedhi',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'10 Feb 2026 | 11:30:00 AM',logs:[]},
  {id:25,name:'Guru Nanak Jayanti',date:'2026-11-24',type:'Optional Holiday',branches:[],entity:'Closedhi',recurring:true,status:'Active',createdBy:'Neha Sharma',createdAt:'10 Feb 2026 | 11:30:00 AM',logs:[]}
];
let holidayNextId=26;
let hdSelectedId=null,hdTab='basic-details';
let hdEditMode=false;              // Basic Details, in edit rather than read mode
let hdYearFilter='',hdTypeFilter='',hdBranchFilter='',hdStatusFilter='';
let hdUpcomingOnly=false;
let hdModalOpen=false;              // creation is a popup, like every other create form
/* The holiday rows being typed in the popup. Held here rather than read off the
   DOM at submit for the same reason phDraftSlabs is: Add Holiday repaints the
   list, and anything already typed has to survive that repaint. */
let hdDraftRows=[];
let hdDraftEntity='';
/* ── The branch picker ─────────────────────────────────────────────────────
   One widget, used by the create rows and by the detail panel's edit form, so
   choosing who a holiday is for reads the same in both places.

   It is addressed by a KEY: 'r0', 'r1' … for the create rows, 'sb' for the
   sidebar. A row key reads and writes the draft row itself rather than a copy,
   which is what keeps the picker honest across an Add Holiday repaint - there
   is no second place for the answer to live and go stale.

   IT DOES NOT REPAINT THE LIST. Everything it changes - the trigger's label,
   the ticks in the popover - is written straight into the nodes. A repaint
   here would close the popover the click just opened, and would take the focus
   out of whatever row was being typed into. */
let hdPickOpen='';        // key of the open popover, '' when none
let hdPickState={};       // non-row keys ('sb') keep their working list here
function hdPickGet(key){
  if(key.charAt(0)==='r'){
    const r=hdDraftRows[+key.slice(1)];
    return r&&r.branches?r.branches:[];
  }
  return hdPickState[key]||[];
}
function hdPickPut(key,list){
  if(key.charAt(0)==='r'){
    const r=hdDraftRows[+key.slice(1)];
    if(r)r.branches=list;
  }else hdPickState[key]=list;
}
function hdPickClose(){
  if(!hdPickOpen)return;
  const pop=document.getElementById('hd-bp-pop-'+hdPickOpen);
  if(pop)pop.remove();
  const btn=document.getElementById('hd-bp-btn-'+hdPickOpen);
  if(btn){btn.classList.remove('is-open');btn.setAttribute('aria-expanded','false');}
  hdPickOpen='';
  document.removeEventListener('mousedown',hdPickDocClose,true);
}
// Anything outside the widget closes it. Capture, so it runs before the click
// lands on whatever was pressed — the field being clicked into keeps its focus
// because nothing is re-rendered on the way past.
function hdPickDocClose(e){
  const t=e.target;
  if(t&&t.closest&&t.closest('.hd-bp'))return;
  hdPickClose();
}
function hdPickToggle(key,ev){sbMarkPanelDirty('hd');
  if(ev){ev.preventDefault();ev.stopPropagation();}
  const was=hdPickOpen;
  hdPickClose();
  if(was===key)return;
  const btn=document.getElementById('hd-bp-btn-'+key);
  if(!btn)return;
  hdPickOpen=key;
  btn.classList.add('is-open');btn.setAttribute('aria-expanded','true');
  btn.insertAdjacentHTML('afterend',hdPickPopHTML(key));
  /* The last row of a long batch sits near the bottom of a modal that is
     already at its full height, so a popover that always opened downward would
     open into the footer. Measured against the modal rather than the viewport,
     because the modal is what does the clipping. */
  const pop=document.getElementById('hd-bp-pop-'+key);
  const box=btn.closest('.ct-modal')||btn.closest('.lp-isb');
  if(pop&&box){
    // The row may be scrolled out of the modal's visible box; bring it in
    // before measuring, or the popover is placed against a trigger nobody can
    // see and lands half outside.
    if(btn.scrollIntoView)btn.scrollIntoView({block:'nearest'});
    const bb=box.getBoundingClientRect(),tb=btn.getBoundingClientRect();
    const below=bb.bottom-tb.bottom,above=tb.top-bb.top;
    // Downward by default. Upward only when down does not fit AND up fits better.
    if(below<pop.offsetHeight+14&&above>below)pop.classList.add('is-up');
  }
  document.addEventListener('mousedown',hdPickDocClose,true);
}
function hdPickAll(key,ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  hdPickPut(key,[]);
  hdPickPaint(key);
}
function hdPickBranch(key,name,ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  const cur=hdPickGet(key).slice(),i=cur.indexOf(name);
  if(i>-1)cur.splice(i,1);else cur.push(name);
  /* Ticking every office is NOT folded into "All Branches", tempting as it
     looks. They are different instructions: All Branches means whoever this
     entity has, including the office that opens next quarter; three ticked
     names mean those three and nothing else. Collapsing one into the other
     would quietly widen a holiday somebody had deliberately narrowed. */
  hdPickPut(key,cur);
  hdPickPaint(key);
}
// The create rows only: give every row in the batch the audience of this one.
function hdPickApplyAll(key,ev){sbMarkPanelDirty('hd');
  if(ev){ev.preventDefault();ev.stopPropagation();}
  if(key.charAt(0)!=='r')return;
  const list=hdPickGet(key).slice();
  hdSyncRows();
  hdDraftRows.forEach(function(r){r.branches=list.slice();});
  hdPickClose();
  hdRenderRows();
  showToast('Applied to all rows','info',hdBranchLabel(list)+' set on '+hdDraftRows.length+' row'+(hdDraftRows.length===1?'':'s')+'.');
}
function hdPickPaint(key){
  const list=hdPickGet(key);
  const btn=document.getElementById('hd-bp-btn-'+key);
  if(btn){
    const lbl=btn.querySelector('.hd-bp-lbl');
    if(lbl)lbl.textContent=hdBranchLabel(list);
    btn.classList.toggle('is-all',!list.length);
    btn.title=list.length?('Applies to '+list.join(', ')):'Applies to every branch of this entity';
  }
  const pop=document.getElementById('hd-bp-pop-'+key);
  if(!pop)return;
  pop.querySelectorAll('[data-branch]').forEach(function(el){
    const b=el.getAttribute('data-branch');
    el.classList.toggle('is-on',b===''?!list.length:list.indexOf(b)>-1);
  });
  const note=pop.querySelector('.hd-bp-note');
  if(note)note.textContent=list.length
    ?('Only '+list.join(', ')+' will see this holiday.')
    :'Every branch of this entity will see this holiday.';
}

// The entity being worked in — the one named in the topbar switcher.
function hdCurrentEntityName(){
  if(typeof entitiesData==='undefined'||!entitiesData.length)return '';
  const e=entitiesData.find(function(x){return x.id===seSelectedEntity;})||entitiesData[0];
  return e.name||'';
}
// This entity's whole calendar, before any filter. The year list and the stat
// tiles read from here so they cannot disagree about what the calendar holds.
function hdEntityRows(){
  const ent=hdCurrentEntityName();
  return holidaysData.filter(function(h){return h.entity===ent;});
}
// The years the calendar actually contains, newest first — a hard-coded year
// list goes stale the moment someone adds a 2027 holiday.
function hdYearOptions(){
  const seen={},out=[];
  hdEntityRows().forEach(function(h){const y=hdYearOf(h.date);if(y&&!seen[y]){seen[y]=1;out.push(y);}});
  const cur=hdYearOf(hdTodayISO());
  if(!seen[cur])out.push(cur);
  return out.sort().reverse();
}
/* ── WHO A HOLIDAY IS FOR ──────────────────────────────────────────────────
   A holiday used to carry ONE branch, or the string "All Branches". That is a
   choice between "everywhere" and "exactly one place", and real calendars are
   not shaped like that: Makar Sankranti is observed in Hyderabad and Mumbai
   and nowhere else in the entity, and the only way to file it was as two
   separate holidays with the same name and date — two records to edit, two to
   deactivate, and a clash check that had to be taught to ignore them.

   So the audience is a LIST. Empty means every branch, which keeps the common
   case free of decoration: most holidays are entity-wide and say nothing about
   branches at all.

   Everything reads it through hdBranches(), which also understands the older
   single-branch shape, so a record written before this change still resolves. */
function hdBranches(h){
  if(!h)return [];
  if(h.branches&&h.branches.length)return h.branches.slice();
  if(h.branch&&h.branch!==HD_ALL_BRANCHES)return [h.branch];
  return [];
}
function hdIsAllBranches(h){return !hdBranches(h).length;}
function hdBranchText(h){
  const b=hdBranches(h);
  return b.length?b.join(', '):HD_ALL_BRANCHES;
}
// What a picker's trigger says: the whole list while it is short, a count once
// it is not, because three office names in a table cell is not a table cell.
function hdBranchLabel(list){
  if(!list||!list.length)return HD_ALL_BRANCHES;
  if(list.length===1)return list[0];
  return list.length+' branches';
}
/* Read off the employees rather than hard-coded, so opening an office adds it
   to the list by putting somebody in it — the same reason the year filter is
   derived from the dates rather than typed out. */
function hdBranchChoices(){
  const seen={},out=[];
  if(typeof empPoolExt!=='undefined')
    Object.keys(empPoolExt).forEach(function(k){
      const b=empPoolExt[k].branch;
      if(b&&!seen[b]){seen[b]=1;out.push(b);}
    });
  holidaysData.forEach(function(h){
    hdBranches(h).forEach(function(b){if(!seen[b]){seen[b]=1;out.push(b);}});
  });
  return out.sort();
}
// The filter wants the same list with "All Branches" on the front, because
// there it means "do not filter" rather than "everyone".
function hdBranchOptions(){return [HD_ALL_BRANCHES].concat(hdBranchChoices());}
/* Filtering to one branch shows the holidays that branch actually observes,
   which INCLUDES the entity-wide ones — a Mumbai calendar is its own days plus
   the company-wide days, not just the days unique to it. */
function hdBranchMatch(h,f){
  if(!f||f===HD_ALL_BRANCHES)return true;
  const b=hdBranches(h);
  return !b.length||b.indexOf(f)>-1;
}
/* Two holidays clash only if the same person could be told both. Entity-wide
   overlaps everything; two branch lists overlap only where they share an
   office. Hyderabad's Ugadi and Mumbai's Gudi Padwa on one date is an
   arrangement, not a conflict. */
function hdAudienceOverlap(a,b){
  if(!a.length||!b.length)return true;
  return a.some(function(x){return b.indexOf(x)>-1;});
}
// Chronological, because a holiday calendar that is not in date order is not a
// calendar. Newest-first is right for records people file; it is wrong here.
function hdRows(){
  return hdEntityRows().filter(function(h){
    if(hdYearFilter&&hdYearOf(h.date)!==hdYearFilter)return false;
    if(hdTypeFilter&&h.type!==hdTypeFilter)return false;
    if(hdBranchFilter&&!hdBranchMatch(h,hdBranchFilter))return false;
    if(hdStatusFilter&&h.status!==hdStatusFilter)return false;
    if(hdUpcomingOnly&&!hdIsUpcoming(h))return false;
    return true;
  }).sort(function(a,b){return a.date<b.date?-1:(a.date>b.date?1:0);});
}
const ratesRulesData=[
  {id:1,country:'Netherlands',ruleName:'Minimum Wage',category:'General',applicableTo:'EOR / PEO',valueRate:'EUR 14.71',status:'Active',createdBy:'Tarak Swain',createdAt:'02 Mar 2026 | 02:53:47 PM',logs:[]},
  {id:2,country:'Netherlands',ruleName:'Income Tax Bracket 1',category:'Income Tax',applicableTo:'EOR',valueRate:'35.75%',status:'Inactive',createdBy:'Tarak Swain',createdAt:'02 Mar 2026 | 02:55:10 PM',logs:[]},
  {id:3,country:'Netherlands',ruleName:'Unemployment Insurance',category:'Social Security',applicableTo:'EOR',valueRate:'2.74%',status:'Active',createdBy:'Neha Sharma',createdAt:'28 Feb 2026 | 11:20:00 AM',logs:[]},
  {id:4,country:'Netherlands',ruleName:'Disability Insurance',category:'Social Security',applicableTo:'EOR',valueRate:'6.27%',status:'Inactive',createdBy:'Neha Sharma',createdAt:'28 Feb 2026 | 11:25:40 AM',logs:[]},
  {id:5,country:'Netherlands',ruleName:'Holiday Allowance',category:'Benefits',applicableTo:'EOR / PEO',valueRate:'8.00%',status:'Active',createdBy:'Aman Singh',createdAt:'25 Feb 2026 | 04:10:15 PM',logs:[]},
  {id:6,country:'Netherlands',ruleName:'Health Insurance Levy',category:'Health Ins.',applicableTo:'PEO',valueRate:'6.10%',status:'Inactive',createdBy:'Aman Singh',createdAt:'25 Feb 2026 | 04:15:30 PM',logs:[]},
  {id:7,country:'Netherlands',ruleName:'Childcare Levy',category:'Social Security',applicableTo:'PEO',valueRate:'0.50%',status:'Inactive',createdBy:'Rahul Mehta',createdAt:'20 Feb 2026 | 09:40:00 AM',logs:[]}
];
let ratesRuleSelectedId=null,ratesRuleTab='basic-details';
let ratesRuleCountryFilter='',ratesRuleCategoryFilter='',ratesRuleStatusFilter='';
let ratesRuleNextId=8;
let ratesRuleModalOpen=false;
let ratesRuleSuccessName='';

// ── CONTRACT TEMPLATES DATA & STATE ──
const contractTemplatesData=[
  {id:1,templateName:'SHIV TEST',employmentType:'EOR',templateId:'16',status:'Active',country:'Netherlands',category:'Proposal',createdBy:'Tarak Swain',createdAt:'02 Mar 2026 | 02:53:47 PM',attachments:[],logs:[]},
  {id:2,templateName:'NL EOR Standard',employmentType:'EOR',templateId:'12',status:'Active',country:'Netherlands',category:'Contract',createdBy:'Neha Sharma',createdAt:'28 Feb 2026 | 11:20:00 AM',attachments:[],logs:[]},
  {id:3,templateName:'India PEO Draft',employmentType:'PEO',templateId:'9',status:'Inactive',country:'India',category:'Proposal',createdBy:'Aman Singh',createdAt:'25 Feb 2026 | 04:10:15 PM',attachments:[],logs:[]},
  {id:4,templateName:'Germany Direct Onboarding',employmentType:'Direct',templateId:'7',status:'Active',country:'Germany',category:'Onboarding',createdBy:'Rahul Mehta',createdAt:'20 Feb 2026 | 09:40:00 AM',attachments:[],logs:[]}
];
let ctpSelectedId=null,ctpTab='basic-details';
let ctpCountryFilter='',ctpCategoryFilter='',ctpStatusFilter='';
let ctpNextId=5;
let ctpModalOpen=false;
let ctpSuccessName='';

// ── SUPPORT: TICKETS & CHATS DATA ──
// Support ticket workflow - keyed by ticketsData id. Ends on each ticket's real status.
const tkWorkflowData={
  1:[{title:'Awaiting Client Document',user:'Pallavi Parate',date:'Jun 13, 2026',time:'10:20:00 AM',description:'Requested the corrected compliance document from John Doe.'},
     {title:'Assigned to Agent',user:'Support Desk',date:'Jun 12, 2026',time:'02:15:00 PM',description:'Compliance ticket assigned to Pallavi Parate.'},
     {title:'Ticket Raised',user:'John Doe',date:'Jun 12, 2026',time:'11:05:00 AM',description:'Issue with compliance doc reported by John Doe (United States).'}],
  2:[{title:'Ticket Blocked',user:'Rahul Mehta',date:'Jun 15, 2026',time:'04:40:00 PM',description:'Blocked - salary document cannot be issued until payroll data is confirmed.'},
     {title:'Assigned to Agent',user:'Support Desk',date:'Jun 14, 2026',time:'01:30:00 PM',description:'Document ticket assigned to Rahul Mehta.'},
     {title:'Ticket Raised',user:'Thijs Verbeek',date:'Jun 14, 2026',time:'09:50:00 AM',description:'Salary document missing reported by Thijs Verbeek (Netherlands).'}],
  3:[{title:'Awaiting Contract Review',user:'Aman Singh',date:'Jun 11, 2026',time:'11:00:00 AM',description:'Renewal terms shared with the contracts team for review.'},
     {title:'Assigned to Agent',user:'Support Desk',date:'Jun 10, 2026',time:'03:20:00 PM',description:'Contract ticket assigned to Aman Singh.'},
     {title:'Ticket Raised',user:'Alice Smith',date:'Jun 10, 2026',time:'10:10:00 AM',description:'Contract renewal request raised by Alice Smith (United Kingdom).'}],
  4:[{title:'In Progress',user:'Pallavi Parate',date:'Jun 19, 2026',time:'09:45:00 AM',description:'Tax form re-issued and sent to Mark Lee for confirmation.'},
     {title:'Assigned to Agent',user:'Support Desk',date:'Jun 18, 2026',time:'02:00:00 PM',description:'Compliance ticket assigned to Pallavi Parate.'},
     {title:'Ticket Raised',user:'Mark Lee',date:'Jun 18, 2026',time:'12:30:00 PM',description:'Tax form not received reported by Mark Lee.'}],
  5:[{title:'Awaiting Draft Feedback',user:'Neha Sharma',date:'Jun 21, 2026',time:'10:30:00 AM',description:'Contract draft shared with Thijs Verbeek for review.'},
     {title:'Assigned to Agent',user:'Support Desk',date:'Jun 20, 2026',time:'04:10:00 PM',description:'Contract ticket assigned to Neha Sharma.'},
     {title:'Ticket Raised',user:'Thijs Verbeek',date:'Jun 20, 2026',time:'03:00:00 PM',description:'Contract draft review requested by Thijs Verbeek.'}],
  6:[{title:'Ticket Blocked',user:'Rahul Mehta',date:'Jun 23, 2026',time:'11:25:00 AM',description:'Blocked - compliance certificate pending issue from the local authority.'},
     {title:'Assigned to Agent',user:'Support Desk',date:'Jun 22, 2026',time:'05:00:00 PM',description:'Compliance ticket assigned to Rahul Mehta.'},
     {title:'Ticket Raised',user:'Alice Smith',date:'Jun 22, 2026',time:'02:40:00 PM',description:'Missing compliance certificate reported by Alice Smith.'}]
};
/* ── WHERE THE TICKET CAME FROM ────────────────────────────────────────────
   A ticket that grew out of a CSM chat and one somebody raised cold are the
   same record — same lifecycle, same panel, same moves. They were briefly two
   pages; they are one module again, because a support agent works a single
   queue and does not want to check two of them to know what is open.

   `source` is therefore a COLUMN AND A FILTER, not a page boundary. The one
   place it genuinely changes the UI is the detail panel: a chat-borne ticket
   has a conversation to read and gets the Conversation tab, and a portal,
   phone or internally-raised one does not, so it does not. That gate lives in
   renderTkSidebar() off tkIsChat() — see the note there. */
const TK_SOURCES={
  chat:    {label:'CSM Chat',           short:'Chat'},
  portal:  {label:'Client Portal',      short:'Portal'},
  phone:   {label:'Phone Call',         short:'Phone'},
  internal:{label:'Raised Internally',  short:'Internal'}
};
function tkSourceLabel(t){const s=TK_SOURCES[t&&t.source];return s?s.label:'—';}
function tkSourceShort(t){const s=TK_SOURCES[t&&t.source];return s?s.short:'—';}
function tkIsChat(t){return t.source==='chat';}
const ticketsData=[
  // ── Raised from a CSM chat — these carry a Conversation tab on the panel ──
  {id:1,ticketId:'TCK-1021',clientName:'John Doe',title:'Issue with compliance doc',category:'Compliance',createdAt:'Jun 12, 2026',status:'open',source:'chat',raisedBy:'John Doe',clientEmail:'john.doe@example.com',clientPhone:'+1 555-0101',country:'United States',assignedTo:'Pallavi Parate',description:'Client reported missing compliance documentation for Q2 audit. Follow-up required with legal team.'},
  {id:3,ticketId:'TCK-1019',clientName:'Alice Smith',title:'Contract renewal request',category:'Contract',createdAt:'Jun 10, 2026',status:'open',source:'chat',raisedBy:'Alice Smith',clientEmail:'alice.smith@example.com',clientPhone:'+44 20 0000 0000',country:'United Kingdom',assignedTo:'Aman Singh',description:'Client has requested renewal of EOR contract expiring July 2026.'},
  {id:4,ticketId:'TCK-1100',clientName:'Mark Lee',title:'Tax form not received',category:'Compliance',createdAt:'Jun 18, 2026',status:'in_progress',source:'chat',raisedBy:'Mark Lee',clientEmail:'mark.lee@example.com',clientPhone:'+49 30 000000',country:'Germany',assignedTo:'Pallavi Parate',description:'Client has not received the annual tax form for the 2025-26 fiscal year. Currently being processed.'},
  {id:6,ticketId:'TCK-1298',clientName:'Alice Smith',title:'Missing compliance certificate',category:'Compliance',createdAt:'Jun 22, 2026',status:'blocked',source:'chat',raisedBy:'Alice Smith',clientEmail:'alice.smith@example.com',clientPhone:'+44 20 0000 0000',country:'United Kingdom',assignedTo:'Rahul Mehta',waitingOn:'Local authority',description:'Certificate of compliance for UK operations not obtained. Blocked pending local authority approval.'},

  // ── Raised outside chat — portal, phone, or internally by the Opendhi team ──
  {id:2,ticketId:'TCK-1025',clientName:'Thijs Verbeek',title:'Salary document missing',category:'Document',createdAt:'Jun 14, 2026',status:'blocked',source:'portal',raisedBy:'Thijs Verbeek',clientEmail:'thijs.verbeek@example.com',clientPhone:'+31 20 000 0000',country:'Netherlands',assignedTo:'Rahul Mehta',waitingOn:'Finance team',description:'Monthly salary document not uploaded for May 2026. Awaiting finance team confirmation.'},
  {id:5,ticketId:'TCK-1201',clientName:'Thijs Verbeek',title:'Contract draft review',category:'Contract',createdAt:'Jun 20, 2026',status:'open',source:'portal',raisedBy:'Thijs Verbeek',clientEmail:'thijs.verbeek@example.com',clientPhone:'+31 20 000 0000',country:'Netherlands',assignedTo:'Neha Sharma',description:'New EOR contract draft sent for client review. Awaiting feedback.'},
  {id:7,ticketId:'TCK-1921',clientName:'Mark Lee',title:'Invoice document request',category:'Document',createdAt:'Jun 25, 2026',status:'closed',source:'phone',raisedBy:'Mark Lee',clientEmail:'mark.lee@example.com',clientPhone:'+49 30 000000',country:'Germany',assignedTo:'Aman Singh',description:'Client requested invoice copies for Q1 2026. All documents sent and acknowledged.'},
  {id:8,ticketId:'TCK-2004',clientName:'Nimbus Retail BV',title:'Payslip not visible in portal',category:'Payroll',createdAt:'Jun 26, 2026',status:'open',source:'portal',raisedBy:'Anika Shah',clientEmail:'anika.shah@nimbusretail.nl',clientPhone:'+31 20 111 2233',country:'Netherlands',assignedTo:'',description:'Employee cannot see the June payslip in the self-service portal. Raised through the portal help form.'},
  {id:9,ticketId:'TCK-2011',clientName:'Vertex Labs GmbH',title:'Add a second billing contact',category:'Billing',createdAt:'Jun 26, 2026',status:'open',source:'portal',raisedBy:'Hannah Keller',clientEmail:'hannah.keller@vertexlabs.de',clientPhone:'+49 30 555 0110',country:'Germany',assignedTo:'',description:'Client wants a second finance contact added to receive monthly invoices. Raised from the client portal by the finance contact.'},
  {id:10,ticketId:'TCK-2017',clientName:'Priya Sharma',title:'Bank account change request',category:'Payroll',createdAt:'Jun 24, 2026',status:'in_progress',source:'portal',raisedBy:'Priya Sharma',clientEmail:'priya.sharma@example.com',clientPhone:'+91 80 4000 1122',country:'India',assignedTo:'Neha Sharma',description:'Employee requested a change of salary account ahead of the July payroll cut-off.'},
  {id:11,ticketId:'TCK-2023',clientName:'Aurora Health SL',title:'Duplicate invoice received',category:'Billing',createdAt:'Jun 23, 2026',status:'blocked',source:'phone',raisedBy:'Carlos Ruiz',clientEmail:'carlos.ruiz@aurorahealth.es',clientPhone:'+34 91 000 0000',country:'Spain',assignedTo:'Aman Singh',waitingOn:'Finance team',description:'Two invoices issued for the same May billing period. Called in by the client. Held until finance confirms which one to cancel.'},
  {id:12,ticketId:'TCK-2029',clientName:'Owen Clark',title:'Leave balance looks wrong',category:'Leave',createdAt:'Jun 21, 2026',status:'in_progress',source:'portal',raisedBy:'Owen Clark',clientEmail:'owen.clark@example.com',clientPhone:'+44 161 000 0000',country:'United Kingdom',assignedTo:'Pallavi Parate',description:'Annual leave balance shows 12 days against an expected 18. Checking the accrual run for this employee.'},
  {id:13,ticketId:'TCK-2034',clientName:'Kanan Textiles',title:'Onboarding portal access for new HR',category:'Access',createdAt:'Jun 20, 2026',status:'resolved',source:'phone',raisedBy:'Meera Iyer',clientEmail:'meera.iyer@kanantextiles.in',clientPhone:'+91 44 2800 1100',country:'India',assignedTo:'Rahul Mehta',description:'Called the desk to request portal access for a newly joined HR manager. Access created and credentials sent.'},
  {id:14,ticketId:'TCK-2041',clientName:'Helix Motors NV',title:'Country pack for Belgium expansion',category:'Compliance',createdAt:'Jun 19, 2026',status:'open',source:'internal',raisedBy:'Neha Sharma',clientEmail:'ops@helixmotors.be',clientPhone:'+32 2 000 0000',country:'Belgium',assignedTo:'',description:'Raised by the ops team ahead of the client hiring in Belgium. Country compliance pack needs to be prepared.'},
  {id:15,ticketId:'TCK-2048',clientName:'Sofia Romano',title:'Cannot upload passport scan',category:'Document',createdAt:'Jun 18, 2026',status:'in_progress',source:'portal',raisedBy:'Sofia Romano',clientEmail:'sofia.romano@example.com',clientPhone:'+39 06 000 0000',country:'Italy',assignedTo:'Pallavi Parate',description:'Upload fails on the onboarding document step. Reproduced on the support side and passed to engineering.'},
  {id:16,ticketId:'TCK-2055',clientName:'Orion Systems Ltd',title:'Quarterly headcount report request',category:'Reporting',createdAt:'Jun 16, 2026',status:'resolved',source:'portal',raisedBy:'Grace Whelan',clientEmail:'grace.whelan@orionsystems.co.uk',clientPhone:'+44 20 7000 0000',country:'United Kingdom',assignedTo:'Aman Singh',description:'Client asked for a headcount and cost report for Q2. Report generated and shared for confirmation.'},
  {id:17,ticketId:'TCK-2062',clientName:'Zephyr Foods Oy',title:'Offboarding checklist not triggered',category:'Offboarding',createdAt:'Jun 15, 2026',status:'closed',source:'internal',raisedBy:'Rahul Mehta',clientEmail:'hr@zephyrfoods.fi',clientPhone:'+358 9 000 0000',country:'Finland',assignedTo:'Rahul Mehta',description:'Exit date was set but the offboarding workflow did not start. Re-triggered manually and confirmed complete.'}
];
// ── Ticket lifecycle ──────────────────────────────────────────────────────
// A ticket is not resolved because somebody clicked a tick. Each state names
// the party who owes the NEXT action, and lists the only moves legal from it.
//
// The shape of the flow is the point:
//   open -> in_progress -> resolved -> closed
//                  \-> blocked -/
// Nothing reaches `closed` except from `resolved`, and `resolved` means "the
// agent has proposed an answer and the CLIENT has not confirmed it yet". So
// an agent can never close a ticket on their own from the listing - the row
// action offers `Propose resolution`, and only after the client confirms does
// a Close action appear. `blocked` is the other honest state: it must name
// the party being waited on, and it cannot skip to resolved without coming
// back through in_progress first.
//
// THE COMMENT IS THE RECORD. A ticket carries no "resolution" field, because
// what was done to resolve it is not a property of the ticket - it is the
// thing that happened at the moment it moved to Resolved, which is exactly
// what a log entry is. So every move asks its own question (`ask`) and the
// answer is stored as that entry's comment; the panel reads the resolution
// back out of the log rather than out of the record. One place to write it,
// one place to read it, and no field that can silently disagree with the
// history next to it.
//
// `needs` lists extra required inputs the form must collect on top of the
// comment, which is required for every move without exception.
const TK_FLOW={
  open:{
    owner:function(t){return t.assignedTo?'Agent · '+t.assignedTo:'Unassigned';},
    next:[{to:'in_progress',label:'Start work',tone:'wait',icon:'play',needs:['assignee'],
           title:'Work Started',ask:'What is your plan for this ticket?'}]
  },
  in_progress:{
    owner:function(t){return 'Agent · '+t.assignedTo;},
    next:[{to:'resolved',label:'Propose resolution',tone:'ok',icon:'check',needs:[],
           title:'Resolution Proposed',ask:'What did you do to resolve this?',
           commentLabel:'Resolution'},
          {to:'blocked',label:'Mark blocked',tone:'bad',icon:'pause',needs:['waitingOn'],
           title:'Ticket Blocked',ask:'What is it blocked on, and what unblocks it?'}]
  },
  blocked:{
    owner:function(t){return t.waitingOn?'Waiting on '+t.waitingOn:'Waiting on a third party';},
    next:[{to:'in_progress',label:'Unblock',tone:'wait',icon:'play',needs:[],
           title:'Ticket Unblocked',ask:'What changed that unblocked this?'}]
  },
  resolved:{
    owner:function(t){return 'Client · '+t.clientName;},
    next:[{to:'closed',label:'Client confirmed - close',tone:'ok',icon:'check',needs:[],
           title:'Ticket Closed',ask:'How did the client confirm?'},
          {to:'in_progress',label:'Client rejected - resume',tone:'bad',icon:'undo',needs:[],
           title:'Resolution Rejected',ask:'Why was the resolution rejected?'}]
  },
  closed:{
    owner:function(){return 'Nobody - closed';},
    next:[{to:'in_progress',label:'Reopen ticket',tone:'info',icon:'undo',needs:[],
           title:'Ticket Reopened',ask:'Why is this being reopened?'}]
  }
};
// Who owes the next action on this ticket, in words. The long form names the
// ROLE as well as the person, which is what the detail panel wants.
function tkOwner(t){const f=TK_FLOW[t&&t.status];return f?f.owner(t):'-';}
// The same answer for a table cell, where a ninth column cannot afford the
// role prefix. The column header already says "Next Action On", so the bare
// name is not ambiguous - and the full form stays in the cell's tooltip.
function tkOwnerShort(t){
  if(!t)return '-';
  if(t.status==='blocked')return t.waitingOn||'Third party';
  if(t.status==='resolved')return t.clientName;
  if(t.status==='closed')return '-';
  return t.assignedTo||'Unassigned';
}
// The legal moves out of this ticket's current state.
function tkMoves(t){const f=TK_FLOW[t&&t.status];return f?f.next:[];}
// The agents a ticket can be assigned to. One list, used by the Assignment
// tab and by the confirm dialog's assignee field so the two cannot drift.
const TK_AGENTS=['Pallavi Parate','Rahul Mehta','Aman Singh','Neha Sharma','Olivia Clark'];
// The parties a ticket can be blocked on.
const TK_BLOCKERS=['Client','Finance team','Legal team','Payroll team','Local authority','Third-party vendor'];

// A ticket's history, seeded the same way every other module seeds its Logs
// tab. These read newest-first and are copied onto the record by seedLogs().
const tkLogsData={
  1:[{date:'13 Jun 2026',time:'10:20:00 AM',user:'Pallavi Parate',status:'Open',action:'Requested the corrected compliance document from John Doe. Waiting on the client before this can move.'}],
  2:[{date:'15 Jun 2026',time:'04:40:00 PM',user:'Rahul Mehta',status:'Blocked',action:'Salary document cannot be issued until payroll data is confirmed. Waiting on: Finance team.'},
     {date:'14 Jun 2026',time:'01:35:00 PM',user:'Rahul Mehta',status:'In Progress',action:'Picked this up and pulled the May payroll register to check what is missing.'}],
  3:[{date:'11 Jun 2026',time:'11:00:00 AM',user:'Aman Singh',status:'Open',action:'Renewal terms shared with the contracts team for review.'}],
  4:[{date:'19 Jun 2026',time:'09:45:00 AM',user:'Pallavi Parate',status:'In Progress',action:'Re-issued the 2025-26 tax form from the payroll portal and emailed it to Mark Lee.'}],
  5:[{date:'21 Jun 2026',time:'10:30:00 AM',user:'Neha Sharma',status:'Open',action:'Contract draft shared with Thijs Verbeek for review.'}],
  6:[{date:'23 Jun 2026',time:'02:15:00 PM',user:'Rahul Mehta',status:'Blocked',action:'Certificate of compliance for UK operations cannot be obtained until the authority responds. Waiting on: Local authority.'}],
  7:[{date:'26 Jun 2026',time:'09:05:00 AM',user:'Aman Singh',status:'Closed',action:'Client acknowledged receipt on the call. Closing.'},
     {date:'25 Jun 2026',time:'04:20:00 PM',user:'Aman Singh',status:'Resolved',action:'Re-sent all Q1 2026 invoice copies from the billing portal and confirmed the client could open them.'}]
};
// What was done to resolve this ticket, read back out of the history rather
// than out of the record. The newest entry that moved it to Resolved is the
// answer; if it was never resolved there is nothing to show, which is the
// honest result rather than an empty field pretending to be data.
function tkResolution(t){
  if(!t)return '';
  const logs=seedLogs(t,tkLogsData[t.id]);
  for(let i=0;i<logs.length;i++)if(logs[i].status==='Resolved')return logs[i].action;
  return '';
}

// Chat workflow - keyed by chatsData id. Ends on each chat's real status.
const chatWorkflowData={
  1:[{title:'Waiting for CSM',user:'Pallavi Parate',date:'Jun 26, 2026',time:'09:40:00 AM',description:'Client reply received on TCK-1021. Awaiting CSM response.'},
     {title:'Chat Assigned',user:'Support Desk',date:'Jun 26, 2026',time:'09:10:00 AM',description:'CHAT-1045 assigned to Pallavi Parate.'},
     {title:'Chat Started',user:'John Doe',date:'Jun 26, 2026',time:'09:00:00 AM',description:'Chat opened by John Doe (United States).'}],
  2:[{title:'Waiting for Client',user:'Rahul Mehta',date:'Jun 24, 2026',time:'03:15:00 PM',description:'Response sent to Priya Sharma. Awaiting client confirmation.'},
     {title:'Chat Assigned',user:'Support Desk',date:'Jun 24, 2026',time:'02:40:00 PM',description:'CHAT-1044 assigned to Rahul Mehta.'},
     {title:'Chat Started',user:'Priya Sharma',date:'Jun 24, 2026',time:'02:30:00 PM',description:'Chat opened by Priya Sharma (India).'}],
  3:[{title:'Chat Active',user:'Neha Sharma',date:'Jun 19, 2026',time:'11:30:00 AM',description:'Ongoing conversation linked to TCK-1019.'},
     {title:'Chat Assigned',user:'Support Desk',date:'Jun 19, 2026',time:'11:20:00 AM',description:'CHAT-1043 assigned to Neha Sharma.'},
     {title:'Chat Started',user:'Ramesh Patel',date:'Jun 19, 2026',time:'11:15:00 AM',description:'Chat opened by Ramesh Patel (India).'}],
  4:[{title:'Chat Inactive',user:'Olivia Clark',date:'Apr 28, 2026',time:'10:00:00 AM',description:'No client response for 48 hours. Chat marked inactive.'},
     {title:'Chat Assigned',user:'Support Desk',date:'Apr 26, 2026',time:'04:10:00 PM',description:'CHAT-1042 assigned to Olivia Clark.'},
     {title:'Chat Started',user:'Aisha Verma',date:'Apr 26, 2026',time:'04:00:00 PM',description:'Chat opened by Aisha Verma.'}],
  5:[{title:'Chat Active',user:'Aman Singh',date:'Mar 26, 2026',time:'10:20:00 AM',description:'Conversation ongoing with Sophie Dubois.'},
     {title:'Chat Assigned',user:'Support Desk',date:'Mar 26, 2026',time:'10:05:00 AM',description:'CHAT-1041 assigned to Aman Singh.'},
     {title:'Chat Started',user:'Sophie Dubois',date:'Mar 26, 2026',time:'10:00:00 AM',description:'Chat opened by Sophie Dubois.'}],
  6:[{title:'Waiting for Client',user:'Pallavi Parate',date:'Mar 12, 2026',time:'04:05:00 PM',description:'Follow-up sent to Luca Bianchi. Awaiting client reply.'},
     {title:'Chat Assigned',user:'Support Desk',date:'Mar 12, 2026',time:'03:50:00 PM',description:'CHAT-1040 assigned to Pallavi Parate.'},
     {title:'Chat Started',user:'Luca Bianchi',date:'Mar 12, 2026',time:'03:45:00 PM',description:'Chat opened by Luca Bianchi.'}]
};
const chatsData=[
  {id:1,chatId:'CHAT-1045',clientName:'John Doe',assignedTo:'Pallavi Parate',lastActivity:'53 min ago',status:'waiting_csm',country:'United States',clientEmail:'john.doe@example.com',startedAt:'Jun 26, 2026 | 09:00 AM',linkedTickets:['TCK-1021']},
  {id:2,chatId:'CHAT-1044',clientName:'Priya Sharma',assignedTo:'Rahul Mehta',lastActivity:'2 days ago',status:'waiting_client',country:'India',clientEmail:'priya.sharma@example.com',startedAt:'Jun 24, 2026 | 02:30 PM',linkedTickets:[]},
  {id:3,chatId:'CHAT-1043',clientName:'Ramesh Patel',assignedTo:'Neha Sharma',lastActivity:'1 week ago',status:'active',country:'India',clientEmail:'ramesh.patel@example.com',startedAt:'Jun 19, 2026 | 11:15 AM',linkedTickets:['TCK-1019']},
  {id:4,chatId:'CHAT-1042',clientName:'Aisha Verma',assignedTo:'Olivia Clark',lastActivity:'2 months ago',status:'inactive',country:'Spain',clientEmail:'aisha.verma@example.com',startedAt:'Apr 26, 2026 | 04:00 PM',linkedTickets:[]},
  {id:5,chatId:'CHAT-1041',clientName:'Sophie Dubois',assignedTo:'Aman Singh',lastActivity:'3 months ago',status:'active',country:'France',clientEmail:'sophie.dubois@example.com',startedAt:'Mar 26, 2026 | 10:00 AM',linkedTickets:[]},
  {id:6,chatId:'CHAT-1040',clientName:'Luca Bianchi',assignedTo:'Pallavi Parate',lastActivity:'3 months ago',status:'waiting_client',country:'Italy',clientEmail:'luca.bianchi@example.com',startedAt:'Mar 12, 2026 | 03:45 PM',linkedTickets:['TCK-1100']},
  {id:7,chatId:'CHAT-1039',clientName:'Hannah Müller',assignedTo:'Rahul Mehta',lastActivity:'4 months ago',status:'waiting_csm',country:'Germany',clientEmail:'hannah.muller@example.com',startedAt:'Feb 26, 2026 | 09:30 AM',linkedTickets:['TCK-1298']}
];

/* ══ RECORDS BEHIND THE DASHBOARD ROWS ═════════════════════════════════════
   Every clickable row on a dashboard opens ITS record (dashOpenRecord), so
   every row needs a record to open. These are the ones the dashboards named
   but the listings never held. They are ordinary records — they show in the
   listings and count in the totals like any other.
   Ids are fixed because index.html links each row to one. */
(function(){
  const L=function(id,name,empId,type,from,to,hours,desc,status,sub,applied){
    return {id:id,empId:empId,name:name,leaveId:String(2041+id),leaveType:type,leaveFrom:from,leaveTo:to,leaveHours:hours,
      description:desc,email:name.toLowerCase().replace(/\s+/g,'.')+'@testemp.com',appliedDate:applied,createdBy:'Self',status:status,subStatus:sub};
  };
  allLeavesData.push(
    // Employee dashboard — the signed-in employee's own requests (empSelf, Meera Iyer).
    L(12,'Meera Iyer','CLOCLO11766','Casual Leave','22-05-2026','24-05-2026','Full Day','Short family trip.','Pending','Paid','15 May, 2026 10:05:00'),
    L(13,'Meera Iyer','CLOCLO11766','Sick Leave','10-04-2026','10-04-2026','Full Day','Down with a fever.','Approved','Paid','10 Apr, 2026 08:12:00'),
    L(14,'Meera Iyer','CLOCLO11766','Earned Leave','02-03-2026','06-03-2026','Full Day','Planned vacation, handover done.','Approved','Paid','20 Feb, 2026 17:40:00'),
    // HR dashboard — Leave Requests card.
    L(15,'Ramesh Patel','CLOCLO11767','Sick Leave','20-05-2026','20-05-2026','Full Day','Unwell, resting at home.','Pending','Unpaid','19 May, 2026 21:30:00'),
    L(16,'Priya Sharma','CLOCLO11768','Casual Leave','22-05-2026','22-05-2026','Full Day','Personal errand.','Approved','Paid','16 May, 2026 11:00:00'),
    L(17,'Aishi Verma','CLOCLO11769','Earned Leave','23-05-2026','25-05-2026','Full Day','Long weekend away.','Approved','Paid','12 May, 2026 15:20:00'),
    L(18,'Arjun Desai','CLOCLO11770','Sick Leave','28-05-2026','28-05-2026','Full Day','Doctor visit.','Pending','Unpaid','27 May, 2026 07:45:00')
  );

  /* Finance dashboards — entity invoices. Payments holds orders, so each
     invoice is an order whose order id is the invoice number. */
  const P=function(id,inv,entity,amt,date,status,country){
    const who=entity.replace(/[^A-Za-z ]/g,'').trim();
    return {id:id,orderId:inv,name:entity,amountDue:'INR '+amt+'.00',type:'Entity Invoice',orderStatus:'Active',invoiceStatus:status,
      key:inv,dealId:'—',entityName:entity,addedFrom:'billing',createdTime:date+' 2026 | 10:00 am',courseId:'—',courseName:'—',lastUpdated:'--',
      startFrom:date+' 2026',endTo:'—',workingCountry:country,orderCategory:'international',
      emp:{empId:'—',name:'—',email:'—',mobile:'—',status:'—',createdOn:'—'},
      sales:{companyId:'—',companyName:entity,contactPersonId:'—',contactPersonName:'Accounts Team',rateType:'Monthly',days:'0',rate:'INR '+amt+'.00',totalAmount:'INR '+amt+'.00',contractPeriod:'—',workLocation:country,tsPeriodDate:'—',paymentTerm:'30',paymentCycle:'Monthly',currency:'INR'},
      user:{company:{userId:'—',concernPersonName:'Accounts Team',companyName:entity,firstName:'Accounts',lastName:'Team',email:'accounts@'+who.toLowerCase().replace(/\s+/g,'')+'.com',mobile:'—',altMobile:'—',website:'—',address:'—'},
            concern:{key:'—',name:'Accounts Team',mobile:'—',email:'—',date:date+' 2026',createBy:'Billing',address:'—'}},
      attachments:[]};
  };
  paymentsData.push(
    P(3,'INV-2041','Dhi Hyperlocal','4,20,000','28 May','Unpaid','India'),
    P(4,'INV-2040','ADT Spain S.L.','2,10,000','22 May','Pending','Spain'),
    P(5,'INV-2039','ADT Singapore Pte.','6,10,000','25 May','Pending','Singapore'),
    P(6,'INV-2038','Dhi Hyperlocal','2,75,000','12 May','Paid','India'),
    P(7,'INV-2035','Dhi Hyperlocal','6,10,000','10 May','Unpaid','India'),
    P(8,'INV-2031','Dhi Hyperlocal','1,85,000','08 May','Paid','India'),
    P(9,'INV-2029','Dhi Hyperlocal','3,40,000','02 May','Paid','India'),
    P(10,'INV-2027','ADT Singapore Pte.','3,40,000','02 May','Paid','Singapore'),
    P(11,'INV-2024','Dhi Hyperlocal','5,25,000','25 Apr','Paid','India'),
    P(12,'INV-2021','ADT Spain S.L.','5,25,000','25 Apr','Paid','Spain'),
    P(13,'INV-2018','ADT Brazil Ltda.','1,60,000','20 Apr','Paid','Brazil')
  );

  // CSM dashboard — the one ticket it named that did not exist.
  ticketsData.push({id:18,ticketId:'TCK-1010',clientName:'Mark Lee',title:'Tax Registration',category:'Payroll',createdAt:'Jun 25, 2026',
    status:'in_progress',source:'portal',raisedBy:'Mark Lee',clientEmail:'mark.lee@example.com',clientPhone:'+49 30 000 0000',country:'Germany',
    assignedTo:'Pallavi Parate',description:'Waiting on the Tax ID before payroll can be registered.'});

  // CSM dashboard — Recent Chats.
  chatsData.push(
    {id:8,chatId:'CHAT-1046',clientName:'Thijs Verbeek',assignedTo:'Pallavi Parate',lastActivity:'2 days ago',status:'waiting_client',country:'Belgium',clientEmail:'thijs.verbeek@example.com',startedAt:'Jun 24, 2026 | 11:10 AM',linkedTickets:['TCK-1025']},
    {id:9,chatId:'CHAT-1047',clientName:'Alice Smith',assignedTo:'Neha Sharma',lastActivity:'1 week ago',status:'active',country:'Italy',clientEmail:'alice.smith@example.com',startedAt:'Jun 19, 2026 | 04:20 PM',linkedTickets:['TCK-1019']},
    {id:10,chatId:'CHAT-1048',clientName:'Mark Lee',assignedTo:'Rahul Mehta',lastActivity:'2 months ago',status:'inactive',country:'Germany',clientEmail:'mark.lee@example.com',startedAt:'Apr 22, 2026 | 10:00 AM',linkedTickets:['TCK-1010']},
    {id:11,chatId:'CHAT-1049',clientName:'John Doe',assignedTo:'Pallavi Parate',lastActivity:'2 months ago',status:'inactive',country:'Netherlands',clientEmail:'john.doe@example.com',startedAt:'Apr 20, 2026 | 02:15 PM',linkedTickets:[]}
  );

  /* Ops dashboard — Active Contracts. Cloned from a record of the same type so
     the detail panel has every field it reads, then made into this person. */
  const C=function(id,from,o){
    const base=JSON.parse(JSON.stringify(contractsData.find(function(c){return c.id===from;})));
    return Object.assign(base,{id:id,contractId:String(94160+id)},o);
  };
  contractsData.push(
    C(27,5,{empName:'Anika Shah',country:'Netherlands',countryOfOp:'Netherlands',type:'EOR',status:'Ready for Payroll',email:'anika@testemp.com'}),
    // A contractor's flow ends at Active, not Ready for Payroll (CT_FLOWS).
    C(28,26,{empName:'Rahul Mehta',country:'India',countryOfOp:'India',type:'Contractor',status:'Active',email:'rahul@testemp.com'}),
    C(29,8,{empName:'Owen Clark',country:'United Kingdom',countryOfOp:'United Kingdom',type:'EOR',status:'Contract Sent',email:'owen.clark@testemp.com'}),
    C(30,7,{empName:'Nora Kim',country:'Germany',countryOfOp:'Germany',type:'PEO',status:'Proposal Sent',email:'nora.kim@testemp.com'})
  );

  // Ops dashboard — Compliance Items.
  const K=function(id,item,cat,mand,country){
    return {id:id,country:country,item:item,model:'EOR',status:'Active',category:cat,createdBy:'Pritam Rai',createdAt:'02 Jun 2026 | 10:00:00 AM',
      mandatory:mand,payrollBlocking:mand,evidenceRequired:true,attachments:[],logs:[]};
  };
  complianceItemsData.push(
    K(10,'Employee KYC Review','Documents',true,'Netherlands'),
    K(11,'Work Authorization','Statutory',true,'Germany'),
    K(12,'Tax Registration','Payroll',true,'India'),
    K(13,'Policy Acknowledgement','Policy',false,'Netherlands'),
    K(14,'Statutory Filing Check','Entity',false,'Spain')
  );
  complianceNextId=15;
})();
let tkSelectedId=null,tkTab='basic-details';
let chatSelectedId=null,chatTab='basic-details';
/* ── Chat lifecycle ───────────────────────────────────────────────────────
   A chat status answers ONE question: who owes the next message. The Logs tab
   used to show a read-only timeline of two invented lines, so a CSM could read
   the history and do nothing with it — the only listing in the app whose Logs
   tab could not move the record it belonged to.

   The moves are deliberately few, because a conversation only really goes four
   ways: you reply, they reply, you close it, you reopen it. Each state lists
   the ones legal from it, so the form can never offer "client replied" on a
   chat that is already waiting on the CSM. */
const CHAT_FLOW={
  active:        {owner:function(c){return 'CSM · '+c.assignedTo;},
                  next:[{to:'waiting_client',label:'Replied — awaiting client'},
                        {to:'inactive',      label:'Close chat'}]},
  waiting_csm:   {owner:function(c){return 'CSM · '+c.assignedTo;},
                  next:[{to:'waiting_client',label:'Replied — awaiting client'},
                        {to:'inactive',      label:'Close chat'}]},
  waiting_client:{owner:function(c){return 'Client · '+c.clientName;},
                  next:[{to:'waiting_csm',   label:'Client replied — needs a response'},
                        {to:'inactive',      label:'Close chat'}]},
  inactive:      {owner:function(){return 'Nobody — chat closed';},
                  next:[{to:'active',        label:'Reopen chat'}]}
};
function chatOwner(c){const f=CHAT_FLOW[c&&c.status];return f?f.owner(c):'—';}
function chatMoves(c){const f=CHAT_FLOW[c&&c.status];return f?f.next:[];}
// Seeded per chat and then appended to, so a move made here survives the session.
const chatLogsData={};
let chatStatusFilter='all';
let profTab='basic-details';
// Uploaded profile documents: docName -> {file,size,date}. Seeded with the
// records the account already had on file.
let profAttachments={
  'Resume':{file:'Pallavi_Parate_Resume.pdf',size:'240 KB',date:'12 Jan 2024'},
  'Passport Photograph':{file:'passport_photo.jpg',size:'88 KB',date:'12 Jan 2024'},
  'PAN Card':{file:'pan_card.pdf',size:'156 KB',date:'14 Jan 2024'},
  'Aadhaar Card Front':{file:'aadhaar_front.jpg',size:'102 KB',date:'14 Jan 2024'},
  'Aadhaar Card Back':{file:'aadhaar_back.jpg',size:'97 KB',date:'14 Jan 2024'}
};
let seSelectedEntity='dhi-hyperlocal';
const entitiesData=[
  {id:'dhi-hyperlocal',initials:'DH',name:'Dhi Hyperlocal',entityId:'ENT-00421',type:'EOR Entity',country:'India',plan:'Enterprise',employees:142,active:true},
  {id:'closedhi',initials:'CL',name:'Closedhi',entityId:'ENT-00293',type:'PEO Entity',country:'India',plan:'Professional',employees:38,active:false}
];

// ── TIMESHEET STATE & DATA ──
/* WHAT A PLACE NAME MEANS. The attendance records store a place name on each
   day — "Hyderabad", "Remote" — which is enough to read but not enough to put
   a pin on. This is the lookup from that name to an address and a coordinate.
   It sits beside the attendance data rather than inside it because the office
   does not move: fifty punches at Hyderabad share one address, and copying it
   onto all fifty is fifty chances for them to disagree. */
const TS_PLACES={
  Hyderabad:{label:'Hyderabad Office',kind:'office',
    address:'Dhi Hyperlocal, HITEC City, Madhapur, Hyderabad 500081',
    streets:['HITEC CITY RD','CYBER TOWERS'],
    lat:17.4435,lng:78.3772},
  Remote:{label:'Remote — Work From Home',kind:'home',
    address:'Registered home address, Banjara Hills, Hyderabad 500034',
    streets:['ROAD NO. 12','BANJARA HILLS'],
    lat:17.4126,lng:78.4071}
};
/* A GPS FIX IS NEVER THE SAME POINT TWICE, so check-in and check-out sit a few
   metres apart and each carries its own accuracy. Both are DERIVED from the
   date and which punch it is rather than stored or randomised: a pin that
   wandered every time the panel repainted would be worse than no pin at all,
   and Math.random() would do exactly that. */
function tsPunchFix(placeKey,dateStr,which){
  const p=TS_PLACES[placeKey];
  if(!p)return null;
  let h=2166136261,s=dateStr+'|'+which;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  const dx=((h%2000)/1000)-1, dy=(((h>>>11)%2000)/1000)-1;   // -1 .. 1
  return {
    lat:p.lat+dy*0.0006,                 // roughly ±65 m
    lng:p.lng+dx*0.0006,
    accuracy:6+(h>>>22)%25,              // 6 .. 30 m
    place:p
  };
}
// Only one map at a time — the panel is too narrow to hold two.
let tsMapOpen='';
function tsToggleMap(which){tsMapOpen=tsMapOpen===which?'':which;renderADTPage();}
let tsSelectedDay=null;
let tsMonth={year:2026,month:5}; // 0-indexed (5=June)
let tsEmp={name:'Shaun Mathew',initials:'ST',role:'Entity Super Admin',empId:'11754'};
/* Every edit to a day's times, kept by date for the manager / HR who reviews
   it on All Timesheet → Requests (js/at-requests.js). prev is the record the
   edit replaced (null for a new entry), so a rejection can put it back. */
let tsChangeLog={
  '2026-06-18':{prev:{in:'09:30 AM',out:'06:00 PM',loc:'Hyderabad',hours:'8.50h',src:'Auto',status:'present'},
    in:'09:30 AM',out:'06:45 PM',hours:'9.25h',comment:'Clock-out was missed — left at 6:45 after the sprint review.',
    status:'Pending Approval',requestedAt:'19 Jun 2026, 09:14 AM'}
};
const tsAttendance={
  '2026-06-01':{in:'09:00 AM',out:'06:15 PM',loc:'Hyderabad',hours:'9.25h',src:'Auto',status:'present'},
  '2026-06-02':{in:'09:15 AM',out:'06:30 PM',loc:'Hyderabad',hours:'9.25h',src:'Manual',status:'present',desc:'Built the week-lock API endpoint and its unit tests.'},
  '2026-06-03':{in:'09:00 AM',out:'06:00 PM',loc:'Hyderabad',hours:'9.00h',src:'Auto',status:'present',desc:'Code review for the leave policy module; fixed two carry-forward edge cases.'},
  '2026-06-04':{in:'08:55 AM',out:'06:00 PM',loc:'Remote',hours:'9.08h',src:'Auto',status:'present'},
  '2026-06-05':{in:'09:30 AM',out:'07:00 PM',loc:'Hyderabad',hours:'9.50h',src:'Manual',status:'present'},
  '2026-06-09':{in:'09:10 AM',out:'06:20 PM',loc:'Hyderabad',hours:'9.17h',src:'Auto',status:'present'},
  '2026-06-10':{in:'09:00 AM',out:'06:00 PM',loc:'Hyderabad',hours:'9.00h',src:'Auto',status:'present',desc:'Designed the Work Description field with product.\nStarted on the API contract.'},
  '2026-06-11':{in:'09:45 AM',out:'06:30 PM',loc:'Hyderabad',hours:'8.75h',src:'Manual',status:'present'},
  '2026-06-12':{in:'09:00 AM',out:'06:00 PM',loc:'Hyderabad',hours:'9.00h',src:'Auto',status:'present'},
  '2026-06-13':{in:'10:00 AM',out:'04:00 PM',loc:'Hyderabad',hours:'6.00h',src:'Manual',status:'present',desc:'Saturday cover for the quarter-end payroll run.'},
  '2026-06-16':{in:'09:15 AM',out:'06:30 PM',loc:'Hyderabad',hours:'9.25h',src:'Auto',status:'present'},
  '2026-06-17':{in:'09:00 AM',out:'06:00 PM',loc:'Remote',hours:'9.00h',src:'Auto',status:'present'},
  '2026-06-18':{in:'09:30 AM',out:'06:45 PM',loc:'Hyderabad',hours:'9.25h',src:'Manual',status:'present'},
  '2026-06-19':{in:'09:00 AM',out:'06:15 PM',loc:'Hyderabad',hours:'9.25h',src:'Auto',status:'present'},
  '2026-06-20':{in:'09:10 AM',out:'05:50 PM',loc:'Hyderabad',hours:'8.67h',src:'Auto',status:'present'},
  '2026-06-23':{in:'09:10 AM',out:'06:00 PM',loc:'Hyderabad',hours:'8.83h',src:'Auto',status:'present'},
  '2026-06-24':{in:'09:02 AM',out:'06:10 PM',loc:'Hyderabad',hours:'9.13h',src:'Manual',status:'present'},
  '2026-06-25':{in:'09:00 AM',out:'06:05 PM',loc:'Hyderabad',hours:'9.08h',src:'Auto',status:'present'},
  '2026-06-26':{in:'09:05 AM',out:'06:00 PM',loc:'Remote',hours:'8.92h',src:'Auto',status:'present'},
  /* THE WEEK ACROSS THE MONTH EDGE: Mon 29 Jun – Sun 5 Jul. On Weekly billing
     it is one period — June's last row and July's first row are the same lock. */
  '2026-06-29':{in:'09:00 AM',out:'06:20 PM',loc:'Hyderabad',hours:'9.33h',src:'Auto',status:'present'},
  '2026-06-30':{in:'09:10 AM',out:'06:15 PM',loc:'Hyderabad',hours:'9.08h',src:'Auto',status:'present',desc:'Month-end close: reconciled June timesheets with the payroll export.'},
  '2026-07-01':{in:'09:00 AM',out:'06:00 PM',loc:'Hyderabad',hours:'9.00h',src:'Auto',status:'present'},
  '2026-07-02':{in:'09:40 AM',out:'06:30 PM',loc:'Hyderabad',hours:'8.83h',src:'Auto',status:'present'},
  '2026-07-03':{in:'09:00 AM',out:'07:15 PM',loc:'Remote',hours:'10.25h',src:'Manual',status:'present',desc:'Release prep for the July payroll cycle.'},
  // Today.
  '2026-07-06':{in:'09:02 AM',out:'--',loc:'Hyderabad',hours:'--',src:'Manual',status:'inprog'},
  /* Three absences. The fixture had none, so "Leave" was a term the legend
     named and the month could never show — and the Leaves Taken tile above it
     was a hard-coded 0 that no data could ever move. leaveStatus and pay are
     the leave request's own status / subStatus (allLeavesData), so the grid can
     say whether the day is still waiting on approval and whether it is paid. */
  '2026-06-08':{in:'--',out:'--',loc:'--',hours:'--',src:'Leave',status:'leave',leaveType:'Casual Leave',leaveStatus:'Approved',pay:'Paid'},
  '2026-06-15':{in:'--',out:'--',loc:'--',hours:'--',src:'Leave',status:'leave',leaveType:'Unpaid Leave',leaveStatus:'Approved',pay:'Unpaid'},
  '2026-06-22':{in:'--',out:'--',loc:'--',hours:'--',src:'Leave',status:'leave',leaveType:'Sick Leave',leaveStatus:'Pending',pay:'Paid'}
};
/* MAY 2026, A MONTH THAT IS OVER. June is the month in progress, so on its own
   the fixture had nothing that had passed its lock cutoff - no way to see an
   auto-locked week, or a whole month submitted on Monthly billing. May is
   filled the way a quiet month looks: every working day off the clock, one
   casual leave, and Labour Day (a holiday on the calendar) left empty. */
(function(){
  for(let d=4;d<=29;d++){
    const iso='2026-05-'+String(d).padStart(2,'0');
    const dow=new Date(2026,4,d).getDay();
    if(dow===0||dow===6)continue;
    tsAttendance[iso]=d===15
      ?{in:'--',out:'--',loc:'--',hours:'--',src:'Leave',status:'leave',leaveType:'Casual Leave',leaveStatus:'Approved',pay:'Paid'}
      :{in:'09:00 AM',out:'06:00 PM',loc:d%5?'Hyderabad':'Remote',hours:'9.00h',src:'Auto',status:'present'};
  }
})();
function tsOpenDay(d){tsSelectedDay=d;tsMapOpen='';tsEdit=null;renderADTPage();}
function tsCloseDay(){tsSelectedDay=null;tsMapOpen='';tsEdit=null;renderADTPage();}

/* ══ FILLING THE TIMESHEET IN ═══════════════════════════════════════════════
   The month grid could be read and nothing else: every punch on it came from
   the clock, a day the clock missed stayed "Absent" for good, and the Submit
   button at the foot of the page was wired to nothing. A timesheet you cannot
   correct is not a timesheet, it is a report.

   Three things go on top of it, and they are one idea:

     · ENTER a day by hand — clock-in, clock-out, where — for any day of the
       month being shown that has already happened.
     · EDIT a day that already has times, on the same form. A record that came
       off the clock and one typed in are the same shape; only src differs,
       and the grid has always labelled that.
     · LOCK a week, which is what makes the first two stop. A locked week is
       the employee saying "this week is final"; only then can it be submitted
       for approval, and until it is submitted it can be unlocked again.

   THE WEEK IS THE UNIT OF LOCKING. That is the whole reason lock exists:
   approval is a claim about a settled set of days, and a set that can still
   change underneath the approver is not settled. So submit is only ever
   offered on a week that is locked, and locking is only offered on a week
   whose days are all behind it.

   WHAT "A WEEK" IS DEPENDS ON HOW THE ORDER IS BILLED - the Payment Cycle on
   the Sales Order's Sales Details (tsCycle):
     · Weekly billing - the whole Monday-Sunday week, keyed by its Monday. A
       week that runs 29 Jun - 5 Jul is ONE period: June's last row and July's
       first row are two views of the same lock, never two invoices.
     · Monthly billing - the part of a week that falls inside the month. June's
       last row (29-30 Jun) locks on its own on 30 Jun, without taking 1-5 Jul
       with it, and the month is submitted whole.
   Either way each month's grid only ever draws its own dates.

   A WEEK LOCKS ITSELF if nobody does. TS_AUTOLOCK_DAYS after its last day the
   cutoff passes and the week reads Locked (Auto) - derived from the date, not
   stored, so there is no job that can fail to run. Locking by hand is the
   early version of the same thing.

   TODAY IS FIXED IN THIS PROTOTYPE. The grid's data is June 2026, so "today"
   is a constant rather than a live clock - otherwise every day of the fixture
   month would read as the future and none of it could be edited. */
const TS_TODAY='2026-07-06';   // Mon — the first week of July is behind it
/* A day's Work Description - what was done, in the employee's words. Optional,
   stored on the attendance record as `desc` beside the times, and capped so a
   day stays a summary rather than a report. */
const TS_DESC_MAX=500;
/* The required Comment on a hand edit — why the day's times are being added or
   changed. It travels with the Time Change request to the approver. */
const TS_COMMENT_MAX=255;
const TS_AUTOLOCK_DAYS=3;
/* Who may take a lock off (and put it back). The employee locks their own
   week; only these roles can reopen one - the rest of the app's RBAC, applied
   to the header's "Logged in as". */
let tsEdit=null;            // {date} while the day panel is in edit mode
/* unit key -> 'locked' | 'unlocked' | 'submitted' | 'approved' | 'rejected'.
   No entry = open, or locked by the cutoff once it has passed. Unit keys are
   'YYYY-MM-W<n>' on Monthly billing and 'W:<monday>' on Weekly. */
let tsWeekState={};
let tsWeekMeta={};          // unit key -> {sub, reason} for the panel and rail
let tsReadOnly=false;       // true while looking at somebody else's timesheet
let tsSel={};               // Weekly billing: locked weeks ticked for submission
let tsPerSel={};            // Biweekly / Semi-Monthly / Monthly: billing periods ticked, by key

// ── Billing cycle: read off the Sales Order this timesheet bills against ──
const TS_ORDER_ID=1;
function tsOrder(){return paymentsData.find(function(p){return p.id===TS_ORDER_ID;})||null;}
/* THE FOUR PAYMENT CYCLES. Two lock whole Monday-Sunday weeks (Weekly,
   Biweekly); two lock the part of each week inside the month (Semi-Monthly,
   Monthly). What differs is the BILLING PERIOD the locked weeks are sent in:
     Weekly        each week on its own
     Biweekly      fixed pairs of weeks, counted from TS_BIWEEK_ANCHOR
     Semi-Monthly  1–15 and 16–month-end; a week across the 15th is billed by
                   date — its days to the 15th in the first half, the rest in
                   the second
     Monthly       the calendar month */
const TS_CYCLES=[
  {v:'Weekly',d:'Every 7 days'},
  {v:'Biweekly',d:'Every 14 days'},
  {v:'Semi-Monthly',d:'Twice per month, e.g. 1–15 and 16–month-end'},
  {v:'Monthly',d:'Once per calendar month'}
];
// The Monday every fortnight is counted from, so periods never drift.
const TS_BIWEEK_ANCHOR='2026-01-05';
const TS_CYCLE_HINTS={};TS_CYCLES.forEach(function(c){TS_CYCLE_HINTS[c.v]=c.d;});
function tsCycleOf(v){return TS_CYCLES.some(function(c){return c.v===v;})?v:'Monthly';}
function tsCycleDesc(v){const c=TS_CYCLES.find(function(x){return x.v===v;});return c?c.d:'';}
function tsCycle(){const o=tsOrder();return tsCycleOf(o&&o.sales&&o.sales.paymentCycle);}
// Weekly and Biweekly lock the full seven days, keyed by the Monday.
function tsWeekBased(c){c=c||tsCycle();return c==='Weekly'||c==='Biweekly';}
function tsCanUnlock(){return typeof emsCan==='function'&&emsCan('time.timesheet.unlock');}

function tsIso(d){return d.getFullYear()+'-'+tsPad(d.getMonth()+1)+'-'+tsPad(d.getDate());}
function tsAddDays(iso,n){const p=iso.split('-');return tsIso(new Date(+p[0],+p[1]-1,+p[2]+n));}

// Monday-based, and worked out exactly the way the grid lays its rows out, so
// "Week 3" in the rail and week 3 here are always the same seven days.
function tsMonOff(y,m){const dow=new Date(y,m,1).getDay();return dow===0?6:dow-1;}
function tsWeekCount(y,m){return Math.ceil((tsMonOff(y,m)+new Date(y,m+1,0).getDate())/7);}
function tsWeekDates(y,m,w){
  const off=tsMonOff(y,m),dim=new Date(y,m+1,0).getDate(),out=[];
  for(let c=0;c<7;c++){
    const dn=(w-1)*7+c+1-off;
    if(dn>=1&&dn<=dim)out.push(y+'-'+tsPad(m+1)+'-'+tsPad(dn));
  }
  return out;
}
function tsWeekOf(dateStr){
  const p=dateStr.split('-'),y=+p[0],m=+p[1]-1,d=+p[2];
  return Math.floor((tsMonOff(y,m)+d-1)/7)+1;
}
function tsWeekKey(y,m,w){return y+'-'+tsPad(m+1)+'-W'+w;}
function tsWeekMonday(y,m,w){return tsIso(new Date(y,m,1-tsMonOff(y,m)+(w-1)*7));}
/* The lock unit behind row w of month m - see the note above. `dates` is every
   day the lock covers, which on Weekly billing can reach into the next or the
   previous month. */
function tsUnit(y,m,w){
  if(tsWeekBased()){
    const mon=tsWeekMonday(y,m,w),dates=[];
    for(let i=0;i<7;i++)dates.push(tsAddDays(mon,i));
    return {key:'W:'+mon,dates:dates,y:y,m:m,w:w};
  }
  return {key:tsWeekKey(y,m,w),dates:tsWeekDates(y,m,w),y:y,m:m,w:w};
}
function tsUnitOf(dateStr){const p=dateStr.split('-');return tsUnit(+p[0],+p[1]-1,tsWeekOf(dateStr));}
function tsUnitCutoff(u){return tsAddDays(u.dates[u.dates.length-1],TS_AUTOLOCK_DAYS);}
function tsUnitAuto(u){return !tsWeekState[u.key]&&TS_TODAY>tsUnitCutoff(u);}
function tsUnitStatus(u){return tsWeekState[u.key]||(TS_TODAY>tsUnitCutoff(u)?'locked':'open');}
// Days can be changed only in these; every other status is read-only.
const TS_EDITABLE={open:1,unlocked:1,rejected:1};
function tsWeekStatus(y,m,w){return tsUnitStatus(tsUnit(y,m,w));}
/* Lockable once every day it covers has happened - the month's own days on
   Monthly billing, the full seven on Weekly. Earlier than that there are days
   still to be worked; later, the cutoff has done it already. */
function tsWeekStartable(y,m,w){
  return tsUnit(y,m,w).dates.every(function(d){return d<=TS_TODAY;});
}
function tsDayLocked(dateStr){return !TS_EDITABLE[tsUnitStatus(tsUnitOf(dateStr))];}
// "29 Jun – 5 Jul" for a unit, used wherever a week has to name its days.
function tsUnitRange(u){
  const f=function(d){const p=d.split('-');return (+p[2])+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1];};
  return f(u.dates[0])+' – '+f(u.dates[u.dates.length-1]);
}
/* SEQUENTIAL LOCKING. A week cannot be locked for the first time while an
   earlier one is still open: an approver would otherwise be asked to sign off
   week 4 with week 3 still moving. Checks the month's earlier rows and the
   last row of the month before; returns the first that is not locked. */
/* ── A small blocking dialog for the timesheet ──
   For a rule the user must deal with before going on (a toast slides away
   while they are still reading it). One message, Cancel, and - where there is
   one - the action that resolves it. */
let tsDialogFn=null;
function tsDialog(o){
  tsDialogClose(true);
  tsDialogFn=o.primary?o.primary.fn:null;
  const ico=o.tone==='warn'
    ?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
    :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  const el=document.createElement('div');
  el.id='ts-dlg';el.className='ts-dlg-ov';
  el.setAttribute('onclick','tsDialogClose()');
  el.innerHTML='<div class="ts-dlg" role="alertdialog" aria-modal="true" aria-labelledby="ts-dlg-t" aria-describedby="ts-dlg-d" onclick="event.stopPropagation()">'
    +'<span class="ts-dlg-ico is-'+(o.tone||'info')+'">'+ico+'</span>'
    +'<h3 id="ts-dlg-t">'+o.title+'</h3>'
    +'<p id="ts-dlg-d">'+o.text+'</p>'
    +'<div class="ts-dlg-btns">'
      +(o.primary?'<button class="ep-cancel-btn" onclick="tsDialogClose()">Cancel</button>'
        +'<button class="ep-save-btn" id="ts-dlg-go" onclick="tsDialogGo()">'+o.primary.label+'</button>'
        :'<button class="ep-save-btn" id="ts-dlg-go" onclick="tsDialogClose()">Got it</button>')
    +'</div></div>';
  document.body.appendChild(el);
  requestAnimationFrame(function(){el.classList.add('is-shown');const b=document.getElementById('ts-dlg-go');if(b)b.focus();});
}
function tsDialogGo(){const fn=tsDialogFn;tsDialogClose(true);if(fn)fn();}
function tsDialogClose(now){
  const el=document.getElementById('ts-dlg');tsDialogFn=null;
  if(!el)return;
  if(now){el.remove();return;}
  el.classList.remove('is-shown');setTimeout(function(){el.remove();},180);
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('ts-dlg'))tsDialogClose();});
function tsEarlierOpen(y,m,w){
  const mNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const cur=tsUnit(y,m,w).key,seen={};seen[cur]=1;
  const check=[];
  const py=m===0?y-1:y,pm=m===0?11:m-1;
  for(let i=tsWeekCount(py,pm);i>=1&&check.length<1;i--){
    const u=tsUnit(py,pm,i);if(!seen[u.key])check.push(u);
  }
  for(let i=1;i<w;i++)check.push(tsUnit(y,m,i));
  for(let i=0;i<check.length;i++){
    const u=check[i];
    if(seen[u.key])continue;seen[u.key]=1;
    const st=tsUnitStatus(u);
    if(TS_EDITABLE[st])return {label:'Week '+u.w+' of '+mNames[u.m],range:tsUnitRange(u),state:st==='open'?'open':st,y:u.y,m:u.m,w:u.w};
  }
  return null;
}
/* One rule, asked in every place that offers a control: this month, not the
   future, not inside a locked week, and not somebody else's sheet. */
function tsDayEditable(dateStr){
  if(tsReadOnly)return false;
  const p=dateStr.split('-');
  if(+p[0]!==tsMonth.year||+p[1]-1!==tsMonth.month)return false;
  if(dateStr>TS_TODAY)return false;
  return !tsDayLocked(dateStr);
}

// ── Times in, times out ───────────────────────────────────────────────────
// The records read '09:05 AM'; <input type="time"> speaks '09:05'. Two
// conversions in one place, so no caller has to know both formats.
function tsTo24(t){
  if(!t||t==='--')return '';
  /* \d and \s, not d and s. The backslashes had been lost, so this matched the
     literal letters and tsTo24 returned '' for every real time — which is why
     Edit entry opened with two blank time fields on a day that already had
     09:45 AM on it. */
  const m=/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t).trim());
  if(!m)return '';
  let h=(+m[1])%12;
  if(/pm/i.test(m[3]))h+=12;
  return tsPad(h)+':'+m[2];
}
function tsTo12(v){
  if(!v)return '--';
  const p=String(v).split(':'),h=+p[0];
  return tsPad(h%12||12)+':'+p[1]+' '+(h>=12?'PM':'AM');
}
function tsMins(v){const p=String(v).split(':');return (+p[0])*60+(+p[1]);}
function tsFmtDay(dateStr){
  const mS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const p=dateStr.split('-');
  return (+p[2])+' '+mS[+p[1]-1]+' '+p[0];
}
function tsStartEdit(dateStr){
  if(!tsDayEditable(dateStr))return;
  /* HOURS ON A CLOSED DAY ARE CLAIMED, NOT TYPED. A weekly off or a holiday is
     a day the entity has said nobody is working, so times entered against it
     are an assertion someone has to approve — which is what the attendance
     request is for. Letting Add entry write them directly would be a way round
     that approval, so the door is shut here as well as in the panel: this is
     the only function that opens the editor, whatever calls it. */
  if(typeof arNonWorkingDay==='function'&&arNonWorkingDay(dateStr)){
    if(typeof arOpen==='function')arOpen(dateStr);
    return;
  }
  tsEdit={date:dateStr};tsMapOpen='';renderADTPage();
  // A day with nothing written yet opens on the description - the times are
  // usually already right, the words are what is missing.
  const desc=document.getElementById('ts-ed-desc');
  if(desc&&!desc.value)desc.focus();
}
function tsCancelEdit(){tsEdit=null;renderADTPage();}
// The description's "N / 500", written straight into the node for the same
// reason as tsEditPreview: a repaint per keystroke would take the focus away.
function tsCommentCount(){
  const t=document.getElementById('ts-ed-comment'),c=document.getElementById('ts-ed-comment-count');
  if(t&&c)c.textContent=t.value.length+' / '+TS_COMMENT_MAX;
  if(t&&t.value.trim())t.classList.remove('is-bad');
}
function tsDescCount(){
  const t=document.getElementById('ts-ed-desc'),c=document.getElementById('ts-ed-count');
  if(t&&c)c.textContent=t.value.length+' / '+TS_DESC_MAX;
}
/* The running total under the two fields, updated straight into the node. The
   rest of this page repaints through renderADTPage(), which would be wrong
   here: a repaint on every keystroke would take the focus out of the field
   being typed into. Nothing else on the page depends on a half-entered time,
   so nothing else needs to know about it yet. */
function tsEditPreview(){
  const el=document.getElementById('ts-ed-total');if(!el)return;
  const i=document.getElementById('ts-ed-in'),o=document.getElementById('ts-ed-out');
  const iv=i?i.value:'',ov=o?o.value:'';
  const mins=(iv&&ov)?tsMins(ov)-tsMins(iv):0;
  el.textContent=mins>0?(mins/60).toFixed(2)+'h':'0.00h';
  const err=document.getElementById('ts-ed-err');
  if(err&&iv&&ov&&mins>0)err.classList.remove('is-on');
}
function tsSaveEntry(){
  const date=tsEdit&&tsEdit.date;if(!date)return;
  // Re-checked at the moment of saving, not only when the form was opened: the
  // week could have been locked from the grid behind the panel.
  if(!tsDayEditable(date)){
    tsEdit=null;renderADTPage();
    showToast('Week is locked','info','Week '+tsWeekOf(date)+' is read-only. HR or a manager can unlock it for correction.');
    return;
  }
  const inEl=document.getElementById('ts-ed-in');
  const outEl=document.getElementById('ts-ed-out');
  const locEl=document.querySelector('[data-csid="ts-ed-loc"] .cs-value');
  const locLbl=locEl?locEl.textContent:'';
  const locKey=Object.keys(TS_PLACES).find(function(k){return TS_PLACES[k].label===locLbl;});
  const iv=inEl?inEl.value:'',ov=outEl?outEl.value:'';
  const fail=function(msg){
    const e=document.getElementById('ts-ed-err');
    if(e){e.textContent=msg;e.classList.add('is-on');}
    return false;
  };
  if(!iv||!ov)return fail('Enter both a clock-in and a clock-out time.');
  const mins=tsMins(ov)-tsMins(iv);
  // No overnight shifts: a record here carries one date, so a clock-out before
  // the clock-in would silently belong to a day this row cannot represent.
  if(mins<=0)return fail('Clock-out has to be later than clock-in.');
  const had=tsAttendance[date]&&tsAttendance[date].status==='present';
  const descEl=document.getElementById('ts-ed-desc');
  const desc=descEl?descEl.value.trim().slice(0,TS_DESC_MAX):'';
  // Required: the approver reads this to decide the change.
  const cmEl=document.getElementById('ts-ed-comment');
  const comment=cmEl?cmEl.value.trim().slice(0,TS_COMMENT_MAX):'';
  if(!comment){if(cmEl){cmEl.classList.add('is-bad');cmEl.focus();}return fail('Add a comment saying why you are changing this entry.');}
  // Logged for review. A change still waiting keeps the record it first
  // replaced, so rejecting it goes back to the original and not to a draft.
  const pendingPrev=tsChangeLog[date]&&tsChangeLog[date].status==='Pending Approval';
  const prevRec=pendingPrev?tsChangeLog[date].prev
    :(tsAttendance[date]&&tsAttendance[date].status==='present'?Object.assign({},tsAttendance[date]):null);
  tsChangeLog[date]={prev:prevRec,in:tsTo12(iv),out:tsTo12(ov),hours:(mins/60).toFixed(2)+'h',desc:desc,comment:comment,
    status:'Pending Approval',requestedAt:(typeof arNowLabel==='function'?arNowLabel():'')};
  tsAttendance[date]={
    in:tsTo12(iv),out:tsTo12(ov),
    loc:locKey||'Hyderabad',
    hours:(mins/60).toFixed(2)+'h',
    src:'Manual',                       // typed in, and the grid says so
    status:'present',
    desc:desc                           // optional; never blocks the save
  };
  tsEdit=null;
  // A change is an attendance correction: it goes through the same approval,
  // and the approvers are told under the header bell.
  const told=typeof atReqNotify==='function'
    ?atReqNotify(tsEmp.empId,'ch:'+date,'change',date,typeof AR_MANUAL_APPROVER!=='undefined'?AR_MANUAL_APPROVER:'HR / Manager',desc):[];
  renderADTPage();
  showToast(had?'Entry updated':'Entry added','success',
    tsFmtDay(date)+' · '+(mins/60).toFixed(2)+'h logged'+(desc?' · description saved':'')+(told.length?' · sent for approval, '+told.join(' & ')+' notified':'')+'.');
}

// ── Locking, unlocking, submitting ────────────────────────────────────────
/* A working day that has passed with nothing on it - no hours, no leave. Lock
   and submit both allow them (the employee may simply not have worked) but
   name them, because a gap nobody meant to leave is the one thing lock makes
   expensive to fix. */
function tsUnitMissing(u){
  return u.dates.filter(function(d){
    if(d>TS_TODAY)return false;
    if(typeof arNonWorkingDay==='function'){if(arNonWorkingDay(d))return false;}
    else{const dow=new Date(d+'T00:00:00').getDay();if(dow===0||dow===6)return false;}
    const a=tsAttendance[d];
    return !a||(a.status!=='present'&&a.status!=='leave'&&a.status!=='inprog');
  });
}
function tsLockWeek(w){
  const y=tsMonth.year,m=tsMonth.month,u=tsUnit(y,m,w),st=tsUnitStatus(u);
  if(!TS_EDITABLE[st])return;
  // Open -> Locked is the employee's first lock. Unlocked / Rejected -> Locked
  // is a re-lock after a correction, which HR or a manager may also do from
  // the employee's sheet.
  const relock=st!=='open';
  if(tsReadOnly&&!(relock&&tsCanUnlock())){
    showToast('Lock not available','error','Only the employee locks their own week. HR or a manager can re-lock a week they unlocked.');
    return;
  }
  if(!tsWeekStartable(y,m,w)){
    showToast('Week '+w+' is not over yet','info','It can be locked after '+tsFmtDay(u.dates[u.dates.length-1])
      +'. Left alone, it locks automatically after '+tsFmtDay(tsUnitCutoff(u))+'.');
    return;
  }
  if(!relock){
    const gap=tsEarlierOpen(y,m,w);
    if(gap){
      // A rule the employee has to act on, so it is a dialog that stays put -
      // and, when the earlier week is on screen, offers to lock it right here.
      const here=gap.y===y&&gap.m===m;
      tsDialog({tone:'warn',
        title:'Lock '+gap.label+' first',
        text:'<b>'+gap.label+'</b> ('+gap.range+') is still <b>'+gap.state+'</b>. Weeks are locked in order, so lock it before Week '+w+'.',
        primary:here?{label:(gap.state==='open'?'Lock':'Re-lock')+' Week '+gap.w,fn:function(){tsLockWeek(gap.w);}}:null});
      return;
    }
  }
  tsWeekState[u.key]='locked';
  tsEdit=null;tsSelectedDay=null;
  renderADTPage();
  const gaps=tsUnitMissing(u).length;
  const resend=!!(tsWeekMeta[u.key]&&tsWeekMeta[u.key].sub);
  showToast('Week '+w+(relock?' re-locked':' locked'),'success',gaps
    ?gaps+' working day'+(gaps===1?'':'s')+' with no hours. HR or a manager can unlock it if '+(gaps===1?'it needs':'they need')+' filling in.'
    :resend?'Read-only again. Tick it in the week column to resubmit just this week.'
    :'Read-only now, and ready to be submitted.');
}
function tsUnlockWeek(w){
  if(!tsCanUnlock()){
    showToast('Unlock not available','error','Only HR, a Manager, Admin, Opendhi Admin or Super Admin can unlock a week.');
    return;
  }
  const y=tsMonth.year,m=tsMonth.month,u=tsUnit(y,m,w),st=tsUnitStatus(u);
  if(st!=='locked'){
    showToast('Week '+w+' cannot be unlocked','error',st==='submitted'
      ?'It is waiting on approval - an approver can reject it to send it back.'
      :'It has been approved and is billed from.');
    return;
  }
  tsWeekState[u.key]='unlocked';
  delete tsSel[u.key];tsPerSel={};
  renderADTPage();
  showToast('Week '+w+' unlocked for correction','info','Its days can be edited. Re-lock it once the correction is made.');
}

// ── Submitting ────────────────────────────────────────────────────────────
function tsMonthUnits(y,m){const out=[];for(let w=1;w<=tsWeekCount(y,m);w++)out.push(tsUnit(y,m,w));return out;}
function tsUnitSent(u){return !!(tsWeekMeta[u.key]&&tsWeekMeta[u.key].sub);}
/* What the rail offers a tick on. Weekly billing: any locked week - each is
   its own period. Every other cycle sends whole billing periods (picked in the
   footer), so the only week ticked on its own is one sent back and corrected
   (it rejoins its period without the rest being sent again). */
function tsUnitPickable(u){
  if(tsReadOnly||tsUnitStatus(u)!=='locked')return false;
  return tsCycle()==='Weekly'||tsUnitSent(u);
}
/* ── Billing periods (every cycle but Weekly) ──
   The periods that touch month m, each with the lock units it is made of:
     Monthly       one, the month
     Semi-Monthly  two, 1–15 and 16–end (a row across the 15th is in both)
     Biweekly      every fortnight overlapping the month — one can begin in the
                   month before or end in the month after */
const TS_MON3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function tsDayLbl(iso){const p=iso.split('-');return (+p[2])+' '+TS_MON3[+p[1]-1];}
function tsPeriodsInMonth(y,m){
  const c=tsCycle(),mm=tsPad(m+1),last=new Date(y,m+1,0).getDate();
  const first=y+'-'+mm+'-01',end=y+'-'+mm+'-'+tsPad(last);
  const rows=function(from,to){
    const out=[];
    for(let w=1;w<=tsWeekCount(y,m);w++){const u=tsUnit(y,m,w);if(u.dates[0]<=to&&u.dates[u.dates.length-1]>=from)out.push(u);}
    return out;
  };
  if(c==='Monthly')return [{key:'M:'+y+'-'+mm,from:first,to:end,label:'Entire Month',units:rows(first,end)}];
  if(c==='Semi-Monthly'){
    const mid=y+'-'+mm+'-15',nxt=y+'-'+mm+'-16';
    return [{key:'S:'+y+'-'+mm+'-1',from:first,to:mid,label:'1 – 15 '+TS_MON3[m],units:rows(first,mid)},
            {key:'S:'+y+'-'+mm+'-2',from:nxt,to:end,label:'16 – '+last+' '+TS_MON3[m],units:rows(nxt,end)}];
  }
  if(c==='Biweekly'){
    const out=[];
    const span=Math.round((new Date(first)-new Date(TS_BIWEEK_ANCHOR))/86400000);
    let start=tsAddDays(TS_BIWEEK_ANCHOR,Math.floor(span/14)*14);
    while(start<=end){
      const stop=tsAddDays(start,13);
      const units=[0,7].map(function(o){const mon=tsAddDays(start,o),dates=[];for(let i=0;i<7;i++)dates.push(tsAddDays(mon,i));
        const p=mon.split('-');return {key:'W:'+mon,dates:dates,y:+p[0],m:+p[1]-1,w:tsWeekOf(mon)};});
      out.push({key:'B:'+start,from:start,to:stop,label:tsDayLbl(start)+' – '+tsDayLbl(stop),units:units});
      start=tsAddDays(start,14);
    }
    return out;
  }
  return [];
}
/* Can this period be ticked? Its weeks not yet sent must all be locked, and
   there must be at least one. A week already sent with the half before (the
   row across the 15th) simply does not go again. Returns the reason when not —
   it is what the disabled box says. */
function tsPeriodCheck(per){
  const fresh=per.units.filter(function(u){return !tsUnitSent(u);});
  if(!fresh.length)return {ok:false,units:[],reason:per.label+' has already been submitted. A week sent back is resubmitted from its week column.'};
  const notLocked=fresh.filter(function(u){return tsUnitStatus(u)!=='locked';});
  if(notLocked.length)return {ok:false,units:fresh,
    reason:notLocked.map(function(u){return tsUnitRange(u);}).join(', ')+(notLocked.length===1?' is':' are')+' not locked yet.'};
  return {ok:true,units:fresh,reason:''};
}
function tsToggleSel(key,y,m,w){
  if(tsSel[key])delete tsSel[key];else tsSel[key]={y:y,m:m,w:w};
  renderADTPage();
}
/* Select all: every week of the month that has a tick of its own (locked and
   pickable). With all of them ticked already, it clears them instead. */
function tsPickableWeeks(){
  const y=tsMonth.year,m=tsMonth.month,out=[];
  if(typeof tsReadOnly!=='undefined'&&tsReadOnly)return out;
  for(let w=1;w<=tsWeekCount(y,m);w++){
    const u=tsUnit(y,m,w);
    if(tsUnitStatus(u)==='locked'&&tsUnitPickable(u))out.push({key:u.key,y:y,m:m,w:w});
  }
  return out;
}
function tsToggleAllWeeks(){
  const list=tsPickableWeeks();
  const all=list.length&&list.every(function(p){return tsSel[p.key];});
  list.forEach(function(p){if(all)delete tsSel[p.key];else tsSel[p.key]={y:p.y,m:p.m,w:p.w};});
  renderADTPage();
}
function tsTogglePeriodSel(key){
  const per=tsPeriodsInMonth(tsMonth.year,tsMonth.month).find(function(p){return p.key===key;});if(!per)return;
  const c=tsPeriodCheck(per);
  if(!c.ok){delete tsPerSel[key];renderADTPage();showToast(per.label+' cannot be selected yet','info',c.reason);return;}
  if(tsPerSel[key])delete tsPerSel[key];else tsPerSel[key]=1;
  renderADTPage();
}
// Why a locked week still cannot go to an approver, or '' when it can.
function tsUnitBlock(u){
  const last=u.dates[u.dates.length-1];
  if(last>TS_TODAY)return 'it runs to '+tsFmtDay(last)+', which has not happened yet';
  const ip=u.dates.filter(function(d){return tsAttendance[d]&&tsAttendance[d].status==='inprog';});
  if(ip.length)return tsFmtDay(ip[0])+' has no clock-out';
  return '';
}
/* The footer button. Weekly billing sends each ticked week as its own period;
   every other cycle sends each ticked billing period as one submission (plus
   any corrected week ticked on its own). Submissions, approval and invoicing
   live in js/ts-billing.js. */
function tsSubmitLockedWeeks(){
  if(tsReadOnly)return;
  const y=tsMonth.year,m=tsMonth.month,cyc=tsCycle(),periodic=cyc!=='Weekly';
  const batches=[];
  if(periodic){
    const pers=tsPeriodsInMonth(y,m).filter(function(p){return tsPerSel[p.key];});
    for(let i=0;i<pers.length;i++){
      const c=tsPeriodCheck(pers[i]);
      if(!c.ok){delete tsPerSel[pers[i].key];renderADTPage();showToast('Submission blocked','error',c.reason);return;}
      batches.push({kind:cyc,units:c.units,period:pers[i].key});
    }
  }
  Object.keys(tsSel).forEach(function(k){
    const s=tsSel[k],u=tsUnit(s.y,s.m,s.w);
    if(tsUnitPickable(u))batches.push({kind:tsUnitSent(u)?'Resubmission':'Weekly',units:[u]});
  });
  if(!batches.length){
    showToast('Nothing selected','info',periodic
      ?'Tick a billing period in the footer once its weeks are locked.'
      :'Tick a locked week in the week column to submit it.');
    return;
  }
  for(let i=0;i<batches.length;i++){
    for(let j=0;j<batches[i].units.length;j++){
      const u=batches[i].units[j],why=tsUnitBlock(u);
      if(why){showToast('Submission blocked','error','Week '+u.w+' ('+tsUnitRange(u)+'): '+why+'.');return;}
    }
  }
  const missing=[];
  batches.forEach(function(b){b.units.forEach(function(u){tsUnitMissing(u).forEach(function(d){missing.push(d);});});});
  const ids=batches.map(function(b){return tsbSubmit(b.kind,b.units,b.period);});
  tsSel={};tsPerSel={};
  renderADTPage();
  const o=tsOrder();
  showToast(ids.length===1?'Submitted for approval':ids.length+' submissions sent','success',
    ids.join(', ')+(o?' · on Sales Order #'+o.orderId:'')
    +(missing.length?' · '+missing.length+' working day'+(missing.length===1?'':'s')+' with no hours went as 0h.':'.'));
}

// ── TIMESHEET MONTH PICKER ──
let tsMpOpen=false;
let tsMpYear=tsMonth.year;
/* Opening, closing or paging the year changes NOTHING on the page behind the
   panel, so none of the three repaints it. They used to call renderADTPage(),
   which rebuilt the timesheet - tabs, stat tiles and the whole month grid - to
   add two nodes inside .ts-month-wrap. That is what made clicking the month
   button look like the page was reloading.

   Picking a month is the other case and still repaints: tsMonth and tsRange
   both move, so the grid and the stat tiles genuinely have to be rebuilt.

   The helper returns false when the wrap is not on screen (a repaint is mid
   flight, or the page changed underneath us); the callers fall back to a full
   render so the flag can never end up disagreeing with the DOM. */
function tsSyncMonthPicker(){
  const wrap=document.querySelector('.ts-month-wrap');
  if(!wrap)return false;
  wrap.querySelectorAll('.ts-mp-overlay,.ts-mp-panel').forEach(function(n){n.remove();});
  if(tsMpOpen)wrap.insertAdjacentHTML('beforeend',buildTsMonthPickerHTML());
  return true;
}
function tsToggleMonthPicker(ev){if(ev)ev.stopPropagation();tsMpOpen=!tsMpOpen;tsMpYear=tsMonth.year;if(!tsSyncMonthPicker())renderADTPage();}
function tsCloseMonthPicker(){if(!tsMpOpen)return;tsMpOpen=false;if(!tsSyncMonthPicker())renderADTPage();}
function tsMpNavYear(delta,ev){if(ev)ev.stopPropagation();tsMpYear+=delta;if(!tsSyncMonthPicker())renderADTPage();}
// Picking a month re-spans the range to that month, so the filter label and the
// grid can never disagree about which dates are in view.
function tsMpSelectMonth(monthIdx,ev){if(ev)ev.stopPropagation();tsMonth={year:tsMpYear,month:monthIdx};tsPerSel={};tsMpOpen=false;tsSelectedDay=null;tsRange=tsMonthSpan(tsMpYear,monthIdx);renderADTPage();}
// "This month" is the month TS_TODAY falls in.
function tsMpThisMonth(ev){if(ev)ev.stopPropagation();const t=TS_TODAY.split('-'),ty=+t[0],tm=+t[1]-1;tsMonth={year:ty,month:tm};tsPerSel={};tsMpOpen=false;tsSelectedDay=null;tsRange=tsMonthSpan(ty,tm);renderADTPage();}

// ── TIMESHEET DATE-RANGE FILTER ──
// The range control used to call tsToggleMonthPicker, so clicking a field
// labelled "1 Jun – 30 Jun" opened a month list anchored to a different button
// on the far side of the bar. It now owns a range picker, and the range it
// produces actually filters the grid and the stat tiles.
function tsPad(n){return String(n).padStart(2,'0');}
function tsMonthSpan(y,m){
  return {from:y+'-'+tsPad(m+1)+'-01', to:y+'-'+tsPad(m+1)+'-'+tsPad(new Date(y,m+1,0).getDate())};
}
let tsRange=tsMonthSpan(tsMonth.year,tsMonth.month);
let tsRangeOpen=false;
let tsRangeDraft={from:tsRange.from,to:tsRange.to};
function tsToggleRangePicker(ev){
  if(ev)ev.stopPropagation();
  tsRangeOpen=!tsRangeOpen;
  if(tsRangeOpen){tsMpOpen=false;tsRangeDraft={from:tsRange.from,to:tsRange.to};}
  renderADTPage();
}
function tsCloseRangePicker(){if(!tsRangeOpen)return;tsRangeOpen=false;renderADTPage();}
function tsRangeDraftSet(which,val){tsRangeDraft[which]=val;renderADTPage();}
/* apCD's onpick hook passes only the value, so one named wrapper per field.
   They must be reachable as window.<name> — function declarations in a classic
   script are, which is why these are declarations and not consts. */
function tsRangeFrom(v){tsRangeDraftSet('from',v);}
function tsRangeTo(v){tsRangeDraftSet('to',v);}
function tsRangePreset(kind,ev){
  if(ev)ev.stopPropagation();
  const y=tsMonth.year,m=tsMonth.month;
  if(kind==='month')tsRangeDraft=tsMonthSpan(y,m);
  else if(kind==='first-half')tsRangeDraft={from:y+'-'+tsPad(m+1)+'-01',to:y+'-'+tsPad(m+1)+'-15'};
  else if(kind==='second-half')tsRangeDraft={from:y+'-'+tsPad(m+1)+'-16',to:tsMonthSpan(y,m).to};
  renderADTPage();
}
function tsApplyRange(ev){
  if(ev)ev.stopPropagation();
  let {from,to}=tsRangeDraft;
  if(!from||!to)return;
  if(from>to){const t=from;from=to;to=t;}   // tolerate a backwards range
  tsRange={from:from,to:to};
  const d=from.split('-');
  tsMonth={year:+d[0],month:+d[1]-1};        // show the month the range starts in
  tsRangeOpen=false;tsSelectedDay=null;
  renderADTPage();
}
function tsResetRange(){tsRange=tsMonthSpan(tsMonth.year,tsMonth.month);tsRangeOpen=false;tsSelectedDay=null;}
function tsInRange(dateStr){return dateStr>=tsRange.from&&dateStr<=tsRange.to;}
function tsFmtRange(){
  const mS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const f=d=>{const p=d.split('-');return (+p[2])+' '+mS[+p[1]-1]+' '+p[0];};
  return f(tsRange.from)+' – '+f(tsRange.to);
}

// ── ALL TIMESHEET DATA & ACTIONS ──
const allTsData=[
  {id:1,empId:'11803',name:'Antar Malhotra',country:'-',empStatus:'Active',tsStatus:'Unfilled',role:'Employer of Record',initials:'AM'},
  {id:2,empId:'11755',name:'Shaun J',country:'-',empStatus:'Active',tsStatus:'Unfilled',role:'Direct Employee',initials:'SJ'},
  {id:3,empId:'11754',name:'Shaun Mathew',country:'-',empStatus:'Active',tsStatus:'Unfilled',role:'Entity Super Admin',initials:'ST'}
];
/* ── All Timesheet: the row's detail panel ────────────────────────────────
   Two tabs, because a row on this page raises exactly two questions about the
   person: what have they filed, and what have they been paid. Both are
   per-employee-per-month lists, which is why they are keyed by employee id and
   read against the month the page is filtered to rather than carrying a date
   of their own.

   An employee with nothing filed is the NORMAL case on this page — the whole
   point of the Unfilled count above the table — so both lists are written to
   have a real empty state rather than being seeded with rows that would make
   "Unfilled" look like a lie. */
let atSelectedId=null,atTab='timesheet';
/* The month the page is filtered to. Held as state rather than read off the
   dropdown, because the dropdown is rebuilt on every repaint and used to snap
   back to its default — the panel, the Salary tab and the payslip all read it.
   Defaults to the first month with no payslips on file yet. */
const AT_DEFAULT_MONTH='Sep';
let atMonth=AT_DEFAULT_MONTH;
const atSheetsData={
  // 11803 has nothing yet — this is the row the Unfilled tile is counting.
  '11755':[
    {sheetId:'TS-4417',start:'2026-08-01',end:'2026-08-07',created:'01 Aug 2026 09:12 AM',status:'Approved'},
    {sheetId:'TS-4426',start:'2026-08-08',end:'2026-08-14',created:'08 Aug 2026 09:04 AM',status:'Approved'},
    {sheetId:'TS-4435',start:'2026-08-15',end:'2026-08-21',created:'15 Aug 2026 10:31 AM',status:'Submitted'},
    {sheetId:'TS-4444',start:'2026-08-22',end:'2026-08-28',created:'22 Aug 2026 09:47 AM',status:'Draft'}
  ],
  '11754':[
    {sheetId:'TS-4418',start:'2026-08-01',end:'2026-08-07',created:'01 Aug 2026 08:55 AM',status:'Approved'},
    {sheetId:'TS-4427',start:'2026-08-08',end:'2026-08-14',created:'08 Aug 2026 09:20 AM',status:'Rejected'},
    {sheetId:'TS-4436',start:'2026-08-15',end:'2026-08-21',created:'15 Aug 2026 09:02 AM',status:'Submitted'}
  ]
};
// Newest first, and capped at six by atPayslips() — the panel says so in words
// rather than quietly truncating a list the user thinks is complete.
const atPayslipsData={
  '11755':[
    {name:'Payslip_Aug_2026.pdf',size:'186 KB',month:'Aug-2026'},
    {name:'Payslip_Jul_2026.pdf',size:'184 KB',month:'Jul-2026'},
    {name:'Payslip_Jun_2026.pdf',size:'181 KB',month:'Jun-2026'},
    {name:'Payslip_May_2026.pdf',size:'180 KB',month:'May-2026'},
    {name:'Payslip_Apr_2026.pdf',size:'179 KB',month:'Apr-2026'},
    {name:'Payslip_Mar_2026.pdf',size:'177 KB',month:'Mar-2026'},
    {name:'Payslip_Feb_2026.pdf',size:'176 KB',month:'Feb-2026'}
  ],
  '11754':[
    {name:'Payslip_Aug_2026.pdf',size:'192 KB',month:'Aug-2026'},
    {name:'Payslip_Jul_2026.pdf',size:'190 KB',month:'Jul-2026'},
    {name:'Payslip_Jun_2026.pdf',size:'188 KB',month:'Jun-2026'}
  ]
};
const AT_PAYSLIP_LIMIT=6;
function atEmp(id){return allTsData.find(function(e){return e.empId===id;})||null;}
function atSheets(id){return atSheetsData[id]||[];}
function atPayslips(id){return (atPayslipsData[id]||[]).slice(0,AT_PAYSLIP_LIMIT);}

let atViewedEmp=null;
function atViewCalendar(empId,name,initials,role){
  atViewedEmp={name:name,initials:initials,role:role||'Employee'};
  tsSelectedDay=null;
  tsMpOpen=false;
  page='at-timesheet-view';
  renderADTPage();
}
function atBackToAllTimesheet(){
  atViewedEmp=null;
  tsSubTab='all';
  page='timesheet';
  renderADTPage();
}

// ── COMPANY SETTINGS STATE & DATA ──
let csTab='basic-details';
let csStructureTab='branch';
let csSelectedItem=null;
// Company settings workflow - a single company profile, so a flat list.
const csWorkflowData=[
  {title:'Settings Updated',user:'Shaun Mathew',date:'22 Apr 2026',time:'05:44:07 PM',description:'Company profile updated and re-verified.'},
  {title:'Payroll Configured',user:'Admin',date:'14 Apr 2026',time:'11:28:08 PM',description:'Payroll cycle, leave policy and attendance rules configured.'},
  {title:'Banking Details Added',user:'Admin',date:'14 Apr 2026',time:'11:02:44 PM',description:'Company bank account added and pending verification.'},
  {title:'Company Created',user:'Admin',date:'10 Apr 2026',time:'09:00:00 AM',description:'Company record created and entity workspace provisioned.'}
];
const csLogsData=[
  {date:'22 Apr 2026',time:'05:44:07 PM',user:'Shaun Mathew',status:'Active',action:'Hvj'},
  {date:'14 Apr 2026',time:'11:28:08 PM',user:'Shaun Mathew',status:'Pending',action:'Yes'},
  {date:'14 Apr 2026',time:'11:02:44 PM',user:'Shaun Mathew',status:'Active',action:'Yes'}
];
/* Company Settings was the last page still answering a row click with a full
   renderADTPage(): the filter bar, the counters, the table and the panel were
   all thrown away and rebuilt to show a different record in a panel that was
   already open. Everything visible flinched, the entrance animations replayed,
   and any scroll position in the table was lost. Now it behaves like every
   other listing - the row highlight moves by hand, and isbTab() replaces the
   panel BODY alone, because a different record is the same tab strip. */
function openCsSidebar(item){
  if(csSelectedItem!=null&&csSelectedItem!==item&&sbLeaveGuard('cs',function(){openCsSidebar(item);}))return;
  if(csSelectedItem===item){closeCsSidebar();return;}   // clicking the open row closes it again
  csTab=sbKeepTab(csSelectedItem,csTab);csSelectedItem=item;
  const sb=document.getElementById('cs-isb');if(sb)sb.classList.add('open');
  markCsSelectedRow();
  isbTab('cs',renderCsSidebar);
}
function closeCsSidebar(){if(sbLeaveGuard('cs',closeCsSidebar))return;
  csSelectedItem=null;
  const sb=document.getElementById('cs-isb');if(sb)sb.classList.remove('open');
  markCsSelectedRow();
  /* The body is left in place on purpose - clearing it here would blank the
     panel instantly and the closing width transition would animate nothing. */
}
function markCsSelectedRow(){
  document.querySelectorAll('#adt-content tr.lp-row[data-row-id]').forEach(function(r){
    r.classList.toggle('lp-row-selected',csSelectedItem!=null&&r.dataset.rowId===String(csSelectedItem));
  });
}
function refreshCsSidebar(){const inner=document.getElementById('cs-isb-inner');if(inner){inner.innerHTML=renderCsSidebar();isbRevealTab('cs');}}
function csSetTab(tab){
  /* The settings tabs keep their form in a draft: read it in before leaving,
     so a changed form comes back as it was; an untouched one just closes. */
  if(typeof csAttEdit!=='undefined'&&csAttEdit){if(document.getElementById('csa-mode'))csAttReadForm();if(!csAttDirty){csAttEdit=false;csAttDraft=null;}}
  if(typeof csLeaveEdit!=='undefined'&&csLeaveEdit){if(document.getElementById('csl-freq'))cslReadForm();if(!csLeaveDirty){csLeaveEdit=false;csLeaveDraft=null;}}
  csTab=tab;isbTab('cs',renderCsSidebar);
}
/* The structure sub-tab lives inside the body, so the body swap covers it. */
function csSetStructureTab(tab){csStructureTab=tab;isbTab('cs',renderCsSidebar);}
function csSaveLog(){
  const sel=csTrigger('cs-log-status-sel');
  const inp=document.getElementById('cs-log-comment-inp');
  if(!sel||!inp)return;
  const status=getCSValue('cs-log-status-sel');
  const comment=inp.value.trim();
  if(!status){sel.style.borderColor='#b83a3a';setTimeout(()=>{sel.style.borderColor='';},1500);return;}
  if(!comment){inp.style.borderColor='#b83a3a';setTimeout(()=>{inp.style.borderColor='';},1500);return;}
  const now=new Date();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr=now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear();
  const h=now.getHours(),mm=now.getMinutes(),ss=now.getSeconds();
  const timeStr=(h%12||12)+':'+(mm<10?'0'+mm:mm)+':'+(ss<10?'0'+ss:ss)+' '+(h>=12?'PM':'AM');
  csLogsData.unshift({date:dateStr,time:timeStr,user:'Shaun Mathew',status,action:comment});
  refreshCsSidebar();
  showToast('Log added','success','Comment saved with status "'+status+'".');
}
