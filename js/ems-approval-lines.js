/* ══ CLAIM APPROVAL: LINE ITEMS BY CHECKBOX, THE WHOLE REQUEST IN LOGS (product owner, 12 Nov 2026) ══════════════
   - In the claim's ☰ → Basic Details → Line Items, the approver of the current step ticks line items and picks a status
     from "Update Status": Approve, Reject or Follow-Up (a note is asked for Reject and Follow-Up, and for an audited Super
     Admin decision). The approval engine records each line's decision as before; partial approval is not offered here.
   - The whole request is accepted or rejected in its Logs (and the list's ☰ Update Status): Approve or Reject only -
     Follow-Up and Partially Approved are no longer offered for the whole request; the requester keeps Submit, Resubmit
     and Withdraw. Neither the Logs tab nor the list's popup has a Line Item part any more. */
let expLnSel=null;   // {claimId, ids:[], act:'', note:''}
const EXP_LN_ACTS=['Approve','Reject','Follow-Up'];
function expLnOpenLines(r){
  if(!r||r.status!=='Awaiting Approval'||!caCanDecide(r))return [];
  return r.lines.filter(function(l){return caLineMoves(r,l).length>0;});
}
function expLnState(r){if(!expLnSel||expLnSel.claimId!==r.id)expLnSel={claimId:r.id,ids:[],act:'',note:''};return expLnSel;}
function expLnToggle(rid,lid,el){
  const r=expRec(rid);if(!r)return;const s=expLnState(r),i=s.ids.indexOf(lid);
  if(el.checked&&i<0)s.ids.push(lid);if(!el.checked&&i>=0)s.ids.splice(i,1);
  const all=document.getElementById('expln-all');if(all)all.checked=s.ids.length===expLnOpenLines(r).length;
}
function expLnAll(rid,el){
  const r=expRec(rid);if(!r)return;const s=expLnState(r);
  s.ids=el.checked?expLnOpenLines(r).map(function(l){return l.id;}):[];
  document.querySelectorAll('.expln-cb').forEach(function(cb){cb.checked=el.checked;});
}
function expLnPick(){
  const r=expRec(expSelectedId);if(!r)return;const s=expLnState(r);
  s.act=getCSValue('expln-act')||'';renderADTPage();
}
function expLnCancel(){if(expLnSel){expLnSel.act='';expLnSel.note='';}renderADTPage();}
function expLnApply(rid){
  const r=expRec(rid);if(!r)return;const s=expLnState(r);
  const ta=document.getElementById('expln-note');if(ta)s.note=ta.value.trim();
  const open=expLnOpenLines(r).map(function(l){return l.id;}),ids=s.ids.filter(function(id){return open.indexOf(id)>=0;});
  if(!s.act){showToast('Pick a status','error','Choose Approve, Reject or Follow-Up from Update Status.');return;}
  if(!ids.length){showToast('Select line items','error','Tick the line items to update.');return;}
  const iv=caIsIntervention(r),need=s.act!=='Approve'||iv;
  if(need&&s.note.length<3){if(ta)ta.classList.add('is-invalid');showToast('Note is required','error','Write a note for '+s.act+'.');return;}
  const st=caActiveStage(r);
  if(iv&&st&&st.rule==='All'&&st.approvers.length>1){caReviewOpen(rid,{scope:'lines'});return;}
  const dec=s.act==='Approve'?'Approve':s.act==='Reject'?'Reject':'Follow-Up',lines={};
  ids.forEach(function(id){lines[id]={decision:dec,reason:s.act==='Approve'?'':s.note};});
  const err=caDecide(rid,{scope:'lines',lines:lines,comment:s.act==='Approve'?s.note:'',why:s.note});
  if(err){showToast('Not saved','error',err);return;}
  expLnSel=null;renderADTPage();
  showToast(ids.length+' line item'+(ids.length===1?'':'s')+': '+(s.act==='Approve'?'Approved':s.act==='Reject'?'Rejected':'Follow-Up'),'success',expKey(r)+' is '+r.status+'.');
}
(function(){
  /* Line Items: a checkbox per open line, Update Status on the header, and the note bar once a status is picked. */
  if(typeof expSummaryHTML==='function'){
    const s0=expSummaryHTML;
    expSummaryHTML=function(r,locked){
      let out=s0.apply(this,arguments);
      const open=expLnOpenLines(r);if(!open.length)return out;
      const s=expLnState(r),ids=open.map(function(l){return l.id;});
      s.ids=s.ids.filter(function(id){return ids.indexOf(id)>=0;});
      r.lines.forEach(function(l,i){
        if(ids.indexOf(l.id)<0)return;
        const at='<div class="exp-line-hd"><span class="exp-line-n">'+(i+1)+'</span>';
        const cb='<input type="checkbox" class="expln-cb" style="width:16px;height:16px;margin:0 8px 0 0;cursor:pointer;flex-shrink:0" title="Select this line item"'
          +(s.ids.indexOf(l.id)>=0?' checked':'')+' onclick="event.stopPropagation()" onchange="expLnToggle('+r.id+','+l.id+',this)">';
        out=out.replace(at,'<div class="exp-line-hd">'+cb+'<span class="exp-line-n">'+(i+1)+'</span>');
      });
      const ctl='<span style="display:inline-flex;align-items:center;gap:10px;margin-left:auto;margin-right:12px">'
        +'<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--gray);cursor:pointer"><input type="checkbox" id="expln-all" style="width:15px;height:15px"'
          +(s.ids.length===ids.length?' checked':'')+' onchange="expLnAll('+r.id+',this)">All</label>'
        +'<span style="width:170px;display:inline-block">'+apCS('expln-act',EXP_LN_ACTS,s.act,'Update Status','expLnPick')+'</span></span>';
      out=out.replace('<span class="exp-sum-total">',ctl+'<span class="exp-sum-total">');
      if(s.act){
        const need=s.act!=='Approve'||caIsIntervention(r);
        const bar='<div class="lp-logs-form" style="margin:6px 0 12px"><div class="lp-logs-form-label">'+ccE(s.act)+' the selected line items · Note'+(need?' <span class="lp-logs-form-req">*</span>':'')+'</div>'
          +'<textarea class="lp-logs-form-textarea" id="expln-note" placeholder="'+(need?'Enter note':'Optional')+'">'+ccE(s.note||'')+'</textarea>'
          +'<div style="display:flex;gap:10px;margin-top:10px"><button class="ep-cancel-btn" style="flex:1" onclick="expLnCancel()">Cancel</button>'
          +'<button class="lp-logs-save-btn" style="flex:1" onclick="expLnApply('+r.id+')">Update Status</button></div></div>';
        const h=out.indexOf('</div>',out.indexOf('<span class="exp-sum-total">'));
        if(h>=0)out=out.slice(0,h+6)+bar+out.slice(h+6);
      }
      return out;
    };
  }
  /* The whole request: Approve or Reject (plus the requester's own moves). */
  if(typeof expMoves==='function'){
    const m0=expMoves;
    expMoves=function(r){return m0.apply(this,arguments).filter(function(m){return m!=='Partially Approved'&&m!=='Follow-Up';});};
  }
  /* Logs: the claim's own log only - no Line Item Logs part. */
  if(typeof expLogsHTML==='function'){
    const l0=expLogsHTML;
    expLogsHTML=function(){
      if(typeof expLogScope!=='undefined')expLogScope='expense';
      return l0.apply(this,arguments).replace(/<div class="segmented is-compact exp-log-scope">[\s\S]*?<\/div>/,'');
    };
  }
  /* The list's ☰ Update Status popup: no Line Item part. */
  const c=typeof window.rlConfig==='function'?window.rlConfig('expenses'):null;
  if(c&&c.parts)delete c.parts;
})();
