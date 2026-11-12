/* ══ VIEW OPTIONAL HOLIDAYS ═════════════════════════════════════════════════
   The Holidays listing answers what the entity has declared. It does not
   answer the question the person reading it usually has, which is "which of
   these can I take, and have I claimed one yet?" — an optional holiday is an
   entitlement, not an announcement, and an entitlement needs a calendar and a
   balance, not a table row.

   So this is a second reading of the SAME holidaysData: no new records, no
   second source of truth. The listing stays the administrator's view; this is
   the same year seen as a calendar you can act on.

   TWO TABS, BECAUSE THE TWO KINDS BEHAVE DIFFERENTLY. Public and company
   holidays are closed days — nothing to decide, so the Regular tab is purely
   informational. Optional holidays are a budget: N per year, spend them where
   you like, and every one you claim is one you cannot claim elsewhere. Only
   that tab carries a balance, a status and an Apply.

   THE BALANCE IS DERIVED, NEVER STORED. It is the entitlement minus what has
   actually been applied for, computed at the moment it is drawn, so the number
   on the detail pane and the badges in the month list cannot disagree — which
   they would the first time somebody applied and one of the two forgot to
   refresh.

   OPENED FROM THE TOPBAR, exactly where and how Cost Calculator opens on the
   Contracts page: one outlined .tb-* button beside the page title, shown on
   the page it belongs to and nowhere else. */

/* How many optional holidays a person may take in a year: the entity's own
   figure, set in Company Settings → Leaves → Optional Holidays (csLeave in
   js/leave-settings.js). Read at the moment it is drawn, so a change there
   shows here without a reload. */
function ohEntitlement(){return typeof csLeave!=='undefined'&&csLeave.optionalHolidays!=null?csLeave.optionalHolidays:3;}
const OH_MONTHS=['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const OH_MON_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const OH_DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

/* What has been applied for: holiday id -> {status}. One status only for now —
   an application is either in or it is not, and "Pending" is what the approver
   sees before they act. */
let ohApplied={};
let ohOpen=false;
let ohTab='optional';          // 'optional' | 'regular'
let ohView={y:2026,m:0};       // the month on screen, 0-indexed
let ohDetailId=null;           // the holiday whose detail is showing
let ohMpOpen=false;            // the month picker popover

// ── READING THE HOLIDAY CALENDAR ──
// The same rows the listing shows, filtered to the tab's kind. Inactive
// holidays are excluded here and not in hdEntityRows, because a withdrawn
// holiday is still a record an administrator needs to see and not a day
// anybody can take off.
function ohRows(){
  const all=(typeof hdEntityRows==='function')?hdEntityRows():[];
  return all.filter(function(h){
    if(h.status==='Inactive')return false;
    return ohTab==='optional'
      ? h.type==='Optional Holiday'
      : h.type!=='Optional Holiday';
  });
}
function ohById(id){
  const all=(typeof hdEntityRows==='function')?hdEntityRows():[];
  return all.find(function(h){return h.id===id;})||null;
}
function ohInMonth(iso,y,m){
  return iso&&+iso.slice(0,4)===y&&+iso.slice(5,7)===m+1;
}
function ohMonthRows(){
  return ohRows()
    .filter(function(h){return ohInMonth(h.date,ohView.y,ohView.m);})
    .sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});
}
function ohOn(iso){
  return ohRows().filter(function(h){return h.date===iso;});
}
function ohStatus(h){
  return ohApplied[h.id]?'Applied (Pending)':'Not Applied';
}
function ohIsApplied(h){return !!ohApplied[h.id];}
/* Spent against the year being LOOKED AT, not the year we happen to be in: a
   balance shown over a January 2026 calendar has to be the 2026 balance, or
   the number is answering a question nobody asked. */
function ohUsed(year){
  let n=0;
  Object.keys(ohApplied).forEach(function(id){
    const h=ohById(+id);
    if(h&&h.date&&+h.date.slice(0,4)===year)n++;
  });
  return n;
}
function ohAvailable(year){return Math.max(0,ohEntitlement()-ohUsed(year));}
function ohToday(){return (typeof hdTodayISO==='function')?hdTodayISO():'';}
function ohIsPast(iso){const t=ohToday();return !!t&&!!iso&&iso<t;}
function ohDateLong(iso){
  const p=String(iso||'').split('-');
  if(p.length!==3)return '—';
  return (+p[2])+' '+OH_MONTHS[+p[1]-1]+' '+p[0];
}
function ohDayName(iso){
  return (typeof hdDayName==='function')?(hdDayName(iso)||'—'):'—';
}
function ohTone(h){
  return (typeof HD_TYPE_TONE!=='undefined'&&HD_TYPE_TONE[h.type])||'idle';
}

// ── OPEN / CLOSE ──
/* The calendar opens on the month that has something to show: the next
   optional holiday still to come, failing that the first one of the year,
   failing that today. Opening on the current month would, in a fixture whose
   holidays are all in January, be an empty grid and a puzzle. */
function ohSeedMonth(){
  const t=ohToday();
  const rows=ohRows().slice().sort(function(a,b){return a.date<b.date?-1:1;});
  const next=rows.find(function(h){return h.date>=t;})||rows[0];
  const iso=next?next.date:t;
  if(iso&&iso.length>=7){ohView={y:+iso.slice(0,4),m:+iso.slice(5,7)-1};return;}
  const d=new Date();
  ohView={y:d.getFullYear(),m:d.getMonth()};
}
function openOptionalHolidays(){
  ohTab='optional';ohDetailId=null;ohMpOpen=false;
  ohSeedMonth();
  ohOpen=true;
  ohMount();
  document.addEventListener('keydown',ohKey);
}
function closeOptionalHolidays(){
  ohOpen=false;ohDetailId=null;ohMpOpen=false;
  const host=document.getElementById('oh-host');
  if(host)host.remove();
  document.removeEventListener('keydown',ohKey);
}
// Escape belongs to whatever is on top: with the month picker open it closes
// the picker, and with a detail open it goes back to the calendar first.
function ohKey(e){
  if(e.key!=='Escape')return;
  if(ohMpOpen){ohMpOpen=false;ohPaint();return;}
  if(ohDetailId){ohBack();return;}
  closeOptionalHolidays();
}
function ohMount(){
  let host=document.getElementById('oh-host');
  if(!host){
    host=document.createElement('div');
    host.id='oh-host';
    document.body.appendChild(host);
  }
  host.innerHTML=ohOverlayHTML();
}
/* Repaints the body alone. The header and its tabs do not change between
   states, so replacing them would restart the panel's entrance animation on
   every click inside it. */
function ohPaint(){
  const b=document.getElementById('oh-body');
  if(b)b.innerHTML=ohBodyHTML();
}
function ohSetTab(t){
  if(ohTab===t)return;
  ohTab=t;ohDetailId=null;ohMpOpen=false;
  /* The two kinds fall in different months, so holding the month across a tab
     switch lands you on an empty grid about half the time — a dead end that
     looks like a bug. The month is kept when it has something to show for the
     new tab and re-seeded when it does not. */
  if(!ohMonthRows().length)ohSeedMonth();
  const host=document.getElementById('oh-host');
  if(host)host.querySelectorAll('.mod-tab').forEach(function(el){
    const on=el.dataset.ohtab===t;
    el.classList.toggle('active',on);
    el.setAttribute('aria-selected',on?'true':'false');
  });
  ohPaint();
}
function ohNavMonth(delta){
  const d=new Date(ohView.y,ohView.m+delta,1);
  ohView={y:d.getFullYear(),m:d.getMonth()};
  ohDetailId=null;ohMpOpen=false;
  ohPaint();
}
function ohToggleMp(ev){
  if(ev)ev.stopPropagation();
  ohMpOpen=!ohMpOpen;
  ohPaint();
}
function ohPickMonth(m,ev){
  if(ev)ev.stopPropagation();
  ohView={y:ohView.y,m:m};
  ohMpOpen=false;ohDetailId=null;
  ohPaint();
}
function ohNavYear(delta,ev){
  if(ev)ev.stopPropagation();
  ohView={y:ohView.y+delta,m:ohView.m};
  ohPaint();
}
function ohShow(id){ohDetailId=id;ohMpOpen=false;ohPaint();}
function ohBack(){ohDetailId=null;ohPaint();}

/* ── Applying ────────────────────────────────────────────────────────────
   Every refusal is tested here rather than only being greyed in the markup: a
   disabled button is a courtesy, not a guarantee, and this is the one place
   the rules are written down. */
function ohApply(id){
  const h=ohById(id);
  if(!h)return;
  if(h.type!=='Optional Holiday'){showToast('Not an optional holiday','error');return;}
  if(ohIsApplied(h)){showToast('Already applied','info','This one is waiting for approval.');return;}
  if(ohIsPast(h.date)){
    showToast('That date has passed','error','Optional holidays can only be claimed in advance.');return;
  }
  const year=+h.date.slice(0,4);
  if(ohAvailable(year)<=0){
    showToast('No balance left','error','All '+ohEntitlement()+' optional holidays for '+year+' are used.');
    return;
  }
  ohApplied[h.id]={status:'Applied (Pending)'};
  ohPaint();
  showToast('Applied for '+h.name,'success',
    ohDateLong(h.date)+' · '+ohAvailable(year)+' of '+ohEntitlement()+' left');
}
function ohWithdraw(id){
  const h=ohById(id);
  if(!h||!ohIsApplied(h))return;
  delete ohApplied[h.id];
  ohPaint();
  showToast('Application withdrawn','info',
    h.name+' · '+ohAvailable(+h.date.slice(0,4))+' of '+ohEntitlement()+' available');
}

// ── MARKUP ──
const OH_ICO={
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  day:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  scale:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  prev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
  next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><polygon points="12 2.6 15 9 22 9.9 17 14.7 18.2 21.6 12 18.3 5.8 21.6 7 14.7 2 9.9 9 9"/></svg>'
};
function ohOverlayHTML(){
  const entity=(typeof hdCurrentEntityName==='function'?hdCurrentEntityName():'')||'This entity';
  /* The same segmented control the Employees and Timesheet module tabs use -
     .mod-tabs on a tinted track, and the sliding marker js/tab-slide.js plants
     in any .mod-tabs it finds. Two views of one calendar is what that control
     is for; the pair of chips this replaced read as two filters. */
  const tab=function(id,label,ico){
    return '<button type="button" role="tab" aria-selected="'+(ohTab===id)+'" '
      +'class="mod-tab'+(ohTab===id?' active':'')+'" data-ohtab="'+id+'" '
      +'onclick="ohSetTab(\''+id+'\')">'+ico+'<span>'+label+'</span></button>';
  };
  return '<div class="oh-overlay">'
    +'<div class="oh-panel" role="dialog" aria-modal="true" aria-labelledby="oh-title">'
      +'<div class="oh-head">'
        +'<div><div class="oh-title" id="oh-title">Optional Holidays</div>'
          +'<div class="oh-sub">'+tsxHtmlSafe(entity)+' &middot; Your calendar and balance for the year</div></div>'
        +'<button class="oh-close" onclick="closeOptionalHolidays()" title="Close" aria-label="Close">&times;</button>'
      +'</div>'
      +'<div class="oh-tabs"><div class="mod-tabs" role="tablist">'
        +tab('regular','Regular Holidays',OH_ICO.cal)+tab('optional','Optional Holidays',OH_ICO.star)
      +'</div></div>'
      +'<div class="oh-body" id="oh-body">'+ohBodyHTML()+'</div>'
    +'</div>'
  +'</div>';
}
// The app's own escaper, guarded so this file does not depend on load order.
function tsxHtmlSafe(s){
  return (typeof attrSafe==='function')?attrSafe(s)
    :String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
}
/* THE TOOLBAR ROW SPANS BOTH COLUMNS, and that is the whole reason it is here
   rather than inside the calendar. It used to sit at the top of the left
   column, so the month name and its arrows took 44px that the right-hand list
   did not — leaving "This Month Events" floating level with the arrows and a
   clear 44px above the grid it describes. Lifted out, the two columns start on
   the same line, and the month centres over the view as a whole instead of
   over one column of it. The detail view puts its Back in the same slot, so
   the columns stay aligned there too. */
function ohBodyHTML(){
  const bar=ohDetailId
    ? '<div class="oh-bar is-back"><button class="oh-back" onclick="ohBack()">'
        +OH_ICO.back+' Back to Calendar</button></div>'
    : ohCalBarHTML();
  const main=ohDetailId?ohDetailHTML(ohDetailId):ohCalendarHTML();
  return bar
    +'<div class="oh-cols">'
      +'<div class="oh-main">'+main+'</div>'
      +'<aside class="oh-side">'+ohEventsHTML()+'</aside>'
    +'</div>';
}
function ohCalBarHTML(){
  return '<div class="oh-bar">'
    +'<button class="oh-nav" onclick="ohNavMonth(-1)" title="Previous month" aria-label="Previous month">'+OH_ICO.prev+'</button>'
    +'<div class="oh-mwrap">'
      +'<button class="oh-month'+(ohMpOpen?' is-open':'')+'" onclick="ohToggleMp(event)">'
        +OH_MONTHS[ohView.m]+' '+ohView.y+'<span class="oh-month-chev">'+OH_ICO.chev+'</span></button>'
      +(ohMpOpen?ohMonthPickerHTML():'')
    +'</div>'
    +'<button class="oh-nav" onclick="ohNavMonth(1)" title="Next month" aria-label="Next month">'+OH_ICO.next+'</button>'
  +'</div>';
}

/* ── The month grid ──
   Monday-first, like every other calendar in this app (the timesheet grid and
   apCD both start the week on Monday), and six rows only when the month
   actually needs six. */
function ohCalendarHTML(){
  const y=ohView.y,m=ohView.m;
  const first=new Date(y,m,1);
  const dim=new Date(y,m+1,0).getDate();
  const dow=first.getDay();
  const off=dow===0?6:dow-1;                       // Monday-based leading blanks
  const weeks=Math.ceil((off+dim)/7);
  const today=ohToday();
  const pad=function(n){return n<10?'0'+n:''+n;};

  let cells='';
  for(let w=0;w<weeks;w++){
    for(let c=0;c<7;c++){
      const dn=w*7+c+1-off;
      if(dn<1||dn>dim){cells+='<div class="oh-day is-empty"></div>';continue;}
      const iso=y+'-'+pad(m+1)+'-'+pad(dn);
      const hs=ohOn(iso);
      const h=hs[0]||null;
      const isToday=iso===today;
      let cls='oh-day';
      if(isToday)cls+=' is-today';
      if(h){
        cls+=' is-holiday tone-'+ohTone(h);
        if(ohTab==='optional'&&ohIsApplied(h))cls+=' is-applied';
      }
      const label=h?(dn+' — '+h.name+(ohTab==='optional'?' · '+ohStatus(h):'')):String(dn);
      cells+=(h
        ? '<button type="button" class="'+cls+'" title="'+tsxHtmlSafe(label)+'" onclick="ohShow('+h.id+')">'
        : '<div class="'+cls+'">')
        +'<span class="oh-day-n">'+dn+'</span>'
        +(h?'<span class="oh-day-dots">'
            +hs.slice(0,3).map(function(x){
              const applied=ohTab==='optional'&&ohIsApplied(x);
              return '<span class="oh-dot '+(applied?'is-applied':'tone-'+ohTone(x))+'"></span>';
            }).join('')
          +'</span>':'')
        +(h?'</button>':'</div>');
    }
  }

  const legend=ohTab==='optional'
    ? '<span class="oh-leg"><span class="oh-dot tone-info"></span>Optional Holiday</span>'
      +'<span class="oh-leg"><span class="oh-dot is-applied"></span>Applied (Pending)</span>'
    : '<span class="oh-leg"><span class="oh-dot tone-ok"></span>Public Holiday</span>'
      +'<span class="oh-leg"><span class="oh-dot tone-idle"></span>Company Holiday</span>';

  // The month nav lives in .oh-bar above both columns — see ohBodyHTML.
  return '<div class="oh-cal">'
    +'<div class="oh-grid oh-dow">'+OH_DOW.map(function(d){return '<div class="oh-dow-c">'+d+'</div>';}).join('')+'</div>'
    +'<div class="oh-grid oh-days">'+cells+'</div>'
    +'<div class="oh-legend">'+legend+'</div>'
  +'</div>';
}
function ohMonthPickerHTML(){
  return '<div class="oh-mp" onclick="event.stopPropagation()">'
    +'<div class="oh-mp-head">'
      +'<button class="oh-nav sm" onclick="ohNavYear(-1,event)" title="Previous year">'+OH_ICO.prev+'</button>'
      +'<span class="oh-mp-year">'+ohView.y+'</span>'
      +'<button class="oh-nav sm" onclick="ohNavYear(1,event)" title="Next year">'+OH_ICO.next+'</button>'
    +'</div>'
    +'<div class="oh-mp-grid">'+OH_MON_SHORT.map(function(mn,i){
      /* A month with nothing in it is still reachable — it is just marked, so
         the year can be scanned for where the holidays actually are. */
      const has=ohRows().some(function(h){return ohInMonth(h.date,ohView.y,i);});
      return '<button class="oh-mp-m'+(i===ohView.m?' sel':'')+(has?' has':'')+'" '
        +'onclick="ohPickMonth('+i+',event)">'+mn+'</button>';
    }).join('')+'</div>'
  +'</div>';
}

/* ── The month's list ──
   The calendar says WHEN; this says what and how it stands. Both are needed:
   a tinted square tells you a day is special but not what it is, and a list
   tells you what it is but not how far away. */
function ohEventsHTML(){
  const rows=ohMonthRows();
  const list=rows.length
    ? rows.map(function(h){
        const applied=ohIsApplied(h);
        return '<button type="button" class="oh-ev'+(ohDetailId===h.id?' is-sel':'')+'" onclick="ohShow('+h.id+')">'
          +'<span class="oh-ev-date">'+ohDateLong(h.date).replace(/^(\d+) (\w{3})\w* /,'$1 $2 ')+'</span>'
          +'<span class="oh-ev-name">'+tsxHtmlSafe(h.name)+'</span>'
          +(ohTab==='optional'
            ? '<span class="oh-chip '+(applied?'is-applied':'is-none')+'">'
              +(applied?'Applied (Pending)':'Not Applied')+'</span>'
            : '<span class="oh-chip tone-'+ohTone(h)+'">'
              +String(h.type).replace(/ Holiday$/,'')+'</span>')
        +'</button>';
      }).join('')
    : '<div class="oh-side-empty">No '+(ohTab==='optional'?'optional':'regular')
      +' holidays in '+OH_MONTHS[ohView.m]+'.</div>';
  return '<div class="oh-side-head">This Month Events</div>'+list;
}

/* ── One holiday ──
   The pane answers, in order: which day, what it is, and what you can do about
   it — with the reason spelled out whenever the answer to the last one is
   "nothing". A greyed button that does not say why is a dead end. */
function ohDetailHTML(id){
  const h=ohById(id);
  if(!h)return ohCalendarHTML();
  const isOpt=h.type==='Optional Holiday';
  const year=+String(h.date).slice(0,4);
  const applied=ohIsApplied(h);
  const past=ohIsPast(h.date);
  const avail=ohAvailable(year);
  const p=String(h.date).split('-');

  const row=function(icon,label,value){
    return '<div class="oh-d-row"><span class="oh-d-ico">'+icon+'</span>'
      +'<span class="oh-d-label">'+label+'</span>'
      +'<span class="oh-d-value">'+value+'</span></div>';
  };

  let foot='',note='';
  if(!isOpt){
    note='<p class="oh-d-note">This is a declared holiday — the office is closed and nothing needs to be applied for.</p>';
  }else if(applied){
    note='<p class="oh-d-note is-wait">You have applied for this optional holiday. It is waiting for approval.</p>';
    foot='<button class="oh-btn-ghost" onclick="ohWithdraw('+h.id+')">Withdraw application</button>';
  }else if(past){
    note='<p class="oh-d-note is-bad">This date has already passed, so it can no longer be claimed.</p>';
  }else if(avail<=0){
    note='<p class="oh-d-note is-bad">All '+ohEntitlement()+' optional holidays for '+year
      +' have been used. Withdraw another application to free one up.</p>';
  }else{
    note='<p class="oh-d-note">You can apply for this optional holiday.</p>';
    foot='<button class="oh-btn" onclick="ohApply('+h.id+')">Apply</button>';
  }

  const branches=(typeof hdBranchText==='function')?hdBranchText(h)
    :((h.branches&&h.branches.length)?h.branches.join(', '):'All Branches');

  // Back lives in .oh-bar above both columns — see ohBodyHTML.
  return '<div class="oh-detail">'
    +'<div class="oh-d-card">'
      +'<div class="oh-d-top">'
        +'<div class="oh-d-chip"><span class="oh-d-chip-d">'+(+p[2])+'</span>'
          +'<span class="oh-d-chip-m">'+OH_MON_SHORT[+p[1]-1]+' '+p[0]+'</span></div>'
        +'<div class="oh-d-head">'
          +'<div class="oh-d-name">'+tsxHtmlSafe(h.name)+'</div>'
          +'<span class="oh-chip tone-'+ohTone(h)+'">'+tsxHtmlSafe(h.type)+'</span>'
        +'</div>'
      +'</div>'
      +'<div class="oh-d-rows">'
        +row(OH_ICO.cal,'Date',ohDateLong(h.date))
        +row(OH_ICO.day,'Day',ohDayName(h.date))
        +(isOpt
          ? row(OH_ICO.scale,'Available Optional Holiday Balance',
              '<b>'+avail+'</b> of '+ohEntitlement())
          : row(OH_ICO.pin,'Applies To',tsxHtmlSafe(branches)))
      +'</div>'
      +note
      +(foot?'<div class="oh-d-foot">'+foot+'</div>':'')
    +'</div>'
  +'</div>';
}

// Closes the month popover on any click outside it, the way every other
// popover in the app does.
document.addEventListener('click',function(e){
  if(!ohMpOpen)return;
  if(e.target.closest('.oh-mwrap'))return;
  ohMpOpen=false;ohPaint();
},true);   // capture: popups stop clicks bubbling
