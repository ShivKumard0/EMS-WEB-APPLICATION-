/* ══ THE WORKFLOW TAB: DONE · IN PROGRESS · NOT STARTED ═══════════════════
   Every Workflow tab is drawn by wfTimelineHTML (pages.js), which already
   knows three kinds of row:
     done     - a step that happened: who, when, and the remarks,
     current  - the step the record is waiting on ("In progress"), and who
                it is pending with,
     todo     - the steps after it, dashed, with their owner and
                "Not started yet".
   Only the employee lifecycle used to feed it the last two. This file gives
   every module the same three parts:

     DONE      comes from the module's own workflow history where the module
               keeps it current (Teams, Leaves, Assets, IT Access, Payheads,
               Holidays, Tickets, Compliance documents). Where it does not -
               the status moves only in Logs - it is read from the Logs, one
               row per status change, so Workflow can never disagree with Logs.
     CURRENT   and TODO come from the module's flow: given the record's status
     + TODO    now, which steps are left and who owns each. A record at the
               end of its flow, or closed / rejected / inactive, has none.

   A flow is described as `next`: for each status, the steps still to come,
   in order, each {title, owner}. Linear flows build that map from a list. */

/* ── Building blocks ───────────────────────────────────────────────────── */

/* Done rows from a Logs list (newest first, as stored): one row per entry that
   moved the status, oldest first. `title(status)` names the step. */
function wfDoneFromLogs(logs,title){
  const list=(logs||[]).slice().reverse();
  const out=[];
  let prev=null;
  list.forEach(function(l,i){
    /* The status the entry left the record in. A contract row also carries an
       event label ("Quote viewed"); a step is a status change, not an event. */
    const st=l.newStatus||l.status||l.label;
    const moved=l.prevStatus&&l.newStatus?l.prevStatus!==l.newStatus:(i===0||st!==prev);
    if(moved)out.push({title:title?title(st,l):st,user:l.user||'System',date:l.date||'',time:l.time||'',
      description:l.comment!=null?l.comment:(l.action||'')});
    prev=st;
  });
  return out.reverse();     // wfTimelineHTML expects newest first, like every store
}

/* Done rows + the steps still to come. steps: [{title, owner}] - the first is
   in progress, the rest have not started. */
function wfPlan(done,steps){
  const rows=(done||[]).filter(function(w){return !w.state;});
  (steps||[]).forEach(function(s,i){
    rows.push({title:s.title,owner:s.owner,state:i===0?'current':'todo',description:s.note||''});
  });
  return rows;
}

/* The steps left on a linear flow. order: statuses in sequence; step(status)
   -> {title, owner} for the step that REACHES that status. A status off the
   flow, or the last one, leaves nothing. */
function wfLinearSteps(order,cur,step){
  const i=order.indexOf(cur);
  if(i<0)return [];
  return order.slice(i+1).map(step);
}

/* ── Contracts ─────────────────────────────────────────────────────────── */
/* Who performs the move INTO each stage. The client approves what it is
   sent; the delivery team sends it and runs everything after signature. */
const WF_CT_STAGE={
  'Quotation Approved':{title:'Quotation Approval',owner:'Client'},
  'Proposal Sent':     {title:'Send Proposal',owner:'Account Manager'},
  'Proposal Approved': {title:'Proposal Approval',owner:'Client'},
  'Contract Sent':     {title:'Send Contract',owner:'Legal'},
  'Contract Approved': {title:'Contract Approval',owner:'Client'},
  'Onboarding':        {title:'Onboarding',owner:'HR Operations'},
  'Ready for Payroll': {title:'Ready for Payroll',owner:'Payroll Team'},
  'Pending Kickoff':   {title:'Case Kickoff',owner:'Mobility Specialist'},
  'Ready for Filing':  {title:'Prepare Filing',owner:'Mobility Specialist'},
  'Filed':             {title:'File Application',owner:'Mobility Specialist'},
  'Pending Onboarding':{title:'Onboarding Setup',owner:'HR Operations'},
  'Active':            {title:'Activate Contractor',owner:'HR Operations'}
};
function wfContract(c){
  const rows=(typeof ctLogsData!=='undefined'&&ctLogsData[c.id]||[]).map(function(l){return ctLogRow(l,c.type);});
  const done=rows.length?wfDoneFromLogs(rows):(typeof ctWorkflowData!=='undefined'&&ctWorkflowData[c.id])||[];
  return wfPlan(done,wfLinearSteps(ctFlowFor(c.type),c.status,function(s){
    return WF_CT_STAGE[s]||{title:s,owner:'Operations'};
  }));
}

/* ── Payments (invoice flow) ───────────────────────────────────────────── */
const WF_PM_STAGE={
  'Pending':{title:'Raise Invoice',owner:'Finance'},
  'Paid':   {title:'Payment',owner:'Client'},
  'Closed': {title:'Close Order',owner:'Finance'}
};
function wfPayment(p){
  const done=wfDoneFromLogs(typeof pmLogsData!=='undefined'&&pmLogsData[p.id]);
  return wfPlan(done.length?done:(typeof pmWorkflowData!=='undefined'&&pmWorkflowData[p.id])||[],
    wfLinearSteps(pmInvoiceFlow,p.invoiceStatus,function(s){return WF_PM_STAGE[s]||{title:s,owner:'Finance'};}));
}

/* ── Records that are Pending until approved, then Active ──────────────────
   Pay runs, teams, payheads, holidays, rules, templates, policies... A
   Pending record waits on its approver; an Active or Inactive one has no step
   left. `approver` names who signs it off. */
function wfApproval(rec,done,approver){
  return wfPlan(done,rec&&rec.status==='Pending'?[{title:'Approval',owner:approver||'Admin'}]:[]);
}
function wfPayroll(r){
  const done=wfDoneFromLogs(seedLogs(r,typeof prLogsData!=='undefined'?prLogsData[r.id]:null));
  const approver=r.approver&&r.approver!=='-'?r.approver:'Finance';
  return wfApproval(r,done.length?done:(typeof prWorkflowData!=='undefined'&&prWorkflowData[r.id])||[],approver);
}

/* ── Leaves ────────────────────────────────────────────────────────────── */
function wfLeave(l){
  return wfPlan((typeof alWorkflowData!=='undefined'&&alWorkflowData[l.id])||[],
    l.status==='Pending'?[{title:'Manager Approval',owner:'Reporting Manager'}]
    :l.status==='Follow Up'?[{title:'Follow-up & Decision',owner:'HR'}]:[]);
}

/* ── Tickets ───────────────────────────────────────────────────────────── */
function wfTicket(t){
  const agent='Agent'+(t.assignedTo?' · '+t.assignedTo:'');
  const client='Client'+(t.clientName?' · '+t.clientName:'');
  const LEFT={
    open:       [{title:'Start Work',owner:t.assignedTo?agent:'Unassigned'},{title:'Propose Resolution',owner:agent},{title:'Client Confirmation',owner:client}],
    in_progress:[{title:'Propose Resolution',owner:agent},{title:'Client Confirmation',owner:client}],
    blocked:    [{title:'Unblock',owner:tkOwner(t)},{title:'Propose Resolution',owner:agent},{title:'Client Confirmation',owner:client}],
    resolved:   [{title:'Client Confirmation',owner:client}]
  };
  return wfPlan((typeof tkWorkflowData!=='undefined'&&tkWorkflowData[t.id])||[],LEFT[t.status]||[]);
}

/* ── Chats ─────────────────────────────────────────────────────────────── */
/* A conversation is not linear: the step left is the next reply, owned by
   whoever owes it, and closing the chat after it. */
function wfChat(c){
  const done=wfDoneFromLogs(chatSeedLogs(c));
  const LEFT={
    active:        [{title:'Reply to Client',owner:chatOwner(c)},{title:'Close Chat',owner:chatOwner(c)}],
    waiting_csm:   [{title:'Reply to Client',owner:chatOwner(c)},{title:'Close Chat',owner:chatOwner(c)}],
    waiting_client:[{title:'Client Reply',owner:chatOwner(c)},{title:'Close Chat',owner:'CSM'+(c.assignedTo?' · '+c.assignedTo:'')}]
  };
  return wfPlan(done.length?done:(typeof chatWorkflowData!=='undefined'&&chatWorkflowData[c.id])||[],LEFT[c.status]||[]);
}

/* ── Compliance documents ──────────────────────────────────────────────── */
function wfOca(item){
  const src=ocaCat(item.cat).source;
  const uploader=src==='Compliance Admin'?'Compliance Admin':(item.who||src);
  const LEFT={
    'Awaiting Upload':[{title:'Upload Document',owner:uploader},{title:'Review',owner:'Compliance Admin'}],
    'Rejected':       [{title:'Upload Corrected Copy',owner:uploader},{title:'Review',owner:'Compliance Admin'}],
    'Pending Review': [{title:'Review',owner:'Compliance Admin'}],
    'Expiring Soon':  [{title:'Renewal',owner:uploader},{title:'Review',owner:'Compliance Admin'}]
  };
  return wfPlan(ocaWorkflowRows(item),LEFT[item.status]||[]);
}

/* ── Assets ────────────────────────────────────────────────────────────── */
function wfAsset(a){
  const LEFT={
    'Available':[{title:'Assign to Employee',owner:'IT Admin'}],
    'Assigned': [{title:'Return Asset',owner:a.assignedTo||'Employee'},{title:'Inspect & Restock',owner:'IT Admin'}],
    'Returned': [{title:'Inspect & Restock',owner:'IT Admin'}],
    'In Repair':[{title:'Repair Complete',owner:'IT Admin'}],
    'Damaged':  [{title:'Repair or Retire',owner:'IT Admin'}]
  };
  return wfPlan(astWorkflow(a),LEFT[a.status]||[]);
}

/* ── IT access ─────────────────────────────────────────────────────────── */
function wfItAccess(r){
  const LEFT={
    'Pending':[{title:'Grant Access',owner:'IT Admin'}],
    'On Hold':[{title:'Resume Access',owner:'IT Admin'}]
  };
  return wfPlan(itaWorkflow(r),LEFT[r.status]||[]);
}
