/* ══ THE LOGS TAB ══════════════════════════════════════════════════════════
   One layout for every Logs tab in the app, top to bottom:

     1. HEAD    - "Current status" bar: the record's status, who the next move
                  is with, and one button per move the record can make.
                  When no move is open it is a status card instead
                  (waiting / completed / rejected).
     2. COMPOSER - clicking a move turns the bar into one card: "<current> →
                  [move]", the module's own fields, Cancel and a submit button
                  named after the move. The table hides while it is open.
     3. TABLE   - every entry, oldest first: S.No | Status | Remarks |
                  Created By | Create Time.

   Nothing about WHAT a module records changed. Each module still builds the
   form it always built - its status options, its extra fields, its Save and
   Cancel handlers - and passes it to lpLogsView(). The status dropdown in that
   form is kept (hidden) and set by the move buttons, so every xxSaveLog()
   reads exactly the values it read before. */

const LPL_ICO={
  x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  wait:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22"/><path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/></svg>',
  done:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  bad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  tick:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  chev:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>'
};
/* How many moves show as buttons; past this they become one dropdown. */
const LPL_MAX_BTNS=3;
/* Moves that undo, refuse or stop a record read as the outlined, amber kind. */
const LPL_BACK_RE=/^(reject|return|revert|cancel|decline|unapprov|inactive|block|move back|withdraw|terminat|suspend|hold|reopen)/i;

function lplEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function lplAttr(s){return lplEsc(s).replace(/'/g,'&#39;');}

/* Stored times are "05:44:07 PM" (stampNow) or "14:05:09"; the table shows
   "05:44 PM" - minutes are the precision anyone reads a log at. */
function lplTime(t){
  const m=String(t||'').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if(!m)return t||'';
  let h=+m[1],ap=m[3];
  if(!ap){ap=h>=12?'PM':'AM';h=h%12||12;}
  return (h<10?'0'+h:h)+':'+m[2]+' '+ap.toUpperCase();
}

/* Modules store entries in two shapes: {status, action} almost everywhere,
   {label, comment} in Contracts. One reader for both. */
function lplRow(l){
  return {
    status:l.label||l.status||'Updated',
    user:l.user||'System',
    role:l.role||(l.actorType==='SYSTEM'||l.system?'System':''),
    date:l.date||'',time:l.time||'',portal:l.portal||'',
    reason:l.reason||'',
    comment:l.comment!=null?l.comment:(l.action||'')
  };
}

/* ── 3. The table ──────────────────────────────────────────────────────── */
/* logs: newest first, as every module stores them.
   o.statusLabel  header of the status column ("Leave Status")
   o.rowExtra     fn(entry, indexInStoredList) -> extra markup in Remarks
   o.rowClass     fn(entry, indexInStoredList) -> a class for the row ('is-bad') */
function lplTableHTML(logs,o){
  o=o||{};
  if(!logs||!logs.length)return '<div class="lp-logs-empty">No activity logs yet.</div>';
  const n=logs.length;
  const rows=logs.slice().reverse().map(function(raw,k){
    const l=lplRow(raw),i=n-1-k;
    const extra=o.rowExtra?o.rowExtra(raw,i)||'':'';
    const rem=(l.reason?'<span class="lpl-reason">Reason: '+l.reason+'</span>':'')
      +(l.comment||(!l.reason&&!extra?'&mdash;':''))
      +extra;
    const cls=o.rowClass?o.rowClass(raw,i)||'':'';
    return '<tr'+(cls?' class="'+cls+'"':'')+'>'
      +'<td class="lpl-sno">'+(k+1)+'</td>'
      +'<td class="lpl-st">'+l.status+'</td>'
      +'<td class="lpl-rem">'+rem+'</td>'
      +'<td>'+l.user+(l.role?'<span class="lpl-sub">'+l.role+'</span>':'')+'</td>'
      +'<td>'+l.date+'<span class="lpl-sub">'+lplTime(l.time)
        +(l.portal&&l.portal!=='Web'?' &middot; '+l.portal+' portal':'')+'</span></td>'
      +'</tr>';
  }).join('');
  return '<div class="lpl-table-wrap"><table class="lpl-table"><thead><tr>'
    +'<th>S.No</th><th>'+(o.statusLabel||'Status')+'</th><th>Remarks</th><th>Created By</th><th>Create Time</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

/* ── 2b. A status card, for when there is nothing to do here ───────────────
   kind: 'wait' | 'done' | 'bad'. */
function lplCardHTML(kind,title,sub,o){
  o=o||{};
  return '<div class="lpl-state is-'+kind+'">'
    +(o.current?'<div class="lpl-state-cur"><span>Current status</span><b>'+o.current+'</b></div>':'')
    +'<div class="lpl-state-ico">'+LPL_ICO[kind]+'</div>'
    +'<div class="lpl-state-title">'+title+'</div>'
    +(sub?'<div class="lpl-state-sub">'+sub+'</div>':'')
    +(o.button||'')
    +'</div>';
}

/* ── 1. The current-status bar ─────────────────────────────────────────── */
/* actions: [{label, onclick, back, danger, disabled, title}] already decided by
   the caller. o.maxBtns: how many show as buttons before the rest fold into More. */
function lplBarHTML(current,sub,actions,o){
  o=o||{};
  const max=o.maxBtns||LPL_MAX_BTNS;
  const shown=actions.slice(0,max),more=actions.slice(max);
  const btn=function(a){
    return '<button type="button" class="'+(a.back||a.quiet?'btn-outline':'btn-primary')+' lpl-btn'+(a.danger?' is-danger':'')+'"'
      +(a.data||'')+(a.disabled?' disabled title="'+lplAttr(a.title||'')+'"':' onclick="'+a.onclick+'"')+'>'+a.label+'</button>';
  };
  const moreHTML=more.length
    ?'<div class="lpl-more"><button type="button" class="btn-outline lpl-btn" onclick="lplToggleMore(this,event)">More '+LPL_ICO.chev+'</button>'
      +'<div class="lpl-more-menu">'+more.map(function(a){
        return '<button type="button" class="lpl-more-item'+(a.back?' is-back':'')+'"'+(a.data||'')
          +(a.disabled?' disabled title="'+lplAttr(a.title||'')+'"':' onclick="lplCloseMore();'+a.onclick+'"')+'>'+a.label+'</button>';
      }).join('')+'</div></div>'
    :'';
  /* o.done: the record has reached the last stage of its flow. The bar turns
     green with a tick - finished - but keeps its moves, so a user allowed to
     (a super admin) can still walk it back. */
  return '<div class="lpl-bar'+(o.done?' is-done':'')+'">'
    +'<div class="lpl-bar-main">'
      +'<div class="lpl-eyebrow">Current status</div>'
      +'<div class="lpl-status">'+(o.done?'<span class="lpl-done-ico" aria-hidden="true">'+LPL_ICO.tick+'</span>':'<span class="lpl-dot"></span>')
        +current+(o.done?'<span class="lpl-done-pill">Completed</span>':'')+(o.chip||'')+'</div>'
      +(sub?'<p class="lpl-sub-line">'+sub+'</p>':'')
    +'</div>'
    +((shown.length||o.lead)?'<div class="lpl-actions">'+(o.lead||'')+shown.map(btn).join('')+moreHTML+'</div>':'')
    +'</div>';
}

/* ── The whole tab, from a module's existing form ──────────────────────────
   logs      the record's entries, newest first
   formHTML  the module's .lp-logs-form markup, unchanged
   o.owner       who the next move is with -> "Next action is pending with X."
   o.open        a move to open the composer on straight away (a decision
                 carried in from a dashboard or a row menu)
   o.isBack      fn(option) -> true for moves that go backwards
   o.side        markup between the head and the table (document strips…)
   o.labels      {status: 'verb'} - what each move is called on screen when
                 the status it writes reads differently ('Approved' -> 'Approve')
   o.select      true: the moves are one 'Select action' dropdown instead of a
                 row of buttons; picking one opens the composer the same way.
                 'auto' (the default): the dropdown once there are more than
                 o.maxBtns (3) moves - no row-plus-More overflow.
                 false: always buttons.
   o.done        true when the record sits on the LAST stage of its flow: the
                 bar shows a green tick and "Completed", moves still offered
   o.noAction    {title, sub}: with no form, the card to show instead of the
                 generic one - for a user who may not act on this record
   o.aiWhen      fn(move) -> true for the moves that SUBMIT something (send,
                 file, record, propose). Only those get the "AI
                 Recommendation" card; approvals, reverts and comments never
                 do, and a module without aiWhen gets none. See lplAiRender().
   o.aiFields    fn(move) -> [{label, from, to, obj, key, group, info, hidden}]:
                 the record fields this move writes (not shown on the card).
                 A row with obj/key is written on Submit (and undone if
                 the save is refused); one without is written by the module's
                 own save. `to` may be a function, read again as the form
                 changes. See lplAiRows().
   o.aiContext   fn(move) -> null | {title, rows:[{label, value, state, note}]}:
                 the few facts THIS move depends on, read off the record - the
                 card's checks and facts. state 'ok'/'warn' marks a check (a warn
                 turns the verdict to review); `note` says why. Blank values are
                 left out. See lplAiContext().
   o.aiLogStatus fn(move) -> the status the log entry stores, when it is not
                 the move's own value
   o.aiUser      who the log entry is signed by (default CURRENT_USER)
   o.statusLabel / o.rowExtra   passed to the table */
function lpLogsView(logs,formHTML,o){
  o=o||{};
  logs=logs||[];
  const tpl=document.createElement('div');
  tpl.innerHTML=formHTML||'';
  const form=tpl.querySelector('.lp-logs-form');
  const latest=logs[0]?lplRow(logs[0]).status:'';
  let head='';

  if(form){
    const hdr=form.querySelector('.lp-logs-form-header');
    const subEl=form.querySelector('.lp-logs-form-sub');
    const current=o.current||(hdr?hdr.textContent.trim():'')||latest||'—';
    const sub=o.owner
      ?'Next action is pending with <b>'+o.owner+'</b>.'
      :(o.sub!=null?o.sub:(subEl?subEl.innerHTML:''));
    if(hdr)hdr.remove();
    if(subEl)subEl.remove();

    /* The status dropdown: kept in the DOM (the save handler reads it), hidden,
       and driven by the move buttons. */
    const wrap=form.querySelector('.cs-wrap');
    const selId=wrap?wrap.id.replace(/^csw-/,''):'';
    const opts=wrap?Array.prototype.map.call(wrap.querySelectorAll('.cs-option > span'),function(s){return s.textContent;}):[];
    if(wrap){
      const lab=wrap.previousElementSibling;
      if(lab&&lab.classList.contains('lp-logs-form-label'))lab.remove();
      wrap.classList.add('lpl-hidden-sel');
    }

    /* Save / Cancel move into the composer foot. */
    const save=form.querySelector('.lp-logs-save-btn');
    const cancel=form.querySelector('.ep-cancel-btn');
    const saveJs=save?save.getAttribute('onclick')||'':'';
    const cancelJs=cancel?cancel.getAttribute('onclick')||'':'';
    [save,cancel].forEach(function(b){
      if(!b)return;
      const p=b.parentElement;
      if(p&&p!==form&&!p.querySelector('textarea,.cs-wrap,input'))p.remove();else b.remove();
    });

    const isBack=function(v){return o.isBack?o.isBack(v):(LPL_BACK_RE.test(v)||statusTone(v)==='bad');};
    /* One button per status the record can MOVE to. Staying on the current
       status is not offered: every move already opens the comment box. */
    const actions=opts.filter(function(v){return v!==current;}).map(function(v){
      const back=isBack(v),label=(o.labels&&o.labels[v])||v;
      return {label:lplEsc(label),text:label,value:v,back:back,danger:/^reject/i.test(v),onclick:'lplPick(this)',
        data:' data-v="'+lplAttr(v)+'" data-l="'+lplAttr(label)+'"'+(back?' data-back="1"':'')};
    });
    /* Forward moves lead, backward moves follow - in a button row. A dropdown
       keeps the caller's order: it is a list somebody chose the order of. */
    /* The standard: a few moves are buttons, more than that is ONE 'Select
       action' dropdown - never a long row of buttons. 'auto' unless the module
       says otherwise. */
    const mode=o.select==null?'auto':o.select;
    const useSelect=mode==='auto'?actions.length>(o.maxBtns||LPL_MAX_BTNS):!!mode;
    if(!useSelect)actions.sort(function(a,b){return (a.back?1:0)-(b.back?1:0);});

    /* Dropdown mode: the moves still exist as buttons - they carry the value,
       label and direction lplPick reads - but hidden, and the dropdown presses
       the one picked. */
    const picker=useSelect&&actions.length
      ?apCS('lpl-act-'+selId,actions.map(function(a){return a.text;}),'','Select action','lplSelectPick')
        +'<span hidden>'+actions.map(function(a){return '<button type="button" class="lpl-btn"'+a.data+' onclick="lplPick(this)">'+a.label+'</button>';}).join('')+'</span>'
      :'';
    head=!actions.length?lplNoMoveCard(current,logs)
      :picker?lplBarHTML(current,sub,[],{lead:picker,done:o.done})
      :lplBarHTML(current,sub,actions,{done:o.done});

    const fields=form.innerHTML;
    const aiId=lplAiRegister(current,o);
    head+='<div class="lpl-composer" hidden>'
      +'<div class="lpl-c-head"><div class="lpl-c-move"><span class="lpl-c-from">'+current+'</span>'
        +'<span class="lpl-c-arrow">&rarr;</span><span class="lpl-c-to"></span></div>'
        +'<button type="button" class="lpl-c-x" aria-label="Close" onclick="lplClose(this);'+lplAttr(cancelJs)+'">'+LPL_ICO.x+'</button></div>'
      +'<div class="lpl-c-body">'+(aiId?'<div class="lpl-ai" data-ai="'+aiId+'"></div>':'')+fields+'</div>'
      +'<div class="lpl-c-foot"><span class="lpl-c-hint"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit</span>'
        +'<div class="lpl-c-btns"><button type="button" class="btn-outline lpl-btn" onclick="lplClose(this);'+lplAttr(cancelJs)+'">Cancel</button>'
        +'<button type="button" class="btn-primary lpl-btn lpl-c-submit" onclick="'+lplAttr(saveJs?'lplAiCommit(this);try{'+saveJs+'}finally{lplAiSettle(this);}':'')+'">Submit</button></div></div>'
      +'</div>';

    return '<div class="lpl" data-sel="'+lplAttr(selId)+'"'+(o.open?' data-open="'+lplAttr(o.open)+'"':'')+'>'
      +head+(o.side||'')
      +'<div class="lpl-log-list">'+lplTableHTML(logs,o)+'</div>'
      +'</div>'
      +(o.open?lplAutoOpen():'');
  }

  /* No form at all: the record takes no more moves - or none from this user,
     in which case o.noAction says who does take them. */
  const cur=o.current||latest||'—';
  return '<div class="lpl">'+(o.noAction?lplCardHTML('wait',o.noAction.title,o.noAction.sub,{current:lplEsc(cur)}):lplNoMoveCard(cur,logs))+(o.side||'')
    +'<div class="lpl-log-list">'+lplTableHTML(logs,o)+'</div></div>';
}

/* The card shown when a record offers no move. Its tone follows the status:
   a settled-good record reads "completed", a refused one "rejected". */
function lplNoMoveCard(current,logs){
  const last=logs&&logs[0]?lplRow(logs[0]):null;
  const by=last?' on '+last.date+' by '+last.user:'';
  const tone=statusTone(current);
  if(tone==='bad')return lplCardHTML('bad',lplEsc(current),'Moved to '+lplEsc(current)+by+'. No further steps.');
  if(tone==='ok'||/closed|complete|resolved/i.test(current))
    return lplCardHTML('done','Completed','All steps are done. '+lplEsc(current)+by+'.');
  return lplCardHTML('wait','No action available','There is nothing to record on this record right now.',{current:lplEsc(current)});
}

/* A composer asked to open on render (o.open) is opened once the markup is in
   the page: the move button it presses must exist before it can be pressed. */
function lplAutoOpen(){
  setTimeout(function(){
    document.querySelectorAll('.lpl[data-open]').forEach(function(root){
      const v=root.getAttribute('data-open');root.removeAttribute('data-open');
      const b=Array.prototype.find.call(root.querySelectorAll('[data-v]'),function(x){return x.getAttribute('data-v')===v;});
      if(b)b.click();else lplOpen(root,v,v);
    });
  },0);
  return '';
}

/* ── Interaction ───────────────────────────────────────────────────────── */
function lplPick(btn){
  const root=btn.closest('.lpl');if(!root)return;
  lplOpen(root,btn.getAttribute('data-v'),btn.getAttribute('data-l'),btn.hasAttribute('data-back'));
}
function lplOpen(root,value,label,back){
  const selId=root.getAttribute('data-sel');
  if(selId){
    const drop=document.getElementById('csd-'+selId);
    const opt=drop&&Array.prototype.find.call(drop.querySelectorAll('.cs-option'),function(x){return x.textContent.trim()===value;});
    if(opt)csSelect(opt,value,selId);
  }
  const comp=root.querySelector('.lpl-composer');if(!comp)return;
  if(back==null)back=LPL_BACK_RE.test(value)||statusTone(value)==='bad';
  comp.classList.toggle('is-back',back);
  comp.querySelector('.lpl-c-to').textContent=label;
  const sub=comp.querySelector('.lpl-c-submit');
  sub.textContent=label;
  sub.classList.toggle('is-danger',/^reject/i.test(value));
  comp.setAttribute('data-v',value);
  comp.removeAttribute('data-ai-off');
  lplAiRender(comp);
  root.classList.add('is-composing');
  comp.hidden=false;
  const ta=comp.querySelector('textarea');
  if(ta)setTimeout(function(){ta.focus();},30);
}
function lplSelectPick(val,csid){
  const wrap=document.getElementById('csw-'+csid),root=wrap&&wrap.closest('.lpl');if(!root)return;
  const btn=Array.prototype.find.call(root.querySelectorAll('[data-l]'),function(b){return b.getAttribute('data-l')===val;});
  if(btn)lplPick(btn);
}
function lplClose(el){
  const root=el.closest('.lpl');if(!root)return;
  const comp=root.querySelector('.lpl-composer');
  if(comp){
    comp.hidden=true;
    const ta=comp.querySelector('textarea');if(ta){ta.value='';ta.classList.remove('is-invalid');}
    comp.querySelectorAll('.lpl-req-err').forEach(function(e){e.remove();});
  }
  /* A cancelled move leaves the 'Select action' dropdown blank again, not
     showing the move that was just abandoned. */
  const sel=root.getAttribute('data-sel'),t=sel&&document.querySelector('[data-csid="lpl-act-'+sel+'"]');
  if(t){
    t.querySelector('.cs-value').textContent=t.dataset.csph||'Select action';t.classList.add('cs-placeholder');
    const d=document.getElementById('csd-lpl-act-'+sel);
    if(d)d.querySelectorAll('.cs-selected').forEach(function(o){o.classList.remove('cs-selected');});
  }
  root.classList.remove('is-composing');
}
function lplToggleMore(btn,e){
  if(e)e.stopPropagation();
  const m=btn.nextElementSibling;const open=!m.classList.contains('open');
  lplCloseMore();
  if(open)m.classList.add('open');
}
function lplCloseMore(){document.querySelectorAll('.lpl-more-menu.open').forEach(function(m){m.classList.remove('open');});}
document.addEventListener('click',function(e){if(!e.target.closest('.lpl-more'))lplCloseMore();});
/* Ctrl / Cmd + Enter in the composer submits it. */
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'||!(e.ctrlKey||e.metaKey))return;
  const comp=e.target.closest&&e.target.closest('.lpl-composer');
  if(!comp||comp.hidden)return;
  e.preventDefault();
  const b=comp.querySelector('.lpl-c-submit');if(b)b.click();
});

/* ── AI recommendation ─────────────────────────────────────────────────────
   A card at the top of the composer that reads the record before a SUBMISSION
   and says whether to go ahead: a verdict, the checks behind it and the facts
   they were made against.

   It is drawn only where a person is putting something forward - sending a
   proposal or a contract, filing, recording a payment, proposing a fix. Each
   module says which of its moves those are (o.aiWhen). Approvals, refusals,
   reverts and plain comments never get one: a decision is the reviewer's own,
   and a machine "suggesting approve" on it would only lean on that judgement.
   Modules that pass no aiWhen (the Active/Inactive master-data logs) get none.

   The values are read from the record itself - there is no AI service behind
   this demo - and refresh as the form is filled in. */
const LPL_AI={},LPL_AI_ICO='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
const LPL_AI_MARK={
  ok:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  warn:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><line x1="12" y1="6" x2="12" y2="13"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  info:'<svg width="6" height="6" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor"/></svg>'
};
let lplAiSeq=0;
function lplAiRegister(current,o){
  const id='ai'+(++lplAiSeq);
  delete LPL_AI['ai'+(lplAiSeq-40)];   // older tabs are long gone from the page
  LPL_AI[id]={current:current,fields:o.aiFields,logStatus:o.aiLogStatus,user:o.aiUser,statusLabel:o.statusLabel,
    context:o.aiContext,when:o.aiWhen};
  return id;
}
/* The facts THIS move depends on (o.aiContext), blanks dropped. Rows may carry
   a check - state 'ok' | 'warn' - and a note saying why. */
function lplAiContext(reg,v){
  const c=reg.context&&v?reg.context(v):null;
  if(!c||!c.rows)return null;
  const rows=c.rows.map(function(r){return {label:r.label,value:lplAiVal(r.value),state:r.state||'',note:r.note||''};})
    .filter(function(r){return r.value!=null&&String(r.value).trim()!==''&&!/^[—–-]+$/.test(String(r.value).trim());});
  return rows.length?{title:c.title||'',rows:rows}:null;
}
function lplAiVal(x){return typeof x==='function'?x():x;}
/* Record rows first, then the log entry: its status, any extra log fields the
   module adds (group:'log'), who signs it and when. */
function lplAiRows(reg,v){
  const all=(reg.fields?reg.fields(v)||[]:[]);
  const st=stampNow();
  return {
    record:all.filter(function(r){return r.group!=='log';}),
    log:[{label:reg.statusLabel||'Status',to:reg.logStatus?reg.logStatus(v):v}]
      .concat(all.filter(function(r){return r.group==='log';}))
      .concat([{label:'Created By',to:reg.user||(typeof CURRENT_USER!=='undefined'?CURRENT_USER:'You')},
               {label:'Create Time',to:st.date+' · '+lplTime(st.time)}])
  };
}
/* What the card thinks, for the move being made. */
function lplAiAnalyse(comp,reg){
  const v=comp.getAttribute('data-v')||'';
  // A ticket move reads "Propose resolution → Resolved"; the verb is enough here.
  const label=((comp.querySelector('.lpl-c-to')||{}).textContent||v).replace(/\s*→.*$/,'');
  const ctx=lplAiContext(reg,v),rows=ctx?ctx.rows:[];
  const warn=rows.filter(function(r){return r.state==='warn';});
  return {v:v,label:label,title:ctx?ctx.title:'',rows:rows,warn:warn};
}
function lplAiOn(comp,reg){
  const v=comp.getAttribute('data-v')||'';
  return !!(v&&v!==reg.current&&reg.when&&reg.when(v)&&!comp.hasAttribute('data-ai-off'));
}
/* The card has four designs, picked from the tabs in its head and remembered
   per browser. Every design shows the same three things - the verdict, the
   checks, the facts they were made against - and the same Accept / Edit foot;
   only the layout changes.
     card      Detailed: verdict banner, checks as rows, facts as a field grid
     compact   one-line verdict, checks as pills, facts as one line of text
     table     one table - field, value, check - flagged rows tinted
     summary   the recommendation written out as a short paragraph */
const LPL_AI_VIEWS=[{id:'card',label:'Detailed'},{id:'compact',label:'Compact'},{id:'table',label:'Table'},{id:'summary',label:'Summary'}];
let lplAiViewId=(function(){try{return localStorage.getItem('lpl-ai-design')||'card';}catch(e){return 'card';}})();
function lplAiSetView(id){
  lplAiViewId=id;
  try{localStorage.setItem('lpl-ai-design',id);}catch(e){}
  document.querySelectorAll('.lpl-composer:not([hidden])').forEach(lplAiRender);
}
/* The verdict as one tinted line - the compact and table designs lead with it. */
function lplAiStrip(a){
  return '<div class="lpl-ai-strip is-'+a.tone+'"><span class="lpl-ai-mk">'+LPL_AI_MARK[a.tone]+'</span>'
    +'<b>'+a.head+'</b><span class="lpl-ai-strip-sub">'+a.sub+'</span></div>';
}
const LPL_AI_DESIGN={
  card:function(a){
    return '<div class="lpl-ai-verdict is-'+a.tone+'"><span class="lpl-ai-v-ico">'+LPL_AI_MARK[a.tone]+'</span>'
        +'<div><div class="lpl-ai-v-title">'+a.head+'</div><div class="lpl-ai-v-sub">'+a.sub+'</div></div></div>'
      +(a.checks.length?'<div class="lpl-ai-group">Checks</div><ul class="lpl-ai-checks">'+a.checks.map(function(r){
          return '<li class="lpl-ai-check is-'+r.state+'"><span class="lpl-ai-mk">'+LPL_AI_MARK[r.state]+'</span>'
            +'<div class="lpl-ai-check-txt"><div class="lpl-ai-check-row"><span class="lpl-ai-check-k">'+lplEsc(r.label)+'</span>'
            +'<span class="lpl-ai-check-v">'+lplEsc(r.value)+'</span></div>'
            +(r.note?'<div class="lpl-ai-note">'+lplEsc(r.note)+'</div>':'')+'</div></li>';
        }).join('')+'</ul>':'')
      +(a.facts.length?'<div class="lpl-ai-group">Based on</div><dl class="lpl-ai-facts">'+a.facts.map(function(r){
          return '<div class="lpl-ai-fact'+(String(r.value).length>48?' is-wide':'')+'"><dt>'+lplEsc(r.label)+'</dt><dd>'+lplEsc(r.value)+'</dd></div>';
        }).join('')+'</dl>':'');
  },
  compact:function(a){
    return lplAiStrip(a)
      +(a.checks.length?'<div class="lpl-ai-pills">'+a.checks.map(function(r){
          return '<span class="lpl-ai-cpill is-'+r.state+'"'+(r.note?' title="'+lplAttr(r.note)+'"':'')+'>'+LPL_AI_MARK[r.state]
            +lplEsc(r.label)+' <b>'+lplEsc(r.value)+'</b></span>';
        }).join('')+'</div>':'')
      +(a.facts.length?'<p class="lpl-ai-inline">'+a.facts.map(function(r){
          return '<span>'+lplEsc(r.label)+' <b>'+lplEsc(r.value)+'</b></span>';
        }).join('<span class="lpl-ai-sep">&middot;</span>')+'</p>':'');
  },
  table:function(a){
    const rows=a.checks.concat(a.facts);
    return lplAiStrip(a)
      +'<div class="lpl-ai-tbl-wrap"><table class="lpl-ai-tbl"><thead><tr><th>Field</th><th>Value</th><th>Check</th></tr></thead><tbody>'
      +rows.map(function(r){
        return '<tr'+(r.state==='warn'?' class="is-warn"':'')+'><td class="lpl-ai-tk">'+lplEsc(r.label)+'</td><td class="lpl-ai-tv">'+lplEsc(r.value)+'</td>'
          +'<td>'+(r.state
            ?'<span class="lpl-ai-tc is-'+r.state+'"><span class="lpl-ai-mk">'+LPL_AI_MARK[r.state]+'</span>'+(r.note?lplEsc(r.note):r.state==='ok'?'Passed':'Check')+'</span>'
            :'<span class="lpl-ai-tdash">&mdash;</span>')+'</td></tr>';
      }).join('')+'</tbody></table></div>';
  },
  summary:function(a){
    const facts=a.facts.map(function(r){return lplEsc(r.label)+' <b>'+lplEsc(r.value)+'</b>';});
    const ok=a.checks.filter(function(r){return r.state==='ok';});
    const warn=a.checks.filter(function(r){return r.state==='warn';});
    return '<div class="lpl-ai-sum is-'+a.tone+'">'
      +'<p class="lpl-ai-sum-lead"><span class="lpl-ai-mk">'+LPL_AI_MARK[a.tone]+'</span><span><b>'+a.head+'.</b> '+a.sub+'</span></p>'
      +(facts.length?'<p class="lpl-ai-sum-p">From the record: '+facts.join(', ')+'.</p>':'')
      +(ok.length?'<p class="lpl-ai-sum-p">'+ok.map(function(r){return lplEsc(r.label)+' (<b>'+lplEsc(r.value)+'</b>)';}).join(', ')
        +(ok.length===1?' checks out.':' check out.')+'</p>':'')
      +(warn.length?'<ul class="lpl-ai-sum-flags">'+warn.map(function(r){
          return '<li><span class="lpl-ai-mk">'+LPL_AI_MARK.warn+'</span><span><b>'+lplEsc(r.label)+':</b> '+lplEsc(r.value)
            +(r.note?' &mdash; '+lplEsc(r.note):'')+'</span></li>';
        }).join('')+'</ul>':'')
      +'</div>';
  }
};
/* The card: head (sparkle, title, what it looked at, design tabs, dismiss),
   the picked design, then Accept & submit (or Submit anyway) · Edit details. */
function lplAiRender(comp){
  const box=comp&&comp.querySelector('.lpl-ai'),reg=box&&LPL_AI[box.getAttribute('data-ai')];
  if(!reg)return;
  if(!lplAiOn(comp,reg)){box.hidden=true;if(box._html){box.innerHTML='';box._html='';}return;}
  const a=lplAiAnalyse(comp,reg),n=a.warn.length;
  a.checks=a.rows.filter(function(r){return r.state==='warn';}).concat(a.rows.filter(function(r){return r.state==='ok';}));
  a.facts=a.rows.filter(function(r){return !r.state;});
  const passed=a.checks.length-n;
  a.tone=n?'warn':'ok';
  a.head=(n?'Review before ':'Go ahead with ')+lplEsc(a.label);
  a.sub=n
    ?n+' item'+(n===1?' needs':'s need')+' a look before you submit.'
    :(passed?(passed===1?'1 check':'All '+passed+' checks')+' passed. ':'')+'Nothing flagged on this record.';
  const view=LPL_AI_DESIGN[lplAiViewId]?lplAiViewId:'card';
  const html='<div class="lpl-ai-head"><span class="lpl-ai-ico">'+LPL_AI_ICO+'</span>'
      +'<div class="lpl-ai-head-txt"><span class="lpl-ai-title">AI Recommendation</span>'
      +(a.title?'<span class="lpl-ai-sub">'+lplEsc(a.title)+'</span>':'')+'</div>'
      +'<div class="lpl-ai-tabs" role="tablist" aria-label="Recommendation design">'+LPL_AI_VIEWS.map(function(v){
        return '<button type="button" role="tab" class="lpl-ai-tab'+(v.id===view?' active':'')+'" aria-selected="'+(v.id===view)+'" onclick="lplAiSetView(\''+v.id+'\')">'+v.label+'</button>';
      }).join('')+'</div>'
      +'<button type="button" class="lpl-c-x lpl-ai-x" aria-label="Dismiss recommendation" title="Dismiss" onclick="lplAiDismiss(this)">'+LPL_ICO.x+'</button></div>'
    +'<div class="lpl-ai-body is-'+view+'">'+LPL_AI_DESIGN[view](a)+'</div>'
    +'<div class="lpl-ai-foot">'
      +'<button type="button" class="'+(n?'btn-outline':'btn-primary')+' lpl-btn" onclick="lplAiAccept(this)">'+(n?'Submit anyway':'Accept &amp; submit')+'</button>'
      +'<button type="button" class="btn-outline lpl-btn" onclick="lplAiEdit(this)">Edit details</button>'
    +'</div>';
  box.hidden=false;
  box.className='lpl-ai';
  if(box._html!==html){box.innerHTML=html;box._html=html;}
}
/* Accept presses Submit - but the comment is mandatory on every move, and the
   AI does not write it for you. An empty box is marked invalid, told why and
   focused, and nothing is submitted until it is filled in. */
function lplAiAccept(btn){
  const comp=btn.closest('.lpl-composer');if(!comp)return;
  const ta=comp.querySelector('.lpl-c-body textarea');
  if(ta&&!ta.value.trim()){lplAiNeedComment(ta);return;}
  const sub=comp.querySelector('.lpl-c-submit');if(sub)sub.click();
}
function lplAiNeedComment(ta){
  ta.classList.add('is-invalid');
  let err=ta.nextElementSibling;
  if(!err||!err.classList.contains('lpl-req-err')){
    err=document.createElement('div');err.className='lpl-req-err';err.setAttribute('role','alert');
    err.textContent='Comment is required. Add a comment before submitting.';
    ta.insertAdjacentElement('afterend',err);
  }
  ta.scrollIntoView({block:'center',behavior:'smooth'});
  ta.focus();
  // Cleared the moment something is typed.
  ta.addEventListener('input',function clear(){
    if(!ta.value.trim())return;
    ta.classList.remove('is-invalid');
    const e=ta.nextElementSibling;if(e&&e.classList.contains('lpl-req-err'))e.remove();
    ta.removeEventListener('input',clear);
  });
}
/* Edit: hand over to the form below, first field focused. */
function lplAiEdit(btn){
  const comp=btn.closest('.lpl-composer');if(!comp)return;
  const f=comp.querySelector('.lpl-c-body .cs-wrap:not(.lpl-hidden-sel) .cs-trigger, .lpl-c-body input:not([type=hidden]), .lpl-c-body textarea');
  if(f){f.scrollIntoView({block:'center',behavior:'smooth'});if(f.focus)f.focus();}
}
/* Dismiss: gone for this move; picking a move again brings it back. */
function lplAiDismiss(btn){
  const comp=btn.closest('.lpl-composer');if(!comp)return;
  comp.setAttribute('data-ai-off','1');
  lplAiRender(comp);
}
/* Submit writes the record rows that carry obj/key, then runs the module's
   save. A save that succeeds adds a row to the log and closes the composer
   (renderADTPage patches the tab in place, so the button itself may survive);
   one that is refused - an empty comment - does neither, and the writes are
   undone. */
function lplAiLogCount(btn){
  const root=btn.isConnected&&btn.closest('.lpl');
  return root?root.querySelectorAll('.lpl-table tbody tr').length:-1;
}
function lplAiCommit(btn){
  const comp=btn.closest('.lpl-composer'),box=comp&&comp.querySelector('.lpl-ai'),reg=box&&LPL_AI[box.getAttribute('data-ai')];
  btn._aiUndo=[];
  btn._aiRows=lplAiLogCount(btn);
  if(!reg)return;
  lplAiRows(reg,comp.getAttribute('data-v')||'').record.forEach(function(r){
    const to=lplAiVal(r.to);
    if(!r.obj||!r.key||to==null||to==='')return;
    btn._aiUndo.push([r.obj,r.key,r.obj[r.key]]);
    r.obj[r.key]=to;
  });
}
function lplAiSettle(btn){
  const undo=btn._aiUndo||[];btn._aiUndo=null;
  const comp=btn.isConnected&&btn.closest('.lpl-composer');
  const saved=!comp||comp.hidden||lplAiLogCount(btn)>btn._aiRows;
  if(!saved){undo.reverse().forEach(function(u){u[0][u[1]]=u[2];});return;}
  // Saved: the listing may show a field written here, so it is redrawn too.
  if(undo.length&&typeof renderADTPage==='function')renderADTPage();
}
/* Values picked or typed further down the form (an assignee, a blocker) are
   read again as they change. */
['input','click'].forEach(function(ev){
  document.addEventListener(ev,function(){
    // Any click: a dropdown's menu may sit outside the composer it belongs to.
    setTimeout(function(){
      document.querySelectorAll('.lpl-composer:not([hidden])').forEach(lplAiRender);
    },0);
  });
});
