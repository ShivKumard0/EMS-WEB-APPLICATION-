/* ══ ALL TIMESHEET → REQUESTS TAB ═════════════════════════════════════════
   Everything an employee has asked somebody to agree to on their timesheet,
   in one list a manager or HR can act on from the row's panel:

     · Attendance Request — hours claimed on a weekly off or holiday
     · Manual Entry       — a clock-in made outside every office radius
     · Time Change        — a day's clock-in / clock-out edited after the fact

   The first two are the same arRequests store the My Timesheet drawer writes
   (js/attendance-request.js); the third is tsChangeLog, written by
   tsSaveEntry (core.js). For the signed-in employee both are read LIVE, so a
   request filed on My Timesheet is on this tab the moment it is submitted.
   Every other employee reads from AT_REQ_SEED until a backend supplies them.

   THE DOT. A row with anything still waiting carries a small maroon dot by the
   name, and so does the Requests tab. Maroon rather than blue because blue is
   already taken in the panels: a blue dot on a tab means "unsaved edits"
   (sbMarkDraftTabs), and the two must not be confused. */

const AT_REQ_TYPE={
  attendance:{label:'Attendance Request',tone:'info'},
  manual:{label:'Manual Entry',tone:'idle'},
  change:{label:'Time Change',tone:'wait'}
};
const AT_REQ_PENDING='Pending Approval';
let atReqFilter='';          // 'pending' | 'all' | '' (= pick for me)

/* Employees other than the signed-in one. Times are 24h for claims (what the
   drawer stores) and 12h for changes (what tsAttendance stores). */
const AT_REQ_SEED={
  '11755':[
    {id:'s1',type:'change',date:'2026-08-24',label:'Working day',
     prev:{in:'09:30 AM',out:'06:30 PM',hours:'9.00h'},in:'09:00 AM',out:'07:30 PM',hours:'10.50h',
     reason:'Stayed back for the release cut-over and missed the clock-out.',
     status:AT_REQ_PENDING,requestedAt:'25 Aug 2026, 10:12 AM'},
    {id:'s2',type:'attendance',date:'2026-08-22',label:'Weekly Off',in:'10:00',out:'16:00',
     reason:'Production support for the month-end payroll run.',
     status:AT_REQ_PENDING,requestedAt:'23 Aug 2026, 09:40 AM',approver:'HR / Manager'},
    {id:'s3',type:'manual',date:'2026-08-18',label:'Outside geofence',in:'09:05',out:'18:10',
     location:'Client site, Gachibowli',reason:'Working from the client office for the onboarding workshop.',
     status:'Approved',requestedAt:'18 Aug 2026, 09:06 AM',approver:'Manager / HR'},
    {id:'s4',type:'attendance',date:'2026-08-15',label:'Independence Day',in:'10:00',out:'14:00',
     reason:'Covered the support desk for two hours.',
     status:'Rejected',requestedAt:'16 Aug 2026, 11:20 AM',approver:'HR / Manager'}
  ]
};

// ── WHAT IS ON FILE FOR THIS EMPLOYEE ──
function atReqIsLive(empId){return typeof tsEmp!=='undefined'&&tsEmp&&tsEmp.empId===empId;}
function atReqList(empId){
  let list=[];
  if(atReqIsLive(empId)){
    Object.keys(typeof arRequests!=='undefined'?arRequests:{}).forEach(function(iso){
      const r=arRequests[iso];
      const manual=r.kind===AR_MANUAL;
      const day=manual?null:arNonWorkingDay(iso);
      list.push({id:'ar:'+iso,live:'ar',type:manual?'manual':'attendance',date:iso,
        label:manual?'Outside geofence':(day?day.label:r.kind),
        in:r.in,out:r.out,reason:r.reason,location:r.location,
        status:r.status,requestedAt:r.requestedAt,approver:r.approver,decided:r.decided});
    });
    Object.keys(typeof tsChangeLog!=='undefined'?tsChangeLog:{}).forEach(function(iso){
      const c=tsChangeLog[iso];
      list.push({id:'ch:'+iso,live:'ch',type:'change',date:iso,label:'Working day',
        prev:c.prev,in:c.in,out:c.out,hours:c.hours,reason:c.comment||c.desc,   // the employee's required Comment
        status:c.status,requestedAt:c.requestedAt,decided:c.decided});
    });
  }else{
    list=(AT_REQ_SEED[empId]||[]).slice();
  }
  // Waiting first — that is what the tab is opened for — then newest date.
  return list.sort(function(a,b){
    const pa=a.status===AT_REQ_PENDING?0:1,pb=b.status===AT_REQ_PENDING?0:1;
    return pa-pb||(a.date<b.date?1:a.date>b.date?-1:0);
  });
}
function atReqPending(empId){
  return atReqList(empId).filter(function(r){return r.status===AT_REQ_PENDING;}).length;
}
// The dot. Empty string when nothing is waiting, so a quiet row is unchanged.
function atReqDotHTML(empId,cls){
  const n=atReqPending(empId);
  return n?'<span class="'+(cls||'at-req-dot')+'" title="'+n+' pending request'+(n===1?'':'s')+'" aria-label="'+n+' pending"></span>':'';
}

// ── THE TAB ──
const AT_REQ_ICO={
  cal:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  clock:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  pin:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  edit:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  sun:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>',
  geo:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  inbox:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="20 6 9 17 4 12"/></svg>',
  x:'<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
};
function atReqTime(t){return /M$/.test(String(t||''))?t:arTime12(t);}
// "9.25h" or a 24h span, read out the same way either way: "9h 15m".
function atReqDur(hours,inT,outT){
  const h=parseFloat(hours);
  if(!isNaN(h))return Math.floor(h)+'h '+String(Math.round((h%1)*60)).padStart(2,'0')+'m';
  const s=arSpan(inT,outT);return s?s.text:'—';
}
function atReqDay(iso){
  const d=arParse(iso);
  return d?d.getDate()+' '+AR_MON[d.getMonth()]+' '+d.getFullYear()+' · '+AR_DAY_NAMES[d.getDay()]:'—';
}
/* One request, as a manager reads it: what kind and which day up top, the
   times as a labelled read-out, then the employee's own words, then the
   decision. Deliberately colourless apart from the status badge — the badge is
   the one thing on the card that should catch the eye. */
function atReqCardHTML(r,empId){
  const t=AT_REQ_TYPE[r.type]||AT_REQ_TYPE.attendance;
  const ico=r.type==='change'?AT_REQ_ICO.edit:r.type==='manual'?AT_REQ_ICO.geo:AT_REQ_ICO.sun;
  const pending=r.status===AT_REQ_PENDING;
  const tone=(typeof AR_STATUS_TONE!=='undefined'&&AR_STATUS_TONE[r.status])||'idle';
  const span=function(a,b){return atReqTime(a)+' – '+atReqTime(b);};
  const cell=function(label,val,sub,cls){
    return '<div class="at-req-cell'+(cls?' '+cls:'')+'"><span class="at-req-lbl">'+label+'</span>'
      +'<span class="at-req-val">'+val+'</span>'+(sub?'<span class="at-req-sub">'+sub+'</span>':'')+'</div>';
  };
  /* A change is only legible next to what it replaced: Before and After sit
     side by side, the old one muted. */
  const grid=r.type==='change'
    ? cell('Before',r.prev?span(r.prev.in,r.prev.out):'No entry',r.prev?atReqDur(r.prev.hours,r.prev.in,r.prev.out):'','is-before')
      +'<div class="at-req-arrow">'+AT_REQ_ICO.arrow+'</div>'
      +cell('After',span(r.in,r.out),atReqDur(r.hours,r.in,r.out))
    : cell('Clock in',atReqTime(r.in))
      +cell('Clock out',atReqTime(r.out))
      +cell('Total',atReqDur(r.hours,r.in,r.out))
      +(r.location?cell('Location',arEsc(r.location),'','is-wide'):'');
  return '<div class="at-req-card">'
    +'<div class="at-req-top">'
      +'<div class="at-req-ico">'+ico+'</div>'
      +'<div class="at-req-head">'
        +'<div class="at-req-title">'+t.label+'</div>'
        +'<div class="at-req-date">'+atReqDay(r.date)+'<span class="at-req-sep"></span>'+arEsc(r.label)+'</div>'
      +'</div>'
      +'<span class="lp-status-badge tone-'+tone+'">'+(pending?'Pending':arEsc(r.status))+'</span>'
    +'</div>'
    +'<div class="at-req-grid'+(r.type==='change'?' is-compare':'')+'">'+grid+'</div>'
    +(r.reason?'<div class="at-req-reason"><span class="at-req-lbl">Reason</span>'+arEsc(r.reason)+'</div>':'')
    +'<div class="at-req-foot">'
      +'<span class="at-req-when">Requested '+arEsc(r.requestedAt||'—')
        +(r.decided?' · '+arEsc(r.status)+' '+arEsc(r.decided):'')+'</span>'
      +(pending
        ? '<div class="at-req-acts">'
            +'<button class="at-req-btn is-reject" onclick="atReqDecide(\''+empId+'\',\''+r.id+'\',false)">Reject</button>'
            +'<button class="at-req-btn is-approve" onclick="atReqDecide(\''+empId+'\',\''+r.id+'\',true)">'+AT_REQ_ICO.check+'Approve</button>'
          +'</div>'
        : '')
    +'</div>'
  +'</div>';
}
function atReqSetFilter(f){atReqFilter=f;isbTab('at',renderAtSidebar);}
function atReqTabHTML(emp){
  const all=atReqList(emp.empId);
  const pend=all.filter(function(r){return r.status===AT_REQ_PENDING;});
  const first=(emp.name||'').split(' ')[0];

  /* NOTHING ON FILE. Said plainly, with what WOULD appear here, so an empty tab
     reads as "this person has asked for nothing" and not as "this failed to
     load". */
  if(!all.length){
    return '<div class="at-req-empty">'
      +'<div class="at-req-empty-ico">'+AT_REQ_ICO.inbox+'</div>'
      +'<div class="at-req-empty-title">No requests from '+arEsc(first)+'</div>'
      +'<p class="at-req-empty-txt">When '+arEsc(first)+' changes a timesheet entry or asks for attendance on a '
        +'non-working day, it will appear here for you to approve or reject.</p>'
      +'<div class="at-req-empty-kinds">'
        +'<span>'+AT_REQ_ICO.edit+'Time changes</span>'
        +'<span>'+AT_REQ_ICO.sun+'Week off / holiday</span>'
        +'<span>'+AT_REQ_ICO.geo+'Outside geofence</span>'
      +'</div>'
    +'</div>';
  }
  const f=atReqFilter||(pend.length?'pending':'all');
  const shown=f==='pending'?pend:all;
  const seg='<div class="at-req-bar">'
    +'<div class="at-req-seg">'
      +'<button class="'+(f==='pending'?'active':'')+'" onclick="atReqSetFilter(\'pending\')">Pending<span class="at-req-count'+(pend.length?' is-hot':'')+'">'+pend.length+'</span></button>'
      +'<button class="'+(f==='all'?'active':'')+'" onclick="atReqSetFilter(\'all\')">All<span class="at-req-count">'+all.length+'</span></button>'
    +'</div>'
    +'<span class="at-req-bar-note">Newest first</span>'
  +'</div>';
  const list=shown.length
    ? shown.map(function(r){return atReqCardHTML(r,emp.empId);}).join('')
    : '<div class="at-req-empty is-compact">'
        +'<div class="at-req-empty-ico is-ok">'+AT_REQ_ICO.check+'</div>'
        +'<div class="at-req-empty-title">All caught up</div>'
        +'<p class="at-req-empty-txt">Nothing from '+arEsc(first)+' is waiting for a decision.</p>'
        +'<button class="at-req-link" onclick="atReqSetFilter(\'all\')">View all '+all.length+' request'+(all.length===1?'':'s')+'</button>'
      +'</div>';
  return seg+'<div class="at-req-list">'+list+'</div>';
}

// ── DECIDING ──
/* Approve or reject from the panel. On the live employee the decision is
   written back to the store My Timesheet reads, so the employee's grid says
   so too: an approved claim puts its hours on the sheet; a rejected time
   change puts the old times back. */
function atReqDecide(empId,id,ok){
  const status=ok?'Approved':'Rejected';
  const stamp=arNowLabel();
  const r=atReqList(empId).find(function(x){return x.id===id;});
  if(!r||r.status!==AT_REQ_PENDING)return;
  if(r.live==='ar'){
    const rec=arRequests[r.date];
    rec.status=status;rec.decided=stamp;
    if(ok&&typeof tsAttendance!=='undefined'){
      const s=arSpan(rec.in,rec.out);
      tsAttendance[r.date]={in:tsTo12(rec.in),out:tsTo12(rec.out),loc:'Hyderabad',
        hours:s?(s.mins/60).toFixed(2)+'h':'--',src:'Manual',status:'present',desc:rec.reason};
    }
  }else if(r.live==='ch'){
    const c=tsChangeLog[r.date];
    c.status=status;c.decided=stamp;
    if(!ok&&typeof tsAttendance!=='undefined'){
      if(c.prev)tsAttendance[r.date]=c.prev;else delete tsAttendance[r.date];
    }
  }else{
    const seed=(AT_REQ_SEED[empId]||[]).find(function(x){return x.id===id;});
    if(seed){seed.status=status;seed.decided=stamp;}
  }
  atReqNotifDone(id);
  renderADTPage();
  const emp=atEmp(empId);
  showToast('Request '+status.toLowerCase(),ok?'success':'info',
    (AT_REQ_TYPE[r.type]||{}).label+' · '+arDateLabel(r.date)+(emp?' · '+emp.name:'')
    +(!ok&&r.type==='change'?' · previous times restored':''));
}

/* ══ ATTENDANCE CORRECTION → HEADER NOTIFICATION ═══════════════════════════
   Reuses the existing approval workflow: when an employee submits a
   correction (a time change from the day panel, or a claim / manual entry
   from the attendance-request drawer), the applicable approvers — HR and the
   Reporting Manager, as the approval configuration names them — get a
   notification under the header bell. Opening it lands on
   All Timesheets → that employee's panel → Requests tab. Deciding the
   request (approve or reject) clears it. */
// The configured approver, as the people who are told. "Manager" in the
// configuration is the employee's Reporting Manager.
function atReqRecipients(approver){
  const out=[];
  String(approver||'HR / Manager').split('/').forEach(function(p){
    p=p.trim();if(!p)return;
    if(/manager/i.test(p))p='Reporting Manager';
    if(out.indexOf(p)<0)out.push(p);
  });
  return out;
}
const AT_REQ_KIND_LABEL={change:'Time change',attendance:'Off-day attendance',manual:'Manual entry'};
// One bell entry for a correction request; the panel draws it from req.
function atReqNotifItem(empId,id,kind,iso,approver,reason,time){
  const emp=(typeof atEmp==='function'&&atEmp(empId))||(typeof tsEmp!=='undefined'?tsEmp:{name:'Employee'});
  const to=atReqRecipients(approver);
  return {name:'Timesheet correction request',ini:emp.initials||'',time:time,pending:true,
    reqId:id,empId:empId,go:'at-requests',
    req:{who:emp.name,kind:AT_REQ_KIND_LABEL[kind]||'Correction',
      day:new Date(iso+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}),
      to:to.join(' & '),reason:reason||''}};
}
function atReqNotify(empId,id,kind,iso,approver,reason){
  if(typeof notifData==='undefined')return [];
  const to=atReqRecipients(approver);
  // One notification per request: an edited request replaces its own.
  for(let i=notifData.length-1;i>=0;i--)if(notifData[i].reqId===id)notifData.splice(i,1);
  notifData.unshift(atReqNotifItem(empId,id,kind,iso,approver,reason,'Just now'));
  if(typeof notifUpdateList==='function')notifUpdateList(true);
  return to;
}
// Approve / Reject settles the request, so its notification is read.
function atReqNotifDone(id){
  if(typeof notifData==='undefined')return;
  notifData.forEach(function(n){if(n.reqId===id)n.pending=false;});
  if(typeof notifSyncBell==='function')notifSyncBell();
}
// Open from the bell: All Timesheets, the employee's panel, Requests tab.
function atReqOpenFromNotif(i){
  const n=notifData[i];if(!n||n.go!=='at-requests')return;
  n.pending=false;
  notifOpen=false;if(typeof renderNotif==='function')renderNotif();
  page='all-timesheet';
  if(typeof atReqFilter!=='undefined')atReqFilter='';
  renderADTPage();
  openAtSidebar(n.empId,'requests');
  atReqFilter='';
  const row=document.getElementById('at-row-'+n.empId);
  if(row&&row.scrollIntoView)row.scrollIntoView({block:'nearest'});
}

/* The requests already waiting on other employees (AT_REQ_SEED) are on the
   bell from the start, the same as one filed live - newest first, opening on
   that employee's Requests tab, cleared when it is decided. */
(function(){
  if(typeof notifData==='undefined')return;
  const items=[];
  Object.keys(AT_REQ_SEED).forEach(function(empId){
    AT_REQ_SEED[empId].forEach(function(r){
      if(r.status!==AT_REQ_PENDING)return;
      const n=atReqNotifItem(empId,r.id,r.type,r.date,r.approver,r.reason,String(r.requestedAt||'').split(',')[0].replace(/ d{4}$/,''));
      n.at=r.requestedAt;items.push(n);
    });
  });
  items.sort(function(a,b){return new Date(b.at)-new Date(a.at);});
  notifData.unshift.apply(notifData,items);
  if(typeof notifSyncBell==='function')notifSyncBell();
})();
