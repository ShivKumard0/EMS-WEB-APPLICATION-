/* ══ GOVERNANCE → ANNOUNCEMENTS ═══════════════════════════════════════════
   Where HR and managers WRITE what the employee dashboard's Announcements
   panel READS (js/announcements.js). One store, annData, is the record; the
   dashboard's empAnnouncements is rebuilt from it by anmSync(), so a post
   created, pinned, scheduled or switched off here is what employees see.

   Built from the app's standard parts, so it behaves like every listing:
     · listing  — lp filter bar, count tiles that double as filters, lp-table
     · panel    — lp-split-sb with Basic Details / Logs / History
                  (no Workflow tab — an announcement has no approval
                  stages; Logs and History cover what happened to it);
                  sbHero header with Edit
     · form     — .ct-modal--form (shown as a page by js/form-page.js)

   ONE STATE COLUMN in the listing: Visibility. Live, Scheduled and Expired
   all mean Status = Active and Inactive means Inactive, so a second Status
   column would repeat it. The panel shows both.

   THE RULES THIS FILE ENFORCES (FR-05.x):
     · Title, Message, Category, Target Audience and Valid From are required;
       Valid To is optional.
     · VISIBLE ⇔ Active AND now ≥ Valid From AND (no Valid To OR now ≤ Valid
       To) AND the reader is in the Target Audience. Nothing else decides it,
       and the listing's Live / Scheduled / Expired column is this same test.
     · No Valid To = visible until somebody makes it Inactive.
     · Pinned posts sort first — but only among posts that pass the test above;
       pinning never makes something visible.
     · Created By / Created Date & Time / Last Updated By / Last Updated Date
       & Time are stamped by the save, never typed. */

// ── Vocabulary ──
const ANM_CATS=['General','HR Update','Holiday','Payroll','Leave & Attendance','Policy','Compliance','Benefits','Training','Event','Portal Update'];
/* Who an announcement is for: everyone, or the people who match the groups
   picked. Four kinds of group - Department, Branch, Employment Type, Role.
   Within one kind it is OR (Engineering or HR); across kinds it is AND
   (…and at Hyderabad, and Full-time). A kind left untouched means "any", so
   "Engineering" alone is every Engineering employee wherever they sit.
   Every group is read off the employee record, so the form can say how many
   people a choice reaches. */
const ANM_AUD_ALL='All Employees',ANM_AUD_PICK='Specific Groups';
function anmPeople(){
  return (typeof directEmpData!=='undefined'?directEmpData:[]).filter(function(e){return e.status!=='Inactive';});
}
function anmUniq(k){
  const seen={};
  anmPeople().forEach(function(e){if(e[k])seen[e[k]]=1;});
  return Object.keys(seen).sort();
}
// The record says "Full time employee" / "Contract employee"; the title says who manages.
function anmEmpType(e){const d=String(e.desc||'').toLowerCase();return d.indexOf('contract')>=0?'Contract':d.indexOf('intern')>=0?'Intern':'Full-time';}
function anmEmpRole(e){return /manager|lead|head|director/i.test(e.jobTitle||'')?'Managers':'Team Members';}
const ANM_DIMS=[
  {k:'depts',   label:'Department',     any:'Any department',     opts:function(){return anmUniq('dept');},  of:function(e){return e.dept;}},
  {k:'branches',label:'Branch',         any:'Any branch',         opts:function(){return anmUniq('branch');},of:function(e){return e.branch;}},
  {k:'types',   label:'Employment Type',any:'Any employment type',opts:function(){return ['Full-time','Contract','Intern'];},of:anmEmpType},
  {k:'roles',   label:'Role',           any:'Any role',           opts:function(){return ['Managers','Team Members'];},of:anmEmpRole}
];
function anmAudBlank(){const o={};ANM_DIMS.forEach(function(d){o[d.k]=[];});return o;}
// The signed-in employee as the dashboard sees them — what the audience test reads.
const ANM_ME={dept:'Engineering',branch:'Hyderabad',desc:'Full time employee',jobTitle:'Software Engineer'};
const ANM_TITLE_MAX=120,ANM_MSG_MAX=1000;
const ANM_STATE_TONE={Live:'ok',Scheduled:'wait',Expired:'idle',Inactive:'idle'};

// ── The store ──
let anmSeq=9;
const annData=[
  {id:1,annId:'ANN-1001',title:'Diwali holiday announced',category:'Holiday',audType:'All Employees',audValues:[],
   message:'The office will remain closed on 8 Nov for Diwali. Please plan your deliverables and update your timesheets before the break.',
   validFrom:'2026-10-12T09:30',validTo:'2026-11-09T23:59',pinned:true,status:'Active',from:'hr',
   createdBy:'Priya Sharma',createdAt:'12 Oct 2026 | 09:24:10 AM',updatedBy:'Priya Sharma',updatedAt:'12 Oct 2026 | 09:24:10 AM'},
  {id:2,annId:'ANN-1002',title:'Sprint planning moved to Thursday',category:'General',audType:'Department',audValues:['Engineering'],
   message:'This week’s sprint planning is moving to Thursday at 11:00 AM. Bring your estimates for the open tickets on the board.',
   validFrom:'2026-10-11T16:10',validTo:'',pinned:false,status:'Active',from:'manager',
   createdBy:'Rajan Kumar',createdAt:'11 Oct 2026 | 04:08:42 PM',updatedBy:'Rajan Kumar',updatedAt:'11 Oct 2026 | 04:08:42 PM'},
  {id:3,annId:'ANN-1003',title:'Updated leave policy for 2027',category:'Policy',audType:'All Employees',audValues:[],
   message:'We’ve revised the carry-forward rules for earned leave. Read the updated policy under Leave Policies before the end of the quarter.',
   validFrom:'2026-10-09T11:00',validTo:'2026-12-31T23:59',pinned:false,status:'Active',from:'hr',
   createdBy:'Priya Sharma',createdAt:'09 Oct 2026 | 10:52:03 AM',updatedBy:'Shaun Mathew',updatedAt:'14 Oct 2026 | 02:15:37 PM'},
  {id:4,annId:'ANN-1004',title:'Great work on the October release',category:'General',audType:'Department',audValues:['Engineering'],
   message:'Thanks, everyone, for the push on the October release — it shipped on time with zero rollbacks. Team lunch is on Friday at 1:00 PM.',
   validFrom:'2026-10-07T18:20',validTo:'',pinned:false,status:'Active',from:'manager',
   createdBy:'Rajan Kumar',createdAt:'07 Oct 2026 | 06:18:11 PM',updatedBy:'Rajan Kumar',updatedAt:'07 Oct 2026 | 06:18:11 PM'},
  {id:5,annId:'ANN-1005',title:'Annual health check-up camp',category:'Benefits',audType:'Branch',audValues:['Hyderabad'],
   message:'A free health check-up camp will be held in the Hyderabad office on 20 Oct. Register through the HR desk by 17 Oct to book your slot.',
   validFrom:'2026-10-05T10:00',validTo:'2026-10-20T18:00',pinned:false,status:'Active',from:'hr',
   createdBy:'Priya Sharma',createdAt:'05 Oct 2026 | 09:41:56 AM',updatedBy:'Priya Sharma',updatedAt:'05 Oct 2026 | 09:41:56 AM'},
  {id:6,annId:'ANN-1006',title:'Complete your annual POSH training',category:'Compliance',audType:'All Employees',audValues:[],
   message:'The annual POSH awareness module is now open on the learning portal. It takes about 40 minutes and must be completed by 15 Nov.',
   validFrom:'2026-10-20T09:00',validTo:'2026-11-15T23:59',pinned:true,status:'Active',from:'hr',
   createdBy:'Shaun Mathew',createdAt:'19 Oct 2026 | 05:02:44 PM',updatedBy:'Shaun Mathew',updatedAt:'19 Oct 2026 | 05:02:44 PM'},
  {id:7,annId:'ANN-1007',title:'November payroll cut-off',category:'Payroll',audType:'All Employees',audValues:[],
   message:'Timesheets and reimbursement claims for November must be submitted by 20 Nov, 6:00 PM. Anything after the cut-off moves to the December run.',
   validFrom:'2026-11-12T09:00',validTo:'2026-11-21T09:00',pinned:false,status:'Active',from:'hr',
   createdBy:'Shaun Mathew',createdAt:'28 Oct 2026 | 11:30:19 AM',updatedBy:'Shaun Mathew',updatedAt:'28 Oct 2026 | 11:30:19 AM'},
  {id:8,annId:'ANN-1008',title:'Health insurance top-up enrolment opens',category:'Benefits',audType:'Employment Type',audValues:['Full-time'],
   message:'You can add parents or increase your sum insured for 2027. The enrolment window runs for two weeks; details are on the Benefits page.',
   validFrom:'2026-11-03T10:00',validTo:'2026-11-17T23:59',pinned:false,status:'Active',from:'hr',
   createdBy:'Priya Sharma',createdAt:'29 Oct 2026 | 03:47:02 PM',updatedBy:'Priya Sharma',updatedAt:'29 Oct 2026 | 03:47:02 PM'},
  {id:9,annId:'ANN-1009',title:'New expense portal goes live',category:'Portal Update',audType:'All Employees',audValues:[],
   message:'Expense claims are moving to the new portal. Drafted ahead of the rollout and held back until Finance confirms the go-live date.',
   validFrom:'2026-11-01T09:00',validTo:'',pinned:false,status:'Inactive',from:'hr',
   createdBy:'Shaun Mathew',createdAt:'26 Oct 2026 | 12:05:50 PM',updatedBy:'Shaun Mathew',updatedAt:'26 Oct 2026 | 12:05:50 PM'}
];

// ── Time ──
function anmPad(n){return String(n).padStart(2,'0');}
function anmParse(dt){
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(dt||'');
  return m?new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]):null;
}
function anmJoin(date,time){return date?date+'T'+(time||'00:00'):'';}
function anmFmt(dt){
  const d=anmParse(dt);if(!d)return '—';
  let h=d.getHours();const ap=h>=12?'PM':'AM';h=h%12||12;
  return d.getDate()+' '+CD_MON_SHORT[d.getMonth()]+' '+d.getFullYear()+', '+h+':'+anmPad(d.getMinutes())+' '+ap;
}
function anmStampNow(){const s=stampNow();return s.date+' | '+s.time;}
// "12 Oct 2026 | 09:24:10 AM" (the store's format, shared with Logs) read as "12 Oct 2026, 09:24 AM".
function anmStampText(v){return String(v||'—').replace(' | ',', ').replace(/(d{2}:d{2}):d{2}/,'$1');}

annData.forEach(function(a){
  if(a.depts)return;
  const was={'Department':'depts','Branch':'branches','Employment Type':'types','Role':'roles'}[a.audType];
  ANM_DIMS.forEach(function(d){a[d.k]=d.k===was?a.audValues.slice():[];});
  delete a.audType;delete a.audValues;
});
// ── The visibility test (FR-05.4), and the audience test ──
function anmState(a,now){
  if(a.status!=='Active')return 'Inactive';
  const t=(now||new Date()).getTime();
  const f=anmParse(a.validFrom),to=anmParse(a.validTo);
  if(f&&t<f.getTime())return 'Scheduled';
  if(to&&t>to.getTime())return 'Expired';
  return 'Live';
}
function anmIsAll(a){return ANM_DIMS.every(function(d){return !(a[d.k]||[]).length;});}
// "Engineering, HR · Hyderabad · Full-time" — only the groups that were picked.
function anmAudText(a){
  if(anmIsAll(a))return ANM_AUD_ALL;
  return ANM_DIMS.filter(function(d){return a[d.k].length;}).map(function(d){return a[d.k].join(', ');}).join(' · ');
}
function anmInAud(a,e){
  return ANM_DIMS.every(function(d){return !a[d.k].length||a[d.k].indexOf(d.of(e))>=0;});
}
function anmSeesMe(a){return anmIsAll(a)||anmInAud(a,ANM_ME);}
// How many employees a choice reaches, from the employee records.
function anmReach(a){
  return anmPeople().filter(function(e){return anmIsAll(a)||anmInAud(a,e);}).length;
}
function anmStateBadge(a){
  const st=anmState(a);
  return '<span class="lp-status-badge tone-'+ANM_STATE_TONE[st]+'">'+st+'</span>';
}

/* ── What the employee dashboard reads ──
   Rebuilt in place (the dashboard holds the array by reference): every post
   that passes the visibility and audience tests, pinned first, newest first. */
function anmSync(){
  if(typeof empAnnouncements==='undefined')return;
  const now=new Date();
  const vis=annData.filter(function(a){return anmState(a,now)==='Live'&&anmSeesMe(a);})
    .sort(function(a,b){return (b.pinned?1:0)-(a.pinned?1:0)||(anmParse(b.validFrom)-anmParse(a.validFrom));});
  empAnnouncements.length=0;
  vis.forEach(function(a){
    const f=anmParse(a.validFrom);
    empAnnouncements.push({src:a.id,from:a.from||'hr',author:a.createdBy,title:a.title,category:a.category,
      pinned:!!a.pinned,
      when:f.getFullYear()+'-'+anmPad(f.getMonth()+1)+'-'+anmPad(f.getDate())+'T'+anmPad(f.getHours())+':'+anmPad(f.getMinutes())+':00',
      text:a.message});
  });
}

// ══ LISTING ═══════════════════════════════════════════════════════════════
let anmSelectedId=null,anmTab='basic-details',anmModalOpen=false,anmEditId=null;
/* Editing happens in the panel's Basic Details tab, not on the create page:
   the record stays in view beside the list, the way Holidays edits. The
   create page (anmModalOpen) is for new announcements only. */
let anmEditMode=false;
let anmQ='',anmCatF='',anmAudF='',anmStatusF='',anmStateF='';
function anmRows(){
  return annData.filter(function(a){
    return (!anmCatF||a.category===anmCatF)&&(!anmAudF||(anmAudF===ANM_AUD_ALL)===anmIsAll(a))
      &&(!anmStatusF||a.status===anmStatusF)&&(!anmStateF||anmState(a)===anmStateF);
  }).sort(function(a,b){
    // Pinned first, then the most recent Valid From.
    return (b.pinned?1:0)-(a.pinned?1:0)||(anmParse(b.validFrom)-anmParse(a.validFrom));
  });
}
function anmToggleState(v){anmStateF=anmStateF===v?'':v;anmSelectedId=null;renderADTPage();}
function applyAnmFilters(){
  const c=getCSValue('anm-f-cat'),au=getCSValue('anm-f-aud'),s=getCSValue('anm-f-status');
  anmCatF=c&&c!=='All Categories'?c:'';
  anmAudF=au&&au!=='All Audiences'?au:'';
  anmStatusF=s&&s!=='All Statuses'?s:'';
  anmQ=lpSearchValue('anm-f-q');
  anmSelectedId=null;renderADTPage();
}
function resetAnmFilters(){anmQ='';anmCatF='';anmAudF='';anmStatusF='';anmStateF='';anmSelectedId=null;renderADTPage();}

function buildAnnouncementsHTML(){
  anmSync();
  const dotsIco='<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>';
  const count=function(st){return annData.filter(function(a){return anmState(a)===st;}).length;};
  const tile=function(st,color){
    return '<div class="listing-stat'+(anmStateF===st?' stat-selected':'')+'" onclick="anmToggleState(\''+st+'\')">'
      +'<div class="listing-stat-count" style="color:'+color+'">'+count(st)+'</div><div class="listing-stat-label">'+st+'</div></div>';
  };
  const rows=anmRows();
  if(anmSelectedId&&!rows.some(function(a){return a.id===anmSelectedId;}))anmSelectedId=null;
  const pgn=listPage('announcements',[anmQ,anmCatF,anmAudF,anmStatusF,anmStateF].join('|'),
    lpSearchRows(rows,anmQ).map(function(a,i){
      return '<tr class="anm-row'+(anmSelectedId===a.id?' lp-row-selected':'')+'" id="anm-row-'+a.id+'" style="cursor:pointer" onclick="openAnmSidebar('+a.id+')">'
        +'<td class="lp-c-n">'+(i+1)+'</td>'
        +'<td><div class="anm-cell-title">'
          +(a.pinned?'<span class="anm-pin" title="Pinned — shown first">'+ANN_PIN+'</span>':'')
          +'<span class="anm-cell-name">'+sbEsc(a.title)+'</span></div>'
          +'<div class="anm-cell-sub">'+a.annId+'</div></td>'
        +'<td style="white-space:nowrap">'+sbEsc(a.category)+'</td>'
        +'<td><span class="anm-aud'+(anmIsAll(a)?' is-all':'')+'" title="'+sbEsc(anmAudText(a))+'">'+sbEsc(anmAudText(a))+'</span></td>'
        // Valid From / To are on the panel's Basic Details.
        +'<td>'+anmStateBadge(a)+'</td>'
        +'<td onclick="event.stopPropagation()">'+rowLogCell('announcements',a.id)+'</td>'
        +'</tr>';
    }),'<tr><td colspan="6" style="padding:24px;text-align:center;color:var(--gray)">No announcements match this filter.</td></tr>');
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('anm-f-q',anmQ,'Search','applyAnmFilters()')
    +apCS('anm-f-cat',ANM_CATS,anmCatF,'All Categories')
    +apCS('anm-f-aud',[ANM_AUD_ALL,ANM_AUD_PICK],anmAudF,'All Audiences')
    +apCS('anm-f-status',['Active','Inactive'],anmStatusF,'All Statuses')
    +clearFiltersBtn([anmQ,anmCatF,anmAudF,anmStatusF,anmStateF],'resetAnmFilters()')
    +'<button class="lp-pill-search" onclick="applyAnmFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'
      +tile('Live','var(--st-ok-fg)')+tile('Scheduled','var(--st-wait-fg)')
      +tile('Expired','var(--st-idle-fg)')+tile('Inactive','var(--st-idle-fg)')
    +'</div></div>'
    +'<div class="lp-split-wrap" style="margin-top:14px" id="anm-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table" style="min-width:840px"><thead><tr><th>S. No</th><th>Announcement</th><th>Category</th><th>Target Audience</th>'
      +'<th>Visibility</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(anmSelectedId?' open':'')+'" id="anm-split-sb"><div class="lp-isb" id="anm-isb-inner">'+(anmSelectedId?sbRender(renderAnmSidebar,'anm'):'')+'</div></div>'
    +'</div></div>'
    +(anmModalOpen?buildAnmFormHTML():'');
}

// ══ DETAIL PANEL ══════════════════════════════════════════════════════════
const ANM_TABS=[{id:'basic-details',label:'Basic Details'},{id:'logs',label:'Logs'},{id:'history',label:'History'}];
function anmRec(id){return annData.find(function(a){return a.id===id;})||null;}
function openAnmSidebar(id,tab){
  if(anmSelectedId!=null&&anmSelectedId!==id&&sbLeaveGuard('anm',function(){openAnmSidebar(id,tab);}))return;
  anmTab=tab||sbKeepTab(anmSelectedId,anmTab);anmSelectedId=id;anmEditMode=false;anmEditId=null;
  const sb=document.getElementById('anm-split-sb');if(sb)sb.classList.add('open');
  const wrap=document.getElementById('anm-split-wrap');if(wrap)wrap.classList.add('has-sb');
  isbTab('anm',renderAnmSidebar);
  document.querySelectorAll('.anm-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='anm-row-'+id);});
}
function closeAnmSidebar(){
  if(sbLeaveGuard('anm',closeAnmSidebar))return;
  anmSelectedId=null;anmEditMode=false;anmEditId=null;
  const sb=document.getElementById('anm-split-sb');if(sb)sb.classList.remove('open');
  const wrap=document.getElementById('anm-split-wrap');if(wrap)wrap.classList.remove('has-sb');
  document.querySelectorAll('.anm-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navAnmTab(tab){
  anmTab=tab;
  // A half-done edit is stashed by isbTab and comes back with the tab.
  if(!sbHasDraft('anm')){anmEditMode=false;anmEditId=null;}
  isbTab('anm',renderAnmSidebar);
  if(anmEditMode&&tab==='basic-details')anmFormSync();
}

const ANM_ICO={
  megaphone:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.2v3.6a1 1 0 0 0 .8 1L15 17.5V6.5L3.8 9.2a1 1 0 0 0-.8 1z"/><path d="M6.5 14.9v2.6a2 2 0 0 0 4 0v-1.6"/><path d="M18 9.5a4 4 0 0 1 0 5"/><path d="M20.5 7.5a7 7 0 0 1 0 9"/></svg>',
  tag:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  users:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  start:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 15 11 17 15 13"/></svg>',
  end:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="10" y1="14" x2="14" y2="18"/><line x1="14" y1="14" x2="10" y2="18"/></svg>',
  pin:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>',
  user:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  clock:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  info:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  eye:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
};

function renderAnmSidebar(){
  const a=anmRec(anmSelectedId);if(!a)return '';
  const chevL='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>';
  const chevR='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
  const tabBar='<div class="lp-isb-tabbar">'
    +'<button class="lp-isb-nav-btn" onclick="scrollTabRow(\'left\',\'anm-isb-tabs\')" title="Scroll left">'+chevL+'</button>'
    +'<div class="lp-isb-tabs" id="anm-isb-tabs">'+ANM_TABS.map(function(t){
      return '<button class="lp-isb-tab'+(anmTab===t.id?' active':'')+'" onclick="navAnmTab(\''+t.id+'\')">'+t.label+'</button>';
    }).join('')+'</div>'
    +'<button class="lp-isb-nav-btn nav-right" onclick="scrollTabRow(\'right\',\'anm-isb-tabs\')" title="Scroll right">'+chevR+'</button>'
    +'<div class="lp-isb-right"><button class="lp-isb-close" onclick="closeAnmSidebar()" title="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    +'</div>';
  /* One header on every tab: what it is, its id and category, and both of
     its states — Visibility (what employees get) beside Status (the switch). */
  const hero=sbHero({icon:ANM_ICO.megaphone,name:sbEsc(a.title),
    meta:[a.annId,sbEsc(a.category),a.pinned?'Pinned':''],
    status:anmStateBadge(a)+'<span class="lp-status-badge tone-'+statusTone(a.status)+'">'+a.status+'</span>',
    editing:anmEditMode&&anmTab==='basic-details',onEdit:'anmStartEdit('+a.id+')'});
  const fc=function(ico,label,val,wide){
    return '<div class="lp-sb-field-card"'+(wide?' style="grid-column:1/-1"':'')+'><div class="lp-sb-field-icon">'+ico+'</div><div class="lp-sb-field-content"><div class="lp-sb-field-label">'+label+'</div><div class="lp-sb-field-value">'+val+'</div></div></div>';
  };
  let body='';
  if(anmTab==='basic-details'&&anmEditMode){
    body=hero+anmEditPanelHTML(a);
  }else if(anmTab==='basic-details'){
    body=hero
      +'<div class="anm-sec-title">Message</div>'
      +'<div class="anm-msg">'+sbEsc(a.message)+'</div>'
      +'<div class="anm-sec-title">Details</div>'
      +'<div class="lp-sb-detail-grid">'
        +fc(ANM_ICO.tag,'Category',sbEsc(a.category))
        +fc(ANM_ICO.users,'Target Audience',sbEsc(anmAudText(a)))
        +fc(ANM_ICO.start,'Valid From',anmFmt(a.validFrom))
        +fc(ANM_ICO.end,'Valid To',a.validTo?anmFmt(a.validTo):'<span style="color:var(--gray)">No end date</span>')
        +fc(ANM_ICO.pin,'Pin Announcement',a.pinned?'Yes — shown first':'No')
        +fc(ANM_ICO.eye,'Status',a.status)
      +'</div>'
      /* Stamped by the save, never typed — so they get their own block,
         visibly separate from the fields a person filled in. */
      +'<div class="anm-sec-title">Record</div>'
      +'<div class="lp-sb-detail-grid">'
        +fc(ANM_ICO.user,'Created By',sbEsc(a.createdBy))
        +fc(ANM_ICO.clock,'Created Date &amp; Time',sbEsc(anmStampText(a.createdAt)))
        +fc(ANM_ICO.user,'Last Updated By',sbEsc(a.updatedBy))
        +fc(ANM_ICO.clock,'Last Updated Date &amp; Time',sbEsc(anmStampText(a.updatedAt)))
      +'</div>';
  }else if(anmTab==='logs'){
    const logs=anmSeedLogs(a);
    const form='<div class="lp-logs-form">'
      +'<div class="lp-logs-form-header"><span class="lp-log-dot lp-log-dot--'+statusTone(a.status)+'"></span>'+a.status+'</div>'
      +'<p class="lp-logs-form-sub">Show or hide this announcement and say why</p>'
      +lpLogStatusField('anm-log-status-sel',a.status,['Active','Inactive'])
      +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
      +'<textarea class="lp-logs-form-textarea" id="anm-log-comment-inp" placeholder="Enter comment"></textarea>'
      +'<div style="display:flex;gap:10px;margin-top:12px">'
      +'<button class="ep-cancel-btn" style="flex:1" onclick="navAnmTab(\'logs\')">Cancel</button>'
      +'<button class="lp-logs-save-btn" style="flex:1" onclick="anmSaveLog('+a.id+')">Submit</button>'
      +'</div></div>';
    body=lpLogsView(logs,form);
  }else{
    body=sbHistoryHTML(a);
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}

// ── Logs ──
function anmSeedLogs(a){
  const p=String(a.createdAt).split(' | ');
  return seedLogs(a,[{date:p[0],time:p[1]||'09:00:00 AM',user:a.createdBy,status:a.status,
    action:'Announcement "'+a.title+'" created for '+anmAudText(a)+'.'}]);
}
function anmSaveLog(id){
  const a=anmRec(id);if(!a)return;
  anmSeedLogs(a);
  if(!lpCommitLog(a,'anm-log-status-sel','anm-log-comment-inp',a.logs))return;
  a.updatedBy=CURRENT_USER;a.updatedAt=anmStampNow();
  renderADTPage();
  showToast('Log added','success','"'+a.title+'" is now '+a.status+'.');
}

// ══ CREATE / EDIT FORM ════════════════════════════════════════════════════
let anmDraft=null;     // the audience being picked, held while the form is open
function anmStartCreate(){
  // The panel's edit form uses the same field ids, so it is closed first.
  anmEditId=null;anmEditMode=false;
  // Valid From starts at the current 5-minute mark, so "publish now" is the default.
  const n=new Date();n.setMinutes(Math.floor(n.getMinutes()/5)*5);
  anmDraft={mode:ANM_AUD_ALL,aud:anmAudBlank(),
    fromDate:n.getFullYear()+'-'+anmPad(n.getMonth()+1)+'-'+anmPad(n.getDate()),fromTime:anmPad(n.getHours())+':'+anmPad(n.getMinutes())};
  anmModalOpen=true;renderADTPage();anmFormSync();
}
function anmStartEdit(id){
  const a=anmRec(id);if(!a)return;
  anmEditId=id;anmEditMode=true;anmTab='basic-details';
  const aud=anmAudBlank();ANM_DIMS.forEach(function(d){aud[d.k]=(a[d.k]||[]).slice();});
  anmDraft={mode:anmIsAll(a)?ANM_AUD_ALL:ANM_AUD_PICK,aud:aud};
  isbTab('anm',renderAnmSidebar);anmFormSync();
}
function anmCancelEdit(){anmEditMode=false;anmEditId=null;anmDraft=null;isbTab('anm',renderAnmSidebar);}
function anmCloseForm(){anmModalOpen=false;anmEditId=null;anmDraft=null;renderADTPage();}

/* The same fields as the create page, laid out in the panel's own edit form
   (.lp-sb-edit-form, as Holidays uses) and keeping the same ids, so one
   reader (anmReadForm), one live line (anmFormSync) and one save serve both.
   Status is not on either form: a new announcement starts Active, and it
   moves from Logs, where the move carries a comment. */
function anmEditPanelHTML(a){
  const split=function(dt){const p=(dt||'').split('T');return {d:p[0]||'',t:p[1]||''};};
  const from=split(a.validFrom),to=split(a.validTo);
  const f=function(label,req,html,full){
    return '<div class="lp-sb-field"'+(full?' style="grid-column:1/-1"':'')+'><label>'+label
      +(req?' <span class="req">*</span>':' <span class="ep-optional">(optional)</span>')+'</label>'+html+'</div>';
  };
  return '<div class="lp-sb-edit-form anm-edit"><div class="lp-sb-edit-section"><div class="lp-sb-form-grid">'
    +f('Announcement Title',true,
      '<input type="text" class="ep-form-input" id="anm-title" maxlength="'+ANM_TITLE_MAX+'" value="'+sbEsc(a.title)+'" oninput="anmFormSync()">'
      +'<span class="anm-count" id="anm-title-n">'+a.title.length+' / '+ANM_TITLE_MAX+'</span>',true)
    +f('Message',true,
      '<textarea class="ep-form-input anm-ta" id="anm-msg" maxlength="'+ANM_MSG_MAX+'" oninput="anmFormSync()">'+sbEsc(a.message)+'</textarea>'
      +'<span class="anm-count" id="anm-msg-n">'+a.message.length+' / '+ANM_MSG_MAX+'</span>',true)
    +f('Category',true,apCS('anm-cat',ANM_CATS,a.category,'Select category'))
    +f('Target Audience',true,anmAudModeHTML()+anmReachBlockHTML(),true)
    +'<div class="lp-sb-field" style="grid-column:1/-1" id="anm-aud-vals"'+(anmDraft.mode===ANM_AUD_PICK?'':' hidden')+'>'+anmAudPickHTML()+'</div>'
    +f('Valid From Date &amp; Time',true,
      '<div class="anm-dt">'+apCD('anm-from-d',from.d,'Select date','anmFormSync')+tsTimeField('anm-from-t',from.t||'09:00')+'</div>')
    +f('Valid To Date &amp; Time',false,
      '<div class="anm-dt">'+apCD('anm-to-d',to.d,'No end date','anmFormSync')+tsTimeField('anm-to-t',to.t)+'</div>')
    +'<div class="lp-sb-field" style="grid-column:1/-1"><div class="anm-when" id="anm-when"></div></div>'
    +f('Pin Announcement',true,ciRadio('anm-pin',['No','Yes'],a.pinned?'Yes':'No'))
    +'</div>'
    +'<div class="lp-sb-form-actions">'
      +'<button class="ep-cancel-btn" onclick="anmCancelEdit()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="anmSubmit()">Save changes</button>'
    +'</div></div></div>';
}

/* Target Audience: the switch (everyone / specific groups), beside it one
   line saying who that reaches and how many, and - for specific groups - a
   panel with a row per kind of group. Each row's options are tick-chips, so
   what is picked is visible without opening anything; the row says "Any …"
   until something in it is ticked. */
function anmAudModeHTML(){
  const d=anmDraft||{mode:ANM_AUD_ALL};
  return '<div class="anm-aud-mode">'+ciRadio('anm-aud-mode',[ANM_AUD_ALL,ANM_AUD_PICK],d.mode,false,'anmAudModePicked()')+'</div>';
}
function anmReachBlockHTML(){
  const d=anmDraft;
  const none=!!(d&&d.mode===ANM_AUD_PICK&&!anmIsAll(d.aud)&&!anmReach(d.aud));
  return '<div class="anm-reach'+(none?' is-none':'')+'" id="anm-reach">'+anmReachHTML()+'</div>';
}
function anmAudPickHTML(){
  const d=anmDraft||{mode:ANM_AUD_ALL,aud:anmAudBlank()};
  if(d.mode!==ANM_AUD_PICK)return '';
  return '<div class="anm-aud-box">'
    +ANM_DIMS.map(function(dim){
      const sel=d.aud[dim.k];
      return '<div class="anm-aud-row">'
        +'<div class="anm-aud-lbl"><span>'+dim.label+'</span>'
          +'<span class="anm-aud-state'+(sel.length?' is-set':'')+'" id="anm-aud-st-'+dim.k+'">'+anmDimState(dim,sel)+'</span></div>'
        +'<div class="anm-chips">'+dim.opts().map(function(v){
          const on=sel.indexOf(v)>=0;
          return '<button type="button" class="anm-chip'+(on?' is-on':'')+'" aria-pressed="'+on+'" onclick="anmToggleAud(this,\''+dim.k+'\',\''+sbEsc(v)+'\')">'
            +'<span class="anm-chip-box"></span>'+sbEsc(v)+'</button>';
        }).join('')+'</div>'
      +'</div>';
    }).join('')
  +'</div>';
}
function anmDimState(dim,sel){return sel.length?sel.length+' selected':dim.any;}
// The live line beside the switch: who, in words, and how many.
function anmReachHTML(){
  const d=anmDraft;
  if(!d||d.mode!==ANM_AUD_PICK)
    return ANM_ICO.users+'<span>Everyone in the entity — <b>'+anmReach(anmAudBlank())+' employees</b>.</span>';
  if(anmIsAll(d.aud))
    return ANM_ICO.info+'<span>Tick at least one group below. A row left on “Any” includes all of it.</span>';
  const n=anmReach(d.aud);
  const who=ANM_DIMS.filter(function(x){return d.aud[x.k].length;}).map(function(x){return d.aud[x.k].join(' or ');}).join(' · ');
  return ANM_ICO.users+'<span>Reaches <b>'+n+' employee'+(n===1?'':'s')+'</b> — '+sbEsc(who)+'.'
    +(n?'':' <b class="anm-reach-none">Nobody matches this combination yet.</b>')+'</span>';
}
function anmAudModePicked(){
  if(!anmDraft)return;
  anmDraft.mode=ciPicked('anm-aud-mode',ANM_AUD_ALL);
  const box=document.getElementById('anm-aud-vals');
  if(box){box.innerHTML=anmAudPickHTML();box.hidden=anmDraft.mode!==ANM_AUD_PICK;}
  const r=document.getElementById('anm-reach');if(r)r.outerHTML=anmReachBlockHTML();
  anmFormSync();
}
function anmToggleAud(btn,k,v){
  if(!anmDraft)return;
  const sel=anmDraft.aud[k],i=sel.indexOf(v);
  if(i>=0)sel.splice(i,1);else sel.push(v);
  btn.classList.toggle('is-on',i<0);btn.setAttribute('aria-pressed',String(i<0));
  const dim=ANM_DIMS.find(function(x){return x.k===k;});
  const st=document.getElementById('anm-aud-st-'+k);
  if(st){st.textContent=anmDimState(dim,sel);st.classList.toggle('is-set',!!sel.length);}
  const r=document.getElementById('anm-reach');if(r)r.outerHTML=anmReachBlockHTML();
  anmFormSync();
}
// The time pickers (tsTimeField) report back through this hook.
function tsTpAfter(id){if(String(id).indexOf('anm-')===0)anmFormSync();}

// One kind of group from the draft — nothing when the audience is everyone.
function anmPicked(k){return anmDraft&&anmDraft.mode===ANM_AUD_PICK?anmDraft.aud[k].slice():[];}
// What the form would publish, read straight off the fields.
function anmReadForm(){
  const v=function(id){const el=document.getElementById(id);return el?el.value:'';};
  return {
    title:v('anm-title').trim(),message:v('anm-msg').trim(),category:getCSValue('anm-cat'),
    depts:anmPicked('depts'),branches:anmPicked('branches'),types:anmPicked('types'),roles:anmPicked('roles'),
    audMode:anmDraft?anmDraft.mode:ANM_AUD_ALL,
    validFrom:anmJoin(getCDValue('anm-from-d'),v('anm-from-t')),
    validTo:getCDValue('anm-to-d')?anmJoin(getCDValue('anm-to-d'),v('anm-to-t')||'23:59'):'',
    pinned:ciPicked('anm-pin','No')==='Yes',
    status:anmEditId?anmRec(anmEditId).status:'Active'
  };
}
/* Counters and the "when will this show" line — the only things that move as
   you type, so the only things repainted. */
function anmFormSync(){
  const set=function(id,n,max){const el=document.getElementById(id);if(el){el.textContent=n+' / '+max;el.classList.toggle('is-near',n>max*0.9);}};
  const t=document.getElementById('anm-title'),m=document.getElementById('anm-msg');
  if(t)set('anm-title-n',t.value.length,ANM_TITLE_MAX);
  if(m)set('anm-msg-n',m.value.length,ANM_MSG_MAX);
  const box=document.getElementById('anm-when');if(!box)return;
  const f=anmReadForm();
  const from=anmParse(f.validFrom),to=anmParse(f.validTo);
  let tone='idle',txt='';
  if(!from)txt='Pick a Valid From date and time.';
  else if(to&&to<=from){tone='bad';txt='Valid To must be after Valid From.';}
  else{
    const st=anmState(f);
    tone=ANM_STATE_TONE[st]==='idle'&&st==='Inactive'?'idle':ANM_STATE_TONE[st];
    txt=st==='Inactive'?'Saved as Inactive — nobody will see it until it is made Active.'
      :st==='Expired'?'This window has already ended — employees would never see it.'
      :(st==='Scheduled'?'Goes live on '+anmFmt(f.validFrom):anmEditId?'Live now':'Goes live as soon as you publish')
        +(f.validTo?' and stops after '+anmFmt(f.validTo)+'.':', and stays until it is made Inactive.');
  }
  box.className='anm-when tone-'+tone;
  box.innerHTML=ANM_ICO.info+'<span>'+txt+'</span>';
}

function buildAnmFormHTML(){
  const a=anmEditId?anmRec(anmEditId):null;
  const xSvg='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const split=function(dt){const p=(dt||'').split('T');return {d:p[0]||'',t:p[1]||''};};
  const d=anmDraft||{};
  const from=a?split(a.validFrom):{d:d.fromDate||'',t:d.fromTime||''};
  const to=a?split(a.validTo):{d:'',t:''};
  const grp=function(label,req,html,full,extra){
    return '<div class="ep-form-group'+(full?' ep-form-full':'')+'"><label class="ep-form-label">'+label
      +(req?' <span class="req">*</span>':' <span class="ep-optional">(optional)</span>')+(extra||'')+'</label>'+html+'</div>';
  };
  const sec=function(title,sub,inner){
    return '<div class="ep-form-card anm-sec"><div class="anm-sec-head"><span class="ep-form-title">'+title+'</span>'
      +'<span class="anm-sec-sub">'+sub+'</span></div>'+inner+'</div>';
  };
  const audit=a
    ? '<div class="anm-audit">'
        +'<span><b>Created</b> '+sbEsc(a.createdBy)+' · '+sbEsc(anmStampText(a.createdAt))+'</span>'
        +'<span><b>Last updated</b> '+sbEsc(a.updatedBy)+' · '+sbEsc(anmStampText(a.updatedAt))+'</span></div>'
    : '<div class="anm-audit">'+ANM_ICO.clock+'<span>Created By, Created Date &amp; Time, Last Updated By and Last Updated Date &amp; Time are recorded automatically when you save.</span></div>';

  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form anm-form" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(a?'Edit Announcement':'Create Announcement')+'</span>'
      +'<button class="ct-modal-close" onclick="anmCloseForm()">'+xSvg+'</button></div>'
    +'<p class="ct-modal-sub">Posted to the Announcements panel on the employee dashboard, for the audience and dates you set here.</p>'

    /* One two-column grid throughout: full-width fields for what is long
       (title, message, the group panel), and pairs for what is short
       (Category | Pin, Target Audience | who it reaches, From | To), so no
       field sits alone beside an empty half. */
    +sec('Announcement','What it says',
      '<div class="ep-form-grid">'
      +grp('Announcement Title',true,
        '<input type="text" class="ep-form-input" id="anm-title" maxlength="'+ANM_TITLE_MAX+'" placeholder="e.g. Office closed for Diwali on 8 Nov" value="'+(a?sbEsc(a.title):'')+'" oninput="anmFormSync()">'
        +'<span class="anm-count" id="anm-title-n">'+(a?a.title.length:0)+' / '+ANM_TITLE_MAX+'</span>',true)
      +grp('Category',true,apCS('anm-cat',ANM_CATS,a?a.category:'','Select category'))
      +grp('Pin Announcement',true,ciRadio('anm-pin',['No','Yes'],a&&a.pinned?'Yes':'No'),false,
        '<span class="anm-lbl-tip" title="Pinned announcements are shown first — still only to their audience, and only while valid.">Shown first on the dashboard</span>')
      +grp('Message',true,
        '<textarea class="ep-form-input anm-ta" id="anm-msg" maxlength="'+ANM_MSG_MAX+'" placeholder="Write the announcement employees will read" oninput="anmFormSync()">'+(a?sbEsc(a.message):'')+'</textarea>'
        +'<span class="anm-count" id="anm-msg-n">'+(a?a.message.length:0)+' / '+ANM_MSG_MAX+'</span>',true)
      +'</div>')

    +sec('Audience','Who sees it',
      '<div class="ep-form-grid">'
      +grp('Target Audience',true,anmAudModeHTML())
      +'<div class="ep-form-group"><label class="ep-form-label">Reach</label>'+anmReachBlockHTML()+'</div>'
      +'<div class="ep-form-group ep-form-full" id="anm-aud-vals"'+(d.mode===ANM_AUD_PICK?'':' hidden')+'>'+anmAudPickHTML()+'</div>'
      +'</div>')

    +sec('Validity','When it starts and stops showing',
      '<div class="ep-form-grid">'
      +grp('Valid From Date &amp; Time',true,
        '<div class="anm-dt">'+apCD('anm-from-d',from.d,'Select date','anmFormSync')+tsTimeField('anm-from-t',from.t||'09:00')+'</div>')
      +grp('Valid To Date &amp; Time',false,
        '<div class="anm-dt">'+apCD('anm-to-d',to.d,'No end date','anmFormSync')+tsTimeField('anm-to-t',to.t)+'</div>')
      +'<div class="ep-form-group ep-form-full"><div class="anm-when" id="anm-when"></div></div>'
      +'</div>')

    +audit
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="anmCloseForm()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="anmSubmit()">'+(a?'Save changes':'Publish Announcement')+'</button>'
    +'</div></div>'
    +'</div></div>';
}

function anmSubmit(){
  const f=anmReadForm();
  const bad=function(msg,sub,focusId){
    showToast(msg,'error',sub||'');
    const el=focusId&&document.getElementById(focusId);if(el)el.focus();
  };
  if(!f.title)return bad('Announcement Title is required','','anm-title');
  if(!f.message)return bad('Message is required','Write what employees should read.','anm-msg');
  if(!f.category)return bad('Category is required','Pick the category this belongs to.');
  if(f.audMode===ANM_AUD_PICK&&anmIsAll(f))
    return bad('Pick at least one group','Tick a department, branch, employment type or role — or set Target Audience to All Employees.');
  if(!anmParse(f.validFrom))return bad('Valid From is required','Pick the date and time it should start showing.');
  if(f.validTo&&anmParse(f.validTo)<=anmParse(f.validFrom))return bad('Valid To must be after Valid From','Check the two dates.');

  const stamp=anmStampNow();
  if(anmEditId){
    const a=anmRec(anmEditId);
    const changes=[];
    if(a.title!==f.title)changes.push('title changed');
    if(a.message!==f.message)changes.push('message edited');
    if(a.category!==f.category)changes.push('category '+a.category+' → '+f.category);
    if(anmAudText(a)!==anmAudText(f))changes.push('audience now '+anmAudText(f));
    if(a.validFrom!==f.validFrom||a.validTo!==f.validTo)changes.push('validity now '+anmFmt(f.validFrom)+' – '+(f.validTo?anmFmt(f.validTo):'no end date'));
    if(a.pinned!==f.pinned)changes.push(f.pinned?'pinned':'unpinned');
    if(!changes.length){anmCancelEdit();showToast('No changes','info','Nothing was different.');return;}
    a.title=f.title;a.message=f.message;a.category=f.category;ANM_DIMS.forEach(function(d){a[d.k]=f[d.k];});
    a.validFrom=f.validFrom;a.validTo=f.validTo;a.pinned=f.pinned;
    a.updatedBy=CURRENT_USER;a.updatedAt=stamp;
    anmEditMode=false;anmEditId=null;anmDraft=null;
    renderADTPage();
    showToast('Announcement updated','success','"'+a.title+'" — '+anmState(a)+'.');
    return;
  }
  const id=++anmSeq;
  const a={id:id,annId:'ANN-'+(1000+id),title:f.title,category:f.category,depts:f.depts,branches:f.branches,types:f.types,roles:f.roles,
    message:f.message,validFrom:f.validFrom,validTo:f.validTo,pinned:f.pinned,status:f.status,from:'hr',
    createdBy:CURRENT_USER,createdAt:stamp,updatedBy:CURRENT_USER,updatedAt:stamp};
  annData.push(a);
  anmModalOpen=false;anmDraft=null;
  anmQ='';anmCatF='';anmAudF='';anmStatusF='';anmStateF='';
  lpLanded('announcements',id);
  anmSelectedId=id;anmTab='basic-details';
  renderADTPage();
  const st=anmState(a);
  showToast(st==='Live'?'Announcement published':'Announcement saved','success',
    '"'+a.title+'" — '+(st==='Live'?'live now for '+anmAudText(a):st==='Scheduled'?'goes live '+anmFmt(a.validFrom):'saved as Inactive')+'.');
}

anmSync();
