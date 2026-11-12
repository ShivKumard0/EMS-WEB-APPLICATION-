/* ══ EXPENSES & ADVANCES: APPROVE WITH THE LINE ITEMS; WITHDRAW FOR THE REQUESTER ONLY (product owner, 12 Nov 2026) ═
   1. Withdraw is offered only to the person the request belongs to - not to the Super Admin, the Company Admin or an
      approver acting on someone else's request.
   2. Approve in a claim's Action menu opens the claim's line items, each with a checkbox (all ticked), with Approve and
      Reject on top. Every ticked line: the claim is approved or rejected as before. Some lines: the decision is recorded
      for those lines only (the others wait at this stage). A comment is required to reject.
   The decisions go through the same approval engine as before (caLogMove / caDecide), so the logs, the workflow and
   the notifications are written exactly as they were. In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  /* 1 · Withdraw: the requester only. */
  const mine=function(r){
    if(!r)return false;
    if(typeof emsIsMe==='function'&&r.employeeEid&&emsIsMe({eid:r.employeeEid}))return true;
    return typeof caClaimantUser==='function'&&typeof caMe==='function'&&caClaimantUser(r)===caMe();
  };
  if(typeof caMoves==='function'){
    const m0=caMoves;
    caMoves=function(r){const out=m0.apply(this,arguments);return mine(r)?out:out.filter(function(v){return v!=='Withdrawn';});};
  }
  /* 2 · Approve with the line items. */
  let A=null;   // {id, sel:{lineId:true}}
  const esc=function(s){return typeof sbEsc==='function'?sbEsc(s):String(s);};
  const rootEl=function(){let el=document.getElementById('eaap-root');if(!el){el=document.createElement('div');el.id='eaap-root';document.body.appendChild(el);}return el;};
  const lines=function(r){
    const st=typeof caActiveStage==='function'?caActiveStage(r):null;
    return r.lines.map(function(l){
      const open=!!st&&typeof caLineMoves==='function'&&caLineMoves(r,l).length>0;
      return {l:l,open:open};
    });
  };
  const X='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  function html(){
    const r=expRec(A.id);if(!r)return '';
    const st=caActiveStage(r),ls=lines(r),open=ls.filter(function(x){return x.open;}),inter=typeof caIsIntervention==='function'&&caIsIntervention(r);
    const n=open.filter(function(x){return A.sel[x.l.id];}).length,all=open.length&&n===open.length;
    const total=open.filter(function(x){return A.sel[x.l.id];}).reduce(function(s,x){return s+(parseFloat(x.l.amount)||0);},0);
    const rows=ls.map(function(x){
      const l=x.l,on=x.open&&!!A.sel[l.id];
      return '<tr>'
        +'<td class="csag-td" style="width:36px"><input type="checkbox"'+(on?' checked':'')+(x.open?'':' disabled')+' onchange="eaApSel('+l.id+',this.checked)" style="accent-color:#1a1a1a;width:15px;height:15px"></td>'
        +'<td class="csag-td"><div class="lp-c-main">'+esc(l.title||'Item')+'</div></td>'
        +'<td class="csag-td">'+esc((l.category||r.category||'')+(l.subCat?' / '+l.subCat:''))+'</td>'
        +'<td class="csag-td">'+esc(l.start?(typeof cdLabel==='function'?cdLabel(l.start):l.start):'')+'</td>'
        +'<td class="csag-td" style="text-align:right;white-space:nowrap">'+(typeof expMoney==='function'?expMoney(l.amount,r.currency):esc(l.amount))+'</td>'
        +'<td class="csag-td">'+(typeof expAttChip==='function'?expAttChip(r,l):esc(l.proof||''))+'</td>'   // the line's attachment (js/exp-attachments.js)
        +'<td class="csag-td">'+(x.open?axBadge('wait','Pending'):axBadge(typeof statusTone==='function'?statusTone(l.status||''):'idle',l.status||'Decided'))+'</td>'
        +'</tr>';
    }).join('');
    return '<div class="ct-modal-overlay" onclick="eaApClose()">'
      +'<div class="ct-modal" style="width:min(960px,95vw)" role="dialog" aria-modal="true" aria-label="Approve line items" onclick="event.stopPropagation()">'
      +'<div class="ct-modal-hdr"><span class="ct-modal-title">Review Line Items</span><button class="ct-modal-close" onclick="eaApClose()" aria-label="Close">'+X+'</button></div>'
      +'<p class="ct-modal-sub">'+esc(expKey(r)+' · '+r.name+(st?' · Stage '+st.n+' · '+st.name:''))+'</p>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 12px">'
        +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--navy,#0f172a);cursor:pointer"><input type="checkbox"'+(all?' checked':'')+(open.length?'':' disabled')+' onchange="eaApAll(this.checked)" style="accent-color:#1a1a1a;width:15px;height:15px"> '
          +n+' of '+open.length+' selected'+(n?' · '+(typeof expMoney==='function'?expMoney(total,r.currency):total):'')+'</label>'
        +'<div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm" style="color:var(--st-bad-fg,#b42318)"'+(n?'':' disabled')+' onclick="eaApGo(\'Reject\')">Reject</button>'
          +'<button class="ep-save-btn"'+(n?'':' disabled')+' onclick="eaApGo(\'Approve\')">Approve</button></div>'
      +'</div>'
      +'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th></th><th>Expense Title</th><th>Category / Sub Category</th><th>Date</th><th style="text-align:right">Amount</th><th>Attachment</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      /* Deciding someone else's stage (an admin stepping in) always takes a reason - the engine asks for it. */
      +'<div class="ep-form-group ep-form-full" style="margin-top:12px"><label class="ep-form-label">Comment'+(inter?' <span class="req">*</span>':'')+'</label>'
        +'<textarea id="eaap-comment" class="ep-form-input" rows="3" placeholder="'+(inter?'Required: you are deciding for '+esc(caNs(st.approvers)||'the approver'):'Required to reject')+'" style="resize:vertical;min-height:70px;height:auto;line-height:1.5"></textarea></div>'
      +'<div class="ct-modal-foot"><span></span><div class="ct-modal-btns"><button class="ep-cancel-btn" onclick="eaApClose()">Cancel</button></div></div>'
      +'</div></div>';
  }
  const paint=function(){const el=rootEl(),t=el.querySelector('#eaap-comment'),typed=t?t.value:'';el.innerHTML=A?html():'';const n=el.querySelector('#eaap-comment');if(n&&typed)n.value=typed;};
  window.eaApOpen=function(id){
    const r=expRec(Number(id));if(!r)return;
    A={id:Number(id),sel:{}};lines(r).forEach(function(x){if(x.open)A.sel[x.l.id]=true;});
    paint();
  };
  window.eaApClose=function(){A=null;paint();};
  window.eaApSel=function(lineId,on){if(!A)return;A.sel[lineId]=!!on;paint();};
  window.eaApAll=function(on){if(!A)return;const r=expRec(A.id);lines(r).forEach(function(x){if(x.open)A.sel[x.l.id]=!!on;});paint();};
  window.eaApGo=function(decision){
    if(!A)return;const r=expRec(A.id);if(!r)return;
    const t=document.getElementById('eaap-comment'),comment=t?String(t.value||'').trim():'';
    if(decision==='Reject'&&!comment){showToast('Comment required','error','Give the reason for rejecting.');if(t)t.focus();return;}
    if(!comment&&typeof caIsIntervention==='function'&&caIsIntervention(r)){showToast('Comment required','error','You are deciding for '+(caNs(caActiveStage(r).approvers)||'the approver')+': give the reason.');if(t)t.focus();return;}
    const open=lines(r).filter(function(x){return x.open;}),picked=open.filter(function(x){return A.sel[x.l.id];});
    if(!picked.length){showToast('Pick at least one line item','error');return;}
    const id=A.id;A=null;paint();
    /* Every line: the claim's own decision, exactly as the Action menu made it. */
    if(picked.length===open.length){caLogMove(id,decision==='Approve'?'Approved':'Rejected',comment);return;}
    /* Some lines: one line goes the way a line decision always went; several are decided together. */
    if(picked.length===1){caLineLogMove(id,picked[0].l.id,decision==='Approve'?'Approved':'Rejected',comment);return;}
    const st=caActiveStage(r);
    if(caIsIntervention(r)&&st&&st.rule==='All'&&st.approvers.length>1){
      caReviewOpen(id,{scope:'lines',lineId:picked[0].l.id,lineDecision:decision,reason:comment,why:comment});return;}
    const ls={};picked.forEach(function(x){ls[x.l.id]={decision:decision,reason:decision==='Reject'?comment:''};});
    const err=caDecide(id,{scope:'lines',lines:ls,comment:decision==='Approve'?comment:'',why:comment});
    if(err){showToast('Not saved','error',err);return;}
    renderADTPage();
    showToast('Line items updated','success',picked.length+' line item'+(picked.length===1?'':'s')+' '+(decision==='Approve'?'approved':'rejected')+'. '+expKey(r)+' is '+r.status+'.');
  };
  /* Approve in a claim's Action menu opens it. */
  if(typeof window.rlPick==='function'){
    const p0=window.rlPick;
    window.rlPick=function(key,id,to,scope){
      if(key==='expenses'&&to==='Approved'&&!scope){
        document.querySelectorAll('.ct-action-menu').forEach(function(x){x.classList.remove('open');});
        const r=expRec(Number(id));
        if(r&&lines(r).some(function(x){return x.open;})){eaApOpen(id);return;}
      }
      return p0.apply(this,arguments);
    };
  }
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&A)eaApClose();});
})();
