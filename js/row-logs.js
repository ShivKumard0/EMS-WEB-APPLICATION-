/* ══ ROW LOGS - a status move from the listing row ══════════════════════════
   Contracts and the employee journey already let a record move on from its
   row: the Action cell carries a status pill whose menu lists the steps, and
   picking one opens a small popup that asks for the comment the move needs.
   This file is that, once, for every other listing.

   THE ROW.  rowLogCell(key,id) draws the Action cell: the status pill (the
   record's current status, with a chevron) and the row's ☰, which still
   opens the detail panel. The pill's menu lists the moves legal from where
   the record is - only those, so it can never offer a move the
   panel's Logs form would refuse.

   THE POPUP.  The Contracts "Update Status" popup (.ct-sm): from -> to badges,
   the Status dropdown, a required comment, "View full log", Cancel / Submit.
   It renders its fields under the SAME ids the module's own Logs form uses
   (tm-log-status-sel, tm-log-comment-inp ...) and is mounted at the very top
   of <body>, so while it is open those ids resolve to the popup even if the
   record's panel is open behind it. Submit then calls the module's own save
   (tmSaveLog, astSaveLog ...) - every side effect a module attaches to a move
   (dates stamped, holders cleared, counters, toasts) happens exactly as it
   does from the panel, because it IS the panel's save.

   A MOVE THAT NEEDS MORE THAN A COMMENT  (an asset being assigned needs the
   employee, a payment being marked Paid needs the payment details, a ticket
   being started needs its assignee) is not squeezed into a popup at all:
   picking it opens the record's own Logs tab, already set to that move, with
   its fields showing.

   SUB-RECORDS.  A record whose parts carry their own status (an expense's line
   items) registers a `parts` scope: the popup gets an Expense / Line Item
   switch, and on Line Item the line is picked first, then its status.

   A module joins by calling rlRegister(pageKey, cfg) and putting
   rowLogCell(pageKey, id) in its Action cell. */
(function(){
'use strict';

var RL={};          // page key -> config
var M=null;         // the open popup: {key,id,to,scope,part}

/* cfg:
     pre        id prefix of the module's Logs form ('tm' -> tm-log-status-sel)
     rec(id)    the record
     status(r)  its current status, as shown
     moves(r)   the values the module's Status dropdown accepts for a move,
                current status excluded
     label(v)   optional: how a move reads in the menu ("Approve")
     target(r,v) optional: the status a move lands on, when the value is a
                move label rather than a status (tickets, chats)
     save(id)   the module's own save
     open(id)   open the detail panel
     logs(id)   open the detail panel on its Logs tab (optionally preset to v)
     count(r)   optional: number of log entries - how a save that keeps the
                status (a note) is still recognised as saved
     sub(r)     the line under the popup title
     needsPanel(r,v) optional: true when a move needs fields only the Logs
                tab has
     parts      optional: {label, list(r), name(p), status(p), moves(p),
                sel, comment (its Logs form's field ids), save(id,partId),
                count(p)} - a sub-record scope */
window.rlRegister=function(key,cfg){RL[key]=cfg;};
/* Listings drawn by the generic builder (core.js buildListingPage) register
   lazily, one config per page, through a factory: key 'lst:<page>'. */
var FACTORY={};
window.rlFactory=function(prefix,fn){FACTORY[prefix]=fn;};
function cfgOf(key){
  if(RL[key])return RL[key];
  var i=String(key).indexOf(':');
  if(i>0&&FACTORY[key.slice(0,i)])RL[key]=FACTORY[key.slice(0,i)](key.slice(i+1));
  return RL[key]||null;
}
window.rlConfig=cfgOf;

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
/* apCS writes option values into an onclick string - quotes would break it. */
function safe(s){return String(s==null?'':s).replace(/['"\\]/g,'');}
var ICO={
  chev:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
  dots:'<svg width="16" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="2" x2="17" y2="2"/><line x1="1" y1="7" x2="17" y2="7"/><line x1="1" y1="12" x2="17" y2="12"/></svg>',
  x:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  arrow:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  list:'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>'
};
/* A move reads as an action, the way the employee journey's menu does
   ("Mark Inactive") - for modules that do not name their own moves. */
var ACT={'Active':'Mark Active','Inactive':'Mark Inactive','Pending':'Mark Pending','Approved':'Approve',
  'Rejected':'Reject','Unapproved':'Unapprove','Cancelled':'Cancel','Deleted':'Delete','Closed':'Close','Paid':'Mark Paid'};
function badge(s){
  if(!s)return '';
  return typeof axBadge==='function'?axBadge(statusTone(s),s):'<span class="lp-status-badge tone-'+statusTone(s)+'">'+esc(s)+'</span>';
}
function mid(key,id){return 'rlm-'+String(key).replace(/[^a-z0-9]/gi,'')+'-'+String(id).replace(/[^a-z0-9]/gi,'');}
/* Ids go through as they are: a number stays a number, because the modules'
   saves look records up with ===. */
function jsq(v){if(typeof v==='number')return String(v);return "'"+String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";}

/* ── The Action cell ───────────────────────────────────────────────────── */
window.rowLogCell=function(key,id){
  var c=cfgOf(key);var r=c&&c.rec(id);
  if(!r)return '';
  var cur=c.status(r);
  var moves=c.moves(r)||[];
  var lab=function(v){return c.label?c.label(v):(ACT[v]||v);};
  /* Drawn exactly as the employee journey's menu (.emp-act-menu): the actions
     only, as plain text rows - the pill already says where the record is.
     A move that stops or ends the record (Reject, Mark Inactive, Delete ...)
     reads in red, as Mark Inactive does there. */
  var row=function(v,label,scope){
    var land=c.target?c.target(r,v):v;
    var stop=typeof statusTone==='function'&&statusTone(land)==='bad';
    return '<div class="ct-act-item emp-act-item next'+(stop?' branch':'')+'" onclick="rlPick('+jsq(key)+','+jsq(id)+','+jsq(v)+(scope?','+jsq(scope):'')+')">'
      +'<span class="emp-act-label">'+esc(label)+'</span></div>';
  };
  var items=moves.map(function(v){return row(v,lab(v));}).join('');
  if(c.parts&&c.parts.list(r).length)items+=row('',c.parts.label+' Status','part');
  if(!items)items='<div class="ct-act-item emp-act-item wait"><span class="emp-act-label">No actions available</span></div>';
  return '<div class="ct-action-wrap rl-wrap">'
    +'<button class="ct-action-btn" title="'+esc(cur)+'" onclick="rlToggle('+jsq(key)+','+jsq(id)+',event)"><span>'+esc(cur)+'</span>'+ICO.chev+'</button>'
    +'<button class="ct-dots-btn" title="View details" onclick="event.stopPropagation();rlOpenPanel('+jsq(key)+','+jsq(id)+')">'+ICO.dots+'</button>'
    +'<div class="ct-action-menu emp-act-menu rl-menu" id="'+mid(key,id)+'">'+items+'</div>'
    +'</div>';
};
window.rlToggle=function(key,id,e){
  if(e)e.stopPropagation();
  var m=document.getElementById(mid(key,id));if(!m)return;
  document.querySelectorAll('.ct-action-menu').forEach(function(x){if(x!==m)x.classList.remove('open');});
  var willOpen=!m.classList.contains('open');
  m.classList.toggle('open');
  if(willOpen&&e){var wrap=e.target.closest('.ct-action-wrap');if(wrap)placeActionMenu(m,wrap);}
};
function closeMenus(){document.querySelectorAll('.ct-action-menu').forEach(function(x){x.classList.remove('open');});}
window.rlOpenPanel=function(key,id){closeMenus();var c=cfgOf(key);if(c)c.open(id);};

/* ── The popup ─────────────────────────────────────────────────────────── */
function root(){
  var el=document.getElementById('rl-root');
  if(!el){
    el=document.createElement('div');el.id='rl-root';
    /* First in <body>: while the popup is open, the module's form ids resolve
       here before they reach a panel that may be open behind it. */
    document.body.insertBefore(el,document.body.firstChild);
  }
  return el;
}
window.rlPick=function(key,id,to,scope){
  closeMenus();
  var c=cfgOf(key);if(!c||!c.rec(id))return;
  /* A move with more to fill in than a comment goes straight to the Logs
     tab, already set to it - no popup in between. */
  if(to&&!scope&&c.needsPanel&&c.needsPanel(c.rec(id),to)){openLogs(c,id,to);return;}
  M={key:key,id:id,to:to||'',scope:scope||'record',part:null};
  if(M.scope==='part'){var ps=c.parts.list(c.rec(id));M.part=ps.length?ps[0].id:null;}
  paint();
  var inp=document.querySelector('#rl-root textarea');if(inp)inp.focus();
};
window.rlClose=function(){M=null;root().innerHTML='';document.removeEventListener('keydown',onKey);};
function onKey(e){if(e.key==='Escape')rlClose();}

/* What the popup is about right now: the record, or one of its parts. */
function subject(){
  var c=cfgOf(M.key),r=c.rec(M.id);
  if(M.scope==='part'){
    var p=c.parts.list(r).find(function(x){return String(x.id)===String(M.part);});
    return {c:c,r:r,p:p,sel:c.parts.sel,com:c.parts.comment,status:p?c.parts.status(p):'',moves:p?c.parts.moves(p):[],
      label:c.parts.label,count:function(){return p&&c.parts.count?c.parts.count(p):0;}};
  }
  return {c:c,r:r,p:null,sel:c.pre+'-log-status-sel',com:c.pre+'-log-comment-inp',status:c.status(r),moves:c.moves(r)||[],
    count:function(){return c.count?c.count(r):0;}};
}
function paint(){
  if(!M)return;
  var el=root();
  /* A repaint (scope switch, line picked, status picked) keeps what was typed. */
  var typed=el.querySelector('textarea');typed=typed?typed.value:'';
  el.innerHTML=html();
  var t=el.querySelector('textarea');if(t&&typed)t.value=typed;
  document.removeEventListener('keydown',onKey);document.addEventListener('keydown',onKey);
}
function html(){
  var s=subject(),c=s.c,r=s.r;
  var opts=s.moves.map(safe);
  var to=opts.indexOf(safe(M.to))>=0?safe(M.to):(opts.length===1?opts[0]:'');
  M.to=to;
  var landing=to?(c.target&&M.scope!=='part'?c.target(r,to):to):'';
  var seg='';
  if(c.parts){
    var b=function(id,l){return '<button type="button" class="seg-btn'+(M.scope===id?' active':'')+'" onclick="rlScope(\''+id+'\')">'+l+'</button>';};
    seg='<div class="segmented is-compact rl-scope">'+b('record',c.recordLabel||'Record')+b('part',c.parts.label)+'</div>';
  }
  var partPick='';
  if(M.scope==='part'){
    var ps=c.parts.list(r);
    if(!ps.length)partPick='<div class="ct-sm-note">This record has no '+c.parts.label.toLowerCase()+'s yet.</div>';
    else{
      var names=ps.map(function(p){return safe(c.parts.name(p));});
      var curName=s.p?safe(c.parts.name(s.p)):'';
      partPick='<div class="ep-form-group ep-form-full"><label class="ep-form-label">'+c.parts.label+' <span class="req">*</span></label>'
        +apCS('rl-part-sel',names,curName,'Select '+c.parts.label,'rlPartHook')+'</div>';
    }
  }
  var body;
  if(M.scope==='part'&&!s.p){
    body='';
  }else if(!opts.length){
    body='<div class="ct-sm-note">'+(M.scope==='part'?'This '+c.parts.label.toLowerCase():'This record')
      +' is <b>'+esc(s.status)+'</b> - there is no further status to move it to.</div>';
  }else{
    body='<div class="ep-form-group ep-form-full"><label class="ep-form-label">Status <span class="req">*</span></label>'
        +apCS(s.sel,opts,to,'Select Status','rlStatusHook')+'</div>'
      +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Comment <span class="req">*</span></label>'
        +'<textarea id="'+s.com+'" class="ep-form-input" rows="4" placeholder="Why is this moving?" '
        +'style="resize:vertical;min-height:90px;height:auto;line-height:1.5"></textarea></div>';
  }
  var canSubmit=opts.length&&(M.scope!=='part'||s.p);
  return '<div class="ct-modal-overlay rl-overlay" onclick="rlClose()">'
    +'<div class="ct-modal ct-sm rl-modal" style="width:min(540px,92vw)" role="dialog" aria-modal="true" aria-label="Update status" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Update Status</span><button class="ct-modal-close" onclick="rlClose()" aria-label="Close">'+ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+(c.sub?c.sub(r):'')+(s.p?' &middot; '+esc(c.parts.name(s.p)):'')+'</p>'
    +seg
    +(s.p||M.scope!=='part'?'<div class="ct-sm-move">'+badge(s.status)+(landing?ICO.arrow+badge(landing):'')+'</div>':'')
    +'<div class="ep-form-grid">'+partPick+body+'</div>'
    +'<div class="ct-modal-foot">'
      +'<button class="add-link" onclick="rlToLogs()">View full log</button>'
      +'<div class="ct-modal-btns">'
        +'<button class="ep-cancel-btn" onclick="rlClose()">Cancel</button>'
        +(canSubmit?'<button class="ep-save-btn" onclick="rlSubmit()">Submit</button>':'')
      +'</div></div>'
    +'</div></div>';
}
window.rlScope=function(s){if(!M)return;M.scope=s;M.to='';
  if(s==='part'&&M.part==null){var c=cfgOf(M.key),ps=c.parts.list(c.rec(M.id));M.part=ps.length?ps[0].id:null;}
  paint();};
window.rlPartHook=function(v){
  if(!M)return;var c=cfgOf(M.key),ps=c.parts.list(c.rec(M.id));
  var p=ps.find(function(x){return safe(c.parts.name(x))===v;});
  M.part=p?p.id:null;M.to='';paint();
};
window.rlStatusHook=function(v){
  if(!M)return;
  var c=cfgOf(M.key);
  /* Picked in the popup, the same: a move that needs the Logs tab goes there. */
  if(M.scope!=='part'&&c.needsPanel&&c.needsPanel(c.rec(M.id),v)){var id=M.id;rlClose();openLogs(c,id,v);return;}
  M.to=v;paint();
};
/* Open the record's Logs tab and set its Status to the move, so the form
   shows that move's own fields (payment details, the employee, the
   assignee) straight away. Its dropdown's hook runs as if it were picked. */
function openLogs(c,id,to){
  c.logs(id,to||'');
  if(!to)return;
  var sel=c.pre+'-log-status-sel';
  setTimeout(function(){
    var opt=[].find.call(document.querySelectorAll('#csd-'+sel+' .cs-option'),function(o){return o.textContent.trim()===to;});
    if(opt&&!opt.classList.contains('cs-selected')&&typeof csSelect==='function')csSelect(opt,to,sel);
    var w=document.getElementById('csw-'+sel);if(w&&w.scrollIntoView)w.scrollIntoView({block:'nearest'});
  },0);
}
/* Hand over to the record's own Logs tab - for "View full log", and for a
   move whose extra fields only the Logs tab has. */
window.rlToLogs=function(withMove){
  if(!M)return;var c=cfgOf(M.key),id=M.id,to=withMove?M.to:'';
  rlClose();openLogs(c,id,to);
};
window.rlSubmit=function(){
  if(!M)return;
  var s=subject(),c=s.c,r=s.r;
  if(!getCSValue(s.sel)){var t=csTrigger(s.sel);if(t){t.style.borderColor='#b83a3a';setTimeout(function(){t.style.borderColor='';},1500);}return;}
  var inp=document.getElementById(s.com);
  if(inp&&!inp.value.trim()){inp.style.borderColor='#b83a3a';inp.focus();setTimeout(function(){inp.style.borderColor='';},1500);return;}
  var before=s.status+'|'+s.count();
  var key=M.key,id=M.id;
  try{
    if(M.scope==='part')c.parts.save(id,s.p.id);else c.save(id);
  }catch(err){if(window.console)console.error('Row log save failed ['+key+']',err);}
  /* The module's save validates and toasts; it moved (or logged) when the
     status or the log count changed. If neither did, its validation stopped
     it - the popup stays open with the fields it flagged. */
  var after=subject();
  if(after.status+'|'+after.count()===before)return;
  rlClose();
  var pfx=typeof LP_ROW_PREFIX!=='undefined'&&LP_ROW_PREFIX[key]||c.rowPrefix||'';
  if(typeof qaCommit==='function')qaCommit(pfx?'#'+pfx+'-row-'+id:null,'ok');
  else if(typeof renderADTPage==='function')renderADTPage();
};
})();
