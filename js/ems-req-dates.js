/* ══ NEW REQUEST: START DATE AND END DATE ON THE REQUEST, NOT ON EACH ITEM (product owner, 15 Nov 2026) ════════════
   "i want to bring the start date and end date from expense item to request and it should be side by side and on
   clicking on start date the calendar will open and on the side the end date calendar will also open simultaneously.
   and remove the start date and end date from expense item and place it in the request."
   Expenses & Advances → + → New Request (an expense claim):
   - Request has Start Date * and End Date, side by side, after Currency.
   - Clicking either one opens both calendars, each under its own field. Picking the start keeps both open; picking
     the end closes them.
   - An expense item no longer asks for dates: every item takes the request's dates.
   Nothing else changes: each item is still saved with a start and an end date (the request's), so the item checks,
   the policy and limit periods, the approval, the panel and the phone sync read them as before. A claim's items
   edited from its panel keep their own date fields. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof expBasicFieldsHTML!=='function'||typeof expLineFieldsHTML!=='function'||typeof apCD!=='function')return;
  const S='ems-rq-start',E='ems-rq-end';
  /* Not while the company's starting data is being set up: that fills the form's own item dates. */
  const on=function(){return !(typeof presBuilding!=='undefined'&&presBuilding)&&typeof expModalOpen!=='undefined'&&expModalOpen&&typeof expDraft!=='undefined'&&expDraft&&typeof expDraft==='object';};
  const items=function(){const d=expDraft,l=(d.lines||[]).slice();if(d.line&&typeof d.line==='object')l.push(d.line);return l;};
  /* The request's dates: what was picked; for a draft opened again, the span of its items. */
  function dates(){
    const d=expDraft;
    if(d.rqStart==null){
      const s=items().map(function(l){return l.start;}).filter(Boolean).sort(),e=items().map(function(l){return l.end||l.start;}).filter(Boolean).sort();
      d.rqStart=s[0]||'';d.rqEnd=e.length&&e[e.length-1]!==d.rqStart?e[e.length-1]:'';
    }
    return {s:d.rqStart||'',e:d.rqEnd||''};
  }
  function read(){
    if(!on())return;
    const a=document.getElementById(S),b=document.getElementById(E);
    dates();
    if(a)expDraft.rqStart=a.value;
    if(b)expDraft.rqEnd=b.value;
  }
  /* Every item carries the request's dates. */
  function apply(){
    if(!on())return;
    const v=dates();
    items().forEach(function(l){l.start=v.s;l.end=v.e||v.s;});
  }

  /* ── 1 · Request: the two fields, side by side ── */
  const b0=expBasicFieldsHTML;
  expBasicFieldsHTML=function(){
    const out=b0.apply(this,arguments);
    if(!on())return out;
    const v=dates();
    return out+'<div class="ep-form-group ep-form-full"><div class="rqd-pair">'
      +'<div class="ep-form-group"><label class="ep-form-label">Start Date <span class="req">*</span></label>'+apCD(S,v.s,'dd-mm-yyyy','emsRqDatePick')+'</div>'
      +'<div class="ep-form-group"><label class="ep-form-label">End Date</label>'+apCD(E,v.e,'dd-mm-yyyy','emsRqDatePick')+'<div class="ea-hint">Leave blank for a one-day expense</div></div>'
      +'</div></div>';
  };
  if(typeof expSyncBasic==='function'){
    const s0=expSyncBasic;
    expSyncBasic=function(){const out=s0.apply(this,arguments);read();return out;};
  }
  window.emsRqDatePick=function(){
    read();
    /* An end before the start is dropped, not kept wrong. */
    if(on()&&expDraft.rqEnd&&expDraft.rqStart&&expDraft.rqEnd<expDraft.rqStart){expDraft.rqEnd='';if(typeof cdSet==='function'){const i=document.getElementById(E);if(i&&i.value)cdSet(E,'');}}
    apply();
    if(typeof expPolicyRefresh==='function')try{expPolicyRefresh();}catch(e){}
  };

  /* ── 2 · Expense item: no date fields ── */
  const l0=expLineFieldsHTML;
  expLineFieldsHTML=function(){
    const out=l0.apply(this,arguments);
    if(!on())return out;
    const box=document.createElement('div');box.innerHTML=out;
    ['exp-l-start','exp-l-end'].forEach(function(id){
      const w=box.querySelector('#cdw-'+id),g=w&&w.closest('.ep-form-group');
      if(g)g.remove();
    });
    return box.innerHTML;
  };
  if(typeof expSyncLine==='function'){
    const y0=expSyncLine;
    expSyncLine=function(){const out=y0.apply(this,arguments);if(on()){read();apply();}return out;};
  }
  if(typeof submitAddExpense==='function'){
    const a0=submitAddExpense;
    submitAddExpense=function(){
      if(on()){
        read();
        if(!dates().s){if(typeof showToast==='function')showToast('Start Date is required','error','Pick the Start Date in Request.');return;}
        apply();
      }
      return a0.apply(this,arguments);
    };
  }

  /* ── 3 · Both calendars open together ── */
  if(typeof cdToggle==='function'){
    const t0=cdToggle;
    cdToggle=function(btn){
      const id=btn&&btn.dataset?btn.dataset.cdid:'';
      if(id!==S&&id!==E)return t0.apply(this,arguments);
      const open=document.getElementById('cdp-'+S),was=open&&open.classList.contains('cd-open');
      cdCloseAll();
      if(was)return;
      const sv=typeof getCDValue==='function'?getCDValue(S):'';
      [S,E].forEach(function(k){
        const p=document.getElementById('cdp-'+k),b=document.querySelector('[data-cdid="'+k+'"]');if(!p||!b)return;
        const cur=cdParse(getCDValue(k))||(k===E&&cdParse(sv))||new Date();
        cdView[k]={y:cur.getFullYear(),m:cur.getMonth()};
        cdPaint(k);p.classList.add('cd-open');b.classList.add('cd-open');cdPlace(b,p);
      });
    };
  }
  if(typeof cdPick==='function'){
    const p0=cdPick;
    cdPick=function(id,iso){
      if(id!==S)return p0.apply(this,arguments);
      /* The start is picked: both stay open, the end calendar turns to the same month. */
      cdSet(S,iso);
      const d=cdParse(iso);
      [S,E].forEach(function(k){
        const p=document.getElementById('cdp-'+k);if(!p||!p.classList.contains('cd-open'))return;
        if(k===E&&d&&!getCDValue(E))cdView[E]={y:d.getFullYear(),m:d.getMonth()};
        cdPaint(k);
      });
    };
  }
  (function(){
    if(document.getElementById('rqd-style'))return;
    const st=document.createElement('style');st.id='rqd-style';
    st.textContent='.rqd-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}@media(max-width:640px){.rqd-pair{grid-template-columns:1fr}}';
    (document.head||document.documentElement).appendChild(st);
  })();
})();
