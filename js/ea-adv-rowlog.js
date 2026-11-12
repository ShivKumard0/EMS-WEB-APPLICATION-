/* ══ EXPENSES & ADVANCES LIST: ONE ACTION CELL FOR EVERY ROW (product owner, 12 Nov 2026) ══════════════════════════
   "why this ui is so uneven - make it [the] approved dropdown, and fix the action bar of the first line item". An
   advance row now has the same Action cell as a claim row: the status dropdown (its moves: Submit, Approve, Reject,
   Resubmit, Withdraw - whatever the person may do now) and ☰. The dropdown runs the advance's own approval engine
   (caLogMove, as its Logs do); ☰ opens the advance. An employee's own requests in a client company keep ☰ only, as
   their claims do. */
(function(){
  if(typeof rlRegister!=='function'||typeof eaRowHTML!=='function')return;
  const MOVES=function(r){return (typeof caMoves==='function'?caMoves(r):[]).filter(function(m){return m!=='Partially Approved'&&m!=='Follow-Up';});};
  rlRegister('advances',{pre:'advr',recordLabel:'Advance',
    rec:function(id){return typeof advRec==='function'?advRec(Number(id)):null;},
    status:function(r){return r.status;},
    moves:MOVES,
    label:function(v){return (typeof EXP_MOVE_LABELS!=='undefined'&&EXP_MOVE_LABELS[v])||v;},
    save:function(id){
      const r=advRec(Number(id));if(!r)return;
      const p=typeof expLogPick==='function'?expLogPick('advr-log-status-sel','advr-log-comment-inp'):null;if(!p)return;
      if(p.to===r.status){showToast('Pick a new status','error');return;}
      caLogMove(r.id,p.to,p.comment);
    },
    count:function(r){return (r.logs||[]).length;},
    open:function(id){advOpen(Number(id));},
    logs:function(id){advOpen(Number(id),'logs');},
    sub:function(r){return expKey(r)+' &middot; '+(r.name||'');}
  });
  const r0=eaRowHTML;
  eaRowHTML=function(x){
    const out=r0.apply(this,arguments);
    if(!x||x.kind!=='adv'||typeof rowLogCell!=='function')return out;
    const own=typeof emsClientOnly==='function'&&emsClientOnly()&&typeof emsIsMe==='function'&&emsIsMe({eid:x.r&&x.r.employeeEid});
    if(own)return out;
    const cell=rowLogCell('advances',x.id);if(!cell)return out;
    const at=out.lastIndexOf('<td onclick="event.stopPropagation()">');
    if(at<0)return out;
    const end=out.indexOf('</td>',at);
    return out.slice(0,at)+'<td onclick="event.stopPropagation()">'+cell+'</td>'+out.slice(end+5);
  };
})();
