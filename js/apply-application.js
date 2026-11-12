/* ══ APPLY APPLICATION ═════════════════════════════════════════════════════
   Opened from the user (profile) dropdown only. A leave / time-off request:
   what kind, which day(s), who is told, and why. Shown as a page, like every
   create form in ADT, and Back / Cancel return to the page it was opened from.

   Picks that change WHICH fields show (type, one/multiple days, leave hours)
   repaint the page; typing never does, so focus is never lost mid-word. */
const AA_TYPES=['Leave','Work From Home'];
const AA_LEAVE_TYPES=['Casual Leave','Sick Leave','Paid Leave'];
const AA_HOURS=['Full Day','Half Day','Short Leave'];
/* What each takes off the balance, in days. Short Leave is a few hours
   (a quarter day). */
const AA_HOURS_DAYS={'Full Day':1,'Half Day':0.5,'Short Leave':0.25};
const AA_EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let aaReturnTo='dashboard';
let aaForm=null;

function aaBlank(){
  return {type:'',days:'one',leaveType:'',hours:'Full Day',from:'',to:'',
    mailTo:['rajan@yopmail.com'],mailCc:['hr@newforceltd.com'],reason:''};
}
function aaEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function aaPad(n){return String(n).padStart(2,'0');}
function aaFmtDay(d){
  if(typeof tsFmtDay==='function')return tsFmtDay(d);
  const mS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],p=d.split('-');
  return (+p[2])+' '+mS[+p[1]-1]+' '+p[0];
}
function aaClosedDay(iso){
  if(typeof arNonWorkingDay==='function')return arNonWorkingDay(iso);
  const dow=new Date(iso+'T00:00:00').getDay();
  return (dow===0||dow===6)?{kind:'Weekly Off',label:'Weekly Off'}:null;
}

function openApplyApplication(){
  if(page!=='apply-application')aaReturnTo=page;
  aaForm=aaBlank();
  navigatePage('apply-application');
  const c=document.getElementById('adt-content');if(c)c.scrollTop=0;
}
function closeApplyApplication(){
  aaForm=null;
  navigatePage(aaReturnTo||'dashboard');
}
function aaRepaint(){
  const el=document.getElementById('adt-content');
  if(el&&page==='apply-application')el.innerHTML=buildApplyApplicationHTML();
}

/* ── Markup ── */
function aaField(label,req,control,o){
  o=o||{};
  return '<div class="ep-form-group'+(o.full?' ep-form-full':'')+'" id="aaf-'+o.key+'"'+(o.hidden?' hidden':'')+'>'
    +'<label class="ep-form-label">'+label+(req?' <span class="req">*</span>':'')+'</label>'
    +control
    +(o.hint?'<span class="aa-hint">'+o.hint+'</span>':'')
    +'<span class="aa-err">'+(o.err||'This field is required.')+'</span>'
    +'</div>';
}
function aaChipsHTML(key,list,ph){
  return '<div class="aa-chips" onclick="this.querySelector(\'input\').focus()">'
    +list.map(function(m,i){
      return '<span class="aa-chip">'+aaEsc(m)+'<button type="button" title="Remove" onclick="event.stopPropagation();aaChipRemove(\''+key+'\','+i+')">'
        +'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></span>';
    }).join('')
    +'<input type="email" id="aa-'+key+'-inp" placeholder="'+ph+'" onkeydown="aaChipKey(event,\''+key+'\')" onblur="aaChipCommit(\''+key+'\')">'
    +'</div>';
}
/* The three types an employee applies for - the same three the balance
   cards show (LH_BAL_TYPES). */
function aaLeaveTypeOpts(){return AA_LEAVE_TYPES.slice();}
function buildApplyApplicationHTML(){
  if(!aaForm)aaForm=aaBlank();
  const f=aaForm,isLeave=f.type==='Leave'||!f.type,one=f.days==='one';
  const seg=function(v,l){return '<button type="button" class="seg-btn'+(f.days===v?' active':'')+'" onclick="aaSetDays(\''+v+'\')">'+l+'</button>';};
  const back='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
  return '<div class="aa-wrap">'
    +'<div class="aa-top"><button class="ep-back" onclick="closeApplyApplication()">'+back+' Back</button></div>'
    /* Title on the left, the leave balance tiles on the right - where a
       listing page sets its status tiles. */
    +'<div class="fp-head"><div class="fp-head-main">'
    +'<h1 class="aa-title">Apply Application</h1>'
    +'<p class="aa-sub">Request leave or time away for approval. Fields marked <span class="req">*</span> are required.</p></div>'
    +aaBalHTML()+'</div>'

    +'<section class="ep-form-card">'
      +'<div class="aa-sec-title">Application Details</div>'
      +'<p class="aa-sec-sub">What you are applying for, and for which day or days.</p>'
      +'<div class="ep-form-grid">'
        +aaField('Application Type',true,apCS('aa-type',AA_TYPES,f.type,'Select application type','aaPick'),{key:'type'})
        +aaField('Select Days',false,'<div class="segmented">'+seg('one','One Day')+seg('multi','Multiple Days')+'</div>',{key:'days'})
        +aaField('Leave Type',true,apCS('aa-leave-type',aaLeaveTypeOpts(),f.leaveType,'Select leave type','aaPick'),{key:'leaveType',hidden:!isLeave})
        +aaField('Leave Hours',false,apCS('aa-hours',AA_HOURS,f.hours,'Select leave hours','aaPick'),{key:'hours',hidden:!one,hint:'A half day counts as 0.5 of your balance, a short leave as 0.25.'})
        +aaField(one?'Date':'From',true,'<input type="date" class="ep-form-input" id="aa-from" value="'+f.from+'" onchange="aaSetDate(\'from\',this.value)">',{key:'from'})
        +aaField('To',true,'<input type="date" class="ep-form-input" id="aa-to" value="'+f.to+'" min="'+f.from+'" onchange="aaSetDate(\'to\',this.value)">',{key:'to',hidden:one,err:'Pick an end date on or after the start date.'})
        +'<div class="ep-form-group ep-form-full"><div class="aa-days" id="aa-days">'+aaDaysLine()+'</div></div>'
      +'</div>'
    +'</section>'

    +'<section class="ep-form-card">'
      +'<div class="aa-sec-title">Notify</div>'
      +'<p class="aa-sec-sub">Who receives the application. Your reporting manager approves it; anyone in CC is kept informed.</p>'
      +'<div class="ep-form-grid">'
        +aaField('To',true,aaChipsHTML('mailTo',f.mailTo,'Email address'),{key:'mailTo',hint:'Type an email and press Enter.',err:'Add at least one recipient.'})
        +aaField('CC',false,aaChipsHTML('mailCc',f.mailCc,'Enter email'),{key:'mailCc'})
      +'</div>'
    +'</section>'

    +'<section class="ep-form-card">'
      +'<div class="ep-form-grid">'
        +aaField('Reason / Description',true,'<textarea class="ep-form-input" id="aa-reason" maxlength="500" placeholder="Leave reason" oninput="aaForm.reason=this.value;aaClearErr(\'reason\')">'+aaEsc(f.reason)+'</textarea>',{key:'reason',full:true})
      +'</div>'
    +'</section>'

    +'<div class="aa-foot">'
      +'<button class="ep-cancel-btn" onclick="closeApplyApplication()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="aaSubmit()">Submit</button>'
    +'</div>'
  +'</div>';
}

/* How long the request is, in the words the balance is kept in. */
function aaWorkingDays(from,to){
  if(!from||!to||to<from)return 0;
  let n=0;const d=new Date(from+'T00:00:00'),end=new Date(to+'T00:00:00');
  for(;d<=end;d.setDate(d.getDate()+1)){
    const k=d.getFullYear()+'-'+aaPad(d.getMonth()+1)+'-'+aaPad(d.getDate());
    if(!aaClosedDay(k))n++;
  }
  return n;
}
function aaDaysLine(){
  const f=aaForm;
  if(!f||!f.from)return '';
  if(f.days==='one'){
    const closed=aaClosedDay(f.from);
    if(closed)return '<span>That date is a <b>'+aaEsc(closed.label)+'</b> &mdash; no working time is taken.</span>';
    const n=AA_HOURS_DAYS[f.hours]||1;
    return '<span>Duration: <b>'+n+' day'+(n===1?'':'s')+'</b>'+(n<1?' ('+f.hours+')':'')+'</span>';
  }
  if(!f.to)return '';
  const n=aaWorkingDays(f.from,f.to);
  return '<span>Duration: <b>'+n+' working day'+(n===1?'':'s')+'</b> &middot; weekends and holidays are not counted</span>';
}

/* ── Field handlers ── */
function aaCSVal(id){
  const t=document.querySelector('[data-csid="'+id+'"]');
  return t&&!t.classList.contains('cs-placeholder')?t.querySelector('.cs-value').textContent:'';
}
function aaSync(){
  if(!aaForm)return;
  aaForm.type=aaCSVal('aa-type');
  aaForm.leaveType=aaCSVal('aa-leave-type');
  aaForm.hours=aaCSVal('aa-hours')||'Full Day';
  const r=document.getElementById('aa-reason');if(r)aaForm.reason=r.value;
  ['mailTo','mailCc'].forEach(function(k){aaChipCommit(k,true);});
}
/* apCS hook: a pick in any of the three dropdowns. */
function aaPick(val,csid){
  aaSync();
  if(csid==='aa-type'||csid==='aa-hours')aaRepaint();
  else if(csid==='aa-leave-type')aaRefreshBal();   // the balance left in that type
  aaClearErr(csid==='aa-type'?'type':csid==='aa-leave-type'?'leaveType':'hours');
}
function aaSetDays(v){aaSync();aaForm.days=v;if(v==='one')aaForm.to='';aaRepaint();}
function aaSetDate(which,v){
  aaForm[which]=v;
  if(which==='from'&&aaForm.to&&aaForm.to<v)aaForm.to='';
  const to=document.getElementById('aa-to');if(to){to.min=aaForm.from;to.value=aaForm.to;}
  const line=document.getElementById('aa-days');if(line)line.innerHTML=aaDaysLine();
  if(which==='from')aaRefreshBal();   // the monthly figure follows the month picked
  aaClearErr(which);
}
function aaClearErr(key){const g=document.getElementById('aaf-'+key);if(g)g.classList.remove('is-invalid');}

/* ── Email chips ── */
function aaChipCommit(key,quiet){
  const inp=document.getElementById('aa-'+key+'-inp');if(!inp||!aaForm)return true;
  const vals=inp.value.split(/[,;\s]+/).map(function(v){return v.trim();}).filter(Boolean);
  if(!vals.length)return true;
  const bad=vals.filter(function(v){return !AA_EMAIL.test(v);});
  if(bad.length){
    if(!quiet)showToast('Check the email address','error','“'+aaEsc(bad[0])+'” is not a valid email.');
    return false;
  }
  vals.forEach(function(v){if(aaForm[key].indexOf(v)<0)aaForm[key].push(v);});
  inp.value='';
  return true;
}
function aaChipKey(e,key){
  if(e.key==='Enter'||e.key===','||e.key===';'){
    e.preventDefault();
    if(aaChipCommit(key)){
      aaSync();aaRepaint();
      const n=document.getElementById('aa-'+key+'-inp');if(n)n.focus();
      aaClearErr(key);
    }
  }else if(e.key==='Backspace'&&!e.target.value&&aaForm[key].length){
    aaSync();aaForm[key].pop();aaRepaint();
    const n=document.getElementById('aa-'+key+'-inp');if(n)n.focus();
  }
}
function aaChipRemove(key,i){aaSync();aaForm[key].splice(i,1);aaRepaint();}

/* ── Submit ── */
function aaSubmit(){
  aaSync();
  const f=aaForm,isLeave=f.type==='Leave',one=f.days==='one',bad=[];
  if(!f.type)bad.push('type');
  if(isLeave&&!f.leaveType)bad.push('leaveType');
  if(!f.from)bad.push('from');
  if(!one&&(!f.to||f.to<f.from))bad.push('to');
  if(!f.mailTo.length)bad.push('mailTo');
  if(!f.reason.trim())bad.push('reason');
  document.querySelectorAll('.aa-wrap .ep-form-group.is-invalid').forEach(function(g){g.classList.remove('is-invalid');});
  bad.forEach(function(k){const g=document.getElementById('aaf-'+k);if(g)g.classList.add('is-invalid');});
  if(bad.length){
    const first=document.getElementById('aaf-'+bad[0]);if(first)first.scrollIntoView({behavior:'smooth',block:'center'});
    showToast('Complete the required fields','error',bad.length+' field'+(bad.length===1?' needs':'s need')+' attention.');
    return;
  }
  const what=isLeave?f.leaveType:f.type;
  const when=one?aaFmtDay(f.from)+(isLeave&&f.hours!=='Full Day'?' ('+f.hours+')':''):aaFmtDay(f.from)+' – '+aaFmtDay(f.to);
  closeApplyApplication();
  showToast('Application submitted','success',what+' · '+when+' · sent to '+f.mailTo[0]+(f.mailTo.length>1?' +'+(f.mailTo.length-1):''));
}
