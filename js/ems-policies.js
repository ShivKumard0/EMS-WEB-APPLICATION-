/* ══ POLICIES (product owner, 12 Nov 2026) ═══════════════════════════════════════════════════════════════════════
   Expense Management → Policies, its own menu item below Capping Limit and above Wallet & Benefits.
   - The + opens Add Policy: Name, Category (General, the expense sub categories and the advance types) and the
     Description, written in a full word-processor editor (TinyMCE 6, MIT licence, kept in vendor/tinymce and loaded
     only when the form opens). Submit makes the policy Active straight away.
   - The policies show as cards: status, name, category, the first lines of the text and Learn More. Learn More opens
     the policy in the side panel: Policy (the full text, Edit) and Logs (Deactivate / Activate with a note).
   - Employees read every Active policy of their company in My Profile → Policies.
   A policy is text for people to read: it does not check or limit claims (Capping Limit does that).
   In the presentation, Nova Retail starts with five policies, added once. */
const EPOL_PAGE='expense-policies';
let epolRecords=[];        // {id, entity, name, category, html, status, createdBy, createdIso, updatedBy, updatedIso, logs}
let epolSeq=1000;
let epolSeeded=false;      // the presentation's sample policies have been added
let epolSel=null,epolTab='policy',epolQ='',epolCatF='',epolStatF='';
let epolForm=null;         // the open Add / Edit form: {id, name, category, html}
let epolReadSel=null;      // the policy an employee is reading (My Profile → Policies)
let epolPQ='';             // My Profile → Policies search
let epolLogAct=null;       // the move picked in Logs: {id, label, to, need, note}

const EPOL_ICO={
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><path d="M16 5h2a1 1 0 0 1 1 1v6"/><path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6"/><line x1="8" y1="10" x2="15" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><path d="M18 14l3 1.2v2.6c0 1.9-1.3 3.4-3 4.2-1.7-.8-3-2.3-3-4.2v-2.6z"/></svg>',
  arrow:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
};

/* ── Records ───────────────────────────────────────────────────────────── */
function epolKey(r){return 'POL-'+r.id;}
function epolRec(id){return epolRecords.find(function(r){return r.id===id;})||null;}
function epolHere(){epolSeedNova();return epolRecords.filter(function(r){return r.entity===idEntity();});}
function epolCanManage(){return typeof capCan==='function'&&capCan('expense.policy.manage');}
/* Read access for everyone in the company (product owner, 13 Nov 2026: "in employee in Expense Management show policies
   as well with just view access", and from the profile menu "show all the policies which is there in the company
   admin"): anyone holding a role in this company opens Policies and reads every policy - the same list the Company
   Admin sees. Adding, editing, activating and deactivating still need expense.policy.manage. */
function epolReadAll(){return typeof idMe==='function'&&!!idMe()&&typeof emsRole==='function'&&!!emsRole();}
function epolCanView(){return (typeof capCan==='function'&&(capCan('expense.policy.view')||capCan('expense.policy.list')))||epolCanManage()||epolReadAll();}
function epolCategories(){
  const exp=typeof capCategories==='function'?capCategories():[];
  let adv=[];
  try{adv=typeof advTypesHere==='function'?advTypesHere(true).map(function(t){return t.name;}):[];}catch(e){adv=[];}
  if((typeof emsClientOnly==='function'&&emsClientOnly())||/[?&]env=presentation/.test(location.search))adv=adv.filter(function(n){return !/Imprest|Petty Cash/i.test(n);});
  const out=['General'];
  exp.concat(adv).forEach(function(n){if(n&&out.indexOf(n)<0)out.push(n);});
  return out;
}
function epolSave(){if(typeof presSaveSoon==='function')presSaveSoon();}

/* The policy text as it is shown: the editor's HTML without scripts, event handlers or script links. */
function epolSafe(html){
  const doc=new DOMParser().parseFromString('<div id="epol-x">'+String(html||'')+'</div>','text/html');
  const root=doc.getElementById('epol-x');if(!root)return '';
  root.querySelectorAll('script,style,object,embed,link,meta,base,form,input,button,textarea,select').forEach(function(n){n.remove();});
  root.querySelectorAll('iframe').forEach(function(f){if(!/^https:\/\//i.test(f.getAttribute('src')||''))f.remove();});
  root.querySelectorAll('*').forEach(function(el){
    Array.prototype.slice.call(el.attributes).forEach(function(a){
      const n=a.name.toLowerCase();
      if(n.indexOf('on')===0||((n==='href'||n==='src'||n==='xlink:href'||n==='action')&&/^\s*(javascript|vbscript|data:text)/i.test(a.value)))el.removeAttribute(a.name);
    });
    if(el.tagName==='A'){el.setAttribute('target','_blank');el.setAttribute('rel','noopener');}
  });
  return root.innerHTML;
}
function epolText(html){
  const d=new DOMParser().parseFromString('<div>'+String(html||'')+'</div>','text/html');
  /* Headings, paragraphs and list items read as separate sentences, not run together. */
  d.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,div,br,tr,td,th,blockquote').forEach(function(el){el.appendChild(d.createTextNode(' '));});
  d.body.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(el){el.appendChild(d.createTextNode('· '));});
  return (d.body.textContent||'').replace(/\s+/g,' ').replace(/\s·\s*$/,'').trim();
}
function epolBadge(r){return axBadge(statusTone(r.status),r.status);}

/* ── The card ──────────────────────────────────────────────────────────── */
function epolCardHTML(r,open,selected){
  const snip=epolText(r.html);
  return '<div class="epol-card'+(selected?' is-selected':'')+'" id="epol-card-'+r.id+'" onclick="'+open+'('+r.id+')">'
    +epolBadge(r)
    +'<div class="epol-ico">'+EPOL_ICO.doc+'</div>'
    +'<div class="epol-name">'+sbEsc(r.name)+'</div>'
    +'<div class="epol-cat">'+sbEsc(r.category)+'</div>'
    +'<div class="epol-snip" title="'+attrSafe(snip.slice(0,300))+'">'+sbEsc(snip.slice(0,220))+'</div>'
    +'<button type="button" class="epol-more" onclick="event.stopPropagation();'+open+'('+r.id+')">Learn More '+EPOL_ICO.arrow+'</button>'
    +'</div>';
}

/* ── The Policies page (admins) ────────────────────────────────────────── */
function epolRows(){
  const q=String(epolQ||'').toLowerCase().trim();
  return epolHere().filter(function(r){
    if(epolCatF&&r.category!==epolCatF)return false;
    if(epolStatF&&r.status!==epolStatF)return false;
    if(q&&(r.name+' '+r.category+' '+epolKey(r)+' '+epolText(r.html)).toLowerCase().indexOf(q)<0)return false;
    return true;
  }).sort(function(a,b){return b.id-a.id;});
}
function epolApply(){
  const v=getCSValue('epol-f-cat');epolCatF=v&&v!=='All Categories'?v:'';
  epolQ=lpSearchValue('epol-f-q');epolSel=null;renderADTPage();
}
function epolReset(){epolQ='';epolCatF='';epolStatF='';epolSel=null;renderADTPage();}
function epolToggleStat(s){epolStatF=epolStatF===s?'':s;epolSel=null;renderADTPage();}
function epolPageHTML(){
  if(!epolCanView())
    return '<div class="lp-page"><div class="wb-empty"><b>No access</b><span>Policies need the expense.policy.view permission.</span></div></div>';
  const rows=epolRows();
  if(epolSel!=null&&!rows.some(function(r){return r.id===epolSel;}))epolSel=null;
  const pgn=listPage(EPOL_PAGE,[epolQ,epolCatF,epolStatF].join('|'),rows.map(function(r){return epolCardHTML(r,'epolOpen',epolSel===r.id);}),
    '<div class="wb-empty" style="grid-column:1/-1"><b>No policies</b><span>'+(epolHere().length?'No policy matches this filter.':(epolCanManage()?'Add the first policy with the + button.':'No policies have been added yet.'))+'</span></div>');
  const count=function(s){return epolHere().filter(function(r){return r.status===s;}).length;};
  const stat=function(s){
    return '<div class="listing-stat'+(epolStatF===s?' stat-selected':'')+'" onclick="epolToggleStat(\''+s+'\')">'
      +'<div class="listing-stat-count" style="color:var(--st-'+statusTone(s)+'-fg)">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="exp-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('epol-f-q',epolQ,'Search policies','epolApply()')
    +apCS('epol-f-cat',epolCategories(),epolCatF,'All Categories')
    +clearFiltersBtn([epolQ,epolCatF,epolStatF],'epolReset()')
    +'<button class="lp-pill-search" onclick="epolApply()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'+['Active','Inactive'].map(stat).join('')+'</div></div>'
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="epol-split-wrap"><div class="lp-split-main">'
    +'<div class="epol-grid">'+pgn.rows+'</div>'+pgn.pager
    +'</div>'
    +'<div class="lp-split-sb'+(epolSel!=null?' open':'')+'" id="epol-split-sb"><div class="lp-isb" id="epol-isb-inner">'+(epolSel!=null?sbRender(epolPanelHTML,'epol'):'')+'</div></div>'
    +'</div>'
    +(epolForm?epolFormHTML():'')
    +'</div>';
}

/* ── The side panel: Policy · Logs ─────────────────────────────────────── */
function epolOpen(id,tab){
  if(epolSel!==id)epolLogAct=null;
  epolTab=tab||(typeof sbKeepTab==='function'?sbKeepTab(epolSel,epolTab,'policy'):'policy');epolSel=id;
  const sb=document.getElementById('epol-split-sb');
  if(!sb){renderADTPage();return;}
  sb.classList.add('open');
  isbTab('epol',epolPanelHTML);
  document.querySelectorAll('.epol-card').forEach(function(c){c.classList.toggle('is-selected',c.id==='epol-card-'+id);});
}
function epolClose(){
  epolSel=null;epolLogAct=null;
  const sb=document.getElementById('epol-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.epol-card').forEach(function(c){c.classList.remove('is-selected');});
}
function epolNavTab(t){epolTab=t;isbTab('epol',epolPanelHTML);}
function epolPanelHTML(){
  const r=epolRec(epolSel);if(!r)return '';
  const tabBar=axTabBar('epol',[{id:'policy',label:'Policy'},{id:'logs',label:'Logs'}],epolTab,'epolNavTab','epolClose');
  let body='';
  if(epolTab==='logs'){
    body=epolLogsHTML(r);
  }else{
    body=sbHero({icon:EPOL_ICO.doc,name:sbEsc(r.name),meta:[epolKey(r),sbEsc(r.category)],status:epolBadge(r),editing:false,
        onEdit:epolCanManage()?'epolStartEdit('+r.id+')':''})
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Category',sbEsc(r.category))
      +axField(AX_ICO.fCheck,'Status',epolBadge(r)+' <span class="ax-sub">'+(r.status==='Active'?'in force':'no longer in force')+'</span>')
      +axField(AX_ICO.fUser,'Created By',sbEsc(r.createdBy||'—')+(r.createdIso?' <span class="ax-sub">'+cdLabel(r.createdIso)+'</span>':''))
      +axField(AX_ICO.fCal,'Last Updated',r.updatedIso?cdLabel(r.updatedIso)+(r.updatedBy?' <span class="ax-sub">by '+sbEsc(r.updatedBy)+'</span>':''):'—')
      +'</div>'
      +'<div class="lp-sb-view-header" style="margin-top:6px"><span class="lp-sb-section-title">Description</span></div>'
      +'<div class="epol-doc">'+epolSafe(r.html)+'</div>';
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}

/* Logs: Deactivate (a note is required) or Activate, by a person who manages policies. */
function epolMoves(r){
  if(!epolCanManage())return [];
  return r.status==='Active'?[{label:'Deactivate',to:'Inactive',need:true}]:[{label:'Activate',to:'Active',need:false}];
}
function epolActOf(r){return epolLogAct&&r&&epolLogAct.id===r.id?epolLogAct:null;}
function epolLogForm(r){
  const moves=epolMoves(r);if(!moves.length)return '';
  const a=epolActOf(r),opt=!!(a&&!a.need);
  return '<div class="lp-logs-form"><div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+r.status+'</div><p class="lp-logs-form-sub"></p>'
    +lpLogStatusField('epoll-act-'+r.id,r.status,[r.status].concat(moves.map(function(m){return m.label;})),'epolLogPick')
    +'<div class="lp-logs-form-label">Note'+(opt?'':' <span class="lp-logs-form-req">*</span>')+'</div>'
    +'<textarea class="lp-logs-form-textarea" id="epoll-note" placeholder="'+(opt?'Optional':'Enter note')+'">'+sbEsc(a?a.note||'':'')+'</textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px"><button class="ep-cancel-btn" style="flex:1" onclick="epolLogCancel()">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="epolLogSubmit('+r.id+')">Submit</button></div></div>';
}
function epolLogsHTML(r){
  const a=epolActOf(r);
  return lpLogsView(r.logs||[],epolLogForm(r),{select:true,current:r.status,open:a?a.label:undefined,isBack:function(v){return /^Deactivate/.test(v);}});
}
function epolLogPick(val,csid){
  const id=Number(String(csid||'').replace(/^epoll-act-/,'')),r=epolRec(id);if(!r||!val)return;
  const cur=epolActOf(r);if(cur&&cur.label===val)return;
  const m=epolMoves(r).find(function(x){return x.label===val;});if(!m)return;
  const ta=document.getElementById('epoll-note');
  epolLogAct=Object.assign({id:id,note:ta?ta.value:(cur?cur.note:'')},m);
  isbTab('epol',epolPanelHTML);
}
function epolLogCancel(){if(epolLogAct){epolLogAct=null;isbTab('epol',epolPanelHTML);}}
function epolLogSubmit(id){
  const r=epolRec(id),a=epolActOf(r);
  if(!r||!a){showToast('Pick an action','error','Choose Deactivate or Activate first.');return;}
  const ta=document.getElementById('epoll-note'),note=String(ta?ta.value:a.note||'').trim().replace(/[.\s]+$/,'');
  if(a.need&&!note){if(ta)ta.classList.add('is-invalid');showToast('Note is required','error','Write a note for '+a.label+'.');return;}
  const A=caNow();
  r.status=a.to;r.updatedBy=caN(A.who);r.updatedIso=A.iso;
  ccLog(r,r.status,(a.to==='Active'?'Activated: employees see it again in My Profile → Policies.':'Deactivated: hidden from employees.')+(note?' Note: '+note+'.':''),A);
  epolLogAct=null;epolSave();renderADTPage();
  showToast('Policy '+(a.to==='Active'?'activated':'deactivated'),'success',epolKey(r)+' · '+r.name+' is '+r.status+'.');
}

/* ── Add / Edit Policy ─────────────────────────────────────────────────── */
function epolStart(){
  if(!epolCanManage()){if(typeof emsDeny==='function')emsDeny('add policies');return;}
  epolForm={id:null,name:'',category:'',html:''};
  if(typeof page!=='undefined'&&page!==EPOL_PAGE)navigatePage(EPOL_PAGE);else renderADTPage();
}
function epolStartEdit(id){
  const r=epolRec(id);if(!r||!epolCanManage())return;
  epolForm={id:r.id,name:r.name,category:r.category,html:r.html};
  renderADTPage();
}
function epolCatHook(v){if(epolForm)epolForm.category=v||'';}
function epolFormHTML(){
  const f=epolForm,edit=f.id!=null;
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal epol-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+(edit?'Edit Policy':'Add Policy')+'</span><button class="ct-modal-close" onclick="epolCancel()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+(edit?epolKey(epolRec(f.id)||{id:f.id})+' · changes show to employees as soon as you submit.':'Employees read the policy in My Profile → Policies once it is submitted.')+' Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid">'
    +'<div class="ep-form-group"><label class="ep-form-label">Name <span class="req">*</span></label><input class="ep-form-input" id="epol-name" maxlength="120" placeholder="Enter policy name" value="'+attrSafe(f.name)+'"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Category <span class="req">*</span></label>'+apCS('epol-cat',epolCategories(),f.category,'Select Option','epolCatHook')+'</div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Description <span class="req">*</span></label><div class="epol-ed-host" id="epol-ed-host"></div></div>'
    +'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="epolCancel()">Cancel</button>'
    +'<button class="ep-save-btn" onclick="epolSubmit()">'+(edit?'Save':'Submit')+'</button></div></div>'
    +'</div></div>';
}
function epolSyncForm(ed){
  if(!epolForm)return;
  const n=document.getElementById('epol-name');if(n)epolForm.name=n.value;
  if(document.getElementById('csw-epol-cat')){const c=getCSValue('epol-cat');if(c)epolForm.category=c;}
  if(ed){try{if(document.body.contains(ed.getContainer()))epolForm.html=ed.getContent();}catch(e){}}
  else{const ta=document.getElementById('epol-ed');if(ta&&ta.style.display!=='none')epolForm.html=ta.value;}
}
function epolEditor(){return typeof tinymce!=='undefined'&&tinymce?tinymce.get('epol-ed'):null;}
function epolDropEditor(){const ed=epolEditor();if(ed)ed.remove();}
function epolCancel(){epolDropEditor();epolForm=null;renderADTPage();}
function epolSubmit(){
  const f=epolForm;if(!f)return;
  const nameEl=document.getElementById('epol-name');f.name=String(nameEl?nameEl.value:f.name).trim();
  f.category=getCSValue('epol-cat')||f.category||'';
  const ed=epolEditor(),ta=document.getElementById('epol-ed');
  f.html=ed?ed.getContent():(ta?ta.value:f.html);
  const text=epolText(f.html);
  if(f.name.length<3){if(nameEl)nameEl.classList.add('is-invalid');showToast('Name is required','error','Give the policy a name (at least 3 characters).');return;}
  if(!f.category){showToast('Category is required','error','Pick the category the policy is about.');return;}
  if(text.length<10){showToast('Description is required','error','Write the policy in Description.');return;}
  if(f.html.length>200000){showToast('Description is too long','error','Shorten the text or remove pasted images.');return;}
  if(epolHere().some(function(r){return r.id!==f.id&&r.name.toLowerCase()===f.name.toLowerCase();})){
    if(nameEl)nameEl.classList.add('is-invalid');showToast('Name already used','error','Another policy is called "'+f.name+'".');return;}
  const A=caNow();let r;
  if(f.id!=null){
    r=epolRec(f.id);if(!r)return;
    const what=[];if(r.name!==f.name)what.push('name');if(r.category!==f.category)what.push('category');if(r.html!==f.html)what.push('description');
    r.name=f.name;r.category=f.category;r.html=f.html;r.updatedBy=caN(A.who);r.updatedIso=A.iso;
    ccLog(r,r.status,'Policy updated'+(what.length?' ('+what.join(', ')+')':'')+'.',A);
  }else{
    r={id:++epolSeq,entity:idEntity(),name:f.name,category:f.category,html:f.html,status:'Active',
       createdBy:caN(A.who),createdIso:A.iso,updatedBy:caN(A.who),updatedIso:A.iso,logs:[]};
    ccLog(r,'Active','Policy created and published to employees.',A);
    epolRecords.push(r);
  }
  epolDropEditor();epolForm=null;epolSel=r.id;epolTab='policy';epolSave();renderADTPage();
  showToast(f.id!=null?'Policy saved':'Policy added','success',epolKey(r)+' · '+r.name+' is Active; employees see it in My Profile → Policies.');
}

/* The editor: TinyMCE, loaded the first time a form opens. The page's repaint leaves it alone (data-patch-keep). */
const epolTmCache={loading:null};
function epolLoadTm(){
  if(typeof tinymce!=='undefined'&&tinymce)return Promise.resolve();
  if(epolTmCache.loading)return epolTmCache.loading;
  epolTmCache.loading=new Promise(function(res,rej){
    const s=document.createElement('script');s.src='vendor/tinymce/tinymce.min.js';s.referrerPolicy='origin';
    s.onload=function(){res();};s.onerror=function(){epolTmCache.loading=null;rej(new Error('editor not loaded'));};
    document.head.appendChild(s);
  });
  return epolTmCache.loading;
}
function epolEnsureEditor(){
  const host=document.getElementById('epol-ed-host');
  if(!epolForm||!host||host.__epolInit)return;
  host.__epolInit=true;
  const ta=document.createElement('textarea');ta.id='epol-ed';ta.className='ep-form-input';ta.setAttribute('data-patch-keep','');
  ta.style.minHeight='300px';ta.value=epolForm.html||'';
  host.appendChild(ta);
  epolLoadTm().then(function(){
    if(!document.body.contains(ta))return;
    tinymce.init({
      target:ta,
      base_url:new URL('vendor/tinymce',document.baseURI).href.replace(/\/$/,''),suffix:'.min',
      promotion:false,branding:false,height:460,resize:true,
      menubar:'file edit insert view format table tools',
      plugins:'advlist anchor autolink charmap code emoticons fullscreen image insertdatetime link lists media preview searchreplace table visualblocks wordcount',
      toolbar:'undo redo | styles | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | print preview media | forecolor backcolor emoticons',
      toolbar_mode:'wrap',paste_data_images:false,automatic_uploads:false,
      content_style:'body{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.6;color:#0f172a;margin:14px 16px}',
      setup:function(ed){
        ed.on('init',function(){const c=ed.getContainer();if(c)c.setAttribute('data-patch-keep','');ed.setContent(epolForm?epolForm.html||'':'');});
      }
    });
  }).catch(function(){
    ta.removeAttribute('style');ta.style.minHeight='240px';
    showToast('Editor not available','error','The text box is shown instead; formatting is not available offline.');
  });
}

/* ── My Profile → Policies (everyone) ──────────────────────────────────── */
function epolProfileRows(){
  const q=String(epolPQ||'').toLowerCase().trim();
  return epolHere().filter(function(r){
    return r.status==='Active'&&(!q||(r.name+' '+r.category+' '+epolText(r.html)).toLowerCase().indexOf(q)>=0);
  }).sort(function(a,b){return a.name.localeCompare(b.name);});
}
function epolPApply(){epolPQ=lpSearchValue('epol-p-q');if(typeof refreshProfile==='function')refreshProfile();else renderADTPage();}
function epolProfileHTML(){
  const rows=epolProfileRows(),all=epolHere().filter(function(r){return r.status==='Active';}).length;
  return '<div class="ep-form-card"><div class="prof-section-hdr"><span class="policy-section-title">Company Policies</span>'
    +'<span class="wb-muted" style="margin-left:auto;font-size:12px">'+all+' polic'+(all===1?'y':'ies')+'</span></div>'
    +(all?'<div class="lp-filter-bar-row" style="margin-bottom:4px">'+lpSearchField('epol-p-q',epolPQ,'Search policies','epolPApply()')
      +'<button class="lp-pill-search" onclick="epolPApply()">Search</button></div>':'')
    +(rows.length?'<div class="epol-grid">'+rows.map(function(r){return epolCardHTML(r,'epolRead',false);}).join('')+'</div>'
      :'<div class="wb-empty"><b>No policies</b><span>'+(all?'No policy matches this search.':'Your company has not published any policies yet.')+'</span></div>')
    +'</div>';
}
function epolRead(id){epolReadSel=id;renderADTPage();}
function epolReadClose(){epolReadSel=null;renderADTPage();}
function epolReadHTML(){
  const r=epolRec(epolReadSel);if(!r||r.status!=='Active')return '';
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal epol-read" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">'+sbEsc(r.name)+'</span><button class="ct-modal-close" onclick="epolReadClose()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">'+sbEsc(r.category)+' · '+epolKey(r)+(r.updatedIso?' · Updated '+cdLabel(r.updatedIso):'')+'</p>'
    +'<div class="epol-doc">'+epolSafe(r.html)+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="epolReadClose()">Back</button></div></div>'
    +'</div></div>';
}

/* ── Presentation: Nova Retail's policies, added once ──────────────────── */
function epolSeedNova(){
  if(epolSeeded||typeof PRES_ON==='undefined'||!PRES_ON||typeof presNova!=='function')return;
  if(typeof presBuilding!=='undefined'&&presBuilding)return;
  const n=presNova();if(!n)return;
  const ent=n.entityId||n.id,today=typeof wbToday==='function'?wbToday():new Date().toISOString().slice(0,10);
  const day=function(k){return typeof wbAddDays==='function'?wbAddDays(today,k):today;};
  const P=[
    ['Expense Claims - General Rules','General',-62,
      '<h2>Purpose</h2><p>This policy explains how Nova Retail employees claim back money they spend on company business, and how those claims are approved and paid.</p>'
      +'<h2>Who it applies to</h2><p>Every employee of Nova Retail Pvt Ltd, at our stores, warehouses and offices.</p>'
      +'<h2>Raising a claim</h2><ul><li>Raise the claim in <strong>Expenses &amp; Advances</strong> within <strong>30 days</strong> of the spend.</li><li>Attach a receipt or tax invoice for every item. A GST invoice is needed for any single bill of ₹2,000 or more.</li><li>One claim can hold several items; give each item its own Expense Type and date.</li></ul>'
      +'<h2>Approval and payment</h2><p>Your reporting manager reviews the claim first, then Finance. An item outside this policy may be rejected or sent back for follow-up with a note. Approved claims are paid to your salary account on file in the next reimbursement run.</p>'
      +'<h2>Not reimbursed</h2><ul><li>Alcohol, tobacco and personal entertainment</li><li>Traffic fines and late-payment charges</li><li>Anything already paid with your Nova card or settled against an advance</li></ul>'],
    ['Travel & Accommodation','Travel Reimbursement',-55,
      '<h2>Booking travel</h2><ul><li>Book economy class for flights and AC 2-tier or chair car for trains.</li><li>Book at least 7 days ahead where the trip is known, and keep the booking confirmation.</li><li>Use app-based cabs or the company travel desk for airport and station transfers.</li></ul>'
      +'<h2>Hotels</h2><p>Stay at a hotel within the limit set for your grade in Capping Limit. Shared stays with colleagues on the same trip are encouraged.</p>'
      +'<h2>Claiming</h2><p>Claim tickets, hotel and local travel on one claim after the trip, with the itinerary attached. If you took a travel advance, settle it on the same claim.</p>'],
    ['Meal Allowance','Meal Allowance',-48,
      '<h2>Your monthly allowance</h2><p>Each month <strong>₹2,200</strong> is loaded to the <strong>Meal</strong> wallet on your Nova card. Pay for meals with the card at restaurants and food outlets; the amount comes from the Meal wallet.</p>'
      +'<h2>Rules</h2><ul><li>The Meal wallet works only at food merchants.</li><li>Unused balance stays on the wallet until the end of the financial year.</li><li>Team meals with clients are claimed as an expense with the attendees named, not paid from the Meal wallet.</li></ul>'],
    ['Fuel & Local Conveyance','Fuel Reimbursement',-41,
      '<h2>Fuel</h2><p>Field staff who use their own vehicle for store visits receive <strong>₹3,000</strong> a month on the <strong>Fuel</strong> wallet of their Nova card, usable at fuel stations only.</p>'
      +'<h2>Local conveyance</h2><ul><li>Auto and cab fares for official visits are claimed as an expense with the route and purpose.</li><li>Keep app receipts; for an auto without a receipt, note the route in Description.</li><li>Travel between home and your usual workplace is not claimed.</li></ul>'],
    ['Travel Advance & Settlement','Travel Advance',-34,
      '<h2>Requesting an advance</h2><p>Request a travel advance from <strong>Expenses &amp; Advances</strong> at least 2 days before the trip, with the dates, purpose and expected costs. Your manager and Finance approve it, and Finance pays it to your salary account.</p>'
      +'<h2>Settling it</h2><ul><li>Settle the advance with your expense claim within <strong>7 days</strong> of coming back.</li><li>Return any unspent cash within the same 7 days.</li><li>A new advance is not issued while an earlier one is still open.</li></ul>']
  ];
  P.forEach(function(p,i){
    const iso=day(p[2]),r={id:++epolSeq,entity:ent,name:p[0],category:p[1],html:p[3],status:'Active',
      createdBy:'Karan Shah',createdIso:iso,updatedBy:'Karan Shah',updatedIso:iso,logs:[]};
    r.logs.unshift({date:cdLabel(iso),time:['10:12:41 AM','11:05:09 AM','03:22:17 PM','12:40:55 PM','04:18:30 PM'][i],user:'Karan Shah',status:'Active',action:'Policy created and published to employees.'});
    epolRecords.push(r);
  });
  epolSeeded=true;epolSave();
}

(function(){
  /* 1 · The menu item: below Capping Limit, above Wallet & Benefits. */
  if(typeof sidebarItems!=='undefined')sidebarItems.forEach(function(g){
    if(!g.children||g.children.some(function(c){return c.id===EPOL_PAGE;}))return;
    const i=g.children.findIndex(function(c){return c.id==='capping-limit';});
    if(i>=0)g.children.splice(i+1,0,{id:EPOL_PAGE,label:'Policies',color:'green',icon:(typeof sbIco!=='undefined'&&sbIco.fileText)||EPOL_ICO.doc});
  });
  if(typeof supportPageMeta!=='undefined')supportPageMeta[EPOL_PAGE]={title:'Policies',context:'Policies',filters:[],columns:[],rows:[]};
  /* The title is answered here too: the presentation restores its own copy of the page list. */
  if(typeof getPageTitle==='function'){
    const g0=getPageTitle;
    getPageTitle=function(pg){return pg===EPOL_PAGE?'Policies':g0.apply(this,arguments);};
  }
  /* 2 · Who sees it and who adds: the people who see and manage Capping Limit; part of the Expenses module. */
  if(typeof MC_PAGE_MODULE!=='undefined')MC_PAGE_MODULE[EPOL_PAGE]='expenses';
  if(typeof EMS_CLIENT_PAGES!=='undefined'&&EMS_CLIENT_PAGES.indexOf(EPOL_PAGE)<0)EMS_CLIENT_PAGES.push(EPOL_PAGE);
  if(typeof APP_PAGE_PERMS!=='undefined')APP_PAGE_PERMS[EPOL_PAGE]=(APP_PAGE_PERMS['capping-limit']||['expense.policy.list']).slice();
  if(typeof APP_ADD_PERMS!=='undefined')APP_ADD_PERMS[EPOL_PAGE]=['expense.policy.manage'];
  /* Everyone in the company may open it to read (view only; see epolReadAll). */
  if(typeof appPagePermitted==='function'){
    const pp0=appPagePermitted;
    appPagePermitted=function(pg){if(pg===EPOL_PAGE&&epolReadAll())return true;return pp0.apply(this,arguments);};
  }
  /* 3 · The page, and its + button. */
  if(typeof renderPageContent==='function'){
    const r0=renderPageContent;
    renderPageContent=function(target){
      if(typeof page==='undefined'||page!==EPOL_PAGE)return r0.apply(this,arguments);
      const el=typeof target==='string'?document.getElementById(target):target;if(!el)return;
      if(typeof emsApplyChrome==='function')emsApplyChrome();
      if(typeof emsPageGuard==='function'){const g=emsPageGuard(page);if(g){el.innerHTML=g;return;}}
      el.innerHTML=epolPageHTML();
    };
  }
  if(typeof addListingItem==='function'){
    const a0=addListingItem;
    addListingItem=function(pg){if(pg===EPOL_PAGE){epolStart();return;}return a0.apply(this,arguments);};
  }
  /* Leaving the page closes its form; leaving My Profile closes the policy being read. */
  if(typeof navigatePage==='function'){
    const n0=navigatePage;
    navigatePage=function(pg){
      if(pg!==EPOL_PAGE&&epolForm){epolDropEditor();epolForm=null;}
      if(pg!==EPOL_PAGE){epolSel=null;epolLogAct=null;}
      if(pg!=='my-profile')epolReadSel=null;
      return n0.apply(this,arguments);
    };
  }
  /* The editor is set up after the form is drawn (and re-presented as a page). A repaint redraws the form's fields, so
     what was typed - name, category and the text - is kept on the form first, and the editor comes back with it. */
  if(typeof renderADTPage==='function'){
    const d0=renderADTPage;
    renderADTPage=function(){
      const ed=epolForm?epolEditor():null;
      if(epolForm)epolSyncForm(ed);
      const out=d0.apply(this,arguments);
      if(ed){const box=ed.getContainer();if(!box||!document.body.contains(box)){try{ed.remove();}catch(e){}}}
      if(epolForm)Promise.resolve().then(function(){requestAnimationFrame(epolEnsureEditor);});
      return out;
    };
  }
  /* 4 · My Profile → Policies, before Change Password. */
  if(typeof buildMyProfileHTML==='function'){
    const p0=buildMyProfileHTML;
    buildMyProfileHTML=function(){
      let out=p0.apply(this,arguments);
      const on=typeof mcOn!=='function'||mcOn('expenses');
      if(!on)return out;
      const btn='<button class="prof-tab'+(profTab==='policies'?' active':'')+'" data-tab="policies" onclick="setProfTab(\'policies\')">Policies</button>';
      const cp=out.indexOf('data-tab="change-password"');
      if(cp>=0){const s=out.lastIndexOf('<button class="prof-tab',cp);out=out.slice(0,s)+btn+out.slice(s);}
      else{const bar=out.indexOf('<div class="prof-tab-bar">');if(bar>=0){const e=out.indexOf('</div>',bar);out=out.slice(0,e)+btn+out.slice(e);}}
      if(epolReadSel!=null)out+=epolReadHTML();
      return out;
    };
  }
  if(typeof buildProfTabContent==='function'){
    const t0=buildProfTabContent;
    buildProfTabContent=function(){if(typeof profTab!=='undefined'&&profTab==='policies')return epolProfileHTML();return t0.apply(this,arguments);};
  }
  /* 5 · The presentation's policies, once its data is ready. */
  /* This file loads before the presentation's (so the presentation keeps its data); its readiness is known after load. */
  window.addEventListener('load',function(){
    if(typeof PRES_READY!=='undefined'&&PRES_READY&&typeof PRES_READY.then==='function')
      PRES_READY.then(function(){epolSeedNova();if(typeof page!=='undefined'&&(page===EPOL_PAGE||page==='my-profile')&&typeof renderADTPage==='function')renderADTPage();});
  });
})();
