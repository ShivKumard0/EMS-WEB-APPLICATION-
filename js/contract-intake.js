/* ══ IMMIGRATION & CONTRACTOR INTAKE ════════════════════════════════════════
   Three contract types, three intake forms - not four, and not one.

   EOR and PEO share ONE wizard (buildContractFormHTML in pages.js): the PRD
   gives them a single field table ("EOR Deal Creation / Requirement Intake"),
   so a second copy would only ever be a copy that drifts.

   Immigration and Contractor get a form EACH because the PRD writes them
   separate field tables that share almost nothing. PRD 3.1 Step 1 asks an
   Immigration applicant for a Passport Country and a Passport Expiry Date and
   never asks for an address; PRD 3.6 Step 1 asks a contractor for a Tax
   residence country and a Bank country and never asks for a date of birth.
   Neither has a probation period or a leave entitlement, which is most of the
   EOR/PEO wizard's third step.

   ── THE FIELD TABLES ARE THE SPEC ────────────────────────────────────────
   Every field below maps 1:1 to a row of the PRD's tables, in the PRD's order,
   with the PRD's label, input type and mandatory flag. The step names are the
   PRD's step names. Do not add a field here because it seems useful: if it is
   not in the table it is not in the form, and if the table changes this file
   changes with it.

     Immigration  PRD 3.1  Step 1 Basic Details (Eligibility, Worker Information)
                           Step 2 Job & Sponsorship Details
                           Step 3 Supporting Details
     Contractor   PRD 3.6  Step 1 Contractor Request Details (+ Contractor Information)
                           Step 2 Scope, Classification & Commercial Details (+ Compensation)
                           Step 3 Other Details

   ── MANDATORY / OPTIONAL / CONDITIONAL ───────────────────────────────────
   The PRD uses three flags. "Yes" is a red asterisk and blocks Next. "Optional"
   is unmarked. "Conditional" carries a Conditional chip and blocks Next only
   when its trigger is present - and only where the PRD actually names the
   trigger. Where the PRD marks a field Conditional but names no trigger, the
   chip is shown and the field does not block: inventing a gate the spec does
   not state would fail submissions the spec allows. Each derived trigger is
   commented at the predicate that implements it. */

/* ── Option lists ───────────────────────────────────────────────────────────
   Dropdown contents, one place. Where the PRD gives an example value it is in
   the list; the rest are the obvious siblings of that example. */
const CI_COUNTRIES=['Afghanistan','Australia','Austria','Bangladesh','Belgium','Brazil','Canada','China','Denmark','Egypt','Finland','France','Germany','Ghana','Greece','India','Indonesia','Iran','Iraq','Ireland','Italy','Japan','Jordan','Kenya','Malaysia','Mexico','Morocco','Nepal','Netherlands','New Zealand','Nigeria','Norway','Pakistan','Philippines','Poland','Portugal','Qatar','Romania','Russia','Saudi Arabia','Singapore','South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland','Thailand','Turkey','Ukraine','United Arab Emirates','United Kingdom','United States','Vietnam'];
const CI_CURRENCIES=['USD','EUR','GBP','INR','AED','SGD','AUD','CAD','PHP'];
const CI_DIAL=['+91','+1','+44','+49','+31','+33','+34','+61','+63','+65','+971'];
/* PRD 4.3 makes the billing/client entity a configured master. Stubbed with
   the entities the PRD's own examples name (OpenDhi UK Ltd, OpenDhi US Inc). */
const CI_BILLING_ENTITIES=['OpenDhi UK Ltd','OpenDhi US Inc','OpenDhi BV','OpenDhi India Pvt Ltd','OpenDhi Pte Ltd'];
const CI_URGENCY=['Standard','Priority','Critical'];
const CI_PAY_FREQ=['Monthly','Bi-weekly','Weekly','Annually'];

/* ── Shared chrome ──────────────────────────────────────────────────────────
   Small builders, deliberately dumb. They emit markup and nothing else, so the
   same helper serves either form and there is one place to fix a field shape. */
function ciEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function ciCard(title,sub,body){
  return '<section class="ci-card">'
    +'<header class="ci-card-hd"><h3 class="ci-card-title">'+title+'</h3>'
    +(sub?'<p class="ci-card-sub">'+sub+'</p>':'')+'</header>'
    +'<div class="ci-card-body">'+body+'</div></section>';
}
/* mode: true   = PRD "Yes"        - red asterisk, blocks Next
         'cond' = PRD "Conditional" - chip, blocks only on a named trigger
         else   = PRD "Optional"    - unmarked */
function ciField(label,mode,control,hint,full){
  const flag=mode===true?' <span class="req">*</span>'
    :mode==='cond'?' <span class="ci-cond">Conditional</span>':'';
  return '<div class="ci-field'+(full?' ci-full':'')+'">'
    +'<label class="ci-label">'+label+flag+'</label>'
    +control
    +(hint?'<span class="ci-hint">'+hint+'</span>':'')
    +'</div>';
}
function ciGrid(inner,cols){return '<div class="ci-grid'+(cols===3?' ci-grid-3':'')+'">'+inner+'</div>';}
function ciText(id,ph,val,type){return '<input id="'+id+'" class="ci-input" type="'+(type||'text')+'" placeholder="'+ciEsc(ph)+'" value="'+ciEsc(val)+'">';}
function ciNum(id,ph,val,min){return '<input id="'+id+'" class="ci-input" type="number" placeholder="'+ciEsc(ph)+'" value="'+ciEsc(val)+'" min="'+(min==null?0:min)+'">';}
function ciArea(id,ph,val,rows){return '<textarea id="'+id+'" class="ci-input ci-area" rows="'+(rows||4)+'" placeholder="'+ciEsc(ph)+'">'+ciEsc(val)+'</textarea>';}
/* ── The form dropdown ──────────────────────────────────────────────────────
   A native <select> was the wrong control for these forms. Its list is drawn
   by the operating system, so it ignores the product's type, spacing, radius
   and colour entirely - on one machine a grey Windows list, on another a
   rounded macOS sheet - and next to a styled field it reads as a hole in the
   page. It also cannot be searched, and three of these fields offer 54
   countries.

   So: the app's own anchored-menu pattern. The placement arithmetic is NOT
   re-derived here. placeAnchoredMenu in core.js already solves "below if it
   fits, above if THAT fits, otherwise the roomier side with a scroll cap", and
   getting that subtly wrong is exactly how a menu ends up running off the top
   of the screen.

   The value lives in a hidden input carrying the field's id - the same trick
   apCD uses for dates - so everything that already reads a field (ciVal,
   ciRequire, the EOR wizard's gv()) keeps working untouched, and picking an
   option fires a real change event so the error-clearing listener still sees
   it. Swapping the control did not cost a single caller a line.

   Anything longer than CI_DD_SEARCH_AT options gets a search box, because
   scrolling to Vietnam is not an interaction. */
const CI_DD_SEARCH_AT=8;
function ciSelect(id,options,val,ph){
  const opts=(options||[]).map(String);
  const chosen=opts.indexOf(val)!==-1?val:'';
  const searchable=opts.length>CI_DD_SEARCH_AT;
  const chev='<svg class="ci-dd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>';
  const check='<svg class="ci-dd-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
  const mag='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  return '<div class="ci-dd" data-ciddid="'+id+'">'
    +'<input type="hidden" id="'+id+'" value="'+ciEsc(chosen)+'">'
    +'<button type="button" class="ci-dd-trigger'+(chosen?'':' is-placeholder')+'" aria-haspopup="listbox" aria-expanded="false"'
      +' onclick="ciDdToggle(this)" onkeydown="ciDdKey(event)">'
      +'<span class="ci-dd-value">'+ciEsc(chosen||ph||'Select')+'</span>'+chev
    +'</button>'
    +'<div class="ci-dd-menu" role="listbox">'
      +(searchable?'<div class="ci-dd-search">'+mag
        +'<input type="text" class="ci-dd-search-input" placeholder="Search..." autocomplete="off"'
        +' oninput="ciDdFilter(this)" onkeydown="ciDdKey(event)"></div>':'')
      +'<div class="ci-dd-list">'
      +opts.map(function(o){
        return '<button type="button" class="ci-dd-opt'+(o===chosen?' is-on':'')+'" role="option" data-v="'+ciEsc(o)+'" onclick="ciDdPick(this)">'
          +'<span class="ci-dd-opt-txt">'+ciEsc(o)+'</span>'+check+'</button>';
      }).join('')
      +'</div>'
      +'<div class="ci-dd-empty" hidden>No matches</div>'
    +'</div></div>';
}
function ciDdCloseAll(except){
  document.querySelectorAll('.ci-dd.is-open').forEach(function(d){
    if(d===except)return;
    d.classList.remove('is-open');
    const t=d.querySelector('.ci-dd-trigger');if(t)t.setAttribute('aria-expanded','false');
  });
}
function ciDdPlace(dd){
  const trg=dd.querySelector('.ci-dd-trigger'),menu=dd.querySelector('.ci-dd-menu');
  if(!trg||!menu)return;
  const r=trg.getBoundingClientRect();
  placeAnchoredMenu(menu,r,{alignLeft:true,width:r.width});
}
function ciDdToggle(btn){
  const dd=btn.closest('.ci-dd');if(!dd)return;
  const wasOpen=dd.classList.contains('is-open');
  ciDdCloseAll(dd);
  if(wasOpen){dd.classList.remove('is-open');btn.setAttribute('aria-expanded','false');return;}
  /* Class first, then place: placeAnchoredMenu measures the menu, and a menu
     that is still display:none measures zero. */
  dd.classList.add('is-open');btn.setAttribute('aria-expanded','true');
  const s=dd.querySelector('.ci-dd-search-input');
  if(s){s.value='';ciDdFilter(s);}
  ciDdPlace(dd);
  if(s)s.focus();
  const on=dd.querySelector('.ci-dd-opt.is-on')||dd.querySelector('.ci-dd-opt');
  if(on)on.scrollIntoView({block:'nearest'});
}
function ciDdPick(opt){
  const dd=opt.closest('.ci-dd');if(!dd)return;
  const v=opt.dataset.v;
  const inp=dd.querySelector('input[type="hidden"]');
  const val=dd.querySelector('.ci-dd-value');
  const trg=dd.querySelector('.ci-dd-trigger');
  if(inp)inp.value=v;
  if(val)val.textContent=v;
  if(trg){trg.classList.remove('is-placeholder');trg.setAttribute('aria-expanded','false');}
  dd.querySelectorAll('.ci-dd-opt').forEach(function(o){o.classList.remove('is-on','is-active');});
  opt.classList.add('is-on');
  dd.classList.remove('is-open','ci-bad');
  if(trg)trg.focus();
  /* The same event a native select fired, so ciClearMarks and any other change
     handler carry on working without knowing the control was swapped. */
  if(inp)inp.dispatchEvent(new Event('change',{bubbles:true}));
}
function ciDdFilter(inp){
  const dd=inp.closest('.ci-dd');if(!dd)return;
  const q=inp.value.trim().toLowerCase();
  let shown=0;
  dd.querySelectorAll('.ci-dd-opt').forEach(function(o){
    const hit=!q||o.dataset.v.toLowerCase().indexOf(q)!==-1;
    o.hidden=!hit;o.classList.remove('is-active');
    if(hit)shown++;
  });
  const empty=dd.querySelector('.ci-dd-empty');if(empty)empty.hidden=shown>0;
  /* Filtering changes the menu's height, so it has to be re-placed against the
     viewport it was measured for - otherwise a list that shrinks near the
     bottom of the screen keeps the tall menu's upward placement. */
  ciDdPlace(dd);
}
function ciDdKey(e){
  const dd=e.target.closest('.ci-dd');if(!dd)return;
  const trg=dd.querySelector('.ci-dd-trigger');
  const open=dd.classList.contains('is-open');
  if(e.key==='Escape'){
    if(!open)return;
    e.preventDefault();dd.classList.remove('is-open');
    if(trg){trg.setAttribute('aria-expanded','false');trg.focus();}
    return;
  }
  if(!open){
    if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Enter'||e.key===' '){
      e.preventDefault();ciDdToggle(trg);
    }
    return;
  }
  const vis=[].slice.call(dd.querySelectorAll('.ci-dd-opt')).filter(function(o){return !o.hidden;});
  if(!vis.length)return;
  const cur=vis.indexOf(dd.querySelector('.ci-dd-opt.is-active'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    const next=e.key==='ArrowDown'
      ? (cur<0?0:Math.min(vis.length-1,cur+1))
      : (cur<0?vis.length-1:Math.max(0,cur-1));
    vis.forEach(function(o){o.classList.remove('is-active');});
    vis[next].classList.add('is-active');
    vis[next].scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'){
    e.preventDefault();ciDdPick(vis[cur<0?0:cur]);
  }
}
/* Bubble phase, not capture: a trigger's inline onclick runs first, so by the
   time this fires the toggle has already decided. Capture would close the menu
   the click was about to open. */
document.addEventListener('click',function(e){
  if(!e.target.closest('.ci-dd'))ciDdCloseAll();
},true);   // capture: popups stop clicks bubbling
/* A fixed-position menu does not travel with its trigger, so a scroll leaves it
   floating over unrelated content. The fix is to move it, not to close it.

   Closing on any scroll was the first attempt and it was wrong twice over: a
   trackpad nudge threw away an open menu, and scrolling a long list far enough
   to bring an option into view destroyed the menu the option was in - which is
   how this was found, when the browser scrolled the page to reach "India" in a
   54-country list and the menu disappeared underneath it.

   So: re-place against the trigger on every scroll and resize, and close only
   when the trigger itself has left the viewport, where there is nothing left to
   anchor to. Scrolling the menu's own list is not a page scroll and is ignored. */
function ciDdReflow(e){
  const t=e&&e.target;
  if(t&&t.closest&&t.closest('.ci-dd-menu'))return;
  document.querySelectorAll('.ci-dd.is-open').forEach(function(dd){
    const trg=dd.querySelector('.ci-dd-trigger');
    if(!trg)return;
    const r=trg.getBoundingClientRect();
    if(r.bottom<0||r.top>window.innerHeight){
      dd.classList.remove('is-open');
      trg.setAttribute('aria-expanded','false');
    }else{
      ciDdPlace(dd);
    }
  });
}
window.addEventListener('scroll',ciDdReflow,true);
window.addEventListener('resize',ciDdReflow);
/* PRD types Contact Number as "Number Input", but every example carries a dial
   code ("+91 9876543210") and a number input cannot hold one. Dial code and
   subscriber number, presented as the single field the table names. */
function ciPhone(id,dialId,val,dialVal){
  return '<div class="ci-phone">'+ciSelect(dialId,CI_DIAL,dialVal||'+91','+91')
    +'<input id="'+id+'" class="ci-input" type="tel" placeholder="Contact number" value="'+ciEsc(val)+'"></div>';
}
/* Same reasoning for Immigration's salary: PRD 3.1 Step 2 types it Numeric but
   gives "EUR 85,000" as the value and lists no separate currency row, so the
   currency rides inside this one field. Contractor keeps them apart because
   PRD 3.6 Step 2 DOES list Currency and Pay amount as two rows. */
function ciMoney(id,curId,val,curVal){
  return '<div class="ci-money">'+ciSelect(curId,CI_CURRENCIES,curVal||'EUR','EUR')
    +'<input id="'+id+'" class="ci-input" type="number" step="0.01" min="0" placeholder="0.00" value="'+ciEsc(val)+'"></div>';
}

/* THE RADIO GROUP, AND THERE IS ONLY ONE OF IT. Every one-of-N answer in the
   app — this wizard's questions, the PEO wizard's, the leave form's duration,
   and every creation modal's — draws this same .segmented strip, the control
   the forms already used. It was briefly a set of bordered .ci-radio tiles;
   the strip is what the product wants, so the tile is gone rather than
   sitting in the CSS waiting to be picked up again by mistake.

   Selection lives in the DOM — a class on the chosen button — because the
   step is re-rendered from scratch on every repaint and a variable would have
   to be written back on every click anyway.

   `compact` sizes the strip to its buttons instead of the row, for the Yes/No
   pairs that would otherwise stretch the width of a card. `onpick` is a JS
   expression run after the selection lands, for a group that changes the form
   around it (the rule builder's Value Type swaps the field under it). */
/* `onpick` is a JS expression run after the selection lands, for a group that
   changes the form around it — the rule builder's Value Type swaps the field
   under it for a percentage one. Everything else leaves it off. */
function ciRadio(group,options,selected,compact,onpick){
  return '<div class="segmented'+(compact?' is-compact':'')+'" data-cigroup="'+group+'">'
    +options.map(function(o){
      const on=o===selected;
      return '<button type="button" class="seg-btn'+(on?' active':'')+'" data-civalue="'+ciEsc(o)+'" onclick="ciPick(this)'+(onpick?';'+onpick:'')+'">'
        +ciEsc(o)+'</button>';
    }).join('')
    +'</div>';
}
function ciPick(el){
  const set=el.closest('.segmented');if(!set)return;
  set.querySelectorAll('.seg-btn').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  set.classList.remove('ci-bad');
}
function ciPicked(group,fallback){
  const on=document.querySelector('.segmented[data-cigroup="'+group+'"] .seg-btn.active');
  return on?on.dataset.civalue:(fallback||'');
}

function ciStepper(steps,step,goFn){
  return '<nav class="ci-stepper">'+steps.map(function(s,i){
    const state=i<step?'is-done':i===step?'is-on':'';
    return '<button type="button" class="ci-step '+state+'" onclick="'+goFn+'('+i+')">'
      +'<span class="ci-step-no">'+(i<step
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
        : (i+1))+'</span>'
      +'<span class="ci-step-lbl">'+s+'</span>'
      +(i<steps.length-1?'<span class="ci-step-bar"></span>':'')
      +'</button>';
  }).join('')+'</nav>';
}
function ciHead(typeKey,noun,backFn){
  const cfg=CT_TYPES[typeKey];
  const arrow='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
  return '<div class="ci-top">'
    +'<button class="ep-back" onclick="'+backFn+'">'+arrow+' Back</button>'
    +'<span class="ci-type-pill">'+sbIco[cfg.icon]+cfg.label+'</span>'
    +'</div>'
    +'<header class="ci-head">'
    +'<h1 class="ci-title">New '+cfg.label+' '+noun+'</h1>'
    +'<p class="ci-sub">'+cfg.blurb+'</p>'
    +'</header>';
}
/* PRD 3.1 / 3.6: "Request supports Draft and Submitted states." Save Draft is
   on every step, not only the last - an intake abandoned on step 1 is exactly
   the case Draft exists for. */
function ciFoot(backFn,draftFn,nextFn,isLast,lastLabel){
  const arrow='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
  return '<div class="ci-foot">'
    +'<button class="ep-cancel-btn ci-btn-back" onclick="'+backFn+'">'+arrow+'Back</button>'
    +'<div class="ci-foot-right">'
    +'<button class="ep-cancel-btn ci-btn-draft" onclick="'+draftFn+'">Save Draft</button>'
    +'<button class="ep-save-btn ci-btn-next" onclick="'+nextFn+'">'+(isLast?lastLabel:'Next')+'</button>'
    +'</div></div>';
}

/* Marks the offending fields and scrolls to the first. Required fields are
   checked on the step that asked for them, not at Submit. A pair carrying
   `when:false` is a Conditional field whose trigger is absent - skipped. */
function ciRequire(pairs){
  let first=null;
  pairs.forEach(function(p){
    if(p.when===false)return;
    const target=p.group
      ? document.querySelector('.segmented[data-cigroup="'+p.group+'"]')
      : document.getElementById(p.id);
    if(!target)return;
    const bad=p.group?!ciPicked(p.group):!String(target.value||'').trim();
    /* A date field's id belongs to apCD's hidden input and a dropdown's to its
       own; neither can show a red border or be scrolled to. Mark the wrapper it
       lives in instead. */
    const mark=target.type==='hidden'?(target.closest('.cd-wrap,.ci-dd')||target):target;
    mark.classList.toggle('ci-bad',bad);
    if(bad&&!first)first=mark;
  });
  if(first){
    first.scrollIntoView({behavior:'smooth',block:'center'});
    showToast('Some details are missing','error','Fill the highlighted fields to continue.');
    return false;
  }
  return true;
}
/* Clear an error mark the moment the field stops being empty. One delegated
   listener rather than a handler per field: every step is rebuilt by innerHTML,
   so per-field handlers would need re-attaching on every repaint and the one
   that got missed would be the bug. The click pass is for the date picker,
   which writes into a hidden input and fires no input event of its own. */
document.addEventListener('input',ciClearMarks,true);
document.addEventListener('change',ciClearMarks,true);
document.addEventListener('click',function(){setTimeout(ciClearMarks,0);},true);
function ciClearMarks(e){
  const t=e&&e.target;
  if(t&&t.classList&&t.classList.contains('ci-bad')&&String(t.value||'').trim())t.classList.remove('ci-bad');
  document.querySelectorAll('.cd-wrap.ci-bad,.ci-dd.ci-bad').forEach(function(w){
    const inp=w.querySelector('input[type="hidden"]');
    if(inp&&String(inp.value||'').trim())w.classList.remove('ci-bad');
  });
}
function ciVal(id){const el=document.getElementById(id);return el?String(el.value||'').trim():'';}
function ciDate(id){const el=document.getElementById(id);return el?el.value:'';}
/* A Yes/No answer becomes a checklist row only when it means work. */
function ciDoc(list,on,item,note){if(on)list.push({item:item,note:note||'Mandatory',status:'Pending',doc:null});}

/* ── One writer for every intake ────────────────────────────────────────────
   The listing, the filters and the detail panel all read contractsData, so an
   Immigration record has to answer the same field names an EOR record does
   even where the word is a stretch (empName is the party of record, which PRD
   section 3 calls the Client / Worker Name). What each form varies is what it
   PUTS there, which is why this takes finished values, not raw form state. */
function ciCommitContract(o){
  const now=aiFormatNow();
  const newId=contractsData.reduce(function(m,c){return Math.max(m,c.id);},0)+1;
  const record={
    id:newId,contractId:String(90000+Math.floor(Math.random()*9999)),
    empName:o.name,empDesig:o.jobTitle||'—',country:o.country||'—',
    type:o.type,serviceType:o.serviceType,date:now.date+' '+now.time,
    status:o.status||'Submitted',
    nationality:o.nationality||o.country||'—',countryOfOp:o.country||'—',
    workPermit:o.workPermit===true,gender:(o.gender||'').toUpperCase()||'—',
    email:o.email||'—',contact:o.contact||'—',dob:o.dob||'—',
    jobTitle:o.jobTitle||'—',skill:o.skill||'—',
    empDuration:(o.fromDate||now.date)+(o.toDate?' – '+o.toDate:''),
    empType:o.type,workSchedule:o.hours||'—',
    payAmount:o.pay||'—',currency:o.currency||'EUR',
    jobDesc:o.jobDesc||'—',payFrequency:o.payFrequency||'Monthly',
    commercial:aiGenCommercial(o.pay),
    complianceItems:o.complianceItems&&o.complianceItems.length?o.complianceItems:[{item:o.type+' intake review',note:'Mandatory',status:'Pending',doc:null}]
  };
  contractsData.unshift(record);
  /* PRD 3.1 / 3.6 audit logs: *_REQUEST_CREATED on a draft, *_REQUEST_SUBMITTED
     on submit. The log line the caller passes says which. */
  const draft=record.status==='Draft';
  ctLogsData[newId]=[{date:now.date,time:now.time,user:'Shaun Mathew',status:record.status,action:o.logLine}];
  ctWorkflowData[newId]=[{title:draft?'Request Created':'Request Submitted',user:'Shaun Mathew',date:now.date,time:now.time,description:o.workflowLine}];
  /* Land on the list, filtered to the type just created, with the new row on
     page one. Back to the four-card chooser would hide the thing that was just
     made behind a screen asking what to make. */
  lpLanded('contracts',newId);
  ctTypeFilter=ctTypeKey(o.type);
  ctQuickStatusFilter='';ctCountryFilter='';ctSearchQuery='';
  ctSelectedId=null;ctLandingOpen=false;
  page='contracts';
  renderADTPage();
  showToast(o.type+' request '+(draft?'saved as draft':'submitted'),'success',
    '"'+o.name+'" is now in '+record.status+'.');
  return record;
}

/* ══ IMMIGRATION - PRD 3.1 ══════════════════════════════════════════════════
   A case, not a hire. The subject may never become anyone's employee - a
   dependent visa and a business-travel permit both run through here. */
const IMG_STEPS=['Basic Details','Job & Sponsorship Details','Supporting Details'];
const IMG_EMPLOYMENT_MODELS=['EOR','PEO','Direct'];
const IMG_ASSIGNMENT_LENGTH=['Short-term','Long-term','Permanent'];
const IMG_DEPENDENTS=['None','Spouse','Children','Spouse + children'];
const IMG_ROUTES=['EU Blue Card','Skilled Worker','Intra-Company Transfer','Highly Skilled Migrant','Dependent / Family permit','Business visitor','Not known'];
const IMG_SERVICE_LEVEL=['Standard','Priority'];
var imgStep=0;
var imgData={};

function imgOpenIntake(){imgStep=0;imgData={};page='contract-immigration';renderADTPage();}

/* PRD 3.1 Step 1 marks "Dependents included" Conditional. The only trigger the
   document names for it is the dependent-visa service type. */
function imgDependentsRequired(){return (ciVal('img-service')||imgData.serviceType)==='Dependent visa support';}

function imgCapture(){
  const d=imgData;
  const set=function(k,v){if(v!==undefined&&v!=='')d[k]=v;};
  if(imgStep===0){
    /* Section: Eligibility */
    set('nationality',ciVal('img-nationality'));
    set('destination',ciVal('img-destination'));
    set('residence',ciVal('img-residence'));
    set('authorized',ciPicked('img-authorized'));
    set('serviceType',ciVal('img-service'));
    set('urgency',ciVal('img-urgency'));
    set('dependents',ciPicked('img-dependents'));
    /* Section: Worker Information */
    set('fname',ciVal('img-fname'));set('lname',ciVal('img-lname'));
    set('email',ciVal('img-email'));
    set('dial',ciVal('img-dial'));set('contact',ciVal('img-contact'));
    set('dob',ciDate('img-dob'));
    set('passportCountry',ciVal('img-passport-country'));
    set('passportExpiry',ciDate('img-passport-expiry'));
    set('currentEmployer',ciVal('img-current-employer'));
    set('plannedStart',ciDate('img-planned-start'));
  }else if(imgStep===1){
    set('jobTitle',ciVal('img-jobtitle'));
    set('workCity',ciVal('img-work-city'));
    set('employmentModel',ciVal('img-emp-model'));
    set('currency',ciVal('img-currency'));set('salary',ciVal('img-salary'));
    set('payFrequency',ciVal('img-pay-freq'));
    set('assignmentLength',ciVal('img-assignment-length'));
    set('route',ciVal('img-route'));
    set('justification',ciVal('img-justification'));
    set('wageThresholdMet',ciPicked('img-wage-threshold'));
  }else{
    set('educationAvailable',ciPicked('img-education'));
    set('priorHistory',ciVal('img-prior-history'));
    set('declarationsRequired',ciPicked('img-declarations'));
    set('translationRequired',ciPicked('img-translation'));
    set('apostilleRequired',ciPicked('img-apostille'));
    set('serviceLevel',ciVal('img-service-level'));
    set('billingEntity',ciVal('img-billing-entity'));
    set('specialNotes',ciVal('img-special-notes'));
  }
}
function imgGoStep(s){
  /* Backwards is free; forwards past an unfinished step is not, or the stepper
     becomes a way around the validation the Next button enforces. */
  if(s>imgStep&&!imgValidate())return;
  imgCapture();imgStep=s;renderADTPage();
}
function imgNext(){
  if(!imgValidate())return;
  imgCapture();imgStep=Math.min(IMG_STEPS.length-1,imgStep+1);renderADTPage();
}
function imgBack(){
  imgCapture();
  if(imgStep===0){ctIntakeExit();return;}
  imgStep--;renderADTPage();
}
function imgValidate(){
  if(imgStep===0)return ciRequire([
    {id:'img-nationality'},{id:'img-destination'},{id:'img-residence'},
    {group:'img-authorized'},{id:'img-service'},
    {group:'img-dependents',when:imgDependentsRequired()},
    {id:'img-fname'},{id:'img-lname'},{id:'img-email'},{id:'img-contact'},
    {id:'img-dob'},{id:'img-passport-country'},{id:'img-passport-expiry'},
    {id:'img-planned-start'}
  ]);
  if(imgStep===1)return ciRequire([
    {id:'img-jobtitle'},{id:'img-work-city'},{id:'img-emp-model'},
    {id:'img-salary'},{id:'img-pay-freq'},{id:'img-assignment-length'}
  ]);
  return ciRequire([{id:'img-service-level'},{id:'img-billing-entity'}]);
}
/* PRD 3.1: "Request supports Draft and Submitted states." A draft skips
   validation by design - it exists to hold an incomplete intake. */
function imgSaveDraft(){imgCapture();imgCommit('Draft');}
function imgSubmit(){if(!imgValidate())return;imgCapture();imgCommit('Submitted');}

function imgCommit(status){
  const d=imgData;
  const name=((d.fname||'')+' '+(d.lname||'')).trim()||'Unnamed applicant';
  const svc=d.serviceType||CT_TYPES.IMMIGRATION.svcTypes[0];
  /* PRD 3.5 lists the checklist categories; WHICH of them apply is decided by
     the Step 3 answers rather than by a fixed list, so a case is only chased
     for the documents its own intake said it needs. */
  const docs=[{item:'Passport copy - '+(d.passportCountry||'—')+', expires '+(d.passportExpiry||'—'),note:'Mandatory',status:'Pending',doc:null}];
  ciDoc(docs,d.educationAvailable==='Yes','Educational credentials');
  ciDoc(docs,d.declarationsRequired==='Yes','Criminal / compliance declarations');
  ciDoc(docs,d.translationRequired==='Yes','Certified document translations');
  ciDoc(docs,d.apostilleRequired==='Yes','Apostille / notarisation');
  ciDoc(docs,!!d.dependents&&d.dependents!=='None','Dependent civil documents ('+d.dependents+')');
  ciDoc(docs,!!d.route,'Sponsorship route: '+d.route,'Optional');
  ciDoc(docs,d.wageThresholdMet==='No','Salary threshold shortfall - review before filing');
  ciCommitContract({
    type:'Immigration',serviceType:svc,name:name,status:status,
    country:d.destination||'—',nationality:d.nationality||'—',
    workPermit:d.authorized==='Yes',
    email:d.email,contact:((d.dial||'+91')+' '+(d.contact||'')).trim(),dob:d.dob,
    jobTitle:d.jobTitle,skill:d.route||'—',jobDesc:d.justification||d.specialNotes,
    fromDate:d.plannedStart,toDate:'',
    hours:'—',pay:d.salary,currency:d.currency||'EUR',payFrequency:d.payFrequency||'Monthly',
    complianceItems:docs,
    logLine:status==='Draft'
      ? svc+' request created as a draft.'
      : svc+' request submitted for '+(d.destination||'the destination country')+'. Awaiting proposal.',
    workflowLine:'Immigration request ('+svc+') for '+name+'. Route: '+(d.nationality||'—')+' to '+(d.destination||'—')+'.'
  });
}

function buildImmigrationIntakeHTML(){
  const d=imgData;
  const cfg=CT_TYPES.IMMIGRATION;
  let body='';

  if(imgStep===0){
    body=ciCard('Eligibility','Whether we can run this case at all, and which route it runs on.',
        ciGrid(
          ciField('Employee Nationality',true,ciSelect('img-nationality',CI_COUNTRIES,d.nationality,'Select country'))
          +ciField('Country of intended employment',true,ciSelect('img-destination',CI_COUNTRIES,d.destination,'Select country'),'The authority this case is filed with.')
          +ciField('Current country of residence',true,ciSelect('img-residence',CI_COUNTRIES,d.residence,'Select country'))
          +ciField('Immigration service type',true,ciSelect('img-service',cfg.svcTypes,d.serviceType,'Select service type'))
        )
        +ciField('Is worker authorized to work in target country?',true,
          ciRadio('img-authorized',['Yes','No'],d.authorized||'',true),'',true)
        +ciGrid(
          ciField('Urgency level',false,ciSelect('img-urgency',CI_URGENCY,d.urgency||'Standard','Select'))
        )
        +ciField('Dependents included','cond',
          ciRadio('img-dependents',IMG_DEPENDENTS,d.dependents||'',true),
          'Required when the service type is Dependent visa support. Each dependent is filed as a linked application.',true))
      +ciCard('Worker Information','The person on the application. Names must match the passport exactly.',
        ciGrid(
          ciField('First Name',true,ciText('img-fname','First name',d.fname))
          +ciField('Last Name',true,ciText('img-lname','Last name',d.lname))
          +ciField('Email ID',true,ciText('img-email','anika@example.com',d.email,'email'))
          +ciField('Contact Number',true,ciPhone('img-contact','img-dial',d.contact,d.dial))
          +ciField('Date of Birth',true,apCD('img-dob',d.dob||'','Select date'))
          +ciField('Passport Country',true,ciSelect('img-passport-country',CI_COUNTRIES,d.passportCountry,'Select country'))
          +ciField('Passport Expiry Date',true,apCD('img-passport-expiry',d.passportExpiry||'','Select date'),'Most authorities want six months&rsquo; validity beyond the intended stay.')
          +ciField('Planned start date',true,apCD('img-planned-start',d.plannedStart||'','Select date'))
        )
        +ciField('Current employer / employment status',false,ciText('img-current-employer','e.g. Software Engineer - employed',d.currentEmployer),'',true));
  }

  if(imgStep===1){
    body=ciCard('Job &amp; Sponsorship Details','What the applicant will be doing and who is sponsoring it. Most skilled-worker routes test the role, not the person.',
        ciGrid(
          ciField('Job Title',true,ciText('img-jobtitle','e.g. Senior Backend Engineer',d.jobTitle))
          +ciField('Work location city',true,ciText('img-work-city','e.g. Berlin',d.workCity))
          +ciField('Employment model',true,ciSelect('img-emp-model',IMG_EMPLOYMENT_MODELS,d.employmentModel,'Select model'))
          +ciField('Salary / compensation offered',true,ciMoney('img-salary','img-currency',d.salary,d.currency),'Checked against the route&rsquo;s salary threshold.')
          +ciField('Pay frequency',true,ciSelect('img-pay-freq',CI_PAY_FREQ,d.payFrequency||'Monthly','Select'))
          +ciField('Expected assignment length',true,ciSelect('img-assignment-length',IMG_ASSIGNMENT_LENGTH,d.assignmentLength,'Select'))
          +ciField('Sponsorship route known?',false,ciSelect('img-route',IMG_ROUTES,d.route,'Select route'),'Leave blank and the Mobility Specialist will assess it.')
        )
        +ciField('Business justification / urgency',false,ciArea('img-justification','e.g. Critical engineering hire for Q4 launch',d.justification,3),'',true)
        +ciField('Prevailing wage / salary threshold met','cond',
          ciRadio('img-wage-threshold',['Yes','No'],d.wageThresholdMet||'',true),
          'Applies on routes that publish a salary floor. A No here is flagged to the specialist before filing.',true));
  }

  if(imgStep===2){
    body=ciCard('Supporting Details','What the case will need collected, translated and declared. Everything answered Yes becomes a checklist row on the case.',
        ciField('Education credentials available','cond',
          ciRadio('img-education',['Yes','No'],d.educationAvailable||'',true),'',true)
        +ciField('Prior immigration history in target country',false,
          ciArea('img-prior-history','e.g. Student visa in 2020',d.priorHistory,3),
          'Undeclared refusals are the most common cause of a case failing after filing.',true)
        +ciField('Criminal / compliance declarations required','cond',
          ciRadio('img-declarations',['Yes','No'],d.declarationsRequired||'',true),'',true)
        +ciGrid(
          ciField('Document translation required',false,ciRadio('img-translation',['Yes','No'],d.translationRequired||'',true))
          +ciField('Apostille / notarization required',false,ciRadio('img-apostille',['Yes','No'],d.apostilleRequired||'',true))
        )
        +ciGrid(
          ciField('Preferred service level',true,ciSelect('img-service-level',IMG_SERVICE_LEVEL,d.serviceLevel,'Select'))
          +ciField('Billing entity',true,ciSelect('img-billing-entity',CI_BILLING_ENTITIES,d.billingEntity,'Select entity'))
        )
        +ciField('Special notes',false,ciArea('img-special-notes','e.g. Candidate has accompanying spouse',d.specialNotes,3),'',true));
  }

  const isLast=imgStep===IMG_STEPS.length-1;
  return '<div class="ci-page">'
    +ciHead('IMMIGRATION','Request','imgBack()')
    +ciStepper(IMG_STEPS,imgStep,'imgGoStep')
    +body
    +ciFoot('imgBack()','imgSaveDraft()',isLast?'imgSubmit()':'imgNext()',isLast,'Submit Request')
    +'</div>';
}

/* ══ CONTRACTOR - PRD 3.6 ═══════════════════════════════════════════════════
   An engagement, not an employment. PRD 3.6 Step 2 carries the classification
   questions inline - supervision model, tools, exclusivity, IP transfer, local
   classification review - and the gate they feed sits at contract generation
   (User Story 11), not at intake. The intake records the answers; it does not
   score them. */
const CNR_STEPS=['Contractor Request Details','Scope, Classification & Commercial Details','Other Details'];
const CNR_ENGAGEMENT=['Fixed Fee','Pay As You Go','Milestone'];
const CNR_LENGTH=['3 months','6 months','12 months','Ongoing'];
const CNR_TOOLS=['None - contractor provides own','Laptop only','Laptop + peripherals','Full equipment'];
const CNR_INVOICE_METHOD=['Platform-generated invoice','Contractor-uploaded invoice','Milestone-based invoice'];
const CNR_EXPENSES=['No','Yes - with approval','Yes - unrestricted'];
const CNR_VAT=['VAT added if applicable','No VAT','Reverse charge'];
const CNR_PAYMENT_METHOD=['Bank Transfer','Wallet','Local payout partner'];
const CNR_FEE_MODEL=['Per contractor','Percentage of invoice','Flat fee'];
const CNR_PAY_FREQ=['Monthly','Bi-weekly','Weekly','Per milestone'];
/* Months per contract-length option, so the engagement's end date can be shown
   on the record without asking for a date the PRD does not collect. */
const CNR_LENGTH_MONTHS={'3 months':3,'6 months':6,'12 months':12};
var cnrStep=0;
var cnrData={};

function cnrOpenIntake(){cnrStep=0;cnrData={};page='contract-contractor';renderADTPage();}

/* PRD 3.6 Step 1 marks "Local registration number / tax ID available"
   Conditional; the trigger the table implies is an Entity contractor, which
   cannot invoice as one without a registration. */
function cnrIsEntity(){return ciPicked('cnr-party',cnrData.party)==='Entity';}
/* PRD 3.6 Step 3 marks "SOW required" Conditional. A Fixed Fee or Milestone
   engagement cannot be billed without a statement of work to bill against. */
function cnrSowRequired(){
  const t=ciVal('cnr-engagement')||cnrData.engagementType;
  return t==='Milestone'||t==='Fixed Fee';
}

function cnrCapture(){
  const d=cnrData;
  const set=function(k,v){if(v!==undefined&&v!=='')d[k]=v;};
  if(cnrStep===0){
    set('workCountry',ciVal('cnr-work-country'));
    set('nationality',ciVal('cnr-nationality'));
    set('billingEntity',ciVal('cnr-billing-entity'));
    set('serviceType',ciVal('cnr-service'));
    set('workerExists',ciPicked('cnr-worker-exists'));
    set('startDate',ciDate('cnr-start'));
    set('urgency',ciVal('cnr-urgency'));
    /* Section: Contractor Information */
    set('fname',ciVal('cnr-fname'));set('lname',ciVal('cnr-lname'));
    set('email',ciVal('cnr-email'));
    set('dial',ciVal('cnr-dial'));set('contact',ciVal('cnr-contact'));
    set('party',ciPicked('cnr-party'));
    set('taxResidence',ciVal('cnr-tax-residence'));
    set('bankCountry',ciVal('cnr-bank-country'));
    set('taxIdAvailable',ciPicked('cnr-taxid'));
  }else if(cnrStep===1){
    set('roleDescription',ciVal('cnr-role-desc'));
    set('engagementType',ciVal('cnr-engagement'));
    set('weeklyHours',ciVal('cnr-hours'));
    set('contractLength',ciVal('cnr-length'));
    set('reportingLine',ciVal('cnr-reporting'));
    set('tools',ciPicked('cnr-tools'));
    set('exclusivity',ciPicked('cnr-exclusivity'));
    set('ipTransfer',ciPicked('cnr-ip'));
    set('classificationReview',ciPicked('cnr-classification'));
    /* Section: Compensation */
    set('currency',ciVal('cnr-currency'));
    set('payAmount',ciVal('cnr-pay-amount'));
    set('payFrequency',ciVal('cnr-pay-freq'));
    set('invoiceMethod',ciVal('cnr-invoice-method'));
    set('expensesAllowed',ciPicked('cnr-expenses'));
    set('vatHandling',ciVal('cnr-vat'));
    set('paymentMethod',ciVal('cnr-payment-method'));
    set('feeModel',ciVal('cnr-fee-model'));
  }else{
    set('backgroundCheck',ciPicked('cnr-bgcheck'));
    set('ndaRequired',ciPicked('cnr-nda'));
    set('sowRequired',ciPicked('cnr-sow'));
    set('noticePeriod',ciVal('cnr-notice'));
    set('dpaRequired',ciPicked('cnr-dpa'));
    set('specialClauses',ciVal('cnr-special-clauses'));
  }
}
function cnrGoStep(s){
  if(s>cnrStep&&!cnrValidate())return;
  cnrCapture();cnrStep=s;renderADTPage();
}
function cnrNext(){
  if(!cnrValidate())return;
  cnrCapture();cnrStep=Math.min(CNR_STEPS.length-1,cnrStep+1);renderADTPage();
}
function cnrBack(){
  cnrCapture();
  if(cnrStep===0){ctIntakeExit();return;}
  cnrStep--;renderADTPage();
}
function cnrValidate(){
  if(cnrStep===0)return ciRequire([
    {id:'cnr-work-country'},{id:'cnr-nationality'},{id:'cnr-billing-entity'},
    {id:'cnr-service'},{id:'cnr-start'},
    {id:'cnr-fname'},{id:'cnr-lname'},{id:'cnr-email'},{id:'cnr-contact'},
    {group:'cnr-party'},{id:'cnr-tax-residence'},
    {group:'cnr-taxid',when:cnrIsEntity()}
  ]);
  if(cnrStep===1)return ciRequire([
    {id:'cnr-role-desc'},{id:'cnr-engagement'},{id:'cnr-hours'},{id:'cnr-length'},
    {id:'cnr-reporting'},{group:'cnr-ip'},{group:'cnr-classification'},
    {id:'cnr-currency'},{id:'cnr-pay-amount'},{id:'cnr-pay-freq'},
    {id:'cnr-invoice-method'},{id:'cnr-fee-model'}
  ]);
  return ciRequire([
    {group:'cnr-sow',when:cnrSowRequired()},
    {id:'cnr-notice'}
  ]);
}
function cnrSaveDraft(){cnrCapture();cnrCommit('Draft');}
function cnrSubmit(){if(!cnrValidate())return;cnrCapture();cnrCommit('Submitted');}

function cnrCommit(status){
  const d=cnrData;
  const name=((d.fname||'')+' '+(d.lname||'')).trim()||'Unnamed contractor';
  const svc=d.serviceType||CT_TYPES.CONTRACTOR.svcTypes[0];
  /* PRD 3.6 collects no role TITLE, only a role/service description, but the
     listing prints a second line under the name. Take the description's first
     line rather than inventing a field the spec does not have. */
  const firstLine=String(d.roleDescription||'').trim().split('\n')[0];
  const title=firstLine?(firstLine.slice(0,48)+(firstLine.length>48?'…':'')):'—';
  /* PRD 3.9 checklist categories, selected by this intake's own answers. */
  const docs=[
    {item:'Signed contractor agreement',note:'Mandatory',status:'Pending',doc:null},
    {item:'Identity verification (KYC)',note:'Mandatory',status:'Pending',doc:null},
    {item:'Bank / payout details'+(d.bankCountry?' - '+d.bankCountry:''),note:'Mandatory',status:'Pending',doc:null}
  ];
  ciDoc(docs,d.classificationReview==='Yes','Local classification review');
  ciDoc(docs,d.party==='Entity','Company registration documents');
  ciDoc(docs,d.taxIdAvailable==='Yes','Local registration number / tax ID');
  ciDoc(docs,d.ndaRequired==='Yes','Signed NDA');
  ciDoc(docs,d.sowRequired==='Yes','Statement of Work');
  ciDoc(docs,d.dpaRequired==='Yes','Data protection addendum');
  ciDoc(docs,d.backgroundCheck==='Yes','Background check');
  /* An end date the PRD never asks for, derived from the length it does. */
  let toDate='';
  const months=CNR_LENGTH_MONTHS[d.contractLength];
  if(months&&d.startDate){
    const s=new Date(d.startDate);
    if(!isNaN(s.getTime())){s.setMonth(s.getMonth()+months);toDate=s.toISOString().split('T')[0];}
  }
  ciCommitContract({
    type:'Contractor',serviceType:svc,name:name,status:status,
    country:d.workCountry||'—',nationality:d.nationality||'—',
    workPermit:true,
    email:d.email,contact:((d.dial||'+91')+' '+(d.contact||'')).trim(),
    jobTitle:title,skill:d.engagementType||'—',jobDesc:d.roleDescription,
    fromDate:d.startDate,toDate:toDate,
    hours:d.weeklyHours,pay:d.payAmount,currency:d.currency||'USD',
    payFrequency:d.payFrequency||'Monthly',
    complianceItems:docs,
    logLine:status==='Draft'
      ? svc+' request created as a draft.'
      : svc+' request submitted'+(d.classificationReview==='Yes'?'. Local classification review required before contract issuance.':'.'),
    workflowLine:'Contractor request ('+svc+') for '+name+' in '+(d.workCountry||'—')+', billed by '+(d.billingEntity||'—')+'.'
  });
}

function buildContractorIntakeHTML(){
  const d=cnrData;
  const cfg=CT_TYPES.CONTRACTOR;
  let body='';

  if(cnrStep===0){
    body=ciCard('Contractor Request Details','Where the work happens and who is billed for it. Both decide which country rules apply.',
        ciGrid(
          ciField('Country where contractor will work',true,ciSelect('cnr-work-country',CI_COUNTRIES,d.workCountry,'Select country'),'Not necessarily where the client is.')
          +ciField('Worker nationality',true,ciSelect('cnr-nationality',CI_COUNTRIES,d.nationality,'Select country'))
          +ciField('Client entity / billing entity',true,ciSelect('cnr-billing-entity',CI_BILLING_ENTITIES,d.billingEntity,'Select entity'))
          +ciField('Service type',true,ciSelect('cnr-service',cfg.svcTypes,d.serviceType,'Select service type'))
          +ciField('Expected start date',true,apCD('cnr-start',d.startDate||'','Select date'))
          +ciField('Urgency level',false,ciSelect('cnr-urgency',CI_URGENCY,d.urgency||'Standard','Select'))
        )
        +ciField('Does worker already exist?',false,
          ciRadio('cnr-worker-exists',['Yes','No'],d.workerExists||'',true),
          'Yes links this engagement to an existing worker record instead of creating one.',true))
      +ciCard('Contractor Information','Who is being engaged, and in what capacity.',
        ciGrid(
          ciField('First Name',true,ciText('cnr-fname','First name',d.fname))
          +ciField('Last Name',true,ciText('cnr-lname','Last name',d.lname))
          +ciField('Email ID',true,ciText('cnr-email','luis@example.com',d.email,'email'))
          +ciField('Contact Number',true,ciPhone('cnr-contact','cnr-dial',d.contact,d.dial))
          +ciField('Tax residence country',true,ciSelect('cnr-tax-residence',CI_COUNTRIES,d.taxResidence,'Select country'))
          +ciField('Bank country',false,ciSelect('cnr-bank-country',CI_COUNTRIES,d.bankCountry,'Select country'))
        )
        +ciField('Individual or Entity contractor',true,
          ciRadio('cnr-party',['Individual','Entity'],d.party||'',true),
          'An entity carries its own invoicing and tax identity; an individual does not.',true)
        +ciField('Local registration number / tax ID available','cond',
          ciRadio('cnr-taxid',['Yes','No'],d.taxIdAvailable||'',true),
          'Required for an Entity contractor, which cannot invoice without one.',true));
  }

  if(cnrStep===1){
    body=ciCard('Scope, Classification &amp; Commercial Details','How the work will actually run. These answers are what a local authority tests when it decides whether this is really a contractor engagement.',
        ciField('Role / service description',true,
          ciArea('cnr-role-desc','e.g. Frontend development services',d.roleDescription,4),
          'Appears on the contract under &ldquo;Services&rdquo;.',true)
        +ciGrid(
          ciField('Engagement type',true,ciSelect('cnr-engagement',CNR_ENGAGEMENT,d.engagementType,'Select type'))
          +ciField('Expected weekly hours / utilization',true,ciNum('cnr-hours','e.g. 30',d.weeklyHours))
          +ciField('Contract length',true,ciSelect('cnr-length',CNR_LENGTH,d.contractLength,'Select length'))
        ,3)
        +ciField('Reporting line / supervision model',true,
          ciArea('cnr-reporting','e.g. Reports to Product Lead',d.reportingLine,3),
          'Day-to-day supervision is the strongest single indicator of employment rather than contracting.',true)
        +ciField('Tools / equipment provided by client','cond',
          ciRadio('cnr-tools',CNR_TOOLS,d.tools||''),'',true)
        +ciGrid(
          ciField('Exclusivity required',false,ciRadio('cnr-exclusivity',['Yes','No'],d.exclusivity||'',true))
          +ciField('IP transfer required',true,ciRadio('cnr-ip',['Yes','No'],d.ipTransfer||'',true))
        )
        +ciField('Local classification review needed',true,
          ciRadio('cnr-classification',['Yes','No'],d.classificationReview||'',true),
          'Per User Story 11, contract generation stays blocked until a required review is completed or waived by an authorised approver.',true))
      +ciCard('Compensation','What the contractor is paid and how the invoice is raised. There is no payroll here.',
        ciGrid(
          ciField('Currency',true,ciSelect('cnr-currency',CI_CURRENCIES,d.currency,'Select'))
          +ciField('Pay amount',true,ciNum('cnr-pay-amount','e.g. 4000',d.payAmount))
          +ciField('Pay frequency',true,ciSelect('cnr-pay-freq',CNR_PAY_FREQ,d.payFrequency,'Select'))
        ,3)
        +ciGrid(
          ciField('Invoice method',true,ciSelect('cnr-invoice-method',CNR_INVOICE_METHOD,d.invoiceMethod,'Select method'))
          +ciField('Service fee model',true,ciSelect('cnr-fee-model',CNR_FEE_MODEL,d.feeModel,'Select model'))
          +ciField('Tax / VAT handling','cond',ciSelect('cnr-vat',CNR_VAT,d.vatHandling,'Select treatment'))
          +ciField('Payment method',false,ciSelect('cnr-payment-method',CNR_PAYMENT_METHOD,d.paymentMethod,'Select method'))
        )
        +ciField('Expenses allowed',false,ciRadio('cnr-expenses',CNR_EXPENSES,d.expensesAllowed||'',true),'',true));
  }

  if(cnrStep===2){
    body=ciCard('Other Details','The paperwork and terms the agreement has to carry.',
        ciGrid(
          ciField('Background check required',false,ciRadio('cnr-bgcheck',['Yes','No'],d.backgroundCheck||'',true))
          +ciField('NDA required',false,ciRadio('cnr-nda',['Yes','No'],d.ndaRequired||'',true))
        )
        +ciField('SOW required','cond',ciRadio('cnr-sow',['Yes','No'],d.sowRequired||'',true),
          'Required on a Fixed Fee or Milestone engagement, which cannot be billed without one.',true)
        +ciGrid(
          ciField('Termination notice period',true,ciNum('cnr-notice','e.g. 15',d.noticePeriod),'Days.')
          +ciField('Data protection addendum needed',false,ciRadio('cnr-dpa',['Yes','No'],d.dpaRequired||'',true))
        )
        +ciField('Special clauses',false,
          ciArea('cnr-special-clauses','e.g. No subcontracting without approval',d.specialClauses,3),'',true));
  }

  const isLast=cnrStep===CNR_STEPS.length-1;
  return '<div class="ci-page">'
    +ciHead('CONTRACTOR','Request','cnrBack()')
    +ciStepper(CNR_STEPS,cnrStep,'cnrGoStep')
    +body
    +ciFoot('cnrBack()','cnrSaveDraft()',isLast?'cnrSubmit()':'cnrNext()',isLast,'Submit Request')
    +'</div>';
}
