/* ==========================================================================
   TICKET MOVES  -  the confirm step, and the history every move writes.

   WHAT THIS FILE USED TO BE.  A post-render enhancer: a MutationObserver on
   #adt-content that injected a cluster of commit buttons into every listing
   row - approve, reject, mark paid, close chat. That is gone. A listing row
   is for READING; acting on a record happens in the record, where the rest
   of it is on screen while you decide. Every listing therefore ends in the
   hamburger and nothing else, exactly as it did before the clusters.

   WHAT SURVIVES, AND WHY.  The confirm dialog and the commit path, because
   the support-ticket panel still moves a ticket through TK_FLOW and those
   moves must keep behaving identically wherever they are triggered from -
   every move comes through qaTicketApply below. qaTicket is the confirm-first
   entry point; nothing calls it since the panel's move buttons were taken off
   Basic Details, but it stays because it is the guarded path - it re-checks
   the move against TK_FLOW before applying, which is what any future caller
   outside the Logs form will need.

   THE CONTRACT A MOVE KEEPS.  Ask for a comment, mutate the ticket, write
   the same line into both histories, then qaCommit(): repaint WITHOUT the
   entrance animation and flash the row that changed. The comment is not
   optional - a status no one can explain later is worse than no status.
   ========================================================================== */
(function(){
'use strict';

/* ── icons ─────────────────────────────────────────────────────────────── */
var I={
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
};

/* ── helpers ───────────────────────────────────────────────────────────── */
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function find(arr,id){if(!arr)return null;for(var i=0;i<arr.length;i++)if(String(arr[i].id)===String(id))return arr[i];return null;}
function toast(t,kind,sub){if(typeof showToast==='function')showToast(t,kind||'success',sub);}
/* ticketsData is a `const` at the top level of core.js, which puts it in
   SCRIPT scope: reachable by name from this file, but NOT present on
   `window`. Hence the literal name and the typeof guard - a
   window['ticketsData'] probe would just return undefined and fail silently.
   */
function D(){
  return {
    tickets: typeof ticketsData!=='undefined'?ticketsData:null
  };
}

/* ── commit + feedback ─────────────────────────────────────────────────── */
/* Repaint without the entrance animation, then confirm in the row itself.
   Suppressing the animation is the point: a full page fade-up after a single
   inline click reads as "the page reloaded", which is precisely the feeling
   this whole feature exists to remove. */
window.qaCommit=function(rowSelector,tone){
  var content=document.getElementById('adt-content');
  if(content)content.classList.add('m-quiet');
  if(typeof renderADTPage==='function')renderADTPage();
  requestAnimationFrame(function(){
    var tr=rowSelector?document.querySelector(rowSelector):null;
    if(tr){
      tr.classList.add('m-flash-'+(tone||'ok'));
      var badge=tr.querySelector('.lp-status-badge,.status-pill,.ct-sb-badge');
      if(badge)badge.classList.add('m-changed');
      setTimeout(function(){tr.classList.remove('m-flash-'+(tone||'ok'));},950);
    }
    setTimeout(function(){if(content)content.classList.remove('m-quiet');},60);
  });
};

/* ── the confirm step ──────────────────────────────────────────────────────
   Every inline action goes through here, and every one of them requires a
   comment. That is the whole point: a click on a tick is a keystroke, and a
   keystroke is not a decision anyone can audit later. The dialog states what
   is about to change, takes the reason, and only then commits - so the row's
   history and the row's status can never disagree, and no status in the app
   can be reached without a line in the log saying who moved it and why.

   Some moves need more than a comment (which agent is picking this up, which
   party we are blocked on). Those come through as `fields`. */
var askState=null;

function fieldHTML(f){
  var lab='<label class="qa-ask-label" for="qa-ask-f-'+f.key+'">'+esc(f.label)
    +(f.required===false?'':' <span class="qa-ask-req">*</span>')+'</label>';
  if(f.type==='select'){
    return lab+'<select class="qa-ask-input" id="qa-ask-f-'+f.key+'">'
      +'<option value="">'+esc(f.placeholder||'Select…')+'</option>'
      +(f.options||[]).map(function(o){
        return '<option value="'+esc(o)+'"'+(o===f.value?' selected':'')+'>'+esc(o)+'</option>';
      }).join('')+'</select>';
  }
  return lab+'<textarea class="qa-ask-input qa-ask-area" id="qa-ask-f-'+f.key+'"'
    +' placeholder="'+esc(f.placeholder||'')+'">'+esc(f.value||'')+'</textarea>';
}

function closeAsk(){
  var o=document.getElementById('qa-ask');
  if(o)o.remove();
  document.removeEventListener('keydown',askKey);
  askState=null;
}
function askKey(e){if(e.key==='Escape')closeAsk();}

/* opts: {title, subject, from, to, tone, confirmLabel, fields[], onConfirm(vals)} */
function qaAsk(opts){
  closeAsk();
  askState=opts;
  var fields=opts.fields||[];
  var wrap=document.createElement('div');
  wrap.id='qa-ask';
  wrap.className='qa-ask-overlay';
  wrap.innerHTML='<div class="qa-ask-card" role="dialog" aria-modal="true" aria-label="'+esc(opts.title)+'">'
    +'<div class="qa-ask-head">'
    +'<div class="qa-ask-title">'+esc(opts.title)+'</div>'
    +(opts.subject?'<div class="qa-ask-subject">'+esc(opts.subject)+'</div>':'')
    +'</div>'
    +(opts.to?'<div class="qa-ask-move">'
      +'<span class="qa-ask-chip">'+esc(opts.from||'')+'</span>'
      +'<span class="qa-ask-arrow">'+I.arrow+'</span>'
      +'<span class="qa-ask-chip qa-ask-chip-'+(opts.tone||'ok')+'">'+esc(opts.to)+'</span>'
      +'</div>':'')
    +'<div class="qa-ask-body">'
    +fields.map(fieldHTML).join('')
    +'<label class="qa-ask-label" for="qa-ask-comment">'+esc(opts.commentLabel||'Comment')+' <span class="qa-ask-req">*</span></label>'
    +'<textarea class="qa-ask-input qa-ask-area" id="qa-ask-comment" placeholder="'
      +esc(opts.commentPlaceholder||'Why are you making this change?')+'"></textarea>'
    +'<div class="qa-ask-hint" id="qa-ask-hint">Saved to this record’s Logs and Workflow. It cannot be edited later.</div>'
    +'</div>'
    +'<div class="qa-ask-foot">'
    +'<button type="button" class="qa-ask-btn qa-ask-cancel" id="qa-ask-cancel">Cancel</button>'
    +'<button type="button" class="qa-ask-btn qa-ask-go" id="qa-ask-go">'+esc(opts.confirmLabel||'Confirm')+'</button>'
    +'</div></div>';
  document.body.appendChild(wrap);

  var hint=wrap.querySelector('#qa-ask-hint');
  var flash=function(el,msg){
    if(el){el.classList.add('qa-ask-bad');setTimeout(function(){el.classList.remove('qa-ask-bad');},1400);el.focus();}
    if(hint){hint.textContent=msg;hint.classList.add('qa-ask-hint-bad');
      setTimeout(function(){hint.classList.remove('qa-ask-hint-bad');},1400);}
  };

  wrap.querySelector('#qa-ask-cancel').addEventListener('click',closeAsk);
  wrap.addEventListener('mousedown',function(e){if(e.target===wrap)closeAsk();});
  document.addEventListener('keydown',askKey);

  wrap.querySelector('#qa-ask-go').addEventListener('click',function(){
    var vals={},i,f,el;
    for(i=0;i<fields.length;i++){
      f=fields[i];
      el=document.getElementById('qa-ask-f-'+f.key);
      vals[f.key]=el?String(el.value||'').trim():'';
      if(f.required!==false&&!vals[f.key]){flash(el,f.label+' is required.');return;}
    }
    var c=document.getElementById('qa-ask-comment');
    vals.comment=c?c.value.trim():'';
    if(!vals.comment){flash(c,'A comment is required to record this action.');return;}
    closeAsk();
    opts.onConfirm(vals);
  });

  requestAnimationFrame(function(){
    var first=wrap.querySelector('.qa-ask-input');
    if(first)first.focus();
  });
}

/* ── where each page keeps its history ─────────────────────────────────────
   `wf` is the Workflow-tab timeline (keyed by record id); `logs` is the
   Logs-tab fixture that seedLogs() copies onto the record on first read.
   Named accessors rather than a string lookup for the same reason D() uses
   them: these are script-scope consts and are not reachable off `window`.
   A page may have one store, both, or neither - the comment is required
   either way, because the confirm step is what makes the action deliberate,
   not what happens to be persisted afterwards. */
var HISTORY={
  'support-tickets':{row:'#tk-row-',
    wf:function(){return typeof tkWorkflowData!=='undefined'?tkWorkflowData:null;},
    logs:function(id){return (typeof tkLogsData!=='undefined'&&tkLogsData[id])||[];}}
};

/* Write the action into both histories the record has, then repaint. */
function record(pg,rec,id,o){
  var h=HISTORY[pg];
  if(h){
    if(typeof wfPush==='function')wfPush(h.wf(),id,o.title,o.comment);
    if(typeof logPush==='function')logPush(rec,h.logs(id),o.statusLabel,o.comment);
  }
  qaCommit((h?h.row:'#row-')+id,o.tone);
  toast(o.toastTitle,o.toastKind||'success',o.toastSub);
}

/* ── the move itself ───────────────────── */
/* Tickets move by NAMED MOVE, not by "set the status to X". The move has to
   be one the flow allows from where the ticket actually is, which is what
   stops a stale panel from closing a ticket that nobody has resolved: the
   only move into `closed` lives on `resolved`, and `resolved` is the client's
   to confirm. An out-of-date row (someone else moved it in another tab) fails
   the lookup here rather than silently applying. */
window.qaTicket=function(id,to){
  var t=find(D().tickets,id);if(!t)return;
  if(typeof tkMoves!=='function')return;
  var moves=tkMoves(t),mv=null,i;
  for(i=0;i<moves.length;i++)if(moves[i].to===to)mv=moves[i];
  if(!mv){toast('That is no longer possible','error',t.ticketId+' is now '+lbl(t.status));return;}

  var fields=[];
  if(mv.needs.indexOf('assignee')>=0)fields.push({
    key:'assignee',label:'Assign to',type:'select',placeholder:'Choose an agent…',
    options:(typeof TK_AGENTS!=='undefined'?TK_AGENTS:[]),value:t.assignedTo});
  if(mv.needs.indexOf('waitingOn')>=0)fields.push({
    key:'waitingOn',label:'Waiting on',type:'select',placeholder:'Who are we blocked on?…',
    options:(typeof TK_BLOCKERS!=='undefined'?TK_BLOCKERS:[]),value:t.waitingOn});
  qaAsk({
    title:mv.label,subject:t.ticketId+' · '+t.title,
    from:lbl(t.status),to:lbl(mv.to),tone:mv.tone,confirmLabel:mv.label,fields:fields,
    /* The comment IS the record of what happened, so each move asks its own
       question rather than a generic "why". On the move to Resolved that
       question is "what did you do to resolve this?", and the answer is what
       the panel later shows as the resolution. */
    commentLabel:mv.commentLabel||'Comment',commentPlaceholder:mv.ask,
    onConfirm:function(v){ tkApply(t,id,mv,v); }});
};

/* Shared by the panel's move buttons and the Logs form, so both
   produce identical history for the same move. */
function tkApply(t,id,mv,v){
  if(v.assignee)t.assignedTo=v.assignee;
  /* waitingOn only means anything while blocked - carrying a stale value onto
     an unblocked ticket would make the panel lie about who owes it. */
  t.waitingOn=mv.to==='blocked'?v.waitingOn:'';
  t.status=mv.to;
  var owner=(typeof tkOwner==='function')?tkOwner(t):'';
  record('support-tickets',t,id,{
    title:mv.title,statusLabel:lbl(mv.to),tone:mv.tone,
    comment:v.comment+(t.waitingOn?' (Waiting on: '+t.waitingOn+')':''),
    toastTitle:'Ticket '+lbl(mv.to).toLowerCase(),
    toastKind:mv.tone==='bad'?'error':mv.tone==='ok'?'success':'info',
    toastSub:t.ticketId+' · next: '+owner});
}
/* The Logs form lives in pages.js but must commit through exactly this path. */
window.qaTicketApply=function(id,to,vals){
  var t=find(D().tickets,id);if(!t||typeof tkMoves!=='function')return false;
  var moves=tkMoves(t),mv=null,i;
  for(i=0;i<moves.length;i++)if(moves[i].to===to)mv=moves[i];
  if(!mv)return false;
  tkApply(t,id,mv,vals||{});
  return true;
};
function lbl(s){return (typeof tkStatusLabel==='function')?tkStatusLabel(s):s;}

})();
